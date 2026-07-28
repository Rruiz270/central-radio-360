import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { canCreate, DEFAULT_DISCOUNT, DEFAULT_COMMISSION } from '@/lib/esteira';
import { alerta, audit, nextCode } from '@/lib/esteira-server';

/* PO fechado → emite a P.I., que passa a ser a chave de toda a esteira.
   Bloqueia se alguma das 4 áreas ainda não assinou. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  if (!canCreate(session.role, 'PI'))
    return NextResponse.json({ error: 'emitir P.I. é do Comercial' }, { status: 403 });

  const { id } = await params;
  const poId = Number(id);

  const [po] = await sql`SELECT * FROM purchase_orders WHERE id = ${poId}`;
  if (!po) return NextResponse.json({ error: 'PO não encontrado' }, { status: 404 });

  const pend = await sql`SELECT area FROM po_approvals WHERE po_id = ${poId} AND approved = FALSE`;
  if (pend.length)
    return NextResponse.json(
      { error: `aprovação pendente: ${pend.map((p) => p.area).join(', ')}` },
      { status: 409 },
    );

  const existing = await sql`SELECT id, code FROM insertion_orders WHERE po_id = ${poId}`;
  if (existing[0]) return NextResponse.json({ ok: true, pi: existing[0], already: true });

  const code = await nextCode('PI');
  const [pi] = await sql`
    INSERT INTO insertion_orders (tenant_id, code, po_id, client, period, status, created_by, pieces)
    VALUES (${session.tenantId}, ${code}, ${poId}, ${po.client}, ${po.period}, 'rascunho', ${session.name},
            ${sql.json(['Peça A', 'Peça B'])})
    RETURNING *`;

  /* Esqueleto do desmembramento rádio × agência — o operador ajusta quantidades e valores. */
  const seed = [
    { scope: 'radio', dept: 'opec', item: 'Comercial (horário) 30"', seconds: 30, qty: 0, rate: 5460 },
    { scope: 'radio', dept: 'artistico', item: 'Testemunhal', seconds: 60, qty: 0, rate: 8900 },
    { scope: 'agencia', dept: 'operacoes', item: 'Pit stop (ativação)', seconds: 0, qty: 0, rate: 18500 },
    { scope: 'agencia', dept: 'promocao', item: 'Promoção / sorteio', seconds: 0, qty: 0, rate: 9600 },
  ];
  let pos = 0;
  for (const s of seed) {
    await sql`
      INSERT INTO io_items (pi_id, pos, scope, dept, item, seconds, qty, rate, discount, commission)
      VALUES (${pi.id}, ${pos++}, ${s.scope}, ${s.dept}, ${s.item}, ${s.seconds}, ${s.qty}, ${s.rate},
              ${DEFAULT_DISCOUNT}, ${DEFAULT_COMMISSION})`;
  }

  await sql`UPDATE purchase_orders SET status = 'fechada', updated_at = now() WHERE id = ${poId}`;
  await audit(session, `P.I. ${code} emitida a partir de ${po.code}`, 'insertion_order', pi.id);
  await alerta(session, `P.I. ${code} emitida — ${po.client}`, 'Comercial');

  return NextResponse.json({ ok: true, pi });
}
