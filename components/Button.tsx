import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { webBoxShadow } from '../utils/shadow';

interface ButtonProps {
    onPress: () => void;
    title: string;
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    className?: string;
}

export const Button: React.FC<ButtonProps> = ({
    onPress,
    title,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    className = '',
}) => {
    const containerStyles: Record<string, ViewStyle> = {
        primary: styles.primary,
        secondary: styles.secondary,
        danger: styles.danger,
    };

    const heightBySize: Record<string, number> = {
        sm: 40,
        md: 48,
        lg: 56,
    };

    const textStyles: Record<string, TextStyle> = {
        sm: styles.textSm,
        md: styles.textMd,
        lg: styles.textLg,
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={[styles.buttonBase, containerStyles[variant], { height: heightBySize[size] }, disabled || loading ? styles.disabled : null]}
        >
            {loading ? (
                <ActivityIndicator color="#FFF" />
            ) : (
                <Text style={[styles.buttonText, textStyles[size]]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    buttonBase: {
        paddingHorizontal: 16,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        ...(Platform.OS === 'web' ? { boxShadow: webBoxShadow('rgba(0,0,0,0.12)', 6, 12) } : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 3,
        }),
    },
    primary: {
        backgroundColor: '#FF6700',
    },
    secondary: {
        backgroundColor: '#013220',
    },
    danger: {
        backgroundColor: '#C04A0C',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    textSm: {
        fontSize: 14,
    },
    textMd: {
        fontSize: 16,
    },
    textLg: {
        fontSize: 18,
    },
    disabled: {
        opacity: 0.6,
    },
});
