import * as React from 'react';
import { theme } from '../../../styles/theme';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    fullWidth = false,
    style,
    disabled,
    onFocus,
    onBlur,
    ...props
}) => {
    const [focused, setFocused] = React.useState(false);

    const containerStyles: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: fullWidth ? '100%' : 'auto',
        marginBottom: '8px',
    };

    const inputStyles: React.CSSProperties = {
        padding: '10px 12px',
        borderRadius: theme.borderRadius.md,
        border: `1px solid ${error ? theme.colors.error : focused ? theme.colors.primary : theme.colors.border}`,
        background: disabled ? '#1a1a1a' : theme.colors.background,
        color: disabled ? theme.colors.text.tertiary : theme.colors.text.primary,
        fontSize: theme.typography.sizes.sm,
        fontFamily: theme.typography.fontFamily,
        outline: 'none',
        transition: theme.transitions.fast,
        width: '100%',
        boxSizing: 'border-box',
        ...style,
    };

    const labelStyles: React.CSSProperties = {
        fontSize: theme.typography.sizes.xs,
        color: error ? theme.colors.error : theme.colors.text.secondary,
        fontWeight: theme.typography.weights.medium,
    };

    return (
        <div style={containerStyles}>
            {label && <label style={labelStyles}>{label}</label>}
            <input
                style={inputStyles}
                disabled={disabled}
                onFocus={(e) => {
                    setFocused(true);
                    onFocus?.(e);
                }}
                onBlur={(e) => {
                    setFocused(false);
                    onBlur?.(e);
                }}
                {...props}
            />
            {error && <span style={{ color: theme.colors.error, fontSize: '10px' }}>{error}</span>}
        </div>
    );
};
