import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { userService } from '../../services/firestore';
import { APPROVAL_THRESHOLD, computeNextApprovals, isProposalExpired } from '../../utils/rules';

type RuleDoc = {
    id: string;
    text: string;
    author: string;
    approvals: string[];
    createdAt: any;
    lockedAt?: any;
};

export default function RulesScreen() {
    const { user } = useAuth();
    const [rules, setRules] = useState<RuleDoc[]>([]);
    const [uidToName, setUidToName] = useState<Record<string, string>>({});
    const [modalVisible, setModalVisible] = useState(false);
    const [proposal, setProposal] = useState('');

    useEffect(() => {
        fetchRules();
    }, []);

    async function fetchRules() {
        const snap = await getDocs(collection(db, 'rules'));
        await cleanupOldProposals(snap.docs);
        const fresh = await getDocs(collection(db, 'rules'));
        const arr: RuleDoc[] = fresh.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        // Sort to show built-in rules first, then proposals
        arr.sort((a, b) => {
            const aIsBuiltin = a.author === 'system';
            const bIsBuiltin = b.author === 'system';
            if (aIsBuiltin && !bIsBuiltin) return -1;
            if (!aIsBuiltin && bIsBuiltin) return 1;
            return 0;
        });

        // Build list of UIDs to resolve to display names (authors + approvers), excluding 'system'
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
                } catch (err) {
                    return [uid, uid] as [string, string];
                }
            }));
            const map: Record<string, string> = {};
            for (const [k, v] of entries) map[k] = v;
            setUidToName(map);
        }

        setRules(arr);
    }

    async function cleanupOldProposals(docs: any[]) {
        const now = Date.now();
        for (const d of docs) {
            try {
                const data = d.data();
                const approvals = data?.approvals || [];
                if (isProposalExpired(data?.createdAt, approvals.length, now)) {
                    await deleteDoc(doc(db, 'rules', d.id));
                }
            } catch (err) {
                console.warn('cleanupOldProposals error for doc', d.id, err);
            }
        }
    }

    async function proposeRule() {
        if (!user) return;
        if (!proposal.trim()) return;
        const id = encodeURIComponent(proposal.trim()).slice(0, 80) + '-' + Date.now();
        const ref = doc(db, 'rules', id);
        await setDoc(ref, {
            text: proposal.trim(),
            author: user.uid,
            approvals: [user.uid],
            createdAt: new Date(),
            lockedAt: null
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
            // Backfill if missing
            lockedAt = new Date();
        }

        await updateDoc(ref, { approvals: next, lockedAt });
        fetchRules();
    }

    function renderRule({ item }: { item: RuleDoc }) {
        const approved = (item.approvals || []).length >= APPROVAL_THRESHOLD;
        const userHasApproved = (item.approvals || []).includes(user?.uid || '');
        const lockButton = approved && userHasApproved;
        const buttonDisabled = item.author === 'system' || lockButton;
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
                    <Text style={{ color: '#666', fontSize: 12 }}>{item.author === 'system' ? 'House rule (pre-agreed)' : `Proposed by ${uidToName[item.author] || item.author}`}</Text>
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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>House Rules</Text>
                <TouchableOpacity style={styles.newButton} onPress={() => setModalVisible(true)}>
                    <Text style={{ color: '#fff' }}>Propose Rule</Text>
                </TouchableOpacity>
            </View>

            <FlatList data={rules} keyExtractor={r => r.id} renderItem={renderRule} ItemSeparatorComponent={() => <View style={{ height: 8 }} />} />

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.titleMd}>Propose a Rule</Text>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#F7F7F8' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 20, fontWeight: '800' },
    newButton: { backgroundColor: '#FF6700', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    ruleRow: { backgroundColor: '#fff', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', ...(Platform.OS === 'web' ? { boxShadow: '0 6px 18px rgba(0,0,0,0.06)' } : { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }) },
    ruleText: { fontSize: 16, marginBottom: 6 },
    ruleMeta: { flexDirection: 'column', alignItems: 'flex-end', marginLeft: 12 },
    approveButton: { backgroundColor: '#013220', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 6 },
    approveButtonDisabled: { backgroundColor: '#555' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    modalCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '90%' },
    titleMd: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
    input: { backgroundColor: '#F2F4F7', borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 16, color: '#111' },
    renegButton: { backgroundColor: '#F2F4F7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    acceptedBadge: { backgroundColor: '#2D9A4A', color: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden', marginBottom: 6 }
});
