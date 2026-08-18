import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';

// Vertical reorder list (RN core Animated + PanResponder → works on web).
// Long-press a row → "arrange mode": every row pulses and can be dragged. Drag to move.
// A tap (no drag) exits arrange mode. Outside arrange mode a tap acts normally (opens the row).
type ArmProps = { onLongPress: () => void; delayLongPress: number };
type Props = {
  ids: string[];
  renderRow: (id: string, active: boolean, armProps: ArmProps) => ReactNode;
  onReorder: (orderedIds: string[]) => void;
  gap?: number;
  accentColor: string;
};

export function DraggableList({ ids, renderRow, onReorder, gap = 8, accentColor }: Props) {
  const [arranging, setArranging] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [targetIndex, setTargetIndex] = useState(-1);
  const translateY = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const heights = useRef<Record<string, number>>({});
  const listRef = useRef<View>(null);
  const listTop = useRef(0);
  const grantY = useRef(0);
  const movedRef = useRef(false);
  const dragIdRef = useRef<string | null>(null);
  const targetRef = useRef(-1);
  const arrangingRef = useRef(false);
  const orderRef = useRef<string[]>(ids);
  orderRef.current = ids;

  useEffect(() => {
    arrangingRef.current = arranging;
    if (!arranging) {
      pulse.setValue(0);
      return undefined;
    }
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 470, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 470, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [arranging, pulse]);

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

  const clearDrag = () => {
    dragIdRef.current = null;
    targetRef.current = -1;
    setDragId(null);
    setTargetIndex(-1);
    translateY.setValue(0);
  };
  const commitReorder = () => {
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
  };

  const makeResponder = (id: string) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => arrangingRef.current,
      onStartShouldSetPanResponderCapture: () => arrangingRef.current,
      onMoveShouldSetPanResponder: () => arrangingRef.current,
      onMoveShouldSetPanResponderCapture: () => arrangingRef.current,
      onPanResponderGrant: (e) => {
        dragIdRef.current = id;
        setDragId(id);
        grantY.current = e.nativeEvent.pageY;
        movedRef.current = false;
        translateY.setValue(0);
        listRef.current?.measureInWindow((_x, y) => {
          listTop.current = y;
        });
      },
      onPanResponderMove: (e) => {
        const dy = e.nativeEvent.pageY - grantY.current;
        if (Math.abs(dy) > 6) movedRef.current = true;
        translateY.setValue(dy);
        const t = computeTarget(e.nativeEvent.pageY - listTop.current);
        targetRef.current = t;
        setTargetIndex(t);
      },
      onPanResponderRelease: () => {
        if (movedRef.current) commitReorder();
        else setArranging(false); // a tap while arranging → back to normal mode
        clearDrag();
      },
      onPanResponderTerminate: () => {
        if (movedRef.current) commitReorder();
        clearDrag();
      },
    });

  const onRowLayout = (id: string) => (e: LayoutChangeEvent) => {
    heights.current[id] = e.nativeEvent.layout.height;
  };

  const dropLine = <View style={[styles.dropLine, { backgroundColor: accentColor }]} pointerEvents="none" />;
  const armProps: ArmProps = { onLongPress: () => setArranging(true), delayLongPress: 240 };

  return (
    <View ref={listRef} style={{ gap }}>
      {ids.map((id, index) => {
        const isDragging = dragId === id;
        const responder = makeResponder(id);
        const scale = arranging ? pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) : 1;
        return (
          <View key={id}>
            {dragIdRef.current && targetIndex === index ? dropLine : null}
            <Animated.View
              onLayout={onRowLayout(id)}
              {...responder.panHandlers}
              style={[
                arranging && styles.arrangingRow,
                isDragging && styles.draggingRow,
                { transform: [{ translateY: isDragging ? translateY : 0 }, { scale }], zIndex: isDragging ? 20 : 0 },
              ]}
            >
              {renderRow(id, arranging || isDragging, armProps)}
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
  arrangingRow: {
    opacity: 0.97,
  },
  draggingRow: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
