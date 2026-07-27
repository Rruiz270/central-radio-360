import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi('concorrencia');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const { id } = await params;
  const b = await req.json();
  const rows = await sql`
    UPDATE competitors SET
      ig_followers = COALESCE(${b.ig_followers ?? null}, ig_followers),
      yt_subs = COALESCE(${b.yt_subs ?? null}, yt_subs),
      dial = COALESCE(${b.dial ?? null}, dial),
      updated_at = now()
    WHERE id = ${Number(id)} AND tenant_id = ${session.tenantId}
    RETURNING *`;
  if (!rows[0]) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true, competitor: rows[0] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi('concorrencia');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const { id } = await params;
  await sql`DELETE FROM competitors WHERE id = ${Number(id)} AND tenant_id = ${session.tenantId}`;
  return NextResponse.json({ ok: true });
}
