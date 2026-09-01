import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ColorWheel, shadeHex } from '@/components/ColorWheel';
import { HabitEntry } from '@/types/app';
import { useThemeColors, ThemeColors } from '@/theme/theme';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const EMOJI_CHOICES = ['💊', '📖', '🏃', '💧', '🧘', '😴', '🥗', '🚶', '🌿', '🧴', '📝', '🦷'];

const PRESET_COLORS = [
  '#3345e6', // Luminous Blue 2027
  '#e8836b', // coral
  '#8b78c9', // lavender
  '#3fb2a8', // teal
  '#c67b4e', // terracotta
  '#6aae8e', // sage
  '#3fbf7f', // green
  '#e06b93', // rose
  '#e0a12e', // amber
];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function keyFor(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

type Props = {
  habits: HabitEntry[];
  onHabitsChange: Dispatch<SetStateAction<HabitEntry[]>>;
  onDeleteHabit?: (id: string) => void;
  habitColor: string;
  onHabitColorChange: (hex: string) => void;
};

export function HabitsMonthScreen({ habits, onHabitsChange, onDeleteHabit, habitColor, onHabitColorChange }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const todayKey = dateKey(now);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [barW, setBarW] = useState(0);
  const [colorOpen, setColorOpen] = useState(false);
  const [draftColor, setDraftColor] = useState(habitColor);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('💊');

  const active = habits.filter((h) => h.enabled !== false);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first blanks
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const elapsed = isCurrentMonth ? now.getDate() : daysInMonth;
  const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());

  const doneOn = (h: HabitEntry, key: string) => !!(h.completions && h.completions[key]);

  const stats = (h: HabitEntry) => {
    let done = 0;
    let best = 0;
    let run = 0;
    for (let d = 1; d <= elapsed; d++) {
      const k = keyFor(year, month, d);
      if (doneOn(h, k)) {
        done += 1;
        run += 1;
        if (run > best) best = run;
      } else run = 0;
    }
    const pct = elapsed > 0 ? Math.round((done / elapsed) * 100) : 0;
    return { done, best, pct };
  };

  const overall = useMemo(() => {
    if (active.length === 0 || elapsed === 0) return 0;
    let done = 0;
    active.forEach((h) => {
      for (let d = 1; d <= elapsed; d++) if (doneOn(h, keyFor(year, month, d))) done += 1;
    });
    return Math.round((done / (elapsed * active.length)) * 100);
  }, [active, elapsed, year, month]);

  const toggleDay = (habitId: string, key: string) => {
    // no marking the future
    if (key > todayKey) return;
    onHabitsChange((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const map = { ...(h.completions || {}) };
        if (map[key]) delete map[key];
        else map[key] = true;
        const next: HabitEntry = { ...h, completions: map };
        // keep the Home card's "today" state in sync when toggling today
        if (key === todayKey) {
          next.completedToday = !!map[key];
          next.completedDate = map[key] ? todayKey : h.completedDate;
        }
        return next;
      }),
    );
  };

  const addHabit = () => {
    const name = newName.trim();
    if (!name) return;
    const id = `h-${Date.now()}`;
    onHabitsChange((prev) => [
      ...prev,
      {
        id,
        title: name,
        icon: newEmoji,
        color: habitColor,
        targetText: '',
        enabled: true,
        markStyle: 'circle',
        completedToday: false,
        streak: 0,
        completions: {},
      },
    ]);
    setNewName('');
    setNewEmoji('💊');
    setAddOpen(false);
  };

  const removeHabit = (id: string) => {
    onHabitsChange((prev) => prev.filter((h) => h.id !== id));
    onDeleteHabit?.(id);
    if (expanded === id) setExpanded(null);
  };

  const stepMonth = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    // don't wander into future months
    if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth())) return;
    setMonth(m);
    setYear(y);
    setExpanded(null);
  };

  const accent = habitColor || '#3345e6';
  const accentDeep = shadeHex(accent, -0.18);

  // conic-gradient ring (web) — no SVG dependency
  const ring = (size: number, pct: number, big?: boolean) => {
    const inner = size - (big ? 14 : 9);
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        // @ts-ignore web-only conic gradient
        backgroundImage: `conic-gradient(${accent} ${pct * 3.6}deg, ${colors.surfaceAlt} 0deg)` }}>
        <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[big ? styles.ringBig : styles.ringSmall, { color: colors.text }]}>{pct}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topbar}>
        <View style={styles.monthNav}>
          <Pressable onPress={() => stepMonth(-1)} hitSlop={8}><Text style={styles.chev}>‹</Text></Pressable>
          <Text style={styles.monthLabel}>{MONTHS_RU[month]} {year}</Text>
          <Pressable onPress={() => stepMonth(1)} hitSlop={8}><Text style={styles.chev}>›</Text></Pressable>
        </View>
        <Pressable style={styles.colorBtn} onPress={() => { setDraftColor(habitColor); setColorOpen(true); }}>
          <View style={[styles.colorDot, { backgroundColor: accent }]} />
          <Text style={styles.colorBtnText}>Цвет</Text>
        </Pressable>
      </View>

      {/* hero */}
      <View style={styles.hero}>
        {ring(96, isFuture ? 0 : overall, true)}
        <View style={styles.heroInfo}>
          <Text style={styles.heroTitle}>{active.length === 0 ? 'Добавь привычку' : 'Твой месяц'}</Text>
          <Text style={styles.heroSub}>
            {active.length === 0 ? 'и отмечай дни' : `${overall}% дней · ${active.length} ${active.length === 1 ? 'привычка' : 'привычки'}`}
          </Text>
        </View>
        <Pressable style={[styles.addBtn, { backgroundColor: accent }]} onPress={() => setAddOpen(true)}>
          <Text style={styles.addBtnText}>＋</Text>
        </Pressable>
      </View>

      {active.length > 0 ? <Text style={styles.sectionLabel}>В этом месяце</Text> : null}

      {active.map((h) => {
        const st = stats(h);
        const open = expanded === h.id;
        return (
          <View key={h.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Pressable onPress={() => setExpanded(open ? null : h.id)}>{ring(40, st.pct)}</Pressable>
              <View style={styles.cardMain}>
                <Pressable style={styles.cardName} onPress={() => setExpanded(open ? null : h.id)}>
                  <Text style={styles.emoji}>{h.icon || '•'}</Text>
                  <Text style={styles.name} numberOfLines={1}>{h.title}</Text>
                  <Text style={styles.pctLabel}>{st.pct}%</Text>
                  <Text style={[styles.chevDown, open && styles.chevUp]}>⌄</Text>
                </Pressable>
                {/* month bar — tap anywhere on the strip to mark the day under the finger */}
                <Pressable
                  style={styles.bar}
                  onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
                  onPress={(e) => {
                    const ne = e.nativeEvent as any;
                    const w = barW || ne.target?.offsetWidth || 1;
                    const x = ne.locationX ?? ne.offsetX ?? 0;
                    const idx = Math.min(daysInMonth - 1, Math.max(0, Math.floor((x / w) * daysInMonth)));
                    const k = keyFor(year, month, idx + 1);
                    if (k > todayKey) return; // can't mark the future
                    toggleDay(h.id, k);
                  }}
                >
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const k = keyFor(year, month, day);
                    const future = k > todayKey;
                    const done = doneOn(h, k);
                    const isToday = k === todayKey;
                    return (
                      <View
                        key={day}
                        pointerEvents="none"
                        style={[
                          styles.seg,
                          { backgroundColor: done ? accent : colors.surfaceAlt },
                          done ? null : { opacity: future ? 0.5 : 1 },
                          isToday ? { borderWidth: 1.4, borderColor: accent } : null,
                        ]}
                      />
                    );
                  })}
                </Pressable>
                <Text style={styles.best}>Лучшее: <Text style={{ color: accentDeep, fontWeight: '700' }}>{st.best} подряд</Text> 🌟</Text>
              </View>
            </View>

            {open ? (
              <View style={styles.cal}>
                <Text style={styles.calHint}>Нажми на день, чтобы отметить</Text>
                <View style={styles.dow}>{WEEKDAYS.map((w) => <Text key={w} style={styles.dowText}>{w}</Text>)}</View>
                <View style={styles.grid}>
                  {Array.from({ length: firstOffset }, (_, i) => <View key={`b${i}`} style={styles.cell} />)}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const k = keyFor(year, month, day);
                    const future = k > todayKey;
                    const done = doneOn(h, k);
                    const isToday = k === todayKey;
                    return (
                      <Pressable
                        key={day}
                        style={[
                          styles.cell,
                          styles.dayCell,
                          done ? { backgroundColor: accent } : { backgroundColor: colors.surfaceAlt },
                          future ? { opacity: 0.45 } : null,
                          isToday ? { borderWidth: 2, borderColor: accent } : null,
                        ]}
                        disabled={future}
                        onPress={() => toggleDay(h.id, k)}
                      >
                        <Text style={[styles.dayText, done ? { color: '#fff' } : { color: colors.subtext }]}>{day}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable style={styles.removeRow} onPress={() => removeHabit(h.id)}>
                  <Text style={styles.removeText}>Удалить привычку</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}

      <Text style={styles.reassure}>Пропуски — не провалы, просто дни. Ничего не «сгорает».</Text>

      {/* COLOR PICKER */}
      <Modal visible={colorOpen} transparent animationType="fade" onRequestClose={() => setColorOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setColorOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Цвет трекера</Text>
            <View style={styles.presetRow}>
              {PRESET_COLORS.map((c) => (
                <Pressable key={c} onPress={() => setDraftColor(c)}
                  style={[styles.presetSw, { backgroundColor: c }, draftColor.toLowerCase() === c.toLowerCase() ? styles.presetSwActive : null]} />
              ))}
            </View>
            <Text style={styles.wheelLabel}>Или выбери любой цвет на круге</Text>
            <ColorWheel value={draftColor} onChange={setDraftColor} size={210}
              colors={{ text: colors.text, subtext: colors.subtext, border: colors.border, surface: colors.surface }} />
            <View style={styles.sheetActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setColorOpen(false)}>
                <Text style={styles.cancelText}>Отмена</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, { backgroundColor: draftColor }]} onPress={() => { onHabitColorChange(draftColor); setColorOpen(false); }}>
                <Text style={styles.saveText}>Применить</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ADD HABIT */}
      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAddOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Новая привычка</Text>
            <View style={styles.emojiRow}>
              {EMOJI_CHOICES.map((em) => (
                <Pressable key={em} onPress={() => setNewEmoji(em)}
                  style={[styles.emojiPick, newEmoji === em ? { borderColor: accent, backgroundColor: colors.surfaceAlt } : null]}>
                  <Text style={styles.emojiPickText}>{em}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Название (напр. Витамины)" placeholderTextColor={colors.subtext}
              value={newName} onChangeText={setNewName} onSubmitEditing={addHabit} />
            <View style={styles.sheetActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setAddOpen(false)}>
                <Text style={styles.cancelText}>Отмена</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, { backgroundColor: accent }]} onPress={addHabit}>
                <Text style={styles.saveText}>Добавить</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { flex: 1 },
    content: { padding: 16, paddingBottom: 40 },
    topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    monthNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    chev: { fontSize: 20, fontWeight: '700', color: c.subtext },
    monthLabel: { fontSize: 16, fontWeight: '750', color: c.text, minWidth: 120, textAlign: 'center' },
    colorBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: c.surface },
    colorDot: { width: 15, height: 15, borderRadius: 8 },
    colorBtnText: { fontSize: 13, fontWeight: '700', color: c.text },

    hero: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 16, marginBottom: 18 },
    heroInfo: { flex: 1, minWidth: 0 },
    heroTitle: { fontSize: 17, fontWeight: '760', color: c.text },
    heroSub: { fontSize: 13, color: c.subtext, marginTop: 4 },
    ringBig: { fontSize: 24, fontWeight: '800' },
    ringSmall: { fontSize: 12, fontWeight: '800' },
    addBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    addBtnText: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: -2 },

    sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', color: c.subtext, marginBottom: 11, marginLeft: 3 },

    card: { borderWidth: 1, borderColor: c.border, borderRadius: 18, backgroundColor: c.surface, padding: 13, marginBottom: 11 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardMain: { flex: 1, minWidth: 0 },
    cardName: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    emoji: { fontSize: 15 },
    name: { fontSize: 14.5, fontWeight: '720', color: c.text, flexShrink: 1 },
    pctLabel: { marginLeft: 'auto', fontSize: 12, fontWeight: '640', color: c.subtext },
    chevDown: { fontSize: 13, color: c.subtext },
    chevUp: { transform: [{ rotate: '180deg' }] },
    bar: { flexDirection: 'row', gap: 1.5, marginTop: 9, height: 26 },
    seg: { flex: 1, borderRadius: 3, minWidth: 0 },
    best: { marginTop: 9, fontSize: 11.5, color: c.subtext, fontWeight: '600' },

    cal: { marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderTopColor: c.border, borderStyle: 'dashed' },
    calHint: { fontSize: 11, color: c.subtext, textAlign: 'center', marginBottom: 9 },
    dow: { flexDirection: 'row', marginBottom: 6 },
    dowText: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: c.subtext, textTransform: 'uppercase' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2.5, alignItems: 'center', justifyContent: 'center' } as any,
    dayCell: { borderRadius: 999 },
    dayText: { fontSize: 12, fontWeight: '650' },
    removeRow: { alignItems: 'center', marginTop: 12, paddingVertical: 8 },
    removeText: { color: '#be123c', fontSize: 12.5, fontWeight: '700' },

    reassure: { fontSize: 12, color: c.subtext, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },

    backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    sheet: { width: '100%', maxWidth: 360, backgroundColor: c.surface, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: c.border },
    sheetTitle: { fontSize: 17, fontWeight: '750', color: c.text, marginBottom: 14, textAlign: 'center' },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 16 },
    presetSw: { width: 34, height: 34, borderRadius: 10, borderWidth: 2, borderColor: 'transparent' },
    presetSwActive: { borderColor: c.text },
    wheelLabel: { fontSize: 12.5, color: c.subtext, textAlign: 'center', marginBottom: 14 },
    sheetActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
    cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border },
    cancelText: { color: c.text, fontWeight: '700', fontSize: 14 },
    saveBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
    saveText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
    emojiPick: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    emojiPickText: { fontSize: 19 },
    input: { borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: c.text, backgroundColor: c.surfaceAlt },
  });
}
