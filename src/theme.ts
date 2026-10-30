// Design tokens di Foodity: colori, raggi, spaziature e testi condivisi da tutte le schermate.

export const colors = {
  primary: '#1B6FE3',
  primaryPressed: '#1559B8',
  primaryDisabled: '#8FB2E8',
  onPrimary: '#FFFFFF',
  primarySoft: '#E6EEFB',
  text: '#16202E',
  textSecondary: '#5B6B82',
  textMuted: '#7A8899',
  surface: '#FFFFFF',
  border: '#E1E8F4',
  inputBackground: '#F6F8FC',
  inputBorder: '#D5E0F1',
  // Superficie di GlassSurface dove il Liquid Glass non c'è (Android, iOS < 26, Riduci trasparenza).
  glassFallback: '#F2F2F7',
  glassFallbackBorder: 'rgba(60, 60, 67, 0.18)',
  success: '#2E9E6B',
  danger: '#D93B3B',
  // Sfondo a gradiente delle schermate (dall'alto verso il basso).
  backgroundTop: '#F1F4FB',
  backgroundBottom: '#C4D3F1',
} as const;

export const backgroundGradient = `linear-gradient(180deg, ${colors.backgroundTop} 0%, ${colors.backgroundBottom} 100%)`;

export const radius = {
  sm: 10,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  brand: { fontSize: 22, fontWeight: '700', color: colors.text },
  eyebrow: { fontSize: 13, fontWeight: '700', letterSpacing: 1, color: colors.primary },
  display: { fontSize: 30, fontWeight: '400', letterSpacing: -0.6, color: colors.text },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  caption: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  button: { fontSize: 16, fontWeight: '700', color: colors.onPrimary },
} as const;

export const shadow = {
  boxShadow: '0 8px 24px rgba(40, 70, 140, 0.10)',
} as const;
