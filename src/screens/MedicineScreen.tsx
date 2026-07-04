import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { MedicineCategory, MedicineItem } from '@/types/app';
import { ThemeColors, useThemeColors } from '@/theme/theme';
import { SectionCard } from '@/components/SectionCard';
import {
  MED_CATEGORIES,
  medCategoryMeta,
  medExpiryStatus,
  formatExpiryLabel,
  normalizeExpiryInput,
  medsNeedAttentionCount,
} from '@/lib/meds';

type Props = {
  medicines: MedicineItem[];
  onMedicinesChange: Dispatch<SetStateAction<MedicineItem[]>>;
};

type FilterKey = 'all' | 'expired' | 'soon' | MedicineCategory;

function newId() {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const FOR_WHOM_OPTIONS = ['Adults', 'Kids', 'Everyone'];

export function MedicineScreen({ medicines, onMedicinesChange }: Props) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const isMobile = width < 760;
  const styles = useMemo(() => createStyles(colors, isMobile), [colors, isMobile]);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [draftName, setDraftName] = useState('');
  const [draftCategory, setDraftCategory] = useState<MedicineCategory>('pain');
  const [draftExpiry, setDraftExpiry] = useState('');
  const [draftQuantity, setDraftQuantity] = useState('');
  const [draftLocation, setDraftLocation] = useState('');
  const [draftForWhom, setDraftForWhom] = useState('Adults');
  const [draftNote, setDraftNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const attentionCount = medsNeedAttentionCount(medicines);

  const sorted = useMemo(() => {
    const order: Record<string, number> = { expired: 0, soon: 1, ok: 2, none: 3 };
    return [...medicines].sort((a, b) => {
      const sa = order[medExpiryStatus(a.expiry)];
      const sb = order[medExpiryStatus(b.expiry)];
      if (sa !== sb) return sa - sb;
      return (a.expiry || '9999-99').localeCompare(b.expiry || '9999-99');
    });
  }, [medicines]);

  const visible = useMemo(() => {
    return sorted.filter((item) => {
      if (filter === 'all') return true;
      if (filter === 'expired') return medExpiryStatus(item.expiry) === 'expired';
      if (filter === 'soon') return medExpiryStatus(item.expiry) === 'soon';
      return item.category === filter;
    });
  }, [sorted, filter]);

  function resetDraft() {
    setEditingId(null);
    setDraftName('');
    setDraftCategory('pain');
    setDraftExpiry('');
    setDraftQuantity('');
    setDraftLocation('');
    setDraftForWhom('Adults');
    setDraftNote('');
    setError(null);
  }

  function openCreate() {
    resetDraft();
    setEditorOpen(true);
  }

  function openEdit(item: MedicineItem) {
    setEditingId(item.id);
    setDraftName(item.name);
    setDraftCategory(item.category);
    setDraftExpiry(item.expiry ? formatExpiryInput(item.expiry) : '');
    setDraftQuantity(item.quantity || '');
    setDraftLocation(item.location || '');
    setDraftForWhom(item.forWhom || 'Adults');
    setDraftNote(item.note || '');
    setError(null);
    setEditorOpen(true);
  }

  function saveDraft() {
    const name = draftName.trim();
    if (!name) {
      setError('Add a name for the medicine.');
      return;
    }
    let expiry: string | undefined;
    if (draftExpiry.trim()) {
      const normalized = normalizeExpiryInput(draftExpiry);
      if (!normalized) {
        setError('Expiry should look like 07/2026 or 2026-07.');
        return;
      }
      expiry = normalized;
    }
    const next: MedicineItem = {
      id: editingId || newId(),
      name,
      category: draftCategory,
      expiry,
      quantity: draftQuantity.trim() || undefined,
      location: draftLocation.trim() || undefined,
      forWhom: draftForWhom.trim() || undefined,
      note: draftNote.trim() || undefined,
    };
    onMedicinesChange((prev) => {
      const exists = prev.some((item) => item.id === next.id);
      return exists ? prev.map((item) => (item.id === next.id ? next : item)) : [next, ...prev];
    });
    setEditorOpen(false);
    resetDraft();
  }

  function removeItem(id: string) {
    onMedicinesChange((prev) => prev.filter((item) => item.id !== id));
    setEditorOpen(false);
    resetDraft();
  }

  const filterChips: { key: FilterKey; label: string }[] = [
    { key: 'all', label: `All (${medicines.length})` },
    { key: 'expired', label: 'Expired' },
    { key: 'soon', label: 'Expiring soon' },
    ...MED_CATEGORIES.map((c) => ({ key: c.key as FilterKey, label: c.label })),
  ];

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SectionCard
        title="Medicine cabinet"
        headerRight={
          <Pressable style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        }
      >
        <Text style={styles.heroText}>
          Keep track of what medicine you have at home and when it expires. Inventory only — not medical advice.
        </Text>

        {attentionCount > 0 ? (
          <View style={styles.alertBanner}>
            <Text style={styles.alertBannerText}>
              ⚠️ {attentionCount} item{attentionCount === 1 ? '' : 's'} expired or expiring soon
            </Text>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {filterChips.map((chip) => {
            const active = filter === chip.key;
            return (
              <Pressable key={chip.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilter(chip.key)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {visible.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{medicines.length === 0 ? 'No medicines yet' : 'Nothing here'}</Text>
            <Text style={styles.emptyText}>
              {medicines.length === 0
                ? 'Tap “+ Add” to add your first medicine and its expiry date.'
                : 'No medicines match this filter.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {visible.map((item) => {
              const status = medExpiryStatus(item.expiry);
              const meta = medCategoryMeta(item.category);
              return (
                <Pressable key={item.id} style={styles.row} onPress={() => openEdit(item)}>
                  <View style={styles.rowEmojiWrap}>
                    <Text style={styles.rowEmoji}>{meta.emoji}</Text>
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{item.name}</Text>
                    <Text style={styles.rowMeta}>
                      {meta.label}
                      {item.forWhom ? ` · ${item.forWhom}` : ''}
                      {item.location ? ` · ${item.location}` : ''}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <View style={[styles.badge, statusBadgeStyle(status, styles)]}>
                      <Text style={[styles.badgeText, statusBadgeTextStyle(status, styles)]}>
                        {statusLabel(status, item.expiry)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </SectionCard>

      <Modal visible={editorOpen} transparent animationType="fade" onRequestClose={() => setEditorOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditorOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit medicine' : 'Add medicine'}</Text>
              <Pressable style={styles.closeBtn} onPress={() => setEditorOpen(false)}>
                <Text style={styles.closeBtnText}>×</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                placeholder="e.g. Nurofen"
                placeholderTextColor={colors.subtext}
                style={styles.input}
                value={draftName}
                onChangeText={setDraftName}
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.optionWrap}>
                {MED_CATEGORIES.map((c) => {
                  const active = draftCategory === c.key;
                  return (
                    <Pressable key={c.key} style={[styles.optionChip, active && styles.optionChipActive]} onPress={() => setDraftCategory(c.key)}>
                      <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                        {c.emoji}  {c.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Expiry date (month/year)</Text>
              <TextInput
                placeholder="07/2026"
                placeholderTextColor={colors.subtext}
                style={styles.input}
                value={draftExpiry}
                onChangeText={setDraftExpiry}
                autoCapitalize="none"
              />

              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <Text style={styles.fieldLabel}>Amount</Text>
                  <TextInput
                    placeholder="e.g. 1 box, half"
                    placeholderTextColor={colors.subtext}
                    style={styles.input}
                    value={draftQuantity}
                    onChangeText={setDraftQuantity}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.fieldLabel}>Where it is</Text>
                  <TextInput
                    placeholder="e.g. Bathroom"
                    placeholderTextColor={colors.subtext}
                    style={styles.input}
                    value={draftLocation}
                    onChangeText={setDraftLocation}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>For whom</Text>
              <View style={styles.optionWrap}>
                {FOR_WHOM_OPTIONS.map((who) => {
                  const active = draftForWhom === who;
                  return (
                    <Pressable key={who} style={[styles.optionChip, active && styles.optionChipActive]} onPress={() => setDraftForWhom(who)}>
                      <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{who}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Note (optional)</Text>
              <TextInput
                placeholder="Anything to remember"
                placeholderTextColor={colors.subtext}
                style={[styles.input, styles.textarea]}
                value={draftNote}
                onChangeText={setDraftNote}
                multiline
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </ScrollView>

            <View style={styles.modalActions}>
              {editingId ? (
                <Pressable style={styles.deleteBtn} onPress={() => removeItem(editingId)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.saveBtn} onPress={saveDraft}>
                <Text style={styles.saveBtnText}>{editingId ? 'Save' : 'Add medicine'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function formatExpiryInput(expiry: string) {
  const [y, m] = expiry.split('-');
  if (!y || !m) return '';
  return `${m}/${y}`;
}

function statusLabel(status: ReturnType<typeof medExpiryStatus>, expiry?: string) {
  if (status === 'expired') return `Expired · ${formatExpiryLabel(expiry)}`;
  if (status === 'soon') return `Soon · ${formatExpiryLabel(expiry)}`;
  if (status === 'ok') return formatExpiryLabel(expiry);
  return 'No date';
}

function statusBadgeStyle(status: ReturnType<typeof medExpiryStatus>, styles: ReturnType<typeof createStyles>) {
  if (status === 'expired') return styles.badgeExpired;
  if (status === 'soon') return styles.badgeSoon;
  if (status === 'ok') return styles.badgeOk;
  return styles.badgeNone;
}

function statusBadgeTextStyle(status: ReturnType<typeof medExpiryStatus>, styles: ReturnType<typeof createStyles>) {
  if (status === 'expired') return styles.badgeTextExpired;
  if (status === 'soon') return styles.badgeTextSoon;
  if (status === 'ok') return styles.badgeTextOk;
  return styles.badgeTextNone;
}

const createStyles = (colors: ThemeColors, isMobile: boolean) =>
  StyleSheet.create({
    content: {
      paddingBottom: 120,
    },
    heroText: {
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
    },
    addBtn: {
      borderRadius: 12,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    addBtnText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '800',
    },
    alertBanner: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(225,29,72,0.3)',
      backgroundColor: 'rgba(255,241,242,0.9)',
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 12,
    },
    alertBannerText: {
      color: '#9f1239',
      fontSize: 13,
      fontWeight: '800',
    },
    chipsRow: {
      gap: 8,
      paddingBottom: 12,
    },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'rgba(255,255,255,0.6)',
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      color: colors.text,
      fontSize: 12.5,
      fontWeight: '700',
    },
    chipTextActive: {
      color: '#ffffff',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
      gap: 6,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    emptyText: {
      color: colors.subtext,
      fontSize: 13,
      textAlign: 'center',
      maxWidth: 320,
      lineHeight: 18,
    },
    list: {
      gap: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.72)',
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    rowEmojiWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.selection,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowEmoji: {
      fontSize: 20,
    },
    rowBody: {
      flex: 1,
      gap: 3,
    },
    rowTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    rowMeta: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
    },
    rowRight: {
      alignItems: 'flex-end',
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    badgeExpired: { backgroundColor: 'rgba(225,29,72,0.12)' },
    badgeTextExpired: { color: '#be123c' },
    badgeSoon: { backgroundColor: 'rgba(217,119,6,0.14)' },
    badgeTextSoon: { color: '#b45309' },
    badgeOk: { backgroundColor: 'rgba(22,163,74,0.12)' },
    badgeTextOk: { color: '#15803d' },
    badgeNone: { backgroundColor: 'rgba(100,116,139,0.12)' },
    badgeTextNone: { color: colors.subtext },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    modalCard: {
      width: '100%',
      maxWidth: 560,
      maxHeight: '92%',
      borderRadius: 22,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 8,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.selection,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      lineHeight: 22,
    },
    modalScroll: {
      paddingHorizontal: 18,
      paddingBottom: 8,
      gap: 4,
    },
    fieldLabel: {
      color: colors.text,
      fontSize: 12.5,
      fontWeight: '800',
      marginTop: 12,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: '#dbe3ee',
      borderRadius: 12,
      backgroundColor: '#ffffff',
      color: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 14,
      fontWeight: '500',
    },
    textarea: {
      minHeight: 70,
      textAlignVertical: 'top',
    },
    twoCol: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: 12,
    },
    col: {
      flex: 1,
    },
    optionWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    optionChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'rgba(255,255,255,0.6)',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    optionChipActive: {
      backgroundColor: colors.selection,
      borderColor: colors.primary,
    },
    optionChipText: {
      color: colors.text,
      fontSize: 12.5,
      fontWeight: '700',
    },
    optionChipTextActive: {
      color: colors.primary,
    },
    errorText: {
      color: '#be123c',
      fontSize: 12.5,
      fontWeight: '700',
      marginTop: 10,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    deleteBtn: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(225,29,72,0.4)',
      paddingHorizontal: 18,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteBtnText: {
      color: '#be123c',
      fontSize: 13,
      fontWeight: '800',
    },
    saveBtn: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: colors.primary,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '800',
    },
  });
