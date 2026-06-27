import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { HomeIssue, HomeIssueStatus, HomeIssueUrgency, HomeProvider } from '@/types/app';
import { ThemeColors, useThemeColors } from '@/theme/theme';

type Props = {
  issues: HomeIssue[];
  onIssuesChange: Dispatch<SetStateAction<HomeIssue[]>>;
  providers: HomeProvider[];
  onProvidersChange: Dispatch<SetStateAction<HomeProvider[]>>;
};

const CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: 'plumbing', label: 'Plumbing', emoji: '🚿' },
  { key: 'electrical', label: 'Electrical', emoji: '💡' },
  { key: 'appliance', label: 'Appliance', emoji: '🔌' },
  { key: 'internet', label: 'Internet / TV', emoji: '📶' },
  { key: 'heating', label: 'Heating / AC', emoji: '🌡️' },
  { key: 'furniture', label: 'Furniture', emoji: '🪛' },
  { key: 'doors', label: 'Doors / locks', emoji: '🔑' },
  { key: 'handyman', label: 'Handyman', emoji: '🔧' },
  { key: 'cleaning', label: 'Cleaning', emoji: '🧽' },
  { key: 'other', label: 'Other', emoji: '🏠' },
];

const URGENCY: { key: HomeIssueUrgency; label: string; dot: string }[] = [
  { key: 'urgent', label: 'Urgent', dot: '🔴' },
  { key: 'normal', label: 'Normal', dot: '🟡' },
  { key: 'low', label: 'Low', dot: '🟢' },
];

const URGENCY_ORDER: Record<HomeIssueUrgency, number> = { urgent: 0, normal: 1, low: 2 };

function categoryMeta(key: string) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
}

