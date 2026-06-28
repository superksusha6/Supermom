import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Chore, ChoreRecurrence, ChoreVerifier, ChildProfile } from '@/types/app';
import { ThemeColors, useThemeColors } from '@/theme/theme';

type Props = {
  chores: Chore[];
  onChoresChange: Dispatch<SetStateAction<Chore[]>>;
  children: ChildProfile[];
};

const RECURRENCE: { key: ChoreRecurrence; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'once', label: 'One-off' },
];

const VERIFIERS: { key: ChoreVerifier; label: string }[] = [
  { key: 'none', label: 'No one' },
  { key: 'parent', label: 'Me' },
  { key: 'nanny', label: 'Nanny' },
];
function verifierLabel(v: ChoreVerifier) {
  return v === 'parent' ? 'checked by me' : v === 'nanny' ? 'checked by nanny' : '';
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function weekKey(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / 86400000 / 7);
  return `${date.getUTCFullYear()}-W${week}`;
}
// Is a stored completion date "in the current period" for this recurrence?
function inCurrentPeriod(dateStr: string | undefined, recurrence: ChoreRecurrence) {
  if (!dateStr) return false;
  if (recurrence === 'once') return true;
  if (recurrence === 'weekly') return weekKey(dateStr) === weekKey(todayKey());
  return dateStr === todayKey();
}
function derivedStatus(chore: Chore): 'todo' | 'done' | 'verified' {
  if (inCurrentPeriod(chore.lastVerifiedDate, chore.recurrence)) return 'verified';
  if (inCurrentPeriod(chore.lastDoneDate, chore.recurrence)) return 'done';
  return 'todo';
}

