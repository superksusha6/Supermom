import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SectionCard } from '@/components/SectionCard';
import { Icon } from '@/components/Icon';
import { WheelTimePicker } from '@/components/WheelTimePicker';
import { CalendarEvent, ChildActivity, ChildProfile, Chore, WeekDayCode } from '@/types/app';
import { choreStatus } from '@/lib/chores';
import { ThemeColors, useThemeColors } from '@/theme/theme';

const AVATAR_COLORS = ['#3b5bdb', '#7c3aed', '#0ea5e9', '#16a34a', '#e08a2b', '#e11d48', '#0891b2', '#db2777'];
const WEEK_DAYS: { code: WeekDayCode; label: string }[] = [
  { code: 'mon', label: 'M' },
  { code: 'tue', label: 'T' },
  { code: 'wed', label: 'W' },
  { code: 'thu', label: 'T' },
  { code: 'fri', label: 'F' },
  { code: 'sat', label: 'S' },
  { code: 'sun', label: 'S' },
];
// Half-hour options 6:00 AM → 9:00 PM for the activity time / range picker.
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 6; h <= 21; h += 1) {
    for (const m of [0, 30]) {
      const suffix = h < 12 ? 'AM' : 'PM';
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      out.push(`${hour12}:${m === 0 ? '00' : '30'} ${suffix}`);
    }
  }
  return out;
})();

// Filter the time list by a typed query: "6" -> all 6-o'clock options, "6 pm"/"6p" -> PM only, "630" -> 6:30.
function filterTimeOptions(query: string): string[] {
  const s = query.trim().toLowerCase();
  if (!s) return TIME_OPTIONS;
  const compact = s.replace(/[\s:]/g, '');
  return TIME_OPTIONS.filter((opt) => {
    const low = opt.toLowerCase();
    const optCompact = low.replace(/[\s:]/g, '');
    return low.startsWith(s) || optCompact.startsWith(compact) || optCompact.includes(compact);
  });
}

// Add minutes to a "h:mm AM/PM" string (used to default an activity's end time).
function addMinutesToTime(t: string, add: number): string {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t.trim());
  if (!m) return t;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  let total = (h * 60 + parseInt(m[2], 10) + add) % 1440;
  if (total < 0) total += 1440;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const ap = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
}

