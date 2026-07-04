import Svg, { Path, Circle } from 'react-native-svg';

// A small stroke line-icon set (Lucide-style) so the app can use one consistent,
// theme-colored iconography instead of platform emoji.
export type IconName =
  | 'alert'
  | 'check'
  | 'calendar'
  | 'chores'
  | 'meal'
  | 'cart'
  | 'wrench'
  | 'pill'
  | 'plus'
  | 'chevron';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({ name, size = 22, color = '#0f172a', strokeWidth = 2 }: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'alert' ? (
        <>
          <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" {...common} />
          <Path d="M12 9v4" {...common} />
          <Circle cx={12} cy={17} r={0.6} fill={color} stroke="none" />
        </>
      ) : null}
      {name === 'check' ? (
        <>
          <Path d="M21.8 10A10 10 0 1 1 17 3.34" {...common} />
          <Path d="m9 11 3 3L22 4" {...common} />
        </>
      ) : null}
      {name === 'calendar' ? (
        <>
          <Path d="M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" {...common} />
          <Path d="M8 2v4 M16 2v4 M3 10h18" {...common} />
        </>
      ) : null}
      {name === 'chores' ? (
        <>
          <Path d="m3 17 2 2 4-4" {...common} />
          <Path d="m3 7 2 2 4-4" {...common} />
          <Path d="M13 6h8 M13 12h8 M13 18h8" {...common} />
        </>
      ) : null}
      {name === 'meal' ? (
        <>
          <Path d="M3 2v7c0 1.1.9 2 2 2a2 2 0 0 0 2-2V2 M7 2v20" {...common} />
          <Path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" {...common} />
        </>
      ) : null}
      {name === 'cart' ? (
        <>
          <Circle cx={8} cy={21} r={1} {...common} />
          <Circle cx={19} cy={21} r={1} {...common} />
          <Path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" {...common} />
        </>
      ) : null}
      {name === 'wrench' ? (
        <Path
          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"
          {...common}
        />
      ) : null}
      {name === 'pill' ? (
        <>
          <Path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" {...common} />
          <Path d="m8.5 8.5 7 7" {...common} />
        </>
      ) : null}
      {name === 'plus' ? <Path d="M5 12h14 M12 5v14" {...common} /> : null}
      {name === 'chevron' ? <Path d="m9 18 6-6-6-6" {...common} /> : null}
    </Svg>
  );
}
