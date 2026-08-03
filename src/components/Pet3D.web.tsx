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
      style: { width: size, height: size, backgroundColor: 'transparent' },
      'camera-controls': '',
      'auto-rotate': '',
      'disable-zoom': '',
      'interaction-prompt': 'none',
      exposure: '1',
      'shadow-intensity': '0',
    },
    // Replace model-viewer's default top loading bar (the horizontal "stick" that
    // flashes while the .glb loads) with an empty, hidden one.
    React.createElement('div', { slot: 'progress-bar', style: { display: 'none' } }),
  );
}
