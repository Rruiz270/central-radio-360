import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi('marketing');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const { id } = await params;
  const [trend] = await sql`SELECT * FROM trends WHERE id = ${Number(id)}`;
  if (!trend) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });

  await sql`UPDATE trends SET posted = TRUE WHERE id = ${trend.id}`;
  const rows = await sql`
    INSERT INTO posts (tenant_id, body, platforms, owner, status, source)
    VALUES (${session.tenantId}, ${trend.title}, '{Instagram,Facebook}', 'Automático', 'agendado', 'trend')
    RETURNING *`;
  return NextResponse.json({ ok: true, post: rows[0] });
}
