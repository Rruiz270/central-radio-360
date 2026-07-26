/* Central 360 — migração idempotente (CREATE TABLE IF NOT EXISTS, nunca DROP) */
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL || readFileSync(join(__dirname, '..', '.env.local'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim();
const sql = postgres(url, { prepare: false, max: 1 });

const ddl = `
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  freq TEXT NOT NULL,
  city TEXT NOT NULL,
  uf TEXT NOT NULL,
  is_hq BOOLEAN DEFAULT FALSE,
  system TEXT DEFAULT 'pulsar',            -- pulsar | migrando | c360
  migration_phase INT DEFAULT 0,           -- 0-6
  listeners INT DEFAULT 0,
  revenue_month NUMERIC(12,2) DEFAULT 0,
  map_x NUMERIC, map_y NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,                      -- admin | comercial | programacao | jornalismo | marketing | operacoes | afiliada | cliente
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS songs (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  title TEXT NOT NULL,
  artist1 TEXT NOT NULL,
  artist2 TEXT,
  composer TEXT,
  category_code TEXT DEFAULT '01',
  category TEXT DEFAULT 'Sucessos',
  rhythm TEXT, bpm INT, year INT,
  origin TEXT DEFAULT 'Nacional',
  interval_h INT DEFAULT 3,
  is_new BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  weight TEXT, interval_h INT, rotation TEXT,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS play_log (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  played_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  artist TEXT,
  category TEXT,
  origin TEXT DEFAULT 'Automático'         -- Automático | Manual | Tráfego
);

CREATE TABLE IF NOT EXISTS advertisers (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  name TEXT NOT NULL,
  agency TEXT,
  credit_limit NUMERIC(12,2) DEFAULT 0,
  credit_ok BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deals (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  pipeline TEXT DEFAULT 'radio',           -- radio | agencia
  advertiser TEXT NOT NULL,
  descr TEXT,
  value NUMERIC(12,2) DEFAULT 0,
  stage TEXT DEFAULT 'Lead',
  seller TEXT,
  annual_target NUMERIC(12,2),
  realized NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  advertiser TEXT NOT NULL,
  agency TEXT,
  flight_start DATE, flight_end DATE,
  daypart TEXT,
  insertions INT DEFAULT 0,
  duration_sec INT DEFAULT 30,
  value NUMERIC(12,2) DEFAULT 0,
  sale_type TEXT DEFAULT 'Dinheiro',
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS breaks (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  hour INT NOT NULL,                        -- 0-23
  limit_sec INT DEFAULT 180                 -- ANATEL
);

CREATE TABLE IF NOT EXISTS spots (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  break_id INT REFERENCES breaks(id),       -- NULL = pool (a alocar)
  advertiser TEXT NOT NULL,
  duration_sec INT DEFAULT 30,
  status TEXT DEFAULT 'aprovado',           -- producao | aprovado | no-ar | preempt
  position INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS spot_productions (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  client TEXT NOT NULL,
  duration TEXT,
  step TEXT DEFAULT 'Pedido',               -- Pedido | Roteiro | Gravação | Aprovação | No ar
  owner TEXT, due TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_card (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  daypart TEXT NOT NULL,
  price_30 NUMERIC(10,2),
  yield TEXT,
  occupancy INT,
  ai_hint TEXT
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  client TEXT NOT NULL,
  period TEXT,
  value NUMERIC(12,2) DEFAULT 0,
  einvoice TEXT DEFAULT 'pendente',         -- pendente | emitida
  status TEXT DEFAULT 'aberta',             -- aberta | paga | vencida
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receivables (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  client TEXT NOT NULL,
  value NUMERIC(12,2) DEFAULT 0,
  days_overdue INT DEFAULT 0,
  risk TEXT DEFAULT 'baixo',                -- baixo | medio | alto
  status TEXT DEFAULT 'aberto'
);

CREATE TABLE IF NOT EXISTS activations (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  name TEXT NOT NULL,
  client TEXT,
  city TEXT, uf TEXT,
  has_fm BOOLEAN DEFAULT TRUE,
  audio_source TEXT DEFAULT 'FM ao vivo',
  stage TEXT DEFAULT 'Briefing',            -- Briefing | Planejada | Em campo | Concluída
  when_label TEXT,
  vehicle TEXT, team TEXT, speakers TEXT,
  progress INT DEFAULT 0,
  checklist JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipment (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  kind TEXT NOT NULL,                       -- caixa | veiculo | pendrive | outro
  name TEXT NOT NULL,
  status TEXT DEFAULT 'disponivel',
  qty INT DEFAULT 1,
  note TEXT
);

CREATE TABLE IF NOT EXISTS team_schedule (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  person TEXT NOT NULL,
  role TEXT,
  shift TEXT,
  day TEXT,
  status TEXT DEFAULT 'ok'
);

CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  advertiser TEXT NOT NULL,
  name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  period TEXT,
  contracted INT DEFAULT 0,
  aired INT DEFAULT 0,
  reach TEXT, clicks INT DEFAULT 0,
  investment NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'ativa',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  campaign_id INT REFERENCES campaigns(id),
  kind TEXT NOT NULL,                       -- audio | imagem | video
  title TEXT NOT NULL,
  status TEXT DEFAULT 'aguardando',         -- aguardando | aprovado | ajuste | reprovado
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS airing_proofs (
  id SERIAL PRIMARY KEY,
  campaign_id INT REFERENCES campaigns(id),
  aired_on DATE, aired_at TEXT,
  program TEXT, praca TEXT,
  status TEXT DEFAULT 'veiculado'           -- veiculado | programado
);

CREATE TABLE IF NOT EXISTS social_accounts (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  platform TEXT NOT NULL,                   -- youtube | instagram | facebook | tiktok | google | x
  handle TEXT,
  followers TEXT,
  connected BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  body TEXT NOT NULL,
  platforms TEXT[] DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  owner TEXT,
  status TEXT DEFAULT 'agendado',           -- rascunho | agendado | publicado | recorrente
  source TEXT DEFAULT 'manual',             -- manual | ia | trend
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trends (
  id SERIAL PRIMARY KEY,
  kind TEXT, title TEXT NOT NULL, meta TEXT,
  posted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_revenue (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  platform TEXT NOT NULL,
  month TEXT NOT NULL,
  value NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  area TEXT NOT NULL,
  condition TEXT NOT NULL,
  message TEXT NOT NULL,
  wa_group TEXT NOT NULL,
  channel TEXT DEFAULT 'template',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_log (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  rule_id INT REFERENCES alert_rules(id),
  title TEXT NOT NULL,
  wa_group TEXT,
  status TEXT DEFAULT 'entregue',
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pautas (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  title TEXT NOT NULL,
  editoria TEXT, reporter TEXT,
  status TEXT DEFAULT 'apurando',           -- apurando | producao | no-ar
  time_slot TEXT,
  source TEXT DEFAULT 'redacao',            -- redacao | radar
  meta TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS internal_tasks (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  title TEXT NOT NULL,
  kind TEXT DEFAULT 'pendencia',            -- pendencia | aprovacao | sop
  detail TEXT,
  done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_email TEXT, action TEXT NOT NULL, entity TEXT, entity_id TEXT,
  at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spots_break ON spots(break_id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant ON deals(tenant_id, pipeline);
CREATE INDEX IF NOT EXISTS idx_alertlog_tenant ON alert_log(tenant_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlog_tenant ON play_log(tenant_id, played_at DESC);
`;

for (const stmt of ddl.split(';').map(s => s.trim()).filter(Boolean)) {
  await sql.unsafe(stmt);
}
console.log('✓ migração aplicada');
await sql.end();
