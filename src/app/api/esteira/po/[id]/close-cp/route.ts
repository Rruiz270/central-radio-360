import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { canCreate } from '@/lib/esteira';
import { audit, alerta, nextCode } from '@/lib/esteira-server';

/* PO → CP. O Custo de Produção nasce como cópia fiel do orçamento aprovado;
   a operação depois substitui os valores pelo que de fato foi gasto, e a
   comparação orçado × realizado sai sozinha. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  if (!canCreate(session.role, 'CP')) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });

  const { id } = await params;
  const poId = Number(id);
  const [po] = await sql`SELECT * FROM purchase_orders WHERE id = ${poId} AND kind = 'PO'`;
  if (!po) return NextResponse.json({ error: 'PO não encontrado' }, { status: 404 });

  const pend = await sql`SELECT area FROM po_approvals WHERE po_id = ${poId} AND approved = FALSE`;
  if (pend.length)
    return NextResponse.json({ error: 'o orçamento precisa estar aprovado para fechar o custo' }, { status: 409 });

  const [ja] = await sql`SELECT id, code FROM purchase_orders WHERE source_po_id = ${poId} AND kind = 'CP'`;
  if (ja) return NextResponse.json({ ok: true, cp: ja, already: true });

  const code = await nextCode('CP');
  const [cp] = await sql`
    INSERT INTO purchase_orders (tenant_id, kind, code, source_po_id, pi_id, client, contact, project,
                                 prospect, period, event_date, event_place, contract_no, revenue,
                                 fee_pct, charges_pct, planning_pct, status, created_by)
    SELECT tenant_id, 'CP', ${code}, id, pi_id, client, contact, project,
           prospect, period, event_date, event_place, contract_no, revenue,
           fee_pct, charges_pct, planning_pct, 'aberta', ${session.name}
    FROM purchase_orders WHERE id = ${poId}
    RETURNING id, code`;

  await sql`
    INSERT INTO po_items (po_id, pos, rubrica, item, dates, supplier, direct_pay, qty, period,
                          unit_price, margin, markup, client_unit, client_qty, client_period, payment)
    SELECT ${cp.id}, pos, rubrica, item, dates, supplier, direct_pay, qty, period,
           unit_price, margin, markup, client_unit, client_qty, client_period, payment
    FROM po_items WHERE po_id = ${poId}`;

  await audit(session, `CP ${cp.code} aberto a partir de ${po.code}`, 'purchase_order', cp.id);
  await alerta(session, `Custo de Produção ${cp.code} aberto — ${po.client}`, 'Financeiro');
  return NextResponse.json({ ok: true, cp });
}
