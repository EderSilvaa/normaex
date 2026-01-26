/**
 * Design System Theme - Normaex
 * Cores, tipografia e espaçamentos centralizados.
 */

export const theme = {
    colors: {
        // Brand
        primary: '#Eebb4d', // Amarelo Ouro
        primaryDark: '#d9a63c',
        primaryLight: '#f5d485',

        // Grayscale / Backgrounds
        background: '#0a0a0a',
        surface: '#141414',
        surfaceHighlight: '#1e1e1e',
        border: '#2a2a2a',

        // Text
        text: {
            primary: '#ffffff',
            secondary: '#a0a0a0',
            tertiary: '#666666',
            inverse: '#0a0a0a'
        },

        // Feedback
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',

        // Transparencies
        primaryAlpha: 'rgba(238, 187, 77, 0.15)',
        borderAlpha: 'rgba(255, 255, 255, 0.1)',
    },

    spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
    },

    borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        full: '9999px',
    },

    typography: {
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        sizes: {
            xs: '10px',
            sm: '12px',
            md: '14px',
            lg: '16px',
            xl: '20px',
            xxl: '24px',
        },
        weights: {
            regular: 400,
            medium: 500,
            bold: 600,
            black: 700,
        }
    },

    shadows: {
        none: 'none',
        sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
        md: '0 4px 6px rgba(0, 0, 0, 0.3)',
        glow: '0 0 15px rgba(238, 187, 77, 0.2)',
    },

    transitions: {
        fast: 'all 0.2s ease',
        medium: 'all 0.3s ease',
    }
};

export type Theme = typeof theme;
