import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { canCreate } from '@/lib/esteira';
import { audit } from '@/lib/esteira-server';

/* Edita cabeçalho e linhas de custo do PO. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  if (!canCreate(session.role, 'PO'))
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });

  const { id } = await params;
  const poId = Number(id);
  const b = await req.json();

  if (b.header) {
    const h = b.header;
    await sql`
      UPDATE purchase_orders SET
        client = COALESCE(${h.client ?? null}, client),
        contact = COALESCE(${h.contact ?? null}, contact),
        prospect = COALESCE(${h.prospect ?? null}, prospect),
        period = COALESCE(${h.period ?? null}, period),
        contract_no = COALESCE(${h.contract_no ?? null}, contract_no),
        revenue = COALESCE(${h.revenue ?? null}, revenue),
        execution = COALESCE(${h.execution ?? null}, execution),
        project = COALESCE(${h.project ?? null}, project),
        event_date = COALESCE(${h.event_date || null}, event_date),
        event_place = COALESCE(${h.event_place ?? null}, event_place),
        fee_pct = COALESCE(${h.fee_pct ?? null}, fee_pct),
        charges_pct = COALESCE(${h.charges_pct ?? null}, charges_pct),
        planning_pct = COALESCE(${h.planning_pct ?? null}, planning_pct),
        updated_at = now()
      WHERE id = ${poId}`;
  }

  /* item novo */
  if (b.addItem) {
    const i = b.addItem;
    await sql`
      INSERT INTO po_items (po_id, pos, rubrica, item, dates, supplier, direct_pay,
                            qty, period, unit_price, margin, markup,
                            client_unit, client_qty, client_period, payment)
      VALUES (${poId}, ${i.pos ?? 99}, ${i.rubrica || 'operacao'}, ${i.item || 'Novo item'},
              ${i.dates || null}, ${i.supplier || null}, ${i.direct_pay ?? true},
              ${i.qty ?? 1}, ${i.period ?? 1}, ${i.unit_price ?? 0}, ${i.margin ?? 0}, ${i.markup ?? 0},
              ${i.client_unit ?? 0}, ${i.client_qty ?? 1}, ${i.client_period ?? 1}, ${i.payment || null})`;
  }

  /* edição inline de um item */
  if (b.item) {
    const i = b.item;
    await sql`
      UPDATE po_items SET
        rubrica = COALESCE(${i.rubrica ?? null}, rubrica),
        item = COALESCE(${i.item ?? null}, item),
        dates = COALESCE(${i.dates ?? null}, dates),
        supplier = COALESCE(${i.supplier ?? null}, supplier),
        direct_pay = COALESCE(${typeof i.direct_pay === 'boolean' ? i.direct_pay : null}, direct_pay),
        qty = COALESCE(${i.qty ?? null}, qty),
        period = COALESCE(${i.period ?? null}, period),
        unit_price = COALESCE(${i.unit_price ?? null}, unit_price),
        margin = COALESCE(${i.margin ?? null}, margin),
        markup = COALESCE(${i.markup ?? null}, markup),
        client_unit = COALESCE(${i.client_unit ?? null}, client_unit),
        client_qty = COALESCE(${i.client_qty ?? null}, client_qty),
        client_period = COALESCE(${i.client_period ?? null}, client_period),
        payment = COALESCE(${i.payment ?? null}, payment)
      WHERE id = ${Number(i.id)} AND po_id = ${poId}`;
  }

  if (b.removeItem) {
    await sql`DELETE FROM po_items WHERE id = ${Number(b.removeItem)} AND po_id = ${poId}`;
  }

  if (b.status) {
    await sql`UPDATE purchase_orders SET status = ${b.status}, updated_at = now() WHERE id = ${poId}`;
    await audit(session, 'PO → ' + b.status, 'purchase_order', poId);
  }

  const [po] = await sql`SELECT * FROM purchase_orders WHERE id = ${poId}`;
  const items = await sql`SELECT * FROM po_items WHERE po_id = ${poId} ORDER BY rubrica, pos, id`;
  return NextResponse.json({ ok: true, po, items });
}
