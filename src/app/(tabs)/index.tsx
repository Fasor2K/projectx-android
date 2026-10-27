import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { GlassSurface } from '@/components/glass-surface';

export default function Home() {
  return (
    <View style={styles.container}>
      <GlassSurface interactive style={styles.card}>
        <Text>Foodity</Text>
      </GlassSurface>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
  },
});
