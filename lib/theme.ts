export const colors = {
  primary: {
    main: '#8b5cf6',
    light: '#a78bfa',
    dark: '#7c3aed',
    bg: '#f5f3ff',
  },
  secondary: {
    main: '#3b82f6',
    light: '#60a5fa',
    dark: '#2563eb',
    bg: '#eff6ff',
  },
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
    bg: '#d1fae5',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
    bg: '#fef3c7',
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
    bg: '#fee2e2',
  },
  info: {
    main: '#14b8a6',
    light: '#2dd4bf',
    dark: '#0f766e',
    bg: '#ccfbf1',
  },
  hot: {
    main: '#dc2626',
    light: '#f87171',
    dark: '#b91c1c',
    bg: '#fee2e2',
  },
  neutral: {
    white: '#ffffff',
    black: '#1a1a1a',
    gray: {
      50: '#f9f9f9',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#ddd',
      400: '#999',
      500: '#666',
      600: '#333',
      700: '#1a1a1a',
    },
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const typography = {
  heading: {
    h1: { fontSize: 32, fontWeight: 'bold' as const, lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: 'bold' as const, lineHeight: 32 },
    h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
    h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
    h5: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
    h6: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  },
  body: {
    large: { fontSize: 16, lineHeight: 24 },
    regular: { fontSize: 14, lineHeight: 20 },
    small: { fontSize: 12, lineHeight: 18 },
  },
};

export const theme = {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
};