function firstName(name: string) {
  return name.split(/[\s(]/)[0] || name;
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

export function FixItScreen({ issues, onIssuesChange, providers, onProvidersChange }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Report (quick) modal
  const [reportOpen, setReportOpen] = useState(false);
  const [rTitle, setRTitle] = useState('');
  const [rCategory, setRCategory] = useState('other');
  const [rUrgency, setRUrgency] = useState<HomeIssueUrgency>('normal');

  // Detail / edit modal
  const [editing, setEditing] = useState<HomeIssue | null>(null);
  const [eLocation, setELocation] = useState('');
  const [eDescription, setEDescription] = useState('');

  // Contacts
  const [contactsOpen, setContactsOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<HomeProvider | null>(null);
  const [providerFormOpen, setProviderFormOpen] = useState(false);
  const [pName, setPName] = useState('');
  const [pCategory, setPCategory] = useState('other');
  const [pPhone, setPPhone] = useState('');
  const [pNotes, setPNotes] = useState('');

  const [showDone, setShowDone] = useState(false);

  const activeIssues = useMemo(
    () =>
      issues
        .filter((i) => i.status !== 'done')
        .sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]),
    [issues],
  );
  const doneIssues = useMemo(() => issues.filter((i) => i.status === 'done'), [issues]);

  function providerForCategory(categoryKey: string) {
    return providers.find((p) => p.category === categoryKey);
  }

  function callPhone(phone?: string) {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {});
  }

  function updateIssue(id: string, patch: Partial<HomeIssue>) {
    onIssuesChange((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function setStatus(issue: HomeIssue, status: HomeIssueStatus) {
    updateIssue(issue.id, {
      status,
      resolvedAt: status === 'done' ? issue.resolvedAt || new Date().toISOString() : undefined,
    });
  }

  // Report
  function openReport() {
    setRTitle('');
    setRCategory('other');
    setRUrgency('normal');
    setReportOpen(true);
  }
  function saveReport() {
    if (!rTitle.trim()) return;
    const issue: HomeIssue = {
      id: newId(),
      title: rTitle.trim(),
      category: rCategory,
      urgency: rUrgency,
      status: 'new',
    };
    onIssuesChange((prev) => [issue, ...prev]);
    setReportOpen(false);
  }

  // Detail
  function openDetail(issue: HomeIssue) {
    setEditing(issue);
    setELocation(issue.location || '');
    setEDescription(issue.description || '');
  }
  function saveDetail() {
    if (!editing) return;
    updateIssue(editing.id, {
      location: eLocation.trim() || undefined,
      description: eDescription.trim() || undefined,
    });
    setEditing(null);
  }
  function deleteIssue(id: string) {
    onIssuesChange((prev) => prev.filter((i) => i.id !== id));
    setEditing(null);
  }

  // Providers
  function openProviderForm(provider: HomeProvider | null, prefillCategory?: string) {
    setEditingProvider(provider);
    setPName(provider?.name || '');
    setPCategory(provider?.category || prefillCategory || 'other');
    setPPhone(provider?.phone || '');
    setPNotes(provider?.notes || '');
    setProviderFormOpen(true);
  }
  function saveProvider() {
    if (!pName.trim()) return;
    const next: HomeProvider = {
      id: editingProvider?.id || newId(),
      name: pName.trim(),
      category: pCategory,
      phone: pPhone.trim() || undefined,
      notes: pNotes.trim() || undefined,
    };
    onProvidersChange((prev) =>
      editingProvider ? prev.map((p) => (p.id === editingProvider.id ? next : p)) : [next, ...prev],
    );
    setProviderFormOpen(false);
  }
  function deleteProvider(id: string) {
    onProvidersChange((prev) => prev.filter((p) => p.id !== id));
    setProviderFormOpen(false);
  }

  function renderIssueCard(issue: HomeIssue) {
    const cat = categoryMeta(issue.category);
    const urg = URGENCY.find((u) => u.key === issue.urgency);
    const provider = providerForCategory(issue.category);
    const meta = [cat.label, issue.location].filter(Boolean).join(' · ');
    return (
      <View key={issue.id} style={styles.issueCard}>
        <Pressable style={styles.issueTop} onPress={() => openDetail(issue)}>
          <Text style={styles.issueEmoji}>{cat.emoji}</Text>
          <View style={{ flex: 1 }}>
            <View style={styles.issueTitleRow}>
              <Text style={styles.issueTitle} numberOfLines={1}>{issue.title}</Text>
              {issue.urgency === 'urgent' ? <Text style={styles.urgentDot}>🔴</Text> : null}
              {issue.status === 'scheduled' ? <Text style={styles.schedChip}>Scheduled</Text> : null}
            </View>
            <Text style={styles.issueMeta} numberOfLines={1}>{meta || urg?.label}</Text>
          </View>
        </Pressable>
        <View style={styles.actionRow}>
          {provider && provider.phone ? (
            <Pressable style={styles.actCall} onPress={() => callPhone(provider.phone)}>
              <Text style={styles.actCallText}>📞 Call {firstName(provider.name)}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.actGhost} onPress={() => openProviderForm(null, issue.category)}>
              <Text style={styles.actGhostText}>+ Add {cat.label.toLowerCase()}</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.actGhost, issue.status === 'scheduled' && styles.actGhostOn]}
            onPress={() => setStatus(issue, issue.status === 'scheduled' ? 'new' : 'scheduled')}
          >
            <Text style={[styles.actGhostText, issue.status === 'scheduled' && styles.actGhostOnText]}>📅 Schedule</Text>
          </Pressable>
          <Pressable style={styles.actDone} onPress={() => setStatus(issue, 'done')}>
            <Text style={styles.actDoneText}>✓ Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>HOME</Text>
          <Text style={styles.title}>Fix it</Text>
        </View>
        <Pressable style={styles.reportBtn} onPress={openReport}>
          <Text style={styles.reportBtnText}>+ Report</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>Something broke or needs doing? Log it and call the right help in one tap.</Text>

      <Pressable style={styles.contactsLink} onPress={() => setContactsOpen(true)}>
        <Text style={styles.contactsLinkText}>🔧 My contacts{providers.length ? ` · ${providers.length}` : ''}</Text>
        <Text style={styles.contactsLinkChevron}>›</Text>
      </Pressable>

      {activeIssues.length === 0 && doneIssues.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nothing to fix right now 🛠️</Text>
          <Text style={styles.emptyText}>Tap “+ Report” when something breaks, stops working, or needs assembling.</Text>
        </View>
      ) : null}

      {activeIssues.map(renderIssueCard)}

      {doneIssues.length ? (
        <View>
          <Pressable style={styles.doneHeader} onPress={() => setShowDone((v) => !v)}>
            <Text style={styles.doneHeaderText}>Done · {doneIssues.length} {showDone ? '▾' : '▸'}</Text>
          </Pressable>
          {showDone
            ? doneIssues.map((issue) => {
                const cat = categoryMeta(issue.category);
                return (
                  <Pressable key={issue.id} style={styles.doneCard} onPress={() => openDetail(issue)}>
                    <Text style={styles.doneTick}>✓</Text>
                    <Text style={styles.doneCardTitle} numberOfLines={1}>{cat.emoji} {issue.title}</Text>
                    <Pressable onPress={() => setStatus(issue, 'new')}>
                      <Text style={styles.reopenText}>Reopen</Text>
                    </Pressable>
                  </Pressable>
                );
              })
            : null}
        </View>
      ) : null}

      {/* Quick report modal */}
      <Modal visible={reportOpen} transparent animationType="fade" onRequestClose={() => setReportOpen(false)}>
        <View style={styles.scrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setReportOpen(false)} />
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>What needs fixing?</Text>
              <TextInput
                placeholder="e.g. Kitchen tap leaking"
                placeholderTextColor={colors.subtext}
                style={styles.input}
                value={rTitle}
                onChangeText={setRTitle}
                autoFocus
              />
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipsWrap}>
                {CATEGORIES.map((c) => (
                  <Pressable key={c.key} style={[styles.chip, rCategory === c.key && styles.chipActive]} onPress={() => setRCategory(c.key)}>
                    <Text style={[styles.chipText, rCategory === c.key && styles.chipTextActive]}>{c.emoji} {c.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Urgency</Text>
              <View style={styles.chipsWrap}>
                {URGENCY.map((u) => (
                  <Pressable key={u.key} style={[styles.chip, rUrgency === u.key && styles.chipActive]} onPress={() => setRUrgency(u.key)}>
                    <Text style={[styles.chipText, rUrgency === u.key && styles.chipTextActive]}>{u.dot} {u.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.hintText}>You can add the room and details later from the card.</Text>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable style={styles.ghostBtn} onPress={() => setReportOpen(false)}>
                <Text style={styles.ghostBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={saveReport}>
                <Text style={styles.primaryBtnText}>Report</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail / edit modal */}
      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={styles.scrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(null)} />
          {editing ? (
            <View style={styles.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
                <Text style={styles.modalEyebrow}>{categoryMeta(editing.category).label.toUpperCase()}</Text>
                <Text style={styles.modalTitle}>{editing.title}</Text>

                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.chipsWrap}>
                  {CATEGORIES.map((c) => (
                    <Pressable key={c.key} style={[styles.chip, editing.category === c.key && styles.chipActive]} onPress={() => setEditing({ ...editing, category: c.key })}>
                      <Text style={[styles.chipText, editing.category === c.key && styles.chipTextActive]}>{c.emoji} {c.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Urgency</Text>
                <View style={styles.chipsWrap}>
                  {URGENCY.map((u) => (
                    <Pressable key={u.key} style={[styles.chip, editing.urgency === u.key && styles.chipActive]} onPress={() => setEditing({ ...editing, urgency: u.key })}>
                      <Text style={[styles.chipText, editing.urgency === u.key && styles.chipTextActive]}>{u.dot} {u.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Where</Text>
                <TextInput placeholder="Room / place (optional)" placeholderTextColor={colors.subtext} style={styles.input} value={eLocation} onChangeText={setELocation} />

                <Text style={styles.fieldLabel}>Details</Text>
                <TextInput
                  placeholder="Anything the repair person should know (optional)"
                  placeholderTextColor={colors.subtext}
                  style={[styles.input, styles.inputMultiline]}
                  value={eDescription}
                  onChangeText={setEDescription}
                  multiline
                />
              </ScrollView>
              <View style={styles.modalActions}>
                <Pressable style={styles.deleteBtn} onPress={() => deleteIssue(editing.id)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => {
                    // category/urgency are live-edited on `editing`; persist them too.
                    updateIssue(editing.id, { category: editing.category, urgency: editing.urgency });
                    saveDetail();
                  }}
                >
                  <Text style={styles.primaryBtnText}>Save</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Contacts modal */}
      <Modal visible={contactsOpen} transparent animationType="fade" onRequestClose={() => setContactsOpen(false)}>
        <View style={styles.scrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setContactsOpen(false)} />
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <View style={styles.contactsHeader}>
                <Text style={styles.modalTitle}>My contacts</Text>
                <Pressable onPress={() => openProviderForm(null)}>
                  <Text style={styles.addLink}>+ Add</Text>
                </Pressable>
              </View>
              {providers.length === 0 ? (
                <Text style={styles.hintText}>Save your plumber, electrician, handyman… so you can call them in one tap from any issue.</Text>
              ) : (
                providers.map((provider) => {
                  const cat = provider.category ? categoryMeta(provider.category) : null;
                  return (
                    <Pressable key={provider.id} style={styles.contactCard} onPress={() => openProviderForm(provider)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contactName} numberOfLines={1}>{cat ? `${cat.emoji} ` : ''}{provider.name}</Text>
                        <Text style={styles.contactMeta} numberOfLines={1}>
                          {[cat?.label, provider.phone].filter(Boolean).join(' · ') || 'No phone yet'}
                        </Text>
                      </View>
                      {provider.phone ? (
                        <Pressable style={styles.callBtn} onPress={() => callPhone(provider.phone)}>
                          <Text style={styles.callBtnText}>Call</Text>
                        </Pressable>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable style={styles.primaryBtn} onPress={() => setContactsOpen(false)}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Provider form modal */}
      <Modal visible={providerFormOpen} transparent animationType="fade" onRequestClose={() => setProviderFormOpen(false)}>
        <View style={styles.scrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setProviderFormOpen(false)} />
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingProvider ? 'Edit contact' : 'Add a contact'}</Text>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput placeholder="e.g. Ivan (plumber)" placeholderTextColor={colors.subtext} style={styles.input} value={pName} onChangeText={setPName} />
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipsWrap}>
                {CATEGORIES.filter((c) => c.key !== 'other').map((c) => (
                  <Pressable key={c.key} style={[styles.chip, pCategory === c.key && styles.chipActive]} onPress={() => setPCategory(c.key)}>
                    <Text style={[styles.chipText, pCategory === c.key && styles.chipTextActive]}>{c.emoji} {c.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput placeholder="+1 234 567 89" placeholderTextColor={colors.subtext} style={styles.input} value={pPhone} onChangeText={setPPhone} keyboardType="phone-pad" />
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput placeholder="Optional" placeholderTextColor={colors.subtext} style={styles.input} value={pNotes} onChangeText={setPNotes} />
            </ScrollView>
            <View style={styles.modalActions}>
              {editingProvider ? (
                <Pressable style={styles.deleteBtn} onPress={() => deleteProvider(editingProvider.id)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.ghostBtn} onPress={() => setProviderFormOpen(false)}>
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </Pressable>
              )}
              <Pressable style={styles.primaryBtn} onPress={saveProvider}>
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
    reportBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginTop: 4 },
    reportBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
    contactsLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#ffffff',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#e1e8f2',
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    contactsLinkText: { color: colors.text, fontWeight: '700', fontSize: 14 },
    contactsLinkChevron: { color: colors.subtext, fontSize: 20, fontWeight: '800' },
    emptyCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 6 },
    emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
    emptyText: { color: colors.subtext, fontSize: 13, lineHeight: 18 },
    issueCard: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e1e8f2', padding: 12, gap: 10 },
    issueTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    issueEmoji: { fontSize: 24 },
    issueTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    issueTitle: { color: '#14233b', fontSize: 16, fontWeight: '800', flexShrink: 1 },
    urgentDot: { fontSize: 12 },
    schedChip: { fontSize: 11, fontWeight: '800', color: '#2563eb', backgroundColor: '#dbeafe', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
    issueMeta: { color: '#52627d', fontSize: 12, marginTop: 2 },
    actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    actCall: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
    actCallText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
    actGhost: { borderWidth: 1, borderColor: '#c7d2e3', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#ffffff' },
    actGhostText: { color: '#52627d', fontWeight: '700', fontSize: 13 },
    actGhostOn: { borderColor: colors.primary, backgroundColor: colors.selection },
    actGhostOnText: { color: colors.primary },
    actDone: { borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#f0fdf4' },
    actDoneText: { color: '#16a34a', fontWeight: '800', fontSize: 13 },
    doneHeader: { paddingVertical: 8 },
    doneHeaderText: { color: colors.subtext, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    doneCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#f8fafc',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#e1e8f2',
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 6,
    },
    doneTick: { color: '#16a34a', fontSize: 16, fontWeight: '900' },
    doneCardTitle: { color: '#52627d', fontSize: 14, fontWeight: '700', flex: 1 },
    reopenText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
    contactsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    addLink: { color: colors.primary, fontWeight: '800', fontSize: 14 },
    contactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: '#ffffff',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#e1e8f2',
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginTop: 8,
    },
    contactName: { color: '#14233b', fontSize: 15, fontWeight: '800' },
    contactMeta: { color: '#52627d', fontSize: 12, marginTop: 2 },
    callBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    callBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
    scrim: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 16 },
    modalCard: {
      maxHeight: '90%',
      borderRadius: 22,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.96)',
      backgroundColor: 'rgba(248,250,252,0.98)',
      overflow: 'hidden',
    },
    modalContent: { padding: 18, gap: 4 },
    modalEyebrow: { color: colors.subtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 8 },
    fieldLabel: { color: colors.subtext, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 4 },
    hintText: { color: colors.subtext, fontSize: 12, marginTop: 10, lineHeight: 17 },
    input: {
      backgroundColor: '#ffffff',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#d9e4f2',
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: '#14233b',
      fontSize: 15,
    },
    inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderRadius: 12, borderWidth: 1, borderColor: '#d9e4f2', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 8 },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.selection },
    chipText: { color: '#52627d', fontSize: 13, fontWeight: '700' },
    chipTextActive: { color: colors.primary },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: '#e1e8f2',
      backgroundColor: 'rgba(248,250,252,0.98)',
    },
    ghostBtn: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13, borderWidth: 1, borderColor: '#d9e4f2', backgroundColor: '#ffffff' },
    ghostBtnText: { color: colors.text, fontWeight: '700' },
    deleteBtn: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2' },
    deleteBtnText: { color: '#dc2626', fontWeight: '800' },
    primaryBtn: { borderRadius: 14, paddingHorizontal: 22, paddingVertical: 13, backgroundColor: colors.primary },
    primaryBtnText: { color: '#ffffff', fontWeight: '800' },
  });
