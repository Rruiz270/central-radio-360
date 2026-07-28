import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { canCreate, money, num } from '@/lib/esteira';
import { alerta, audit, nextCode } from '@/lib/esteira-server';

/* Emite o PV de uma P.I. — só depois que todas as peças em produção foram aprovadas.
   As entregas previstas saem da PD, por praça: é o que vira comprovação no Portal. */
export async function POST(req: NextRequest) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  if (!canCreate(session.role, 'PV')) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });

  const { pi_id } = await req.json();
  const piId = Number(pi_id);

  const [pi] = await sql`SELECT * FROM insertion_orders WHERE id = ${piId}`;
  if (!pi) return NextResponse.json({ error: 'P.I. não encontrada' }, { status: 404 });

  const pend = await sql`
    SELECT count(*)::int n FROM productions WHERE pi_id = ${piId} AND client_status <> 'aprovado'`;
  if (pend[0].n)
    return NextResponse.json(
      { error: `${pend[0].n} peça(s) sem aprovação do cliente — não é possível veicular` },
      { status: 409 },
    );

  const [ja] = await sql`SELECT id, code FROM airing_orders WHERE pi_id = ${piId}`;
  if (ja) return NextResponse.json({ ok: true, pv: ja, already: true });

  const items = await sql`SELECT * FROM io_items WHERE pi_id = ${piId}`;
  const total = items.reduce(
    (a, i) => a + money(num(i.qty), num(i.rate), num(i.discount), num(i.commission)).net,
    0,
  );

  const code = await nextCode('PV');
  const [pv] = await sql`
    INSERT INTO airing_orders (tenant_id, code, pi_id, legal_name, trade_name, campaign, period, total, installments, status)
    VALUES (${session.tenantId}, ${code}, ${piId}, ${pi.client}, ${pi.client}, ${pi.client + ' — campanha'},
            ${pi.period}, ${total}, '3x', 'rascunho')
    RETURNING *`;

  const entregas = await sql`
    SELECT di.tenant_id, di.item, sum(di.qty)::int qty, t.name AS praca
    FROM distribution_items di
    JOIN distributions d ON d.id = di.pd_id
    JOIN tenants t ON t.id = di.tenant_id
    WHERE d.pi_id = ${piId} AND di.qty > 0
    GROUP BY di.tenant_id, di.item, t.name ORDER BY t.name`;

  for (const e of entregas) {
    const [{ done }] = await sql`
      SELECT COALESCE(sum(m.qty),0)::int done FROM os_map m
      JOIN service_orders o ON o.id = m.os_id
      WHERE o.pi_id = ${piId} AND o.tenant_id = ${e.tenant_id}`;
    await sql`
      INSERT INTO airing_deliveries (pv_id, tenant_id, label, planned, done)
      VALUES (${pv.id}, ${e.tenant_id}, ${e.item}, ${e.qty}, ${Math.min(Number(done), Number(e.qty))})`;
  }

  await audit(session, `PV ${code} emitido para ${pi.code}`, 'airing_order', pv.id);
  await alerta(session, `PV ${code} emitido — ${pi.client}`, 'Tráfego');
  return NextResponse.json({ ok: true, pv });
}
