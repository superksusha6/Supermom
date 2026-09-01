import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

// ---- HSV <-> hex helpers -----------------------------------------------------
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return { h: 210, s: 0.8, v: 0.9 };
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  const to = (n: number) => `0${Math.round((n + m) * 255).toString(16)}`.slice(-2);
  return `#${to(r)}${to(g)}${to(b)}`;
}

// Slightly darker / lighter shade of a hex (amt: -1 darker .. +1 lighter).
export function shadeHex(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  const ch = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((c) =>
    amt < 0 ? Math.round(c * (1 + amt)) : Math.round(c + (255 - c) * amt),
  );
  return `#${ch.map((c) => `0${clamp(c, 0, 255).toString(16)}`.slice(-2)).join('')}`;
}

type Props = {
  value: string;
  onChange: (hex: string) => void;
  size?: number;
  colors: { text: string; subtext: string; border: string; surface: string };
};

// A hue/saturation color WHEEL (drag anywhere to pick any hue) plus a brightness
// slider — lets the user dial ANY colour, not just presets.
export function ColorWheel({ value, onChange, size = 220, colors }: Props) {
  const initial = hexToHsv(value);
  const [h, setH] = useState(initial.h);
  const [s, setS] = useState(initial.s);
  const [v, setV] = useState(initial.v);
  const R = size / 2;

  // Re-seed the wheel/slider when `value` is changed from OUTSIDE (e.g. tapping a
  // preset swatch) — but not when it changed because we just emitted it (a drag).
  useEffect(() => {
    if (value && value.toLowerCase() !== hsvToHex(h, s, v).toLowerCase()) {
      const nx = hexToHsv(value);
      setH(nx.h);
      setS(nx.s);
      setV(nx.v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (nh: number, ns: number, nv: number) => onChange(hsvToHex(nh, ns, nv));

  const handleWheel = (locX: number, locY: number) => {
    const dx = locX - R;
    const dy = locY - R;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180, 0 = +x
    if (angle < 0) angle += 360;
    const nh = angle;
    const ns = clamp(dist / R, 0, 1);
    setH(nh);
    setS(ns);
    emit(nh, ns, v);
  };

  const wheelResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => handleWheel(evt.nativeEvent.locationX, evt.nativeEvent.locationY),
      onPanResponderMove: (evt) => handleWheel(evt.nativeEvent.locationX, evt.nativeEvent.locationY),
    }),
  ).current;

  const SLW = size; // slider width
  const handleSlider = (locX: number) => {
    const nv = clamp(locX / SLW, 0, 1);
    setV(nv);
    emit(h, s, nv);
  };
  const sliderResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => handleSlider(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => handleSlider(evt.nativeEvent.locationX),
    }),
  ).current;

  // thumb position on the wheel
  const rad = (h * Math.PI) / 180;
  const tx = R + Math.cos(rad) * s * R;
  const ty = R + Math.sin(rad) * s * R;
  const currentHex = hsvToHex(h, s, v);
  const fullHueHex = hsvToHex(h, 1, 1);

  // react-native-web forwards these to the DOM as CSS; cast keeps TS happy.
  const wheelBg = {
    backgroundImage:
      'conic-gradient(from 90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
  } as any;
  const satOverlay = {
    backgroundImage: 'radial-gradient(circle at center, #ffffff 0%, rgba(255,255,255,0) 70%)',
  } as any;
  const brightBg = {
    backgroundImage: `linear-gradient(to right, #000000, ${fullHueHex})`,
  } as any;

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.wheel, { width: size, height: size, borderRadius: R }, wheelBg]}
        {...wheelResponder.panHandlers}
      >
        <View
          pointerEvents="none"
          style={[styles.satOverlay, { width: size, height: size, borderRadius: R }, satOverlay]}
        />
        <View
          pointerEvents="none"
          style={[styles.thumb, { left: tx - 11, top: ty - 11, backgroundColor: currentHex }]}
        />
      </View>

      <View style={[styles.slider, { width: SLW }, brightBg]} {...sliderResponder.panHandlers}>
        <View pointerEvents="none" style={[styles.sliderThumb, { left: clamp(v, 0, 1) * SLW - 9 }]} />
      </View>

      <View style={styles.readout}>
        <View style={[styles.swatch, { backgroundColor: currentHex }]} />
        <Text style={styles.hex}>{currentHex.toUpperCase()}</Text>
      </View>
    </View>
  );
}

function makeStyles(colors: Props['colors']) {
  return StyleSheet.create({
    wrap: { alignItems: 'center' },
    wheel: {
      position: 'relative',
      // subtle rim so the wheel reads on any background
      borderWidth: 1,
      borderColor: colors.border,
    },
    satOverlay: { position: 'absolute', left: 0, top: 0 },
    thumb: {
      position: 'absolute',
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 3,
      borderColor: '#ffffff',
      // @ts-ignore web shadow
      boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
    },
    slider: {
      height: 18,
      borderRadius: 9,
      marginTop: 18,
      position: 'relative',
      borderWidth: 1,
      borderColor: colors.border,
    },
    sliderThumb: {
      position: 'absolute',
      top: -3,
      width: 18,
      height: 24,
      borderRadius: 6,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: colors.border,
      // @ts-ignore web shadow
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    },
    readout: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
    swatch: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
    hex: { color: colors.text, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  });
}
