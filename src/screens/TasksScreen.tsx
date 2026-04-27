import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Badge } from '@/components/Badge';
import { SectionCard } from '@/components/SectionCard';
import { ApprovalRequest, Role, TaskItem, TaskPriority, TaskStatus } from '@/types/app';
import { colors } from '@/theme/colors';

type Props = {
  parentLabel: 'Mom' | 'Dad';
  currentRole: Role;
  tasks: TaskItem[];
  requests: ApprovalRequest[];
  taskNotificationCount: number;
  taskNotificationPreview: string;
  loading?: boolean;
  errorMessage?: string;
  onRefresh: () => void;
  onOpenTaskNotifications: () => void;
  onCompleteStaffTask: (taskId: string) => void;
  onCreateTask: (payload: { title: string; assigneeRole: Role; priority: TaskPriority; deadlineAt?: string }) => void;
  onChangeStatus: (taskId: string, status: TaskStatus) => void;
  onRequestDelete: (taskId: string) => void;
  onResolveRequest: (requestId: string, status: 'approved' | 'declined') => void;
};

export function TasksScreen({
  parentLabel,
  currentRole,
  tasks,
  requests,
  taskNotificationCount,
  taskNotificationPreview,
  loading = false,
  errorMessage,
  onRefresh,
  onOpenTaskNotifications,
  onCompleteStaffTask,
  onCreateTask,
  onChangeStatus,
  onRequestDelete,
  onResolveRequest,
}: Props) {
  const [newTitle, setNewTitle] = useState('');
  const [isPlanInputOpen, setIsPlanInputOpen] = useState(false);
  const [newTime, setNewTime] = useState('10:00 AM');
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [dialStep, setDialStep] = useState<'hour' | 'minute'>('hour');
  const [dialHour, setDialHour] = useState(10);
  const [dialMinute, setDialMinute] = useState(0);
  const [dialPeriod, setDialPeriod] = useState<'AM' | 'PM'>('AM');

  const dialItems = dialStep === 'hour' ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 12 }, (_, i) => i * 5);
  const dialDots = useMemo(() => {
    const size = 230;
    const center = size / 2;
    const radius = 88;
    return dialItems.map((item, index) => {
      const angle = (Math.PI * 2 * index) / 12 - Math.PI / 2;
      return {
        value: item,
        left: center + Math.cos(angle) * radius - 19,
        top: center + Math.sin(angle) * radius - 19,
      };
    });
  }, [dialItems]);

  const visibleTasks = useMemo(() => {
    let data = tasks;

    if (currentRole === 'staff') data = data.filter((t) => t.assigneeRole === 'staff');
    if (currentRole === 'child') data = data.filter((t) => t.assigneeRole === 'child');

    return data.sort((a, b) => {
      const priorityOrder = { urgent: 0, non_urgent: 1 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [tasks, currentRole]);

  function openTimePicker() {
    const parsed = parseTimeValue(newTime);
    setDialHour(parsed.hour);
    setDialMinute(parsed.minute);
    setDialPeriod(parsed.period);
    setDialStep('hour');
    setTimePickerOpen(true);
  }

  function handlePickDialValue(value: number) {
    if (dialStep === 'hour') {
      setDialHour(value);
      setDialStep('minute');
      return;
    }
    const next = formatClockTime(dialHour, value, dialPeriod);
    setDialMinute(value);
    setNewTime(next);
    setTimePickerOpen(false);
  }

  function buildDeadlineAt(timeValue: string) {
    const parsed = parseTimeValue(timeValue);
    const hour24 = parsed.period === 'PM' ? (parsed.hour % 12) + 12 : parsed.hour % 12;
    const now = new Date();
    now.setHours(hour24, parsed.minute, 0, 0);
    return now.toISOString();
  }

  return (
    <>
      <SectionCard title="Tasks">
        {currentRole === 'mother' ? (
          <Pressable style={styles.completedRow} onPress={onOpenTaskNotifications}>
            <View style={styles.completedTextWrap}>
              <Text style={styles.completedTitle}>Tasks</Text>
              <Text style={styles.completedMeta}>{taskNotificationPreview}</Text>
            </View>
            <View style={styles.completedCountBadge}>
              <Text style={styles.completedCountText}>{`+${taskNotificationCount}`}</Text>
            </View>
          </Pressable>
        ) : null}

        {visibleTasks.map((task) => (
          <View style={styles.task} key={task.id}>
            <View style={styles.taskHead}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Badge tone={task.status === 'done' ? 'done' : task.priority === 'urgent' ? 'urgent' : 'non_urgent'} label={task.status === 'done' ? 'Done' : task.priority === 'urgent' ? 'Urgent' : 'Non-urgent'} />
            </View>
            <Text style={styles.meta}>
              Assigned: {task.assigneeRole === 'mother' ? parentLabel : task.assigneeName} - Deadline: {task.deadline}
            </Text>

            {currentRole === 'staff' && task.assigneeRole === 'staff' ? (
              <Pressable style={styles.staffCheckRow} disabled={task.status === 'done'} onPress={() => onCompleteStaffTask(task.id)}>
                <View style={[styles.staffCheckbox, task.status === 'done' && styles.staffCheckboxDone]}>
                  {task.status === 'done' ? <Text style={styles.staffCheckboxTick}>✓</Text> : null}
                </View>
                <Text style={styles.secondaryText}>{task.status === 'done' ? 'Completed' : 'Task completed'}</Text>
              </Pressable>
            ) : (
              <View style={styles.row}>
                <Pressable style={styles.secondaryAction} onPress={() => onChangeStatus(task.id, 'in_progress')}>
                  <Text style={styles.secondaryText}>In Progress</Text>
                </Pressable>
                <Pressable style={[styles.secondaryAction, styles.secondaryDone]} onPress={() => onChangeStatus(task.id, 'done')}>
                  <Text style={styles.secondaryText}>Done</Text>
                </Pressable>
              </View>
            )}

            {currentRole === 'child' && task.needsParentApproval ? (
              <Pressable style={styles.action} onPress={() => onRequestDelete(task.id)}>
                <Text style={styles.actionText}>Request Parent Approval to Delete</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </SectionCard>

      {currentRole === 'mother' ? (
        <>
          <SectionCard title="Approval Requests">
            {requests.filter((r) => r.status === 'pending').map((request) => (
              <View style={styles.task} key={request.id}>
                <Text style={styles.taskTitle}>Child requested: {request.action}</Text>
                <Text style={styles.meta}>Requested at {request.createdAt}</Text>
                <View style={styles.row}>
                  <Pressable style={[styles.action, styles.approve]} onPress={() => onResolveRequest(request.id, 'approved')}>
                    <Text style={styles.actionText}>Approve</Text>
                  </Pressable>
                  <Pressable style={[styles.action, styles.decline]} onPress={() => onResolveRequest(request.id, 'declined')}>
                    <Text style={styles.actionText}>Decline</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            {requests.filter((r) => r.status === 'pending').length === 0 ? (
              <Text style={styles.meta}>No pending requests.</Text>
            ) : null}
          </SectionCard>
        </>
      ) : null}

      <Modal visible={timePickerOpen} transparent animationType="fade" onRequestClose={() => setTimePickerOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.clockModalCard}>
            <Text style={styles.modalTitle}>Pick Time</Text>
            <Text style={styles.modalSub}>{dialStep === 'hour' ? 'Step 1: Select hour' : 'Step 2: Select minute'}</Text>
            <View style={styles.clockDial}>
              {dialDots.map((dot) => (
                <Pressable
                  key={`${dialStep}-${dot.value}`}
                  style={[
                    styles.clockNumber,
                    { left: dot.left, top: dot.top },
                    (dialStep === 'hour' ? dialHour === dot.value : dialMinute === dot.value) && styles.clockNumberActive,
                  ]}
                  onPress={() => handlePickDialValue(dot.value)}
                >
                  <Text style={styles.clockNumberText}>{dialStep === 'minute' ? String(dot.value).padStart(2, '0') : dot.value}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.ampmToggle} onPress={() => setDialPeriod((prev) => (prev === 'AM' ? 'PM' : 'AM'))}>
                <Text style={styles.ampmText}>{dialPeriod}</Text>
              </Pressable>
            </View>
            <Text style={styles.timePreview}>{formatClockTime(dialHour, dialMinute, dialPeriod)}</Text>
            <View style={styles.timeDoneWrap}>
              <Pressable
                style={[styles.action, styles.approve, styles.timeDoneButton]}
                onPress={() => {
                  setNewTime(formatClockTime(dialHour, dialMinute, dialPeriod));
                  setTimePickerOpen(false);
                }}
              >
                <Text style={styles.actionText}>✓ Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  completedRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  completedTextWrap: {
    flex: 1,
    gap: 4,
  },
  completedTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.text,
  },
  completedMeta: {
    color: colors.subtext,
    fontSize: 13,
  },
  completedCountBadge: {
    minWidth: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.selection,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedCountText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  task: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
    gap: 8,
  },
  taskHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  taskTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  meta: {
    color: colors.subtext,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  planInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planInput: {
    flex: 1,
    marginBottom: 0,
  },
  clockBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.selection,
  },
  clockBtnText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  timeValue: {
    marginTop: 8,
    marginBottom: 8,
    color: colors.subtext,
    fontWeight: '700',
  },
  plusButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.selection,
    marginBottom: 8,
  },
  plusButtonText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
  },
  planComposer: {
    width: '100%',
  },
  action: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  approve: {
    backgroundColor: colors.done,
  },
  decline: {
    backgroundColor: colors.urgent,
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  secondaryDone: {
    borderColor: colors.done,
    backgroundColor: '#dcfce7',
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  staffCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  staffCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffCheckboxDone: {
    borderColor: colors.done,
    backgroundColor: '#dcfce7',
  },
  staffCheckboxTick: {
    color: colors.done,
    fontWeight: '800',
  },
  error: {
    color: colors.urgent,
    marginTop: 8,
    fontWeight: '600',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  clockModalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  modalSub: {
    color: colors.subtext,
    fontWeight: '600',
  },
  clockDial: {
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 2,
    borderColor: colors.border,
    alignSelf: 'center',
    position: 'relative',
    marginTop: 4,
    marginBottom: 4,
  },
  clockNumber: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  clockNumberActive: {
    borderColor: colors.primary,
    backgroundColor: colors.selection,
  },
  clockNumberText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  ampmToggle: {
    position: 'absolute',
    left: 83,
    top: 83,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.selection,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ampmText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 20,
  },
  timePreview: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  timeDoneWrap: {
    alignItems: 'center',
  },
  timeDoneButton: {
    minWidth: 140,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
});

function formatClockTime(hour: number, minute: number, period: 'AM' | 'PM') {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
}

function parseTimeValue(value: string) {
  const text = value.trim();
  const twelve = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelve) {
    const rawHour = Number(twelve[1]);
    const hour = rawHour >= 1 && rawHour <= 12 ? rawHour : 10;
    const rawMinute = Number(twelve[2]);
    const minute = Number.isFinite(rawMinute) ? Math.max(0, Math.min(55, Math.round(rawMinute / 5) * 5)) : 0;
    const period = twelve[3].toUpperCase() === 'PM' ? 'PM' : 'AM';
    return { hour, minute, period } as const;
  }
  return { hour: 10, minute: 0, period: 'AM' as const };
}
