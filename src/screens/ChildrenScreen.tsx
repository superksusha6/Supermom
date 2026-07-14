import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SectionCard } from '@/components/SectionCard';
import { ChildProfile } from '@/types/app';
import { ThemeColors, useThemeColors } from '@/theme/theme';

const AVATAR_COLORS = ['#3b5bdb', '#7c3aed', '#0ea5e9', '#16a34a', '#e08a2b', '#e11d48', '#0891b2', '#db2777'];

type TodayPlan = { time: string; title: string };

type Props = {
  children: ChildProfile[];
  onAddActivity: (childId: string, activityName: string, timesPerWeek: number) => void;
  onDeleteActivity: (childId: string, activityId: string) => void;
  onDeleteChild: (childId: string) => void;
  onEditChild: (childId: string) => void;
  onAddChild: () => void;
  onSetChildPhoto: (childId: string, photoUri: string) => void;
  todayPlansByChild?: Record<string, TodayPlan[]>;
  quickActionRequest?: { type: 'add-activity'; token: number } | null;
};

export function ChildrenScreen({
  children,
  onAddActivity,
  onDeleteActivity,
  onDeleteChild,
  onEditChild,
  onAddChild,
  onSetChildPhoto,
  todayPlansByChild,
  quickActionRequest,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [openChildId, setOpenChildId] = useState<string | null>(null);
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [activityName, setActivityName] = useState('');
  const [timesPerWeek, setTimesPerWeek] = useState('1');

  const child = children.find((item) => item.id === openChildId) || null;

  useEffect(() => {
    setAddActivityOpen(false);
    setActivityName('');
    setTimesPerWeek('1');
  }, [openChildId]);

  // Drop back to the list if the open child was deleted.
  useEffect(() => {
    if (openChildId && !children.some((c) => c.id === openChildId)) setOpenChildId(null);
  }, [children, openChildId]);

  useEffect(() => {
    if (!quickActionRequest || quickActionRequest.type !== 'add-activity' || !children.length) return;
    setOpenChildId((prev) => (prev && children.some((c) => c.id === prev) ? prev : children[0].id));
    setAddActivityOpen(true);
  }, [quickActionRequest, children]);

  const colorFor = (id: string) => AVATAR_COLORS[Math.max(0, children.findIndex((c) => c.id === id)) % AVATAR_COLORS.length];

  function renderAvatar(item: ChildProfile, size: number) {
    if (item.photoUri) {
      return <Image source={{ uri: item.photoUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colorFor(item.id), alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: size * 0.4 }}>{(item.name.trim()[0] || '?').toUpperCase()}</Text>
      </View>
    );
  }

  async function pickPhoto(childId: string) {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      onSetChildPhoto(childId, uri);
    } catch {
      // ignore picker failures
    }
  }

  // ---- LIST OF CHILD CARDS ----
  if (!child) {
    return (
      <SectionCard title="Children">
        <View style={styles.profileHeaderRow}>
          <Pressable style={styles.secondaryBtn} onPress={onAddChild}>
            <Text style={styles.secondaryBtnText}>+ Add child</Text>
          </Pressable>
        </View>
        {children.length === 0 ? (
          <Text style={styles.emptyText}>No children yet — tap “+ Add child” to create a profile.</Text>
        ) : (
          children.map((item) => {
            const plans = todayPlansByChild?.[item.id] || [];
            const planLine = plans.length ? plans.slice(0, 2).map((p) => `${p.time} ${p.title}`.trim()).join('  ·  ') : 'No plans today';
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.name}`}
                style={styles.childCard}
                onPress={() => setOpenChildId(item.id)}
              >
                {renderAvatar(item, 56)}
                <View style={styles.childCardCopy}>
                  <Text style={styles.childCardName}>{item.name}{item.age ? ` · ${item.age}` : ''}</Text>
                  <Text style={[styles.childCardPlan, !plans.length && styles.childCardPlanEmpty]} numberOfLines={1}>
                    {planLine}
                  </Text>
                </View>
                <Text style={styles.childCardChevron}>›</Text>
              </Pressable>
            );
          })
        )}
      </SectionCard>
    );
  }

  // ---- SINGLE CHILD PROFILE ----
  const plans = todayPlansByChild?.[child.id] || [];
  return (
    <>
      <Pressable style={styles.backRow} onPress={() => setOpenChildId(null)}>
        <Text style={styles.backText}>‹ Children</Text>
      </Pressable>

      <SectionCard title="Profile">
        <View style={styles.detailHeader}>
          <Pressable onPress={() => pickPhoto(child.id)} style={styles.detailAvatarWrap}>
            {renderAvatar(child, 72)}
            <View style={styles.detailAvatarEdit}>
              <Text style={styles.detailAvatarEditText}>✎</Text>
            </View>
          </Pressable>
          <View style={styles.detailCopy}>
            <Text style={styles.detailName}>{child.name}</Text>
            {child.age ? <Text style={styles.meta}>Age: {child.age}</Text> : null}
            <Pressable onPress={() => pickPhoto(child.id)}>
              <Text style={styles.photoLink}>{child.photoUri ? 'Change photo' : 'Add photo'}</Text>
            </Pressable>
          </View>
        </View>

        {plans.length ? (
          <View style={styles.detailPlans}>
            <Text style={styles.detailPlansLabel}>Today</Text>
            {plans.map((p, i) => (
              <Text key={i} style={styles.detailPlanItem}>{`${p.time}  ${p.title}`.trim()}</Text>
            ))}
          </View>
        ) : null}

        <View style={styles.childMetaActions}>
          <Pressable style={styles.secondaryBtn} onPress={() => onEditChild(child.id)}>
            <Text style={styles.secondaryBtnText}>Edit child</Text>
          </Pressable>
          <Pressable style={styles.deleteBtn} onPress={() => onDeleteChild(child.id)}>
            <Text style={styles.deleteBtnText}>Delete child</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title="Activities / Sports / Clubs">
        <View style={styles.profileHeaderRow}>
          <Pressable style={styles.secondaryBtn} onPress={() => setAddActivityOpen((prev) => !prev)}>
            <Text style={styles.secondaryBtnText}>{addActivityOpen ? 'Close' : '+ Add activity'}</Text>
          </Pressable>
        </View>
        {child.activities.map((activity) => (
          <View key={activity.id} style={[styles.item, styles.activityRow]}>
            <View style={styles.activityCopy}>
              <Text style={styles.title}>{activity.name}</Text>
              <Text style={styles.meta}>{activity.timesPerWeek} times per week</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${activity.name}`}
              style={styles.activityRemove}
              onPress={() => onDeleteActivity(child.id, activity.id)}
            >
              <Text style={styles.activityRemoveText}>Remove</Text>
            </Pressable>
          </View>
        ))}
        {addActivityOpen ? (
          <View style={styles.addActivityForm}>
            <TextInput value={activityName} onChangeText={setActivityName} placeholder="Activity name" style={styles.input} />
            <TextInput value={timesPerWeek} onChangeText={setTimesPerWeek} placeholder="Times per week" keyboardType="number-pad" style={styles.input} />
            <Pressable
              style={styles.button}
              onPress={() => {
                if (!activityName.trim()) return;
                onAddActivity(child.id, activityName.trim(), Number(timesPerWeek) || 1);
                setActivityName('');
                setTimesPerWeek('1');
                setAddActivityOpen(false);
              }}
            >
              <Text style={styles.buttonText}>Add Activity</Text>
            </Pressable>
          </View>
        ) : null}
      </SectionCard>
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  addActivityForm: {
    marginTop: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.glassStrong,
  },
  chipActive: {
    backgroundColor: colors.selection,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  item: {
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingVertical: 9,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityCopy: {
    flex: 1,
  },
  activityRemove: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activityRemoveText: {
    color: '#be123c',
    fontSize: 12.5,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.subtext,
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 6,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  childCardCopy: {
    flex: 1,
    gap: 3,
  },
  childCardName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  childCardPlan: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  childCardPlanEmpty: {
    color: colors.subtext,
    fontWeight: '500',
  },
  childCardChevron: {
    color: colors.subtext,
    fontSize: 22,
    fontWeight: '700',
  },
  backRow: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  detailAvatarWrap: {
    position: 'relative',
  },
  detailAvatarEdit: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  detailAvatarEditText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  detailCopy: {
    flex: 1,
    gap: 2,
  },
  detailName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  photoLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  detailPlans: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.glassSoft,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 3,
  },
  detailPlansLabel: {
    color: colors.subtext,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailPlanItem: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontWeight: '700',
  },
  meta: {
    color: colors.subtext,
  },
  childMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  childMetaCopy: {
    gap: 4,
    flex: 1,
  },
  childMetaActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    color: colors.text,
    fontWeight: '700',
  },
  deleteBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteBtnText: {
    color: '#be123c',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: colors.glassStrong,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    shadowColor: 'rgba(37,99,235,0.28)',
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  });
