import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function POST(req: NextRequest) {
  const session = await requireApi('equipe');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const b = await req.json();
  if (!b.person) return NextResponse.json({ error: 'nome obrigatório' }, { status: 400 });
  const statusMap: Record<string, string> = { 'OK / escalado': 'escalado', 'Em campo': 'em campo', 'Locução IA': 'auto', 'Folga': 'folga' };
  const rows = await sql`
    INSERT INTO team_schedule (tenant_id, person, role, shift, day, status)
    VALUES (${session.tenantId}, ${b.person}, ${b.role || 'Campo'}, ${b.shift || 'a definir'},
            ${b.day || 'Seg–Sex'}, ${statusMap[b.status] || b.status || 'escalado'})
    RETURNING *`;
  return NextResponse.json({ ok: true, member: rows[0] });
}
