import { PropsWithChildren, ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ThemeColors, useThemeColors } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

// The one repeatable FamOs card: optional icon + title, muted description,
// content, and an optional single-primary footer action. Reused everywhere so
// the app reads as one system (Vercel discipline) in a warm glass skin.
type Props = PropsWithChildren<{
  title?: string;
  description?: string;
  icon?: ReactNode; // small leading glyph next to the title
  headerRight?: ReactNode; // e.g. a count or a chevron
  accent?: string; // tint for a status card (border + faint fill)
  onPress?: () => void;
  accessibilityLabel?: string;
  padded?: boolean; // set false for list cards that render their own row padding
}>;

export function FamCard({
  title,
  description,
  icon,
  headerRight,
  accent,
  onPress,
  accessibilityLabel,
  padded = true,
  children,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const cardStyle = [
    styles.card,
    padded ? styles.cardPadded : styles.cardFlush,
    accent ? { borderColor: withAlpha(accent, 0.4), backgroundColor: withAlpha(accent, 0.06) } : null,
  ];

  const inner = (
    <>
      {title || icon || headerRight ? (
        <View style={[styles.header, padded ? null : styles.headerFlush]}>
          {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
          <Text style={styles.title}>{title}</Text>
          {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
        </View>
      ) : null}
      {description ? <Text style={[styles.description, padded ? null : styles.descriptionFlush]}>{description}</Text> : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={cardStyle} onPress={onPress}>
        {inner}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{inner}</View>;
}

// A single primary action for a card footer — the one "do it" per card.
export function FamCardAction({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} style={styles.action} onPress={onPress}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.lg,
      backgroundColor: colors.glassSoft,
      borderWidth: 1,
      borderColor: colors.border,
      // Soft elevation so cards visibly float above the aurora (depth).
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
    },
    cardPadded: {
      paddingHorizontal: space.lg,
      paddingVertical: space.lg,
      gap: space.sm,
    },
    cardFlush: {
      paddingVertical: space.xs,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
    },
    headerFlush: {
      paddingHorizontal: space.lg,
      paddingTop: space.md,
      paddingBottom: space.xs,
    },
    iconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    headerRight: {
      alignItems: 'flex-end',
    },
    description: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
    },
    descriptionFlush: {
      paddingHorizontal: space.lg,
    },
    action: {
      alignSelf: 'flex-start',
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      paddingHorizontal: space.lg,
      paddingVertical: 11,
      minHeight: 44,
      justifyContent: 'center',
    },
    actionText: {
      color: '#ffffff',
      fontSize: 13.5,
      fontWeight: '800',
    },
  });
