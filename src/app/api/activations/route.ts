import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function POST(req: NextRequest) {
  const session = await requireApi('planejamento');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: 'nome da ação obrigatório' }, { status: 400 });
  const rows = await sql`
    INSERT INTO activations (tenant_id, name, client, city, uf, has_fm, audio_source, stage, when_label, progress, checklist)
    VALUES (${session.tenantId}, ${b.name}, ${b.client || null}, ${b.city || 'a definir'}, ${(b.uf || '').toUpperCase().slice(0, 2) || '--'},
            ${b.has_fm !== false}, ${b.has_fm !== false ? 'FM ao vivo' : 'Pendrive (sem FM)'}, 'Briefing', ${b.when_label || 'a agendar'}, 5, '[]')
    RETURNING *`;
  await sql`INSERT INTO alert_log (tenant_id, title, wa_group, status)
    VALUES (${session.tenantId}, ${'Novo briefing: ' + b.name}, 'Operações', 'simulado')`;
  return NextResponse.json({ ok: true, activation: rows[0] });
}
