import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { strToU8, zipSync } from 'fflate';

import { formatTime, type DiaryEntry } from '@/lib/diary';
import { t } from '@/lib/i18n';

export type ExportFormat = 'pdf' | 'csv' | 'ods';

const columns = [
  'day',
  'time',
  'kind',
  'meal',
  'description',
  'quantity',
  'carbs',
  'fat',
  'protein',
  'fiber',
  'kcal',
  'glucose',
  'insulin',
  'duration',
] as const;

/** Una cella: stringa o numero (null = vuota). */
type Cell = string | number | null;

const num = (value: number | string | null) => (value === null ? null : Number(value));

/** Righe della tabella esportata: intestazione e una riga per voce del diario. */
export function exportRows(entries: DiaryEntry[]): Cell[][] {
  return [
    columns.map((c) => t(`diary.exportSheet.columns.${c}`)),
    ...entries.map((e): Cell[] => [
      e.day,
      formatTime(e.occurred_at),
      t(`diary.exportSheet.kinds.${e.kind}`),
      e.meal_type && t(`reminders.meals.${e.meal_type}`),
      e.title,
      e.quantity === null ? null : `${Number(e.quantity)} ${t(`diary.item.${e.quantity_mode}`)}`,
      num(e.carbs_g),
      num(e.fat_g),
      num(e.protein_g),
      num(e.fiber_g),
      num(e.kcal),
      num(e.glucose_mg_dl),
      num(e.insulin_units),
      num(e.duration_minutes),
    ]),
  ];
}

/** CSV RFC 4180: virgole, campi tra virgolette se servono, righe CRLF. */
export function toCsv(rows: Cell[][]) {
  const cell = (c: Cell) => {
    const s = c === null ? '' : String(c);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function toHtml(rows: Cell[][], title: string) {
  const [head, ...body] = rows;
  const cell = (c: Cell) => (c === null ? '' : xml(String(c)));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,Roboto,sans-serif;font-size:10px;margin:24px}
h1{font-size:16px}table{border-collapse:collapse;width:100%}
th,td{border:1px solid #d5e0f1;padding:4px;text-align:left}th{background:#e6eefb}
</style></head><body><h1>${xml(title)}</h1><table>
<tr>${head.map((c) => `<th>${cell(c)}</th>`).join('')}</tr>
${body.map((r) => `<tr>${r.map((c) => `<td>${cell(c)}</td>`).join('')}</tr>`).join('\n')}
</table></body></html>`;
}

/** Foglio OpenDocument minimo: mimetype non compresso per primo, manifest e content.xml. */
export function toOds(rows: Cell[][]) {
  const cell = (c: Cell) =>
    c === null
      ? '<table:table-cell/>'
      : typeof c === 'number'
        ? `<table:table-cell office:value-type="float" office:value="${c}"><text:p>${c}</text:p></table:table-cell>`
        : `<table:table-cell office:value-type="string"><text:p>${xml(c)}</text:p></table:table-cell>`;
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2">
<office:body><office:spreadsheet><table:table table:name="Foodity">
${rows.map((r) => `<table:table-row>${r.map(cell).join('')}</table:table-row>`).join('\n')}
</table:table></office:spreadsheet></office:body></office:document-content>`;
  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.spreadsheet"/>
<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;
  return zipSync({
    mimetype: [strToU8('application/vnd.oasis.opendocument.spreadsheet'), { level: 0 }],
    'META-INF/manifest.xml': strToU8(manifest),
    'content.xml': strToU8(content),
  });
}

const mimeTypes: Record<ExportFormat, string> = {
  pdf: 'application/pdf',
  csv: 'text/csv',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
};

/** Crea il file del diario tra from e to e apre il foglio di condivisione di sistema. */
export async function shareDiary(entries: DiaryEntry[], from: string, to: string, format: ExportFormat) {
  const rows = exportRows(entries);
  const title = t('diary.exportSheet.fileTitle', { from, to });
  const name = `foodity-${from}-${to}.${format}`;
  let uri: string;

  if (format === 'pdf') {
    const pdf = await Print.printToFileAsync({ html: toHtml(rows, title) });
    const file = new File(Paths.cache, name);
    // printToFileAsync dà un nome casuale: lo si rinomina per l'app che riceve il file.
    await new File(pdf.uri).move(file, { overwrite: true });
    uri = file.uri;
  } else {
    const file = new File(Paths.cache, name);
    file.create({ overwrite: true });
    await file.write(format === 'csv' ? toCsv(rows) : toOds(rows));
    uri = file.uri;
  }

  await Sharing.shareAsync(uri, { mimeType: mimeTypes[format], dialogTitle: title });
}
