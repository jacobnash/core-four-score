import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { userService } from '../../services/firestore';

type RuleDoc = {
    id: string;
    text: string;
    author: string;
    approvals: string[];
    createdAt: any;
};

const BUILT_IN_RULES: RuleDoc[] = [
    { id: 'builtin-1', text: "Thou shall'nt re nor neg; and when thou shall re or neg or re and neg, thou shall't alloweth the opponent", author: 'system', approvals: [], createdAt: new Date() },
    { id: 'builtin-2', text: 'Rules for the farmer: 3 of a kind of 9 or 10. Whoever calls it first gets to swap', author: 'system', approvals: [], createdAt: new Date() },
    { id: 'builtin-3', text: 'If you lead two cards, and do not win both tricks, you lose the lead for the following hand', author: 'system', approvals: [], createdAt: new Date() },
    { id: 'builtin-4', text: 'Screw the dealer', author: 'system', approvals: [], createdAt: new Date() },
    { id: 'builtin-5', text: "When making it next, if a suit is called, as soon as play begins, the called suit cannot be changed", author: 'system', approvals: [], createdAt: new Date() },
    { id: 'builtin-6', text: "You can \"me too\" but you can't \"not me\" during braveheart", author: 'system', approvals: [], createdAt: new Date() },
    { id: 'builtin-7', text: "You can play out of turn if it doesn't effect the result of the hand", author: 'system', approvals: [], createdAt: new Date() },
    { id: 'builtin-8', text: 'A card once laid is a fate sealed.', author: 'system', approvals: [], createdAt: new Date() },
    { id: 'builtin-9', text: "A card once cast from the hand doth lie bare for all to see, yet may be summoned from memory by the rival faction. But mark ye this: both members of the opposing side must, with solemn accord, speak what the card was, else it shall not be branded a reneg.", author: 'system', approvals: [], createdAt: new Date() },
    { id: 'builtin-10', text: "You aren't allowed to play a card from any source except your hand. I.e if you play a card from a source that is not your hand, it is a reneg", author: 'system', approvals: [], createdAt: new Date() },
    { id: 'builtin-11', text: 'Not discarding, no matter the circumstances of the hands, is illegal and counts as a misdeal', author: 'system', approvals: [], createdAt: new Date() },
    { id: 'builtin-12', text: 'If multiple cards are played at once, the opponent can decide the order in that the cards were played', author: 'system', approvals: [], createdAt: new Date() },
];

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
        // Remove any firestore rule that exactly matches a built-in text
        const builtinTexts = new Set(BUILT_IN_RULES.map(r => r.text.trim()));
        const filtered = arr.filter(r => !builtinTexts.has((r.text || '').trim()));
        const combined = [...BUILT_IN_RULES, ...filtered];

        // Build list of UIDs to resolve to display names (authors + approvers), excluding 'system'
        const uidSet = new Set<string>();
        for (const r of combined) {
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

        setRules(combined);
    }

    async function cleanupOldProposals(docs: any[]) {
        const now = Date.now();
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        for (const d of docs) {
            try {
                const data = d.data();
                const approvals = data?.approvals || [];
                if (approvals.length >= 3) continue;
                let createdAt = data?.createdAt;
                if (!createdAt) continue;
                if (typeof createdAt.toDate === 'function') createdAt = createdAt.toDate();
                else createdAt = new Date(createdAt);
                if (now - new Date(createdAt).getTime() > weekMs) {
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
            createdAt: new Date()
        });
        setModalVisible(false);
        setProposal('');
        fetchRules();
    }

    async function toggleApprove(rule: RuleDoc) {
        if (!user) return;
        const ref = doc(db, 'rules', rule.id);
        const has = (rule.approvals || []).includes(user.uid);
        const next = has ? rule.approvals.filter(a => a !== user.uid) : [...(rule.approvals || []), user.uid];
        await updateDoc(ref, { approvals: next });
        fetchRules();
    }

    function renderRule({ item }: { item: RuleDoc }) {
        const approved = (item.approvals || []).length >= 3;
        return (
            <View style={styles.ruleRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.ruleText}>{item.text}</Text>
                    <Text style={{ color: '#666', fontSize: 12 }}>{item.author === 'system' ? 'House rule (pre-agreed)' : `Proposed by ${uidToName[item.author] || item.author}`}</Text>
                </View>
                <View style={styles.ruleMeta}>
                    {approved && <Text style={styles.acceptedBadge}>Accepted</Text>}
                    <Text style={{ color: '#666', fontSize: 12 }}>{(item.approvals || []).length} approvals</Text>
                    {(item.approvals || []).length > 0 && (
                        <Text style={{ color: '#666', fontSize: 11 }}>{(item.approvals || []).map(a => uidToName[a] || a).join(', ')}</Text>
                    )}
                    {item.author !== 'system' ? (
                        <TouchableOpacity style={styles.approveButton} onPress={() => toggleApprove(item)}>
                            <Text style={{ color: '#fff' }}>{(item.approvals || []).includes(user?.uid || '') ? 'Unapprove' : 'Approve'}</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.approveButton, { backgroundColor: '#999' }]}>
                            <Text style={{ color: '#fff' }}>—</Text>
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
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    modalCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '90%' },
    titleMd: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
    input: { backgroundColor: '#F2F4F7', borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 16, color: '#111' },
    renegButton: { backgroundColor: '#F2F4F7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    acceptedBadge: { backgroundColor: '#2D9A4A', color: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden', marginBottom: 6 }
});
