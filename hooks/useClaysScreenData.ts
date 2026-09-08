import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
    claysLeaderboardService,
    claysMatchService,
    claysService,
    tournamentService,
} from '../services/firestore';
import { ClayDiscipline, ClaysMatch, ClaysMemberStats, User } from '../types';
import {
    aggregateClayTotals,
    birdsInPresentation,
    CLAY_PAIR_TYPES,
    defaultExpectedTargets,
    isSportingDiscipline,
    nextPresentationNumber,
    nextShooterIndex,
    PAIR_BIRD_LABELS,
    sumBirdsScored,
} from '../utils/claysScoring';

/**
 * All the Firestore-backed state and mutations for ClaysScreen: loading the squad and
 * active match, starting/ending matches, and recording/undoing presentations. Extracted
 * so this logic is testable without rendering the full scoring UI (see AUDIT.md Theme A).
 */
export function useClaysScreenData(
    tournamentId: string,
    isCoreFour: boolean,
    startupReady: boolean,
    user: User | null
) {
    const [shooters, setShooters] = useState<User[]>([]);
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeMatch, setActiveMatch] = useState<ClaysMatch | null>(null);

    // New match setup
    const [discipline, setDiscipline] = useState<ClayDiscipline>('sporting');
    const [expectedTargetsInput, setExpectedTargetsInput] = useState('100');
    const [matchNotes, setMatchNotes] = useState('');

    // Scoring state
    const [pairType, setPairType] = useState<(typeof CLAY_PAIR_TYPES)[number]>('report');
    const [shooterIndex, setShooterIndex] = useState(0);
    const [birdResultsSoFar, setBirdResultsSoFar] = useState<boolean[]>([]);
    const [station, setStation] = useState('');
    const [matchRecords, setMatchRecords] = useState<Awaited<ReturnType<typeof claysService.getScoresForMatch>>>([]);
    const [rollingStats, setRollingStats] = useState<ClaysMemberStats[]>([]);

    const presentShooters = useMemo(
        () => shooters.filter(s => presentIds.has(s.uid)),
        [shooters, presentIds]
    );

    const birdCount = birdsInPresentation(pairType);
    const currentShooter = presentShooters[shooterIndex] ?? null;
    const birdIndex = birdResultsSoFar.length;
    const presentationNumber = nextPresentationNumber(matchRecords);
    const birdsScored = sumBirdsScored(matchRecords);
    const expectedTargets = activeMatch?.expectedTargets ?? 0;

    const matchTotals = useMemo(() => {
        const agg = aggregateClayTotals(matchRecords);
        const nameMap = Object.fromEntries(shooters.map(m => [m.uid, m.displayName]));
        return agg.map(t => ({ ...t, name: nameMap[t.shooterId] || t.shooterId }));
    }, [matchRecords, shooters]);

    const load = useCallback(async () => {
        if (!tournamentId || isCoreFour) {
            setShooters([]);
            setActiveMatch(null);
            setMatchRecords([]);
            setRollingStats([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const members = await tournamentService.getTournamentMembers(tournamentId);
            setShooters(members);
            setPresentIds(prev => {
                const next = new Set(prev);
                for (const m of members) {
                    if (!prev.size) next.add(m.uid);
                    else if (members.some(x => next.has(x.uid))) {
                        /* keep existing */
                    } else {
                        next.add(m.uid);
                    }
                }
                for (const uid of [...next]) {
                    if (!members.some(m => m.uid === uid)) next.delete(uid);
                }
                if (next.size === 0 && members.length) {
                    members.forEach(m => next.add(m.uid));
                }
                return next;
            });

            const match = await claysMatchService.getActiveMatch(tournamentId);
            setActiveMatch(match);

            if (match) {
                const records = await claysService.getScoresForMatch(match.id);
                setMatchRecords(records);
                if (!isSportingDiscipline(match.discipline)) {
                    setPairType('single');
                }
            } else {
                setMatchRecords([]);
            }

            const stats = await claysLeaderboardService.getClaysLeaderboard(tournamentId);
            setRollingStats(stats);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [tournamentId, isCoreFour]);

    useEffect(() => {
        if (startupReady) load();
    }, [load, startupReady]);

    useEffect(() => {
        setBirdResultsSoFar([]);
    }, [pairType, shooterIndex, presentationNumber]);

    useEffect(() => {
        if (shooterIndex >= presentShooters.length) setShooterIndex(0);
    }, [presentShooters.length, shooterIndex]);

    useEffect(() => {
        setExpectedTargetsInput(String(defaultExpectedTargets(discipline)));
        if (!isSportingDiscipline(discipline)) {
            setPairType('single');
        }
    }, [discipline]);

    const togglePresent = (uid: string) => {
        setPresentIds(prev => {
            const next = new Set(prev);
            if (next.has(uid)) {
                if (next.size <= 1) return prev;
                next.delete(uid);
            } else {
                next.add(uid);
            }
            return next;
        });
    };

    const startMatch = async () => {
        if (!user || !tournamentId) return;
        const expected = parseInt(expectedTargetsInput, 10);
        if (!Number.isFinite(expected) || expected < 1) {
            Alert.alert('Invalid targets', 'Enter the total expected targets for this round.');
            return;
        }
        setSaving(true);
        try {
            const match = await claysMatchService.createMatch({
                tournamentId,
                discipline,
                expectedTargets: expected,
                createdBy: user.uid,
                notes: matchNotes,
            });
            setActiveMatch(match);
            setMatchRecords([]);
            setStation('');
            setShooterIndex(0);
            setBirdResultsSoFar([]);
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Could not start match.');
        } finally {
            setSaving(false);
        }
    };

    const endMatch = () => {
        if (!activeMatch) return;
        Alert.alert('End match?', 'You can start a new match anytime.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'End match',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await claysMatchService.completeMatch(activeMatch.id);
                        setActiveMatch(null);
                        setMatchRecords([]);
                        await load();
                    } catch (err) {
                        console.error(err);
                        Alert.alert('Error', 'Could not end match.');
                    }
                },
            },
        ]);
    };

    const recordBird = async (hit: boolean) => {
        if (!user || !currentShooter || !tournamentId || !activeMatch) return;

        if (isSportingDiscipline(activeMatch.discipline) && !station.trim()) {
            Alert.alert('Where?', 'Enter stand or station before scoring.');
            return;
        }

        const nextResults = [...birdResultsSoFar, hit];
        const presentationComplete = nextResults.length >= birdCount;

        if (!presentationComplete) {
            setBirdResultsSoFar(nextResults);
            return;
        }

        const birdLabels =
            birdCount > 1 ? PAIR_BIRD_LABELS.slice(0, birdCount) : null;

        setSaving(true);
        try {
            await claysService.savePresentation({
                tournamentId,
                matchId: activeMatch.id,
                presentationNumber,
                shooterId: currentShooter.uid,
                pairType,
                discipline: activeMatch.discipline,
                station: station.trim() || null,
                birdResults: nextResults,
                birdLabels,
                recordedBy: user.uid,
            });
            setBirdResultsSoFar([]);
            setShooterIndex(nextShooterIndex(shooterIndex, presentShooters.length));
            await load();
        } catch (err) {
            console.error(err);
            Alert.alert('Save failed', 'Could not save that presentation.');
        } finally {
            setSaving(false);
        }
    };

    const undoLast = () => {
        if (!activeMatch) return;
        Alert.alert('Undo last presentation?', undefined, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Undo',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await claysService.deleteLastScoreForMatch(activeMatch.id);
                        await load();
                    } catch (err) {
                        console.error(err);
                        Alert.alert('Error', 'Could not undo.');
                    }
                },
            },
        ]);
    };

    const skipShooter = () => {
        setBirdResultsSoFar([]);
        setShooterIndex(nextShooterIndex(shooterIndex, presentShooters.length));
    };

    const currentBirdLabel =
        birdCount > 1 ? PAIR_BIRD_LABELS[birdIndex] ?? `Bird ${birdIndex + 1}` : null;

    return {
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
    };
}
