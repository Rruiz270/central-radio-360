/* Migração 5 — PO e CP no formato real da PROMOONE (planilha orçamentária por rubricas).
   O CP é a mesma planilha do PO fechada com o custo realizado: PO = orçado, CP = Custo de Produção.
   Idempotente. */
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
/* ---- a planilha vira "folha orçamentária": PO (orçado) ou CP (realizado) ---- */
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'PO';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS project TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS event_place TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS source_po_id INT REFERENCES purchase_orders(id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS pi_id INT REFERENCES insertion_orders(id);
/* percentuais da casa — editáveis por job (padrão do modelo: 10% / 17% / 5%) */
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS fee_pct NUMERIC(6,4) DEFAULT 0.10;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS charges_pct NUMERIC(6,4) DEFAULT 0.17;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS planning_pct NUMERIC(6,4) DEFAULT 0.05;

/* ---- linhas por rubrica, com o lado interno e o lado do cliente ---- */
ALTER TABLE po_items ADD COLUMN IF NOT EXISTS rubrica TEXT DEFAULT 'operacao';
ALTER TABLE po_items ADD COLUMN IF NOT EXISTS direct_pay BOOLEAN DEFAULT TRUE;
ALTER TABLE po_items ADD COLUMN IF NOT EXISTS period NUMERIC(10,2) DEFAULT 1;
ALTER TABLE po_items ADD COLUMN IF NOT EXISTS margin NUMERIC(6,4) DEFAULT 0;
ALTER TABLE po_items ADD COLUMN IF NOT EXISTS markup NUMERIC(6,4) DEFAULT 0;
ALTER TABLE po_items ADD COLUMN IF NOT EXISTS client_unit NUMERIC(14,2) DEFAULT 0;
ALTER TABLE po_items ADD COLUMN IF NOT EXISTS client_qty NUMERIC(10,2) DEFAULT 1;
ALTER TABLE po_items ADD COLUMN IF NOT EXISTS client_period NUMERIC(10,2) DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_po_kind ON purchase_orders(kind, status);
CREATE INDEX IF NOT EXISTS idx_poitems_rubrica ON po_items(po_id, rubrica);
`;

for (const stmt of ddl.split(';').map((s) => s.trim()).filter(Boolean)) {
  await sql.unsafe(stmt);
}

/* linhas antigas: o custo digitado passa a valer também para o lado do cliente */
await sql`
  UPDATE po_items
  SET client_unit = unit_price, client_qty = qty, client_period = 1, period = 1
  WHERE client_unit = 0 AND unit_price > 0`;

await sql`UPDATE purchase_orders SET kind = 'PO' WHERE kind IS NULL`;
await sql`UPDATE purchase_orders SET project = prospect WHERE project IS NULL`;

const [{ n }] = await sql`SELECT count(*)::int n FROM purchase_orders WHERE kind = 'PO'`;
console.log('✓ migração 5 aplicada — planilha por rubricas ·', n, 'PO(s) migrado(s)');
await sql.end();
