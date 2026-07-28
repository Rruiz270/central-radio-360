import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { canCreate, DEPT, isDept, type Dept } from '@/lib/esteira';
import { alerta, audit, nextCode } from '@/lib/esteira-server';

/* PD autorizada → gera uma O.S. por departamento e por praça.
   O saldo comprado da O.S. sai da soma das quantidades da PD — nunca é digitado. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  if (!canCreate(session.role, 'OS')) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });

  const { id } = await params;
  const pdId = Number(id);
  const body = await req.json().catch(() => ({}));

  const [pd] = await sql`SELECT * FROM distributions WHERE id = ${pdId}`;
  if (!pd) return NextResponse.json({ error: 'PD não encontrada' }, { status: 404 });
  if (pd.status !== 'autorizada')
    return NextResponse.json({ error: 'autorize a PD antes de gerar as O.S.' }, { status: 409 });

  const [pi] = await sql`SELECT * FROM insertion_orders WHERE id = ${pd.pi_id}`;

  /* agrupa a PD por praça + departamento */
  const grupos = await sql`
    SELECT tenant_id, dept, sum(qty)::int AS qty
    FROM distribution_items
    WHERE pd_id = ${pdId} AND qty > 0
      ${body.tenant ? sql`AND tenant_id = ${Number(body.tenant)}` : sql``}
    GROUP BY tenant_id, dept
    ORDER BY tenant_id, dept`;

  const criadas: { code: string; dept: string; tenant_id: number }[] = [];
  for (const g of grupos) {
    const dept = String(g.dept);
    if (!isDept(dept)) continue;
    const d = DEPT[dept as Dept];

    const [ja] = await sql`
      SELECT id FROM service_orders WHERE pd_id = ${pdId} AND tenant_id = ${g.tenant_id} AND dept = ${dept}`;
    if (ja) continue;

    const code = await nextCode('OS');
    const [os] = await sql`
      INSERT INTO service_orders
        (tenant_id, code, pi_id, pd_id, dept, client, agency, executive, planner, period, status, bought, unit, fields)
      VALUES (${g.tenant_id}, ${code}, ${pd.pi_id}, ${pdId}, ${dept}, ${pi.client}, ${pi.agency},
              ${pi.executive}, ${pi.planner}, ${pi.period}, 'aberta', ${g.qty}, ${d.unit}, '{}'::jsonb)
      RETURNING id, code`;

    await sql`UPDATE distribution_items SET os_id = ${os.id}
              WHERE pd_id = ${pdId} AND tenant_id = ${g.tenant_id} AND dept = ${dept}`;
    criadas.push({ code: os.code, dept, tenant_id: g.tenant_id as number });
  }

  if (criadas.length) {
    await audit(session, `${criadas.length} O.S. geradas de ${pd.code}`, 'distribution', pdId);
    await alerta(session, `${criadas.length} O.S. abertas a partir da ${pd.code} — P.I. ${pi.code}`, 'Operações');
  }
  return NextResponse.json({ ok: true, criadas, total: criadas.length });
}
