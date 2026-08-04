import * as React from 'react';
import '@google/model-viewer'; // registers the <model-viewer> custom element (web only file)

// Web: render Google's <model-viewer> for a .glb pet. Auto-frames the model, drag to
// rotate, gentle auto-spin. Rendered via React.createElement so the custom element upgrades.
export function Pet3D({ uri, size }: { uri: string; size: number }) {
  return React.createElement(
    'model-viewer',
    {
      src: uri,
      alt: 'pet',
      // pointerEvents none so the pet's parent <Pressable> gets taps (for reactions);
      // the model still auto-rotates on its own.
      style: { width: size, height: size, backgroundColor: 'transparent', pointerEvents: 'none' },
      autoplay: '', // play any animation clips baked into the .glb (idle/blink/etc.)
      'animation-crossfade-duration': '300',
      'auto-rotate': '',
      'auto-rotate-delay': '0',
      'rotation-per-second': '18deg',
      'interaction-prompt': 'none',
      exposure: '1',
      'shadow-intensity': '0',
    },
    // Replace model-viewer's default top loading bar (the horizontal "stick" that
    // flashes while the .glb loads) with an empty, hidden one.
    React.createElement('div', { slot: 'progress-bar', style: { display: 'none' } }),
  );
}
