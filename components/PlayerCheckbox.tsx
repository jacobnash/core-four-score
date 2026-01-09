import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { User } from '../types';

interface PlayerCheckboxProps {
    user: User;
    isSelected: boolean;
    onToggle: () => void;
}

export const PlayerCheckbox: React.FC<PlayerCheckboxProps> = ({
    user,
    isSelected,
    onToggle,
}) => {
    return (
        <TouchableOpacity
            onPress={onToggle}
            style={[styles.row, isSelected ? styles.selected : styles.unselected]}
        >
            {/* Checkbox */}
            <View
                style={[styles.checkbox, isSelected ? styles.checkboxSelected : styles.checkboxUnselected]}
            >
                {isSelected && <Text className="text-forest-green font-bold">✓</Text>}
            </View>

            {/* Player Name */}
            <View style={styles.info}>
                <Text style={styles.name}>{user.displayName}</Text>
                <Text style={styles.email}>{user.email}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    row: {
        padding: 12,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 2,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    selected: {
        backgroundColor: '#FFF3E6',
        borderColor: '#FF6700',
    },
    unselected: {
        backgroundColor: '#F7F7F8',
        borderColor: '#E6E9EE',
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 6,
        borderWidth: 2,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#fff',
        borderColor: '#fff',
    },
    checkboxUnselected: {
        borderColor: '#d1d5db',
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111',
    },
    email: {
        fontSize: 12,
        color: '#666',
    }
});
