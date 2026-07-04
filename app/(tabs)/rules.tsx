import { collection, deleteField, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useTournament } from '../../contexts/TournamentContext';
import { db } from '../../services/firebase';
import { userService } from '../../services/firestore';
import { TournamentRule } from '../../types';
import {
    APPROVAL_THRESHOLD,
    buildBulkRuleApprovals,
    computeNextApprovals,
    getRuleSourceLabel,
    isAcceptedRule,
    isBulkSeedRule,
    isHouseRule,
    isVisibleRule,
    parseBulkRuleLines,
    ruleBelongsToTournament,
    shouldExpireProposal,
} from '../../utils/rules';
import { isLegacyCoreFourTournament } from '../../utils/tournamentMembership';

type RuleDoc = TournamentRule & { createdAt: any; lockedAt?: any };

export default function RulesScreen() {
    const { user } = useAuth();
    const { activeTournament, loading: tournamentLoading } = useTournament();
    const tournamentId = activeTournament?.id || activeTournament?.tournamentId || '';

    const [rules, setRules] = useState<RuleDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [uidToName, setUidToName] = useState<Record<string, string>>({});
    const [modalVisible, setModalVisible] = useState(false);
    const [bulkModalVisible, setBulkModalVisible] = useState(false);
    const [proposal, setProposal] = useState('');
    const [bulkText, setBulkText] = useState('');
    const [bulkSaving, setBulkSaving] = useState(false);

    const isCoreFourTournament = isLegacyCoreFourTournament(
        activeTournament?.id,
        activeTournament?.tournamentId
    );
    const isDraft = activeTournament?.status !== 'active';
    const isMember = !!(user && activeTournament?.memberIds?.includes(user.uid));
    const canBulkAddRules = isMember && isDraft && !isCoreFourTournament;
    const canProposeRules = isMember;

    const fetchRules = useCallback(async () => {
        if (!tournamentId) {
            setRules([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'rules'));
            await cleanupOldProposals(snap.docs, tournamentId);
            const fresh = await getDocs(collection(db, 'rules'));
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
                        await updateDoc(doc(db, 'rules', d.id), {
                            status: deleteField(),
                            expiredAt: deleteField(),
                        });
                    }
                    continue;
                }

                if (shouldExpireProposal(data?.createdAt, approvals, now, author)) {
                    if (data?.status !== 'expired') {
                        await updateDoc(doc(db, 'rules', d.id), { status: 'expired', expiredAt: new Date() });
                    }
                } else if (data?.status === 'expired') {
                    await updateDoc(doc(db, 'rules', d.id), {
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
                await setDoc(doc(db, 'rules', id), {
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
        const ref = doc(db, 'rules', id);
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
        const ref = doc(db, 'rules', rule.id);
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

    function renderRule({ item }: { item: RuleDoc }) {
        const approved = (item.approvals || []).length >= APPROVAL_THRESHOLD;
        const userHasApproved = (item.approvals || []).includes(user?.uid || '');
        const lockButton = approved && userHasApproved;
        const buttonDisabled = item.author === 'system' || isBulkSeedRule(item) || lockButton;
        const buttonLabel = item.author === 'system'
            ? '—'
            : lockButton
                ? 'Locked'
                : userHasApproved
                    ? 'Unapprove'
                    : 'Approve';
        return (
            <View style={styles.ruleRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.ruleText}>{item.text}</Text>
                    <Text style={{ color: '#666', fontSize: 12 }}>{getRuleSourceLabel(item, uidToName)}</Text>
                </View>
                <View style={styles.ruleMeta}>
                    {approved && <Text style={styles.acceptedBadge}>Accepted</Text>}
                    {item.lockedAt ? (
                        <Text style={{ color: '#444', fontSize: 11 }}>Locked {new Date(item.lockedAt.toDate ? item.lockedAt.toDate() : item.lockedAt).toLocaleDateString()}</Text>
                    ) : null}
                    <Text style={{ color: '#666', fontSize: 12 }}>{(item.approvals || []).length} approvals</Text>
                    {(item.approvals || []).length > 0 && (
                        <Text style={{ color: '#666', fontSize: 11 }}>{(item.approvals || []).map(a => uidToName[a] || a).join(', ')}</Text>
                    )}
                    {item.author !== 'system' ? (
                        <TouchableOpacity
                            style={[styles.approveButton, buttonDisabled ? styles.approveButtonDisabled : null]}
                            onPress={() => { if (!buttonDisabled) toggleApprove(item); }}
                        >
                            <Text style={{ color: '#fff' }}>{buttonLabel}</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.approveButton, styles.approveButtonDisabled]}>
                            <Text style={{ color: '#fff' }}>{buttonLabel}</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    }

    if (tournamentLoading || loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#FF6700" />
            </View>
        );
    }

    if (!tournamentId) {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>House Rules</Text>
                    <Text style={styles.muted}>Select a tournament to view or propose rules for that group.</Text>
                    <View style={{ height: 12 }} />
                    <Button title="Go to Tournaments" onPress={() => router.push('/(tabs)/tournaments')} />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.title}>House Rules</Text>
                    <Text style={styles.muted}>{activeTournament?.name}</Text>
                </View>
                <View style={styles.headerActions}>
                    {canBulkAddRules && (
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => setBulkModalVisible(true)}>
                            <Text style={{ color: '#013220', fontWeight: '600' }}>Bulk Add</Text>
                        </TouchableOpacity>
                    )}
                    {canProposeRules && (
                        <TouchableOpacity style={styles.newButton} onPress={() => setModalVisible(true)}>
                            <Text style={{ color: '#fff' }}>Propose Rule</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {canBulkAddRules && rules.length === 0 && (
                <View style={[styles.card, { marginBottom: 12 }]}>
                    <Text style={styles.muted}>
                        Tournament is in draft — paste your group&apos;s house rules with Bulk Add, or propose rules one at a time for the group to vote on.
                    </Text>
                </View>
            )}

            {rules.length === 0 ? (
                <View style={styles.card}>
                    <Text style={styles.muted}>
                        {canBulkAddRules
                            ? 'No rules yet. Use Bulk Add to paste several at once, or Propose Rule to start the vote.'
                            : 'No rules yet for this tournament.'}
                    </Text>
                </View>
            ) : (
                <FlatList data={rules} keyExtractor={r => r.id} renderItem={renderRule} ItemSeparatorComponent={() => <View style={{ height: 8 }} />} />
            )}

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.titleMd}>Propose a Rule</Text>
                        <Text style={styles.muted}>Applies to {activeTournament?.name}</Text>
                        <TextInput placeholder="Enter rule text" value={proposal} onChangeText={setProposal} style={styles.input} />
                        <View style={{ height: 12 }} />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity style={[styles.renegButton, { flex: 1 }]} onPress={() => { setModalVisible(false); setProposal(''); }}>
                                <Text style={{ textAlign: 'center' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.renegButton, { flex: 1 }]} onPress={proposeRule}>
                                <Text style={{ textAlign: 'center' }}>Propose</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={bulkModalVisible} animationType="slide" transparent>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.titleMd}>Bulk Add Rules</Text>
                        <Text style={styles.muted}>
                            One rule per line — added as accepted group rules for {activeTournament?.name}. Only available before the tournament starts.
                        </Text>
                        <TextInput
                            placeholder={'Screw the dealer\nPartners sit across\n...'}
                            value={bulkText}
                            onChangeText={setBulkText}
                            style={[styles.input, styles.textArea]}
                            multiline
                            numberOfLines={8}
                            textAlignVertical="top"
                        />
                        <View style={{ height: 12 }} />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                style={[styles.renegButton, { flex: 1 }]}
                                onPress={() => { setBulkModalVisible(false); setBulkText(''); }}
                            >
                                <Text style={{ textAlign: 'center' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.renegButton, { flex: 1 }]}
                                onPress={bulkAddRules}
                                disabled={bulkSaving || parseBulkRuleLines(bulkText).length === 0}
                            >
                                <Text style={{ textAlign: 'center' }}>{bulkSaving ? 'Saving…' : 'Add Rules'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#F7F7F8' },
    centered: { alignItems: 'center', justifyContent: 'center' },
    card: { backgroundColor: '#fff', padding: 12, borderRadius: 10 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 20, fontWeight: '800' },
    titleMd: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
    muted: { color: '#666', fontSize: 13, marginTop: 2 },
    newButton: { backgroundColor: '#FF6700', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    secondaryButton: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#013220' },
    ruleRow: { backgroundColor: '#fff', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', ...(Platform.OS === 'web' ? { boxShadow: '0 6px 18px rgba(0,0,0,0.06)' } : { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }) },
    ruleText: { fontSize: 16, marginBottom: 6 },
    ruleMeta: { flexDirection: 'column', alignItems: 'flex-end', marginLeft: 12 },
    approveButton: { backgroundColor: '#013220', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 6 },
    approveButtonDisabled: { backgroundColor: '#555' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    modalCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '90%' },
    input: { backgroundColor: '#F2F4F7', borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 16, color: '#111', marginTop: 8 },
    textArea: { height: 160, paddingTop: 12, paddingBottom: 12 },
    renegButton: { backgroundColor: '#F2F4F7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    acceptedBadge: { backgroundColor: '#2D9A4A', color: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
});
