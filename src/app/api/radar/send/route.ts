import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { sendWhatsApp } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  const session = await requireApi('jornalismo');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const { test } = await req.json().catch(() => ({ test: true }));

  const radar = await sql`
    SELECT title FROM pautas WHERE tenant_id = ${session.tenantId} AND source = 'radar' ORDER BY id LIMIT 5`;
  const body =
    `Radar do Jornalista — ${new Date().toLocaleDateString('pt-BR')}\n\n` +
    radar.map((p, i) => `${i + 1}. ${p.title}`).join('\n') +
    '\n\nPublicou? Marque a Metropolitana e amplie seu alcance.';

  const wa = await sendWhatsApp(body);
  await sql`
    INSERT INTO alert_log (tenant_id, title, wa_group, status)
    VALUES (${session.tenantId}, ${(test ? '[teste] ' : '') + `Radar: ${radar.length} pautas do dia`}, 'Redação', ${wa.sent ? 'entregue' : 'simulado'})`;
  return NextResponse.json({ ok: true, delivered: wa.sent, note: wa.note });
}
