import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { ThemeColors, useThemeColors } from '@/theme/theme';
import { StaffRolePreset } from '@/types/app';

// A post-registration wizard: the owner just created their account and now sets up the
// rest of the household in one guided flow — a second parent, children (little ones
// included, login optional) and staff — and walks away with a share link for everyone
// who needs their own login. Everything here is also reachable later from Settings.

export type OnboardChildInput = { id: string; name: string; year: string; sex: 'boy' | 'girl'; ownLogin: boolean };
export type OnboardStaffInput = { id: string; name: string; role: StaffRolePreset };
export type OnboardPayload = {
  coparent: { name: string; label: 'Mom' | 'Dad' } | null;
  children: OnboardChildInput[];
  staff: OnboardStaffInput[];
};
export type OnboardResult = { key: string; kind: 'coparent' | 'child' | 'staff'; name: string; sub: string; link: string | null };

type Props = {
  visible: boolean;
  ownerName: string;
  defaultLabel: 'Mom' | 'Dad';
  onBuild: (payload: OnboardPayload) => Promise<OnboardResult[]>;
  onClose: () => void;
};

type Step = 'welcome' | 'who' | 'coparent' | 'children' | 'staff' | 'building' | 'done';

const ROLE_OPTIONS: { key: StaffRolePreset; label: string }[] = [
  { key: 'nanny', label: 'Nanny' },
  { key: 'cook', label: 'Cook' },
  { key: 'driver', label: 'Driver' },
  { key: 'housekeeper', label: 'Housekeeper' },
  { key: 'assistant', label: 'Assistant' },
];

let seq = 0;
const nextId = () => `ob-${++seq}`;
const emptyChild = (): OnboardChildInput => ({ id: nextId(), name: '', year: '', sex: 'girl', ownLogin: false });
const emptyStaff = (): OnboardStaffInput => ({ id: nextId(), name: '', role: 'nanny' });

