import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SectionCard } from '@/components/SectionCard';
import { Icon } from '@/components/Icon';
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
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropChildId, setCropChildId] = useState<string | null>(null);
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
        allowsEditing: Platform.OS !== 'web', // native gives a crop UI; web uses our own cropper
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      if (Platform.OS === 'web') {
        setCropChildId(childId);
        setCropSrc(uri);
      } else {
        onSetChildPhoto(childId, uri);
      }
    } catch {
      // ignore picker failures
    }
  }

  const cropModal = cropSrc ? (
    <PhotoCropper
      src={cropSrc}
      colors={colors}
      onCancel={() => { setCropSrc(null); setCropChildId(null); }}
      onDone={(dataUrl) => {
        if (cropChildId) onSetChildPhoto(cropChildId, dataUrl);
        setCropSrc(null);
        setCropChildId(null);
      }}
    />
  ) : null;

  // ---- LIST OF CHILD CARDS ----
  if (!child) {
    return (
      <>
      <SectionCard title="Children">
        <View style={styles.profileHeaderRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Add child" style={styles.addRoundBtn} onPress={onAddChild}>
            <Icon name="plus" color="#ffffff" size={20} />
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
      {cropModal}
      </>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={addActivityOpen ? 'Close' : 'Add activity'}
            style={[styles.addRoundBtn, addActivityOpen && styles.addRoundBtnOpen]}
            onPress={() => setAddActivityOpen((prev) => !prev)}
          >
            <Icon name={addActivityOpen ? 'chevron' : 'plus'} color={addActivityOpen ? colors.primary : '#ffffff'} size={20} />
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
      {cropModal}
    </>
  );
}

const CROP_VIEWPORT = 280;
const CROP_OUT = 512;

function PhotoCropper({
  src,
  colors,
  onCancel,
  onDone,
}: {
  src: string;
  colors: ThemeColors;
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [nat, setNat] = useState<{ nw: number; nh: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const posRef = useRef({ x: 0, y: 0 });
  const startRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    Image.getSize(
      src,
      (w, h) => setNat({ nw: w, nh: h }),
      () => setNat({ nw: 1, nh: 1 }),
    );
  }, [src]);

  const baseScale = nat ? CROP_VIEWPORT / Math.min(nat.nw, nat.nh) : 1;
  const dispW = nat ? nat.nw * baseScale * zoom : CROP_VIEWPORT;
  const dispH = nat ? nat.nh * baseScale * zoom : CROP_VIEWPORT;

  const clampPos = (x: number, y: number, w: number, h: number) => ({
    x: Math.min(0, Math.max(CROP_VIEWPORT - w, x)),
    y: Math.min(0, Math.max(CROP_VIEWPORT - h, y)),
  });

  useEffect(() => {
    if (!nat) return;
    const c = clampPos((CROP_VIEWPORT - dispW) / 2, (CROP_VIEWPORT - dispH) / 2, dispW, dispH);
    posRef.current = c;
    setPos(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nat]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startRef.current = { ...posRef.current };
      },
      onPanResponderMove: (_evt, g) => {
        const w = dispWRef.current;
        const h = dispHRef.current;
        const c = clampPos(startRef.current.x + g.dx, startRef.current.y + g.dy, w, h);
        posRef.current = c;
        setPos(c);
      },
    }),
  ).current;

  // keep latest sizes for the pan handler closure
  const dispWRef = useRef(dispW);
  const dispHRef = useRef(dispH);
  dispWRef.current = dispW;
  dispHRef.current = dispH;

  function applyZoom(next: number) {
    const z = Math.max(1, Math.min(4, Math.round(next * 100) / 100));
    if (!nat) {
      setZoom(z);
      return;
    }
    const w = nat.nw * baseScale * z;
    const h = nat.nh * baseScale * z;
    const c = clampPos(posRef.current.x, posRef.current.y, w, h);
    posRef.current = c;
    setPos(c);
    setZoom(z);
  }

  function confirm() {
    if (Platform.OS === 'web' && nat && typeof document !== 'undefined') {
      const displayScale = baseScale * zoom;
      const srcSize = CROP_VIEWPORT / displayScale;
      const srcX = -pos.x / displayScale;
      const srcY = -pos.y / displayScale;
      const img = new (window as unknown as { Image: new () => HTMLImageElement }).Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = CROP_OUT;
        canvas.height = CROP_OUT;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, CROP_OUT, CROP_OUT);
          onDone(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          onDone(src);
        }
      };
      img.onerror = () => onDone(src);
      img.src = src;
    } else {
      onDone(src);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.cropBackdrop}>
        <View style={styles.cropCard}>
          <Text style={styles.cropTitle}>Adjust photo</Text>
          <Text style={styles.cropHint}>Drag to move · use −/+ to zoom</Text>
          <View style={styles.cropViewport} {...pan.panHandlers}>
            {nat ? (
              <Image source={{ uri: src }} style={{ position: 'absolute', left: pos.x, top: pos.y, width: dispW, height: dispH }} />
            ) : null}
            <View pointerEvents="none" style={styles.cropCircle} />
          </View>
          <View style={styles.cropZoomRow}>
            <Pressable style={styles.cropZoomBtn} onPress={() => applyZoom(zoom - 0.3)}>
              <Text style={styles.cropZoomBtnText}>−</Text>
            </Pressable>
            <Text style={styles.cropZoomLabel}>Zoom</Text>
            <Pressable style={styles.cropZoomBtn} onPress={() => applyZoom(zoom + 0.3)}>
              <Text style={styles.cropZoomBtnText}>+</Text>
            </Pressable>
          </View>
          <View style={styles.cropActions}>
            <Pressable style={styles.cropCancel} onPress={onCancel}>
              <Text style={styles.cropCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.cropDone} onPress={confirm}>
              <Text style={styles.cropDoneText}>Use photo</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  addRoundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRoundBtnOpen: {
    backgroundColor: colors.glassSoft,
    borderWidth: 1,
    borderColor: colors.border,
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
  cropBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  cropCard: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  cropTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  cropHint: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  cropViewport: {
    width: CROP_VIEWPORT,
    height: CROP_VIEWPORT,
    maxWidth: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0b1020',
    position: 'relative',
  },
  cropCircle: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CROP_VIEWPORT / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  cropZoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
  },
  cropZoomBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropZoomBtnText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
  cropZoomLabel: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cropActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    alignSelf: 'stretch',
  },
  cropCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cropCancelText: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '800',
  },
  cropDone: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  cropDoneText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
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
