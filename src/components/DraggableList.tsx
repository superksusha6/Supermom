import { ReactNode, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';

// Vertical drag-to-reorder list, built on RN core (no native deps → works on web too).
// Press the grip (⋮⋮) on a row and drag: the row lifts + pulses and a drop line shows
// where it lands. The rest of the row stays tappable.
type Props = {
  ids: string[];
  renderRow: (id: string, dragging: boolean) => ReactNode;
  onReorder: (orderedIds: string[]) => void;
  gap?: number;
  accentColor: string;
  gripColor: string;
};

export function DraggableList({ ids, renderRow, onReorder, gap = 8, accentColor, gripColor }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [targetIndex, setTargetIndex] = useState(-1);
  const translateY = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const heights = useRef<Record<string, number>>({});
  const listRef = useRef<View>(null);
  const listTop = useRef(0);
  const grantY = useRef(0);
  const dragIdRef = useRef<string | null>(null);
  const targetRef = useRef(-1);
  const orderRef = useRef<string[]>(ids);
  orderRef.current = ids;

  const rowSpan = (id: string) => (heights.current[id] || 44) + gap;
  const computeTarget = (pointerY: number) => {
    const order = orderRef.current;
    let y = 0;
    for (let i = 0; i < order.length; i += 1) {
      const span = rowSpan(order[i]);
      if (pointerY < y + span / 2) return i;
      y += span;
    }
    return order.length - 1;
  };

  const startPulse = () => {
    pulse.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 520, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 520, useNativeDriver: false }),
      ]),
    ).start();
  };

  const finishDrag = () => {
    const id = dragIdRef.current;
    const ti = targetRef.current;
    if (id && ti >= 0) {
      const order = [...orderRef.current];
      const from = order.indexOf(id);
      if (from >= 0 && from !== ti) {
        order.splice(from, 1);
        order.splice(ti, 0, id);
        onReorder(order);
      }
    }
    dragIdRef.current = null;
    targetRef.current = -1;
    setDragId(null);
    setTargetIndex(-1);
    pulse.stopAnimation(() => pulse.setValue(0));
    translateY.setValue(0);
  };

  const makeResponder = (id: string) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (e) => {
        dragIdRef.current = id;
        setDragId(id);
        grantY.current = e.nativeEvent.pageY;
        translateY.setValue(0);
        listRef.current?.measureInWindow((_x, y) => {
          listTop.current = y;
        });
        startPulse();
      },
      onPanResponderMove: (e) => {
        const pageY = e.nativeEvent.pageY;
        translateY.setValue(pageY - grantY.current);
        const t = computeTarget(pageY - listTop.current);
        targetRef.current = t;
        setTargetIndex(t);
      },
      onPanResponderRelease: finishDrag,
      onPanResponderTerminate: finishDrag,
    });

  const onRowLayout = (id: string) => (e: LayoutChangeEvent) => {
    heights.current[id] = e.nativeEvent.layout.height;
  };

  const dropLine = <View style={[styles.dropLine, { backgroundColor: accentColor }]} pointerEvents="none" />;

  return (
    <View ref={listRef} style={{ gap }}>
      {ids.map((id, index) => {
        const isDragging = dragId === id;
        const responder = makeResponder(id);
        const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });
        return (
          <View key={id}>
            {dragIdRef.current && targetIndex === index ? dropLine : null}
            <Animated.View
              onLayout={onRowLayout(id)}
              style={[styles.row, isDragging && styles.dragging, isDragging ? { transform: [{ translateY }, { scale }], zIndex: 20 } : null]}
            >
              <View {...responder.panHandlers} style={styles.grip} accessibilityLabel="Drag to reorder">
                <Text style={[styles.gripDots, { color: gripColor }]}>⋮{'\n'}⋮{'\n'}⋮</Text>
              </View>
              <View style={styles.rowBody}>{renderRow(id, isDragging)}</View>
            </Animated.View>
          </View>
        );
      })}
      {dragIdRef.current && targetIndex === ids.length ? dropLine : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dropLine: {
    height: 3,
    borderRadius: 2,
    marginVertical: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  dragging: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  grip: {
    width: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gripDots: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 16,
    textAlign: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
});
