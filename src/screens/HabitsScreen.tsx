import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { SectionCard } from '@/components/SectionCard';
import { HabitChallenge, HabitEntry, HabitReminderMode } from '@/types/app';
import { ThemeColors, useThemeColors } from '@/theme/theme';

// Reward medals: a week of streak earns a gold medal; every 4 of them (a month)
// are exchanged for a trophy. Derived from the current streak so it reflects momentum.
function habitMedalTally(streak: number) {
  const weeks = Math.floor(streak / 7);
  const trophies = Math.floor(weeks / 4);
  const medals = weeks % 4;
  const daysToNext = streak % 7 === 0 ? 7 : 7 - (streak % 7);
  return { weeks, trophies, medals, daysToNext };
}

// A small gold medal (disc + red ribbon) or a gold trophy, drawn to resemble a real award.
function HabitMedal({ tier, size = 24 }: { tier: 'week' | 'month'; size?: number }) {
  const gradId = `medalGold-${tier}`;
  if (tier === 'month') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fbe08a" />
            <Stop offset="0.5" stopColor="#e9b830" />
            <Stop offset="1" stopColor="#c8901a" />
          </LinearGradient>
        </Defs>
        {/* cup */}
        <Path d="M7 3.5h10v3.2a5 5 0 0 1-10 0V3.5z" fill={`url(#${gradId})`} stroke="#a9760f" strokeWidth="0.6" />
        {/* handles */}
        <Path d="M7 4.4H4.3v1.6A2.7 2.7 0 0 0 7 8.7" fill="none" stroke="#cf9a1e" strokeWidth="1.2" />
        <Path d="M17 4.4h2.7v1.6A2.7 2.7 0 0 1 17 8.7" fill="none" stroke="#cf9a1e" strokeWidth="1.2" />
        {/* stem + base */}
        <Rect x="11" y="11.4" width="2" height="4.2" fill="#cf9a1e" />
        <Path d="M7.5 20.5h9l-1.4-4h-6.2z" fill={`url(#${gradId})`} stroke="#a9760f" strokeWidth="0.6" />
        <Rect x="6.5" y="20.2" width="11" height="1.8" rx="0.9" fill="#cf9a1e" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size * 1.28} viewBox="0 0 24 30">
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fbe08a" />
          <Stop offset="0.5" stopColor="#eebb34" />
          <Stop offset="1" stopColor="#c8901a" />
        </LinearGradient>
      </Defs>
      {/* ribbons */}
      <Path d="M7 14h4.2v13.5L9 25.4 6.8 27.5V14z" fill="#d1283a" stroke="#a71d2c" strokeWidth="0.5" />
      <Path d="M12.8 14H17v13.5l-2.2-2.1-2.2 2.1V14z" fill="#e23b4c" stroke="#a71d2c" strokeWidth="0.5" />
      {/* disc */}
      <Circle cx="12" cy="10.5" r="9" fill={`url(#${gradId})`} stroke="#a9760f" strokeWidth="0.7" />
      <Circle cx="12" cy="10.5" r="6.2" fill="none" stroke="#b9861a" strokeWidth="1" opacity="0.65" />
      <Circle cx="9.4" cy="7.8" r="2" fill="#fff3cf" opacity="0.6" />
    </Svg>
  );
}

type Props = {
  habits: HabitEntry[];
  onHabitsChange: Dispatch<SetStateAction<HabitEntry[]>>;
  challenges: HabitChallenge[];
  habitRemindersEnabled: boolean;
  quickActionRequest?: { type: 'create-habit'; token: number } | null;
};

// Local date key (YYYY-MM-DD) — must match App's getTodayKey so the daily reset lines up.
function habitDayKey(offset = 0): string {
  const n = new Date();
  n.setDate(n.getDate() + offset);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}
function habitTodayKey(): string {
  return habitDayKey(0);
}
// Continue the streak if the last tick was yesterday, else restart at 1; revert on un-tick.
function nextHabitStreak(habit: HabitEntry, completing: boolean): number {
  if (!completing) return Math.max(0, habit.streak - 1);
  return habit.completedDate === habitDayKey(-1) ? habit.streak + 1 : 1;
}

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

export function HabitsScreen({ habits, onHabitsChange, challenges, habitRemindersEnabled, quickActionRequest }: Props) {
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
  const [draftStreak, setDraftStreak] = useState('0');

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
    setDraftStreak(String(habit.streak || 0));
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
    setDraftStreak('0');
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

  useEffect(() => {
    if (!quickActionRequest || quickActionRequest.type !== 'create-habit') return;
    openCreateHabit();
  }, [quickActionRequest]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard title="Habits">
        <View style={styles.sectionTopRow}>
          <Text style={styles.emptyText}>
            {activeHabits.length === 0 ? 'Add your first habit here. You no longer need to go into Settings.' : 'Tap a habit to mark it done or edit it from the menu.'}
          </Text>
          <Pressable style={styles.addHabitBtn} onPress={openCreateHabit}>
            <Text style={styles.addHabitBtnText}>+ Add habit</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={312}
          decelerationRate="fast"
          contentContainerStyle={styles.boardsRow}
        >
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
                            completedDate: !item.completedToday ? habitTodayKey() : undefined,
                            streak: nextHabitStreak(item, !item.completedToday),
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

                {(() => {
                  const tally = habitMedalTally(habit.streak);
                  return (
                    <View style={styles.medalStrip}>
                      {Array.from({ length: tally.trophies }).map((_, i) => (
                        <HabitMedal key={`t-${i}`} tier="month" size={26} />
                      ))}
                      {Array.from({ length: tally.medals }).map((_, i) => (
                        <HabitMedal key={`m-${i}`} tier="week" size={22} />
                      ))}
                      {tally.weeks === 0 ? (
                        <>
                          <View style={styles.medalGhost} />
                          <Text style={styles.medalHint}>{tally.daysToNext}d to first medal</Text>
                        </>
                      ) : (
                        <Text style={styles.medalHint}>{tally.daysToNext}d to next</Text>
                      )}
                    </View>
                  );
                })()}

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
        </ScrollView>
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

            {!creatingHabit ? (
              <>
                <Text style={styles.modalLabel}>Current streak (days)</Text>
                <TextInput
                  placeholder="0"
                  value={draftStreak}
                  onChangeText={(t) => setDraftStreak(t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  style={styles.input}
                />
                <Text style={styles.streakHint}>Set the days you've already kept this up. Today's tick continues from here.</Text>
              </>
            ) : null}

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
                  const streakNum = Math.max(0, parseInt(draftStreak, 10) || 0);
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
                            // Manually setting the streak dates it to "through yesterday" so today's
                            // tick continues (streak+1), and today shows as not-yet-done.
                            ...(streakNum !== item.streak
                              ? { streak: streakNum, completedDate: streakNum > 0 ? habitDayKey(-1) : undefined, completedToday: false }
                              : {}),
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
    boardsRow: {
      flexDirection: 'row',
      gap: 12,
      paddingBottom: 6,
      paddingRight: 4,
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
      width: 300,
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
    medalStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 3,
      minHeight: 30,
      marginTop: 2,
    },
    medalGhost: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    medalHint: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '600',
      marginLeft: 4,
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
      alignItems: 'center',
      padding: 20,
    },
    modalCard: {
      borderRadius: 24,
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
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
    streakHint: {
      color: colors.subtext,
      fontSize: 11.5,
      lineHeight: 16,
      marginTop: -4,
      marginBottom: 4,
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
