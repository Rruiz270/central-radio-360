import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function POST(req: NextRequest) {
  const session = await requireApi('prog');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const b = await req.json();
  if (!b.title || !b.artist1) return NextResponse.json({ error: 'música e intérprete são obrigatórios' }, { status: 400 });
  const rows = await sql`
    INSERT INTO songs (tenant_id, title, artist1, artist2, composer, category_code, category, rhythm, bpm, year, origin, interval_h, is_new, active)
    VALUES (${session.tenantId}, ${b.title}, ${b.artist1}, ${b.artist2 || null}, ${b.composer || null},
            ${b.category_code || '01'}, ${b.category || 'Sucessos'}, ${b.rhythm || null}, ${b.bpm || null}, ${b.year || null},
            ${b.origin || 'Nacional'}, ${b.interval_h || 3}, ${!!b.is_new}, TRUE)
    RETURNING *`;
  return NextResponse.json({ ok: true, song: rows[0] });
}
