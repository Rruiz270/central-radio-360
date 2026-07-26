import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  const { id } = await params;
  const { done } = await req.json();
  const rows = await sql`
    UPDATE internal_tasks SET done = ${!!done}
    WHERE id = ${Number(id)} AND tenant_id = ${session.tenantId}
    RETURNING *`;
  if (!rows[0]) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true, task: rows[0] });
}
