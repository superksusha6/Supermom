import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ThemeColors, useThemeColors } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

// A compact month calendar for Home — a shrunk version of the real Calendar tab:
// full month grid, today filled, colored event dots per day (per-event colors,
// matching the Calendar screen). No cycle data (privacy stays on Calendar → My).
// Tapping a day calls onOpenDay so Home can jump to the full calendar.
type Props = {
  eventColors: Map<string, string[]>; // 'YYYY-MM-DD' -> event colors for that day
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

export function MiniCalendar({ eventColors, today, onOpenDay }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [offset, setOffset] = useState(0); // months from the current one

  const { cells, title } = useMemo(() => {
    const base = parseKey(today);
    const first = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    const gridStart = mondayOf(first);
    let days = Array.from({ length: 42 }, (_, i) => {
      const d = addDays(gridStart, i);
      return { key: toKey(d), day: d.getDate(), inMonth: d.getMonth() === first.getMonth() };
    });
    // Trim a trailing week that is entirely in the next month.
    if (days.slice(35).every((c) => !c.inMonth)) days = days.slice(0, 35);
    return { cells: days, title: first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
  }, [offset, today]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.monthTitle}>{title}</Text>
        <View style={styles.nav}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={8} style={styles.navBtn} onPress={() => setOffset((o) => o - 1)}>
            <Text style={styles.navChevron}>‹</Text>
          </Pressable>
          {offset !== 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="This month" hitSlop={8} style={styles.todayBtn} onPress={() => setOffset(0)}>
              <Text style={styles.todayBtnText}>Today</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8} style={styles.navBtn} onPress={() => setOffset((o) => o + 1)}>
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
          const dots = eventColors.get(c.key) || [];
          return (
            <Pressable
              key={c.key}
              accessibilityRole="button"
              accessibilityLabel={c.key + (dots.length ? ', has events' : '')}
              style={styles.cell}
              onPress={() => onOpenDay(c.key)}
            >
              <View style={[styles.dayWrap, isToday && styles.dayWrapToday]}>
                <Text style={[styles.dayText, !c.inMonth && styles.dayTextMuted, isToday && styles.dayTextToday]}>{c.day}</Text>
              </View>
              <View style={styles.dotsRow}>
                {dots.slice(0, 3).map((color, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: color }]} />
                ))}
              </View>
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
    monthTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    navBtn: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navChevron: {
      color: colors.subtext,
      fontSize: 19,
      fontWeight: '800',
      lineHeight: 21,
    },
    todayBtn: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(148,163,184,0.16)',
    },
    todayBtnText: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '800',
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
      opacity: 0.45,
    },
    dayTextToday: {
      color: '#ffffff',
      fontWeight: '800',
    },
    dotsRow: {
      flexDirection: 'row',
      gap: 2,
      height: 6,
      marginTop: 2,
      alignItems: 'center',
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
  });
