import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChildWord } from '@/types/app';
import { ThemeColors, useThemeColors } from '@/theme/theme';

// 'listen' = hear the word, pick the meaning (audio prompt).
// 'fill-blank' = the example sentence with the word blanked out, pick the word.
// 'scramble' = build the word from shuffled letters.
// 'order-sentence' = put the shuffled words of the example into order.
type ExerciseKind =
  | 'choose-translation'
  | 'choose-word'
  | 'listen'
  | 'fill-blank'
  | 'scramble'
  | 'order-sentence'
  | 'type';
type Exercise = {
  word: ChildWord;
  kind: ExerciseKind;
  prompt: string; // what we show (or speak, for 'listen')
  answer: string; // the correct answer text
  options?: string[]; // for multiple choice
  tiles?: string[]; // shuffled tiles for 'scramble' (letters) / 'order-sentence' (words)
  joiner?: string; // how tiles join to form the answer ('' for letters, ' ' for words)
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
  // Exclude/dedupe using the SAME normalization the grader uses (normalize strips
  // accents + trailing punctuation), so no distractor can be graded-equal to the
  // answer — e.g. "si" must not slip past when the answer is "sí".
  const seen = new Set([normalize(exclude)]);
  const out: string[] = [];
  for (const v of shuffle(pool)) {
    const key = normalize(v);
    if (!v.trim() || !key || seen.has(key)) continue;
    seen.add(key);
    out.push(v.trim());
    if (out.length >= n) break;
  }
  return out;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Replace the first occurrence of `term` in `sentence` with a blank. Returns null if
// the word doesn't appear (so we can fall back to another exercise).
function blankSentence(sentence: string, term: string): string | null {
  const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  if (!re.test(sentence)) return null;
  return sentence.replace(re, '_____');
}

// A single word made only of letters (no spaces/phrases), short enough to build.
function isScrambleable(term: string): boolean {
  return /^[\p{L}]{2,12}$/u.test(term.trim());
}

// Split an example sentence into words (keeping punctuation attached) for the
// put-in-order exercise. Only good for short, simple sentences.
function sentenceWords(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean);
}

