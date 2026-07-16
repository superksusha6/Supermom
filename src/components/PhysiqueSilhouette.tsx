import Svg, { Ellipse, Path } from 'react-native-svg';
import { PhysiqueGoal, NutritionSex } from '@/types/app';

// Neutral full-body figure in a 64×132 viewBox (centre x=32), drawn as one mirrored
// outline: shoulders → tapered arms with hands → waist → hips → legs with feet.
// s=shoulder, a=arm thickness, w=waist, h=hip, thigh=leg spread, ankle=ankle width.
type Dim = { s: number; a: number; w: number; h: number; thigh: number; ankle: number };

const SHAPES: Record<NutritionSex, Record<PhysiqueGoal, Dim>> = {
  female: {
    lean: { s: 13.5, a: 5, w: 7.5, h: 12, thigh: 10.5, ankle: 4 },
    toned: { s: 15, a: 5.5, w: 8, h: 13, thigh: 11.5, ankle: 4.5 },
    athletic: { s: 17, a: 5.5, w: 8, h: 12.5, thigh: 11, ankle: 4.5 },
    curvy: { s: 15.5, a: 6, w: 9.5, h: 17, thigh: 13.5, ankle: 5 },
    strong: { s: 18, a: 6.5, w: 10, h: 14, thigh: 12.5, ankle: 5.5 },
  },
  male: {
    lean: { s: 16, a: 6, w: 9.5, h: 10.5, thigh: 10, ankle: 5 },
    toned: { s: 18, a: 6.5, w: 10, h: 11, thigh: 10.5, ankle: 5 },
    athletic: { s: 20.5, a: 7, w: 10, h: 11, thigh: 10.5, ankle: 5 },
    curvy: { s: 20, a: 7, w: 13, h: 14.5, thigh: 13.5, ankle: 5.5 },
    strong: { s: 23, a: 8.5, w: 12, h: 13.5, thigh: 12.5, ankle: 6 },
  },
};

// Right-half outline, top(neck) → down outer arm → hand → up inner arm → torso →
// down outer leg → foot → up inner leg → crotch centre. Left half is mirrored.
function bodyPath(cx: number, d: Dim): string {
  const r: [number, number][] = [
    [3.5, 25], // neck base right
    [d.s, 30], // shoulder
    [d.s + 2, 35], // deltoid
    [d.s, 52], // elbow outer
    [d.s - 2, 76], // wrist outer
    [d.s - 3, 81], // hand tip
    [d.s - d.a, 78], // hand inner
    [d.s - d.a + 1, 52], // elbow inner
    [d.w + 2, 44], // armpit
    [d.w, 60], // waist
    [d.h, 72], // hip
    [d.thigh + 1, 80], // outer thigh
    [d.thigh - 1, 101], // knee
    [d.ankle + 1, 123], // ankle
    [d.ankle + 4, 128], // toe
    [2.5, 128], // inner foot
    [2.5, 80], // inner leg
    [0, 78], // crotch centre
  ];
  const left = r
    .slice(0, -1)
    .reverse()
    .map(([dx, y]) => [-dx, y] as [number, number]);
  const pts = [...r, ...left];
  return pts.map(([dx, y], i) => `${i === 0 ? 'M' : 'L'} ${cx + dx} ${y}`).join(' ') + ' Z';
}

export function PhysiqueSilhouette({
  physique,
  sex,
  color,
  size = 44,
}: {
  physique: PhysiqueGoal;
  sex: NutritionSex;
  color: string;
  size?: number;
}) {
  const cx = 32;
  const d = SHAPES[sex][physique];
  return (
    <Svg width={size} height={(size * 132) / 64} viewBox="0 0 64 132">
      <Path d={bodyPath(cx, d)} fill={color} />
      <Ellipse cx={cx} cy={13} rx={7.5} ry={8.5} fill={color} />
    </Svg>
  );
}
