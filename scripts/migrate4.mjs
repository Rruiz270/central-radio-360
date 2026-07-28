/* Migração 4 — Esteira documental da agência: PO → PI → PD → OS → CP → PV.
   Idempotente (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS, nunca DROP). */
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url =
  process.env.DATABASE_URL ||
  readFileSync(join(__dirname, '..', '.env.local'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim().replace(/^"|"$/g, '');
const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 25 });

const ddl = `
/* ---------- numeração nacional (PO-2026-0001, PI-2026-0871, …) ---------- */
CREATE TABLE IF NOT EXISTS doc_counters (
  kind TEXT NOT NULL,
  year INT NOT NULL,
  seq INT NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, year)
);

/* ---------- PO · Pedido de Orçamento (planilha orçamentária) ---------- */
CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  code TEXT UNIQUE NOT NULL,
  client TEXT NOT NULL,
  contact TEXT,
  prospect TEXT,
  period TEXT,
  contract_no TEXT,
  revenue NUMERIC(14,2) DEFAULT 0,        -- valor atual da prospecção
  discounted NUMERIC(14,2) DEFAULT 0,     -- valor descontado
  status TEXT DEFAULT 'aberta',           -- aberta | fechada | cancelada
  execution TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS po_items (
  id SERIAL PRIMARY KEY,
  po_id INT REFERENCES purchase_orders(id) ON DELETE CASCADE,
  pos INT DEFAULT 0,
  item TEXT NOT NULL,
  dates TEXT,
  supplier TEXT,
  qty NUMERIC(12,2) DEFAULT 1,
  unit_price NUMERIC(14,2) DEFAULT 0,
  payment TEXT
);

CREATE TABLE IF NOT EXISTS po_approvals (
  id SERIAL PRIMARY KEY,
  po_id INT REFERENCES purchase_orders(id) ON DELETE CASCADE,
  area TEXT NOT NULL,                     -- diretoria | financeiro | rh | operacoes
  approved BOOLEAN DEFAULT FALSE,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  note TEXT,
  UNIQUE (po_id, area)
);

/* ---------- PI · Pedido de Inserção (a chave de toda a esteira) ---------- */
CREATE TABLE IF NOT EXISTS insertion_orders (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  code TEXT UNIQUE NOT NULL,
  po_id INT REFERENCES purchase_orders(id),
  client TEXT NOT NULL,
  agency TEXT,
  executive TEXT,
  planner TEXT,
  vehicle TEXT DEFAULT 'Asa Mídia e Comunicações Ltda.',
  period TEXT,
  pieces JSONB DEFAULT '[]'::jsonb,       -- ["Peça A · 30\\"", …]
  status TEXT DEFAULT 'rascunho',         -- rascunho | emitida | distribuida | encerrada
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS io_items (
  id SERIAL PRIMARY KEY,
  pi_id INT REFERENCES insertion_orders(id) ON DELETE CASCADE,
  pos INT DEFAULT 0,
  scope TEXT NOT NULL DEFAULT 'radio',    -- radio | agencia  (o desmembramento)
  dept TEXT NOT NULL,                     -- opec | operacoes | artistico | internet | video | chupim | promocao | youtube
  item TEXT NOT NULL,
  seconds INT DEFAULT 0,
  qty INT DEFAULT 0,
  rate NUMERIC(14,2) DEFAULT 0,           -- valor tabela
  discount NUMERIC(8,7) DEFAULT 0,        -- 0.8568282
  commission NUMERIC(6,4) DEFAULT 0.20    -- comissão de agência
);

/* ---------- PD · Planilha de Distribuição (por praça) ---------- */
CREATE TABLE IF NOT EXISTS distributions (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  pi_id INT REFERENCES insertion_orders(id) ON DELETE CASCADE,
  project TEXT,
  payment TEXT,
  authorized_by TEXT,
  authorized_at TIMESTAMPTZ,
  status TEXT DEFAULT 'rascunho',         -- rascunho | autorizada | executada
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS distribution_items (
  id SERIAL PRIMARY KEY,
  pd_id INT REFERENCES distributions(id) ON DELETE CASCADE,
  tenant_id INT REFERENCES tenants(id),   -- a praça (NULL = rede nacional)
  scope TEXT DEFAULT 'praca',             -- praca | nacional
  dept TEXT NOT NULL,
  item TEXT NOT NULL,
  seconds INT DEFAULT 0,
  qty INT DEFAULT 0,
  rate NUMERIC(14,2) DEFAULT 0,
  discount NUMERIC(8,7) DEFAULT 0,
  commission NUMERIC(6,4) DEFAULT 0.20,
  months JSONB DEFAULT '{}'::jsonb,       -- {"9":0.30,"10":0.28,…} share por mês
  os_id INT
);

/* ---------- OS · Ordem de Serviço (uma por departamento) ---------- */
CREATE TABLE IF NOT EXISTS service_orders (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  code TEXT UNIQUE NOT NULL,
  pi_id INT REFERENCES insertion_orders(id),
  pd_id INT REFERENCES distributions(id),
  dept TEXT NOT NULL,                     -- opec | operacoes | artistico | promocao | internet | chupim | cobertura
  client TEXT NOT NULL,
  agency TEXT,
  executive TEXT,
  planner TEXT,
  period TEXT,
  payment_date TEXT,
  status TEXT DEFAULT 'aberta',           -- aberta | em_execucao | concluida | cancelada
  fields JSONB DEFAULT '{}'::jsonb,       -- campos específicos do departamento
  bought INT DEFAULT 0,                   -- saldo comprado (vem da PD)
  unit TEXT DEFAULT 'inserções',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_actions (
  id SERIAL PRIMARY KEY,
  os_id INT REFERENCES service_orders(id) ON DELETE CASCADE,
  seq INT DEFAULT 1,
  action_date DATE,
  action_time TEXT,
  place TEXT,
  goal TEXT,
  mechanics TEXT,
  team TEXT,
  equipment TEXT,
  uniform TEXT,
  car TEXT,
  gifts TEXT,
  photos TEXT,
  delivery_city TEXT,
  notes TEXT,
  done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_map (
  id SERIAL PRIMARY KEY,
  os_id INT REFERENCES service_orders(id) ON DELETE CASCADE,
  line TEXT NOT NULL,                     -- peça / item
  month INT NOT NULL,                     -- 1-12
  day INT NOT NULL,                       -- 1-31
  qty INT DEFAULT 0,
  UNIQUE (os_id, line, month, day)
);

/* ---------- CP · Controle de Produção ---------- */
CREATE TABLE IF NOT EXISTS productions (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  code TEXT UNIQUE NOT NULL,
  pi_id INT REFERENCES insertion_orders(id),
  os_id INT REFERENCES service_orders(id),
  piece TEXT NOT NULL,
  kind TEXT DEFAULT 'audio',              -- audio | texto | imagem | video
  seconds INT DEFAULT 0,
  step INT DEFAULT 1,                     -- 1 Briefing 2 Roteiro 3 Gravação 4 Aprovação 5 Liberada
  owner TEXT,
  due DATE,
  client_status TEXT DEFAULT 'pendente',  -- pendente | aguardando | aprovado | ajuste
  script TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

/* ---------- PV · Pedido de Veiculação ---------- */
CREATE TABLE IF NOT EXISTS airing_orders (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  code TEXT UNIQUE NOT NULL,
  pi_id INT REFERENCES insertion_orders(id),
  legal_name TEXT,
  trade_name TEXT,
  cnpj TEXT,
  campaign TEXT,
  period TEXT,
  total NUMERIC(14,2) DEFAULT 0,
  installments TEXT,
  status TEXT DEFAULT 'rascunho',         -- rascunho | autorizado | veiculando | encerrado
  authorized_by TEXT,
  authorized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS airing_deliveries (
  id SERIAL PRIMARY KEY,
  pv_id INT REFERENCES airing_orders(id) ON DELETE CASCADE,
  tenant_id INT REFERENCES tenants(id),
  label TEXT NOT NULL,
  planned INT DEFAULT 0,
  done INT DEFAULT 0,
  unit TEXT DEFAULT 'inserções'
);

CREATE INDEX IF NOT EXISTS idx_po_tenant ON purchase_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pi_tenant ON insertion_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ioitems_pi ON io_items(pi_id);
CREATE INDEX IF NOT EXISTS idx_pditems_pd ON distribution_items(pd_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_os_tenant ON service_orders(tenant_id, dept, status);
CREATE INDEX IF NOT EXISTS idx_os_pi ON service_orders(pi_id);
CREATE INDEX IF NOT EXISTS idx_osmap_os ON os_map(os_id, month);
CREATE INDEX IF NOT EXISTS idx_prod_pi ON productions(pi_id, step);
CREATE INDEX IF NOT EXISTS idx_pv_pi ON airing_orders(pi_id);
`;

