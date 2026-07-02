import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { resolveWinningTeam } from '../../components/GameListItem';
import { InteractiveStatsChart } from '../../components/InteractiveStatsChart';
import { StatSummaryRow } from '../../components/StatSummaryRow';
import { StatsLeaderboard } from '../../components/StatsLeaderboard';
import { TournamentBanner } from '../../components/TournamentBanner';
import { ENABLE_IMPROVED_DATA_VIEWS } from '../../constants/featureFlags';
import { useAuth } from '../../contexts/AuthContext';
import { useTournament } from '../../contexts/TournamentContext';
import { gameService, renegService, tournamentService } from '../../services/firestore';
import { Game, Reneg, User } from '../../types';
import { getRelativeTime } from '../../utils/helpers';
import {
    computeMemberStats,
    computeStatsSummary,
    computeTagCounts,
    didMemberWinGame,
} from '../../utils/playerStats';
import { webBoxShadow } from '../../utils/shadow';

function toDay(d: Date): Date {
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    return nd;
}

function buildCumulativeSeries(dates: Date[], countsByDate: Map<number, number>) {
    const result: { x: Date; y: number }[] = [];
    let acc = 0;
    for (const d of dates) {
        const key = toDay(d).getTime();
        acc += countsByDate.get(key) || 0;
        result.push({ x: toDay(d), y: acc });
    }
    return result;
}

function uniqueSortedDaysFromDates(dates: Date[]): Date[] {
    const set = new Set<number>();
    for (const d of dates) set.add(toDay(d).getTime());
    return Array.from(set).sort((a, b) => a - b).map(ts => new Date(ts));
}

const CHART_HEIGHT = 240;

