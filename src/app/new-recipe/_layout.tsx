import { Stack } from 'expo-router';
import { useState } from 'react';

import { emptyRecipe, RecipeFormContext, type RecipeForm } from '@/lib/recipe-form';
import { colors } from '@/theme';

const sheet = { presentation: 'formSheet', contentStyle: { backgroundColor: colors.sheetBackground }, sheetGrabberVisible: true } as const;

/** Nuova ricetta: il form e i suoi sheet condividono lo stato, che si perde alla chiusura. */
export default function NewRecipeLayout() {
  const [form, setForm] = useState<RecipeForm>(emptyRecipe);
  const [barcode, setBarcode] = useState<string>();

  return (
    <RecipeFormContext.Provider
      value={{ form, update: (changes) => setForm((f) => ({ ...f, ...changes })), barcode, setBarcode }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="ingredient" options={{ ...sheet, sheetAllowedDetents: [0.95] }} />
        <Stack.Screen name="entry" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
        <Stack.Screen name="tags" options={{ ...sheet, sheetAllowedDetents: [0.9] }} />
        <Stack.Screen name="scanner" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </RecipeFormContext.Provider>
  );
}
