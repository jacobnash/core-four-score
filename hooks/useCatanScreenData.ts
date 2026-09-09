import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { catanLeaderboardService, catanService, tournamentService } from '../services/firestore';
import { CatanExpansion, CatanGame, CatanMemberStats, User } from '../types';
import { CatanBoard, generateCatanBoard } from '../utils/catanBoardGenerator';
import { expansionForPlayerCount, markWinners } from '../utils/catanScoring';

/**
 * Firestore-backed state and mutations for CatanScreen: loading the squad,
 * recording a finished game's final scores, the leaderboard, and the
 * (purely client-side, unpersisted) board randomizer. Mirrors the split used
 * by useClaysScreenData, simplified to end-of-game entry — Catan scores are
 * recorded once at the end of a multi-hour game, not shot by shot.
 */
export function useCatanScreenData(
    tournamentId: string,
    isCoreFour: boolean,
    startupReady: boolean,
    user: User | null
) {
    const [players, setPlayers] = useState<User[]>([]);
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState('');
    const [recentGames, setRecentGames] = useState<CatanGame[]>([]);
    const [leaderboard, setLeaderboard] = useState<CatanMemberStats[]>([]);

    const [boardExpansion, setBoardExpansion] = useState<CatanExpansion>('base');
    const [board, setBoard] = useState<CatanBoard | null>(null);

    const presentPlayers = useMemo(
        () => players.filter(p => presentIds.has(p.uid)),
        [players, presentIds]
    );

    const load = useCallback(async () => {
        if (!tournamentId || isCoreFour) {
            setPlayers([]);
            setRecentGames([]);
            setLeaderboard([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const members = await tournamentService.getTournamentMembers(tournamentId);
            setPlayers(members);
            setPresentIds(prev => {
                const next = new Set(prev);
                for (const uid of [...next]) {
                    if (!members.some(m => m.uid === uid)) next.delete(uid);
                }
                if (next.size === 0) members.forEach(m => next.add(m.uid));
                return next;
            });

            const [games, stats] = await Promise.all([
                catanService.getGames(tournamentId, 10),
                catanLeaderboardService.getCatanLeaderboard(tournamentId),
            ]);
            setRecentGames(games);
            setLeaderboard(stats);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [tournamentId, isCoreFour]);

    useEffect(() => {
        if (startupReady) load();
    }, [load, startupReady]);

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

    const setScore = (uid: string, value: string) => {
        setScoreInputs(prev => ({ ...prev, [uid]: value }));
    };

    const saveGame = async () => {
        if (!user || !tournamentId) return;
        if (presentPlayers.length < 3) {
            Alert.alert('Not enough players', 'Catan needs at least 3 players.');
            return;
        }

        const parsed = presentPlayers.map(p => ({
            playerId: p.uid,
            score: parseInt(scoreInputs[p.uid] ?? '', 10),
        }));
        const invalid = parsed.find(p => !Number.isFinite(p.score) || p.score < 0);
        if (invalid) {
            Alert.alert('Missing score', 'Enter a final score for every player.');
            return;
        }

        setSaving(true);
        try {
            await catanService.createGame({
                tournamentId,
                timestamp: new Date(),
                expansion: expansionForPlayerCount(presentPlayers.length),
                players: markWinners(parsed),
                notes: notes.trim() || null,
            });
            setScoreInputs({});
            setNotes('');
            await load();
        } catch (err) {
            console.error(err);
            Alert.alert('Save failed', 'Could not save that game.');
        } finally {
            setSaving(false);
        }
    };

    const randomizeBoard = useCallback(() => {
        setBoard(generateCatanBoard(boardExpansion));
    }, [boardExpansion]);

    return {
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
    };
}
