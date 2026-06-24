import { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

type BarcodeScannerProps = {
  active: boolean;
  paused?: boolean;
  onDetected: (code: string) => void;
};

const PRODUCT_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
];

// Web (incl. iOS Safari) implementation. expo-camera shows video on web but does not
// decode barcodes, and iOS Safari has no native BarcodeDetector, so we decode the
// camera stream with ZXing. Restricted to 1D product barcodes so wrapper QR codes
// (recycling/marketing) are ignored.
export function BarcodeScanner({ active, paused, onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pausedRef = useRef(!!paused);
  pausedRef.current = !!paused;
  const lastDetectionRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const audioContextRef = useRef<AudioContext | null>(null);

  function playScanFeedback() {
    // Short confirmation "click" when a code is caught (+ haptic where supported).
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        if (!audioContextRef.current) audioContextRef.current = new AudioCtx();
        const ctx = audioContextRef.current;
        void ctx.resume();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'square';
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.13);
      }
    } catch {
      // audio unavailable — ignore
    }
    try {
      navigator.vibrate?.(60);
    } catch {
      // vibration unsupported — ignore
    }
  }

  useEffect(() => {
    if (!active) return;
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, PRODUCT_FORMATS);
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 200 });

    let controls: IScannerControls | undefined;
    let cancelled = false;

    reader
      .decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            // Continuous autofocus helps read barcodes from a distance (ignored where unsupported).
            advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
          },
        },
        videoElement,
        (result, _error, scannerControls) => {
          controls = scannerControls;
          if (cancelled) {
            scannerControls.stop();
            return;
          }
          if (!result || pausedRef.current) return;
          const code = result.getText().trim();
          // Debounce duplicate reads of the same code from rapid frames.
          const now = typeof performance !== 'undefined' ? performance.now() : 0;
          if (code === lastDetectionRef.current.code && now - lastDetectionRef.current.at < 1500) return;
          lastDetectionRef.current = { code, at: now };
          playScanFeedback();
          onDetected(code);
        },
      )
      .then((scannerControls) => {
        controls = scannerControls;
        if (cancelled) scannerControls.stop();
      })
      .catch(() => {
        // Permission denied or no camera — the modal still offers manual barcode entry.
      });

    return () => {
      cancelled = true;
      try {
        controls?.stop();
      } catch {
        // ignore teardown errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
}
