import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

// A committed, cheerful habitat backdrop for the child's pet: a soft sky gradient,
// clouds + sparkles, and a 3D-looking podium the pet stands on. Purely vector (no
// bundled images). Turns warm/amber when the pet is hungry. The podium's TOP sits at
// viewBox y≈272 of 330 — the pet is positioned to stand there.
export function PetScene({ hungry }: { hungry?: boolean }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 320 330" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', top: 0, left: 0 }}>
      <Defs>
        <LinearGradient id="petSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={hungry ? '#fde68a' : '#c7dbff'} />
          <Stop offset="1" stopColor={hungry ? '#fef3c7' : '#efe9ff'} />
        </LinearGradient>
        <RadialGradient id="petGlow" cx="50%" cy="26%" r="62%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="podTop" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#e0e7ff" />
          <Stop offset="1" stopColor="#a5b4fc" />
        </LinearGradient>
      </Defs>

      {/* sky + soft central glow */}
      <Rect x="0" y="0" width="320" height="330" fill="url(#petSky)" />
      <Rect x="0" y="0" width="320" height="330" fill="url(#petGlow)" />

      {/* clouds */}
      <Ellipse cx="72" cy="64" rx="44" ry="18" fill="#ffffff" opacity="0.55" />
      <Ellipse cx="104" cy="58" rx="30" ry="14" fill="#ffffff" opacity="0.5" />
      <Ellipse cx="252" cy="46" rx="36" ry="15" fill="#ffffff" opacity="0.45" />

      {/* sparkles */}
      <Circle cx="40" cy="150" r="3" fill="#ffffff" opacity="0.85" />
      <Circle cx="288" cy="128" r="2.6" fill="#ffffff" opacity="0.85" />
      <Circle cx="60" cy="210" r="2" fill="#ffffff" opacity="0.7" />
      <Circle cx="270" cy="196" r="2.2" fill="#ffffff" opacity="0.7" />

      {/* podium cast shadow */}
      <Ellipse cx="160" cy="300" rx="110" ry="20" fill="#1e1b4b" opacity="0.13" />
      {/* podium side (cylinder body) */}
      <Path d="M60 272 A100 26 0 0 0 260 272 L260 289 A100 26 0 0 1 60 289 Z" fill="#818cf8" />
      {/* podium top face */}
      <Ellipse cx="160" cy="272" rx="100" ry="26" fill="url(#podTop)" />
      {/* podium top highlight */}
      <Ellipse cx="160" cy="267" rx="82" ry="17" fill="#eef2ff" opacity="0.55" />
    </Svg>
  );
}
