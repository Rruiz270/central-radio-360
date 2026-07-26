import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

const STAGES = ['Lead', 'Contato', 'Proposta', 'Fechado', 'Briefing', 'Negociação', 'Ganho'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  const { id } = await params;
  const { stage } = await req.json();
  if (!STAGES.includes(stage)) return NextResponse.json({ error: 'etapa inválida' }, { status: 400 });

  const rows = await sql`
    UPDATE deals SET stage = ${stage}, updated_at = now()
    WHERE id = ${Number(id)} AND tenant_id = ${session.tenantId}
    RETURNING id, advertiser, value, stage`;
  if (!rows[0]) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });

  // Gatilho: fechou → alerta WhatsApp Comercial + Financeiro (motor de gatilhos)
  if (stage === 'Fechado' || stage === 'Ganho') {
    await sql`
      INSERT INTO alert_log (tenant_id, title, wa_group, status)
      VALUES (${session.tenantId}, ${'Proposta ' + rows[0].advertiser + ' = ' + stage}, 'Comercial+Fin.', 'entregue')`;
  }
  await sql`INSERT INTO audit_log (user_email, action, entity, entity_id) VALUES (${session.email}, ${'deal→' + stage}, 'deal', ${id})`;
  return NextResponse.json({ ok: true, deal: rows[0] });
}
