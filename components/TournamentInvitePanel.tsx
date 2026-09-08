import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { tournamentService, userService } from '../services/firestore';
import { User } from '../types';
import { findUsersForTournamentInvite, resolveInviteLookupUser } from '../utils/tournamentInviteLookup';
import { Button } from './Button';
import { InviteLinkButton } from './InviteLinkButton';

interface TournamentInvitePanelProps {
    tournamentId: string;
    tournamentName: string;
    memberIds: string[];
    /** Hide share link + add UI (Core Four). */
    disabled?: boolean;
    compact?: boolean;
    onMemberAdded?: () => void | Promise<void>;
}

export function TournamentInvitePanel({
    tournamentId,
    tournamentName,
    memberIds,
    disabled = false,
    compact = false,
    onMemberAdded,
}: TournamentInvitePanelProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [searching, setSearching] = useState(false);
    const [addingUid, setAddingUid] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(!compact);

    const runSearch = useCallback(
        async (text: string) => {
            const q = text.trim();
            if (q.length < 2) {
                setResults([]);
                return;
            }
            setSearching(true);
            try {
                const matches = await userService.searchUsers(q, memberIds);
                setResults(matches);
            } catch (err) {
                console.error(err);
                setResults([]);
            } finally {
                setSearching(false);
            }
        },
        [memberIds]
    );

    useEffect(() => {
        const t = setTimeout(() => {
            runSearch(query);
        }, 300);
        return () => clearTimeout(t);
    }, [query, runSearch]);

    if (disabled) return null;

    const addUser = async (target: User) => {
        setAddingUid(target.uid);
        try {
            await tournamentService.addMember(tournamentId, target.uid);
            setQuery('');
            setResults([]);
            await onMemberAdded?.();
            Alert.alert('Added', `${target.displayName} joined ${tournamentName}.`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Could not add member';
            Alert.alert('Error', msg);
        } finally {
            setAddingUid(null);
        }
    };

    const addFromQuery = async () => {
        const trimmed = query.trim();
        if (!trimmed) return;

        const single = results.length === 1 ? results[0] : null;
        if (single) {
            await addUser(single);
            return;
        }

        setAddingUid('lookup');
        try {
            const all = await userService.getAllUsers();
            const found = await resolveInviteLookupUser(
                email => userService.findUserByEmail(email),
                all,
                trimmed,
                memberIds
            );
            if (!found) {
                const partial = findUsersForTournamentInvite(all, trimmed, memberIds);
                if (partial.length === 0) {
                    Alert.alert(
                        'Not found',
                        'No matching account. They need to sign in once, or send the invite link.'
                    );
                } else {
                    Alert.alert('Pick a player', 'Select someone from the list below.');
                }
                return;
            }
            await addUser(found);
        } finally {
            setAddingUid(null);
        }
    };

    if (compact && !expanded) {
        return (
            <View style={styles.compactRow}>
                <InviteLinkButton tournamentId={tournamentId} tournamentName={tournamentName} compact />
                <View style={{ width: 8 }} />
                <TouchableOpacity style={styles.addToggle} onPress={() => setExpanded(true)}>
                    <Text style={styles.addToggleText}>Add player</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.panel, compact && styles.panelCompact]}>
            <Text style={styles.heading}>Invite players</Text>

            <InviteLinkButton
                tournamentId={tournamentId}
                tournamentName={tournamentName}
                variant="primary"
                showUrl={!compact}
            />

            <Text style={[styles.subheading, { marginTop: 12 }]}>Or add someone already on the app</Text>
            <TextInput
                placeholder="Email or name"
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
            />
            <Button
                title="Add member"
                onPress={addFromQuery}
                disabled={!query.trim() || addingUid === 'lookup'}
                isLoading={addingUid === 'lookup'}
            />

            {searching && (
                <ActivityIndicator size="small" color="#FF6700" style={{ marginTop: 8 }} />
            )}

            {results.length > 0 && (
                <View style={styles.results}>
                    {results.map(u => (
                        <View key={u.uid} style={styles.resultRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.resultName}>{u.displayName}</Text>
                                <Text style={styles.resultEmail}>{u.email}</Text>
                            </View>
                            <Button
                                title="Add"
                                onPress={() => addUser(u)}
                                disabled={addingUid === u.uid}
                            />
                        </View>
                    ))}
                </View>
            )}

            {compact && (
                <TouchableOpacity onPress={() => setExpanded(false)} style={{ marginTop: 8 }}>
                    <Text style={styles.collapse}>Hide</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    panel: {
        marginTop: 12,
        padding: 10,
        backgroundColor: '#FFF8F0',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    panelCompact: {
        marginTop: 8,
        backgroundColor: '#FAFAFA',
        borderColor: '#EEE',
    },
    heading: { fontWeight: '700', fontSize: 14 },
    subheading: { fontWeight: '600', fontSize: 13, color: '#444' },
    input: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 10,
        marginTop: 8,
        marginBottom: 8,
        fontSize: 16,
    },
    results: { marginTop: 8 },
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    resultName: { fontWeight: '600' },
    resultEmail: { fontSize: 12, color: '#888' },
    compactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 8 },
    addToggle: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#013220',
    },
    addToggleText: { fontWeight: '700', color: '#013220', fontSize: 14 },
    collapse: { color: '#888', fontSize: 12, textAlign: 'center' },
});
