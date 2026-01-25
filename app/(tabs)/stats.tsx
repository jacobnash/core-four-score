import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { VictoryAxis, VictoryChart, VictoryLegend, VictoryLine, VictoryTheme } from 'victory-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTournament } from '../../contexts/TournamentContext';
import { gameService, renegService, tournamentService } from '../../services/firestore';
import { Game, Reneg, User } from '../../types';
import { webBoxShadow } from '../../utils/shadow';

// Use the active tournament from context instead of a hardcoded id
// const TOURNAMENT_ID = 'the-core-four';

// Normalize a Date to midnight for daily bucketing
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

export default function StatsScreen() {
    const { user } = useAuth();
    const { activeTournament } = useTournament();
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<User[]>([]);
    const [games, setGames] = useState<Game[]>([]);
    const [renegs, setRenegs] = useState<Reneg[]>([]);

    useEffect(() => {
        (async () => {
            if (!user) return;
            try {
                setLoading(true);
                const tournamentId = activeTournament?.id;
                if (!tournamentId) {
                    // No tournament selected; bail early and keep loading false
                    setMembers([]);
                    setGames([]);
                    setRenegs([]);
                    setLoading(false);
                    return;
                }

                const [m, g, r] = await Promise.all([
                    tournamentService.getTournamentMembers(tournamentId),
                    gameService.getGames(tournamentId, 0),
                    renegService.getRenegs(0),
                ]);
                setMembers(m);
                setGames(g);
                // Only keep renegs from tournament members
                const memberIds = new Set(m.map(x => x.uid));
                const filteredRenegs = r.filter(x => memberIds.has(x.playerId));
                // Sort ascending by timestamp for consistent bucketing
                filteredRenegs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                setRenegs(filteredRenegs);
            } catch (err) {
                console.error('Failed to load stats', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [user]);

    const winsSeries = useMemo(() => {
        if (games.length === 0 || members.length === 0) return {} as Record<string, { x: Date; y: number }[]>;
        const allDates = uniqueSortedDaysFromDates(games.map(g => g.timestamp));

        const byUser: Record<string, { x: Date; y: number }[]> = {};
        for (const member of members) {
            const counts = new Map<number, number>();
            for (const g of games) {
                const dayTs = toDay(g.timestamp).getTime();
                const winningTeam = g.teams.find(t => t.isWinner);
                const didWin = winningTeam?.playerIds.includes(member.uid) || false;
                if (didWin) counts.set(dayTs, (counts.get(dayTs) || 0) + 1);
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

    if (!user) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.muted}>Please sign in to view stats</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
                <Text style={styles.titleMd}>🏆 Wins Over Time</Text>
                {loading ? (
                    <ActivityIndicator size="large" color="#FF6700" />
                ) : games.length === 0 ? (
                    <Text style={styles.muted}>No games recorded yet.</Text>
                ) : (
                    <VictoryChart theme={VictoryTheme.material} domainPadding={{ x: 10, y: 10 }}>
                        <VictoryAxis tickFormat={(t) => new Date(t).toLocaleDateString()} style={{ tickLabels: { fontSize: 10, angle: 0 } }} />
                        <VictoryAxis dependentAxis />
                        {members.map(m => (
                            <VictoryLine
                                key={m.uid}
                                data={winsSeries[m.uid] || []}
                                style={{ data: { stroke: memberColors[m.uid], strokeWidth: 2 } }}
                            />
                        ))}
                        <VictoryLegend x={40} y={0} gutter={12}
                            orientation="horizontal"
                            itemsPerRow={2}
                            data={members.map(m => ({ name: m.displayName, symbol: { fill: memberColors[m.uid] } }))}
                        />
                    </VictoryChart>
                )}
            </View>

            <View style={styles.card}>
                <Text style={styles.titleMd}>🙈 Renegs Over Time</Text>
                {loading ? (
                    <ActivityIndicator size="large" color="#FF6700" />
                ) : renegs.length === 0 ? (
                    <Text style={styles.muted}>No renegs recorded yet.</Text>
                ) : (
                    <VictoryChart theme={VictoryTheme.material} domainPadding={{ x: 10, y: 10 }}>
                        <VictoryAxis tickFormat={(t) => new Date(t).toLocaleDateString()} style={{ tickLabels: { fontSize: 10 } }} />
                        <VictoryAxis dependentAxis />
                        {members.map(m => (
                            <VictoryLine
                                key={m.uid}
                                data={renegsSeries[m.uid] || []}
                                style={{ data: { stroke: memberColors[m.uid], strokeWidth: 2 } }}
                            />
                        ))}
                        <VictoryLegend x={40} y={0} gutter={12}
                            orientation="horizontal"
                            itemsPerRow={2}
                            data={members.map(m => ({ name: m.displayName, symbol: { fill: memberColors[m.uid] } }))}
                        />
                    </VictoryChart>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F7F8' },
    centered: { alignItems: 'center', justifyContent: 'center' },
    content: { padding: 16, paddingBottom: 56, gap: 20 },
    card: { backgroundColor: '#fff', padding: 12, borderRadius: 12, ...(Platform.OS === 'web' ? { boxShadow: webBoxShadow('rgba(0,0,0,0.06)', 6, 12) } : { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }) },
    titleMd: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
    muted: { color: '#666' },
});
