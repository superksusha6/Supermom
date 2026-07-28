import { View } from 'react-native';

// Native fallback (the real 3D lives in Pet3D.web.tsx). The app is used on web.
export function Pet3D({ size }: { uri: string; size: number }) {
  return <View style={{ width: size, height: size }} />;
}
