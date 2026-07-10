import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MedicineCategory, MedicineItem } from '@/types/app';
import { ThemeColors, useThemeColors } from '@/theme/theme';
import { SectionCard } from '@/components/SectionCard';
import { statusColor } from '@/theme/tokens';
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

function badgeTint(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
}

// Downscale a big camera photo to a small JPEG (web) so the request stays well
// under Vercel's ~4.5MB body limit. Keeps text readable at ~1400px.
async function shrinkDataUrl(dataUrl: string, maxSize = 1400, quality = 0.6): Promise<string> {
  if (typeof document === 'undefined') return dataUrl;
  return new Promise((resolve) => {
    const img = new (window as any).Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function MedicineScreen({ medicines, onMedicinesChange }: Props) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const isMobile = true; // mobile-only app
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

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanStepOpen, setScanStepOpen] = useState(false);
  const [scanNameImg, setScanNameImg] = useState('');
  const [scanExpiryImg, setScanExpiryImg] = useState('');

  function openScan() {
    setScanNameImg('');
    setScanExpiryImg('');
    setScanError(null);
    setScanStepOpen(true);
  }

  async function captureImage(target: 'name' | 'expiry') {
    try {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      const options = { quality: 0.5, base64: true } as const;
      let result: ImagePicker.ImagePickerResult;
      if (camPerm.granted) {
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!libPerm.granted) {
          Alert.alert('Permission needed', 'Allow camera or photo access to scan.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ ...options, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      }
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.base64) return;
      const dataUrl = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
      if (target === 'name') setScanNameImg(dataUrl);
      else setScanExpiryImg(dataUrl);
    } catch {
      Alert.alert('Photo failed', 'Could not open the camera right now.');
    }
  }

  async function recognizePair() {
    if (scanning || !scanNameImg || !scanExpiryImg) return;
    setScanning(true);
    setScanError(null);
    try {
      const [nameSmall, expirySmall] = await Promise.all([
        shrinkDataUrl(scanNameImg),
        shrinkDataUrl(scanExpiryImg),
      ]);
      const onLocalhost =
        typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname);
      const base = onLocalhost ? 'https://supermom-rose.vercel.app' : '';
      const res = await fetch(`${base}/api/scan-medicine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'pair', images: [nameSmall, expirySmall] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setScanError(data.error || 'Recognition failed. Please try again.');
        return;
      }
      const detected = (data.medicines || []) as { name: string; expiry: string; category: MedicineCategory }[];
      const first = detected[0];
      if (!first || !first.name) {
        setScanError('Could not read the package. Try clearer, closer photos.');
        return;
      }
      // Prefill the normal editor so the user just confirms and saves.
      setEditingId(null);
      setDraftName(first.name);
      setDraftCategory(first.category || 'other');
      setDraftExpiry(first.expiry ? formatExpiryInput(first.expiry) : '');
      setDraftQuantity('');
      setDraftLocation('');
      setDraftForWhom('Adults');
      setDraftNote('');
      setError(null);
      setScanStepOpen(false);
      setEditorOpen(true);
    } catch {
      setScanError('Could not scan right now. Please try again.');
    } finally {
      setScanning(false);
    }
  }

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

        <Pressable style={styles.scanBtn} onPress={openScan}>
          <Text style={styles.scanBtnText}>📷  Scan a medicine (2 photos)</Text>
        </Pressable>
        <Text style={styles.scanHint}>Take 2 photos — 1) the name, 2) the expiry date. The app reads them and fills the form for you.</Text>

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

      <Modal visible={scanStepOpen} transparent animationType="fade" onRequestClose={() => setScanStepOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setScanStepOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan a medicine</Text>
              <Pressable style={styles.closeBtn} onPress={() => setScanStepOpen(false)}>
                <Text style={styles.closeBtnText}>×</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <Text style={styles.reviewHint}>Take two photos. The app reads the name and the expiry date and fills the form.</Text>

              <Pressable style={[styles.captureTile, scanNameImg && styles.captureTileDone]} onPress={() => captureImage('name')}>
                <Text style={styles.captureStep}>1</Text>
                <View style={styles.captureCopy}>
                  <Text style={styles.captureTitle}>{scanNameImg ? '✓ Name photo taken' : 'Photo of the name'}</Text>
                  <Text style={styles.captureSub}>{scanNameImg ? 'Tap to retake' : 'Front of the package'}</Text>
                </View>
              </Pressable>

              <Pressable style={[styles.captureTile, scanExpiryImg && styles.captureTileDone]} onPress={() => captureImage('expiry')}>
                <Text style={styles.captureStep}>2</Text>
                <View style={styles.captureCopy}>
                  <Text style={styles.captureTitle}>{scanExpiryImg ? '✓ Expiry photo taken' : 'Photo of the expiry date'}</Text>
                  <Text style={styles.captureSub}>{scanExpiryImg ? 'Tap to retake' : 'The date on the box/blister'}</Text>
                </View>
              </Pressable>

              {scanError ? <Text style={styles.scanErrorText}>{scanError}</Text> : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.deleteBtn} onPress={() => setScanStepOpen(false)}>
                <Text style={styles.deleteBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, (!scanNameImg || !scanExpiryImg || scanning) && styles.saveBtnDisabled]}
                onPress={recognizePair}
                disabled={!scanNameImg || !scanExpiryImg || scanning}
              >
                {scanning ? (
                  <View style={styles.saveBtnRow}>
                    <ActivityIndicator color="#ffffff" />
                    <Text style={styles.saveBtnText}>Reading…</Text>
                  </View>
                ) : (
                  <Text style={styles.saveBtnText}>Recognize</Text>
                )}
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
    scanBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 14,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      marginBottom: 6,
    },
    scanBtnDisabled: {
      opacity: 0.7,
    },
    scanBtnText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '900',
    },
    scanHint: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 16,
      marginBottom: 12,
    },
    scanErrorText: {
      color: '#be123c',
      fontSize: 12.5,
      fontWeight: '700',
      marginBottom: 10,
    },
    reviewHint: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
      marginBottom: 12,
    },
    captureTile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderWidth: 1.5,
      borderColor: '#dbe3ee',
      borderStyle: 'dashed',
      borderRadius: 14,
      backgroundColor: 'rgba(248,251,255,0.7)',
      paddingHorizontal: 14,
      paddingVertical: 16,
      marginBottom: 10,
    },
    captureTileDone: {
      borderStyle: 'solid',
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    captureStep: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primary,
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '900',
      textAlign: 'center',
      lineHeight: 30,
      overflow: 'hidden',
    },
    captureCopy: {
      flex: 1,
      gap: 2,
    },
    captureTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    captureSub: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    reviewRow: {
      flexDirection: 'row',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: 'rgba(248,251,255,0.7)',
      padding: 10,
      marginBottom: 8,
    },
    reviewRowOff: {
      opacity: 0.5,
    },
    reviewCheck: {
      paddingTop: 4,
    },
    checkBox: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkBoxOn: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkMark: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '900',
    },
    reviewBody: {
      flex: 1,
      gap: 6,
    },
    reviewNameInput: {
      borderWidth: 1,
      borderColor: '#dbe3ee',
      borderRadius: 10,
      backgroundColor: '#ffffff',
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 14,
      fontWeight: '700',
    },
    reviewMetaRow: {
      flexDirection: 'row',
      gap: 8,
    },
    reviewExpiryInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#dbe3ee',
      borderRadius: 10,
      backgroundColor: '#ffffff',
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
      fontWeight: '600',
    },
    reviewCats: {
      gap: 6,
      paddingVertical: 2,
    },
    reviewCatChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'rgba(255,255,255,0.7)',
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    reviewCatText: {
      color: colors.text,
      fontSize: 11.5,
      fontWeight: '700',
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
    badgeExpired: { backgroundColor: badgeTint(statusColor(colors, 'urgent'), 0.12) },
    badgeTextExpired: { color: statusColor(colors, 'urgent') },
    badgeSoon: { backgroundColor: badgeTint(statusColor(colors, 'soon'), 0.14) },
    badgeTextSoon: { color: statusColor(colors, 'soon') },
    badgeOk: { backgroundColor: badgeTint(statusColor(colors, 'done'), 0.12) },
    badgeTextOk: { color: statusColor(colors, 'done') },
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
