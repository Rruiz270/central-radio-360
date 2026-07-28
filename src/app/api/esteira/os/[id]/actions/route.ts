import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { canEditOS, isDept, type Dept } from '@/lib/esteira';
import { audit, alerta } from '@/lib/esteira-server';

/* Fichas de ação de campo — o miolo da O.S. de Operações / Promoção.
   Campos idênticos ao "DETALHAMENTO DAS AÇÕES" do modelo .xls. */

async function guard(osId: number, session: { role: string; tenantId: number }) {
  const [os] = await sql`SELECT * FROM service_orders WHERE id = ${osId}`;
  if (!os) return { erro: NextResponse.json({ error: 'O.S. não encontrada' }, { status: 404 }) };
  const dept = String(os.dept);
  if (!isDept(dept) || !canEditOS(session.role as never, dept as Dept))
    return { erro: NextResponse.json({ error: 'outro departamento' }, { status: 403 }) };
  if (session.role === 'afiliada' && os.tenant_id !== session.tenantId)
    return { erro: NextResponse.json({ error: 'outra praça' }, { status: 403 }) };
  return { os };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  const { id } = await params;
  const osId = Number(id);
  const g = await guard(osId, session);
  if (g.erro) return g.erro;

  const [{ n }] = await sql`SELECT COALESCE(max(seq),0)::int n FROM os_actions WHERE os_id = ${osId}`;
  const [a] = await sql`
    INSERT INTO os_actions (os_id, seq, place, goal, mechanics, team, equipment, uniform, car, gifts, photos, delivery_city, notes)
    VALUES (${osId}, ${n + 1}, 'A definir', '', '', '', '', '', 'Não', '', 'Obrigatório', '', '')
    RETURNING *`;
  await audit(session, `Ação ${a.seq} criada na O.S. ${g.os!.code}`, 'os_action', a.id);
  return NextResponse.json({ ok: true, action: a });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  const { id } = await params;
  const osId = Number(id);
  const g = await guard(osId, session);
  if (g.erro) return g.erro;

  const a = await req.json();
  await sql`
    UPDATE os_actions SET
      action_date = COALESCE(${a.action_date || null}, action_date),
      action_time = COALESCE(${a.action_time ?? null}, action_time),
      place = COALESCE(${a.place ?? null}, place),
      goal = COALESCE(${a.goal ?? null}, goal),
      mechanics = COALESCE(${a.mechanics ?? null}, mechanics),
      team = COALESCE(${a.team ?? null}, team),
      equipment = COALESCE(${a.equipment ?? null}, equipment),
      uniform = COALESCE(${a.uniform ?? null}, uniform),
      car = COALESCE(${a.car ?? null}, car),
      gifts = COALESCE(${a.gifts ?? null}, gifts),
      photos = COALESCE(${a.photos ?? null}, photos),
      delivery_city = COALESCE(${a.delivery_city ?? null}, delivery_city),
      notes = COALESCE(${a.notes ?? null}, notes),
      done = COALESCE(${typeof a.done === 'boolean' ? a.done : null}, done)
    WHERE id = ${Number(a.id)} AND os_id = ${osId}`;

  /* Ação executada consome saldo — e o saldo é sempre derivado, nunca digitado. */
  if (a.done === true) {
    const [os] = await sql`SELECT code, dept FROM service_orders WHERE id = ${osId}`;
    const [{ done }] = await sql`SELECT count(*)::int done FROM os_actions WHERE os_id = ${osId} AND done`;
    await alerta(session, `Ação executada — O.S. ${os.code} (${done} de ${await bought(osId)})`, 'Operações');
    await audit(session, `Ação concluída na O.S. ${os.code}`, 'os_action', a.id);
  }

  const rows = await sql`SELECT * FROM os_actions WHERE os_id = ${osId} ORDER BY seq`;
  return NextResponse.json({ ok: true, actions: rows });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  const { id } = await params;
  const osId = Number(id);
  const g = await guard(osId, session);
  if (g.erro) return g.erro;
  const { actionId } = await req.json();
  await sql`DELETE FROM os_actions WHERE id = ${Number(actionId)} AND os_id = ${osId}`;
  const rows = await sql`SELECT * FROM os_actions WHERE os_id = ${osId} ORDER BY seq`;
  return NextResponse.json({ ok: true, actions: rows });
}

async function bought(osId: number) {
  const [r] = await sql`SELECT bought FROM service_orders WHERE id = ${osId}`;
  return r?.bought ?? 0;
}
