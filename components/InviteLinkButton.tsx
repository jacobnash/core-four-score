import React, { useState } from 'react';
import { Alert, Platform, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { buildTournamentInviteUrl } from '../utils/tournamentInvite';

interface InviteLinkButtonProps {
    tournamentId: string;
    tournamentName?: string;
    variant?: 'primary' | 'secondary';
    /** Button only — no helper text (for list rows). */
    compact?: boolean;
    /** Show the URL under the button. */
    showUrl?: boolean;
    /** When true, button is hidden (e.g. Core Four tournament). */
    disabled?: boolean;
}

async function copyOrShareInvite(url: string, tournamentName: string) {
    const message = `Join "${tournamentName}" on The Core Four Score:\n${url}`;

    if (Platform.OS === 'web') {
        try {
            await navigator.clipboard.writeText(url);
            Alert.alert('Link copied', 'Paste it in a text or group chat.');
            return;
        } catch {
            Alert.alert('Share link', url);
            return;
        }
    }

    try {
        await Share.share({ message, url });
    } catch {
        Alert.alert('Share link', url);
    }
}

export function InviteLinkButton({
    tournamentId,
    tournamentName = 'this tournament',
    variant = 'secondary',
    compact = false,
    showUrl = false,
    disabled = false,
}: InviteLinkButtonProps) {
    const [busy, setBusy] = useState(false);
    const url = buildTournamentInviteUrl(tournamentId);

    if (disabled) return null;

    const onPress = async () => {
        setBusy(true);
        try {
            await copyOrShareInvite(url, tournamentName);
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={[styles.wrap, compact && styles.wrapCompact]}>
            <TouchableOpacity
                style={[styles.button, variant === 'primary' ? styles.primary : styles.secondary]}
                onPress={onPress}
                disabled={busy}
            >
                <Text style={[styles.label, variant === 'primary' ? styles.labelPrimary : styles.labelSecondary]}>
                    {busy ? '…' : 'Share link'}
                </Text>
            </TouchableOpacity>
            {showUrl && (
                <Text style={styles.url} selectable>
                    {url}
                </Text>
            )}
            {!compact && (
                <Text style={styles.hint}>
                    Friends open the link, sign in with Google, and join.
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { marginTop: 8 },
    wrapCompact: { marginTop: 6 },
    button: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    primary: { backgroundColor: '#FF6700' },
    secondary: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#013220' },
    label: { fontWeight: '700', fontSize: 14 },
    labelPrimary: { color: '#fff' },
    labelSecondary: { color: '#013220' },
    url: {
        marginTop: 8,
        fontSize: 12,
        color: '#444',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    hint: { color: '#999', fontSize: 11, marginTop: 6 },
});
