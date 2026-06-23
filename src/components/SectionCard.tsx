import { PropsWithChildren, ReactNode, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ThemeColors, useThemeColors } from '@/theme/theme';

type Props = PropsWithChildren<{ title: string }>;

type CardProps = PropsWithChildren<{ title: string; borderless?: boolean; headerRight?: ReactNode }>;

export function SectionCard({ title, children, borderless = false, headerRight }: CardProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const isMobile = width < 760;
  const styles = useMemo(() => createStyles(colors, isMobile), [colors, isMobile]);

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

const createStyles = (colors: ThemeColors, isMobile: boolean) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: isMobile ? 15 : 18,
    padding: isMobile ? 11 : 14,
    marginBottom: isMobile ? 10 : 12,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: isMobile ? 12 : 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: isMobile ? 7 : 10,
  },
  cardBorderless: {
    borderWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: isMobile ? 8 : 10,
    gap: isMobile ? 8 : 12,
  },
  title: {
    fontSize: isMobile ? 15 : 16,
    fontWeight: '700',
    color: colors.text,
  },
  });
