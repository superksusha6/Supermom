import { useEffect, useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ThemeColors, useThemeColors } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

// A horizontal, side-scrolling week strip for Home. Shows ~7 days at a time and
// swipes left/right through weeks. Today is highlighted; days with events get a
// dot. Tapping a day calls onOpenDay so Home can open the full calendar.
type Props = {
  eventColors: Map<string, string[]>; // 'YYYY-MM-DD' -> event colors
  today: string; // 'YYYY-MM-DD'
  onOpenDay: (dateKey: string) => void;
};

const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const BACK_DAYS = 21; // how far back the strip starts
const FWD_DAYS = 63; // how far forward it runs

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

  // Start the strip on a Monday so weekday columns stay tidy.
  const start = useMemo(() => mondayOf(addDays(parseKey(today), -BACK_DAYS)), [today]);
  const days = useMemo(() => {
    const total = BACK_DAYS + FWD_DAYS;
    return Array.from({ length: total }, (_, i) => {
      const d = addDays(start, i);
      return { key: toKey(d), day: d.getDate(), wd: WD[(d.getDay() + 6) % 7], date: d };
    });
  }, [start]);
  const todayIndex = useMemo(() => days.findIndex((d) => d.key === today), [days, today]);

  const [label, setLabel] = useState('');
  useEffect(() => {
    const d = parseKey(today);
    setLabel(d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  }, [today]);

  const scrollToIndex = (index: number, animated: boolean) => {
    if (!scrollRef.current || cell <= 0) return;
    scrollRef.current.scrollTo({ x: Math.max(0, index * cell), animated });
  };

  // Snap to the Monday of the current week once we know the width. Since the
  // strip starts on a Monday, week starts are exact multiples of 7 cells.
  const weekStartIndex = todayIndex >= 0 ? todayIndex - (todayIndex % 7) : 0;
  useEffect(() => {
    if (width > 0) scrollToIndex(weekStartIndex, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (cell <= 0) return;
    const leftIndex = Math.round(e.nativeEvent.contentOffset.x / cell);
    const d = days[Math.min(days.length - 1, Math.max(0, leftIndex))]?.date;
    if (d) setLabel(d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
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
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={cell * 7}
            snapToAlignment="start"
            disableIntervalMomentum
            scrollEventThrottle={16}
            onScroll={onScroll}
          >
            {days.map((d) => {
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
    nav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    navBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    chevron: { color: colors.subtext, fontSize: 19, fontWeight: '800', lineHeight: 21 },
    todayBtn: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: 'rgba(148,163,184,0.16)' },
    todayText: { color: colors.subtext, fontSize: 11, fontWeight: '800' },
    stripWrap: { overflow: 'hidden' },
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
