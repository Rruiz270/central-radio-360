import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi('alertas');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const { id } = await params;
  const { active } = await req.json();
  const rows = await sql`
    UPDATE alert_rules SET active = ${!!active}
    WHERE id = ${Number(id)} AND tenant_id = ${session.tenantId}
    RETURNING *`;
  if (!rows[0]) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true, rule: rows[0] });
}
