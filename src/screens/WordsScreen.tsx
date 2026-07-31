import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SectionCard } from '@/components/SectionCard';
import { ChildWord } from '@/types/app';
import { ThemeColors, useThemeColors } from '@/theme/theme';

// The languages a child can pick from. `flag` is just decoration; `name` is the
// endonym so the child recognises it. Order roughly by how common they are for kids.
export const WORD_LANGUAGES: { code: string; flag: string; name: string }[] = [
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  { code: 'pt', flag: '🇵🇹', name: 'Português' },
  { code: 'zh', flag: '🇨🇳', name: '中文' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
  { code: 'uk', flag: '🇺🇦', name: 'Українська' },
];

function langLabel(code: string): string {
  const l = WORD_LANGUAGES.find((x) => x.code === code);
  return l ? `${l.flag} ${l.name}` : code.toUpperCase();
}

type Props = {
  words: ChildWord[];
  enrichingIds: Set<string>;
  scanning: boolean;
  message: string | null;
  srcLang: string;
  tgtLang: string;
  onLangChange: (src: string, tgt: string) => void;
  onAddWord: (term: string, translation: string) => void;
  onAddWords: (terms: string[]) => void;
  onScanPhoto: () => void;
  onDeleteWord: (id: string) => void;
};

// Split a pasted blob into individual words: one per line, and also on commas /
// semicolons / tabs so lists copied in any shape work.
function splitWordList(text: string): string[] {
  return text
    .split(/[\n,;\t]+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Human label for a day of added words: Today / Yesterday / e.g. "24 Jul".
function dayLabel(key: string): string {
  const today = dayKey(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (key === today) return 'Today';
  if (key === dayKey(y)) return 'Yesterday';
  const [yy, mm, dd] = key.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(yy, (mm || 1) - 1, dd || 1);
  return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

// Group a deck into day-sections (newest day first), so words land under the date
// they were added instead of one endless list.
function groupByDay(deck: ChildWord[]): { key: string; label: string; words: ChildWord[] }[] {
  const map = new Map<string, ChildWord[]>();
  for (const w of deck) {
    const k = (w.createdAt || '').slice(0, 10) || dayKey(new Date());
    (map.get(k) ?? map.set(k, []).get(k)!).push(w);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, words]) => ({ key, label: dayLabel(key), words }));
}

export function WordsScreen({
  words,
  enrichingIds,
  scanning,
  message,
  srcLang,
  tgtLang,
  onLangChange,
  onAddWord,
  onAddWords,
  onScanPhoto,
  onDeleteWord,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [term, setTerm] = useState('');
  const [translation, setTranslation] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [pickerFor, setPickerFor] = useState<null | 'src' | 'tgt'>(null);

  // Only this language pair's words (a child could have decks in several languages).
  const deck = words.filter((w) => w.srcLang === srcLang && w.tgtLang === tgtLang);

  const list = splitWordList(term);
  const isMany = list.length > 1;

  const submit = () => {
    if (list.length === 0) return;
    if (manualMode && !isMany) {
      // Single word with a hand-typed meaning.
      onAddWord(list[0], translation.trim());
    } else {
      // One or many words → auto-translate the whole batch.
      onAddWords(list);
    }
    setTerm('');
    setTranslation('');
  };

  const pickLang = (code: string) => {
    if (pickerFor === 'src') onLangChange(code, tgtLang);
    else if (pickerFor === 'tgt') onLangChange(srcLang, code);
    setPickerFor(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      {/* Language pair — learning ⇄ native */}
      <View style={styles.langRow}>
        <Pressable style={styles.langPill} onPress={() => setPickerFor('src')}>
          <Text style={styles.langCaption}>I'm learning</Text>
          <Text style={styles.langValue}>{langLabel(srcLang)} ▾</Text>
        </Pressable>
        <Text style={styles.langArrow}>→</Text>
        <Pressable style={styles.langPill} onPress={() => setPickerFor('tgt')}>
          <Text style={styles.langCaption}>My language</Text>
          <Text style={styles.langValue}>{langLabel(tgtLang)} ▾</Text>
        </Pressable>
      </View>

      {/* Add words — one, or paste a whole list from your notes; or snap the notebook. */}
      <SectionCard title="Add words">
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder={`Type or paste words — ${langLabel(srcLang)} or ${langLabel(tgtLang)}\n(one per line)`}
          placeholderTextColor={colors.subtext}
          style={[styles.input, styles.inputMulti]}
          autoCapitalize="none"
          multiline
        />
        {manualMode && !isMany ? (
          <TextInput
            value={translation}
            onChangeText={setTranslation}
            placeholder={`Meaning in ${langLabel(tgtLang)}`}
            placeholderTextColor={colors.subtext}
            style={styles.input}
          />
        ) : null}
        <Pressable
          style={[styles.addBtn, list.length === 0 && styles.addBtnDisabled]}
          onPress={submit}
          disabled={list.length === 0}
        >
          <Text style={styles.addBtnText}>
            {isMany
              ? `✨  Translate & add ${list.length} words`
              : manualMode
                ? '+  Add to my words'
                : '✨  Translate & add'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.scanBtn, scanning && styles.addBtnDisabled]}
          onPress={onScanPhoto}
          disabled={scanning}
        >
          {scanning ? <ActivityIndicator color={colors.primary} /> : null}
          <Text style={styles.scanBtnText}>{scanning ? 'Reading the photo…' : '📷  Scan a notebook photo'}</Text>
        </Pressable>

        {message ? <Text style={styles.statusMsg}>{message}</Text> : null}

        <Pressable onPress={() => setManualMode((v) => !v)}>
          <Text style={styles.hint}>
            {manualMode
              ? '↩︎ Let the app translate for me'
              : "Write in either language — we'll find the other. · Add the meaning myself"}
          </Text>
        </Pressable>
      </SectionCard>

      {/* The deck — grouped by the day each word was added */}
      {deck.length === 0 ? (
        <SectionCard title="My words">
          <Text style={styles.empty}>No words yet. Add a few above and start practising! 📚</Text>
        </SectionCard>
      ) : (
        groupByDay(deck).map((g) => (
          <SectionCard key={g.key} title={`${g.label} · ${g.words.length}`}>
            {g.words.map((w) => {
              const busy = enrichingIds.has(w.id);
              return (
                <View key={w.id} style={styles.wordRow}>
                  <View style={styles.wordCopy}>
                    <Text style={styles.wordTerm}>{w.term}</Text>
                    <Text style={[styles.wordTrans, busy && styles.wordTransBusy]}>
                      {busy ? 'translating…' : w.translation || '—'}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel={`Delete ${w.term}`}
                    style={styles.delBtn}
                    onPress={() => onDeleteWord(w.id)}
                  >
                    <Text style={styles.delBtnText}>×</Text>
                  </Pressable>
                </View>
              );
            })}
          </SectionCard>
        ))
      )}

      {/* Language picker */}
      <Modal visible={pickerFor !== null} transparent animationType="fade" onRequestClose={() => setPickerFor(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerFor(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{pickerFor === 'src' ? "I'm learning" : 'My language'}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {WORD_LANGUAGES.map((l) => {
                const selected = pickerFor === 'src' ? l.code === srcLang : l.code === tgtLang;
                return (
                  <Pressable key={l.code} style={[styles.langOption, selected && styles.langOptionOn]} onPress={() => pickLang(l.code)}>
                    <Text style={styles.langOptionText}>{l.flag}  {l.name}</Text>
                    {selected ? <Text style={styles.langOptionCheck}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: { paddingBottom: 40, gap: 14 },
    langRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    langPill: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    langCaption: { color: colors.subtext, fontSize: 12, fontWeight: '600', marginBottom: 2 },
    langValue: { color: colors.text, fontSize: 15, fontWeight: '800' },
    langArrow: { color: colors.subtext, fontSize: 18, fontWeight: '700' },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 10,
    },
    inputMulti: { minHeight: 88, textAlignVertical: 'top', paddingTop: 12 },
    addBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
    },
    addBtnDisabled: { opacity: 0.4 },
    addBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    scanBtn: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },
    scanBtnText: { color: colors.primary, fontSize: 15, fontWeight: '800' },
    statusMsg: { color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: 10, textAlign: 'center' },
    hint: { color: colors.subtext, fontSize: 12, marginTop: 10 },
    empty: { color: colors.subtext, fontSize: 14, paddingVertical: 8 },
    wordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    wordCopy: { flex: 1 },
    wordTerm: { color: colors.text, fontSize: 17, fontWeight: '800' },
    wordTrans: { color: colors.subtext, fontSize: 14, fontWeight: '600', marginTop: 2 },
    wordTransBusy: { fontStyle: 'italic', color: colors.primary },
    delBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    delBtnText: { color: colors.subtext, fontSize: 24, fontWeight: '700', lineHeight: 26 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
    sheet: { backgroundColor: colors.surface, borderRadius: 20, padding: 16 },
    sheetTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 10 },
    langOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    langOptionOn: { backgroundColor: colors.selection },
    langOptionText: { color: colors.text, fontSize: 16, fontWeight: '700' },
    langOptionCheck: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  });
