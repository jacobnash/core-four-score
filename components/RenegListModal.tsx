import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { renegService, userService } from '../services/firestore';
import { Reneg } from '../types';

interface Props {
    visible: boolean;
    userId: string;
    onClose: () => void;
}

export default function RenegListModal({ visible, userId, onClose }: Props) {
    const [renegs, setRenegs] = useState<Reneg[]>([]);
    const [loading, setLoading] = useState(false);
    const [displayName, setDisplayName] = useState<string>('');
    const [fallbackNote, setFallbackNote] = useState<string | null>(null);
    const [recentSample, setRecentSample] = useState<Array<{ id: string; playerId: string; ts: Date }>>([]);

    const dedupeRenegs = (items: Reneg[]) => {
        const seen = new Set<string>();
        const out: Reneg[] = [];
        for (const r of items) {
            const idKey = r.id || '';
            const timeKey = r.timestamp ? new Date(r.timestamp).toISOString() : '';
            const key = idKey || `${r.playerId}::${timeKey}::${(r.excuse || '').trim()}`;
            if (!seen.has(key)) {
                seen.add(key);
                out.push(r);
            }
        }
        return out;
    };

    useEffect(() => {
        let mounted = true;
        if (!visible) return;
        (async () => {
            setLoading(true);
            try {
                console.log('RenegListModal: fetching renegs for userId=', userId);
                const user = await userService.getUser(userId);
                if (mounted && user) setDisplayName(user.displayName);
                const playerRenegs = await renegService.getRenegsByPlayer(userId, 200);
                console.log(`RenegListModal: fetched ${playerRenegs.length} renegs for ${userId}`);
                if (!mounted) return;
                if (playerRenegs.length > 0) {
                    setRenegs(dedupeRenegs(playerRenegs));
                } else {
                    // Try a fallback scan of recent renegs in case historical/imported renegs used a different id format
                    setFallbackNote(null);
                    if (user && user.displayName) {
                        const recent = await renegService.getRenegs(200);
                        // Keep a small sample for UI inspection
                        setRecentSample(recent.slice(0, 10).map(r => ({ id: r.id, playerId: String(r.playerId || ''), ts: r.timestamp })));
                        console.log('RenegListModal: recent renegs sample', recent.slice(0, 10).map(r => ({ id: r.id, playerId: r.playerId })));
                        const matches = recent.filter(r => {
                            if (!r.playerId) return false;
                            const pid = String(r.playerId);
                            const dn = user.displayName || '';
                            return pid === userId || pid === dn || pid.toLowerCase() === dn.toLowerCase() || pid.includes(dn) || dn.includes(pid);
                        });

                        console.log(`RenegListModal: fallback matched ${matches.length} renegs for displayName=${user.displayName}`);
                        if (matches.length > 0) {
                            setRenegs(dedupeRenegs(matches));
                            setFallbackNote('Showing matches from recent renegs (fallback search)');
                        } else {
                            setRenegs([]);
                        }
                    } else {
                        setRenegs([]);
                    }
                }
            } catch (err) {
                console.error('Failed to load reneg list', err);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, [visible, userId]);

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <Text style={styles.title}>Renegs for {displayName || userId}</Text>
                    {fallbackNote ? <Text style={styles.fallback}>{fallbackNote}</Text> : null}
                    {loading ? <ActivityIndicator color="#FF6700" /> : (
                        <ScrollView style={{ maxHeight: 300 }}>
                            {renegs.length === 0 ? (
                                <>
                                    <Text style={styles.empty}>No renegs found</Text>
                                    {recentSample.length > 0 && (
                                        <View style={{ marginTop: 12 }}>
                                            <Text style={{ fontWeight: '700', marginBottom: 6 }}>Recent renegs sample (id — playerId — date)</Text>
                                            {Array.from(new Map(recentSample.map(s => [s.id + '::' + s.playerId, s])).values()).map(s => (
                                                <View key={s.id + '-' + s.playerId} style={{ paddingVertical: 4 }}>
                                                    <Text style={{ color: '#444' }}>{s.id} — {s.playerId} — {new Date(s.ts).toLocaleDateString()}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </>
                            ) : (
                                renegs.map(r => (
                                    <View key={r.id} style={styles.row}>
                                        <Text style={styles.excuse}>{r.excuse || '(no excuse)'}</Text>
                                        <Text style={styles.ts}>{new Date(r.timestamp).toLocaleDateString()}</Text>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    )}

                    <View style={{ height: 12 }} />
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={{ textAlign: 'center' }}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    card: { backgroundColor: '#fff', padding: 12, borderRadius: 12, width: '90%' },
    title: { fontWeight: '800', fontSize: 18, marginBottom: 8 },
    fallback: { color: '#A00', marginBottom: 8, fontSize: 12 },
    row: { borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 8 },
    excuse: { color: '#333' },
    ts: { color: '#666', marginTop: 6 },
    empty: { color: '#666' },
    closeButton: { marginTop: 8, backgroundColor: '#F2F4F7', padding: 10, borderRadius: 8 }
});


