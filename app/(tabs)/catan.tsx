import React from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button } from '../../components/Button';
import { CatanBoardView } from '../../components/CatanBoardView';
import { TournamentInvitePanel } from '../../components/TournamentInvitePanel';
import { useAuth } from '../../contexts/AuthContext';
import { useTournament } from '../../contexts/TournamentContext';
import { useCatanScreenData } from '../../hooks/useCatanScreenData';
import { useTournamentAccess } from '../../hooks/useTournamentAccess';
import { useTournamentHomeRedirect } from '../../hooks/useTournamentHomeRedirect';
import { CATAN_EXPANSION_LABELS, CATAN_EXPANSIONS, CATAN_WINNING_SCORE } from '../../utils/catanScoring';

export default function CatanScreen() {
    const { user } = useAuth();
    const { activeTournament, startupReady } = useTournament();
    useTournamentHomeRedirect('catan');
    const tournamentId = activeTournament?.id || '';
    const { isCoreFourLocked: isCoreFour, isCatan } = useTournamentAccess(activeTournament, user?.uid);
    const isOtherTypeTournament = !!activeTournament && !isCatan;

    const {
        players,
        presentIds,
        presentPlayers,
        loading,
        saving,
        scoreInputs,
        notes,
        setNotes,
        recentGames,
        leaderboard,
        boardExpansion,
        setBoardExpansion,
        board,
        load,
        togglePresent,
        setScore,
        saveGame,
        randomizeBoard,
    } = useCatanScreenData(tournamentId, isCoreFour, startupReady, user ?? null);

    if (!startupReady || loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#FF6700" />
            </View>
        );
    }

    if (isCoreFour) {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>Catan</Text>
                    <Text style={styles.muted}>
                        Catan is for separate groups — create or select a Catan tournament.
                    </Text>
                </View>
            </View>
        );
    }

    if (isOtherTypeTournament) {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>Catan</Text>
                    <Text style={styles.muted}>
                        {activeTournament?.name} isn&apos;t a Catan tournament. Select or create one to
                        record games here.
                    </Text>
                </View>
            </View>
        );
    }

    if (!tournamentId) {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>Catan</Text>
                    <Text style={styles.muted}>Select a tournament first to load your group.</Text>
                </View>
            </View>
        );
    }

    if (players.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>Catan</Text>
                    <Text style={styles.muted}>
                        No players in {activeTournament?.name} yet. Invite your group below.
                    </Text>
                    {activeTournament && (
                        <TournamentInvitePanel
                            tournamentId={activeTournament.id}
                            tournamentName={activeTournament.name}
                            memberIds={activeTournament.memberIds}
                            onMemberAdded={load}
                        />
                    )}
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.card}>
                <Text style={styles.eyebrow}>{activeTournament?.name}</Text>
                <Text style={styles.title}>Board randomizer</Text>
                <Text style={styles.muted}>
                    Random tiles and numbers, keeping the two 6/8 tiles apart — the official
                    fairness rule for a random setup.
                </Text>

                <View style={styles.chipRow}>
                    {CATAN_EXPANSIONS.map(e => (
                        <TouchableOpacity
                            key={e}
                            style={[styles.chip, boardExpansion === e && styles.chipActive]}
                            onPress={() => setBoardExpansion(e)}
                        >
                            <Text style={[styles.chipText, boardExpansion === e && styles.chipTextActive]}>
                                {CATAN_EXPANSION_LABELS[e]}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ height: 12 }} />
                <Button title={board ? 'Shuffle again' : 'Generate board'} onPress={randomizeBoard} />

                {board && (
                    <View style={{ marginTop: 16 }}>
                        <CatanBoardView board={board} />
                    </View>
                )}
            </View>

            <View style={[styles.card, { marginTop: 12 }]}>
                <Text style={styles.title}>Record a game</Text>
                <Text style={styles.muted}>
                    First to {CATAN_WINNING_SCORE} wins — enter everyone&apos;s final score.
                </Text>

                <Text style={styles.sectionLabel}>Who played</Text>
                {players.map(p => (
                    <View key={p.uid} style={styles.playerRow}>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => togglePresent(p.uid)}>
                            <Text style={styles.playerName}>{p.displayName}</Text>
                        </TouchableOpacity>
                        {presentIds.has(p.uid) ? (
                            <TextInput
                                value={scoreInputs[p.uid] ?? ''}
                                onChangeText={text => setScore(p.uid, text)}
                                keyboardType="number-pad"
                                placeholder="Score"
                                style={styles.scoreInput}
                            />
                        ) : (
                            <Text style={styles.presentOff}>Out</Text>
                        )}
                    </View>
                ))}

                <Text style={styles.sectionLabel}>Notes (optional)</Text>
                <TextInput
                    placeholder="Longest road tiebreaker, house rules…"
                    value={notes}
                    onChangeText={setNotes}
                    style={styles.notesInput}
                />

                <View style={{ height: 12 }} />
                <Button
                    title="Save game"
                    onPress={saveGame}
                    disabled={saving || presentPlayers.length < 3}
                />
            </View>

            <View style={[styles.card, { marginTop: 12 }]}>
                <Text style={styles.sectionLabel}>Leaderboard</Text>
                {leaderboard.length === 0 ? (
                    <Text style={styles.muted}>No games recorded yet.</Text>
                ) : (
                    leaderboard.map(s => (
                        <View key={s.userId} style={styles.totalRow}>
                            <Text style={styles.totalName}>{s.displayName}</Text>
                            <Text style={styles.totalScore}>
                                {s.wins}W / {s.gamesPlayed}G{' '}
                                <Text style={styles.mutedInline}>
                                    ({s.winPercentage}% · avg {s.avgScore ?? '—'})
                                </Text>
                            </Text>
                        </View>
                    ))
                )}
            </View>

            <View style={[styles.card, { marginTop: 12 }]}>
                <Text style={styles.sectionLabel}>Recent games</Text>
                {recentGames.length === 0 ? (
                    <Text style={styles.muted}>No games yet.</Text>
                ) : (
                    recentGames.map(g => {
                        const nameOf = (uid: string) => players.find(p => p.uid === uid)?.displayName ?? uid;
                        return (
                            <View key={g.id} style={styles.gameRow}>
                                <Text style={styles.mutedSmall}>
                                    {g.timestamp.toLocaleDateString()} · {CATAN_EXPANSION_LABELS[g.expansion]}
                                </Text>
                                <Text>
                                    {[...g.players]
                                        .sort((a, b) => b.score - a.score)
                                        .map(p => `${nameOf(p.playerId)} ${p.score}${p.isWinner ? ' 🏆' : ''}`)
                                        .join(' · ')}
                                </Text>
                            </View>
                        );
                    })
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F7F8' },
    content: { padding: 16, paddingBottom: 32 },
    centered: { alignItems: 'center', justifyContent: 'center' },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        maxWidth: 560,
        width: '100%',
        alignSelf: 'center',
    },
    eyebrow: { fontSize: 12, fontWeight: '700', color: '#FF6700', textTransform: 'uppercase' },
    title: { fontSize: 20, fontWeight: '800', marginTop: 4 },
    muted: { color: '#666', fontSize: 14, marginTop: 4 },
    mutedSmall: { color: '#999', fontSize: 12 },
    mutedInline: { color: '#999', fontWeight: '400', fontSize: 13 },
    sectionLabel: { fontWeight: '700', fontSize: 15, marginTop: 16, marginBottom: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#F0F0F0',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    chipActive: { backgroundColor: '#013220', borderColor: '#013220' },
    chipText: { fontSize: 13, fontWeight: '600', color: '#333' },
    chipTextActive: { color: '#F5F5DC' },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        gap: 8,
    },
    playerName: { fontWeight: '600' },
    presentOff: { color: '#999' },
    scoreInput: {
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 8,
        padding: 8,
        width: 70,
        textAlign: 'center',
        fontSize: 16,
    },
    notesInput: {
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 8,
        padding: 10,
        marginTop: 4,
        fontSize: 16,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    totalName: { fontWeight: '600' },
    totalScore: { fontWeight: '800', color: '#013220' },
    gameRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
});
