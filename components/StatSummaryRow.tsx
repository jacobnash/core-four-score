import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface StatSummaryItem {
    label: string;
    value: string;
    accent?: boolean;
}

interface StatSummaryRowProps {
    items: StatSummaryItem[];
}

export function StatSummaryRow({ items }: StatSummaryRowProps) {
    return (
        <View style={styles.row}>
            {items.map((item) => (
                <View key={item.label} style={styles.col}>
                    <Text style={[styles.value, item.accent && styles.valueAccent]}>{item.value}</Text>
                    <Text style={styles.label}>{item.label}</Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    col: {
        flex: 1,
        minWidth: 72,
        backgroundColor: '#F7F8F9',
        borderRadius: 10,
        padding: 10,
        alignItems: 'center',
    },
    value: {
        fontSize: 18,
        fontWeight: '800',
        color: '#013220',
    },
    valueAccent: {
        color: '#FF6700',
    },
    label: {
        fontSize: 11,
        color: '#666',
        marginTop: 4,
        textAlign: 'center',
    },
});