// "2026-08-25" -> "Mon, Aug 25" for the child's event list.
function formatEventDate(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return dateKey;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Weekday of a "YYYY-MM-DD" key (0=Sun).
function weekdayOf(dateKey: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return 0;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay();
}
// "Tue · Wed · Thu · Fri" from a set of dates (unique weekdays, Mon-first order).
function weekdaysSummary(dates: string[]): string {
  const present = new Set(dates.map(weekdayOf));
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.filter((d) => present.has(d)).map((d) => DOW_SHORT[d]).join(' · ');
}

const SHORT_DAY: Record<WeekDayCode, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const FULL_DAY: Record<WeekDayCode, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

function activityScheduleLabel(activity: ChildActivity): string {
  const days = WEEK_DAYS.filter((d) => (activity.weekDays || []).includes(d.code)).map((d) => d.code);
  if (!days.length) return `${activity.timesPerWeek} times per week`;
  const dt = activity.dayTimes || {};
  const de = activity.dayEndTimes || {};
  const rangeFor = (code: WeekDayCode) => {
    const start = dt[code] || activity.time || '';
    if (!start) return '';
    return de[code] ? `${start}–${de[code]}` : start;
  };
  const uniqueRanges = Array.from(new Set(days.map(rangeFor)));
  if (uniqueRanges.length === 1) {
    const daysStr = days.map((d) => SHORT_DAY[d]).join(' · ');
    return uniqueRanges[0] ? `${daysStr} · ${uniqueRanges[0]}` : daysStr;
  }
  return days.map((d) => `${SHORT_DAY[d]}${rangeFor(d) ? ` ${rangeFor(d)}` : ''}`).join(' · ');
}

type TodayPlan = { time: string; title: string };

type Props = {
  children: ChildProfile[];
  onAddActivity: (
    childId: string,
    activityName: string,
    weekDays: WeekDayCode[],
    dayTimes: Partial<Record<WeekDayCode, string>>,
    dayEndTimes: Partial<Record<WeekDayCode, string>>,
  ) => void;
  onUpdateActivity: (
    childId: string,
    activityId: string,
    activityName: string,
    weekDays: WeekDayCode[],
    dayTimes: Partial<Record<WeekDayCode, string>>,
    dayEndTimes: Partial<Record<WeekDayCode, string>>,
  ) => void;
  onDeleteActivity: (childId: string, activityId: string) => void;
  onDeleteChild: (childId: string) => void;
  onEditChild: (childId: string) => void;
  onInviteChild?: (childId: string) => void;
  onAddChild: () => void;
  onSetChildPhoto: (childId: string, photoUri: string) => void;
  chores: Chore[];
  onAddChore: (childId: string, title: string) => void;
  onToggleChore: (choreId: string) => void;
  onDeleteChore: (choreId: string) => void;
  eventsByChild?: Record<string, CalendarEvent[]>;
  onDeleteEvent?: (payload: { id: string }) => void;
  onDeleteSeries?: (seriesId: string) => void;
  todayPlansByChild?: Record<string, TodayPlan[]>;
  quickActionRequest?: { type: 'add-activity'; token: number } | null;
};

export function ChildrenScreen({
  children,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  onDeleteChild,
  onEditChild,
  onInviteChild,
  onAddChild,
  onSetChildPhoto,
  chores,
  onAddChore,
  onToggleChore,
  onDeleteChore,
  eventsByChild,
  onDeleteEvent,
  onDeleteSeries,
  todayPlansByChild,
  quickActionRequest,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [openChildId, setOpenChildId] = useState<string | null>(null);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropChildId, setCropChildId] = useState<string | null>(null);
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [childMenuOpen, setChildMenuOpen] = useState(false);
  const [listMenuChildId, setListMenuChildId] = useState<string | null>(null);
  const [addChoreOpen, setAddChoreOpen] = useState(false);
  const [choreTitle, setChoreTitle] = useState('');
  const [activityName, setActivityName] = useState('');
  const [activityDays, setActivityDays] = useState<WeekDayCode[]>([]);
  const [activityDayStart, setActivityDayStart] = useState<Partial<Record<WeekDayCode, string>>>({});
  const [activityDayEnd, setActivityDayEnd] = useState<Partial<Record<WeekDayCode, string>>>({});
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [openTime, setOpenTime] = useState<{ day: WeekDayCode; field: 'start' | 'end' } | null>(null);
  const [timeQuery, setTimeQuery] = useState('');

  const child = children.find((item) => item.id === openChildId) || null;

  useEffect(() => {
    setAddActivityOpen(false);
    setActivityName('');
    setActivityDays([]);
    setActivityDayStart({});
    setActivityDayEnd({});
    setEditingActivityId(null);
    setOpenTime(null);
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

  function openAddActivity() {
    setEditingActivityId(null);
    setActivityName('');
    setActivityDays([]);
    setActivityDayStart({});
    setActivityDayEnd({});
    setOpenTime(null);
    setAddActivityOpen(true);
  }

  function openEditActivity(activity: ChildActivity) {
    setEditingActivityId(activity.id);
    setActivityName(activity.name);
    const days = WEEK_DAYS.filter((d) => (activity.weekDays || []).includes(d.code)).map((d) => d.code);
    setActivityDays(days);
    const start: Partial<Record<WeekDayCode, string>> = { ...(activity.dayTimes || {}) };
    // Seed per-day start from a legacy single time so existing activities stay editable.
    if (!activity.dayTimes && activity.time) days.forEach((d) => { start[d] = activity.time; });
    setActivityDayStart(start);
    setActivityDayEnd({ ...(activity.dayEndTimes || {}) });
    setOpenTime(null);
    setAddActivityOpen(true);
  }

  function toggleActivityDay(code: WeekDayCode) {
    const isOn = activityDays.includes(code);
    if (isOn) {
      setActivityDays((prev) => prev.filter((x) => x !== code));
      setActivityDayStart((prev) => { const next = { ...prev }; delete next[code]; return next; });
      setActivityDayEnd((prev) => { const next = { ...prev }; delete next[code]; return next; });
      if (openTime?.day === code) setOpenTime(null);
    } else {
      setActivityDays((prev) => [...prev, code]);
      // Every day gets a start time (like the calendar picker) — reuse a time already set
      // on another day, else default to 4:00 PM. End stays optional.
      setActivityDayStart((prev) => {
        const shared = Object.values(prev).find(Boolean);
        return { ...prev, [code]: shared || '4:00 PM' };
      });
      setActivityDayEnd((prev) => {
        const shared = Object.values(prev).find(Boolean);
        return shared ? { ...prev, [code]: shared } : prev;
      });
    }
  }

  // "Same time for all days": copy the first day that has a time onto every selected day,
  // so you don't have to set each one by hand.
  function applyTimeToAllDays() {
    const ordered = WEEK_DAYS.filter((d) => activityDays.includes(d.code)).map((d) => d.code);
    const source = ordered.find((c) => activityDayStart[c]);
    if (!source) return;
    const s = activityDayStart[source] as string;
    const e = activityDayEnd[source];
    setActivityDayStart((prev) => { const next = { ...prev }; ordered.forEach((c) => { next[c] = s; }); return next; });
    setActivityDayEnd((prev) => {
      const next = { ...prev };
      ordered.forEach((c) => { if (e) next[c] = e; else delete next[c]; });
      return next;
    });
    setOpenTime(null);
  }

  function saveActivity() {
    const name = activityName.trim();
    if (!name || !child) return;
    const days = WEEK_DAYS.filter((d) => activityDays.includes(d.code)).map((d) => d.code);
    const dayTimes: Partial<Record<WeekDayCode, string>> = {};
    const dayEndTimes: Partial<Record<WeekDayCode, string>> = {};
    days.forEach((d) => {
      if (activityDayStart[d]) dayTimes[d] = activityDayStart[d];
      // Only keep an end if there is a start to pair it with.
      if (activityDayStart[d] && activityDayEnd[d]) dayEndTimes[d] = activityDayEnd[d];
    });
    if (editingActivityId) onUpdateActivity(child.id, editingActivityId, name, days, dayTimes, dayEndTimes);
    else onAddActivity(child.id, name, days, dayTimes, dayEndTimes);
    setAddActivityOpen(false);
    setEditingActivityId(null);
    setActivityName('');
    setActivityDays([]);
    setActivityDayStart({});
    setActivityDayEnd({});
    setOpenTime(null);
  }

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
        {children.length === 0 ? (
          <Text style={styles.emptyText}>No children yet — use the ☰ menu (top right) → “Add child”.</Text>
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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Options for ${item.name}`}
                  hitSlop={6}
                  onPress={() => setListMenuChildId(item.id)}
                >
                  {renderAvatar(item, 56)}
                  <View style={styles.childCardAvatarBadge}>
                    <Text style={styles.childCardAvatarBadgeText}>⋯</Text>
                  </View>
                </Pressable>
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
      <Modal visible={!!listMenuChildId} transparent animationType="fade" onRequestClose={() => setListMenuChildId(null)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setListMenuChildId(null)}>
          <Pressable style={styles.menuCard} onPress={() => undefined}>
            <Pressable style={styles.menuRow} onPress={() => { const id = listMenuChildId; setListMenuChildId(null); if (id) onEditChild(id); }}>
              <Text style={styles.menuRowText}>Edit child</Text>
            </Pressable>
            {onInviteChild ? (
              <>
                <View style={styles.menuDivider} />
                <Pressable style={styles.menuRow} onPress={() => { const id = listMenuChildId; setListMenuChildId(null); if (id) onInviteChild(id); }}>
                  <Text style={styles.menuRowText}>Invite to their own account</Text>
                </Pressable>
              </>
            ) : null}
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuRow} onPress={() => { const id = listMenuChildId; setListMenuChildId(null); if (id) onDeleteChild(id); }}>
              <Text style={[styles.menuRowText, styles.menuRowDanger]}>Delete child &amp; calendar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
          <Pressable accessibilityRole="button" accessibilityLabel="More options" style={styles.moreBtn} onPress={() => setChildMenuOpen(true)}>
            <Icon name="more" color={colors.subtext} size={20} />
          </Pressable>
        </View>

        {plans.length ? (
          <View style={styles.detailPlans}>
            <Text style={styles.detailPlansLabel}>Today</Text>
            {plans.map((p, i) => (
              <Text key={i} style={styles.detailPlanItem}>{`${p.time}  ${p.title}`.trim()}</Text>
            ))}
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Activities / Sports / Clubs">
        <View style={styles.profileHeaderRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add activity"
            style={styles.addRoundBtn}
            onPress={openAddActivity}
          >
            <Icon name="plus" color="#ffffff" size={20} />
          </Pressable>
        </View>
        {child.activities.length === 0 ? (
          <Text style={styles.emptyText}>No activities yet — tap “+” to add one.</Text>
        ) : null}
        {child.activities.map((activity) => (
          <View key={activity.id} style={[styles.item, styles.activityRow]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${activity.name}`}
              style={styles.activityCopy}
              onPress={() => openEditActivity(activity)}
            >
              <Text style={styles.title}>{activity.name}</Text>
              <Text style={styles.meta}>{activityScheduleLabel(activity)}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${activity.name}`}
              style={styles.activityEdit}
              onPress={() => openEditActivity(activity)}
            >
              <Text style={styles.activityEditText}>Edit</Text>
            </Pressable>
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
      </SectionCard>

      {onDeleteEvent ? (
        <SectionCard title="Calendar events">
          {(() => {
            const todayKey = new Date().toISOString().slice(0, 10);
            const list = (eventsByChild?.[child.id] || [])
              .filter((e) => e.date >= todayKey)
              .sort((a, b) => (a.date === b.date ? (a.time || '').localeCompare(b.time || '') : a.date.localeCompare(b.date)));
            if (list.length === 0) {
              return <Text style={styles.emptyText}>No upcoming events. Add them on the Calendar tab.</Text>;
            }
            // Collapse a repeating event (shared seriesId) into ONE row; standalone
            // events keep their own row keyed by id.
            const groups = new Map<string, CalendarEvent[]>();
            for (const e of list) {
              const key = e.seriesId || `one:${e.id}`;
              const arr = groups.get(key);
              if (arr) arr.push(e);
              else groups.set(key, [e]);
            }
            return Array.from(groups.entries()).map(([key, group]) => {
              const first = group[0];
              const isSeries = group.length > 1 && !!first.seriesId;
              if (!isSeries) {
                return (
                  <View key={key} style={[styles.item, styles.activityRow]}>
                    <View style={styles.activityCopy}>
                      <Text style={styles.title}>{first.title}</Text>
                      <Text style={styles.meta}>
                        {formatEventDate(first.date)}
                        {first.time ? ` · ${first.time}` : ''}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${first.title}`}
                      style={styles.activityRemove}
                      onPress={() => onDeleteEvent({ id: first.id })}
                    >
                      <Text style={styles.activityRemoveText}>Remove</Text>
                    </Pressable>
                  </View>
                );
              }
              const expanded = expandedSeries.has(key);
              const dates = group.map((e) => e.date);
              return (
                <View key={key} style={styles.seriesGroup}>
                  <View style={[styles.item, styles.activityRow]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${first.title}, repeats. Tap to see dates.`}
                      style={styles.activityCopy}
                      onPress={() =>
                        setExpandedSeries((prev) => {
                          const next = new Set(prev);
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          return next;
                        })
                      }
                    >
                      <Text style={styles.title}>{first.title}</Text>
                      <Text style={styles.meta}>
                        {`Repeats · ${weekdaysSummary(dates)}${first.time ? ` · ${first.time}` : ''}`}
                      </Text>
                      <Text style={styles.seriesRange}>
                        {`${group.length} dates · ${formatEventDate(dates[0])} – ${formatEventDate(dates[dates.length - 1])} · ${expanded ? 'hide dates ▲' : 'tap to see dates ▼'}`}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove all ${first.title}`}
                      style={styles.activityRemove}
                      onPress={() => (first.seriesId && onDeleteSeries ? onDeleteSeries(first.seriesId) : onDeleteEvent({ id: first.id }))}
                    >
                      <Text style={styles.activityRemoveText}>Remove all</Text>
                    </Pressable>
                  </View>
                  {expanded
                    ? group.map((occ) => (
                        <View key={occ.id} style={styles.seriesDateRow}>
                          <Text style={styles.seriesDateText}>
                            {formatEventDate(occ.date)}
                            {occ.time ? ` · ${occ.time}` : ''}
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${occ.title} on ${formatEventDate(occ.date)}`}
                            hitSlop={8}
                            onPress={() => onDeleteEvent({ id: occ.id })}
                          >
                            <Text style={styles.seriesDateRemove}>Remove this day</Text>
                          </Pressable>
                        </View>
                      ))
                    : null}
                </View>
              );
            });
          })()}
        </SectionCard>
      ) : null}

      <SectionCard title="Responsibilities / Chores">
        <View style={styles.profileHeaderRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add chore"
            style={styles.addRoundBtn}
            onPress={() => { setChoreTitle(''); setAddChoreOpen(true); }}
          >
            <Icon name="plus" color="#ffffff" size={20} />
          </Pressable>
        </View>
        {chores.filter((c) => c.childId === child.id).length === 0 ? (
          <Text style={styles.emptyText}>No chores yet — tap “+” to give a responsibility.</Text>
        ) : null}
        {chores
          .filter((c) => c.childId === child.id)
          .map((chore) => {
            const done = choreStatus(chore) !== 'todo';
            return (
              <View key={chore.id} style={[styles.item, styles.activityRow]}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={`Mark ${chore.title} ${done ? 'not done' : 'done'}`}
                  hitSlop={8}
                  style={[styles.choreCheck, done && styles.choreCheckDone]}
                  onPress={() => onToggleChore(chore.id)}
                >
                  {done ? <Text style={styles.choreCheckMark}>✓</Text> : null}
                </Pressable>
                <View style={styles.activityCopy}>
                  <Text style={[styles.title, done && styles.choreTitleDone]}>{chore.title}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${chore.title}`}
                  style={styles.activityRemove}
                  onPress={() => onDeleteChore(chore.id)}
                >
                  <Text style={styles.activityRemoveText}>Remove</Text>
                </Pressable>
              </View>
            );
          })}
      </SectionCard>

      <Modal visible={addChoreOpen} transparent animationType="fade" onRequestClose={() => setAddChoreOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setAddChoreOpen(false)}>
          <Pressable style={styles.formCard} onPress={() => undefined}>
            <Text style={styles.formTitle}>New chore</Text>
            <TextInput value={choreTitle} onChangeText={setChoreTitle} placeholder="e.g. Make the bed" placeholderTextColor={colors.subtext} style={styles.input} autoFocus autoComplete="off" autoCorrect={false} spellCheck={false} textContentType="none" />
            <View style={styles.formActions}>
              <Pressable style={styles.formCancel} onPress={() => setAddChoreOpen(false)}>
                <Text style={styles.formCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.formSave}
                onPress={() => {
                  if (!choreTitle.trim()) return;
                  onAddChore(child.id, choreTitle.trim());
                  setChoreTitle('');
                  setAddChoreOpen(false);
                }}
              >
                <Text style={styles.formSaveText}>Add</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={childMenuOpen} transparent animationType="fade" onRequestClose={() => setChildMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setChildMenuOpen(false)}>
          <Pressable style={styles.menuCard} onPress={() => undefined}>
            <Pressable style={styles.menuRow} onPress={() => { setChildMenuOpen(false); onEditChild(child.id); }}>
              <Text style={styles.menuRowText}>Edit child</Text>
            </Pressable>
            {onInviteChild ? (
              <>
                <View style={styles.menuDivider} />
                <Pressable style={styles.menuRow} onPress={() => { setChildMenuOpen(false); onInviteChild(child.id); }}>
                  <Text style={styles.menuRowText}>Invite to their own account</Text>
                </Pressable>
              </>
            ) : null}
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuRow} onPress={() => { setChildMenuOpen(false); onDeleteChild(child.id); }}>
              <Text style={[styles.menuRowText, styles.menuRowDanger]}>Delete child</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={addActivityOpen} transparent animationType="fade" onRequestClose={() => setAddActivityOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setAddActivityOpen(false)}>
          <Pressable style={styles.formCard} onPress={() => undefined}>
            <Text style={styles.formTitle}>{editingActivityId ? 'Edit activity' : 'New activity'}</Text>
            <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
              <TextInput value={activityName} onChangeText={setActivityName} placeholder="Activity name" placeholderTextColor={colors.subtext} style={styles.input} autoFocus autoComplete="off" autoCorrect={false} spellCheck={false} textContentType="none" />
              <Text style={styles.formSubLabel}>Which days?</Text>
              <View style={styles.dayRow}>
                {WEEK_DAYS.map((d) => {
                  const on = activityDays.includes(d.code);
                  return (
                    <Pressable
                      key={d.code}
                      accessibilityRole="button"
                      accessibilityLabel={d.code}
                      style={[styles.dayToggle, on && styles.dayToggleOn]}
                      onPress={() => toggleActivityDay(d.code)}
                    >
                      <Text style={[styles.dayToggleText, on && styles.dayToggleTextOn]}>{d.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {activityDays.length ? (
                <>
                  <Text style={styles.formSubLabel}>Busy time each day</Text>
                  {activityDays.length >= 2 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Use the same time for all selected days"
                      style={styles.sameTimeBtn}
                      onPress={applyTimeToAllDays}
                    >
                      <Text style={styles.sameTimeBtnText}>↕ Same time for all days</Text>
                    </Pressable>
                  ) : null}
                  {WEEK_DAYS.filter((d) => activityDays.includes(d.code)).map((d) => {
                    const start = activityDayStart[d.code] || '4:00 PM';
                    const end = activityDayEnd[d.code];
                    const openStart = openTime?.day === d.code && openTime.field === 'start';
                    const openEnd = openTime?.day === d.code && openTime.field === 'end';
                    return (
                      <View key={d.code} style={styles.dayTimeBlock}>
                        <View style={styles.dayTimeHeadRow}>
                          <Text style={styles.dayTimeLabel}>{FULL_DAY[d.code]}</Text>
                          {end ? (
                            <Pressable onPress={() => { setActivityDayEnd((p) => { const n = { ...p }; delete n[d.code]; return n; }); if (openEnd) setOpenTime(null); }}>
                              <Text style={styles.dayEndLink}>✕ no end</Text>
                            </Pressable>
                          ) : (
                            <Pressable onPress={() => setActivityDayEnd((p) => ({ ...p, [d.code]: addMinutesToTime(start, 60) }))}>
                              <Text style={styles.dayEndLink}>＋ add end</Text>
                            </Pressable>
                          )}
                        </View>
                        <View style={styles.dayTimeWheels}>
                          <View style={styles.dayTimeCol}>
                            <Text style={styles.dayTimeMini}>Starts</Text>
                            <WheelTimePicker
                              value={start}
                              onChange={(v) => setActivityDayStart((p) => ({ ...p, [d.code]: v }))}
                              open={openStart}
                              onOpenChange={(o) => setOpenTime(o ? { day: d.code, field: 'start' } : null)}
                            />
                          </View>
                          {end ? (
                            <View style={styles.dayTimeCol}>
                              <Text style={styles.dayTimeMini}>Ends</Text>
                              <WheelTimePicker
                                value={end}
                                onChange={(v) => setActivityDayEnd((p) => ({ ...p, [d.code]: v }))}
                                open={openEnd}
                                onOpenChange={(o) => setOpenTime(o ? { day: d.code, field: 'end' } : null)}
                              />
                            </View>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </>
              ) : null}
            </ScrollView>
            <View style={styles.formActions}>
              <Pressable style={styles.formCancel} onPress={() => setAddActivityOpen(false)}>
                <Text style={styles.formCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.formSave} onPress={saveActivity}>
                <Text style={styles.formSaveText}>{editingActivityId ? 'Save' : 'Add'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {cropModal}
    </>
  );
}

const CROP_VIEWPORT = 280;
const CROP_OUT = 512;

export function PhotoCropper({
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
  seriesGroup: {
    marginBottom: 2,
  },
  seriesRange: {
    color: colors.subtext,
    fontSize: 11.5,
    marginTop: 2,
  },
  seriesDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  seriesDateText: {
    color: colors.text,
    fontSize: 13,
  },
  seriesDateRemove: {
    color: '#be123c',
    fontSize: 12,
    fontWeight: '700',
  },
  activityEdit: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f4f7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activityEditText: {
    color: colors.primary,
    fontSize: 12.5,
    fontWeight: '800',
  },
  formScroll: {
    maxHeight: 380,
  },
  dayTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  dayTimeLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  dayTimeBlock: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dayTimeHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayEndLink: {
    color: colors.primary,
    fontSize: 12.5,
    fontWeight: '800',
  },
  dayTimeWheels: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  dayTimeCol: {
    gap: 4,
  },
  dayTimeMini: {
    color: colors.subtext,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dayTimeChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f4f7ff',
    paddingHorizontal: 14,
    height: 36,
    justifyContent: 'center',
  },
  dayTimeChipSet: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayTimeChipText: {
    color: colors.subtext,
    fontSize: 13,
    fontWeight: '800',
  },
  dayTimeChipTextSet: {
    color: '#ffffff',
  },
  timeSearch: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 6,
    marginBottom: 6,
  },
  dayTimeRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayTimeDash: {
    color: colors.subtext,
    fontSize: 15,
    fontWeight: '800',
  },
  choreCheck: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choreCheckDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choreCheckMark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  choreTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.subtext,
  },
  formSubLabel: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  sameTimeBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.selection,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 6,
    marginBottom: 4,
  },
  sameTimeBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
  },
  dayToggle: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f4f7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToggleOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayToggleText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  dayToggleTextOn: {
    color: '#ffffff',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  timePill: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f4f7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePillOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timePillText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  timePillTextOn: {
    color: '#ffffff',
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
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  menuCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuRow: {
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  menuRowText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  menuRowDanger: {
    color: '#dc2626',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  formCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 10,
  },
  formTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  formCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  formCancelText: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '800',
  },
  formSave: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  formSaveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  childCardAvatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 2,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childCardAvatarBadgeText: {
    color: colors.subtext,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 14,
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
    backgroundColor: colors.surface,
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
