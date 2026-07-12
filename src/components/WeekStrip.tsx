import { useEffect, useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ThemeColors, useThemeColors } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

// A horizontal, side-scrolling week strip for Home. The scroll content is built
// as full-width WEEK PAGES (each exactly Mon–Sun), so paging snaps one whole week
// at a time, always landing on a Monday. Today is highlighted; days with events
// get a dot. Tapping a day calls onOpenDay to open the full calendar.
type Props = {
  eventColors: Map<string, string[]>; // 'YYYY-MM-DD' -> event colors
  today: string; // 'YYYY-MM-DD'
  onOpenDay: (dateKey: string) => void;
};

const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKS_BACK = 3;
const WEEKS_FWD = 9;

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

export function WeekStrip({ eventColors, today, onOpenDay }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView | null>(null);
  const [width, setWidth] = useState(0);
  const cell = width > 0 ? width / 7 : 48;

  const weeks = useMemo(() => {
    const firstMonday = mondayOf(addDays(parseKey(today), -WEEKS_BACK * 7));
    return Array.from({ length: WEEKS_BACK + WEEKS_FWD }, (_, w) => {
      const monday = addDays(firstMonday, w * 7);
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(monday, i);
        return { key: toKey(d), day: d.getDate(), wd: WD[i], date: d };
      });
      return { key: toKey(monday), monday, days };
    });
  }, [today]);
  const currentWeek = WEEKS_BACK; // by construction, today is in this page

  const [label, setLabel] = useState('');
  useEffect(() => {
    const d = parseKey(today);
    setLabel(d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  }, [today]);

  // Land on the current week once we know the width.
  useEffect(() => {
    if (width > 0 && scrollRef.current) scrollRef.current.scrollTo({ x: currentWeek * width, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    const wk = weeks[Math.min(weeks.length - 1, Math.max(0, page))];
    // Label from the Thursday of the visible week so it reads the dominant month.
    if (wk) setLabel(addDays(wk.monday, 3).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{label}</Text>
      </View>

      <View style={styles.stripWrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={width}
            snapToAlignment="start"
            disableIntervalMomentum
            scrollEventThrottle={16}
            onScroll={onScroll}
          >
            {weeks.map((wk) => (
              <View key={wk.key} style={[styles.weekPage, { width }]}>
                {wk.days.map((d) => {
                  const isToday = d.key === today;
                  const dots = eventColors.get(d.key) || [];
                  return (
                    <Pressable
                      key={d.key}
                      accessibilityRole="button"
                      accessibilityLabel={d.key + (dots.length ? ', has events' : '')}
                      style={[styles.cell, { width: cell }]}
                      onPress={() => onOpenDay(d.key)}
                    >
                      <Text style={styles.wd}>{d.wd}</Text>
                      <View style={[styles.dayWrap, isToday && styles.dayWrapToday]}>
                        <Text style={[styles.dayText, isToday && styles.dayTextToday]}>{d.day}</Text>
                      </View>
                      <View style={styles.dotsRow}>
                        {dots.slice(0, 3).map((c, i) => (
                          <View key={i} style={[styles.dot, { backgroundColor: c }, isToday && styles.dotToday]} />
                        ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        ) : null}
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: { color: colors.text, fontSize: 14, fontWeight: '800' },
    stripWrap: { overflow: 'hidden' },
    weekPage: { flexDirection: 'row' },
    cell: { alignItems: 'center', paddingVertical: 2, gap: 3 },
    wd: { fontSize: 10, fontWeight: '800', color: colors.subtext },
    dayWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    dayWrapToday: { backgroundColor: colors.primary },
    dayText: { color: colors.text, fontSize: 13.5, fontWeight: '700' },
    dayTextToday: { color: '#ffffff', fontWeight: '800' },
    dotsRow: { flexDirection: 'row', gap: 2, height: 6, alignItems: 'center' },
    dot: { width: 5, height: 5, borderRadius: 3 },
    dotToday: { backgroundColor: '#ffffff' },
  });
