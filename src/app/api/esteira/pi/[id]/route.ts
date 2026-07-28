import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { canCreate, DEFAULT_DISCOUNT, DEFAULT_COMMISSION } from '@/lib/esteira';
import { audit, alerta } from '@/lib/esteira-server';

/* Edita a P.I.: cabeçalho, peças e os itens desmembrados em rádio × agência. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  if (!canCreate(session.role, 'PI')) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });

  const { id } = await params;
  const piId = Number(id);
  const b = await req.json();

  if (b.header) {
    const h = b.header;
    await sql`
      UPDATE insertion_orders SET
        client = COALESCE(${h.client ?? null}, client),
        agency = COALESCE(${h.agency ?? null}, agency),
        executive = COALESCE(${h.executive ?? null}, executive),
        planner = COALESCE(${h.planner ?? null}, planner),
        period = COALESCE(${h.period ?? null}, period),
        updated_at = now()
      WHERE id = ${piId}`;
  }

  if (b.pieces) {
    await sql`UPDATE insertion_orders SET pieces = ${sql.json(b.pieces)}, updated_at = now() WHERE id = ${piId}`;
  }

  if (b.addItem) {
    const i = b.addItem;
    await sql`
      INSERT INTO io_items (pi_id, pos, scope, dept, item, seconds, qty, rate, discount, commission)
      VALUES (${piId}, ${i.pos ?? 99}, ${i.scope || 'radio'}, ${i.dept || 'opec'}, ${i.item || 'Novo item'},
              ${i.seconds ?? 0}, ${i.qty ?? 0}, ${i.rate ?? 0}, ${DEFAULT_DISCOUNT}, ${DEFAULT_COMMISSION})`;
  }

  if (b.item) {
    const i = b.item;
    await sql`
      UPDATE io_items SET
        item = COALESCE(${i.item ?? null}, item),
        scope = COALESCE(${i.scope ?? null}, scope),
        dept = COALESCE(${i.dept ?? null}, dept),
        seconds = COALESCE(${i.seconds ?? null}, seconds),
        qty = COALESCE(${i.qty ?? null}, qty),
        rate = COALESCE(${i.rate ?? null}, rate),
        discount = COALESCE(${i.discount ?? null}, discount),
        commission = COALESCE(${i.commission ?? null}, commission)
      WHERE id = ${Number(i.id)} AND pi_id = ${piId}`;
  }

  if (b.removeItem) await sql`DELETE FROM io_items WHERE id = ${Number(b.removeItem)} AND pi_id = ${piId}`;

  if (b.status) {
    await sql`UPDATE insertion_orders SET status = ${b.status}, updated_at = now() WHERE id = ${piId}`;
    const [pi] = await sql`SELECT code, client FROM insertion_orders WHERE id = ${piId}`;
    await audit(session, `P.I. → ${b.status}`, 'insertion_order', piId);
    if (b.status === 'emitida') await alerta(session, `P.I. ${pi.code} emitida — ${pi.client}`, 'Comercial');
  }

  const [pi] = await sql`SELECT * FROM insertion_orders WHERE id = ${piId}`;
  const items = await sql`SELECT * FROM io_items WHERE pi_id = ${piId} ORDER BY scope DESC, pos, id`;
  return NextResponse.json({ ok: true, pi, items });
}