export default function StatsScreen() {
    const { user } = useAuth();
    const { activeTournament } = useTournament();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [members, setMembers] = useState<User[]>([]);
    const [games, setGames] = useState<Game[]>([]);
    const [renegs, setRenegs] = useState<Reneg[]>([]);

    const tournamentId = activeTournament?.id;

    const nameMap = useMemo(() => {
        const map: Record<string, string> = {};
        members.forEach(m => { map[m.uid] = m.displayName; });
        return map;
    }, [members]);

    const loadData = useCallback(async () => {
        if (!user || !tournamentId) {
            setMembers([]);
            setGames([]);
            setRenegs([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const [m, g, r] = await Promise.all([
                tournamentService.getTournamentMembers(tournamentId),
                gameService.getGames(tournamentId, 0),
                renegService.getRenegsByTournament(tournamentId, 500),
            ]);
            setMembers(m);
            setGames(g);
            const memberIds = new Set(m.map(x => x.uid));
            const filteredRenegs = r.filter(x => memberIds.has(x.playerId));
            filteredRenegs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            setRenegs(filteredRenegs);
        } catch (err) {
            console.error('Failed to load stats', err);
        } finally {
            setLoading(false);
        }
    }, [user, tournamentId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const memberStats = useMemo(
        () => computeMemberStats(members, games, renegs),
        [members, games, renegs],
    );

    const summary = useMemo(() => computeStatsSummary(memberStats), [memberStats]);

    const tagCounts = useMemo(() => computeTagCounts(games), [games]);

    const recentGames = useMemo(
        () => [...games].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5),
        [games],
    );

    const winsSeries = useMemo(() => {
        if (games.length === 0 || members.length === 0) return {} as Record<string, { x: Date; y: number }[]>;
        const allDates = uniqueSortedDaysFromDates(games.map(g => g.timestamp));

        const byUser: Record<string, { x: Date; y: number }[]> = {};
        for (const member of members) {
            const counts = new Map<number, number>();
            for (const g of games) {
                const dayTs = toDay(g.timestamp).getTime();
                if (didMemberWinGame(g, member.uid)) {
                    counts.set(dayTs, (counts.get(dayTs) || 0) + 1);
                }
            }
            byUser[member.uid] = buildCumulativeSeries(allDates, counts);
        }
        return byUser;
    }, [games, members]);

    const renegsSeries = useMemo(() => {
        if (renegs.length === 0 || members.length === 0) return {} as Record<string, { x: Date; y: number }[]>;
        const allDates = uniqueSortedDaysFromDates(renegs.map(r => r.timestamp));

        const byUser: Record<string, { x: Date; y: number }[]> = {};
        for (const member of members) {
            const counts = new Map<number, number>();
            for (const r of renegs) {
                const dayTs = toDay(r.timestamp).getTime();
                if (r.playerId === member.uid) counts.set(dayTs, (counts.get(dayTs) || 0) + 1);
            }
            byUser[member.uid] = buildCumulativeSeries(allDates, counts);
        }
        return byUser;
    }, [renegs, members]);

    const memberColors = useMemo(() => {
        const palette = ['#FF6700', '#2D9A4A', '#B8860B', '#0B3B2E', '#7B61FF', '#F4C95D', '#E67E22', '#3498DB'];
        const map: Record<string, string> = {};
        members.forEach((m, idx) => { map[m.uid] = palette[idx % palette.length]; });
        return map;
    }, [members]);

    const chartSeries = useMemo(
        () =>
            members.map(m => ({
                id: m.uid,
                name: m.displayName,
                color: memberColors[m.uid],
                data: winsSeries[m.uid] || [],
            })),
        [members, memberColors, winsSeries],
    );

    const renegChartSeries = useMemo(
        () =>
            members.map(m => ({
                id: m.uid,
                name: m.displayName,
                color: memberColors[m.uid],
                data: renegsSeries[m.uid] || [],
            })),
        [members, memberColors, renegsSeries],
    );

    if (!user) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.muted}>Please sign in to view stats</Text>
            </View>
        );
    }

    const refreshControl = ENABLE_IMPROVED_DATA_VIEWS ? (
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF6700" />
    ) : undefined;

    return (
        <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={refreshControl}
        >
            {ENABLE_IMPROVED_DATA_VIEWS && (
                <TournamentBanner tournament={activeTournament} memberCount={members.length} />
            )}

            {!loading && tournamentId && games.length > 0 && (
                <>
                    <View style={styles.card}>
                        <Text style={styles.titleMd}>📊 Overview</Text>
                        <StatSummaryRow
                            items={[
                                { label: 'Games', value: String(games.length) },
                                { label: 'Leader', value: summary.leaderLabel, accent: true },
                                { label: 'Best Win %', value: summary.bestWinPctLabel },
                                { label: 'Hot Streak', value: summary.hottestStreakLabel },
                                { label: 'Renegs', value: String(summary.totalRenegs) },
                                { label: 'Top Reneg', value: summary.topRenegLabel },
                            ]}
                        />
                    </View>

                    <View style={styles.card}>
                        <StatsLeaderboard stats={memberStats} currentUserId={user.uid} />
                    </View>

                    {tagCounts.length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.titleMd}>🏷️ Notable Games</Text>
                            <View style={styles.tagGrid}>
                                {tagCounts.map(({ tag, count }) => (
                                    <View key={tag} style={styles.tagChip}>
                                        <Text style={styles.tagCount}>{count}</Text>
                                        <Text style={styles.tagLabel}>{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={styles.card}>
                        <Text style={styles.titleMd}>🕐 Recent Results</Text>
                        {recentGames.map(game => {
                            const winTeam = resolveWinningTeam(game.teams);
                            const winners = winTeam?.playerIds?.map(id => nameMap[id] || '?').join(' & ') || 'Unknown';
                            const when = getRelativeTime(new Date(game.timestamp));
                            const where = (game.location || '').trim() || 'Unknown';
                            const notes = (game.notes || '').trim();
                            return (
                                <View key={game.id} style={styles.recentRow}>
                                    <View style={styles.recentMain}>
                                        <Text style={styles.recentWhen}>{when}</Text>
                                        <Text style={styles.recentSub}>🏆 {winners}</Text>
                                        <Text style={styles.recentMeta}>📍 {where}</Text>
                                        {notes ? (
                                            <Text style={styles.recentNotes} numberOfLines={2}>
                                                📝 {notes}
                                            </Text>
                                        ) : null}
                                    </View>
                                    {game.tags?.length ? (
                                        <View style={styles.recentTags}>
                                            {game.tags.slice(0, 2).map(tag => (
                                                <Text key={tag} style={styles.recentTag}>{tag}</Text>
                                            ))}
                                        </View>
                                    ) : null}
                                </View>
                            );
                        })}
                    </View>
                </>
            )}

            <View style={styles.card}>
                <Text style={styles.titleMd}>🏆 Wins Over Time</Text>
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color="#FF6700" />
                ) : !tournamentId ? (
                    <Text style={styles.muted}>Select a tournament to view stats.</Text>
                ) : games.length === 0 ? (
                    <Text style={styles.muted}>No games recorded yet.</Text>
                ) : (
                    <InteractiveStatsChart
                        series={chartSeries}
                        height={CHART_HEIGHT}
                        emptyMessage="No wins data yet."
                        valueLabel="wins"
                    />
                )}
            </View>

            <View style={styles.card}>
                <Text style={styles.titleMd}>🙈 Renegs Over Time</Text>
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color="#FF6700" />
                ) : !tournamentId ? (
                    <Text style={styles.muted}>Select a tournament to view stats.</Text>
                ) : renegs.length === 0 ? (
                    <Text style={styles.muted}>No renegs recorded yet.</Text>
                ) : (
                    <InteractiveStatsChart
                        series={renegChartSeries}
                        height={CHART_HEIGHT}
                        emptyMessage="No renegs recorded yet."
                        valueLabel="renegs"
                    />
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F7F8' },
    centered: { alignItems: 'center', justifyContent: 'center' },
    content: { padding: 16, paddingBottom: 56, gap: 16 },
    card: {
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 12,
        ...(Platform.OS === 'web'
            ? { boxShadow: webBoxShadow('rgba(0,0,0,0.06)', 6, 12) }
            : { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }),
    },
    titleMd: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
    muted: { color: '#666' },
    tagGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagChip: {
        backgroundColor: '#FFF4E6',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: 'center',
        minWidth: 88,
    },
    tagCount: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FF6700',
    },
    tagLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#666',
        marginTop: 2,
        textAlign: 'center',
    },
    recentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    recentMain: { flex: 1 },
    recentWhen: { fontSize: 15, fontWeight: '700' },
    recentSub: { color: '#333', marginTop: 2, fontSize: 13 },
    recentMeta: { color: '#888', fontSize: 12, marginTop: 2 },
    recentNotes: { color: '#555', fontSize: 12, marginTop: 4, fontStyle: 'italic', lineHeight: 17 },
    recentTags: { alignItems: 'flex-end', gap: 4, marginLeft: 8 },
    recentTag: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FF6700',
        backgroundColor: '#FFF4E6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
});
