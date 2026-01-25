import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useTournament } from '../contexts/TournamentContext';
import { gameService, renegService } from '../services/firestore';
import { webBoxShadow } from '../utils/shadow';

export default function GameScreen() {
    const { user } = useAuth();
    const params = useLocalSearchParams();
    const { activeTournament } = useTournament();

    const team1Ids: string[] = params.team1 ? JSON.parse(params.team1 as string) : [];
    const team2Ids: string[] = params.team2 ? JSON.parse(params.team2 as string) : [];
    const playerNames: Record<string, string> = params.playerNames ? JSON.parse(params.playerNames as string) : {};

    const players = [...team1Ids, ...team2Ids];

    const team1Names = team1Ids.map(id => playerNames[id] || id).join(' & ');
    const team2Names = team2Ids.map(id => playerNames[id] || id).join(' & ');

    const [winnerTeam, setWinnerTeam] = useState<'team1' | 'team2' | null>(null);
    const [renegExcuses, setRenegExcuses] = useState<Record<string, string[]>>({});
    const [excuseModalVisible, setExcuseModalVisible] = useState(false);
    const [activePlayerForExcuse, setActivePlayerForExcuse] = useState<string | null>(null);
    const [excuseInput, setExcuseInput] = useState('');
    const [location, setLocation] = useState('');
    const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
    const [locationModalVisible, setLocationModalVisible] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const tournamentIdParam: string | undefined = typeof params.tournamentId === 'string' ? (params.tournamentId as string) : undefined;
    const TOURNAMENT_ID = tournamentIdParam || activeTournament?.id || activeTournament?.tournamentId || '';

    const clearForm = () => {
        setWinnerTeam(null);
        setRenegExcuses({});
        setLocation('');
        setNotes('');
    };

    const handleSaveGame = async () => {
        if (!winnerTeam) {
            Alert.alert('Select Winner', 'Please select which team won.');
            return;
        }

        setSaving(true);
        let newGameId: string | null = null;
        let newRenegId: string | null = null;

        try {
            const team1IsWinner = winnerTeam === 'team1';

            newGameId = await gameService.createGame({
                timestamp: new Date(),
                location: location || 'Unknown Location',
                teams: [
                    { playerIds: team1Ids, score: team1IsWinner ? 1 : 0, isWinner: team1IsWinner },
                    { playerIds: team2Ids, score: team1IsWinner ? 0 : 1, isWinner: !team1IsWinner },
                ],
                tags: [],
                notes,
                tournamentId: TOURNAMENT_ID,
            });

            // Save any staged reneg entries recorded for players (one doc per staged excuse)
            const createdRenegIds: string[] = [];
            const entries = Object.entries(renegExcuses).filter(([, arr]) => (arr || []).length > 0);
            for (const [playerId, arr] of entries) {
                const excuses = [...(arr || [])];
                for (let i = 0; i < excuses.length; i++) {
                    const excuse = excuses[i] || '';
                    const id = await renegService.createReneg({ playerId, gameId: newGameId!, excuse, tournamentId: TOURNAMENT_ID, timestamp: new Date() });
                    createdRenegIds.push(id);
                }
            }

            // Navigate back to home after saving
            clearForm();
            router.push('/');
        } catch (err) {
            console.error('Error saving game:', err);
            Alert.alert('Error', 'Failed to save game.');
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.noticeText}>Please sign in to record games</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={[styles.titleMd, styles.centerText]}>Today's Matchup</Text>

                    <View style={[styles.team, styles.teamPrimary, styles.centeredTeam]}>
                        <Text style={[styles.teamTitle, styles.centerText]}>{team1Names}</Text>
                    </View>

                    <Text style={[styles.vsText, styles.centerText]}>VS</Text>

                    <View style={[styles.team, styles.teamSecondary, styles.centeredTeam]}>
                        <Text style={[styles.teamTitle, styles.centerText]}>{team2Names}</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.titleMd}>Result</Text>

                    <View style={styles.row}>
                        <TouchableOpacity style={[styles.resultBox, winnerTeam === 'team1' ? styles.resultSelected : null]} onPress={() => setWinnerTeam('team1')}>
                            <Text style={styles.resultTitle}>{team1Names} Wins</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.resultBox, winnerTeam === 'team2' ? styles.resultSelected : null]} onPress={() => setWinnerTeam('team2')}>
                            <Text style={styles.resultTitle}>{team2Names} Wins</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Renegs (optional)</Text>
                        <ScrollView horizontal contentContainerStyle={styles.playerRow} showsHorizontalScrollIndicator={false}>
                            {players.map(p => {
                                const excuses = renegExcuses[p] || [];
                                const previewRaw = (excuses || []).join('; ');
                                const preview = previewRaw.length > 80 ? previewRaw.slice(0, 77) + '...' : previewRaw;
                                return (
                                    <View key={p} style={styles.playerCard}>
                                        <TouchableOpacity onPress={() => { setActivePlayerForExcuse(p); setExcuseInput(''); setExcuseModalVisible(true); }}>
                                            <Text style={styles.playerName}>{playerNames[p] || p}</Text>
                                            {preview ? <Text style={styles.excusePreview}>({preview})</Text> : null}
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>
                    {/* Excuse modal */}
                    <Modal visible={excuseModalVisible} animationType="slide" transparent>
                        <View style={styles.modalBackdrop}>
                            <View style={styles.modalCard}>
                                <Text style={styles.titleMd}>Add Excuse for {activePlayerForExcuse ? playerNames[activePlayerForExcuse] || activePlayerForExcuse : ''}</Text>
                                <TextInput value={excuseInput} onChangeText={setExcuseInput} placeholder="Enter excuse..." style={styles.input} />
                                <View style={{ height: 12 }} />
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity style={[styles.renegButton, { flex: 1 }]} onPress={() => { setExcuseModalVisible(false); setActivePlayerForExcuse(null); setExcuseInput(''); }}>
                                        <Text style={{ textAlign: 'center' }}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.renegButton, { flex: 1 }]} onPress={() => {
                                        if (!activePlayerForExcuse) return;
                                        setRenegExcuses(prev => ({ ...prev, [activePlayerForExcuse]: [...(prev[activePlayerForExcuse] || []), excuseInput] }));
                                        setExcuseModalVisible(false);
                                        setExcuseInput('');
                                        setActivePlayerForExcuse(null);
                                    }}>
                                        <Text style={{ textAlign: 'center' }}>Save Excuse</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <View style={styles.field}>
                        <Text style={styles.label}>Location</Text>
                        <TouchableOpacity onPress={async () => {
                            // Fetch suggestions then open modal
                            try {
                                const suggestions = await gameService.getLocationSuggestions(TOURNAMENT_ID, 500);
                                setLocationSuggestions(suggestions);
                                setFilteredSuggestions(suggestions);
                            } catch (err) {
                                console.error('Failed to fetch location suggestions', err);
                                setLocationSuggestions([]);
                                setFilteredSuggestions([]);
                            }
                            setLocationModalVisible(true);
                        }}>
                            <View style={{ pointerEvents: 'none' }}>
                                <TextInput value={location} onChangeText={setLocation} placeholder="Where'd you play?" placeholderTextColor="#999" style={styles.input} editable={false} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <Modal visible={locationModalVisible} animationType="slide" transparent>
                        <View style={styles.modalBackdrop}>
                            <View style={[styles.modalCard, { maxHeight: '70%' }]}>
                                <Text style={styles.titleMd}>Choose Location</Text>
                                <TextInput
                                    value={location}
                                    onChangeText={(text) => {
                                        setLocation(text);
                                        // simple fuzzy filter
                                        const q = text.trim().toLowerCase();
                                        if (!q) {
                                            setFilteredSuggestions(locationSuggestions);
                                            return;
                                        }
                                        const scored = locationSuggestions.map(s => {
                                            const lower = s.toLowerCase();
                                            const score = lower.includes(q) ? 100 - lower.indexOf(q) : 0;
                                            return { s, score };
                                        }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
                                        setFilteredSuggestions(scored.map(x => x.s));
                                    }}
                                    placeholder="Type a location or pick one below"
                                    placeholderTextColor="#999"
                                    style={[styles.input, { marginTop: 8 }]}
                                />
                                <View style={{ height: 8 }} />
                                <TouchableOpacity style={[styles.renegButton]} onPress={() => { setLocationModalVisible(false); }}>
                                    <Text style={{ textAlign: 'center' }}>Use This Location</Text>
                                </TouchableOpacity>
                                <View style={{ height: 8 }} />
                                <TouchableOpacity style={[styles.renegButton]} onPress={async () => {
                                    // Fetch all past locations (maxGames = 0 means no limit)
                                    try {
                                        const suggestions = await gameService.getLocationSuggestions(TOURNAMENT_ID, 0, true);
                                        setLocationSuggestions(suggestions);
                                        setFilteredSuggestions(suggestions);
                                    } catch (err) {
                                        console.error('Failed to fetch all location suggestions', err);
                                        setLocationSuggestions([]);
                                        setFilteredSuggestions([]);
                                    }
                                }}>
                                    <Text style={{ textAlign: 'center' }}>Show All Locations</Text>
                                </TouchableOpacity>
                                <View style={{ height: 12 }} />
                                <ScrollView style={{ marginTop: 8 }}>
                                    {filteredSuggestions.length === 0 && <Text style={{ color: '#666' }}>No recent locations</Text>}
                                    {filteredSuggestions.map((loc, idx) => (
                                        <TouchableOpacity key={idx} onPress={() => { setLocation(loc); setLocationModalVisible(false); }} style={styles.locationRow}>
                                            <Text style={{ fontSize: 16 }}>{loc}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <View style={{ height: 12 }} />
                                <TouchableOpacity style={[styles.renegButton]} onPress={() => setLocationModalVisible(false)}>
                                    <Text style={{ textAlign: 'center' }}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    <View style={styles.field}>
                        <Text style={styles.label}>Notes (optional)</Text>
                        <TextInput value={notes} onChangeText={setNotes} placeholder="Any notable events?" placeholderTextColor="#999" multiline numberOfLines={3} textAlignVertical="top" style={[styles.input, styles.textArea]} />
                    </View>
                </View>

                <View style={styles.actions}>
                    <Button title="📝 Record Game" onPress={handleSaveGame} size="lg" variant="primary" loading={saving} disabled={saving} />
                    <View style={{ height: 12 }} />
                    <Button title="Cancel" onPress={() => router.back()} size="md" variant="secondary" disabled={saving} />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F7F8' },
    centered: { alignItems: 'center', justifyContent: 'center' },
    content: { padding: 16, paddingBottom: 56, gap: 20 },
    headerCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, ...(Platform.OS === 'web' ? { boxShadow: webBoxShadow('rgba(0,0,0,0.06)', 6, 12) } : { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }) },
    subtitle: { fontSize: 12, fontWeight: '700', color: '#666' },
    title: { fontSize: 22, fontWeight: '800', marginTop: 6, marginBottom: 6 },
    muted: { color: '#666' },
    card: { backgroundColor: '#fff', padding: 12, borderRadius: 12, ...(Platform.OS === 'web' ? { boxShadow: webBoxShadow('rgba(0,0,0,0.06)', 6, 12) } : { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }) },
    team: { padding: 12, borderRadius: 8, marginBottom: 8 },
    teamPrimary: { backgroundColor: '#FFEDD8' },
    teamSecondary: { backgroundColor: '#E9F7F1' },
    teamTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
    playerName: { fontSize: 16, color: '#333', marginBottom: 2 },
    vsText: { textAlign: 'center', fontSize: 18, fontWeight: '800', marginVertical: 8, color: '#B8860B' },
    titleMd: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
    centerText: { textAlign: 'center' },
    centeredTeam: { alignItems: 'center', justifyContent: 'center' },
    row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    flex1: { flex: 1 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
    input: { backgroundColor: '#F2F4F7', borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 16, color: '#111' },
    textArea: { height: 100, paddingTop: 10 },
    actions: { marginTop: 8 },
    noticeText: { fontSize: 16, color: '#333' },
    field: { marginBottom: 12 },
    resultBox: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
    resultSelected: { backgroundColor: '#FFE9D6', borderColor: '#FFAB6B', borderWidth: 1 },
    resultTitle: { fontSize: 16, fontWeight: '700' },
    playerChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, marginRight: 8, marginBottom: 8 },
    playerChipSelected: { backgroundColor: '#FFEDD8' },
    playerChipUnselected: { backgroundColor: '#F2F4F7' },
    playerChipText: { color: '#111' },
    playerChipTextSelected: { color: '#111', fontWeight: '700' },
    renegRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    renegControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    renegButton: { backgroundColor: '#F2F4F7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    renegButtonText: { fontSize: 18, fontWeight: '700' },
    renegCount: { marginHorizontal: 8, fontSize: 16, minWidth: 20, textAlign: 'center' },
    excusePreview: { color: '#666', fontSize: 12, marginTop: 2 },
    playerRow: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
    playerCard: { backgroundColor: '#fff', padding: 10, borderRadius: 10, marginRight: 8, minWidth: 120, maxWidth: 220, ...(Platform.OS === 'web' ? { boxShadow: webBoxShadow('rgba(0,0,0,0.04)', 4, 8) } : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }) },
    locationRow: { paddingVertical: 10, borderBottomColor: '#EEE', borderBottomWidth: 1 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    modalCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '90%' },
});