for (const stmt of ddl.split(';').map((s) => s.trim()).filter(Boolean)) {
  await sql.unsafe(stmt);
}

/* ---------- praças da rede nacional (abas reais da P.D. 2025 Rede) ---------- */
const PRACAS = [
  { slug: 'ribeirao',  name: 'Metropolitana Ribeirão',    city: 'Ribeirão Preto', uf: 'SP', freq: '104.9', ibge: '3543402' },
  { slug: 'litoral',   name: 'Metropolitana Litoral SP',  city: 'Santos',         uf: 'SP', freq: '99.1',  ibge: '3548500' },
  { slug: 'foz',       name: 'Metropolitana Foz',         city: 'Foz do Iguaçu',  uf: 'PR', freq: '95.3',  ibge: '4108304' },
  { slug: 'aracaju',   name: 'Metropolitana Aracaju',     city: 'Aracaju',        uf: 'SE', freq: '101.7', ibge: '2800308' },
  { slug: 'goiania',   name: 'Metropolitana Goiânia',     city: 'Goiânia',        uf: 'GO', freq: '92.5',  ibge: '5208707' },
  { slug: 'tucurui',   name: 'Metropolitana Tucuruí',     city: 'Tucuruí',        uf: 'PA', freq: '87.9',  ibge: '1508209' },
];
for (const p of PRACAS) {
  await sql`
    INSERT INTO tenants (slug, name, freq, city, uf, is_hq, system, migration_phase, ibge_code)
    VALUES (${p.slug}, ${p.name}, ${p.freq}, ${p.city}, ${p.uf}, FALSE, 'pulsar', 0, ${p.ibge})
    ON CONFLICT (slug) DO NOTHING`;
}
const [{ n: nt }] = await sql`SELECT count(*)::int n FROM tenants`;
console.log('✓ praças da rede:', nt);

console.log('✓ migração 4 aplicada — esteira documental PO→PI→PD→OS→CP→PV');
await sql.end();
