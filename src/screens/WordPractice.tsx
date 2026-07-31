import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChildWord } from '@/types/app';
import { ThemeColors, useThemeColors } from '@/theme/theme';

// 'listen' = hear the word, pick the meaning (audio prompt).
type ExerciseKind = 'choose-translation' | 'choose-word' | 'listen' | 'type';
type Exercise = {
  word: ChildWord;
  kind: ExerciseKind;
  prompt: string; // what we show (or speak, for 'listen')
  answer: string; // the correct answer text
  options?: string[]; // for multiple choice
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistinct(pool: string[], exclude: string, n: number): string[] {
  const seen = new Set([exclude.toLowerCase()]);
  const out: string[] = [];
  for (const v of shuffle(pool)) {
    const key = v.trim().toLowerCase();
    if (!v.trim() || seen.has(key)) continue;
    seen.add(key);
    out.push(v.trim());
    if (out.length >= n) break;
  }
  return out;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Which exercise a word gets. Type is picked at RANDOM from a set that widens as the
// word is learned (recognise → recall → produce), so a session stays varied instead
// of asking the same thing every time.
function makeExercise(word: ChildWord, all: ChildWord[]): Exercise {
  const box = word.box || 1;
  const translation = (word.translation || '').trim();
  const otherTranslations = all.map((w) => (w.translation || '').trim()).filter(Boolean);
  const otherTerms = all.map((w) => w.term.trim()).filter(Boolean);

  const kinds: ExerciseKind[] =
    box >= 5
      ? ['type', 'type', 'choose-word']
      : box >= 3
        ? ['choose-word', 'listen', 'type']
        : ['choose-translation', 'choose-word', 'listen'];
  const kind = pick(kinds);

  // Meaning options (native language): prefer the AI's distractors, then fill.
  const buildMeaningOptions = () => {
    const distractors = (word.distractors || []).map((d) => d.trim()).filter(Boolean);
    const filled = [...distractors];
    if (filled.length < 3) filled.push(...pickDistinct(otherTranslations, translation, 3 - filled.length));
    return shuffle([translation, ...pickDistinct(filled, translation, 3)]);
  };

  if (kind === 'type') {
    return { word, kind: 'type', prompt: word.term, answer: translation };
  }
  if (kind === 'choose-word') {
    const options = shuffle([word.term, ...pickDistinct(otherTerms, word.term, 3)]);
    return { word, kind: 'choose-word', prompt: translation, answer: word.term, options };
  }
  if (kind === 'listen') {
    return { word, kind: 'listen', prompt: word.term, answer: translation, options: buildMeaningOptions() };
  }
  return { word, kind: 'choose-translation', prompt: word.term, answer: translation, options: buildMeaningOptions() };
}

// Normalise a typed answer: lower-case, trim, drop accents + trailing punctuation.
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.,!?;:]+$/g, '')
    .replace(/\s+/g, ' ');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[n];
}

function answerMatches(typed: string, answer: string): boolean {
  const t = normalize(typed);
  const a = normalize(answer);
  if (!t) return false;
  if (t === a) return true;
  // Accept a one-character typo on longer words.
  if (a.length >= 4 && levenshtein(t, a) <= 1) return true;
  // Accept any one of several comma/slash-separated correct meanings.
  return a
    .split(/[/,]/)
    .map((s) => s.trim())
    .some((part) => part && (t === part || (part.length >= 4 && levenshtein(t, part) <= 1)));
}

type Props = {
  words: ChildWord[];
  learnLang: string;
  // Grade the FIRST attempt of a word for spaced-repetition; returns true if the
  // word advanced a box (earned a fruit).
  onGrade: (word: ChildWord, correct: boolean) => boolean;
  onSpeak: (text: string, lang: string) => void;
  onClose: () => void;
};

