import * as React from 'react';
import { theme } from '../../../styles/theme';

export interface CardProps {
    children: React.ReactNode;
    title?: string;
    variant?: 'default' | 'highlight' | 'outlined';
    noPadding?: boolean;
    style?: React.CSSProperties;
    actions?: React.ReactNode;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
    children,
    title,
    variant = 'default',
    noPadding = false,
    style,
    actions,
    onClick
}) => {
    const isHighlight = variant === 'highlight';

    const cardStyles: React.CSSProperties = {
        background: isHighlight ? theme.colors.primaryAlpha : theme.colors.surface,
        border: variant === 'outlined' || isHighlight
            ? `1px solid ${isHighlight ? theme.colors.primary : theme.colors.border}`
            : `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: onClick ? 'pointer' : 'default',
        transition: theme.transitions.fast,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        ...style
    };

    const headerStyles: React.CSSProperties = {
        padding: '12px',
        borderBottom: `1px solid ${theme.colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.2)'
    };

    const titleStyles: React.CSSProperties = {
        margin: 0,
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.bold,
        color: theme.colors.text.primary,
    };

    return (
        <div style={cardStyles} onClick={onClick}>
            {(title || actions) && (
                <div style={headerStyles}>
                    {title && <h3 style={titleStyles}>{title}</h3>}
                    {actions && <div>{actions}</div>}
                </div>
            )}
            <div style={{ padding: noPadding ? 0 : '12px' }}>
                {children}
            </div>
        </div>
    );
};