// Which exercise a word gets. Type is picked at RANDOM from a set that widens as the
// word is learned (recognise → recall → produce), so a session stays varied. If the
// chosen kind doesn't fit this word (e.g. no example sentence), we fall back.
function makeExercise(word: ChildWord, all: ChildWord[]): Exercise {
  const box = word.box || 1;
  const term = word.term.trim();
  const translation = (word.translation || '').trim();
  const example = (word.example || '').trim();
  const otherTranslations = all.map((w) => (w.translation || '').trim()).filter(Boolean);
  const otherTerms = all.map((w) => w.term.trim()).filter(Boolean);

  const buildMeaningOptions = () => {
    const distractors = (word.distractors || []).map((d) => d.trim()).filter(Boolean);
    const filled = [...distractors];
    if (filled.length < 3) filled.push(...pickDistinct(otherTranslations, translation, 3 - filled.length));
    return shuffle([translation, ...pickDistinct(filled, translation, 3)]);
  };
  const wordOptions = () => shuffle([term, ...pickDistinct(otherTerms, term, 3)]);

  const build = (kind: ExerciseKind): Exercise | null => {
    switch (kind) {
      case 'type':
        // Produce the LEARNED word from its meaning (real recall + spelling), not the
        // native translation. Accents are forgiven by the grader.
        return { word, kind, prompt: translation, answer: term };
      case 'choose-word':
        return { word, kind, prompt: translation, answer: term, options: wordOptions() };
      case 'listen':
        return { word, kind, prompt: term, answer: translation, options: buildMeaningOptions() };
      case 'choose-translation':
        return { word, kind, prompt: term, answer: translation, options: buildMeaningOptions() };
      case 'fill-blank': {
        const blanked = example ? blankSentence(example, term) : null;
        if (!blanked) return null;
        return { word, kind, prompt: blanked, answer: term, options: wordOptions() };
      }
      case 'scramble': {
        if (!isScrambleable(term)) return null;
        let tiles = shuffle(term.split(''));
        // Make sure it isn't already spelling the answer.
        if (tiles.join('') === term) tiles = shuffle(tiles);
        return { word, kind, prompt: translation, answer: term, tiles, joiner: '' };
      }
      case 'order-sentence': {
        if (!example) return null;
        const words = sentenceWords(example);
        if (words.length < 3 || words.length > 8) return null; // keep it simple
        let tiles = shuffle(words);
        if (tiles.join(' ') === words.join(' ')) tiles = shuffle(tiles);
        return { word, kind, prompt: term, answer: words.join(' '), tiles, joiner: ' ' };
      }
      default:
        return null;
    }
  };

  const pool: ExerciseKind[] =
    box >= 5
      ? ['type', 'scramble', 'choose-word', 'fill-blank', 'order-sentence']
      : box >= 3
        ? ['choose-word', 'listen', 'fill-blank', 'scramble', 'order-sentence', 'type']
        : ['choose-translation', 'choose-word', 'listen', 'fill-blank'];

  // Try kinds in a random order until one is feasible for this word.
  for (const kind of shuffle(pool)) {
    const ex = build(kind);
    if (ex) return ex;
  }
  // Absolute fallback.
  return build('choose-translation')!;
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

function todayKeyLocal(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

// Build a session that actually honors the spaced-repetition schedule: due reviews
// first, then a capped number of new words, then backfill with the soonest-due words
// if the pool is thin. Without this the Leitner boxes would be computed but ignored.
function buildSession(eligible: ChildWord[]): ChildWord[] {
  const SIZE = 15;
  const NEW_CAP = 6;
  const today = todayKeyLocal();
  const isDue = (w: ChildWord) => (w.dueDate || '0000-00-00') <= today;
  const fresh = shuffle(eligible.filter((w) => (w.box || 1) <= 1));
  const dueReviews = shuffle(eligible.filter((w) => (w.box || 1) >= 2 && isDue(w)));
  const notDue = eligible
    .filter((w) => (w.box || 1) >= 2 && !isDue(w))
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

  const chosen: ChildWord[] = [];
  const add = (w: ChildWord) => {
    if (chosen.length < SIZE && !chosen.includes(w)) chosen.push(w);
  };
  const MIN = 10;
  dueReviews.forEach(add); // all due reviews
  fresh.slice(0, NEW_CAP).forEach(add); // new words, capped
  notDue.forEach(add); // backfill with soonest-due
  // Only add MORE new words past the cap to reach a reasonable minimum session (so a
  // brand-new all-new deck isn't a single 15-cold-word slog, but also isn't just 6).
  fresh.slice(NEW_CAP).forEach((w) => {
    if (chosen.length < MIN) add(w);
  });
  return shuffle(chosen);
}

type Props = {
  words: ChildWord[];
  learnLang: string;
  streak: number;
  // Grade the FIRST attempt of a word for spaced-repetition; returns true if a fruit
  // was awarded (a correct answer, under the daily cap).
  onGrade: (word: ChildWord, correct: boolean) => boolean;
  onSpeak: (text: string, lang: string) => void;
  onClose: () => void;
};

export function WordPractice({ words, learnLang, streak, onGrade, onSpeak, onClose }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const eligible = useMemo(() => words.filter((w) => (w.translation || '').trim()), [words]);
  // Fix the session once so shuffles don't change on re-render.
  const [sessionWords] = useState<ChildWord[]>(() => buildSession(eligible));
  const [queue, setQueue] = useState<Exercise[]>(() => sessionWords.map((w) => makeExercise(w, eligible)));
  // New words (box ≤1) get a flashcard preview BEFORE being quizzed — see it once first.
  const learnWords = useMemo(() => sessionWords.filter((w) => (w.box || 1) <= 1), [sessionWords]);
  const [stage, setStage] = useState<'learn' | 'quiz'>(learnWords.length ? 'learn' : 'quiz');
  const [learnIdx, setLearnIdx] = useState(0);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'ask' | 'feedback' | 'done'>(eligible.length ? 'ask' : 'done');
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [built, setBuilt] = useState<number[]>([]); // tapped letter-tile indices, for 'scramble'
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

  // Auto-play each flashcard word as it's shown in the learn stage.
  useEffect(() => {
    if (stage === 'learn' && learnWords[learnIdx]) onSpeak(learnWords[learnIdx].term, learnLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, learnIdx]);

  // Reset the letter-builder when the question changes.
  useEffect(() => {
    setBuilt([]);
  }, [idx]);

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
  const isBuilder = ex && (ex.kind === 'scramble' || ex.kind === 'order-sentence');
  const builtWord = isBuilder && ex.tiles ? built.map((i) => ex.tiles![i]).join(ex.joiner || '') : '';
  const submitScramble = () => {
    if (phase !== 'ask') return;
    commit(normalize(builtWord) === normalize(ex.answer));
  };
  // "I don't know" — reveal the answer, count it wrong (no fruit), and move on, so a
  // child doesn't tap options at random.
  const dontKnow = () => {
    if (phase !== 'ask') return;
    setSelected(null);
    commit(false);
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

  // LEARN stage — flashcards for the new words before any quiz.
  if (stage === 'learn' && eligible.length > 0 && learnWords[learnIdx]) {
    const w = learnWords[learnIdx];
    const last = learnIdx + 1 >= learnWords.length;
    const advance = () => (last ? setStage('quiz') : setLearnIdx((i) => i + 1));
    return (
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.topRow}>
          <Pressable onPress={onClose} accessibilityLabel="Stop">
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <Text style={styles.learnHint}>New word {learnIdx + 1} / {learnWords.length}</Text>
          <Pressable onPress={() => setStage('quiz')}>
            <Text style={styles.skipText}>Skip →</Text>
          </Pressable>
        </View>
        <View style={styles.flashCard}>
          <Text style={styles.flashKind}>Learn this</Text>
          <View style={styles.promptWordRow}>
            <Text style={styles.promptWord}>{w.term}</Text>
            <Pressable style={styles.speakBtn} accessibilityLabel="Listen" onPress={() => onSpeak(w.term, learnLang)}>
              <Text style={styles.speakBtnText}>🔊</Text>
            </Pressable>
          </View>
          <Text style={styles.flashTranslation}>{w.translation}</Text>
          {w.example ? <Text style={styles.exampleText}>{w.example}</Text> : null}
        </View>
        <Pressable style={styles.primaryBtn} onPress={advance}>
          <Text style={styles.primaryBtnText}>{last ? 'Start practice ▶' : 'Got it →'}</Text>
        </Pressable>
      </ScrollView>
    );
  }

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
              <View style={styles.scoreRow}>
                <View style={styles.scorePill}>
                  <Text style={styles.scoreGood}>✓ {correctCount}</Text>
                  <Text style={styles.scoreLabel}>right</Text>
                </View>
                <View style={styles.scorePill}>
                  <Text style={styles.scoreBad}>✕ {Math.max(0, practiced - correctCount)}</Text>
                  <Text style={styles.scoreLabel}>wrong</Text>
                </View>
              </View>
              {fruits > 0 ? <Text style={styles.doneSub}>+{fruits} 🍎 for your pet</Text> : null}
              {streak > 0 ? <Text style={styles.doneStreak}>🔥 {streak} day{streak === 1 ? '' : 's'} in a row</Text> : null}
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
                : ex.kind === 'fill-blank'
                  ? 'Fill the gap'
                  : ex.kind === 'scramble'
                    ? 'Build the word'
                    : ex.kind === 'order-sentence'
                      ? 'Make a sentence'
                      : 'Pick the meaning'}
        </Text>
        {ex.kind === 'listen' ? (
          <Pressable style={styles.bigSpeak} accessibilityLabel="Play the word" onPress={() => onSpeak(ex.word.term, learnLang)}>
            <Text style={styles.bigSpeakText}>🔊</Text>
            {phase === 'feedback' ? <Text style={styles.bigSpeakWord}>{ex.word.term}</Text> : null}
          </Pressable>
        ) : ex.kind === 'fill-blank' ? (
          <Text style={styles.promptSentence}>{ex.prompt}</Text>
        ) : (
          <View style={styles.promptWordRow}>
            <Text style={styles.promptWord}>{ex.prompt}</Text>
            {ex.kind === 'choose-translation' ? (
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
      ) : isBuilder ? (
        <View>
          {/* The answer being built */}
          <View style={styles.builtRow}>
            {built.length === 0 ? (
              <Text style={styles.builtPlaceholder}>{ex.kind === 'order-sentence' ? 'Tap the words in order…' : 'Tap the letters…'}</Text>
            ) : (
              built.map((li, pos) => (
                <Pressable
                  key={`${li}-${pos}`}
                  style={styles.builtTile}
                  onPress={() => phase === 'ask' && setBuilt((b) => b.filter((_, k) => k !== pos))}
                >
                  <Text style={styles.tileText}>{ex.tiles![li]}</Text>
                </Pressable>
              ))
            )}
          </View>
          {/* Available tiles */}
          <View style={styles.tilesRow}>
            {ex.tiles!.map((ch, i) => {
              const used = built.includes(i);
              return (
                <Pressable
                  key={i}
                  style={[styles.tile, used && styles.tileUsed]}
                  disabled={used || phase !== 'ask'}
                  onPress={() => setBuilt((b) => [...b, i])}
                >
                  <Text style={styles.tileText}>{ch}</Text>
                </Pressable>
              );
            })}
          </View>
          {phase === 'ask' ? (
            <Pressable style={[styles.primaryBtn, !built.length && styles.btnDisabled]} onPress={submitScramble} disabled={!built.length}>
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

      {/* "I don't know" — reveal instead of guessing */}
      {phase === 'ask' ? (
        <Pressable style={styles.dontKnowBtn} onPress={dontKnow}>
          <Text style={styles.dontKnowText}>🤔  I don't know</Text>
        </Pressable>
      ) : null}

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
    promptSentence: { color: colors.text, fontSize: 21, fontWeight: '700', textAlign: 'center', lineHeight: 30 },
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
    builtRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      minHeight: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 2,
      borderBottomColor: colors.border,
      paddingBottom: 12,
      marginBottom: 16,
    },
    builtPlaceholder: { color: colors.subtext, fontSize: 15, fontWeight: '600' },
    builtTile: {
      minWidth: 40,
      height: 48,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: colors.selection,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tilesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
    tile: {
      minWidth: 44,
      height: 52,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileUsed: { opacity: 0.25 },
    tileText: { color: colors.text, fontSize: 22, fontWeight: '800' },
    feedback: { gap: 12, marginTop: 4 },
    feedbackText: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
    feedbackOk: { color: '#16a34a' },
    feedbackNo: { color: '#ef4444' },
    exampleText: { color: colors.subtext, fontSize: 15, fontStyle: 'italic', textAlign: 'center' },
    primaryBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    btnDisabled: { opacity: 0.4 },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    dontKnowBtn: { paddingVertical: 12, alignItems: 'center' },
    dontKnowText: { color: colors.subtext, fontSize: 15, fontWeight: '700' },
    scoreRow: { flexDirection: 'row', gap: 14, marginVertical: 6 },
    scorePill: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 22,
    },
    scoreGood: { color: '#16a34a', fontSize: 26, fontWeight: '900' },
    scoreBad: { color: '#ef4444', fontSize: 26, fontWeight: '900' },
    scoreLabel: { color: colors.subtext, fontSize: 13, fontWeight: '700', marginTop: 2 },
    learnHint: { flex: 1, textAlign: 'center', color: colors.subtext, fontSize: 13, fontWeight: '700' },
    skipText: { color: colors.subtext, fontSize: 14, fontWeight: '700' },
    flashCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingVertical: 30,
      paddingHorizontal: 20,
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    flashKind: { color: colors.primary, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    flashTranslation: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
    doneStreak: { color: '#f97316', fontSize: 16, fontWeight: '800' },
    doneCard: { alignItems: 'center', gap: 12, paddingVertical: 40 },
    doneEmoji: { fontSize: 54 },
    doneTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
    doneSub: { color: colors.subtext, fontSize: 16, fontWeight: '600', textAlign: 'center', paddingHorizontal: 20 },
  });
