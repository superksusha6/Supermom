import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SectionCard } from '@/components/SectionCard';
import { ChildProfile } from '@/types/app';
import { ThemeColors, useThemeColors } from '@/theme/theme';

type Props = {
  children: ChildProfile[];
  onAddActivity: (childId: string, activityName: string, timesPerWeek: number) => void;
  onDeleteChild: (childId: string) => void;
};

export function ChildrenScreen({ children, onAddActivity, onDeleteChild }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedChild, setSelectedChild] = useState(children[0]?.id ?? '');
  const [activityName, setActivityName] = useState('');
  const [timesPerWeek, setTimesPerWeek] = useState('1');

  const child = children.find((item) => item.id === selectedChild);

  useEffect(() => {
    if (selectedChild && children.some((item) => item.id === selectedChild)) return;
    setSelectedChild(children[0]?.id ?? '');
  }, [children, selectedChild]);

  return (
    <>
      <SectionCard title="Children Profiles">
        <View style={styles.row}>
          {children.map((item) => (
            <Pressable key={item.id} onPress={() => setSelectedChild(item.id)} style={[styles.chip, item.id === selectedChild && styles.chipActive]}>
              <Text style={[styles.chipText, item.id === selectedChild && styles.chipTextActive]}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
        {child ? (
          <View style={styles.childMetaRow}>
            <Text style={styles.meta}>Age: {child.age}</Text>
            <Pressable style={styles.deleteBtn} onPress={() => onDeleteChild(child.id)}>
              <Text style={styles.deleteBtnText}>Delete child</Text>
            </Pressable>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Activities / Sports / Clubs">
        {child?.activities.map((activity) => (
          <View key={activity.id} style={styles.item}>
            <Text style={styles.title}>{activity.name}</Text>
            <Text style={styles.meta}>{activity.timesPerWeek} times per week</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Add Activity">
        <TextInput value={activityName} onChangeText={setActivityName} placeholder="Activity name" style={styles.input} />
        <TextInput value={timesPerWeek} onChangeText={setTimesPerWeek} placeholder="Times per week" keyboardType="number-pad" style={styles.input} />
        <Pressable
          style={styles.button}
          onPress={() => {
            if (!child || !activityName.trim()) return;
            onAddActivity(child.id, activityName.trim(), Number(timesPerWeek) || 1);
            setActivityName('');
            setTimesPerWeek('1');
          }}
        >
          <Text style={styles.buttonText}>Add Activity</Text>
        </Pressable>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
