import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { sendWhatsApp } from '@/lib/whatsapp';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi('alertas');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const { id } = await params;
  const [rule] = await sql`
    SELECT * FROM alert_rules WHERE id = ${Number(id)} AND tenant_id = ${session.tenantId}`;
  if (!rule) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });

  const wa = await sendWhatsApp(rule.message);
  await sql`
    INSERT INTO alert_log (tenant_id, rule_id, title, wa_group, status)
    VALUES (${session.tenantId}, ${rule.id}, ${'[teste] ' + rule.condition}, ${rule.wa_group}, ${wa.sent ? 'entregue' : 'simulado'})`;
  return NextResponse.json({ ok: true, delivered: wa.sent, note: wa.note });
}
