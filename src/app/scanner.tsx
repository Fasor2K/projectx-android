import { router } from 'expo-router';

import { BarcodeScanner } from '@/components/barcode-scanner';

/** Scansione del codice a barre di Cerca: trovato un codice, apre lo sheet del prodotto sopra la camera. */
export default function Scanner() {
  return <BarcodeScanner onScanned={(barcode) => router.push({ pathname: '/scanned-product', params: { barcode } })} />;
}
