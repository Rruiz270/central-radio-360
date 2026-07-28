import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { canEditOS, isDept, type Dept } from '@/lib/esteira';
import { audit, alerta } from '@/lib/esteira-server';

async function loadOS(osId: number) {
  const [os] = await sql`SELECT * FROM service_orders WHERE id = ${osId}`;
  return os;
}

/* Edita a O.S.: campos do departamento, status, mapa de inserções e ações de campo. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });

  const { id } = await params;
  const osId = Number(id);
  const os = await loadOS(osId);
  if (!os) return NextResponse.json({ error: 'O.S. não encontrada' }, { status: 404 });

  const dept = String(os.dept);
  if (!isDept(dept) || !canEditOS(session.role, dept as Dept))
    return NextResponse.json({ error: `O.S. de ${dept} é de outro departamento` }, { status: 403 });
  if (session.role === 'afiliada' && os.tenant_id !== session.tenantId)
    return NextResponse.json({ error: 'outra praça' }, { status: 403 });

  const b = await req.json();

  /* campos específicos do modelo do departamento */
  if (b.fields) {
    const merged = { ...(os.fields as object), ...b.fields };
    await sql`UPDATE service_orders SET fields = ${sql.json(merged)}, updated_at = now() WHERE id = ${osId}`;
  }

  if (b.header) {
    await sql`
      UPDATE service_orders SET
        period = COALESCE(${b.header.period ?? null}, period),
        payment_date = COALESCE(${b.header.payment_date ?? null}, payment_date),
        updated_at = now()
      WHERE id = ${osId}`;
  }

  /* célula do mapa de inserções (mês × dia) */
  if (b.cell) {
    const { line, month, day, qty } = b.cell;
    if (Number(qty) > 0) {
      await sql`
        INSERT INTO os_map (os_id, line, month, day, qty)
        VALUES (${osId}, ${String(line)}, ${Number(month)}, ${Number(day)}, ${Number(qty)})
        ON CONFLICT (os_id, line, month, day) DO UPDATE SET qty = ${Number(qty)}`;
    } else {
      await sql`DELETE FROM os_map WHERE os_id = ${osId} AND line = ${String(line)}
                AND month = ${Number(month)} AND day = ${Number(day)}`;
    }
  }

  if (b.status) {
    await sql`UPDATE service_orders SET status = ${b.status}, updated_at = now() WHERE id = ${osId}`;
    await audit(session, `O.S. ${os.code} → ${b.status}`, 'service_order', osId);
    if (b.status === 'concluida') await alerta(session, `O.S. ${os.code} (${dept}) concluída`, 'Operações');
  }

  const fresh = await loadOS(osId);
  const map = await sql`SELECT line, month, day, qty FROM os_map WHERE os_id = ${osId}`;
  const [{ used }] = await sql`SELECT COALESCE(sum(qty),0)::int AS used FROM os_map WHERE os_id = ${osId}`;
  return NextResponse.json({ ok: true, os: fresh, map, used });
}
