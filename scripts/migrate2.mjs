/* Migração 2 — usuários/2FA, arquivos, concorrência, ingestão Pulsar, crons. Idempotente. */
import postgres from 'postgres';
import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL || readFileSync(join(__dirname, '..', '.env.local'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim();
const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 25 });

const ddl = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ibge_code TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS population INT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_id INT;

CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  uuid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INT NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS competitors (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  name TEXT NOT NULL,
  dial TEXT,
  city TEXT, uf TEXT,
  ig_handle TEXT, ig_followers INT DEFAULT 0,
  yt_handle TEXT, yt_subs INT DEFAULT 0,
  rb_clicks INT DEFAULT 0,
  rb_votes INT DEFAULT 0,
  rb_name TEXT,
  source TEXT DEFAULT 'manual',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingest_keys (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  key TEXT UNIQUE NOT NULL,
  label TEXT,
  active BOOLEAN DEFAULT TRUE,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cron_runs (
  id SERIAL PRIMARY KEY,
  job TEXT NOT NULL,
  ran_at TIMESTAMPTZ DEFAULT now(),
  ok BOOLEAN DEFAULT TRUE,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_cron_job ON cron_runs(job, ran_at DESC);
`;

for (const stmt of ddl.split(';').map(s => s.trim()).filter(Boolean)) {
  await sql.unsafe(stmt);
}

/* IBGE codes das praças atuais */
const codes = { sp: '3550308', rio: '3304557', bh: '3106200', recife: '2611606', fortaleza: '2304400', curitiba: '4106902' };
for (const [slug, code] of Object.entries(codes)) {
  await sql`UPDATE tenants SET ibge_code = ${code} WHERE slug = ${slug} AND ibge_code IS NULL`;
}

/* Concorrentes seed (praça SP) — números sociais são estimativas manuais editáveis */
const [{ n }] = await sql`SELECT count(*)::int n FROM competitors`;
if (n === 0) {
  const [hq] = await sql`SELECT id FROM tenants WHERE is_hq LIMIT 1`;
  await sql`
    INSERT INTO competitors (tenant_id, name, dial, city, uf, ig_handle, ig_followers, yt_handle, yt_subs, rb_name, source) VALUES
    (${hq.id}, 'Jovem Pan FM',        '100.9', 'São Paulo', 'SP', '@jovempanfm',   3900000, 'JovemPanFM',  1200000, 'Jovem Pan FM São Paulo', 'estimativa'),
    (${hq.id}, 'Mix FM',              '106.3', 'São Paulo', 'SP', '@mixfm',        1600000, 'MixFM',        450000, 'Mix FM São Paulo', 'estimativa'),
    (${hq.id}, 'Band FM',             '96.1',  'São Paulo', 'SP', '@bandfmoficial',1100000, 'BandFM',       300000, 'Band FM', 'estimativa'),
    (${hq.id}, '89 FM A Rádio Rock',  '89.1',  'São Paulo', 'SP', '@radiorock',     900000, 'radiorock',    500000, '89 FM A Radio Rock', 'estimativa'),
    (${hq.id}, 'Antena 1',            '94.7',  'São Paulo', 'SP', '@antena1',       500000, 'antena1',      200000, 'Antena 1 FM 94,7 São Paulo', 'estimativa')`;
  console.log('✓ concorrentes seed (SP)');
}

/* Chave de ingestão da matriz (se não existir) */
const [{ k }] = await sql`SELECT count(*)::int k FROM ingest_keys`;
if (k === 0) {
  const [hq] = await sql`SELECT id FROM tenants WHERE is_hq LIMIT 1`;
  const key = 'ing_' + randomBytes(24).toString('hex');
  await sql`INSERT INTO ingest_keys (tenant_id, key, label) VALUES (${hq.id}, ${key}, 'Conector Pulsar — Matriz 98.5')`;
  console.log('✓ chave de ingestão criada:', key);
}

console.log('✓ migração 2 aplicada');
await sql.end();
