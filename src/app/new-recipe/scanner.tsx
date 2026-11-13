import { router } from 'expo-router';

import { BarcodeScanner } from '@/components/barcode-scanner';
import { useRecipeForm } from '@/lib/recipe-form';

/** Scansiona ingrediente: il codice letto torna allo sheet Aggiungi ingrediente. */
export default function IngredientScanner() {
  const { setBarcode } = useRecipeForm();
  return (
    <BarcodeScanner
      onScanned={(barcode) => {
        setBarcode(barcode);
        router.back();
      }}
    />
  );
}
