import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { t } from '@/lib/i18n';
import { backgroundGradient, colors, radius, spacing, typography } from '@/theme';

/**
 * Camera a tutto schermo che legge un codice a barre (scanner di Cerca, ingrediente della nuova ricetta).
 * Dopo un codice si ferma e riprende quando la schermata torna in primo piano.
 */
export function BarcodeScanner({ onScanned }: { onScanned: (barcode: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();
  // La camera segnala lo stesso codice a raffica: si riprende solo quando lo sheet si chiude.
  const scanning = useRef(true);

  useFocusEffect(
    useCallback(() => {
      scanning.current = true;
    }, []),
  );

  function onBarcode({ data }: BarcodeScanningResult) {
    if (!scanning.current) return;
    scanning.current = false;
    onScanned(data);
  }

  const header = (
    <View style={[styles.header, { top: insets.top + spacing.sm }]}>
      <BackButton close />
    </View>
  );

  if (!permission?.granted) {
    return (
      <View style={styles.permission}>
        {header}
        {/* permission null = stato ancora in lettura: niente messaggio per un attimo. */}
        {permission && (
          <>
            <Text style={[typography.body, styles.permissionText]}>{t('scanner.permission')}</Text>
            <Button
              title={t(permission.canAskAgain ? 'scanner.allow' : 'scanner.openSettings')}
              onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
            />
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.camera}>
      {/* shortcut: solo EAN, i codici del catalogo italiano; un UPC-A su Android non si legge, aggiungere upc_a se serve. */}
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8'] }}
        onBarcodeScanned={onBarcode}
      />
      {header}
      <Text style={[styles.title, { marginTop: insets.top + 64 }]} accessibilityRole="header">
        {t('scanner.title')}
      </Text>
      <View style={styles.frame} />
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.text,
  },
  header: {
    position: 'absolute',
    left: spacing.lg,
    zIndex: 1,
  },
  title: {
    ...typography.display,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  frame: {
    width: '65%',
    aspectRatio: 1.5,
    marginTop: spacing.xxl,
    borderWidth: 4,
    borderRadius: radius.lg,
    borderColor: colors.primary,
  },
  permission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundImage: backgroundGradient,
  },
  permissionText: {
    textAlign: 'center',
  },
});
