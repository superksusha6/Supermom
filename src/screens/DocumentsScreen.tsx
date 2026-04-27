import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SectionCard } from '@/components/SectionCard';
import { ImportedEmailEvent } from '@/types/app';
import { ThemeColors, useThemeColors } from '@/theme/theme';

type Props = {
  importedItems: ImportedEmailEvent[];
  onImportedItemsChange: Dispatch<SetStateAction<ImportedEmailEvent[]>>;
  onAddImportedEventToCalendar: (item: ImportedEmailEvent) => void;
};

export function DocumentsScreen({ importedItems, onImportedItemsChange, onAddImportedEventToCalendar }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [editingImportedId, setEditingImportedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [draftTime, setDraftTime] = useState('');
  const [draftLocation, setDraftLocation] = useState('');
  const [draftNotes, setDraftNotes] = useState('');

  const pendingItems = useMemo(() => importedItems.filter((item) => item.status === 'pending'), [importedItems]);

  async function pickCalendarFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const cleanName = (asset.name || 'Imported document').replace(/\.[^/.]+$/, '');
      const suggestedTitle = cleanName
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (match) => match.toUpperCase());

      onImportedItemsChange((prev) => [
        {
          id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sourceKind: 'file',
          sourceLabel: asset.mimeType === 'application/pdf' ? 'PDF document' : 'Image document',
          fileName: asset.name,
          mimeType: asset.mimeType,
          title: suggestedTitle || 'Imported event draft',
          date: toDateKey(new Date()),
          time: '10:00 AM',
          notes: 'Document imported. Review details, then send it to the calendar.',
          status: 'pending',
        },
        ...prev,
      ]);
    } catch (_error) {
      // Quiet for now. We can add a styled error state later when the conversion layer is connected.
    }
  }

  function openEditor(item: ImportedEmailEvent) {
    setEditingImportedId(item.id);
    setDraftTitle(item.title);
    setDraftDate(item.date);
    setDraftTime(item.time);
    setDraftLocation(item.location || '');
    setDraftNotes(item.notes || '');
  }

  function closeEditor() {
    setEditingImportedId(null);
    setDraftTitle('');
    setDraftDate('');
    setDraftTime('');
    setDraftLocation('');
    setDraftNotes('');
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlowLarge} />
        <View style={styles.heroGlowSmall} />
        <Text style={styles.heroEyebrow}>Document Tools</Text>
        <Text style={styles.heroTitle}>Smart File Hub</Text>
        <Text style={styles.heroText}>A separate place for JPG, PNG, PDF and useful file actions, without overloading the calendar itself.</Text>
      </View>

      <SectionCard title="Quick Tools">
        <View style={styles.toolsGrid}>
          <Pressable style={[styles.toolCard, styles.toolCardPrimary]} onPress={pickCalendarFile}>
            <Text style={styles.toolIcon}>📅</Text>
            <Text style={styles.toolTitle}>Calendar from file</Text>
            <Text style={styles.toolMeta}>Upload JPG, PNG or PDF and review the detected event before it enters the calendar.</Text>
          </Pressable>

          <View style={styles.toolCard}>
            <Text style={styles.toolIcon}>🖼️</Text>
            <Text style={styles.toolTitle}>Images to PDF</Text>
            <Text style={styles.toolMeta}>Prepare multiple document photos and convert them into one clean PDF.</Text>
            <Text style={styles.toolSoon}>Next</Text>
          </View>

          <View style={styles.toolCard}>
            <Text style={styles.toolIcon}>📄</Text>
            <Text style={styles.toolTitle}>PDF to Images</Text>
            <Text style={styles.toolMeta}>Export pages into pictures when you need to share or reuse them visually.</Text>
            <Text style={styles.toolSoon}>Next</Text>
          </View>

          <View style={styles.toolCard}>
            <Text style={styles.toolIcon}>🗜️</Text>
            <Text style={styles.toolTitle}>Compress file</Text>
            <Text style={styles.toolMeta}>Make large images and PDFs lighter before sending them anywhere.</Text>
            <Text style={styles.toolSoon}>Next</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Review Queue">
        <Text style={styles.helpText}>Files land here first. You can adjust title, date, time, and only then send them into the calendar.</Text>

        {pendingItems.length === 0 ? <Text style={styles.emptyText}>No imported documents waiting right now.</Text> : null}

        <View style={styles.queueList}>
          {pendingItems.map((item) => (
            <View key={item.id} style={styles.queueCard}>
              <View style={styles.queueTop}>
                <View style={styles.queueBadge}>
                  <Text style={styles.queueBadgeText}>{item.sourceKind === 'file' ? 'File' : 'Email'}</Text>
                </View>
                <Text style={styles.queueSource}>{item.sourceLabel}</Text>
              </View>
              <Text style={styles.queueTitle}>{item.title}</Text>
              <Text style={styles.queueMeta}>
                {item.date} · {item.time}
                {item.location ? ` · ${item.location}` : ''}
              </Text>
              {item.fileName ? <Text style={styles.queueSubtle}>File: {item.fileName}</Text> : null}
              {item.subject ? <Text style={styles.queueSubtle}>Subject: {item.subject}</Text> : null}
              {item.sender ? <Text style={styles.queueSubtle}>From: {item.sender}</Text> : null}
              {item.notes ? <Text style={styles.queueNotes}>{item.notes}</Text> : null}

              <View style={styles.queueActions}>
                <Pressable style={styles.ghostBtn} onPress={() => openEditor(item)}>
                  <Text style={styles.ghostBtnText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={styles.ghostBtn}
                  onPress={() => onImportedItemsChange((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, status: 'ignored' } : entry)))}
                >
                  <Text style={styles.ghostBtnText}>Ignore</Text>
                </Pressable>
                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => {
                    onAddImportedEventToCalendar(item);
                    onImportedItemsChange((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, status: 'added' } : entry)));
                  }}
                >
                  <Text style={styles.primaryBtnText}>Send to calendar</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </SectionCard>

      <Modal visible={!!editingImportedId} transparent animationType="fade" onRequestClose={closeEditor}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit imported file</Text>
            <TextInput placeholder="Title" value={draftTitle} onChangeText={setDraftTitle} style={styles.input} />
            <View style={styles.row}>
              <TextInput placeholder="YYYY-MM-DD" value={draftDate} onChangeText={setDraftDate} style={[styles.input, styles.halfInput]} />
              <TextInput placeholder="07:30 PM" value={draftTime} onChangeText={setDraftTime} style={[styles.input, styles.halfInput]} />
            </View>
            <TextInput placeholder="Location" value={draftLocation} onChangeText={setDraftLocation} style={styles.input} />
            <TextInput placeholder="Notes" value={draftNotes} onChangeText={setDraftNotes} style={styles.input} multiline />

            <View style={styles.modalActions}>
              <Pressable style={styles.ghostBtn} onPress={closeEditor}>
                <Text style={styles.ghostBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => {
                  if (!editingImportedId || !draftTitle.trim()) return;
                  onImportedItemsChange((prev) =>
                    prev.map((entry) =>
                      entry.id === editingImportedId
                        ? {
                            ...entry,
                            title: draftTitle.trim(),
                            date: draftDate.trim() || entry.date,
                            time: draftTime.trim() || entry.time,
                            location: draftLocation.trim(),
                            notes: draftNotes.trim(),
                          }
                        : entry,
                    ),
                  );
                  closeEditor();
                }}
              >
                <Text style={styles.primaryBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
      backgroundColor: 'rgba(91, 124, 255, 0.12)',
    },
    heroGlowSmall: {
      position: 'absolute',
      bottom: -18,
      left: -18,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255, 191, 119, 0.14)',
    },
    heroEyebrow: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
    heroTitle: {
      color: colors.text,
      fontSize: 32,
      lineHeight: 36,
      fontWeight: '900',
      marginBottom: 8,
    },
    heroText: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 19,
      maxWidth: '85%',
    },
    toolsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    toolCard: {
      width: '48.2%',
      minHeight: 148,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      padding: 14,
      gap: 8,
    },
    toolCardPrimary: {
      backgroundColor: colors.selection,
      borderColor: colors.primary,
    },
    toolIcon: {
      fontSize: 24,
    },
    toolTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    toolMeta: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
    },
    toolSoon: {
      marginTop: 'auto',
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    helpText: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 10,
    },
    queueList: {
      gap: 10,
    },
    queueCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      padding: 14,
      gap: 6,
    },
    queueTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    queueBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: colors.selection,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    queueBadgeText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    queueSource: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '700',
      flexShrink: 1,
      textAlign: 'right',
    },
    queueTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    queueMeta: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    queueSubtle: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 16,
    },
    queueNotes: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
    },
    queueActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 2,
    },
    ghostBtn: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    ghostBtnText: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 12,
    },
    primaryBtn: {
      borderRadius: 14,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 11,
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 12,
    },
    emptyText: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
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
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    halfInput: {
      flex: 1,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 6,
    },
  });
