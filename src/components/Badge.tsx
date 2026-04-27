import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeColors, useThemeColors } from '@/theme/theme';

type Tone = 'neutral' | 'urgent' | 'non_urgent' | 'done' | 'info';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const toneStyles = useMemo(() => createToneStyles(colors), [colors]);

  return (
    <View style={[styles.badge, toneStyles[tone]]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const createStyles = (_colors: ThemeColors) =>
  StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  });

const createToneStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  neutral: { backgroundColor: '#64748b' },
  urgent: { backgroundColor: colors.urgent },
  non_urgent: { backgroundColor: colors.nonUrgent },
  done: { backgroundColor: colors.done },
  info: { backgroundColor: colors.primary },
  });
