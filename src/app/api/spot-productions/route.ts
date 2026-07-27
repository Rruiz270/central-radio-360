import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function POST(req: NextRequest) {
  const session = await requireApi('comercial');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const b = await req.json();
  if (!b.client) return NextResponse.json({ error: 'cliente obrigatório' }, { status: 400 });
  const rows = await sql`
    INSERT INTO spot_productions (tenant_id, client, duration, step, owner, due)
    VALUES (${session.tenantId}, ${b.client}, ${b.duration || '30"'}, 'Pedido',
            ${b.owner || 'Redação criativa'}, ${b.due || 'a definir'})
    RETURNING *`;
  return NextResponse.json({ ok: true, production: rows[0] });
}
