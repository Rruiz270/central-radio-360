import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function POST(req: NextRequest) {
  const session = await requireApi('jornalismo');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const b = await req.json();
  if (!b.title) return NextResponse.json({ error: 'pauta obrigatória' }, { status: 400 });
  const rows = await sql`
    INSERT INTO pautas (tenant_id, title, editoria, reporter, status, time_slot, source)
    VALUES (${session.tenantId}, ${b.title}, ${b.editoria || 'Geral'}, ${b.reporter || null},
            'apurando', ${b.time_slot || null}, 'redacao')
    RETURNING *`;
  return NextResponse.json({ ok: true, pauta: rows[0] });
}
