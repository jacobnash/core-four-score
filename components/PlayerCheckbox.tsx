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
            className={`p-4 mb-2 rounded-lg border-2 flex-row items-center ${isSelected
                    ? 'bg-brand-orange border-brand-orange'
                    : 'bg-forest-green border-cream'
                }`}
        >
            {/* Checkbox */}
            <View
                className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${isSelected ? 'bg-cream border-cream' : 'border-cream'
                    }`}
            >
                {isSelected && <Text className="text-forest-green font-bold">✓</Text>}
            </View>

            {/* Player Name */}
            <Text className="text-lg font-semibold text-cream flex-1">
                {user.displayName}
            </Text>
        </TouchableOpacity>
    );
};
