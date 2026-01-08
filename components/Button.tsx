import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';

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
    const baseStyles = 'rounded-lg items-center justify-center';

    const variantStyles = {
        primary: 'bg-brand-orange',
        secondary: 'bg-forest-green',
        danger: 'bg-red-600',
    };

    const sizeStyles = {
        sm: 'px-4 py-2',
        md: 'px-6 py-3',
        lg: 'px-8 py-4',
    };

    const textSizeStyles = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
    };

    const disabledStyles = disabled || loading ? 'opacity-50' : '';

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${className}`}
        >
            {loading ? (
                <ActivityIndicator color="#F5F5DC" />
            ) : (
                <Text className={`${textSizeStyles[size]} font-bold text-cream`}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};
