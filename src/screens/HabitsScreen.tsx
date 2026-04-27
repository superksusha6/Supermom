import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SectionCard } from '@/components/SectionCard';
import { HabitChallenge, HabitEntry, HabitReminderMode } from '@/types/app';
import { ThemeColors, useThemeColors } from '@/theme/theme';

type Props = {
  habits: HabitEntry[];
  onHabitsChange: Dispatch<SetStateAction<HabitEntry[]>>;
  challenges: HabitChallenge[];
  habitRemindersEnabled: boolean;
};

const HABIT_ICON_TITLE_SUGGESTIONS: Record<string, string> = {
  '💧': 'Water goal',
  '🛏️': 'Sleep routine',
  '🧘': 'Meditation',
  '🥗': 'Healthy food',
  '🚶': 'Daily walk',
  '🏋️': 'Workout',
  '🤸': 'Stretching',
  '🏃': 'Running',
  '🚴': 'Cycling',
  '📖': 'Reading',
  '📝': 'Journaling',
  '🧠': 'Mind training',
  '🎹': 'Piano practice',
  '🎯': 'Focus goal',
  '⏰': 'On-time routine',
  '💻': 'Deep work',
  '✅': 'Daily checklist',
  '🧹': 'Cleaning',
  '🧺': 'Laundry',
  '🍳': 'Home cooking',
  '🪥': 'Dental care',
  '😊': 'Good mood',
  '🙏': 'Gratitude',
  '📱': 'Screen time control',
  '❤️': 'Self love',
};

const HABIT_MEDAL_MILESTONES = [
  { days: 7, label: '7d', tone: '#f59e0b' },
  { days: 14, label: '14d', tone: '#a78bfa' },
  { days: 30, label: '30d', tone: '#22c55e' },
] as const;

const HABIT_SMART_REMINDER_TIMES: Record<string, string> = {
  '💧': '14:00',
  '🛏️': '22:00',
  '🧘': '20:30',
  '🥗': '13:00',
  '🚶': '18:00',
  '🏋️': '18:30',
  '🤸': '08:00',
  '🏃': '07:00',
  '🚴': '07:30',
  '📖': '20:30',
  '📝': '21:00',
  '🧠': '19:30',
  '🎹': '17:30',
  '🎯': '09:00',
  '⏰': '21:30',
  '💻': '10:00',
  '✅': '09:00',
  '🧹': '11:00',
  '🧺': '16:00',
  '🍳': '18:30',
  '🪥': '22:00',
  '😊': '19:00',
  '🙏': '21:00',
  '📱': '20:00',
  '❤️': '20:30',
};

