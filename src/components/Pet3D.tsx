import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';

// Renders a .glb pet in 3D on web via Google's <model-viewer> (drag to rotate, gentle
// auto-spin, real lighting). No-op on native (the app is used on web). Growth is driven
// by the container `size`.
export function Pet3D({ uri, size }: { uri: string; size: number }) {
  const ref = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    let cancelled = false;
    (async () => {
      try {
        await import('@google/model-viewer'); // registers the <model-viewer> element
      } catch {
        return;
      }
      if (cancelled) return;
      const host = ref.current as unknown as HTMLElement | null;
      if (!host || typeof host.appendChild !== 'function') return;
      let mv = host.querySelector('model-viewer') as any;
      if (!mv) {
        mv = document.createElement('model-viewer');
        mv.setAttribute('camera-controls', '');
        mv.setAttribute('auto-rotate', '');
        mv.setAttribute('auto-rotate-delay', '0');
        mv.setAttribute('rotation-per-second', '20deg');
        mv.setAttribute('disable-zoom', '');
        mv.setAttribute('interaction-prompt', 'none');
        mv.setAttribute('shadow-intensity', '0.6');
        mv.setAttribute('exposure', '1.1');
        mv.setAttribute('camera-orbit', '0deg 85deg auto');
        mv.setAttribute('field-of-view', '32deg');
        mv.style.width = '100%';
        mv.style.height = '100%';
        mv.style.backgroundColor = 'transparent';
        host.appendChild(mv);
      }
      if (mv.getAttribute('src') !== uri) mv.setAttribute('src', uri);
    })();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return <View ref={ref} style={{ width: size, height: size, alignSelf: 'center' }} />;
}
