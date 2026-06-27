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
  { key: 'furniture', label: 'Furniture / assembly', emoji: '🪛' },
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

const STATUS_SECTIONS: { key: HomeIssueStatus; label: string }[] = [
  { key: 'new', label: 'Open' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'done', label: 'Done' },
];

const URGENCY_ORDER: Record<HomeIssueUrgency, number> = { urgent: 0, normal: 1, low: 2 };

function categoryMeta(key: string) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
}

function newId() {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  // RFC4122 v4 fallback — the DB column is uuid, so the id must be a valid UUID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function FixItScreen({ issues, onIssuesChange, providers, onProvidersChange }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<HomeIssue | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCategory, setDraftCategory] = useState('other');
  const [draftLocation, setDraftLocation] = useState('');
  const [draftUrgency, setDraftUrgency] = useState<HomeIssueUrgency>('normal');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftStatus, setDraftStatus] = useState<HomeIssueStatus>('new');

  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<HomeProvider | null>(null);
  const [pName, setPName] = useState('');
  const [pCategory, setPCategory] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pNotes, setPNotes] = useState('');

  const grouped = useMemo(() => {
    const map: Record<HomeIssueStatus, HomeIssue[]> = { new: [], scheduled: [], done: [] };
    for (const issue of issues) map[issue.status]?.push(issue);
    for (const key of Object.keys(map) as HomeIssueStatus[]) {
      map[key].sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]);
    }
    return map;
  }, [issues]);

  function openNewIssue() {
    setEditingIssue(null);
    setDraftTitle('');
    setDraftCategory('other');
    setDraftLocation('');
    setDraftUrgency('normal');
    setDraftDescription('');
    setDraftStatus('new');
    setIssueModalOpen(true);
  }

  function openEditIssue(issue: HomeIssue) {
    setEditingIssue(issue);
    setDraftTitle(issue.title);
    setDraftCategory(issue.category);
    setDraftLocation(issue.location || '');
    setDraftUrgency(issue.urgency);
    setDraftDescription(issue.description || '');
    setDraftStatus(issue.status);
    setIssueModalOpen(true);
  }

  function saveIssue() {
    if (!draftTitle.trim()) return;
    const next: HomeIssue = {
      id: editingIssue?.id || newId(),
      title: draftTitle.trim(),
      description: draftDescription.trim() || undefined,
      category: draftCategory,
      location: draftLocation.trim() || undefined,
      urgency: draftUrgency,
      status: draftStatus,
      reportedBy: editingIssue?.reportedBy,
      providerId: editingIssue?.providerId,
      cost: editingIssue?.cost,
      scheduledAt: editingIssue?.scheduledAt,
      resolvedAt: draftStatus === 'done' ? editingIssue?.resolvedAt || new Date().toISOString() : undefined,
      createdAt: editingIssue?.createdAt,
    };
    onIssuesChange((prev) =>
      editingIssue ? prev.map((i) => (i.id === editingIssue.id ? next : i)) : [next, ...prev],
    );
    setIssueModalOpen(false);
  }

  function setIssueStatus(issue: HomeIssue, status: HomeIssueStatus) {
    onIssuesChange((prev) =>
      prev.map((i) =>
        i.id === issue.id
          ? { ...i, status, resolvedAt: status === 'done' ? i.resolvedAt || new Date().toISOString() : undefined }
          : i,
      ),
    );
  }

  function deleteIssue(id: string) {
    onIssuesChange((prev) => prev.filter((i) => i.id !== id));
    setIssueModalOpen(false);
  }

  function openNewProvider() {
    setEditingProvider(null);
    setPName('');
    setPCategory('');
    setPPhone('');
    setPNotes('');
    setProviderModalOpen(true);
  }

  function openEditProvider(provider: HomeProvider) {
    setEditingProvider(provider);
    setPName(provider.name);
    setPCategory(provider.category || '');
    setPPhone(provider.phone || '');
    setPNotes(provider.notes || '');
    setProviderModalOpen(true);
  }

  function saveProvider() {
    if (!pName.trim()) return;
    const next: HomeProvider = {
      id: editingProvider?.id || newId(),
      name: pName.trim(),
      category: pCategory.trim() || undefined,
      phone: pPhone.trim() || undefined,
      notes: pNotes.trim() || undefined,
    };
    onProvidersChange((prev) =>
      editingProvider ? prev.map((p) => (p.id === editingProvider.id ? next : p)) : [next, ...prev],
    );
    setProviderModalOpen(false);
  }

  function deleteProvider(id: string) {
    onProvidersChange((prev) => prev.filter((p) => p.id !== id));
    setProviderModalOpen(false);
  }

  function callPhone(phone?: string) {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {});
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>HOME</Text>
          <Text style={styles.title}>Fix it</Text>
          <Text style={styles.subtitle}>Anything that broke or needs doing at home — log it and call the right help.</Text>
        </View>
        <Pressable style={styles.reportBtn} onPress={openNewIssue}>
          <Text style={styles.reportBtnText}>+ Report</Text>
        </Pressable>
      </View>

      {issues.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nothing to fix right now 🛠️</Text>
          <Text style={styles.emptyText}>Tap “+ Report” when something breaks, stops working, or needs assembling.</Text>
        </View>
      ) : (
        STATUS_SECTIONS.map((section) => {
          const list = grouped[section.key];
          if (!list.length) return null;
          return (
            <View key={section.key} style={styles.section}>
              <Text style={styles.sectionLabel}>{section.label} · {list.length}</Text>
              {list.map((issue) => {
                const cat = categoryMeta(issue.category);
                const urg = URGENCY.find((u) => u.key === issue.urgency);
                const provider = issue.providerId ? providers.find((p) => p.id === issue.providerId) : undefined;
                const meta = [cat.label, issue.location, issue.reportedBy ? `by ${issue.reportedBy}` : null]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <Pressable key={issue.id} style={styles.issueCard} onPress={() => openEditIssue(issue)}>
                    <Text style={styles.issueEmoji}>{cat.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.issueTitle} numberOfLines={1}>
                        {issue.urgency === 'urgent' ? `${urg?.dot} ` : ''}{issue.title}
                      </Text>
                      <Text style={styles.issueMeta} numberOfLines={1}>{meta}</Text>
                    </View>
                    {section.key !== 'done' ? (
                      provider?.phone ? (
                        <Pressable
                          style={styles.callMini}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            callPhone(provider.phone);
                          }}
                        >
                          <Text style={styles.callMiniText}>Call</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={styles.doneMini}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            setIssueStatus(issue, 'done');
                          }}
                        >
                          <Text style={styles.doneMiniText}>Done</Text>
                        </Pressable>
                      )
                    ) : (
                      <Text style={styles.doneTick}>✓</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          );
        })
      )}

      {/* Saved contacts */}
      <View style={styles.section}>
        <View style={styles.contactsHeader}>
          <Text style={styles.sectionLabel}>Your contacts</Text>
          <Pressable onPress={openNewProvider}>
            <Text style={styles.addLink}>+ Add</Text>
          </Pressable>
        </View>
        {providers.length === 0 ? (
          <Text style={styles.contactsHint}>Save your plumber, electrician, handyman… to call them in one tap.</Text>
        ) : (
          providers.map((provider) => (
            <Pressable key={provider.id} style={styles.contactCard} onPress={() => openEditProvider(provider)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName} numberOfLines={1}>{provider.name}</Text>
                <Text style={styles.contactMeta} numberOfLines={1}>
                  {[provider.category, provider.phone].filter(Boolean).join(' · ') || 'No phone yet'}
                </Text>
              </View>
              {provider.phone ? (
                <Pressable
                  style={styles.callBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    callPhone(provider.phone);
                  }}
                >
                  <Text style={styles.callBtnText}>Call</Text>
                </Pressable>
              ) : null}
            </Pressable>
          ))
        )}
      </View>

      {/* Issue modal */}
      <Modal visible={issueModalOpen} transparent animationType="fade" onRequestClose={() => setIssueModalOpen(false)}>
        <View style={styles.scrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIssueModalOpen(false)} />
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalEyebrow}>{editingIssue ? 'EDIT' : 'REPORT'}</Text>
              <Text style={styles.modalTitle}>{editingIssue ? 'Edit issue' : 'What needs fixing?'}</Text>

              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                placeholder="e.g. Kitchen tap leaking"
                placeholderTextColor={colors.subtext}
                style={styles.input}
                value={draftTitle}
                onChangeText={setDraftTitle}
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipsWrap}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c.key}
                    style={[styles.chip, draftCategory === c.key && styles.chipActive]}
                    onPress={() => setDraftCategory(c.key)}
                  >
                    <Text style={[styles.chipText, draftCategory === c.key && styles.chipTextActive]}>{c.emoji} {c.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Where</Text>
              <TextInput
                placeholder="Room / place (optional)"
                placeholderTextColor={colors.subtext}
                style={styles.input}
                value={draftLocation}
                onChangeText={setDraftLocation}
              />

              <Text style={styles.fieldLabel}>Urgency</Text>
              <View style={styles.chipsWrap}>
                {URGENCY.map((u) => (
                  <Pressable
                    key={u.key}
                    style={[styles.chip, draftUrgency === u.key && styles.chipActive]}
                    onPress={() => setDraftUrgency(u.key)}
                  >
                    <Text style={[styles.chipText, draftUrgency === u.key && styles.chipTextActive]}>{u.dot} {u.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Details</Text>
              <TextInput
                placeholder="Anything the repair person should know (optional)"
                placeholderTextColor={colors.subtext}
                style={[styles.input, styles.inputMultiline]}
                value={draftDescription}
                onChangeText={setDraftDescription}
                multiline
              />

              {editingIssue ? (
                <>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.chipsWrap}>
                    {STATUS_SECTIONS.map((s) => (
                      <Pressable
                        key={s.key}
                        style={[styles.chip, draftStatus === s.key && styles.chipActive]}
                        onPress={() => setDraftStatus(s.key)}
                      >
                        <Text style={[styles.chipText, draftStatus === s.key && styles.chipTextActive]}>{s.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
            </ScrollView>
            <View style={styles.modalActions}>
              {editingIssue ? (
                <Pressable style={styles.deleteBtn} onPress={() => deleteIssue(editingIssue.id)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.ghostBtn} onPress={() => setIssueModalOpen(false)}>
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </Pressable>
              )}
              <Pressable style={styles.primaryBtn} onPress={saveIssue}>
                <Text style={styles.primaryBtnText}>{editingIssue ? 'Save' : 'Report'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Provider modal */}
      <Modal visible={providerModalOpen} transparent animationType="fade" onRequestClose={() => setProviderModalOpen(false)}>
        <View style={styles.scrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setProviderModalOpen(false)} />
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalEyebrow}>{editingProvider ? 'EDIT' : 'NEW'}</Text>
              <Text style={styles.modalTitle}>{editingProvider ? 'Edit contact' : 'Add a contact'}</Text>

              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput placeholder="e.g. Ivan (plumber)" placeholderTextColor={colors.subtext} style={styles.input} value={pName} onChangeText={setPName} />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipsWrap}>
                {CATEGORIES.filter((c) => c.key !== 'other').map((c) => (
                  <Pressable
                    key={c.key}
                    style={[styles.chip, pCategory === c.label && styles.chipActive]}
                    onPress={() => setPCategory(pCategory === c.label ? '' : c.label)}
                  >
                    <Text style={[styles.chipText, pCategory === c.label && styles.chipTextActive]}>{c.emoji} {c.label}</Text>
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
                <Pressable style={styles.ghostBtn} onPress={() => setProviderModalOpen(false)}>
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
    content: { padding: 16, gap: 14, paddingBottom: 40 },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    eyebrow: { color: colors.subtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    title: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 2 },
    subtitle: { color: colors.subtext, fontSize: 13, marginTop: 4, lineHeight: 18 },
    reportBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginTop: 4 },
    reportBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
    emptyCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 6 },
    emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
    emptyText: { color: colors.subtext, fontSize: 13, lineHeight: 18 },
    section: { gap: 8 },
    sectionLabel: { color: colors.subtext, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    issueCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: '#ffffff',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#e1e8f2',
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    issueEmoji: { fontSize: 22 },
    issueTitle: { color: '#14233b', fontSize: 15, fontWeight: '800' },
    issueMeta: { color: '#52627d', fontSize: 12, marginTop: 2 },
    callMini: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
    callMiniText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
    doneMini: { borderWidth: 1, borderColor: '#c7d2e3', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
    doneMiniText: { color: '#52627d', fontWeight: '800', fontSize: 12 },
    doneTick: { color: '#16a34a', fontSize: 18, fontWeight: '900' },
    contactsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    addLink: { color: colors.primary, fontWeight: '800', fontSize: 13 },
    contactsHint: { color: colors.subtext, fontSize: 13, lineHeight: 18 },
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
    modalContent: { padding: 18, gap: 6 },
    modalEyebrow: { color: colors.subtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 8 },
    fieldLabel: { color: colors.subtext, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 4 },
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