export function FamilyOnboarding({ visible, ownerName, defaultLabel, onBuild, onClose }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [step, setStep] = useState<Step>('welcome');
  const [who, setWho] = useState({ coparent: false, children: false, staff: false });
  const [cpName, setCpName] = useState('');
  const [kids, setKids] = useState<OnboardChildInput[]>([emptyChild()]);
  const [staff, setStaff] = useState<OnboardStaffInput[]>([emptyStaff()]);
  const [results, setResults] = useState<OnboardResult[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Reset to the first step each time the wizard is opened afresh.
  useEffect(() => {
    if (visible) {
      setStep('welcome');
      setCopiedKey(null);
    }
  }, [visible]);

  const activeInputs = useMemo<Step[]>(() => {
    const s: Step[] = [];
    if (who.coparent) s.push('coparent');
    if (who.children) s.push('children');
    if (who.staff) s.push('staff');
    return s;
  }, [who]);

  const progressSteps: Step[] = ['welcome', 'who', ...activeInputs, 'done'];
  const progressIndex = Math.max(0, progressSteps.indexOf(step === 'building' ? 'done' : step));

  async function startBuild() {
    setStep('building');
    const payload: OnboardPayload = {
      coparent: who.coparent ? { name: cpName.trim(), label: defaultLabel } : null,
      children: who.children ? kids.filter((k) => k.name.trim()) : [],
      staff: who.staff ? staff.filter((s) => s.name.trim()) : [],
    };
    try {
      const res = await onBuild(payload);
      setResults(res);
    } catch {
      setResults([]);
    }
    setStep('done');
  }

  function goAfter(current: Step) {
    if (current === 'who') {
      if (activeInputs.length) setStep(activeInputs[0]);
      else startBuild();
      return;
    }
    const idx = activeInputs.indexOf(current);
    if (idx >= 0 && idx < activeInputs.length - 1) setStep(activeInputs[idx + 1]);
    else startBuild();
  }

  function copy(key: string, link: string) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(link);
    } catch {
      /* ignore clipboard errors */
    }
    setCopiedKey(key);
  }

  const anySelected = who.coparent || who.children || who.staff;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {step !== 'welcome' && step !== 'building' ? (
            <View style={styles.progressWrap}>
              <Text style={styles.progressStep}>Step {progressIndex + 1} of {progressSteps.length}</Text>
              <View style={styles.progress}>
                {progressSteps.map((s, i) => (
                  <View key={s + i} style={[styles.progressBar, i <= progressIndex && styles.progressBarOn]} />
                ))}
              </View>
            </View>
          ) : null}

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
            {step === 'welcome' ? (
              <View>
                <Text style={[styles.q, styles.center, styles.welcomeTop]}>Welcome, {ownerName || 'there'}!</Text>
                <Text style={[styles.sub, styles.center]}>Let&apos;s set up your family. It takes a minute — you can invite everyone with a link.</Text>
              </View>
            ) : null}

            {step === 'who' ? (
              <View>
                <Text style={styles.q}>Who would you like to add?</Text>
                <Text style={styles.sub}>Set up profiles for the people you share family life with.</Text>
                <WhoOption label="Partner" hint="Shares planning, calendars and shopping" on={who.coparent} onToggle={() => setWho((w) => ({ ...w, coparent: !w.coparent }))} styles={styles} />
                <WhoOption label="Children" hint="Profiles — with a login for older kids" on={who.children} onToggle={() => setWho((w) => ({ ...w, children: !w.children }))} styles={styles} />
                <WhoOption label="Household staff" hint="A nanny, cook or helper with task access" on={who.staff} onToggle={() => setWho((w) => ({ ...w, staff: !w.staff }))} styles={styles} />
              </View>
            ) : null}

            {step === 'coparent' ? (
              <View>
                <Text style={styles.q}>Your partner</Text>
                <Text style={styles.sub}>They sign in with their own account and share this exact household — same tasks, calendar and shopping. Both of you have full access.</Text>
                <TextInput style={styles.input} placeholder="Their name" placeholderTextColor={colors.subtext} value={cpName} onChangeText={setCpName} />
              </View>
            ) : null}

            {step === 'children' ? (
              <View>
                <Text style={styles.q}>Add your children</Text>
                <Text style={styles.sub}>Add everyone — even little ones. Turn on a login only for kids old enough to use their own account.</Text>
                {kids.map((k, i) => (
                  <View key={k.id} style={styles.rowCard}>
                    <View style={styles.inlineRow}>
                      <TextInput style={[styles.input, styles.flex1, styles.mb0]} placeholder="Name" placeholderTextColor={colors.subtext} value={k.name} onChangeText={(v) => setKids((arr) => arr.map((x) => (x.id === k.id ? { ...x, name: v } : x)))} />
                      <TextInput style={[styles.input, styles.yearInput, styles.mb0]} placeholder="Year" placeholderTextColor={colors.subtext} keyboardType="number-pad" maxLength={4} value={k.year} onChangeText={(v) => setKids((arr) => arr.map((x) => (x.id === k.id ? { ...x, year: v.replace(/[^0-9]/g, '') } : x)))} />
                    </View>
                    <View style={styles.segRow}>
                      {(['girl', 'boy'] as const).map((sx) => (
                        <Pressable key={sx} style={[styles.seg, k.sex === sx && styles.segOn]} onPress={() => setKids((arr) => arr.map((x) => (x.id === k.id ? { ...x, sex: sx } : x)))}>
                          <Text style={[styles.segText, k.sex === sx && styles.segTextOn]}>{sx === 'girl' ? 'Girl' : 'Boy'}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.switchRow}>
                      <View style={styles.flex1}>
                        <Text style={styles.switchLabel}>Give {k.name.trim() || 'them'} their own login</Text>
                        <Text style={styles.switchHint}>{k.ownLogin ? 'Standard kid access — adjust in Settings' : 'Part of the family — no login needed yet'}</Text>
                      </View>
                      <Switch value={k.ownLogin} onValueChange={(v) => setKids((arr) => arr.map((x) => (x.id === k.id ? { ...x, ownLogin: v } : x)))} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#ffffff" />
                    </View>
                    {kids.length > 1 ? (
                      <Pressable onPress={() => setKids((arr) => arr.filter((x) => x.id !== k.id))} style={styles.removeRow}>
                        <Text style={styles.removeText}>Remove</Text>
                      </Pressable>
                    ) : null}
                    {i < kids.length - 1 ? <View style={styles.rowDivider} /> : null}
                  </View>
                ))}
                <Pressable onPress={() => setKids((arr) => [...arr, emptyChild()])} style={styles.addRow}>
                  <Text style={styles.addText}>＋ Add another child</Text>
                </Pressable>
              </View>
            ) : null}

            {step === 'staff' ? (
              <View>
                <Text style={styles.q}>Household help</Text>
                <Text style={styles.sub}>Pick a role — we preset what they can see. You can fine-tune later in Settings.</Text>
                {staff.map((s) => (
                  <View key={s.id} style={styles.rowCard}>
                    <TextInput style={[styles.input, styles.mb8]} placeholder="Name" placeholderTextColor={colors.subtext} value={s.name} onChangeText={(v) => setStaff((arr) => arr.map((x) => (x.id === s.id ? { ...x, name: v } : x)))} />
                    <View style={styles.chips}>
                      {ROLE_OPTIONS.map((r) => (
                        <Pressable key={r.key} style={[styles.chip, s.role === r.key && styles.chipOn]} onPress={() => setStaff((arr) => arr.map((x) => (x.id === s.id ? { ...x, role: r.key } : x)))}>
                          <Text style={[styles.chipText, s.role === r.key && styles.chipTextOn]}>{r.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {staff.length > 1 ? (
                      <Pressable onPress={() => setStaff((arr) => arr.filter((x) => x.id !== s.id))} style={styles.removeRow}>
                        <Text style={styles.removeText}>Remove</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <Pressable onPress={() => setStaff((arr) => [...arr, emptyStaff()])} style={styles.addRow}>
                  <Text style={styles.addText}>＋ Add another</Text>
                </Pressable>
              </View>
            ) : null}

            {step === 'building' ? (
              <View style={styles.buildingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.sub, styles.center, { marginTop: 14 }]}>Setting up your family…</Text>
              </View>
            ) : null}

            {step === 'done' ? (
              <View>
                <Text style={[styles.q, styles.center, styles.welcomeTop]}>Your family is ready</Text>
                <Text style={[styles.sub, styles.center]}>Send a link to everyone who has a login. Little ones are already in your family — no link needed.</Text>
                {results.length === 0 ? (
                  <Text style={[styles.sub, styles.center, { marginTop: 12 }]}>Nothing added yet — you can invite anyone anytime from Settings.</Text>
                ) : (
                  results.map((m) => (
                    <View key={m.key} style={styles.member}>
                      <View style={[styles.memberAva, m.kind === 'coparent' ? styles.avaP : m.kind === 'child' ? styles.avaC : styles.avaS]}>
                        <Text style={[styles.memberAvaText, m.kind === 'coparent' ? styles.avaPText : m.kind === 'child' ? styles.avaCText : styles.avaSText]}>{(m.name || '?').charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.flex1}>
                        <Text style={styles.memberName}>{m.name || 'Member'}</Text>
                        <Text style={styles.memberSub}>{m.sub}</Text>
                      </View>
                      {m.link ? (
                        <Pressable style={styles.linkBtn} onPress={() => copy(m.key, m.link!)}>
                          <Text style={styles.linkBtnText}>{copiedKey === m.key ? 'Copied ✓' : 'Copy link'}</Text>
                        </Pressable>
                      ) : (
                        <Text style={styles.noLink}>No login</Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </ScrollView>

          {/* Footer buttons per step */}
          {step === 'welcome' ? (
            <View style={styles.footer}>
              <Pressable style={styles.primaryBtn} onPress={() => setStep('who')}>
                <Text style={styles.primaryBtnText}>Set up my family</Text>
              </Pressable>
              <Pressable style={styles.ghostBtn} onPress={onClose}>
                <Text style={styles.ghostBtnText}>Skip for now</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'who' ? (
            <View style={styles.footer}>
              <Pressable style={[styles.primaryBtn, !anySelected && styles.primaryBtnDisabled]} disabled={!anySelected} onPress={() => goAfter('who')}>
                <Text style={[styles.primaryBtnText, !anySelected && styles.primaryBtnTextDisabled]}>Continue</Text>
              </Pressable>
              <Pressable style={styles.ghostBtn} onPress={onClose}>
                <Text style={styles.ghostBtnText}>Skip for now</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'coparent' || step === 'children' || step === 'staff' ? (
            <View style={styles.footer}>
              <Pressable style={styles.primaryBtn} onPress={() => goAfter(step)}>
                <Text style={styles.primaryBtnText}>Continue</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'done' ? (
            <View style={styles.footer}>
              <Pressable style={styles.primaryBtn} onPress={onClose}>
                <Text style={styles.primaryBtnText}>Done — go to my family</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function WhoOption({ label, hint, on, onToggle, styles }: { label: string; hint: string; on: boolean; onToggle: () => void; styles: ReturnType<typeof makeStyles> }) {
  return (
    <Pressable style={[styles.whoOpt, on && styles.whoOptOn]} onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
      {on ? <View style={styles.whoRail} /> : null}
      <View style={styles.flex1}>
        <Text style={styles.whoLabel}>{label}</Text>
        <Text style={styles.whoHint}>{hint}</Text>
      </View>
      <View style={[styles.checkbox, on && styles.checkboxOn]}>{on ? <Text style={styles.checkboxTick}>✓</Text> : null}</View>
    </Pressable>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(15,20,30,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    card: { width: '100%', maxWidth: 460, maxHeight: '92%', backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden' },
    progressWrap: { paddingHorizontal: 20, paddingTop: 16 },
    progressStep: { fontSize: 11, fontWeight: '600', color: colors.subtext, textAlign: 'right', marginBottom: 6 },
    progress: { flexDirection: 'row', gap: 6 },
    progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
    progressBarOn: { backgroundColor: colors.primary },
    scroll: { flexGrow: 0 },
    scrollBody: { padding: 22 },
    center: { textAlign: 'center' },
    welcomeTop: { marginTop: 6 },
    q: { fontSize: 21, fontWeight: '800', color: colors.text, letterSpacing: -0.3, marginBottom: 4 },
    sub: { fontSize: 13.5, color: colors.subtext, lineHeight: 19 },
    input: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14.5, color: colors.text, marginBottom: 10, outlineWidth: 0, outlineColor: 'transparent' },
    mb0: { marginBottom: 0 },
    mb8: { marginBottom: 8 },
    flex1: { flex: 1, minWidth: 0 },
    inlineRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    yearInput: { width: 84, textAlign: 'center' },
    segRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    seg: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 9, alignItems: 'center', backgroundColor: colors.surfaceAlt },
    segOn: { borderColor: colors.primary, backgroundColor: colors.selection },
    segText: { fontSize: 13, fontWeight: '700', color: colors.subtext },
    segTextOn: { color: colors.primary },
    whoOpt: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingVertical: 14, paddingLeft: 16, paddingRight: 14, marginTop: 12, minHeight: 64, backgroundColor: colors.surface },
    whoOptOn: { borderColor: colors.primary, backgroundColor: colors.selection },
    whoRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.primary },
    whoLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    whoHint: { fontSize: 11.5, color: colors.subtext, marginTop: 1 },
    checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    checkboxOn: { borderColor: colors.primary, backgroundColor: colors.primary },
    checkboxTick: { color: '#ffffff', fontSize: 14, fontWeight: '900', lineHeight: 17 },
    rowCard: { marginTop: 6 },
    rowDivider: { height: 1, backgroundColor: colors.border, marginTop: 12, marginBottom: 2 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 11, backgroundColor: colors.surfaceAlt },
    switchLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
    switchHint: { fontSize: 11, color: colors.subtext, marginTop: 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
    chipOn: { backgroundColor: colors.selection, borderColor: colors.primary },
    chipText: { fontSize: 12, fontWeight: '700', color: colors.subtext },
    chipTextOn: { color: colors.primary },
    addRow: { paddingVertical: 10 },
    addText: { fontSize: 13, fontWeight: '800', color: colors.primary },
    removeRow: { paddingVertical: 6 },
    removeText: { fontSize: 12, fontWeight: '700', color: colors.urgent },
    buildingBox: { paddingVertical: 40, alignItems: 'center' },
    member: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, marginTop: 8, backgroundColor: colors.surfaceAlt },
    memberAva: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    memberAvaText: { fontSize: 14, fontWeight: '800' },
    avaP: { backgroundColor: 'rgba(122,92,240,0.16)' },
    avaPText: { color: '#7a5cf0' },
    avaC: { backgroundColor: colors.selection },
    avaCText: { color: colors.primary },
    avaS: { backgroundColor: 'rgba(47,158,111,0.16)' },
    avaSText: { color: '#2f9e6f' },
    memberName: { fontSize: 13, fontWeight: '700', color: colors.text },
    memberSub: { fontSize: 10.5, color: colors.subtext, marginTop: 1 },
    linkBtn: { backgroundColor: colors.selection, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    linkBtnText: { fontSize: 11.5, fontWeight: '800', color: colors.primary },
    noLink: { fontSize: 11, fontWeight: '600', color: colors.subtext },
    footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
    primaryBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
    primaryBtnDisabled: { backgroundColor: colors.border },
    primaryBtnText: { color: '#ffffff', fontSize: 14.5, fontWeight: '800' },
    primaryBtnTextDisabled: { color: colors.subtext },
    ghostBtn: { paddingVertical: 8, alignItems: 'center' },
    ghostBtnText: { color: colors.subtext, fontSize: 13, fontWeight: '600' },
  });
}
