import { useEffect, useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ThemeColors, useThemeColors } from '@/theme/theme';

// iOS-style drum time picker (variant A). Two scroll wheels (hour · minute) + an
// AM/PM toggle. Value is a "H:MM AM/PM" string so it drops straight into the existing
// event time fields. Minutes step by 5.
const ITEM_H = 38;
const VISIBLE = 5; // odd so there's a clear centre row
const COL_H = ITEM_H * VISIBLE;
const PAD = (COL_H - ITEM_H) / 2;

function parse(value: string): { h12: number; min: number; ap: 'AM' | 'PM' } {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((value || '').trim());
  const h = m ? parseInt(m[1], 10) : 12;
  return {
    h12: ((h + 11) % 12) + 1, // 1..12
    min: m ? Math.round(parseInt(m[2], 10) / 5) * 5 % 60 : 0,
    ap: (m && m[3].toUpperCase() === 'AM' ? 'AM' : 'PM') as 'AM' | 'PM',
  };
}

function Wheel({
  items,
  index,
  onIndex,
  colors,
}: {
  items: string[];
  index: number;
  onIndex: (i: number) => void;
  colors: ThemeColors;
}) {
  const ref = useRef<ScrollView>(null);
  const [live, setLive] = useState(index);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Jump to the incoming index without animation on mount / external change.
    const id = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM_H, animated: false }), 0);
    setLive(index);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setLive(Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H))));
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const i = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
      ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
      onIndex(i);
    }, 110);
  };

  const styles = wheelStyles(colors);
  return (
    <ScrollView
      ref={ref}
      style={styles.col}
      contentContainerStyle={{ paddingVertical: PAD }}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={onScroll}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
    >
      {items.map((it, i) => (
        <Pressable
          key={it}
          style={styles.item}
          onPress={() => {
            ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
            setLive(i);
            onIndex(i);
          }}
        >
          <Text style={[styles.itemText, i === live && styles.itemTextSel]}>{it}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function WheelTimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const colors = useThemeColors();
  const styles = wheelStyles(colors);
  const { h12, min, ap } = parse(value);

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1)), []);
  const mins = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')), []);

  const emit = (nh: number, nm: number, nap: 'AM' | 'PM') => onChange(`${nh}:${String(nm).padStart(2, '0')} ${nap}`);

  return (
    <View style={styles.wrap}>
      <View style={styles.wheels}>
        <View style={styles.band} pointerEvents="none" />
        <Wheel items={hours} index={h12 - 1} onIndex={(i) => emit(i + 1, min, ap)} colors={colors} />
        <Text style={styles.colon}>:</Text>
        <Wheel items={mins} index={min / 5} onIndex={(i) => emit(h12, i * 5, ap)} colors={colors} />
      </View>
      <View style={styles.apCol}>
        {(['AM', 'PM'] as const).map((p) => (
          <Pressable key={p} style={[styles.apPill, ap === p && styles.apPillOn]} onPress={() => emit(h12, min, p)}>
            <Text style={[styles.apText, ap === p && styles.apTextOn]}>{p}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const wheelStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    wheels: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      paddingHorizontal: 10,
      position: 'relative',
    },
    band: {
      position: 'absolute',
      left: 6,
      right: 6,
      top: COL_H / 2 - ITEM_H / 2,
      height: ITEM_H,
      borderRadius: 9,
      backgroundColor: colors.selection,
    },
    col: { height: COL_H, width: 52 },
    item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
    itemText: { fontSize: 20, fontWeight: '700', color: colors.subtext, fontVariant: ['tabular-nums'] },
    itemTextSel: { color: colors.text, fontWeight: '900' },
    colon: { fontSize: 22, fontWeight: '900', color: colors.text, paddingHorizontal: 2 },
    apCol: { gap: 8 },
    apPill: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    apPillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    apText: { fontSize: 14, fontWeight: '800', color: colors.text },
    apTextOn: { color: '#fff' },
  });
