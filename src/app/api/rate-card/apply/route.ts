import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

/* Pricing Copilot: aplica a sugestão de preço da IA no rate card */
export async function POST(req: NextRequest) {
  const session = await requireApi('ia');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const { daypart, price } = await req.json();
  if (!daypart || !price) return NextResponse.json({ error: 'daypart e preço obrigatórios' }, { status: 400 });
  const rows = await sql`
    UPDATE rate_card SET price_30 = ${price}, ai_hint = 'aplicado'
    WHERE tenant_id = ${session.tenantId} AND daypart ILIKE ${'%' + daypart + '%'}
    RETURNING *`;
  if (!rows.length) return NextResponse.json({ error: 'daypart não encontrado' }, { status: 404 });
  await sql`INSERT INTO audit_log (user_email, action, entity, entity_id)
    VALUES (${session.email}, 'pricing-apply', 'rate_card', ${daypart})`;
  return NextResponse.json({ ok: true, rate: rows[0] });
}
