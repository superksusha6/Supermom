// FamOs design tokens — the small, closed vocabulary that makes the UI a system
// (Vercel-discipline: strict spacing + status-only color) in a warm skin.
import type { ThemeColors } from '@/theme/theme';

// One spacing scale, applied religiously to padding and gaps.
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export type StatusKind = 'accent' | 'done' | 'soon' | 'urgent';

// Color-as-status: saturated color is reserved for meaning, never decoration.
// "soon" (amber) is a fixed warm hue that reads on every theme; the rest come
// from the active theme so status stays on-brand per palette.
export function statusColor(colors: ThemeColors, kind: StatusKind): string {
  switch (kind) {
    case 'done':
      return colors.done;
    case 'urgent':
      return colors.urgent;
    case 'soon':
      return '#e08a2b';
    case 'accent':
    default:
      return colors.primary;
  }
}
