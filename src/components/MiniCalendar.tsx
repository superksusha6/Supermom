import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ThemeColors, useThemeColors } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

// A compact Week/Month peek calendar for Home. Event dots only (no cycle data —
// privacy stays on the Calendar tab's "My" scope). Tapping a day calls onOpenDay
// so Home can jump to the full calendar.
type Props = {
  eventDates: Set<string>; // 'YYYY-MM-DD' that have at least one event
  today: string; // 'YYYY-MM-DD'
  onOpenDay: (dateKey: string) => void;
};

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function toKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseKey(k: string) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function mondayOf(d: Date) {
  return addDays(d, -((d.getDay() + 6) % 7));
}

export function MiniCalendar({ eventDates, today, onOpenDay }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [offset, setOffset] = useState(0); // weeks (week view) or months (month view) from now

  const { cells, title } = useMemo(() => {
    const base = parseKey(today);
    if (view === 'week') {
      const start = mondayOf(addDays(base, offset * 7));
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(start, i);
        return { key: toKey(d), day: d.getDate(), inMonth: true };
      });
      const end = addDays(start, 6);
      const label =
        start.getMonth() === end.getMonth()
          ? `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()}–${end.getDate()}`
          : `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      return { cells: days, title: label };
    }
    const first = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    const gridStart = mondayOf(first);
    let days = Array.from({ length: 42 }, (_, i) => {
      const d = addDays(gridStart, i);
      return { key: toKey(d), day: d.getDate(), inMonth: d.getMonth() === first.getMonth() };
    });
    // Trim a trailing week that is entirely in the next month.
    if (days.slice(35).every((c) => !c.inMonth)) days = days.slice(0, 35);
    return { cells: days, title: first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
  }, [view, offset, today]);

  const switchView = (next: 'week' | 'month') => {
    setView(next);
    setOffset(0);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.toggle}>
          {(['week', 'month'] as const).map((v) => (
            <Pressable
              key={v}
              accessibilityRole="button"
              accessibilityLabel={`${v} view`}
              style={[styles.togglePill, view === v && styles.togglePillActive]}
              onPress={() => switchView(v)}
            >
              <Text style={[styles.toggleText, view === v && styles.toggleTextActive]}>{v === 'week' ? 'Week' : 'Month'}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.nav}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous" hitSlop={8} style={styles.navBtn} onPress={() => setOffset((o) => o - 1)}>
            <Text style={styles.navChevron}>‹</Text>
          </Pressable>
          <Text style={styles.navTitle}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Next" hitSlop={8} style={styles.navBtn} onPress={() => setOffset((o) => o + 1)}>
            <Text style={styles.navChevron}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekday}>{w}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((c) => {
          const isToday = c.key === today;
          const hasEvent = eventDates.has(c.key);
          return (
            <Pressable
              key={c.key}
              accessibilityRole="button"
              accessibilityLabel={c.key + (hasEvent ? ', has events' : '')}
              style={styles.cell}
              onPress={() => onOpenDay(c.key)}
            >
              <View style={[styles.dayWrap, isToday && styles.dayWrapToday]}>
                <Text style={[styles.dayText, !c.inMonth && styles.dayTextMuted, isToday && styles.dayTextToday]}>{c.day}</Text>
              </View>
              <View style={[styles.dot, hasEvent && !isToday && styles.dotOn]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.lg,
      backgroundColor: colors.glassSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
      gap: space.sm,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.sm,
    },
    toggle: {
      flexDirection: 'row',
      gap: 4,
      padding: 3,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(148,163,184,0.14)',
    },
    togglePill: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    togglePillActive: {
      backgroundColor: colors.primary,
    },
    toggleText: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '800',
    },
    toggleTextActive: {
      color: '#ffffff',
    },
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    navBtn: {
      width: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navChevron: {
      color: colors.subtext,
      fontSize: 18,
      fontWeight: '800',
      lineHeight: 20,
    },
    navTitle: {
      color: colors.text,
      fontSize: 12.5,
      fontWeight: '800',
      minWidth: 92,
      textAlign: 'center',
    },
    weekdays: {
      flexDirection: 'row',
    },
    weekday: {
      flex: 1,
      textAlign: 'center',
      color: colors.subtext,
      fontSize: 10.5,
      fontWeight: '800',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cell: {
      width: `${100 / 7}%`,
      alignItems: 'center',
      paddingVertical: 3,
    },
    dayWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayWrapToday: {
      backgroundColor: colors.primary,
    },
    dayText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    dayTextMuted: {
      color: colors.subtext,
      opacity: 0.5,
    },
    dayTextToday: {
      color: '#ffffff',
      fontWeight: '800',
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      marginTop: 2,
      backgroundColor: 'transparent',
    },
    dotOn: {
      backgroundColor: colors.primary,
    },
  });
