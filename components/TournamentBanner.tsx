import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Tournament } from '../types';
import { webBoxShadow } from '../utils/shadow';

interface TournamentBannerProps {
    tournament: Tournament | null;
    memberCount?: number;
}

export function TournamentBanner({ tournament, memberCount }: TournamentBannerProps) {
    if (!tournament) {
        return (
            <View style={styles.banner}>
                <Text style={styles.label}>No tournament selected</Text>
                <Text style={styles.sub}>Select a tournament to view data</Text>
            </View>
        );
    }

    const count = memberCount ?? tournament.memberIds?.length ?? 0;

    return (
        <View style={styles.banner}>
            <Text style={styles.eyebrow}>Active Tournament</Text>
            <Text style={styles.name}>{tournament.name}</Text>
            <Text style={styles.sub}>{count} player{count === 1 ? '' : 's'}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#013220',
        padding: 14,
        borderRadius: 12,
        ...(Platform.OS === 'web' ? { boxShadow: webBoxShadow('rgba(0,0,0,0.08)', 4, 8) } : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
        }),
    },
    eyebrow: {
        fontSize: 11,
        fontWeight: '700',
        color: '#F4C95D',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    name: {
        fontSize: 18,
        fontWeight: '800',
        color: '#F5F5DC',
        marginTop: 4,
    },
    label: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F5F5DC',
    },
    sub: {
        fontSize: 12,
        color: '#F5F5DC',
        opacity: 0.8,
        marginTop: 4,
    },
});