function newId() {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function ChoresScreen({ chores, onChoresChange, children }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Chore | null>(null);
  const [title, setTitle] = useState('');
  const [childId, setChildId] = useState<string | undefined>(undefined);
  const [recurrence, setRecurrence] = useState<ChoreRecurrence>('weekly');
  const [verifier, setVerifier] = useState<ChoreVerifier>('none');

  const groups = useMemo(() => {
    const out: { id: string | undefined; name: string; list: Chore[] }[] = [];
    for (const child of children) {
      const list = chores.filter((c) => c.childId === child.id);
      if (list.length) out.push({ id: child.id, name: child.name, list });
    }
    const anyList = chores.filter((c) => !c.childId || !children.some((ch) => ch.id === c.childId));
    if (anyList.length) out.push({ id: undefined, name: 'Anyone', list: anyList });
    return out;
  }, [chores, children]);

  function openNew() {
    setEditing(null);
    setTitle('');
    setChildId(children[0]?.id);
    setRecurrence('weekly');
    setVerifier('none');
    setFormOpen(true);
  }
  function openEdit(chore: Chore) {
    setEditing(chore);
    setTitle(chore.title);
    setChildId(chore.childId);
    setRecurrence(chore.recurrence);
    setVerifier(chore.verifier);
    setFormOpen(true);
  }
  function save() {
    if (!title.trim()) return;
    const next: Chore = {
      id: editing?.id || newId(),
      title: title.trim(),
      childId,
      recurrence,
      verifier,
      points: editing?.points || 0,
      lastDoneDate: editing?.lastDoneDate,
      lastVerifiedDate: editing?.lastVerifiedDate,
    };
    onChoresChange((prev) => (editing ? prev.map((c) => (c.id === editing.id ? next : c)) : [next, ...prev]));
    setFormOpen(false);
  }
  function remove(id: string) {
    onChoresChange((prev) => prev.filter((c) => c.id !== id));
    setFormOpen(false);
  }
  function patchChore(id: string, patch: Partial<Chore>) {
    onChoresChange((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  // Circle: not-done-this-period -> mark done today; already done -> undo for this period.
  function toggle(chore: Chore) {
    if (derivedStatus(chore) === 'todo') patchChore(chore.id, { lastDoneDate: todayKey() });
    else patchChore(chore.id, { lastDoneDate: undefined, lastVerifiedDate: undefined });
  }
  function verify(chore: Chore) {
    patchChore(chore.id, { lastVerifiedDate: todayKey() });
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>FAMILY</Text>
          <Text style={styles.title}>Chores</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>Assign chores; daily ones reset every day, weekly ones every week. Stars & pocket money come later.</Text>

      {chores.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No chores yet 🧹</Text>
          <Text style={styles.emptyText}>Tap “+ Add” to give a child a chore — like “Make the bed” or “Feed the dog”.</Text>
        </View>
      ) : (
        groups.map((g) => {
          const done = g.list.filter((c) => derivedStatus(c) !== 'todo').length;
          return (
            <View key={g.id || 'anyone'} style={styles.group}>
              <Text style={styles.groupLabel}>{g.name} · {done}/{g.list.length}</Text>
              {g.list.map((chore) => {
                const status = derivedStatus(chore);
                const completed = status !== 'todo';
                const awaitingCheck = status === 'done' && chore.verifier !== 'none';
                const checkBy = chore.verifier === 'nanny' ? 'Nanny' : 'Me';
                return (
                  <View key={chore.id} style={styles.choreCard}>
                    <Pressable style={[styles.check, completed && styles.checkOn]} onPress={() => toggle(chore)}>
                      {completed ? <Text style={styles.checkMark}>✓</Text> : null}
                    </Pressable>
                    <Pressable style={{ flex: 1 }} onPress={() => openEdit(chore)}>
                      <Text style={[styles.choreTitle, completed && styles.choreTitleDone]} numberOfLines={1}>{chore.title}</Text>
                      <Text style={styles.choreMeta}>
                        {RECURRENCE.find((r) => r.key === chore.recurrence)?.label}
                        {status === 'verified' ? ` · ✓ ${verifierLabel(chore.verifier)}` : chore.verifier !== 'none' ? ` · ${verifierLabel(chore.verifier)}` : ''}
                      </Text>
                    </Pressable>
                    {awaitingCheck ? (
                      <Pressable style={styles.verifyPill} onPress={() => verify(chore)}>
                        <Text style={styles.verifyPillText}>Verify ({checkBy})</Text>
                      </Pressable>
                    ) : status === 'verified' ? (
                      <Text style={styles.verifiedTag}>✓ checked</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          );
        })
      )}

      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <View style={styles.scrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFormOpen(false)} />
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>{editing ? 'Edit chore' : 'New chore'}</Text>

              <Text style={styles.fieldLabel}>Chore</Text>
              <TextInput placeholder="e.g. Make the bed" placeholderTextColor={colors.subtext} style={styles.input} value={title} onChangeText={setTitle} autoFocus />

              <Text style={styles.fieldLabel}>Who</Text>
              <View style={styles.chipsWrap}>
                {children.map((child) => (
                  <Pressable key={child.id} style={[styles.chip, childId === child.id && styles.chipActive]} onPress={() => setChildId(child.id)}>
                    <Text style={[styles.chipText, childId === child.id && styles.chipTextActive]}>{child.name}</Text>
                  </Pressable>
                ))}
                <Pressable style={[styles.chip, !childId && styles.chipActive]} onPress={() => setChildId(undefined)}>
                  <Text style={[styles.chipText, !childId && styles.chipTextActive]}>Anyone</Text>
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Repeat</Text>
              <View style={styles.chipsWrap}>
                {RECURRENCE.map((r) => (
                  <Pressable key={r.key} style={[styles.chip, recurrence === r.key && styles.chipActive]} onPress={() => setRecurrence(r.key)}>
                    <Text style={[styles.chipText, recurrence === r.key && styles.chipTextActive]}>{r.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Who checks it’s done?</Text>
              <View style={styles.chipsWrap}>
                {VERIFIERS.map((v) => (
                  <Pressable key={v.key} style={[styles.chip, verifier === v.key && styles.chipActive]} onPress={() => setVerifier(v.key)}>
                    <Text style={[styles.chipText, verifier === v.key && styles.chipTextActive]}>{v.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.hintText}>If a nanny checks, they confirm after the child marks it done.</Text>
            </ScrollView>
            <View style={styles.modalActions}>
              {editing ? (
                <Pressable style={styles.deleteBtn} onPress={() => remove(editing.id)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.ghostBtn} onPress={() => setFormOpen(false)}>
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </Pressable>
              )}
              <Pressable style={styles.primaryBtn} onPress={save}>
                <Text style={styles.primaryBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    eyebrow: { color: colors.subtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    title: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 2 },
    subtitle: { color: colors.subtext, fontSize: 13, lineHeight: 18, marginTop: -4 },
    addBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginTop: 4 },
    addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
    emptyCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 6 },
    emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
    emptyText: { color: colors.subtext, fontSize: 13, lineHeight: 18 },
    group: { gap: 8 },
    groupLabel: { color: colors.subtext, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    choreCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#e1e8f2', paddingVertical: 12, paddingHorizontal: 14 },
    check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#c7d2e3', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
    checkOn: { borderColor: colors.primary, backgroundColor: colors.primary },
    checkMark: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
    choreTitle: { color: '#14233b', fontSize: 15, fontWeight: '800' },
    choreTitleDone: { color: '#94a3b8', textDecorationLine: 'line-through' },
    choreMeta: { color: '#52627d', fontSize: 12, marginTop: 2 },
    verifyPill: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    verifyPillText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
    verifiedTag: { color: '#16a34a', fontWeight: '800', fontSize: 12 },
    hintText: { color: colors.subtext, fontSize: 12, marginTop: 8, lineHeight: 17 },
    scrim: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 16 },
    modalCard: { maxHeight: '90%', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.96)', backgroundColor: 'rgba(248,250,252,0.98)', overflow: 'hidden' },
    modalContent: { padding: 18, gap: 4 },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 8 },
    fieldLabel: { color: colors.subtext, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6 },
    input: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#d9e4f2', paddingHorizontal: 14, paddingVertical: 12, color: '#14233b', fontSize: 15 },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderRadius: 12, borderWidth: 1, borderColor: '#d9e4f2', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 8 },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.selection },
    chipText: { color: '#52627d', fontSize: 13, fontWeight: '700' },
    chipTextActive: { color: colors.primary },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
    toggleBox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#c7d2e3', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
    toggleBoxOn: { borderColor: colors.primary, backgroundColor: colors.primary },
    toggleMark: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
    toggleText: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#e1e8f2', backgroundColor: 'rgba(248,250,252,0.98)' },
    ghostBtn: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13, borderWidth: 1, borderColor: '#d9e4f2', backgroundColor: '#ffffff' },
    ghostBtnText: { color: colors.text, fontWeight: '700' },
    deleteBtn: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2' },
    deleteBtnText: { color: '#dc2626', fontWeight: '800' },
    primaryBtn: { borderRadius: 14, paddingHorizontal: 22, paddingVertical: 13, backgroundColor: colors.primary },
    primaryBtnText: { color: '#ffffff', fontWeight: '800' },
  });
