import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { colors } from '@/theme';

// isGlassEffectAPIAvailable guards iOS 26 betas where GlassView crashes (expo/expo#40911).
const glassSupported = Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

type Props = ViewProps & {
  interactive?: boolean;
};

/**
 * Superficie "vetro": Liquid Glass su iOS 26+, superficie piena altrove
 * (Android, iOS < 26, "Riduci trasparenza" attivo). Vedi UI.md.
 */
export function GlassSurface({ interactive = false, style, ...props }: Props) {
  const reduceTransparency = useReduceTransparency();

  if (glassSupported && !reduceTransparency) {
    // isInteractive is read only on mount: the key remounts the view when it changes.
    return <GlassView key={String(interactive)} isInteractive={interactive} style={style} {...props} />;
  }
  return <View style={[styles.fallback, style]} {...props} />;
}

function useReduceTransparency() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!glassSupported) return;
    AccessibilityInfo.isReduceTransparencyEnabled().then(setEnabled);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setEnabled);
    return () => sub.remove();
  }, []);

  return enabled;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.glassFallback,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassFallbackBorder,
  },
});
