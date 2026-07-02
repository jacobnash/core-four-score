import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Game, Team } from '../types';
import { getRelativeTime } from '../utils/helpers';

interface GameListItemProps {
    game: Game;
    nameMap: Record<string, string>;
    onPress?: () => void;
}

export function resolveWinningTeam(teams: Team[]): Team | null {
    if (!Array.isArray(teams) || teams.length === 0) return null;
    const flagged = teams.find(t => t.isWinner);
    if (flagged) return flagged;
    const numeric = teams.filter(t => typeof t.score === 'number');
    if (numeric.length < 2) return null;
    const max = Math.max(...numeric.map(t => t.score));
    const maxTeams = numeric.filter(t => t.score === max);
    return maxTeams.length === 1 ? maxTeams[0] : null;
}

function formatTeamNames(playerIds: string[] | undefined, nameMap: Record<string, string>): string {
    if (!playerIds?.length) return 'Unknown';
    return playerIds.map(id => nameMap[id] || 'Unknown').join(' & ');
}

export function GameListItem({ game, nameMap, onPress }: GameListItemProps) {
    const winTeam = resolveWinningTeam(game.teams);
    const winners = formatTeamNames(winTeam?.playerIds, nameMap);
    const where = (game.location || '').trim() || 'Unknown Location';
    const when = game.timestamp ? getRelativeTime(new Date(game.timestamp)) : 'Unknown time';
    const scores = game.teams.map(t => `${t.score ?? '?'}`).join('–');
    const tags = game.tags || [];

    const content = (
        <>
            <View style={styles.main}>
                <Text style={styles.itemTitle}>{when}</Text>
                <Text style={styles.itemSub}>📍 {where}</Text>
                <Text style={styles.itemSub}>🏆 {winners}</Text>
                {game.teams.length >= 2 && (
                    <Text style={styles.teamsLine}>
                        {formatTeamNames(game.teams[0]?.playerIds, nameMap)} vs {formatTeamNames(game.teams[1]?.playerIds, nameMap)}
                    </Text>
                )}
                {tags.length > 0 && (
                    <View style={styles.tagRow}>
                        {tags.map(tag => (
                            <View key={tag} style={styles.tagChip}>
                                <Text style={styles.tagText}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
            <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>{scores}</Text>
            </View>
        </>
    );

    if (onPress) {
        return (
            <TouchableOpacity style={styles.listItem} onPress={onPress} activeOpacity={0.7}>
                {content}
            </TouchableOpacity>
        );
    }

    return <View style={styles.listItem}>{content}</View>;
}

const styles = StyleSheet.create({
    listItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomColor: '#eee',
        borderBottomWidth: 1,
    },
    main: {
        flex: 1,
        paddingRight: 8,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    itemSub: {
        color: '#666',
        marginTop: 2,
    },
    teamsLine: {
        color: '#888',
        fontSize: 12,
        marginTop: 4,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 6,
    },
    tagChip: {
        backgroundColor: '#FFF4E6',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    tagText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#FF6700',
    },
    scoreBadge: {
        backgroundColor: '#013220',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    scoreText: {
        color: '#F5F5DC',
        fontWeight: '700',
    },
});
