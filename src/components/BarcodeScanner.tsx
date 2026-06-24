import { StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';

type BarcodeScannerProps = {
  active: boolean;
  paused?: boolean;
  onDetected: (code: string) => void;
};

// Native (iOS/Android) implementation backed by expo-camera's built-in scanner.
export function BarcodeScanner({ active, paused, onDetected }: BarcodeScannerProps) {
  if (!active) return null;
  return (
    <CameraView
      style={StyleSheet.absoluteFill}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
      onBarcodeScanned={paused ? undefined : ({ data }) => onDetected(data)}
    />
  );
}
