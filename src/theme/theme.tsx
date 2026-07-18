import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeName = 'blue' | 'grey' | 'blush' | 'neonBloom' | 'mocha' | 'dark';

// User-facing appearance choice. 'auto' follows the phone's Light/Dark setting.
export type ThemeMode = 'light' | 'dark' | 'auto';

export type ThemeColors = {
  bg: string;
  card: string;
  glassStrong: string;
  glassSoft: string;
  text: string;
  subtext: string;
  border: string;
  primary: string;
  selection: string;
  urgent: string;
  nonUrgent: string;
  done: string;
  shadow: string;
  // Opaque surfaces (modals, cards, inputs) — tokenized so dark mode is clean.
  surface: string;
  surfaceAlt: string;
};

export const themePalettes: Record<ThemeName, ThemeColors> = {
  blue: {
    bg: '#dfeaf5',
    card: 'rgba(255,255,255,0.30)',
    glassStrong: 'rgba(255,255,255,0.56)',
    glassSoft: 'rgba(255,255,255,0.20)',
    text: '#14233b',
    subtext: '#52627d',
    border: 'rgba(255,255,255,0.62)',
    primary: '#2d6df6',
    selection: 'rgba(219,234,254,0.72)',
    urgent: '#dc2626',
    nonUrgent: '#f59e0b',
    done: '#16a34a',
    shadow: 'rgba(73, 98, 136, 0.22)',
    surface: '#ffffff',
    surfaceAlt: '#eef2f8',
  },
  grey: {
    bg: '#c9cdd2',
    card: 'rgba(232,236,240,0.12)',
    glassStrong: 'rgba(255,255,255,0.5)',
    glassSoft: 'rgba(255,255,255,0.38)',
    text: '#26292e',
    subtext: '#474c53',
    border: 'rgba(90,96,104,0.30)',
    primary: '#3f4650',
    selection: 'rgba(63,70,80,0.16)',
    urgent: '#c62d3a',
    nonUrgent: '#6b7076',
    done: '#2f7d4f',
    shadow: 'rgba(56, 60, 66, 0.12)',
    surface: '#eef0f2',
    surfaceAlt: '#e2e5e9',
  },
  blush: {
    bg: '#d6ebf2',
    card: 'rgba(255,255,255,0.18)',
    glassStrong: 'rgba(214,235,242,0.34)',
    glassSoft: 'rgba(214,235,242,0.12)',
    text: '#18222b',
    subtext: '#374151',
    border: 'rgba(255,255,255,0.46)',
    primary: '#ff7a00',
    selection: 'rgba(255,122,0,0.22)',
    urgent: '#ff7a00',
    nonUrgent: '#83cee2',
    done: '#7bc6da',
    shadow: 'rgba(131, 206, 226, 0.16)',
    surface: '#ffffff',
    surfaceAlt: '#eaf3f7',
  },
  neonBloom: {
    bg: '#d7df72',
    card: 'rgba(255,255,255,0.14)',
    glassStrong: 'rgba(255,255,255,0.28)',
    glassSoft: 'rgba(255,255,255,0.09)',
    text: '#1e2438',
    subtext: '#56607d',
    border: 'rgba(255,255,255,0.42)',
    primary: '#ef55a5',
    selection: 'rgba(140, 158, 255, 0.24)',
    urgent: '#ef55a5',
    nonUrgent: '#8c9eff',
    done: '#8c9eff',
    shadow: 'rgba(132, 158, 255, 0.12)',
    surface: '#ffffff',
    surfaceAlt: '#eef1f6',
  },
  mocha: {
    bg: '#362017',
    card: 'rgba(255, 245, 238, 0.06)',
    glassStrong: 'rgba(255, 245, 238, 0.10)',
    glassSoft: 'rgba(255, 245, 238, 0.035)',
    text: '#fff7f2',
    subtext: '#e7d6cb',
    border: 'rgba(255, 244, 236, 0.14)',
    primary: '#e2b8a3',
    selection: 'rgba(162, 119, 97, 0.16)',
    urgent: '#f0876a',
    nonUrgent: '#8f624c',
    done: '#7fd6a3',
    shadow: 'rgba(18, 8, 5, 0.22)',
    surface: '#2a1a13',
    surfaceAlt: '#3a251b',
  },
  // Neutral iOS-style dark. Kept the brand blue accent (brightened for contrast).
  dark: {
    bg: '#0d1117',
    card: 'rgba(255,255,255,0.05)',
    glassStrong: 'rgba(255,255,255,0.085)',
    glassSoft: 'rgba(255,255,255,0.04)',
    text: '#eef2f8',
    subtext: '#9aa6b6',
    border: 'rgba(255,255,255,0.12)',
    primary: '#4f8cff',
    selection: 'rgba(79,140,255,0.20)',
    urgent: '#ff5c62',
    nonUrgent: '#f5a623',
    done: '#34c759',
    shadow: 'rgba(0, 0, 0, 0.55)',
    surface: '#161b22',
    surfaceAlt: '#0f141b',
  },
};

const LIGHT_THEME: ThemeName = 'blue';
const DARK_THEME: ThemeName = 'dark';

export function resolveThemeName(mode: ThemeMode, system: 'light' | 'dark' | null | undefined): ThemeName {
  if (mode === 'auto') return system === 'dark' ? DARK_THEME : LIGHT_THEME;
  return mode === 'dark' ? DARK_THEME : LIGHT_THEME;
}

const ThemeContext = createContext<{
  mode: ThemeMode;
  themeName: ThemeName;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
} | null>(null);

const THEME_MODE_KEY = 'smartmom.themeMode.v1';

function readStoredMode(): ThemeMode {
  try {
    const raw = (globalThis as unknown as { localStorage?: Storage }).localStorage?.getItem(THEME_MODE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'auto') return raw;
  } catch {
    // ignore
  }
  return 'auto';
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const setMode = (next: ThemeMode) => {
    setModeState(next);
    try {
      (globalThis as unknown as { localStorage?: Storage }).localStorage?.setItem(THEME_MODE_KEY, next);
    } catch {
      // best-effort persistence
    }
  };
  const themeName = resolveThemeName(mode, systemScheme);
  const value = useMemo(
    () => ({
      mode,
      themeName,
      colors: themePalettes[themeName],
      setMode,
    }),
    [mode, themeName],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

export function useThemeColors() {
  return useTheme().colors;
}
