import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { canCreate, PO_AREAS } from '@/lib/esteira';
import { audit, nextCode } from '@/lib/esteira-server';

/* Cria um PO (planilha orçamentária) já com as 4 linhas de aprovação abertas. */
export async function POST(req: NextRequest) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  if (!canCreate(session.role, 'PO'))
    return NextResponse.json({ error: 'seu perfil não abre orçamento' }, { status: 403 });

  const b = await req.json();
  if (!b.client) return NextResponse.json({ error: 'cliente obrigatório' }, { status: 400 });

  const code = await nextCode('PO');
  const rows = await sql`
    INSERT INTO purchase_orders (tenant_id, code, client, contact, prospect, period, contract_no, revenue, created_by)
    VALUES (${session.tenantId}, ${code}, ${b.client}, ${b.contact || null}, ${b.prospect || null},
            ${b.period || null}, ${b.contract_no || null}, ${b.revenue || 0}, ${session.name})
    RETURNING *`;
  const po = rows[0];

  for (const a of PO_AREAS) {
    await sql`INSERT INTO po_approvals (po_id, area) VALUES (${po.id}, ${a.key}) ON CONFLICT DO NOTHING`;
  }
  await audit(session, 'PO criado', 'purchase_order', po.id);
  return NextResponse.json({ ok: true, po });
}
