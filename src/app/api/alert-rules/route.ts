import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function POST(req: NextRequest) {
  const session = await requireApi('alertas');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const { area, condition, message, wa_group, channel } = await req.json();
  if (!area || !condition || !message || !wa_group) {
    return NextResponse.json({ error: 'campos obrigatórios faltando' }, { status: 400 });
  }
  const rows = await sql`
    INSERT INTO alert_rules (tenant_id, area, condition, message, wa_group, channel, active)
    VALUES (${session.tenantId}, ${area}, ${condition}, ${message}, ${wa_group}, ${channel || 'template'}, TRUE)
    RETURNING *`;
  return NextResponse.json({ ok: true, rule: rows[0] });
}
