// Day guidance — a gentle, date-based daily/monthly/yearly focus.
//
// This is deliberately framed as a PRACTICAL planning nudge, not numerology:
// the UI never shows the underlying number or any "energy" language. It surfaces
// a plain human headline ("A good day for → Family & home") plus three cues
// (Good for / Go easy on / Focus). The number is only an internal lookup key.
//
// The computation + the long-form prose are ported verbatim from the original
// Calendar implementation so results stay identical; only the presentation changed.

export type GuidanceScope = 'day' | 'month' | 'year';

export type DayGuidance = {
  scope: GuidanceScope;
  // user-facing copy (no number, no "energy")
  kicker: string; // e.g. "A good day for"
  headline: string; // e.g. "Family & home"
  subline: string; // one plain line
  good: string[]; // ✅ Good for
  careful: string[]; // ⚠️ Go easy on
  focus: string[]; // 🎯 Focus
  longText: string; // fuller note, used by month/year "read more" (empty for day)
};

// ---- number computation (ported 1:1 from CalendarScreen) ---------------------

function reduceToSingleDigit(value: number): number {
  let next = Math.abs(Math.trunc(value));
  while (next > 9) {
    next = String(next)
      .split('')
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return next === 0 ? 9 : next;
}

function calculatePersonalYearNumber(year: number, birth: { day: number; month: number }): number {
  const generalYear = reduceToSingleDigit(year);
  return reduceToSingleDigit(generalYear + birth.day + birth.month);
}

export function parseBirthDate(value?: string): { day: number; month: number } | null {
  if (!value) return null;
  const raw = value.trim();
  const dotted = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const day = Number(dotted?.[1] || iso?.[3]);
  const month = Number(dotted?.[2] || iso?.[2]);
  if (!day || !month || day < 1 || day > 31 || month < 1 || month > 12) return null;
  return { day, month };
}

export function todayDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function numberForScope(dateKey: string, birth: { day: number; month: number }, scope: GuidanceScope): number | null {
  const [yearText, monthText, dayText] = dateKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return null;
  const personalYear = calculatePersonalYearNumber(year, birth);
  if (scope === 'year') return personalYear;
  const personalMonth = reduceToSingleDigit(personalYear + month);
  if (scope === 'month') return personalMonth;
  return reduceToSingleDigit(personalMonth + day);
}

// ---- practical copy (no number shown) ----------------------------------------

type CopyEntry = {
  verb: 'to' | 'for'; // "A good day to take the lead" vs "A good day for family & home"
  headline: string;
  subline: string;
  good: string[];
  careful: string[];
  focus: string[];
};

const COPY: Record<number, CopyEntry> = {
  1: {
    verb: 'to',
    headline: 'Take the lead',
    subline: "Take the first step — don't wait for the perfect moment.",
    good: ['start something new', 'take initiative', 'set a clear direction'],
    careful: ['waiting too long', 'rushing without a plan', 'self-doubt'],
    focus: ['movement', 'clarity', 'self-trust'],
  },
  2: {
    verb: 'for',
    headline: 'People & gentle talks',
    subline: 'Mind your words and keep things calm.',
    good: ['relationships', 'gentle conversations', 'cooperation'],
    careful: ['reacting emotionally', 'people-pleasing', 'avoiding honest dialogue'],
    focus: ['balance', 'patience', 'connection'],
  },
  3: {
    verb: 'to',
    headline: 'Think it through',
    subline: 'Take your time and rely on logic before acting.',
    good: ['analysis', 'planning', 'learning'],
    careful: ['impulsive decisions', 'ignoring details', 'mixed signals'],
    focus: ['logic', 'clarity', 'good judgment'],
  },
  4: {
    verb: 'for',
    headline: 'Steady, grounding work',
    subline: 'Reactions may run high — staying balanced is key.',
    good: ['stable routines', 'organizing life', 'grounding yourself'],
    careful: ['negativity', 'scattered emotions', 'overreacting'],
    focus: ['inner balance', 'structure', 'consistency'],
  },
  5: {
    verb: 'to',
    headline: 'Go with the flow',
    subline: 'Great for trying something new and shifting things up.',
    good: ['change', 'movement', 'trying something new'],
    careful: ['chaos', 'distraction', 'risky choices'],
    focus: ['flexibility', 'momentum', 'adaptation'],
  },
  6: {
    verb: 'for',
    headline: 'Family & home',
    subline: 'Nurture connection and keep things calm.',
    good: ['family time', 'relationships', 'beauty and comfort'],
    careful: ['drama', 'emotional overload', 'indecision'],
    focus: ['care', 'harmony', 'warmth'],
  },
  7: {
    verb: 'to',
    headline: 'Slow down & rest',
    subline: 'Give yourself space to reflect and recharge.',
    good: ['rest', 'reflection', 'health check-ins'],
    careful: ['overloading your schedule', 'anxiety spirals', 'pushing through exhaustion'],
    focus: ['awareness', 'recovery', 'inner clarity'],
  },
  8: {
    verb: 'for',
    headline: 'Work & results',
    subline: 'Channel energy into practical, productive tasks.',
    good: ['work', 'structure', 'practical progress'],
    careful: ['pressure', 'rigidity', 'money stress'],
    focus: ['discipline', 'results', 'follow-through'],
  },
  9: {
    verb: 'to',
    headline: 'Wrap things up',
    subline: "Finish what's unfinished and let go of what's done.",
    good: ['finishing tasks', 'decluttering', 'letting go'],
    careful: ['holding on too tightly', 'emotional heaviness', 'forcing new starts'],
    focus: ['closure', 'release', 'space for the new'],
  },
};

const SCOPE_WORD: Record<GuidanceScope, string> = { day: 'day', month: 'month', year: 'year' };

// Fuller prose (ported verbatim) — shown only behind month/year "read more".
function getLongText(value: number, scope: GuidanceScope): string {
  if (scope === 'day') return '';
  return LONG[value]?.[scope] || '';
}

const LONG: Record<number, { month: string; year: string }> = {
  1: {
    month:
      'Focus on starting and taking initiative.\nThis is the time to set direction and take action.\n\nIn the positive:\nenergy, determination, momentum\n\nIn the negative:\npressure, rushing\n\nRecommendations:\n- start what you have been postponing\n- take initiative\n- set a clear direction\n\nEssence:\ntake responsibility and initiative into your own hands',
    year:
      'A year of new beginnings and the start of a new life cycle.\n\nThis is a time to take initiative, put yourself out there, and launch new projects, ideas, and directions. It is a period for shaping your path and identity.\n\nThis year lays the foundation for the next 9-year cycle, so it is important to use it intentionally and not miss opportunities for growth and new starts.\n\nIn the positive:\ngrowth, forward movement, new opportunities, a sense of purpose, successful beginnings.\n\nIn the negative:\nfears, doubts, low energy, anxiety, feeling lost or unsure of your direction.\n\nRecommendations:\n- start new things without delay\n- take action, even in small steps\n- do not get stuck in fear or overthinking\n- express yourself and show up\n- maintain your energy through movement and activity\n\nEssence:\nthis is a starting point. Your actions will determine whether this year becomes a foundation for long-term growth or a period of stagnation.',
  },
  2: {
    month:
      'Focus on interaction and balance.\nWhat matters is how you build relationships with others.\n\nIn the positive:\nsupport, softness, mutual understanding\n\nIn the negative:\nsensitivity, emotional dependency\nconflicts or misunderstandings with a partner or friends\n\nRecommendations:\n- build open communication\n- be more flexible\n- avoid reacting emotionally\n- maintain connection instead of breaking it\n\nEssence:\nalign your relationships',
    year:
      'A year of relationships and interaction with others.\n\nThis is a time to build connections, develop partnerships, and cultivate patience, softness, and diplomacy.\n\nThis year is focused on strengthening what has already been started, as well as developing skills in communication, psychology, partnership, and overall interaction with people. It is important to consciously improve your diplomacy, emotional intelligence, and relationship-building abilities.\n\nIn the positive:\nharmony, creating and strengthening relationships, support, partnerships, improved communication. Favorable for marriage, starting a family, having children, forming alliances, and building long-term connections.\n\nIn the negative:\nresentment, emotional ups and downs, tendency toward depression, conflicts. There may be a desire to break off relationships, separate from a partner, lose connections with friends and partners, and even destroy agreements or business relationships.\n\nRecommendations:\n- build and strengthen relationships\n- develop communication, diplomacy, and psychological skills\n- avoid making emotional decisions\n- practice patience and flexibility\n- maintain and protect important connections\n\nEssence:\nthis is a year of relationships. The stronger your ability to interact with others, the more stable your life and future results will be.',
  },
  3: {
    month:
      'Focus on decisions and thinking.\nIt is important to understand what you are doing, not rush.\n\nIn the positive:\nclarity, successful decisions\n\nIn the negative:\nimpulsiveness, self-deception\n\nRecommendations:\n- analyze before acting\n- do not trust emotions immediately\n- think a few steps ahead\n\nEssence:\nthink before you act',
    year:
      'A year of learning, analysis, and thoughtful decision-making.\n\nThis is a period where it is important to think clearly, go into details, and make decisions based on logic rather than emotions.\n\nIt is a productive year: with the right approach, it brings results, valuable experience, and a clearer understanding of what to do next.\n\nIn the positive:\nclarity, successful decisions, growth through learning and analysis, useful insights, and forward movement with understanding.\n\nIn the negative:\nillusions, overconfidence, excitement, impulsive decisions without proper calculation.\n\nRecommendations:\n- analyze every important decision\n- think several steps ahead\n- pay attention to details and avoid superficial actions\n- focus on learning and developing your knowledge\n- stay rational and avoid emotional decisions\n\nEssence:\nthis is a year where results depend on your mindset. The more analytical and conscious you are, the more value and growth you gain.',
  },
  4: {
    month:
      'Focus on your state and perception.\nHow you respond affects everything.\n\nIn the positive:\ncalmness, inner control\n\nIn the negative:\nnegativity, dissatisfaction\nirritation, tendency to devalue everything\n\nRecommendations:\n- monitor your state\n- avoid negativity\n- maintain inner balance\n\nEssence:\ncontrol your state and develop a positive mindset',
    year:
      'A year of unpredictable events and unexpected situations.\n\nThings may not go according to plan, so it is important to stay calm and not overreact.\n\nThis period is strongly connected to your inner state. How you perceive and respond to what is happening will define your experience.\n\nIn the positive:\npositive unexpected events\nnew opportunities through unusual situations\ninsights and deeper understanding\ninner growth\n\nIn the negative:\nanxiety, overthinking\na sense of instability\nnegative emotional state\nconstant dissatisfaction\na sarcastic or cynical attitude\n\nRecommendations:\n- stay focused on your goals\n- remain calm in any situation\n- manage your emotional state\n- consciously choose positivity and gratitude\n- do not fixate on what is not working\n\nEssence:\nthis is a year where your inner state shapes your reality. The more positive and balanced you are, the smoother everything unfolds.',
  },
  5: {
    month:
      'Focus on change and movement.\nA time to avoid staying stuck.\n\nIn the positive:\nnew opportunities, momentum\nexpansion, new experiences\n\nIn the negative:\nbreakdown of logic\nimpulsive decisions\n\nRecommendations:\n- try new things\n- travel, change your environment, take breaks\n- stay flexible\n- keep your focus\n\nEssence:\nmove and expand',
    year:
      'A year of change, movement, and new opportunities.\n\nThis is a period when life accelerates: new events, people, and directions appear. It is important to stay flexible and open to change.\n\nIn the positive:\nchange and new opportunities\nrelocations, travel, lifestyle changes\nexpansion, scaling, growth\nnew connections and networking\nvisibility and personal image building\n\nIn the negative:\nimpulsiveness and chaotic actions\nlack of logic and strategy\nhasty decisions\ninstability due to lack of focus\n\nRecommendations:\n- use opportunities for growth and scaling\n- travel, change your environment, try new things\n- show yourself and develop your personal brand\n- consider launching or expanding a business\n- make decisions consciously, not impulsively\n- maintain focus and logical thinking\n\nEssence:\nthis is a year of change and expansion. The more actively you use opportunities and adapt to change, the more you grow and move to the next level.',
  },
  6: {
    month:
      'Focus on close relationships and emotions.\nWhat happens in your personal life is key.\n\nIn the positive:\nwarmth, harmony, support\n\nIn the negative:\ndrama, emotional ups and downs\ndifficulty making choices\n\nRecommendations:\n- give attention to relationships\n- avoid emotional overload\n- make conscious choices\n\nEssence:\nmaintain harmony',
    year:
      'A year of love, relationships, and choices.\n\nThis is a period where the main focus is on emotions, family, and close connections.\n\nIt is a year to learn how to love, accept, and make conscious choices in relationships.\n\nIn the positive:\nlove, harmony, warm relationships\ncloser connection with partner and family\nstrengthening bonds\ncare and support\n\nIn the negative:\nheightened emotions and sensitivity\nchallenges in relationships\nconflicts and emotional stress\ndifficulty making decisions\n\nRecommendations:\n- learn to love and accept\n- work on your relationships\n- give attention to family and loved ones\n- make conscious choices\n- avoid emotional drama\n\nEssence:\nthis is a year of love and choice. The decisions you make in relationships will define your harmony and emotional state.',
  },
  7: {
    month:
      'Focus on inner work.\nA period of transformation, inner and spiritual growth.\n\nIn the positive:\ndepth, awareness\ninner and spiritual growth\n\nIn the negative:\nchaos, anxiety\noverthinking, possible physical vulnerability\n\nRecommendations:\n- slow down and listen to yourself\n- dedicate time to inner development\n- practices: yoga, meditation\n- take care of your health\n- do check-ups\n\nEssence:\ngo inward and grow from within',
    year:
      'A year of transformation, deep reflection, and inner change.\n\nThis is a period when powerful events may occur, disrupting your usual stability. The key is to go through these experiences consciously and come out with a new level of awareness.\n\nThis year often brings crisis moments, but they are necessary for growth and transformation.\n\nIn the positive:\ntransformation of consciousness\ndeep inner changes\nmental discipline and self-awareness\nre-evaluation of values\nrapid realizations and growth\n\nIn the negative:\ncrisis situations\nfeeling like the ground is being pulled from under you\nsuffering and emotional stress\nblaming others\nemotional instability\n\nRecommendations:\n- maintain mental discipline\n- treat challenges as opportunities for growth\n- avoid falling into negativity and suffering\n- do not blame others\n- work on your inner state (meditation, stillness, awareness)\n- avoid major purchases\n- do not sell real estate\n- secure your money and avoid impulsive spending\n- avoid medical operations if possible\n\nImportant:\n- this year requires financial caution\n- focus on preserving rather than risking\n- events may unfold quickly, so staying grounded is essential\n\nEssence:\nthis is a year of transformation through challenges. The more awareness and inner discipline you maintain, the stronger your growth and outcome will be.',
  },
  8: {
    month:
      'Focus on work and results.\nWhat matters is what you actually do.\n\nIn the positive:\nproductivity, money\n\nIn the negative:\noverload, pressure\nrigidity in actions\n\nRecommendations:\n- work systematically\n- maintain discipline\n- focus on results\n\nEssence:\ndeliver results',
    year:
      'A year of work, responsibility, and the realization of accumulated experience.\n\nThis is a period when you receive results based on your past actions and efforts. The main focus is on learning, working, and building practical skills.\n\nThis year requires discipline and strong focus on what you do.\n\nIn the positive:\nrealization of accumulated experience\nmoney as a result of your actions\ngrowth through work and skills\nprofessional development\nstable income with the right approach\n\nIn the negative:\npressure and overload\nmistakes due to greed or rushing\nfinancial difficulties from poor decisions\nnegative consequences of impulsive actions\n\nRecommendations:\n- focus on work and learning\n- build skills that generate income\n- act consistently and steadily\n- earn rather than take risks\n- avoid rapid business expansion\n- do not take loans or credits\n- avoid major commitments\n- avoid registering a marriage or business\n- do not scale aggressively\n\nImportant:\n- this is a year of results: your outcomes reflect your past actions\n- if your foundation is strong, money and opportunities may come\n- avoid trying to rush or skip stages\n\nEssence:\nthis is a year to work, build, and stabilize. The more discipline and focus you have, the stronger your financial results and future stability will be.',
  },
  9: {
    month:
      'Focus on completion.\nA time to let go and close cycles.\n\nIn the positive:\nrelease, completion\n\nIn the negative:\ntension, resistance\nfear of letting go\n\nRecommendations:\n- finish what is unfinished\n- do not hold on to the past\n- accept changes\n\nEssence:\nlet go and complete',
    year:
      'A year of completion, reset, and deep transformation.\n\nThis is a period when a full life cycle comes to an end: people, situations, and projects may leave, and your lifestyle can change.\n\nIt is important to accept what is happening and not resist change.\n\nIn the positive:\nconscious completion of cycles\nacceptance of change\ninner strength and maturity\nrenewal through endings\nservice and helping others\nthe opportunity to start a new life after a reset\n\nIn the negative:\nlosses and breakdowns\nresistance to change\nstress, fear, emotional overload\nintense life situations\n\nRecommendations:\n- accept changes calmly\n- do not resist endings\n- develop inner strength, patience, and humility\n- take care of your health and body\n- include physical activity and sports\n- focus on service and helping others\n- let go of the past\n\nImportant:\n- significant life changes and resets may occur\n- people or important phases may come to an end\n- children may be born as a sign of a new cycle\n- pay special attention to your health\n- preparation for a new cycle (Personal Year 1)\n\nEssence:\nthis is a year of completion. The more you let go of the old, the easier it is to begin a new chapter.',
  },
};

/**
 * Returns the practical, number-free guidance for a scope, or null if there is
 * no usable birth date (the feature needs it). `dateKey` is a YYYY-MM-DD string.
 */
export function getDayGuidance(birthDateValue: string | undefined, dateKey: string, scope: GuidanceScope): DayGuidance | null {
  const birth = parseBirthDate(birthDateValue);
  if (!birth) return null;
  const value = numberForScope(dateKey, birth, scope);
  if (!value) return null;
  const c = COPY[value] || COPY[1];
  return {
    scope,
    kicker: `A good ${SCOPE_WORD[scope]} ${c.verb}`,
    headline: c.headline,
    subline: c.subline,
    good: c.good,
    careful: c.careful,
    focus: c.focus,
    longText: getLongText(value, scope),
  };
}
