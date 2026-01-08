import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { PlayerCheckbox } from '../../components/PlayerCheckbox';
import { useAuth } from '../../contexts/AuthContext';
import { tournamentService } from '../../services/firestore';
import { TeamMatchup, User } from '../../types';

export default function TeamGeneratorScreen() {
    const { user } = useAuth();
    const [members, setMembers] = useState<User[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
    const [matchup, setMatchup] = useState<TeamMatchup | null>(null);
    const [loading, setLoading] = useState(false);

    // TODO: Replace with actual tournament ID
    const TOURNAMENT_ID = 'default-tournament';

    useEffect(() => {
        loadTournamentMembers();
    }, []);

    const loadTournamentMembers = async () => {
        try {
            setLoading(true);
            const data = await tournamentService.getTournamentMembers(TOURNAMENT_ID);
            setMembers(data);
        } catch (error) {
            console.error('Error loading members:', error);
        } finally {
            setLoading(false);
        }
    };

    const togglePlayer = (userId: string) => {
        setSelectedPlayers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
        // Reset matchup when selection changes
        setMatchup(null);
    };

    const generateTeams = () => {
        const selected = Array.from(selectedPlayers);

        if (selected.length < 4) {
            alert('You need at least 4 players to generate teams!');
            return;
        }

        if (selected.length % 2 !== 0) {
            alert('You need an even number of players!');
            return;
        }

        // Shuffle and split
        const shuffled = [...selected].sort(() => Math.random() - 0.5);
        const midpoint = Math.floor(shuffled.length / 2);

        setMatchup({
            team1: shuffled.slice(0, midpoint),
            team2: shuffled.slice(midpoint),
        });
    };

    const getPlayerName = (userId: string): string => {
        return members.find(m => m.uid === userId)?.displayName || 'Unknown';
    };

    if (!user) {
        return (
            <View className="flex-1 bg-forest-green items-center justify-center p-6">
                <Text className="text-cream text-xl text-center">
                    Please sign in to use this feature
                </Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View className="flex-1 bg-forest-green items-center justify-center">
                <ActivityIndicator size="large" color="#FF6700" />
                <Text className="text-cream mt-4">Loading players...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 section-bg">
            <View className="absolute -left-10 -top-16 w-52 h-52 rounded-full bg-brand-orange/15" />
            <View className="absolute right-0 bottom-12 w-64 h-64 rounded-full bg-cream/10" />

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 56, gap: 20 }}>
                {/* Header */}
                <View className="card-strong p-5 shadow-card-strong">
                    <Text className="eyebrow mb-1">Team Maker</Text>
                    <Text className="title-lg mb-2">🎩 Shake the Hat</Text>
                    <Text className="body-dim">
                        Select who's present, then shuffle for random teams.
                    </Text>
                </View>

                {/* Player Selection */}
                <View className="card p-4">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="title-md">
                            Who's at the cabin?
                        </Text>
                        <Text className="text-sm text-gold font-semibold">
                            {selectedPlayers.size} selected
                        </Text>
                    </View>

                    {members.length === 0 ? (
                        <View className="card-plain p-6 items-center">
                            <Text className="text-cream text-center">
                                No tournament members found
                            </Text>
                        </View>
                    ) : (
                        members.map(member => (
                            <PlayerCheckbox
                                key={member.uid}
                                user={member}
                                isSelected={selectedPlayers.has(member.uid)}
                                onToggle={() => togglePlayer(member.uid)}
                            />
                        ))
                    )}

                    <View className="mt-3">
                        <Button
                            title="🎲 Shake the Hat"
                            onPress={generateTeams}
                            size="lg"
                            variant="primary"
                            disabled={selectedPlayers.size < 4}
                        />
                        <Text className="text-xs text-cream/70 mt-2 text-center">
                            Need at least 4 and an even number of players.
                        </Text>
                    </View>
                </View>

                {/* Team Matchup Display */}
                {matchup && (
                    <View className="card p-4">
                        <Text className="text-2xl font-bold text-cream mb-4 text-center">
                            🏆 Today's Matchup
                        </Text>

                        {/* Team 1 */}
                        <View className="bg-brand-orange rounded-2xl p-4 mb-4 border-2 border-cream shadow-md shadow-black/25">
                            <Text className="text-xl font-bold text-cream mb-3 text-center">
                                Team 1
                            </Text>
                            {matchup.team1.map((playerId, index) => (
                                <View key={playerId} className="mb-2">
                                    <Text className="text-lg text-cream text-center">
                                        {index > 0 && '&'} {getPlayerName(playerId)}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* VS */}
                        <Text className="text-2xl font-bold text-gold text-center mb-4">
                            VS
                        </Text>

                        {/* Team 2 */}
                        <View className="bg-forest-green rounded-2xl p-4 mb-4 border-4 border-brand-orange shadow-md shadow-black/25">
                            <Text className="text-xl font-bold text-cream mb-3 text-center">
                                Team 2
                            </Text>
                            {matchup.team2.map((playerId, index) => (
                                <View key={playerId} className="mb-2">
                                    <Text className="text-lg text-cream text-center">
                                        {index > 0 && '&'} {getPlayerName(playerId)}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Action Buttons */}
                        <View className="flex-row gap-3">
                            <View className="flex-1">
                                <Button
                                    title="🔄 Re-shuffle"
                                    onPress={generateTeams}
                                    variant="secondary"
                                    size="md"
                                />
                            </View>
                            <View className="flex-1">
                                <Button
                                    title="Start Game"
                                    onPress={() => {
                                        const playerNames: Record<string, string> = {};
                                        members.forEach(m => playerNames[m.uid] = m.displayName);
                                        router.push({
                                            pathname: '/game',
                                            params: {
                                                team1: JSON.stringify(matchup.team1),
                                                team2: JSON.stringify(matchup.team2),
                                                playerNames: JSON.stringify(playerNames)
                                            }
                                        });
                                    }}
                                    variant="primary"
                                    size="md"
                                />
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
