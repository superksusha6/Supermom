import * as React from 'react';
import { useEffect, useState } from 'react';

// Web: render Google's <model-viewer> custom element directly via React (react-dom).
// Loads the library lazily, then shows the 3D pet — drag to rotate, gentle auto-spin.
export function Pet3D({ uri, size }: { uri: string; size: number }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('@google/model-viewer')
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        /* leave placeholder */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return React.createElement('div', { style: { width: size, height: size } });
  }

  return React.createElement('model-viewer', {
    src: uri,
    style: { width: size, height: size, backgroundColor: 'transparent' },
    'camera-controls': true,
    'auto-rotate': true,
    'auto-rotate-delay': 0,
    'rotation-per-second': '20deg',
    'disable-zoom': true,
    'interaction-prompt': 'none',
    'shadow-intensity': '0.6',
    exposure: '1.1',
    'field-of-view': '32deg',
    'camera-orbit': '0deg 85deg auto',
  });
}
