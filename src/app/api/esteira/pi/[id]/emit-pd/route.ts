import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { canCreate, num } from '@/lib/esteira';
import { alerta, audit, nextCode } from '@/lib/esteira-server';

/* P.I. → PD. Explode os itens da P.I. nas praças escolhidas, com o valor de
   tabela de cada praça (rede nacional: cada tenant tem o seu rate card). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  if (!canCreate(session.role, 'PD')) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });

  const { id } = await params;
  const piId = Number(id);
  const body = await req.json().catch(() => ({}));

  const [pi] = await sql`SELECT * FROM insertion_orders WHERE id = ${piId}`;
  if (!pi) return NextResponse.json({ error: 'P.I. não encontrada' }, { status: 404 });
  if (pi.status === 'rascunho')
    return NextResponse.json({ error: 'emita a P.I. antes de distribuir' }, { status: 409 });

  const exist = await sql`SELECT id, code FROM distributions WHERE pi_id = ${piId}`;
  if (exist[0]) return NextResponse.json({ ok: true, pd: exist[0], already: true });

  const items = await sql`SELECT * FROM io_items WHERE pi_id = ${piId} ORDER BY pos, id`;
  if (!items.length) return NextResponse.json({ error: 'P.I. sem itens' }, { status: 409 });

  /* praças-alvo: as enviadas, ou a rede inteira */
  const tenantIds: number[] = Array.isArray(body.tenants) && body.tenants.length
    ? body.tenants.map(Number)
    : (await sql`SELECT id FROM tenants ORDER BY id`).map((t) => t.id as number);

  const code = await nextCode('PD');
  const [pd] = await sql`
    INSERT INTO distributions (code, pi_id, project, payment, status)
    VALUES (${code}, ${piId}, ${body.project || pi.client}, ${body.payment || '30/60/90 dd'}, 'rascunho')
    RETURNING *`;

  /* share mensal padrão: distribui igualmente nos meses informados (default set–dez) */
  const monthsList: number[] = Array.isArray(body.months) && body.months.length ? body.months.map(Number) : [9, 10, 11, 12];
  const share = 1 / monthsList.length;
  const months: Record<string, number> = {};
  monthsList.forEach((m) => { months[String(m)] = share; });

  /* rate card da praça — se não houver, cai no valor da P.I. */
  const rc = await sql`SELECT tenant_id, avg(price_30)::numeric AS p FROM rate_card GROUP BY tenant_id`;
  const rcMap = new Map<number, number>(rc.map((r) => [r.tenant_id as number, num(r.p)]));
  const [base] = await sql`SELECT avg(price_30)::numeric AS p FROM rate_card WHERE tenant_id = 1`;
  const baseRate = num(base?.p) || 5460;

  let n = 0;
  for (const t of tenantIds) {
    const factor = (rcMap.get(t) || baseRate) / baseRate;
    for (const it of items) {
      await sql`
        INSERT INTO distribution_items
          (pd_id, tenant_id, scope, dept, item, seconds, qty, rate, discount, commission, months)
        VALUES (${pd.id}, ${t}, 'praca', ${it.dept}, ${it.item}, ${it.seconds}, ${it.qty},
                ${Math.round(num(it.rate) * factor * 100) / 100}, ${it.discount}, ${it.commission},
                ${sql.json(months)})`;
      n++;
    }
  }

  await sql`UPDATE insertion_orders SET status = 'distribuida', updated_at = now() WHERE id = ${piId}`;
  await audit(session, `PD ${code} gerada de ${pi.code} (${tenantIds.length} praças)`, 'distribution', pd.id);
  await alerta(session, `PD ${code} criada — ${tenantIds.length} praças, ${n} linhas`, 'Comercial');

  return NextResponse.json({ ok: true, pd, lines: n, tenants: tenantIds.length });
}
