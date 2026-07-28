import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { canCreate } from '@/lib/esteira';
import { audit, alerta } from '@/lib/esteira-server';

/* Edita linhas da PD e autoriza a distribuição. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  if (!canCreate(session.role, 'PD')) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });

  const { id } = await params;
  const pdId = Number(id);
  const b = await req.json();

  if (b.item) {
    const i = b.item;
    await sql`
      UPDATE distribution_items SET
        qty = COALESCE(${i.qty ?? null}, qty),
        rate = COALESCE(${i.rate ?? null}, rate),
        discount = COALESCE(${i.discount ?? null}, discount),
        commission = COALESCE(${i.commission ?? null}, commission),
        item = COALESCE(${i.item ?? null}, item)
      WHERE id = ${Number(i.id)} AND pd_id = ${pdId}`;
  }

  if (b.removeItem) await sql`DELETE FROM distribution_items WHERE id = ${Number(b.removeItem)} AND pd_id = ${pdId}`;

  if (b.header) {
    await sql`
      UPDATE distributions SET
        project = COALESCE(${b.header.project ?? null}, project),
        payment = COALESCE(${b.header.payment ?? null}, payment)
      WHERE id = ${pdId}`;
  }

  if (b.authorize) {
    await sql`
      UPDATE distributions SET status = 'autorizada', authorized_by = ${session.name}, authorized_at = now()
      WHERE id = ${pdId}`;
    const [pd] = await sql`SELECT code FROM distributions WHERE id = ${pdId}`;
    await audit(session, `PD ${pd.code} autorizada`, 'distribution', pdId);
    await alerta(session, `PD ${pd.code} autorizada — liberada para gerar O.S.`, 'Operações');
  }

  const [pd] = await sql`SELECT * FROM distributions WHERE id = ${pdId}`;
  return NextResponse.json({ ok: true, pd });
}