export function HabitsScreen({ habits, onHabitsChange, challenges, habitRemindersEnabled }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const activeHabits = habits.filter((item) => item.enabled);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [creatingHabit, setCreatingHabit] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftTarget, setDraftTarget] = useState('');
  const [draftIcon, setDraftIcon] = useState('✨');
  const [draftMarkStyle, setDraftMarkStyle] = useState<NonNullable<HabitEntry['markStyle']>>('circle');
  const [draftReminderMode, setDraftReminderMode] = useState<HabitReminderMode>('off');
  const [draftReminderTime, setDraftReminderTime] = useState('');

  const completedCount = activeHabits.filter((item) => item.completedToday).length;
  const completionPercent = activeHabits.length ? Math.round((completedCount / activeHabits.length) * 100) : 0;
  const totalStreak = activeHabits.reduce((sum, item) => sum + item.streak, 0);
  const heroMarks = buildMarks(Math.max(1, Math.min(30, totalStreak)));
  const habitIconOptions = [
    '💧', '🛏️', '🧘', '🥗', '🚶', '🏋️', '🤸', '🏃', '🚴', '📖', '📝', '🧠', '🎹', '🎯', '⏰', '💻', '✅', '🧹', '🧺', '🍳', '🪥', '😊', '🙏', '📱', '❤️',
  ];
  const markStyleOptions: Array<{ key: NonNullable<HabitEntry['markStyle']>; label: string }> = [
    { key: 'circle', label: '●' },
    { key: 'check', label: '✓' },
    { key: 'heart', label: '♥' },
    { key: 'star', label: '★' },
    { key: 'diamond', label: '◆' },
  ];

  function openHabitEditor(habit: HabitEntry) {
    setCreatingHabit(false);
    setEditingHabitId(habit.id);
    setDraftTitle(habit.title);
    setDraftTarget(habit.targetText);
    setDraftIcon(habit.icon);
    setDraftMarkStyle(habit.markStyle || 'circle');
    setDraftReminderMode(habit.reminderMode || 'off');
    setDraftReminderTime(habit.reminderTime || getSmartReminderTime(habit.icon));
  }

  function getHabitTitleSuggestion(icon: string) {
    return HABIT_ICON_TITLE_SUGGESTIONS[icon] || 'Custom habit';
  }

  function openCreateHabit() {
    setCreatingHabit(true);
    setEditingHabitId(null);
    setDraftIcon('✨');
    setDraftTitle('Custom habit');
    setDraftTarget('');
    setDraftMarkStyle('circle');
    setDraftReminderMode('off');
    setDraftReminderTime('');
  }

  function getSmartReminderTime(icon: string) {
    return HABIT_SMART_REMINDER_TIMES[icon] || '19:00';
  }

  function getReminderSummary(habit: HabitEntry) {
    if (!habitRemindersEnabled || habit.reminderMode === 'off' || !habit.reminderMode) return 'Reminders off';
    if (habit.reminderMode === 'smart') return `Smart reminder ${habit.reminderTime || getSmartReminderTime(habit.icon)}`;
    return `Custom reminder ${habit.reminderTime || '20:00'}`;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlowLarge} />
        <View style={styles.heroGlowSmall} />
        <Text style={styles.heroEyebrow}>Habit Ritual</Text>
        <Text style={styles.heroTitle}>30 Day Reset</Text>
        <Text style={styles.heroText}>A softer tracker for consistency, small promises to yourself, and visible momentum.</Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{completedCount}</Text>
            <Text style={styles.heroStatLabel}>done today</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{completionPercent}%</Text>
            <Text style={styles.heroStatLabel}>daily score</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{totalStreak}</Text>
            <Text style={styles.heroStatLabel}>streak sum</Text>
          </View>
        </View>

        <View style={styles.heroMarksGrid}>
          {heroMarks.map((filled, index) => (
            <View key={`hero-${index}`} style={[styles.heroMark, filled && styles.heroMarkFilled]} />
          ))}
        </View>
      </View>

      <SectionCard title="30 Day Boards">
        <View style={styles.sectionTopRow}>
          <Text style={styles.emptyText}>
            {activeHabits.length === 0 ? 'Add your first habit here. You no longer need to go into Settings.' : 'Tap a habit to mark it done or edit it from the menu.'}
          </Text>
          <Pressable style={styles.addHabitBtn} onPress={openCreateHabit}>
            <Text style={styles.addHabitBtnText}>+ Add habit</Text>
          </Pressable>
        </View>
        <View style={styles.boardsGrid}>
          {activeHabits.map((habit) => {
            const marks = buildMarks(Math.min(30, habit.streak));
            return (
              <Pressable
                key={habit.id}
                style={[styles.boardCard, habit.completedToday && styles.boardCardDone]}
                onPress={() =>
                  onHabitsChange((prev) =>
                    prev.map((item) =>
                      item.id === habit.id
                        ? {
                            ...item,
                            completedToday: !item.completedToday,
                            streak: item.completedToday ? Math.max(0, item.streak - 1) : item.streak + 1,
                          }
                        : item,
                    ),
                  )
                }
              >
                <Pressable
                  style={styles.boardMenuBtn}
                  onPress={(event) => {
                    event.stopPropagation();
                    openHabitEditor(habit);
                  }}
                >
                  <View style={styles.boardMenuDots}>
                    <View style={styles.boardMenuDot} />
                    <View style={styles.boardMenuDot} />
                    <View style={styles.boardMenuDot} />
                  </View>
                </Pressable>
                <View style={styles.boardHeader}>
                  <View style={[styles.boardIconWrap, { backgroundColor: `${habit.color}16`, borderColor: `${habit.color}40` }]}>
                    <Text style={[styles.boardIcon, { color: habit.color }]}>{habit.icon}</Text>
                  </View>
                  <View style={styles.boardCopy}>
                    <Text style={styles.boardTitle}>{habit.title}</Text>
                    <Text style={styles.boardSubtitle}>{habit.targetText}</Text>
                  </View>
                </View>

                <View style={styles.boardMarksGrid}>
                  {marks.map((filled, index) => (
                    <View key={`${habit.id}-${index}`} style={styles.boardMarkWrap}>
                      {renderHabitMark({
                        filled,
                        color: habit.color,
                        markStyle: habit.markStyle || 'circle',
                        styles,
                      })}
                    </View>
                  ))}
                </View>

                <View style={styles.medalsSection}>
                  <Text style={styles.medalsLabel}>Reward medals</Text>
                  <View style={styles.medalsRow}>
                    {HABIT_MEDAL_MILESTONES.map((medal) => {
                      const earned = habit.streak >= medal.days;
                      return (
                        <View key={`${habit.id}-${medal.days}`} style={styles.medalWrap}>
                          <View style={[styles.medalRibbonLeft, { backgroundColor: earned ? medal.tone : colors.glassSoft }]} />
                          <View style={[styles.medalRibbonRight, { backgroundColor: earned ? medal.tone : colors.glassSoft }]} />
                          <View
                            style={[
                              styles.medalOuter,
                              {
                                borderColor: earned ? medal.tone : colors.border,
                                backgroundColor: earned ? `${medal.tone}18` : colors.glassSoft,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.medalInner,
                                {
                                  borderColor: earned ? medal.tone : colors.border,
                                  backgroundColor: earned ? `${habit.color}18` : colors.glassStrong,
                                },
                              ]}
                            >
                              <Text style={[styles.medalIcon, { color: earned ? habit.color : colors.subtext }]}>{habit.icon}</Text>
                            </View>
                          </View>
                          <Text style={[styles.medalCaption, earned && styles.medalCaptionEarned]}>{medal.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.boardFooter}>
                  <Text style={styles.boardFooterText}>{habit.streak} day streak</Text>
                  <View style={[styles.boardStatusPill, habit.completedToday && styles.boardStatusPillDone]}>
                  <Text style={[styles.boardStatusText, habit.completedToday && styles.boardStatusTextDone]}>
                      {habit.completedToday ? 'Done today' : 'Tap to mark'}
                    </Text>
                  </View>
                  <Text style={styles.boardReminderText}>{getReminderSummary(habit)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title="Challenges">
        <View style={styles.challengeWrap}>
          {challenges.map((challenge) => {
            const progress = challenge.progressTotal ? Math.min(challenge.progressCurrent / challenge.progressTotal, 1) : 0;
            return (
              <View key={challenge.id} style={styles.challengeCard}>
                <View style={styles.challengeStripe} />
                <View style={styles.challengeHeader}>
                  <View style={styles.challengeCopy}>
                    <Text style={styles.challengeTitle}>{challenge.title}</Text>
                    <Text style={styles.challengeSubtitle}>{challenge.subtitle}</Text>
                  </View>
                  <Text style={[styles.challengeCount, { color: challenge.accent }]}>
                    {challenge.progressCurrent}/{challenge.progressTotal}
                  </Text>
                </View>
                <View style={styles.challengeMarks}>
                  {Array.from({ length: challenge.progressTotal }).map((_, index) => (
                    <View
                      key={`${challenge.id}-${index}`}
                      style={[
                        styles.challengeMark,
                        { borderColor: `${challenge.accent}70` },
                        index < challenge.progressCurrent && { backgroundColor: challenge.accent, borderColor: challenge.accent },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.challengeBarTrack}>
                  <View style={[styles.challengeBarFill, { width: `${progress * 100}%`, backgroundColor: challenge.accent }]} />
                </View>
              </View>
            );
          })}
        </View>
      </SectionCard>

      <Modal
        visible={!!editingHabitId || creatingHabit}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setEditingHabitId(null);
          setCreatingHabit(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{creatingHabit ? 'Add habit' : 'Edit habit'}</Text>

            <Text style={styles.modalLabel}>Icon</Text>
            <View style={styles.optionGrid}>
              {habitIconOptions.map((icon) => (
                <Pressable
                  key={icon}
                  style={[styles.optionChip, draftIcon === icon && styles.optionChipActive]}
                  onPress={() => {
                    setDraftIcon(icon);
                    setDraftTitle(getHabitTitleSuggestion(icon));
                    if (draftReminderMode === 'smart') setDraftReminderTime(getSmartReminderTime(icon));
                  }}
                >
                  <Text style={styles.optionChipText}>{icon}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Habit name</Text>
            <TextInput placeholder="Habit title" value={draftTitle} onChangeText={setDraftTitle} style={styles.input} />

            <Text style={styles.modalLabel}>Target or norm</Text>
            <TextInput placeholder="Target or norm" value={draftTarget} onChangeText={setDraftTarget} style={styles.input} />

            <Text style={styles.modalLabel}>Tracker design</Text>
            <View style={styles.optionGrid}>
              {markStyleOptions.map((option) => (
                <Pressable
                  key={option.key}
                  style={[styles.optionChip, draftMarkStyle === option.key && styles.optionChipActive]}
                  onPress={() => setDraftMarkStyle(option.key)}
                >
                  <Text style={styles.optionChipText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Reminder</Text>
            <View style={styles.optionWideRow}>
              {(['off', 'smart', 'custom'] as HabitReminderMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  style={[styles.reminderModeChip, draftReminderMode === mode && styles.reminderModeChipActive]}
                  onPress={() => {
                    setDraftReminderMode(mode);
                    if (mode === 'smart') setDraftReminderTime(getSmartReminderTime(draftIcon));
                    if (mode === 'off') setDraftReminderTime('');
                  }}
                >
                  <Text style={[styles.reminderModeText, draftReminderMode === mode && styles.reminderModeTextActive]}>
                    {mode === 'off' ? 'Off' : mode === 'smart' ? 'Smart' : 'Custom'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {draftReminderMode !== 'off' ? (
              <>
                <Text style={styles.modalLabel}>{draftReminderMode === 'smart' ? 'Suggested time' : 'Custom time'}</Text>
                <TextInput
                  placeholder="20:00"
                  value={draftReminderTime}
                  onChangeText={setDraftReminderTime}
                  style={styles.input}
                  editable={draftReminderMode === 'custom'}
                />
              </>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalDeleteBtn}
                disabled={creatingHabit}
                onPress={() => {
                  if (creatingHabit) return;
                  onHabitsChange((prev) => prev.filter((item) => item.id !== editingHabitId));
                  setEditingHabitId(null);
                }}
              >
                <Text style={[styles.modalDeleteText, creatingHabit && styles.modalDeleteTextDisabled]}>Delete</Text>
              </Pressable>
              <Pressable
                style={styles.modalGhostBtn}
                onPress={() => {
                  setEditingHabitId(null);
                  setCreatingHabit(false);
                }}
              >
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalSaveBtn}
                onPress={() => {
                  if (!draftTitle.trim()) return;
                  if (creatingHabit) {
                    onHabitsChange((prev) => [
                      {
                        id: `habit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        title: draftTitle.trim(),
                        icon: draftIcon,
                        color: '#ec4899',
                        targetText: draftTarget.trim() || 'My custom goal',
                        enabled: true,
                        builtIn: false,
                        markStyle: draftMarkStyle,
                        reminderMode: draftReminderMode,
                        reminderTime:
                          draftReminderMode === 'off'
                            ? ''
                            : draftReminderMode === 'smart'
                              ? getSmartReminderTime(draftIcon)
                              : draftReminderTime.trim() || '20:00',
                        completedToday: false,
                        streak: 0,
                      },
                      ...prev,
                    ]);
                    setCreatingHabit(false);
                    return;
                  }
                  if (!editingHabitId) return;
                  onHabitsChange((prev) =>
                    prev.map((item) =>
                      item.id === editingHabitId
                        ? {
                            ...item,
                            title: draftTitle.trim(),
                            targetText: draftTarget.trim() || item.targetText,
                            icon: draftIcon,
                            markStyle: draftMarkStyle,
                            reminderMode: draftReminderMode,
                            reminderTime:
                              draftReminderMode === 'off'
                                ? ''
                                : draftReminderMode === 'smart'
                                  ? getSmartReminderTime(draftIcon)
                                  : draftReminderTime.trim() || '20:00',
                          }
                        : item,
                    ),
                  );
                  setEditingHabitId(null);
                }}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function buildMarks(filledCount: number) {
  return Array.from({ length: 30 }, (_, index) => index < filledCount);
}

function renderHabitMark({
  filled,
  color,
  markStyle,
  styles,
}: {
  filled: boolean;
  color: string;
  markStyle: NonNullable<HabitEntry['markStyle']>;
  styles: ReturnType<typeof createStyles>;
}) {
  if (markStyle === 'heart') {
    return <Text style={[styles.symbolMark, { color: filled ? color : `${color}80` }]}>{filled ? '♥' : '♡'}</Text>;
  }
  if (markStyle === 'star') {
    return <Text style={[styles.symbolMark, { color: filled ? color : `${color}80` }]}>{filled ? '★' : '☆'}</Text>;
  }
  if (markStyle === 'diamond') {
    return <Text style={[styles.symbolMark, { color: filled ? color : `${color}80` }]}>{filled ? '◆' : '◇'}</Text>;
  }
  if (markStyle === 'check') {
    return (
      <View
        style={[
          styles.checkMark,
          { borderColor: `${color}90` },
          filled && { backgroundColor: color, borderColor: color },
        ]}
      >
        {filled ? <Text style={styles.checkMarkTick}>✓</Text> : null}
      </View>
    );
  }
  return (
    <View
      style={[
        styles.circleMark,
        { borderColor: `${color}90` },
        filled && { backgroundColor: color, borderColor: color },
      ]}
    />
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      gap: 14,
      paddingBottom: 32,
    },
    heroCard: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      padding: 18,
      overflow: 'hidden',
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
    heroGlowLarge: {
      position: 'absolute',
      top: -36,
      right: -20,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(255, 146, 166, 0.18)',
    },
    heroGlowSmall: {
      position: 'absolute',
      bottom: -22,
      left: -18,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(91, 124, 255, 0.12)',
    },
    heroEyebrow: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.1,
      marginBottom: 6,
    },
    heroTitle: {
      color: colors.text,
      fontSize: 34,
      lineHeight: 38,
      fontWeight: '900',
      marginBottom: 8,
    },
    heroText: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 19,
      maxWidth: '82%',
      marginBottom: 16,
    },
    heroStatsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    heroStat: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 2,
    },
    heroStatValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    heroStatLabel: {
      color: colors.subtext,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    heroMarksGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    heroMark: {
      width: 18,
      height: 18,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.85)',
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    heroMarkFilled: {
      backgroundColor: '#ff8fab',
      borderColor: '#ff8fab',
    },
    boardsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    emptyText: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
      flex: 1,
    },
    sectionTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    addHabitBtn: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.selection,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addHabitBtnText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    boardCard: {
      width: '48.2%',
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      padding: 12,
      gap: 12,
      position: 'relative',
    },
    boardCardDone: {
      backgroundColor: colors.selection,
    },
    boardMenuBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.glassStrong,
      borderWidth: 1,
      borderColor: colors.border,
      zIndex: 2,
      shadowColor: colors.shadow,
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    boardMenuDots: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    boardMenuDot: {
      width: 4,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.text,
    },
    boardHeader: {
      gap: 8,
      paddingRight: 28,
    },
    boardIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boardIcon: {
      fontSize: 18,
    },
    boardCopy: {
      gap: 3,
    },
    boardTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    boardSubtitle: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 16,
      minHeight: 32,
    },
    boardMarksGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    boardMarkWrap: {
      width: 14,
      height: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circleMark: {
      width: 14,
      height: 14,
      borderRadius: 999,
      borderWidth: 1.4,
      backgroundColor: 'transparent',
    },
    checkMark: {
      width: 14,
      height: 14,
      borderRadius: 999,
      borderWidth: 1.4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    checkMarkTick: {
      color: '#ffffff',
      fontSize: 10,
      lineHeight: 10,
      fontWeight: '900',
    },
    symbolMark: {
      fontSize: 14,
      lineHeight: 14,
      fontWeight: '800',
    },
    boardFooter: {
      gap: 8,
    },
    medalsSection: {
      gap: 8,
    },
    medalsLabel: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    medalsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    medalWrap: {
      width: 64,
      alignItems: 'center',
      position: 'relative',
      paddingBottom: 2,
    },
    medalRibbonLeft: {
      position: 'absolute',
      bottom: 20,
      left: 14,
      width: 14,
      height: 20,
      borderBottomLeftRadius: 4,
      borderBottomRightRadius: 4,
      transform: [{ rotate: '10deg' }],
      opacity: 0.95,
    },
    medalRibbonRight: {
      position: 'absolute',
      bottom: 20,
      right: 14,
      width: 14,
      height: 20,
      borderBottomLeftRadius: 4,
      borderBottomRightRadius: 4,
      transform: [{ rotate: '-10deg' }],
      opacity: 0.95,
    },
    medalOuter: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    medalInner: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    medalIcon: {
      fontSize: 15,
    },
    medalCaption: {
      marginTop: 6,
      color: colors.subtext,
      fontSize: 10,
      fontWeight: '700',
    },
    medalCaptionEarned: {
      color: colors.text,
    },
    boardFooterText: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '700',
    },
    boardReminderText: {
      color: colors.subtext,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '600',
    },
    boardStatusPill: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    boardStatusPillDone: {
      backgroundColor: '#dcfce7',
      borderColor: '#86efac',
    },
    boardStatusText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '700',
    },
    boardStatusTextDone: {
      color: '#166534',
    },
    challengeWrap: {
      gap: 10,
    },
    challengeCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      padding: 14,
      gap: 10,
      overflow: 'hidden',
    },
    challengeStripe: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 5,
      backgroundColor: colors.primary,
    },
    challengeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 2,
    },
    challengeCopy: {
      flex: 1,
      gap: 3,
    },
    challengeTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    challengeSubtitle: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
    },
    challengeCount: {
      fontSize: 15,
      fontWeight: '800',
    },
    challengeMarks: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    challengeMark: {
      width: 13,
      height: 13,
      borderRadius: 999,
      borderWidth: 1.2,
      backgroundColor: 'transparent',
    },
    challengeBarTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.glassSoft,
      overflow: 'hidden',
    },
    challengeBarFill: {
      height: '100%',
      borderRadius: 999,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.96)',
      backgroundColor: 'rgba(248,250,252,0.97)',
      padding: 18,
      shadowColor: '#0f172a',
      shadowOpacity: 0.3,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 14,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '900',
      marginBottom: 14,
    },
    modalLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 8,
    },
    input: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.glassStrong,
      color: colors.text,
      marginBottom: 12,
    },
    optionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    optionWideRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    optionChip: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    optionChipText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    reminderModeChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    reminderModeChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    reminderModeText: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '800',
    },
    reminderModeTextActive: {
      color: colors.primary,
    },
    modalActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 6,
    },
    modalDeleteBtn: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#fecaca',
      backgroundColor: '#fff1f2',
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    modalDeleteText: {
      color: '#be123c',
      fontWeight: '800',
    },
    modalDeleteTextDisabled: {
      color: colors.subtext,
      opacity: 0.45,
    },
    modalGhostBtn: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    modalGhostText: {
      color: colors.text,
      fontWeight: '800',
    },
    modalSaveBtn: {
      borderRadius: 14,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    modalSaveText: {
      color: '#fff',
      fontWeight: '800',
    },
  });
