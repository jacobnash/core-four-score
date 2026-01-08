import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/firestore';

export default function GameScreen() {
    const { user } = useAuth();
    const params = useLocalSearchParams();

    // Parse team data from params (passed from Shake the Hat)
    const team1Ids = params.team1 ? JSON.parse(params.team1 as string) : [];
    const team2Ids = params.team2 ? JSON.parse(params.team2 as string) : [];
    const playerNames = params.playerNames ? JSON.parse(params.playerNames as string) : {};

    const [team1Score, setTeam1Score] = useState('0');
    const [team2Score, setTeam2Score] = useState('0');
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const TOURNAMENT_ID = 'default-tournament';

    const handleSaveGame = async () => {
        const score1 = parseInt(team1Score);
        const score2 = parseInt(team2Score);

        if (isNaN(score1) || isNaN(score2)) {
            Alert.alert('Invalid Score', 'Please enter valid numbers for both teams');
            return;
        }

        if (score1 === score2) {
            Alert.alert('Tie Game', 'There are no ties in Euchre! One team must win.');
            return;
        }

        try {
            setSaving(true);
            await gameService.createGame({
                timestamp: new Date(),
                location: location || 'Unknown Location',
                teams: [
                    {
                        playerIds: team1Ids,
                        score: score1,
                        isWinner: score1 > score2
                    },
                    {
                        playerIds: team2Ids,
                        score: score2,
                        isWinner: score2 > score1
                    }
                ],
                tags: [],
                notes,
                tournamentId: TOURNAMENT_ID
            });

            Alert.alert(
                'Game Recorded! 🎉',
                `${score1 > score2 ? 'Team 1' : 'Team 2'} wins ${Math.max(score1, score2)}-${Math.min(score1, score2)}`,
                [{ text: 'OK', onPress: () => router.push('/shake-the-hat') }]
            );
        } catch (error) {
            console.error('Error saving game:', error);
            Alert.alert('Error', 'Failed to save game. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return (
            <View className="flex-1 section-bg items-center justify-center p-6">
                <Text className="text-cream text-xl text-center">
                    Please sign in to record games
                </Text>
            </View>
        );
    }

    return (
        <View className="flex-1 section-bg">
            <View className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-brand-orange/18" />
            <View className="absolute -left-16 bottom-10 w-64 h-64 rounded-full bg-cream/10" />

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 56, gap: 20 }}>
                {/* Header */}
                <View className="card-strong p-5 shadow-card-strong">
                    <Text className="eyebrow mb-1">Score Keeper</Text>
                    <Text className="title-lg mb-2">🎯 The Blind</Text>
                    <Text className="body-dim">
                        Record the final score and settle the debate.
                    </Text>
                </View>

                {/* Teams Display */}
                <View className="card p-4">
                    <Text className="title-md mb-4 text-center">Today's Matchup</Text>

                    {/* Team 1 */}
                    <View className="bg-brand-orange rounded-card p-4 mb-4 border-2 border-cream shadow-card">
                        <Text className="text-xl font-bold text-cream mb-2 text-center">
                            Team 1
                        </Text>
                        {team1Ids.map((playerId: string, index: number) => (
                            <Text key={playerId} className="text-lg text-cream text-center">
                                {index > 0 && '& '}{playerNames[playerId] || 'Unknown'}
                            </Text>
                        ))}
                    </View>

                    {/* VS */}
                    <Text className="text-2xl font-bold text-gold text-center mb-4">VS</Text>

                    {/* Team 2 */}
                    <View className="bg-forest-green rounded-card p-4 border-4 border-brand-orange shadow-card">
                        <Text className="text-xl font-bold text-cream mb-2 text-center">
                            Team 2
                        </Text>
                        {team2Ids.map((playerId: string, index: number) => (
                            <Text key={playerId} className="text-lg text-cream text-center">
                                {index > 0 && '& '}{playerNames[playerId] || 'Unknown'}
                            </Text>
                        ))}
                    </View>
                </View>

                {/* Score Input */}
                <View className="card p-4">
                    <Text className="title-md mb-4">Final Score</Text>

                    <View className="flex-row gap-4 mb-4">
                        <View className="flex-1">
                            <Text className="text-cream font-semibold mb-2">Team 1 Score</Text>
                            <TextInput
                                className="glass-overlay rounded-card px-4 h-14 text-cream text-2xl font-bold text-center border border-cream/30"
                                value={team1Score}
                                onChangeText={setTeam1Score}
                                keyboardType="number-pad"
                                placeholder="0"
                                placeholderTextColor="#F5F5DC80"
                            />
                        </View>

                        <View className="flex-1">
                            <Text className="text-cream font-semibold mb-2">Team 2 Score</Text>
                            <TextInput
                                className="glass-overlay rounded-card px-4 h-14 text-cream text-2xl font-bold text-center border border-cream/30"
                                value={team2Score}
                                onChangeText={setTeam2Score}
                                keyboardType="number-pad"
                                placeholder="0"
                                placeholderTextColor="#F5F5DC80"
                            />
                        </View>
                    </View>

                    <View className="mb-4">
                        <Text className="text-cream font-semibold mb-2">Location</Text>
                        <TextInput
                            className="glass-overlay rounded-card px-4 h-12 text-cream border border-cream/30"
                            value={location}
                            onChangeText={setLocation}
                            placeholder="Where'd you play?"
                            placeholderTextColor="#F5F5DC80"
                        />
                    </View>

                    <View>
                        <Text className="text-cream font-semibold mb-2">Notes (optional)</Text>
                        <TextInput
                            className="glass-overlay rounded-card px-4 py-3 text-cream border border-cream/30"
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Any memorable moments?"
                            placeholderTextColor="#F5F5DC80"
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>
                </View>

                {/* Actions */}
                <View className="gap-3">
                    <Button
                        title="📝 Record Game"
                        onPress={handleSaveGame}
                        size="lg"
                        variant="primary"
                        loading={saving}
                        disabled={saving}
                    />
                    <Button
                        title="Cancel"
                        onPress={() => router.back()}
                        size="md"
                        variant="secondary"
                        disabled={saving}
                    />
                </View>
            </ScrollView>
        </View>
    );
}
