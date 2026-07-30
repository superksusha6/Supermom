import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  srcLang: string;
  tgtLang: string;
  onLangChange: (src: string, tgt: string) => void;
  onAddWord: (term: string, translation: string) => void;
  onDeleteWord: (id: string) => void;
};

export function WordsScreen({ words, enrichingIds, srcLang, tgtLang, onLangChange, onAddWord, onDeleteWord }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [term, setTerm] = useState('');
  const [translation, setTranslation] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [pickerFor, setPickerFor] = useState<null | 'src' | 'tgt'>(null);

  // Only this language pair's words (a child could have decks in several languages).
  const deck = words.filter((w) => w.srcLang === srcLang && w.tgtLang === tgtLang);

  const submit = () => {
    const t = term.trim();
    if (!t) return;
    onAddWord(t, manualMode ? translation.trim() : '');
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

      {/* Add a word — type in EITHER language, we detect it and translate. */}
      <SectionCard title="Add a word">
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder={`Type a word — ${langLabel(srcLang)} or ${langLabel(tgtLang)}`}
          placeholderTextColor={colors.subtext}
          style={styles.input}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        {manualMode ? (
          <TextInput
            value={translation}
            onChangeText={setTranslation}
            placeholder={`Meaning in ${langLabel(tgtLang)}`}
            placeholderTextColor={colors.subtext}
            style={styles.input}
          />
        ) : null}
        <Pressable
          style={[styles.addBtn, !term.trim() && styles.addBtnDisabled]}
          onPress={submit}
          disabled={!term.trim()}
        >
          <Text style={styles.addBtnText}>{manualMode ? '+  Add to my words' : '✨  Translate & add'}</Text>
        </Pressable>
        <Pressable onPress={() => setManualMode((v) => !v)}>
          <Text style={styles.hint}>
            {manualMode
              ? '↩︎ Let the app translate for me'
              : "Write in English or Spanish — we'll find the other. · Add the meaning myself"}
          </Text>
        </Pressable>
      </SectionCard>

      {/* The deck */}
      <SectionCard title={`My words · ${deck.length}`}>
        {deck.length === 0 ? (
          <Text style={styles.empty}>No words yet. Add a few above and start practising! 📚</Text>
        ) : (
          deck.map((w) => {
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
          })
        )}
      </SectionCard>

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
    addBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
    },
    addBtnDisabled: { opacity: 0.4 },
    addBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
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
