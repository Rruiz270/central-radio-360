import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function POST(req: NextRequest) {
  const session = await requireApi('marketing');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const { body, platforms, scheduled_for, owner, status, source } = await req.json();
  if (!body || !platforms?.length) {
    return NextResponse.json({ error: 'texto e ao menos uma rede são obrigatórios' }, { status: 400 });
  }
  const rows = await sql`
    INSERT INTO posts (tenant_id, body, platforms, scheduled_for, owner, status, source)
    VALUES (${session.tenantId}, ${body}, ${platforms}, ${scheduled_for || null},
            ${owner || session.name}, ${status || 'agendado'}, ${source || 'manual'})
    RETURNING *`;
  return NextResponse.json({ ok: true, post: rows[0] });
}
