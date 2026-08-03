import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

// A realistic photo-studio backdrop for the pet: a seamless "infinity cove" (wall
// curving softly into the floor), a directional spotlight, corner vignette, and a
// shaded pedestal with a rim highlight, contact shadow and a faint reflection. Purely
// vector — reads like a 3D product render rather than a cartoon. Warms up when hungry.
// The pedestal top sits at viewBox y≈272 of 330; the pet is positioned to stand there.
export function PetScene({ hungry }: { hungry?: boolean }) {
  const wallTop = hungry ? '#e7d9c3' : '#cfd6e3';
  const wallBottom = hungry ? '#f3ebdd' : '#e9edf4';
  const floorTop = hungry ? '#ddceb6' : '#c3cbd9';
  const floorBottom = hungry ? '#cdbd9f' : '#aab3c4';
  return (
    <Svg width="100%" height="100%" viewBox="0 0 320 330" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', top: 0, left: 0 }}>
      <Defs>
        <LinearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={wallTop} />
          <Stop offset="1" stopColor={wallBottom} />
        </LinearGradient>
        <LinearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={floorTop} />
          <Stop offset="1" stopColor={floorBottom} />
        </LinearGradient>
        <RadialGradient id="spot" cx="50%" cy="38%" r="58%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
          <Stop offset="0.6" stopColor="#ffffff" stopOpacity="0.12" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="vignette" cx="50%" cy="45%" r="75%">
          <Stop offset="0.55" stopColor="#000000" stopOpacity="0" />
          <Stop offset="1" stopColor="#1e2436" stopOpacity="0.28" />
        </RadialGradient>
        <LinearGradient id="pedTop" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#f4f6fa" />
          <Stop offset="1" stopColor="#d3dae6" />
        </LinearGradient>
        <LinearGradient id="pedFront" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#9aa4b6" />
          <Stop offset="0.5" stopColor="#c3cbd8" />
          <Stop offset="1" stopColor="#8f99ac" />
        </LinearGradient>
      </Defs>

      {/* seamless studio: wall, then floor with a soft curved horizon (cove) */}
      <Rect x="0" y="0" width="320" height="330" fill="url(#wall)" />
      <Path d="M0 214 Q160 236 320 214 L320 330 L0 330 Z" fill="url(#floor)" />
      {/* blur the wall↔floor seam with a soft band */}
      <Rect x="0" y="196" width="320" height="44" fill="url(#wall)" opacity="0.35" />

      {/* directional key light + vignette for depth */}
      <Rect x="0" y="0" width="320" height="330" fill="url(#spot)" />
      <Rect x="0" y="0" width="320" height="330" fill="url(#vignette)" />

      {/* pedestal: contact shadow, faint reflection, cylinder body, top, rim light */}
      <Ellipse cx="160" cy="298" rx="112" ry="18" fill="#111827" opacity="0.18" />
      <Path d="M62 272 A98 25 0 0 0 258 272 L258 288 A98 25 0 0 1 62 288 Z" fill="url(#pedFront)" />
      <Ellipse cx="160" cy="272" rx="98" ry="25" fill="url(#pedTop)" />
      {/* soft reflection of the pet on the polished top */}
      <Ellipse cx="160" cy="272" rx="34" ry="9" fill="#5b6472" opacity="0.16" />
      {/* rim highlight along the front edge of the top */}
      <Path d="M64 274 A98 25 0 0 0 256 274" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.5" fill="none" />
    </Svg>
  );
}
