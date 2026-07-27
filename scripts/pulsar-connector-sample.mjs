#!/usr/bin/env node
/* Conector Pulsar — exemplo de referência (doc v2 §8, fase F2).
   Na rádio, este script roda agendado na máquina do Pulsar:
   lê o log/export local e envia pra API de ingestão do Central 360.

   Uso:
     C360_URL=https://central-radio-360.vercel.app \
     C360_KEY=ing_xxxxxxxx \
     node pulsar-connector-sample.mjs caminho/do/playlog.csv

   Formato esperado do CSV (típico de export de automação):
     2026-07-27 03:41:00;Meu Erro;Chimarruts;Depósito
*/
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

const URL_BASE = process.env.C360_URL || 'https://central-radio-360.vercel.app';
const KEY = process.env.C360_KEY;
const file = process.argv[2];
if (!KEY || !file) {
  console.error('Configure C360_KEY e informe o arquivo. Ex.: C360_KEY=ing_xxx node pulsar-connector-sample.mjs playlog.csv');
  process.exit(1);
}

const raw = readFileSync(file, 'utf8');
const items = raw.split(/\r?\n/).filter(Boolean).map((line) => {
  const [dt, title, artist, category] = line.split(';').map((s) => s?.trim());
  if (!dt || !title) return null;
  return { played_at: new Date(dt.replace(' ', 'T')).toISOString(), title, artist, category, origin: 'Pulsar (conector)' };
}).filter(Boolean);

// batch_id determinístico pelo conteúdo → reenvio idempotente se a internet cair
const batch_id = createHash('sha1').update(raw).digest('hex').slice(0, 16);

const res = await fetch(`${URL_BASE}/api/v1/ingest`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-praca-key': KEY },
  body: JSON.stringify({ type: 'playlog', batch_id, items }),
});
console.log(res.status, await res.text());
