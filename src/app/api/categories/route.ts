import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function POST(req: NextRequest) {
  const session = await requireApi('prog');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: 'nome obrigatório' }, { status: 400 });
  const rows = await sql`
    INSERT INTO categories (tenant_id, code, name, weight, interval_h, rotation, active)
    VALUES (${session.tenantId}, ${b.code || '99'}, ${b.name}, ${b.weight || 'Médio'},
            ${parseInt(b.interval_h, 10) || 3}, ${b.rotation || '1-2'}, TRUE)
    RETURNING *`;
  return NextResponse.json({ ok: true, category: rows[0] });
}
