/**
 * Theme Constants — Revelton TB Extension Dashboard
 *
 * Each theme has both a 'light' and 'dark' variant.
 * These values map directly to CSS custom properties via ThemeService.
 */

export interface ThemePalette {
  bg: string;
  panel: string;
  panel2: string;
  inner: string;
  card: string;
  border: string;
  accent: string;
  accentSoft: string;
  accentMuted: string;
  tx: string;
  t2: string;
  t3: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  ok: string;
  okSoft: string;
  warn: string;
  warnSoft: string;
  alert: string;
  alertSoft: string;
  ringTrack: string;
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
  swatch: string;
  light: ThemePalette;
  dark: ThemePalette;
}

export const THEMES: ThemeDefinition[] = [
  {
    name: 'Revelton',
    swatch: '#5c7cfa',
    dark: {
      bg: '#0d1219',
      panel: '#141b25',
      panel2: '#1a2230',
      inner: '#1e2733',
      card: '#141b25',
      border: '#27313f',
      accent: '#5c7cfa',
      accentSoft: 'rgba(92,124,250,.14)',
      accentMuted: 'rgba(92,124,250,.14)',
      tx: '#e6ecf3',
      t2: '#8b97a8',
      t3: '#5c6675',
      text: '#e6ecf3',
      textSecondary: '#8b97a8',
      textMuted: '#5c6675',
      ok: '#34d399',
      okSoft: 'rgba(52,211,153,.13)',
      warn: '#f5b54a',
      warnSoft: 'rgba(245,181,74,.13)',
      alert: '#f87171',
      alertSoft: 'rgba(248,113,113,.13)',
      ringTrack: '#27313f',
      success: '#34d399',
      successBg: 'rgba(52,211,153,.13)',
      warning: '#f5b54a',
      warningBg: 'rgba(245,181,74,.13)',
      danger: '#f87171',
      dangerBg: 'rgba(248,113,113,.13)',
      info: '#5c7cfa',
    },
    light: {
      bg: '#eaeef4',
      panel: '#ffffff',
      panel2: '#f6f8fc',
      inner: '#eef2f8',
      card: '#ffffff',
      border: '#dde3ec',
      accent: '#4361e8',
      accentSoft: 'rgba(67,97,232,.10)',
      accentMuted: 'rgba(67,97,232,.10)',
      tx: '#1a2230',
      t2: '#5c6675',
      t3: '#9aa6b6',
      text: '#1a2230',
      textSecondary: '#5c6675',
      textMuted: '#9aa6b6',
      ok: '#0e9f6e',
      okSoft: 'rgba(14,159,110,.12)',
      warn: '#c97a17',
      warnSoft: 'rgba(201,122,23,.12)',
      alert: '#dc4d4d',
      alertSoft: 'rgba(220,77,77,.12)',
      ringTrack: '#dde3ec',
      success: '#0e9f6e',
      successBg: 'rgba(14,159,110,.12)',
      warning: '#c97a17',
      warningBg: 'rgba(201,122,23,.12)',
      danger: '#dc4d4d',
      dangerBg: 'rgba(220,77,77,.12)',
      info: '#4361e8',
    },
  },
  {
    name: 'Midnight',
    swatch: '#818cf8',
    light: {
      bg: '#f8fafc', panel: '#ffffff', panel2: '#f1f5f9', inner: '#e8edf3', card: '#ffffff',
      border: '#e2e8f0', accent: '#818cf8', accentSoft: 'rgba(129,140,248,0.12)', accentMuted: 'rgba(129,140,248,0.12)',
      tx: '#0f172a', t2: '#475569', t3: '#94a3b8', text: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8',
      ok: '#10b981', okSoft: '#d1fae5', warn: '#f59e0b', warnSoft: '#fef3c7', alert: '#ef4444', alertSoft: '#fee2e2',
      ringTrack: '#e2e8f0', success: '#10b981', successBg: '#d1fae5', warning: '#f59e0b', warningBg: '#fef3c7',
      danger: '#ef4444', dangerBg: '#fee2e2', info: '#3b82f6',
    },
    dark: {
      bg: '#0f172a', panel: '#1e293b', panel2: '#253047', inner: '#2d3a50', card: '#1e293b',
      border: '#334155', accent: '#818cf8', accentSoft: 'rgba(129,140,248,0.15)', accentMuted: 'rgba(129,140,248,0.15)',
      tx: '#f1f5f9', t2: '#cbd5e1', t3: '#64748b', text: '#f1f5f9', textSecondary: '#cbd5e1', textMuted: '#64748b',
      ok: '#34d399', okSoft: 'rgba(52,211,153,0.15)', warn: '#fbbf24', warnSoft: 'rgba(251,191,36,0.15)',
      alert: '#f87171', alertSoft: 'rgba(248,113,113,0.15)', ringTrack: '#334155',
      success: '#34d399', successBg: 'rgba(52,211,153,0.15)', warning: '#fbbf24', warningBg: 'rgba(251,191,36,0.15)',
      danger: '#f87171', dangerBg: 'rgba(248,113,113,0.15)', info: '#60a5fa',
    },
  },
  {
    name: 'Ocean',
    swatch: '#2dd4bf',
    light: {
      bg: '#f0fdfa', panel: '#ffffff', panel2: '#e6faf7', inner: '#d0f5ef', card: '#ffffff',
      border: '#ccfbf1', accent: '#14b8a6', accentSoft: 'rgba(20,184,166,0.12)', accentMuted: 'rgba(20,184,166,0.12)',
      tx: '#0f172a', t2: '#475569', t3: '#94a3b8', text: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8',
      ok: '#10b981', okSoft: '#d1fae5', warn: '#f59e0b', warnSoft: '#fef3c7', alert: '#ef4444', alertSoft: '#fee2e2',
      ringTrack: '#ccfbf1', success: '#10b981', successBg: '#d1fae5', warning: '#f59e0b', warningBg: '#fef3c7',
      danger: '#ef4444', dangerBg: '#fee2e2', info: '#06b6d4',
    },
    dark: {
      bg: '#042f2e', panel: '#134e4a', panel2: '#1a6260', inner: '#207572', card: '#134e4a',
      border: '#2dd4bf33', accent: '#2dd4bf', accentSoft: 'rgba(45,212,191,0.15)', accentMuted: 'rgba(45,212,191,0.15)',
      tx: '#f0fdfa', t2: '#99f6e4', t3: '#5eead4', text: '#f0fdfa', textSecondary: '#99f6e4', textMuted: '#5eead4',
      ok: '#34d399', okSoft: 'rgba(52,211,153,0.15)', warn: '#fbbf24', warnSoft: 'rgba(251,191,36,0.15)',
      alert: '#f87171', alertSoft: 'rgba(248,113,113,0.15)', ringTrack: '#2dd4bf33',
      success: '#34d399', successBg: 'rgba(52,211,153,0.15)', warning: '#fbbf24', warningBg: 'rgba(251,191,36,0.15)',
      danger: '#f87171', dangerBg: 'rgba(248,113,113,0.15)', info: '#22d3ee',
    },
  },
  {
    name: 'Sunset',
    swatch: '#fb923c',
    light: {
      bg: '#fff7ed', panel: '#ffffff', panel2: '#fef3e2', inner: '#fde8c8', card: '#ffffff',
      border: '#fed7aa', accent: '#f97316', accentSoft: 'rgba(249,115,22,0.12)', accentMuted: 'rgba(249,115,22,0.12)',
      tx: '#0f172a', t2: '#475569', t3: '#94a3b8', text: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8',
      ok: '#10b981', okSoft: '#d1fae5', warn: '#f59e0b', warnSoft: '#fef3c7', alert: '#ef4444', alertSoft: '#fee2e2',
      ringTrack: '#fed7aa', success: '#10b981', successBg: '#d1fae5', warning: '#f59e0b', warningBg: '#fef3c7',
      danger: '#ef4444', dangerBg: '#fee2e2', info: '#f97316',
    },
    dark: {
      bg: '#1c1006', panel: '#292117', panel2: '#332818', inner: '#3d301a', card: '#292117',
      border: '#78350f', accent: '#fb923c', accentSoft: 'rgba(251,146,60,0.15)', accentMuted: 'rgba(251,146,60,0.15)',
      tx: '#fef3c7', t2: '#fde68a', t3: '#92400e', text: '#fef3c7', textSecondary: '#fde68a', textMuted: '#92400e',
      ok: '#34d399', okSoft: 'rgba(52,211,153,0.15)', warn: '#fbbf24', warnSoft: 'rgba(251,191,36,0.15)',
      alert: '#f87171', alertSoft: 'rgba(248,113,113,0.15)', ringTrack: '#78350f',
      success: '#34d399', successBg: 'rgba(52,211,153,0.15)', warning: '#fbbf24', warningBg: 'rgba(251,191,36,0.15)',
      danger: '#f87171', dangerBg: 'rgba(248,113,113,0.15)', info: '#fdba74',
    },
  },
  {
    name: 'Forest',
    swatch: '#4ade80',
    light: {
      bg: '#f0fdf4', panel: '#ffffff', panel2: '#e8faf0', inner: '#d1f5e0', card: '#ffffff',
      border: '#bbf7d0', accent: '#22c55e', accentSoft: 'rgba(34,197,94,0.12)', accentMuted: 'rgba(34,197,94,0.12)',
      tx: '#0f172a', t2: '#475569', t3: '#94a3b8', text: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8',
      ok: '#10b981', okSoft: '#d1fae5', warn: '#f59e0b', warnSoft: '#fef3c7', alert: '#ef4444', alertSoft: '#fee2e2',
      ringTrack: '#bbf7d0', success: '#10b981', successBg: '#d1fae5', warning: '#f59e0b', warningBg: '#fef3c7',
      danger: '#ef4444', dangerBg: '#fee2e2', info: '#22c55e',
    },
    dark: {
      bg: '#052e16', panel: '#14532d', panel2: '#1a6635', inner: '#207a3d', card: '#14532d',
      border: '#4ade8033', accent: '#4ade80', accentSoft: 'rgba(74,222,128,0.15)', accentMuted: 'rgba(74,222,128,0.15)',
      tx: '#f0fdf4', t2: '#bbf7d0', t3: '#4ade80', text: '#f0fdf4', textSecondary: '#bbf7d0', textMuted: '#4ade80',
      ok: '#34d399', okSoft: 'rgba(52,211,153,0.15)', warn: '#fbbf24', warnSoft: 'rgba(251,191,36,0.15)',
      alert: '#f87171', alertSoft: 'rgba(248,113,113,0.15)', ringTrack: '#4ade8033',
      success: '#34d399', successBg: 'rgba(52,211,153,0.15)', warning: '#fbbf24', warningBg: 'rgba(251,191,36,0.15)',
      danger: '#f87171', dangerBg: 'rgba(248,113,113,0.15)', info: '#86efac',
    },
  },
  {
    name: 'Rose',
    swatch: '#f472b6',
    light: {
      bg: '#fdf2f8', panel: '#ffffff', panel2: '#fce8f4', inner: '#f9d5ea', card: '#ffffff',
      border: '#fbcfe8', accent: '#ec4899', accentSoft: 'rgba(236,72,153,0.12)', accentMuted: 'rgba(236,72,153,0.12)',
      tx: '#0f172a', t2: '#475569', t3: '#94a3b8', text: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8',
      ok: '#10b981', okSoft: '#d1fae5', warn: '#f59e0b', warnSoft: '#fef3c7', alert: '#ef4444', alertSoft: '#fee2e2',
      ringTrack: '#fbcfe8', success: '#10b981', successBg: '#d1fae5', warning: '#f59e0b', warningBg: '#fef3c7',
      danger: '#ef4444', dangerBg: '#fee2e2', info: '#ec4899',
    },
    dark: {
      bg: '#1a0612', panel: '#2d1025', panel2: '#3a1530', inner: '#47193b', card: '#2d1025',
      border: '#f472b633', accent: '#f472b6', accentSoft: 'rgba(244,114,182,0.15)', accentMuted: 'rgba(244,114,182,0.15)',
      tx: '#fdf2f8', t2: '#fbcfe8', t3: '#f472b6', text: '#fdf2f8', textSecondary: '#fbcfe8', textMuted: '#f472b6',
      ok: '#34d399', okSoft: 'rgba(52,211,153,0.15)', warn: '#fbbf24', warnSoft: 'rgba(251,191,36,0.15)',
      alert: '#f87171', alertSoft: 'rgba(248,113,113,0.15)', ringTrack: '#f472b633',
      success: '#34d399', successBg: 'rgba(52,211,153,0.15)', warning: '#fbbf24', warningBg: 'rgba(251,191,36,0.15)',
      danger: '#f87171', dangerBg: 'rgba(248,113,113,0.15)', info: '#f9a8d4',
    },
  },
];
