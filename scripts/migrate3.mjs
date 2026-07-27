/* Migração 3 — dados de audiência por fonte (Kantar/Triton/Nextdial). Idempotente. */
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL || readFileSync(join(__dirname, '..', '.env.local'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim();
const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 25 });

await sql.unsafe(`
CREATE TABLE IF NOT EXISTS audience_data (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  source TEXT NOT NULL,          -- kantar | triton | nextdial
  block TEXT NOT NULL,           -- share_total | share_daypart | share_publico | stream_now | stream_curve | tsl | devices | cidades
  segment TEXT NOT NULL,         -- ex.: 'Total', 'Feminino', '20-29', 'Manhã 6-10h', '08h', 'App', ...
  station TEXT NOT NULL,         -- 'Metropolitana' ou concorrente
  value NUMERIC NOT NULL,
  unit TEXT DEFAULT '%',
  pos INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_aud ON audience_data(tenant_id, source, block);
`);

const [{ n }] = await sql`SELECT count(*)::int n FROM audience_data`;
if (n > 0) { console.log('audience_data já populada'); await sql.end(); process.exit(0); }

const [hq] = await sql`SELECT id FROM tenants WHERE is_hq LIMIT 1`;
const T = hq.id;
const ST = ['Metropolitana', 'Jovem Pan FM', 'Mix FM', 'Band FM', '89 FM', 'Antena 1'];

const rows = [];
const add = (source, block, segment, values, unit = '%', ) =>
  ST.forEach((station, i) => rows.push({ source, block, segment, station, value: values[i], unit, pos: rows.length }));

/* ---- KANTAR (share %) — base demonstrativa no padrão do Client Center ---- */
add('kantar', 'share_total', 'Total dia (05h-05h)', [6.8, 7.2, 5.9, 8.9, 3.4, 4.1]);
add('kantar', 'share_daypart', 'Manhã 06-10h', [7.9, 8.8, 5.2, 9.6, 3.1, 4.4]);
add('kantar', 'share_daypart', 'Tarde 10-17h', [6.4, 6.5, 6.1, 8.7, 3.6, 4.2]);
add('kantar', 'share_daypart', 'Drive 17-20h', [7.4, 7.9, 6.6, 8.2, 4.0, 3.9]);
add('kantar', 'share_daypart', 'Noite 20-24h', [5.8, 5.4, 6.4, 7.9, 3.2, 3.6]);
add('kantar', 'share_daypart', 'Madrugada 00-05h', [4.1, 4.9, 3.8, 6.2, 2.4, 2.9]);
add('kantar', 'share_publico', 'Feminino', [7.6, 6.1, 6.8, 9.8, 2.6, 4.9]);
add('kantar', 'share_publico', 'Masculino', [5.9, 8.4, 4.9, 7.9, 4.3, 3.2]);
add('kantar', 'share_publico', '10-19 anos', [11.2, 4.1, 8.9, 6.4, 3.8, 1.2]);
add('kantar', 'share_publico', '20-29 anos', [9.8, 5.9, 8.1, 7.2, 4.6, 2.1]);
add('kantar', 'share_publico', '30-39 anos', [7.1, 7.8, 6.2, 8.8, 3.9, 3.8]);
add('kantar', 'share_publico', '40-49 anos', [4.9, 8.9, 4.1, 9.9, 2.9, 5.6]);
add('kantar', 'share_publico', '50+ anos', [3.2, 9.4, 2.8, 10.6, 2.1, 7.4]);
add('kantar', 'share_publico', 'Classe AB', [6.2, 8.9, 6.4, 6.8, 4.9, 5.8]);
add('kantar', 'share_publico', 'Classe C', [7.4, 6.4, 5.8, 10.2, 2.8, 3.1]);
add('kantar', 'share_publico', 'Classe DE', [6.9, 5.8, 5.2, 10.9, 2.2, 2.6]);
/* alcance diário (mil ouvintes) */
add('kantar', 'alcance', 'Alcance dia (mil)', [1200, 1420, 980, 1690, 520, 640], 'mil');

/* ---- TRITON (streaming) ---- */
add('triton', 'stream_now', 'Ouvintes simultâneos agora', [8400, 12100, 6800, 5200, 4100, 2900], 'ouvintes');
add('triton', 'tsl', 'Tempo médio de escuta (min)', [42, 38, 35, 29, 51, 33], 'min');
/* curva do dia — só Metro (hora a hora, ouvintes simultâneos) */
const curva = { '00h': 2100, '03h': 1400, '06h': 5200, '08h': 8900, '10h': 7400, '12h': 8100, '15h': 6900, '17h': 9300, '19h': 8600, '21h': 5800, '23h': 3400 };
for (const [h, v] of Object.entries(curva)) rows.push({ source: 'triton', block: 'stream_curve', segment: h, station: 'Metropolitana', value: v, unit: 'ouvintes', pos: rows.length });

/* ---- NEXTDIAL (áudio digital) ---- */
add('nextdial', 'devices', 'App próprio', [34, 41, 28, 22, 38, 25]);
add('nextdial', 'devices', 'Site / player web', [27, 22, 31, 35, 24, 33]);
add('nextdial', 'devices', 'Alexa / smart speaker', [21, 19, 22, 24, 18, 27]);
add('nextdial', 'devices', 'CarPlay / Android Auto', [18, 18, 19, 19, 20, 15]);
/* cidades top (share do streaming da Metro) */
for (const [cid, v] of Object.entries({ 'São Paulo': 61, 'Guarulhos': 9, 'Osasco': 7, 'Santo André': 6, 'Campinas': 5, 'Outras': 12 })) {
  rows.push({ source: 'nextdial', block: 'cidades', segment: cid, station: 'Metropolitana', value: v, unit: '%', pos: rows.length });
}

for (const r of rows) {
  await sql`INSERT INTO audience_data (tenant_id, source, block, segment, station, value, unit, pos)
    VALUES (${T}, ${r.source}, ${r.block}, ${r.segment}, ${r.station}, ${r.value}, ${r.unit}, ${r.pos})`;
}
console.log('✓ audience_data:', rows.length, 'linhas');
await sql.end();
