import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { PhysiqueGoal, NutritionSex } from '@/types/app';

// Half-widths in a 64×120 viewBox (centre x=32). A neutral full-body figure:
// s=shoulder, w=waist, h=hip, arm=arm thickness, leg=leg thickness.
// Female = narrower shoulders, waist indent, wider hips. Male = broader shoulders, straighter.
type Dim = { s: number; w: number; h: number; arm: number; leg: number };

const SHAPES: Record<NutritionSex, Record<PhysiqueGoal, Dim>> = {
  female: {
    lean: { s: 9, w: 6, h: 11, arm: 4, leg: 5 },
    toned: { s: 10, w: 6.5, h: 12, arm: 4.5, leg: 5.5 },
    athletic: { s: 12, w: 6.5, h: 11.5, arm: 5, leg: 6 },
    curvy: { s: 10, w: 8, h: 16, arm: 5, leg: 7 },
    strong: { s: 13, w: 8.5, h: 13, arm: 6.5, leg: 7.5 },
  },
  male: {
    lean: { s: 11, w: 8, h: 10, arm: 5, leg: 6 },
    toned: { s: 13, w: 8.5, h: 10.5, arm: 5.5, leg: 6.5 },
    athletic: { s: 15, w: 8.5, h: 10.5, arm: 6.5, leg: 7 },
    curvy: { s: 13, w: 12, h: 13, arm: 6.5, leg: 7.5 },
    strong: { s: 17, w: 10.5, h: 11.5, arm: 8, leg: 8.5 },
  },
};

function torsoPath(cx: number, d: Dim): string {
  const pelvis = d.h * 0.55;
  return [
    `M ${cx - d.s} 25`,
    `L ${cx + d.s} 25`,
    `Q ${cx + d.s} 38 ${cx + d.w} 50`,
    `Q ${cx + d.w} 58 ${cx + d.h} 65`,
    `L ${cx + pelvis} 73`,
    `L ${cx - pelvis} 73`,
    `L ${cx - d.h} 65`,
    `Q ${cx - d.w} 58 ${cx - d.w} 50`,
    `Q ${cx - d.s} 38 ${cx - d.s} 25`,
    'Z',
  ].join(' ');
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
  const legX = d.h * 0.5;
  const armX = cx + d.s - d.arm * 0.35;
  return (
    <Svg width={size} height={(size * 120) / 64} viewBox="0 0 64 120">
      {/* legs */}
      <Line x1={cx + legX} y1={70} x2={cx + legX} y2={112} stroke={color} strokeWidth={d.leg} strokeLinecap="round" />
      <Line x1={cx - legX} y1={70} x2={cx - legX} y2={112} stroke={color} strokeWidth={d.leg} strokeLinecap="round" />
      {/* arms (hang slightly out from the shoulders) */}
      <Line x1={armX} y1={27} x2={cx + d.s + d.arm * 0.15} y2={68} stroke={color} strokeWidth={d.arm} strokeLinecap="round" />
      <Line x1={2 * cx - armX} y1={27} x2={cx - d.s - d.arm * 0.15} y2={68} stroke={color} strokeWidth={d.arm} strokeLinecap="round" />
      {/* torso */}
      <Path d={torsoPath(cx, d)} fill={color} />
      {/* neck */}
      <Rect x={cx - 2.6} y={19} width={5.2} height={8} rx={2} fill={color} />
      {/* head */}
      <Circle cx={cx} cy={13} r={8} fill={color} />
    </Svg>
  );
}
