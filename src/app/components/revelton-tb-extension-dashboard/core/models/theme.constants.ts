/**
 * Theme Constants — Revelton TB Extension Dashboard
 *
 * Each theme has both a 'light' and 'dark' variant.
 * These values map directly to CSS custom properties via ThemeService.
 */

export interface ThemePalette {
  /** Background of the entire dashboard */
  bg: string;
  /** Surface / panel background */
  panel: string;
  /** Card / elevated surface */
  card: string;
  /** Primary border color */
  border: string;
  /** Primary accent */
  accent: string;
  /** Accent with transparency — for subtle tints */
  accentMuted: string;
  /** Primary text */
  text: string;
  /** Secondary text */
  textSecondary: string;
  /** Muted / disabled text */
  textMuted: string;
  /** Semantic colors (unchanged across themes) */
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  info: string;
}

export interface ThemeDefinition {
  name: string;
  /** Swatch dot color shown in the picker */
  swatch: string;
  light: ThemePalette;
  dark: ThemePalette;
}

export const THEMES: ThemeDefinition[] = [
  {
    name: 'Midnight',
    swatch: '#818cf8',
    light: {
      bg: '#f8fafc',
      panel: '#ffffff',
      card: '#ffffff',
      border: '#e2e8f0',
      accent: '#818cf8',
      accentMuted: 'rgba(129,140,248,0.12)',
      text: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      success: '#10b981',
      successBg: '#d1fae5',
      warning: '#f59e0b',
      warningBg: '#fef3c7',
      danger: '#ef4444',
      dangerBg: '#fee2e2',
      info: '#3b82f6'
    },
    dark: {
      bg: '#0f172a',
      panel: '#1e293b',
      card: '#1e293b',
      border: '#334155',
      accent: '#818cf8',
      accentMuted: 'rgba(129,140,248,0.15)',
      text: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textMuted: '#64748b',
      success: '#34d399',
      successBg: 'rgba(52,211,153,0.15)',
      warning: '#fbbf24',
      warningBg: 'rgba(251,191,36,0.15)',
      danger: '#f87171',
      dangerBg: 'rgba(248,113,113,0.15)',
      info: '#60a5fa'
    }
  },
  {
    name: 'Ocean',
    swatch: '#2dd4bf',
    light: {
      bg: '#f0fdfa',
      panel: '#ffffff',
      card: '#ffffff',
      border: '#ccfbf1',
      accent: '#14b8a6',
      accentMuted: 'rgba(20,184,166,0.12)',
      text: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      success: '#10b981',
      successBg: '#d1fae5',
      warning: '#f59e0b',
      warningBg: '#fef3c7',
      danger: '#ef4444',
      dangerBg: '#fee2e2',
      info: '#06b6d4'
    },
    dark: {
      bg: '#042f2e',
      panel: '#134e4a',
      card: '#134e4a',
      border: '#2dd4bf33',
      accent: '#2dd4bf',
      accentMuted: 'rgba(45,212,191,0.15)',
      text: '#f0fdfa',
      textSecondary: '#99f6e4',
      textMuted: '#5eead4',
      success: '#34d399',
      successBg: 'rgba(52,211,153,0.15)',
      warning: '#fbbf24',
      warningBg: 'rgba(251,191,36,0.15)',
      danger: '#f87171',
      dangerBg: 'rgba(248,113,113,0.15)',
      info: '#22d3ee'
    }
  },
  {
    name: 'Sunset',
    swatch: '#fb923c',
    light: {
      bg: '#fff7ed',
      panel: '#ffffff',
      card: '#ffffff',
      border: '#fed7aa',
      accent: '#f97316',
      accentMuted: 'rgba(249,115,22,0.12)',
      text: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      success: '#10b981',
      successBg: '#d1fae5',
      warning: '#f59e0b',
      warningBg: '#fef3c7',
      danger: '#ef4444',
      dangerBg: '#fee2e2',
      info: '#f97316'
    },
    dark: {
      bg: '#1c1006',
      panel: '#292117',
      card: '#292117',
      border: '#78350f',
      accent: '#fb923c',
      accentMuted: 'rgba(251,146,60,0.15)',
      text: '#fef3c7',
      textSecondary: '#fde68a',
      textMuted: '#92400e',
      success: '#34d399',
      successBg: 'rgba(52,211,153,0.15)',
      warning: '#fbbf24',
      warningBg: 'rgba(251,191,36,0.15)',
      danger: '#f87171',
      dangerBg: 'rgba(248,113,113,0.15)',
      info: '#fdba74'
    }
  },
  {
    name: 'Forest',
    swatch: '#4ade80',
    light: {
      bg: '#f0fdf4',
      panel: '#ffffff',
      card: '#ffffff',
      border: '#bbf7d0',
      accent: '#22c55e',
      accentMuted: 'rgba(34,197,94,0.12)',
      text: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      success: '#10b981',
      successBg: '#d1fae5',
      warning: '#f59e0b',
      warningBg: '#fef3c7',
      danger: '#ef4444',
      dangerBg: '#fee2e2',
      info: '#22c55e'
    },
    dark: {
      bg: '#052e16',
      panel: '#14532d',
      card: '#14532d',
      border: '#4ade8033',
      accent: '#4ade80',
      accentMuted: 'rgba(74,222,128,0.15)',
      text: '#f0fdf4',
      textSecondary: '#bbf7d0',
      textMuted: '#4ade80',
      success: '#34d399',
      successBg: 'rgba(52,211,153,0.15)',
      warning: '#fbbf24',
      warningBg: 'rgba(251,191,36,0.15)',
      danger: '#f87171',
      dangerBg: 'rgba(248,113,113,0.15)',
      info: '#86efac'
    }
  },
  {
    name: 'Rose',
    swatch: '#f472b6',
    light: {
      bg: '#fdf2f8',
      panel: '#ffffff',
      card: '#ffffff',
      border: '#fbcfe8',
      accent: '#ec4899',
      accentMuted: 'rgba(236,72,153,0.12)',
      text: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      success: '#10b981',
      successBg: '#d1fae5',
      warning: '#f59e0b',
      warningBg: '#fef3c7',
      danger: '#ef4444',
      dangerBg: '#fee2e2',
      info: '#ec4899'
    },
    dark: {
      bg: '#1a0612',
      panel: '#2d1025',
      card: '#2d1025',
      border: '#f472b633',
      accent: '#f472b6',
      accentMuted: 'rgba(244,114,182,0.15)',
      text: '#fdf2f8',
      textSecondary: '#fbcfe8',
      textMuted: '#f472b6',
      success: '#34d399',
      successBg: 'rgba(52,211,153,0.15)',
      warning: '#fbbf24',
      warningBg: 'rgba(251,191,36,0.15)',
      danger: '#f87171',
      dangerBg: 'rgba(248,113,113,0.15)',
      info: '#f9a8d4'
    }
  }
];
