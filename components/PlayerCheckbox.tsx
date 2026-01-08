import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
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
            className={`p-4 mb-3 rounded-card border-2 flex-row items-center shadow-card ${isSelected
                ? 'bg-brand-orange border-brand-orange'
                : 'glass-overlay'
                }`}
        >
            {/* Checkbox */}
            <View
                className={`w-7 h-7 rounded-lg border-2 mr-3 items-center justify-center ${isSelected ? 'bg-cream border-cream' : 'border-cream/70'
                    }`}
            >
                {isSelected && <Text className="text-forest-green font-bold">✓</Text>}
            </View>

            {/* Player Name */}
            <View className="flex-1">
                <Text className="text-lg font-semibold text-cream">
                    {user.displayName}
                </Text>
                <Text className="text-xs text-cream/80">{user.email}</Text>
            </View>
        </TouchableOpacity>
    );
};
