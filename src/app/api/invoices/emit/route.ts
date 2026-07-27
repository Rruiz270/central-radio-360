import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

/* Emissão de NFS-e: batch (todas pendentes) ou on-demand (uma).
   Sem agregador plugado ainda: marca como emitida e registra na auditoria. */
export async function POST(req: NextRequest) {
  const session = await requireApi('financeiro');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const { mode, invoice_id } = await req.json().catch(() => ({ mode: 'batch' }));

  let rows;
  if (mode === 'single' && invoice_id) {
    rows = await sql`
      UPDATE invoices SET einvoice = 'emitida' WHERE id = ${invoice_id} AND tenant_id = ${session.tenantId} AND einvoice = 'pendente'
      RETURNING id, client`;
  } else {
    rows = await sql`
      UPDATE invoices SET einvoice = 'emitida' WHERE tenant_id = ${session.tenantId} AND einvoice = 'pendente'
      RETURNING id, client`;
  }
  await sql`INSERT INTO audit_log (user_email, action, entity, entity_id)
    VALUES (${session.email}, ${'nfse-' + (mode === 'single' ? 'ondemand' : 'batch')}, 'invoice', ${rows.map((r) => r.id).join(',') || 'nenhuma'})`;
  return NextResponse.json({ ok: true, emitted: rows.length, clients: rows.map((r) => r.client) });
}
