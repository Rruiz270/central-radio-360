import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function POST(req: NextRequest) {
  const session = await requireApi('comercial');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const b = await req.json();
  if (!b.advertiser) return NextResponse.json({ error: 'anunciante obrigatório' }, { status: 400 });
  const rows = await sql`
    INSERT INTO orders (tenant_id, advertiser, agency, flight_start, flight_end, daypart, insertions, duration_sec, value, sale_type)
    VALUES (${session.tenantId}, ${b.advertiser}, ${b.agency || null}, ${b.flight_start || null}, ${b.flight_end || null},
            ${b.daypart || 'Rotativo'}, ${b.insertions || 0}, ${b.duration_sec || 30}, ${b.value || 0}, ${b.sale_type || 'Dinheiro'})
    RETURNING *`;
  return NextResponse.json({ ok: true, order: rows[0] });
}
