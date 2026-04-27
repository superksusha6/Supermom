import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

export type ThemeName = 'blue' | 'grey' | 'blush' | 'neonBloom' | 'mocha';

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
  },
  grey: {
    bg: '#c9cdd2',
    card: 'rgba(232,236,240,0.12)',
    glassStrong: 'rgba(107,112,118,0.28)',
    glassSoft: 'rgba(214,219,225,0.08)',
    text: '#505256',
    subtext: '#6b7076',
    border: 'rgba(255,255,255,0.34)',
    primary: '#6b7076',
    selection: 'rgba(107,112,118,0.20)',
    urgent: '#505256',
    nonUrgent: '#8f9499',
    done: '#7b8086',
    shadow: 'rgba(56, 60, 66, 0.12)',
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
  },
  mocha: {
    bg: '#362017',
    card: 'rgba(255, 245, 238, 0.06)',
    glassStrong: 'rgba(255, 245, 238, 0.10)',
    glassSoft: 'rgba(255, 245, 238, 0.035)',
    text: '#fff7f2',
    subtext: '#e7d6cb',
    border: 'rgba(255, 244, 236, 0.14)',
    primary: '#a27761',
    selection: 'rgba(162, 119, 97, 0.16)',
    urgent: '#24120c',
    nonUrgent: '#8f624c',
    done: '#bb8c74',
    shadow: 'rgba(18, 8, 5, 0.22)',
  },
};

const ThemeContext = createContext<{
  themeName: ThemeName;
  colors: ThemeColors;
  setThemeName: (name: ThemeName) => void;
} | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themeName, setThemeName] = useState<ThemeName>('blue');
  const value = useMemo(
    () => ({
      themeName,
      colors: themePalettes[themeName],
      setThemeName,
    }),
    [themeName],
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
