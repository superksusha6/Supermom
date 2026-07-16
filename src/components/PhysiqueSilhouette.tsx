import Svg, { Circle, Path } from 'react-native-svg';
import { PhysiqueGoal, NutritionSex } from '@/types/app';

// Half-widths (viewBox 64 wide, centre x=32): s=shoulder, w=waist, h=hip, arm=upper-arm bump.
// Female = smaller shoulders, waist indent, wider hips. Male = broader shoulders, straighter.
const SHAPES: Record<NutritionSex, Record<PhysiqueGoal, { s: number; w: number; h: number; arm: number }>> = {
  female: {
    lean: { s: 10, w: 7.5, h: 12, arm: 1.5 },
    toned: { s: 11, w: 8, h: 13, arm: 2 },
    athletic: { s: 13, w: 8, h: 12.5, arm: 2.5 },
    curvy: { s: 11.5, w: 9, h: 17, arm: 2.5 },
    strong: { s: 14, w: 10, h: 14, arm: 3.5 },
  },
  male: {
    lean: { s: 12, w: 9.5, h: 10.5, arm: 2 },
    toned: { s: 14, w: 10, h: 11, arm: 2.5 },
    athletic: { s: 16, w: 10, h: 11, arm: 3 },
    curvy: { s: 14, w: 13.5, h: 14, arm: 3 },
    strong: { s: 18, w: 12, h: 12.5, arm: 4.5 },
  },
};

function bodyPath(s: number, w: number, h: number, arm: number): string {
  const cx = 32;
  const legOuter = Math.min(h * 0.78, 14);
  return [
    `M ${cx} 23.5`,
    `Q ${cx + 4} 24 ${cx + s} 27`,
    `L ${cx + s + arm} 34`,
    `Q ${cx + w + 2} 46 ${cx + w} 55`,
    `L ${cx + h} 67`,
    `L ${cx + legOuter} 97`,
    `L ${cx + 3} 97`,
    `L ${cx + 2.5} 71`,
    `L ${cx - 2.5} 71`,
    `L ${cx - 3} 97`,
    `L ${cx - legOuter} 97`,
    `L ${cx - h} 67`,
    `L ${cx - w} 55`,
    `Q ${cx - w - 2} 46 ${cx - s - arm} 34`,
    `L ${cx - s} 27`,
    `Q ${cx - 4} 24 ${cx} 23.5`,
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
  const shape = SHAPES[sex][physique];
  return (
    <Svg width={size} height={(size * 108) / 64} viewBox="0 0 64 108">
      <Circle cx={32} cy={13} r={8} fill={color} />
      <Path d={bodyPath(shape.s, shape.w, shape.h, shape.arm)} fill={color} />
    </Svg>
  );
}