export function WordPractice({ words, learnLang, onGrade, onSpeak, onClose }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const eligible = useMemo(() => words.filter((w) => (w.translation || '').trim()), [words]);
  const [queue, setQueue] = useState<Exercise[]>(() => shuffle(eligible).slice(0, 15).map((w) => makeExercise(w, eligible)));
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'ask' | 'feedback' | 'done'>(eligible.length ? 'ask' : 'done');
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [wasCorrect, setWasCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [fruits, setFruits] = useState(0);
  const gradedRef = useRef<Set<string>>(new Set());
  const requeuedRef = useRef<Set<string>>(new Set());

  const total = queue.length;
  const ex = queue[idx];

  // Auto-play the word when a "listen" question appears.
  useEffect(() => {
    if (ex && ex.kind === 'listen' && phase === 'ask') onSpeak(ex.word.term, learnLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase === 'ask']);

  const commit = (correct: boolean) => {
    setWasCorrect(correct);
    setPhase('feedback');
    if (!gradedRef.current.has(ex.word.id)) {
      gradedRef.current.add(ex.word.id);
      const earned = onGrade(ex.word, correct);
      if (correct) setCorrectCount((c) => c + 1);
      if (earned) setFruits((f) => f + 1);
    }
    // Give a missed word one more try later in the session.
    if (!correct && !requeuedRef.current.has(ex.word.id)) {
      requeuedRef.current.add(ex.word.id);
      setQueue((q) => [...q, makeExercise(ex.word, eligible)]);
    }
  };

  const choose = (opt: string) => {
    if (phase !== 'ask') return;
    setSelected(opt);
    commit(normalize(opt) === normalize(ex.answer));
  };
  const submitTyped = () => {
    if (phase !== 'ask') return;
    commit(answerMatches(typed, ex.answer));
  };
  const next = () => {
    setSelected(null);
    setTyped('');
    if (idx + 1 >= queue.length) {
      setPhase('done');
    } else {
      setIdx((i) => i + 1);
      setPhase('ask');
    }
  };

  if (phase === 'done' || !ex) {
    const practiced = gradedRef.current.size;
    return (
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.doneCard}>
          {eligible.length === 0 ? (
            <>
              <Text style={styles.doneEmoji}>📖</Text>
              <Text style={styles.doneTitle}>Nothing to practise yet</Text>
              <Text style={styles.doneSub}>These words don't have translations yet. Add or wait for them to translate, then try again.</Text>
            </>
          ) : (
            <>
              <Text style={styles.doneEmoji}>🎉</Text>
              <Text style={styles.doneTitle}>Great job!</Text>
              <Text style={styles.doneSub}>
                {correctCount} / {practiced} right{fruits > 0 ? ` · +${fruits} 🍎 for your pet` : ''}
              </Text>
            </>
          )}
          <Pressable style={styles.primaryBtn} onPress={onClose}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      {/* Progress + close */}
      <View style={styles.topRow}>
        <Pressable onPress={onClose} accessibilityLabel="Stop practice">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round((idx / total) * 100)}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {idx + 1}/{total}
        </Text>
      </View>

      {/* Prompt */}
      <View style={styles.promptCard}>
        <Text style={styles.promptKind}>
          {ex.kind === 'type'
            ? 'Type the meaning'
            : ex.kind === 'choose-word'
              ? 'Pick the word'
              : ex.kind === 'listen'
                ? 'Listen and pick'
                : 'Pick the meaning'}
        </Text>
        {ex.kind === 'listen' ? (
          <Pressable style={styles.bigSpeak} accessibilityLabel="Play the word" onPress={() => onSpeak(ex.word.term, learnLang)}>
            <Text style={styles.bigSpeakText}>🔊</Text>
            {phase === 'feedback' ? <Text style={styles.bigSpeakWord}>{ex.word.term}</Text> : null}
          </Pressable>
        ) : (
          <View style={styles.promptWordRow}>
            <Text style={styles.promptWord}>{ex.prompt}</Text>
            {ex.kind === 'choose-translation' || ex.kind === 'type' ? (
              <Pressable style={styles.speakBtn} accessibilityLabel="Listen" onPress={() => onSpeak(ex.word.term, learnLang)}>
                <Text style={styles.speakBtnText}>🔊</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      {/* Answer area */}
      {ex.kind === 'type' ? (
        <View>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            editable={phase === 'ask'}
            placeholder="Type your answer"
            placeholderTextColor={colors.subtext}
            style={styles.typeInput}
            autoCapitalize="none"
            autoFocus
            onSubmitEditing={submitTyped}
          />
          {phase === 'ask' ? (
            <Pressable style={[styles.primaryBtn, !typed.trim() && styles.btnDisabled]} onPress={submitTyped} disabled={!typed.trim()}>
              <Text style={styles.primaryBtnText}>Check</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.options}>
          {ex.options!.map((opt) => {
            const isCorrect = normalize(opt) === normalize(ex.answer);
            const isPicked = selected === opt;
            const showState = phase === 'feedback' && (isCorrect || isPicked);
            return (
              <Pressable
                key={opt}
                style={[
                  styles.option,
                  showState && isCorrect && styles.optionCorrect,
                  showState && isPicked && !isCorrect && styles.optionWrong,
                ]}
                onPress={() => choose(opt)}
                disabled={phase !== 'ask'}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Feedback */}
      {phase === 'feedback' ? (
        <View style={styles.feedback}>
          <Text style={[styles.feedbackText, wasCorrect ? styles.feedbackOk : styles.feedbackNo]}>
            {wasCorrect ? '✓ Correct!' : `Answer: ${ex.answer}`}
          </Text>
          {ex.word.example ? <Text style={styles.exampleText}>{ex.word.example}</Text> : null}
          <Pressable style={styles.primaryBtn} onPress={next}>
            <Text style={styles.primaryBtnText}>{idx + 1 >= queue.length ? 'Finish' : 'Continue'}</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: { padding: 4, gap: 16, paddingBottom: 40 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    closeText: { color: colors.subtext, fontSize: 20, fontWeight: '800' },
    progressTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
    progressText: { color: colors.subtext, fontSize: 13, fontWeight: '700', minWidth: 40, textAlign: 'right' },
    promptCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingVertical: 34,
      paddingHorizontal: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    promptKind: { color: colors.subtext, fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    promptWordRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    promptWord: { color: colors.text, fontSize: 30, fontWeight: '900', textAlign: 'center' },
    speakBtn: { padding: 6 },
    speakBtnText: { fontSize: 24 },
    bigSpeak: { alignItems: 'center', gap: 8, paddingVertical: 6 },
    bigSpeakText: { fontSize: 52 },
    bigSpeakWord: { color: colors.text, fontSize: 22, fontWeight: '800' },
    options: { gap: 10 },
    option: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 18,
      borderWidth: 2,
      borderColor: colors.border,
    },
    optionCorrect: { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.12)' },
    optionWrong: { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.12)' },
    optionText: { color: colors.text, fontSize: 17, fontWeight: '700' },
    typeInput: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 16,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    feedback: { gap: 12, marginTop: 4 },
    feedbackText: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
    feedbackOk: { color: '#16a34a' },
    feedbackNo: { color: '#ef4444' },
    exampleText: { color: colors.subtext, fontSize: 15, fontStyle: 'italic', textAlign: 'center' },
    primaryBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    btnDisabled: { opacity: 0.4 },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    doneCard: { alignItems: 'center', gap: 12, paddingVertical: 40 },
    doneEmoji: { fontSize: 54 },
    doneTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
    doneSub: { color: colors.subtext, fontSize: 16, fontWeight: '600', textAlign: 'center', paddingHorizontal: 20 },
  });
