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
import { TournamentInvitePanel } from '../../components/TournamentInvitePanel';
import { useAuth } from '../../contexts/AuthContext';
import { useTournament } from '../../contexts/TournamentContext';
import { useClaysScreenData } from '../../hooks/useClaysScreenData';
import { useTournamentAccess } from '../../hooks/useTournamentAccess';
import { useTournamentHomeRedirect } from '../../hooks/useTournamentHomeRedirect';
import {
    CLAY_DISCIPLINE_LABELS,
    CLAY_DISCIPLINES,
    CLAY_PAIR_HINTS,
    CLAY_PAIR_LABELS,
    CLAY_PAIR_TYPES,
    CLAYS_ROLLING_MONTHS,
    defaultExpectedTargets,
    isSportingDiscipline,
    PAIR_BIRD_LABELS,
} from '../../utils/claysScoring';

export default function ClaysScreen() {
    const { user } = useAuth();
    const { activeTournament, startupReady } = useTournament();
    useTournamentHomeRedirect('clays');
    const tournamentId = activeTournament?.id || '';
    const { isCoreFourLocked: isCoreFour, isClays } = useTournamentAccess(activeTournament, user?.uid);
    const isEuchreTournament = !!activeTournament && !isClays;

    const {
        shooters,
        presentIds,
        loading,
        saving,
        activeMatch,
        discipline,
        setDiscipline,
        expectedTargetsInput,
        setExpectedTargetsInput,
        matchNotes,
        setMatchNotes,
        pairType,
        setPairType,
        shooterIndex,
        birdResultsSoFar,
        station,
        setStation,
        rollingStats,
        presentShooters,
        birdCount,
        currentShooter,
        birdIndex,
        presentationNumber,
        birdsScored,
        expectedTargets,
        matchTotals,
        load,
        togglePresent,
        startMatch,
        endMatch,
        recordBird,
        undoLast,
        skipShooter,
        currentBirdLabel,
    } = useClaysScreenData(tournamentId, isCoreFour, startupReady, user ?? null);

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
                    <Text style={styles.title}>Clays scoring</Text>
                    <Text style={styles.muted}>
                        Clays is for separate shooting groups — create or select a clays tournament.
                    </Text>
                </View>
            </View>
        );
    }

    if (isEuchreTournament) {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>Clays scoring</Text>
                    <Text style={styles.muted}>
                        {activeTournament?.name} is a euchre tournament. Select a clays tournament to score shooting.
                    </Text>
                </View>
            </View>
        );
    }

    if (!tournamentId) {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>Clays scoring</Text>
                    <Text style={styles.muted}>Select a tournament first to load your squad.</Text>
                </View>
            </View>
        );
    }

    if (shooters.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>Clays scoring</Text>
                    <Text style={styles.muted}>
                        No shooters in {activeTournament?.name} yet. Invite your squad below.
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

    if (!activeMatch) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.eyebrow}>{activeTournament?.name}</Text>
                    <Text style={styles.title}>New match</Text>
                    <Text style={styles.muted}>Pick discipline and expected targets before shooting.</Text>

                    <Text style={styles.sectionLabel}>Discipline</Text>
                    <View style={styles.chipRow}>
                        {CLAY_DISCIPLINES.map(d => (
                            <TouchableOpacity
                                key={d}
                                style={[styles.chip, discipline === d && styles.chipActive]}
                                onPress={() => setDiscipline(d)}
                            >
                                <Text style={[styles.chipText, discipline === d && styles.chipTextActive]}>
                                    {CLAY_DISCIPLINE_LABELS[d]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {isSportingDiscipline(discipline) ? (
                        <Text style={styles.hint}>
                            Sporting clays — set total targets for this course (e.g. 50 or 100).
                        </Text>
                    ) : (
                        <Text style={styles.hint}>
                            {CLAY_DISCIPLINE_LABELS[discipline]} uses a fixed {defaultExpectedTargets(discipline)}-target round.
                        </Text>
                    )}

                    <Text style={styles.sectionLabel}>Expected targets</Text>
                    <TextInput
                        value={expectedTargetsInput}
                        onChangeText={setExpectedTargetsInput}
                        keyboardType="number-pad"
                        style={styles.stationInput}
                        editable={isSportingDiscipline(discipline)}
                    />

                    <Text style={styles.sectionLabel}>Notes (optional)</Text>
                    <TextInput
                        placeholder="Course name, main field…"
                        value={matchNotes}
                        onChangeText={setMatchNotes}
                        style={styles.stationInput}
                    />

                    <Text style={styles.sectionLabel}>Squad today</Text>
                    {shooters.map(s => (
                        <TouchableOpacity
                            key={s.uid}
                            style={styles.presentRow}
                            onPress={() => togglePresent(s.uid)}
                        >
                            <Text style={styles.presentName}>{s.displayName}</Text>
                            <Text style={presentIds.has(s.uid) ? styles.presentOn : styles.presentOff}>
                                {presentIds.has(s.uid) ? 'Shooting' : 'Out'}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    <View style={{ height: 16 }} />
                    <Button
                        title="Start match"
                        onPress={startMatch}
                        disabled={saving || presentShooters.length === 0}
                    />
                </View>
            </ScrollView>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.card}>
                <Text style={styles.eyebrow}>
                    {CLAY_DISCIPLINE_LABELS[activeMatch.discipline]} · {activeTournament?.name}
                </Text>
                <Text style={styles.matchProgress}>
                    Presentation {presentationNumber} · {birdsScored}/{expectedTargets} birds
                </Text>
                <Text style={styles.shooterName}>{currentShooter?.displayName}</Text>
                <Text style={styles.muted}>
                    Shooter {presentShooters.length ? shooterIndex + 1 : 0} of {presentShooters.length}
                </Text>

                {isSportingDiscipline(activeMatch.discipline) && (
                    <>
                        <Text style={styles.sectionLabel}>Where</Text>
                        <TextInput
                            placeholder="Stand / station"
                            value={station}
                            onChangeText={setStation}
                            style={styles.stationInput}
                        />
                    </>
                )}

                <Text style={styles.sectionLabel}>How</Text>
                <View style={styles.chipRow}>
                    {CLAY_PAIR_TYPES.map(t => (
                        <TouchableOpacity
                            key={t}
                            style={[styles.chip, pairType === t && styles.chipActive]}
                            onPress={() => setPairType(t)}
                        >
                            <Text style={[styles.chipText, pairType === t && styles.chipTextActive]}>
                                {CLAY_PAIR_LABELS[t]}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.hint}>{CLAY_PAIR_HINTS[pairType]}</Text>

                <Text style={styles.birdPrompt}>
                    {currentBirdLabel
                        ? `${currentBirdLabel} — hit or miss?`
                        : birdCount === 1
                          ? 'Hit or miss?'
                          : `Bird ${birdIndex + 1} of ${birdCount}`}
                </Text>
                {birdResultsSoFar.length > 0 && birdCount > 1 && (
                    <Text style={[styles.muted, { textAlign: 'center', marginBottom: 8 }]}>
                        So far:{' '}
                        {birdResultsSoFar
                            .map((h, i) => `${PAIR_BIRD_LABELS[i] ?? i + 1}: ${h ? 'Hit' : 'Miss'}`)
                            .join(' · ')}
                    </Text>
                )}

                <View style={styles.scoreRow}>
                    <TouchableOpacity
                        style={[styles.bigButton, styles.hitButton]}
                        onPress={() => recordBird(true)}
                        disabled={saving}
                    >
                        <Text style={styles.bigButtonText}>HIT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.bigButton, styles.missButton]}
                        onPress={() => recordBird(false)}
                        disabled={saving}
                    >
                        <Text style={styles.bigButtonText}>MISS</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.secondaryRow}>
                    <Button title="Skip" onPress={skipShooter} />
                    <View style={{ width: 8 }} />
                    <Button title="Undo" onPress={undoLast} />
                    <View style={{ width: 8 }} />
                    <Button title="End match" onPress={endMatch} />
                </View>
            </View>

            <View style={[styles.card, { marginTop: 12 }]}>
                <Text style={styles.sectionLabel}>This match</Text>
                {matchTotals.length === 0 ? (
                    <Text style={styles.muted}>No scores yet — tap HIT/MISS to start.</Text>
                ) : (
                    matchTotals.map(t => (
                        <View key={t.shooterId} style={styles.totalRow}>
                            <Text style={styles.totalName}>{t.name}</Text>
                            <Text style={styles.totalScore}>
                                {t.hits}/{t.possible}
                            </Text>
                        </View>
                    ))
                )}
            </View>

            <View style={[styles.card, { marginTop: 12 }]}>
                <Text style={styles.sectionLabel}>Last {CLAYS_ROLLING_MONTHS} months</Text>
                {rollingStats.length === 0 ? (
                    <Text style={styles.muted}>No clays history yet for this tournament.</Text>
                ) : (
                    rollingStats.map(s => (
                        <View key={s.userId} style={styles.totalRow}>
                            <Text style={styles.totalName}>{s.displayName}</Text>
                            <Text style={styles.totalScore}>
                                {s.percentage != null ? `${s.percentage}%` : '—'}{' '}
                                <Text style={styles.mutedInline}>
                                    ({s.hits}/{s.possible})
                                </Text>
                            </Text>
                        </View>
                    ))
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
        maxWidth: 520,
        width: '100%',
        alignSelf: 'center',
    },
    eyebrow: { fontSize: 12, fontWeight: '700', color: '#FF6700', textTransform: 'uppercase' },
    title: { fontSize: 20, fontWeight: '800', marginTop: 4 },
    matchProgress: { fontSize: 16, fontWeight: '700', color: '#013220', marginTop: 8 },
    shooterName: { fontSize: 28, fontWeight: '800', marginTop: 8, color: '#013220' },
    muted: { color: '#666', fontSize: 14, marginTop: 4 },
    mutedInline: { color: '#999', fontWeight: '400', fontSize: 13 },
    stationInput: {
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 8,
        padding: 10,
        marginTop: 4,
        fontSize: 16,
    },
    sectionLabel: { fontWeight: '700', fontSize: 15, marginTop: 16, marginBottom: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
    hint: { fontSize: 12, color: '#888', marginTop: 8, fontStyle: 'italic' },
    birdPrompt: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 20, marginBottom: 12 },
    scoreRow: { flexDirection: 'row', gap: 12 },
    bigButton: {
        flex: 1,
        paddingVertical: 28,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hitButton: { backgroundColor: '#2D9A4A' },
    missButton: { backgroundColor: '#C62828' },
    bigButtonText: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 1 },
    secondaryRow: { flexDirection: 'row', marginTop: 16, justifyContent: 'center', flexWrap: 'wrap', gap: 8 },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    totalName: { fontWeight: '600' },
    totalScore: { fontWeight: '800', color: '#013220' },
    presentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    presentName: { fontWeight: '600' },
    presentOn: { color: '#2D9A4A', fontWeight: '700' },
    presentOff: { color: '#999' },
});
