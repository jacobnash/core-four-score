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
    const baseStyles = 'rounded-pill flex-row items-center justify-center shadow-button transition-transform duration-100';

    const variantStyles = {
        primary: 'bg-brand-orange border border-gold/40',
        secondary: 'bg-forest-green border border-cream/35',
        danger: 'bg-red-600 border border-red-300/60',
    } as const;

    const sizeStyles = {
        sm: 'h-10 px-4',
        md: 'h-12 px-5',
        lg: 'h-14 px-6',
    };

    const textSizeStyles = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
    };

    const disabledStyles = disabled || loading ? 'opacity-60' : 'active:scale-[0.985]';

    const textColorStyles = {
        primary: 'text-cream',
        secondary: 'text-gold',
        danger: 'text-cream',
    } as const;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${className}`}
        >
            {loading ? (
                <ActivityIndicator color="#F5F5DC" />
            ) : (
                <Text className={`${textSizeStyles[size]} font-semibold tracking-wide ${textColorStyles[variant]}`}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};
