import { PropsWithChildren, ReactNode, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeColors, useThemeColors } from '@/theme/theme';

type Props = PropsWithChildren<{ title: string }>;

type CardProps = PropsWithChildren<{ title: string; borderless?: boolean; headerRight?: ReactNode }>;

export function SectionCard({ title, children, borderless = false, headerRight }: CardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.card, borderless && styles.cardBorderless]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {headerRight}
      </View>
      {children}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  cardBorderless: {
    borderWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  });
