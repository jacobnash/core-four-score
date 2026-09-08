import { collection, deleteField, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../services/firebase';
import { userService } from '../services/firestore';
import { Tournament, TournamentRule, User } from '../types';
import {
    APPROVAL_THRESHOLD,
    buildBulkRuleApprovals,
    computeNextApprovals,
    isAcceptedRule,
    isHouseRule,
    isVisibleRule,
    parseBulkRuleLines,
    ruleBelongsToTournament,
    shouldExpireProposal,
} from '../utils/rules';

export type RuleDoc = TournamentRule & { createdAt: any; lockedAt?: any };

/**
 * All the Firestore-backed state and mutations for RulesScreen: fetching/cleaning up
 * rule docs, proposing/bulk-adding rules, and toggling approvals. Extracted so this
 * logic is testable without rendering the full screen (see AUDIT.md Theme A).
 */
export function useRulesScreenData(
    tournamentId: string,
    tournamentLoading: boolean,
    activeTournament: Tournament | null,
    user: User | null
) {
    const [rules, setRules] = useState<RuleDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [uidToName, setUidToName] = useState<Record<string, string>>({});
    const [modalVisible, setModalVisible] = useState(false);
    const [bulkModalVisible, setBulkModalVisible] = useState(false);
    const [proposal, setProposal] = useState('');
    const [bulkText, setBulkText] = useState('');
    const [bulkSaving, setBulkSaving] = useState(false);

    const fetchRules = useCallback(async () => {
        if (!tournamentId) {
            setRules([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const snap = await getDocs(collection(getDb(), 'rules'));
            await cleanupOldProposals(snap.docs, tournamentId);
            const fresh = await getDocs(collection(getDb(), 'rules'));
            const arr: RuleDoc[] = fresh.docs
                .map(d => ({ id: d.id, ...(d.data() as Omit<RuleDoc, 'id'>) }))
                .filter(r => ruleBelongsToTournament(r, tournamentId))
                .filter(r => isVisibleRule(r));
            arr.sort((a, b) => {
                const aIsBuiltin = a.author === 'system';
                const bIsBuiltin = b.author === 'system';
                if (aIsBuiltin && !bIsBuiltin) return -1;
                if (!aIsBuiltin && bIsBuiltin) return 1;
                return 0;
            });

            const uidSet = new Set<string>();
            for (const r of arr) {
                if (r.author && r.author !== 'system') uidSet.add(r.author);
                (r.approvals || []).forEach((a: string) => { if (a && a !== 'system') uidSet.add(a); });
            }

            if (uidSet.size > 0) {
                const uids = Array.from(uidSet);
                const entries = await Promise.all(uids.map(async uid => {
                    try {
                        const u = await userService.getUser(uid);
                        return [uid, u?.displayName || uid] as [string, string];
                    } catch {
                        return [uid, uid] as [string, string];
                    }
                }));
                const map: Record<string, string> = {};
                for (const [k, v] of entries) map[k] = v;
                setUidToName(map);
            } else {
                setUidToName({});
            }

            setRules(arr);
        } finally {
            setLoading(false);
        }
    }, [tournamentId]);

    useEffect(() => {
        if (!tournamentLoading) {
            fetchRules();
        }
    }, [fetchRules, tournamentLoading]);

    async function cleanupOldProposals(docs: any[], scopeTournamentId: string) {
        const now = Date.now();
        for (const d of docs) {
            try {
                const data = d.data();
                if (!ruleBelongsToTournament(data, scopeTournamentId)) continue;

                const author = data?.author;
                const approvals: string[] = data?.approvals || [];

                if (isHouseRule(author) || isAcceptedRule(approvals)) {
                    if (data?.status === 'expired') {
                        await updateDoc(doc(getDb(), 'rules', d.id), {
                            status: deleteField(),
                            expiredAt: deleteField(),
                        });
                    }
                    continue;
                }

                if (shouldExpireProposal(data?.createdAt, approvals, now, author)) {
                    if (data?.status !== 'expired') {
                        await updateDoc(doc(getDb(), 'rules', d.id), { status: 'expired', expiredAt: new Date() });
                    }
                } else if (data?.status === 'expired') {
                    await updateDoc(doc(getDb(), 'rules', d.id), {
                        status: deleteField(),
                        expiredAt: deleteField(),
                    });
                }
            } catch (err) {
                console.warn('cleanupOldProposals error for doc', d.id, err);
            }
        }
    }

    async function bulkAddRules() {
        if (!user || !tournamentId || !activeTournament) return;
        const lines = parseBulkRuleLines(bulkText);
        if (lines.length === 0) return;

        const approvals = buildBulkRuleApprovals(activeTournament.memberIds, user.uid);
        if (approvals.length < APPROVAL_THRESHOLD) {
            return;
        }

        setBulkSaving(true);
        try {
            const now = new Date();
            for (const text of lines) {
                const id = encodeURIComponent(text).slice(0, 80) + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
                await setDoc(doc(getDb(), 'rules', id), {
                    text,
                    author: user.uid,
                    approvals,
                    createdAt: now,
                    lockedAt: now,
                    tournamentId,
                    schemaVersion: 1,
                    seedMethod: 'bulk',
                });
            }
            setBulkModalVisible(false);
            setBulkText('');
            fetchRules();
        } finally {
            setBulkSaving(false);
        }
    }

    async function proposeRule() {
        if (!user || !tournamentId) return;
        if (!proposal.trim()) return;
        const id = encodeURIComponent(proposal.trim()).slice(0, 80) + '-' + Date.now();
        const ref = doc(getDb(), 'rules', id);
        await setDoc(ref, {
            text: proposal.trim(),
            author: user.uid,
            approvals: [user.uid],
            createdAt: new Date(),
            lockedAt: null,
            tournamentId,
            schemaVersion: 1,
            seedMethod: 'proposal',
        });
        setModalVisible(false);
        setProposal('');
        fetchRules();
    }

    async function toggleApprove(rule: RuleDoc) {
        if (!user) return;
        const ref = doc(getDb(), 'rules', rule.id);
        const currentApprovals = rule.approvals || [];
        const wasAccepted = currentApprovals.length >= APPROVAL_THRESHOLD;
        const next = computeNextApprovals(rule, user.uid);
        const willBeAccepted = next.length >= APPROVAL_THRESHOLD;
        const unchanged = next.length === currentApprovals.length && next.every((v, i) => v === currentApprovals[i]);
        if (unchanged) return;

        let lockedAt = rule.lockedAt ?? null;
        if (!wasAccepted && willBeAccepted) {
            lockedAt = new Date();
        } else if (wasAccepted && !lockedAt) {
            lockedAt = new Date();
        }

        await updateDoc(ref, { approvals: next, lockedAt });
        fetchRules();
    }

    return {
        rules,
        loading,
        uidToName,
        modalVisible,
        setModalVisible,
        bulkModalVisible,
        setBulkModalVisible,
        proposal,
        setProposal,
        bulkText,
        setBulkText,
        bulkSaving,
        bulkAddRules,
        proposeRule,
        toggleApprove,
    };
}
