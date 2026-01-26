import * as React from 'react';
import { theme } from '../../../styles/theme';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'icon';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    isLoading = false,
    leftIcon,
    rightIcon,
    style,
    disabled,
    ...props
}) => {
    const [hover, setHover] = React.useState(false);

    // Base styles
    const baseStyles: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        border: 'none',
        borderRadius: theme.borderRadius.md,
        cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer',
        transition: theme.transitions.fast,
        fontFamily: theme.typography.fontFamily,
        fontWeight: theme.typography.weights.bold,
        width: fullWidth ? '100%' : 'auto',
        opacity: disabled ? 0.6 : 1,
        ...style,
    };

    // Size variants
    const sizeStyles: Record<string, React.CSSProperties> = {
        sm: { padding: '4px 8px', fontSize: theme.typography.sizes.xs },
        md: { padding: '8px 16px', fontSize: theme.typography.sizes.sm },
        lg: { padding: '12px 24px', fontSize: theme.typography.sizes.md },
    };

    // Color variants
    const variantStyles: Record<string, React.CSSProperties> = {
        primary: {
            background: hover && !disabled ? theme.colors.primaryDark : theme.colors.primary,
            color: theme.colors.text.inverse,
            boxShadow: disabled ? 'none' : theme.shadows.glow,
        },
        secondary: {
            background: hover && !disabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
            color: theme.colors.text.primary,
            border: `1px solid ${theme.colors.border}`,
        },
        outline: {
            background: 'transparent',
            border: `1px solid ${hover && !disabled ? theme.colors.primary : theme.colors.border}`,
            color: hover && !disabled ? theme.colors.primary : theme.colors.text.secondary,
        },
        ghost: {
            background: hover && !disabled ? 'rgba(255,255,255,0.05)' : 'transparent',
            color: theme.colors.text.secondary,
        },
        icon: {
            background: 'transparent',
            padding: '4px',
            color: hover && !disabled ? theme.colors.primary : theme.colors.text.secondary,
        }
    };

    const currentVariant = variantStyles[variant];

    return (
        <button
            style={{ ...baseStyles, ...sizeStyles[size], ...currentVariant }}
            disabled={disabled || isLoading}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            {...props}
        >
            {isLoading && (
                <span className="sc-spinner" style={{
                    width: '12px', height: '12px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite'
                }} />
            )}
            {!isLoading && leftIcon}
            {children}
            {!isLoading && rightIcon}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </button>
    );
};
