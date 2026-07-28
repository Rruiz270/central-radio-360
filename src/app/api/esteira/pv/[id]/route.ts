import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { canApprove } from '@/lib/esteira';
import { audit, alerta } from '@/lib/esteira-server';

/* Autoriza a veiculação (contrato Asa Mídia) e atualiza a comprovação de entrega. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });

  const { id } = await params;
  const pvId = Number(id);
  const [pv] = await sql`SELECT * FROM airing_orders WHERE id = ${pvId}`;
  if (!pv) return NextResponse.json({ error: 'PV não encontrado' }, { status: 404 });

  const b = await req.json();

  if (b.header) {
    await sql`
      UPDATE airing_orders SET
        legal_name = COALESCE(${b.header.legal_name ?? null}, legal_name),
        trade_name = COALESCE(${b.header.trade_name ?? null}, trade_name),
        cnpj = COALESCE(${b.header.cnpj ?? null}, cnpj),
        campaign = COALESCE(${b.header.campaign ?? null}, campaign),
        period = COALESCE(${b.header.period ?? null}, period),
        installments = COALESCE(${b.header.installments ?? null}, installments)
      WHERE id = ${pvId}`;
  }

  if (b.authorize) {
    if (!canApprove(session.role, 'PV'))
      return NextResponse.json({ error: 'autorização de veiculação é do Diretor Comercial' }, { status: 403 });
    await sql`
      UPDATE airing_orders SET status = 'autorizado', authorized_by = ${session.name}, authorized_at = now()
      WHERE id = ${pvId}`;
    await audit(session, `PV ${pv.code} autorizado`, 'airing_order', pvId);
    await alerta(session, `PV ${pv.code} autorizado — campanha liberada para o ar`, 'Tráfego');
  }

  if (b.status) {
    await sql`UPDATE airing_orders SET status = ${b.status} WHERE id = ${pvId}`;
    await audit(session, `PV ${pv.code} → ${b.status}`, 'airing_order', pvId);
    if (b.status === 'encerrado')
      await alerta(session, `PV ${pv.code} encerrado — comprovação disponível no Portal do Cliente`, 'Comercial');
  }

  if (b.delivery) {
    await sql`
      UPDATE airing_deliveries SET done = ${Number(b.delivery.done)}
      WHERE id = ${Number(b.delivery.id)} AND pv_id = ${pvId}`;
  }

  const [fresh] = await sql`SELECT * FROM airing_orders WHERE id = ${pvId}`;
  const deliveries = await sql`
    SELECT d.*, t.name AS praca FROM airing_deliveries d
    JOIN tenants t ON t.id = d.tenant_id WHERE d.pv_id = ${pvId} ORDER BY t.name, d.label`;
  return NextResponse.json({ ok: true, pv: fresh, deliveries });
}
