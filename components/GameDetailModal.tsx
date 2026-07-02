import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Game } from '../types';
import { formatDateTime } from '../utils/helpers';
import { isBinaryWinScore, resolveWinningTeam } from './GameListItem';

interface GameDetailModalProps {
    visible: boolean;
    game: Game | null;
    nameMap: Record<string, string>;
    onClose: () => void;
}

function formatTeamNames(playerIds: string[] | undefined, nameMap: Record<string, string>): string {
    if (!playerIds?.length) return 'Unknown';
    return playerIds.map(id => nameMap[id] || 'Unknown').join(' & ');
}

export function GameDetailModal({ visible, game, nameMap, onClose }: GameDetailModalProps) {
    if (!game) return null;

    const winTeam = resolveWinningTeam(game.teams);
    const when = game.timestamp ? formatDateTime(new Date(game.timestamp)) : 'Unknown time';
    const where = (game.location || '').trim() || 'Unknown Location';

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <Text style={styles.title}>Game Details</Text>
                    <Text style={styles.meta}>{when}</Text>
                    <Text style={styles.meta}>📍 {where}</Text>

                    <ScrollView style={styles.scroll}>
                        {game.teams.map((team, idx) => {
                            const isWinner = winTeam === team;
                            return (
                                <View key={idx} style={[styles.teamCard, isWinner && styles.teamWinner]}>
                                    <Text style={styles.teamLabel}>Team {idx + 1}{isWinner ? ' 🏆' : ''}</Text>
                                    <Text style={styles.teamPlayers}>{formatTeamNames(team.playerIds, nameMap)}</Text>
                                    {!isBinaryWinScore(game.teams) && (
                                        <Text style={styles.teamScore}>Score: {team.score ?? '?'}</Text>
                                    )}
                                </View>
                            );
                        })}

                        {game.tags && game.tags.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Tags</Text>
                                <View style={styles.tagRow}>
                                    {game.tags.map(tag => (
                                        <View key={tag} style={styles.tagChip}>
                                            <Text style={styles.tagText}>{tag}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {game.notes ? (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Notes</Text>
                                <Text style={styles.notes}>{game.notes}</Text>
                            </View>
                        ) : null}
                    </ScrollView>

                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        width: '92%',
        maxWidth: 480,
        maxHeight: '85%',
    },
    title: {
        fontWeight: '800',
        fontSize: 20,
        marginBottom: 4,
    },
    meta: {
        color: '#666',
        marginTop: 2,
    },
    scroll: {
        marginTop: 12,
        maxHeight: 360,
    },
    teamCard: {
        backgroundColor: '#F7F8F9',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
    },
    teamWinner: {
        borderWidth: 1,
        borderColor: '#F4C95D',
        backgroundColor: '#FFFBF0',
    },
    teamLabel: {
        fontWeight: '700',
        fontSize: 14,
    },
    teamPlayers: {
        marginTop: 4,
        color: '#333',
    },
    teamScore: {
        marginTop: 6,
        fontWeight: '800',
        color: '#FF6700',
    },
    section: {
        marginTop: 8,
    },
    sectionTitle: {
        fontWeight: '700',
        marginBottom: 6,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    tagChip: {
        backgroundColor: '#FFF4E6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FF6700',
    },
    notes: {
        color: '#444',
        lineHeight: 20,
    },
    closeButton: {
        marginTop: 12,
        backgroundColor: '#F2F4F7',
        padding: 12,
        borderRadius: 8,
    },
    closeText: {
        textAlign: 'center',
        fontWeight: '600',
    },
});
