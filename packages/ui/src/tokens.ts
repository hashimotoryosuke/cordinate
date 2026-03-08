export const colors = {
  // Brand
  primary: '#1A1A1A',
  primaryForeground: '#FFFFFF',
  accent: '#C9A84C',      // warm gold — fashion-forward
  accentForeground: '#1A1A1A',

  // Neutral
  background: '#FAFAFA',
  foreground: '#1A1A1A',
  muted: '#F4F4F5',
  mutedForeground: '#71717A',
  border: '#E4E4E7',

  // Semantic
  success: '#16A34A',
  warning: '#CA8A04',
  error: '#DC2626',
  info: '#2563EB',
} as const

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, sans-serif',
    serif: 'Playfair Display, Georgia, serif', // for headings — fashion feel
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const

export const spacing = {
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
} as const

export const borderRadius = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
} as const
