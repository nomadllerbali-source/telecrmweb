export const Colors = {
    primary: '#8b5cf6', // Purple - Main Action Color
    primaryDark: '#7c3aed', // Hover/Active state
    primaryLight: '#a78bfa', // Accents

    secondary: '#10b981', // Emerald - Success/Positive
    accent: '#ef4444', // Red - Errors/Alerts

    background: '#0a0a0c', // Deep Dark - App Background
    surface: '#16161a', // Card Background
    surfaceHighlight: '#1f1f26', // Input Background

    text: {
        primary: '#ffffff', // White
        secondary: '#94a3b8', // Gray-400
        tertiary: '#64748b', // Gray-500
        inverse: '#000000', // For light surfaces if any
    },

    border: 'rgba(255, 255, 255, 0.08)',
    divider: 'rgba(255, 255, 255, 0.04)',

    status: {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
    },

    gradients: {
        primary: ['#8b5cf6', '#7c3aed'],
        warm: ['#f59e0b', '#ea580c'],
        cool: ['#10b981', '#059669']
    },
    glass: 'rgba(255, 255, 255, 0.03)',
};

export const Layout = {
    radius: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 20,
        xl: 24,
        full: 9999
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32
    },
    shadows: {
        sm: {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 2,
        },
        md: {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 4,
        },
        lg: {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.4,
            shadowRadius: 30,
            elevation: 8,
        }
    }
};
