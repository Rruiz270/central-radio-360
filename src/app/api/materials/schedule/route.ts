import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

/* Fecha o ciclo do material aprovado: Marketing agenda a publicação a partir da Central.
   Cria o post (com a mídia anexada), marca o material como agendado e dá baixa na pendência. */
export async function POST(req: NextRequest) {
  const session = await requireApi('marketing');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const { material_id, body, platforms, scheduled_for } = await req.json();
  if (!material_id || !body || !platforms?.length) {
    return NextResponse.json({ error: 'material, texto e redes são obrigatórios' }, { status: 400 });
  }

  const [mat] = await sql`
    SELECT m.id, m.title, m.file_id, m.scheduled, c.advertiser, c.tenant_id
    FROM materials m JOIN campaigns c ON c.id = m.campaign_id
    WHERE m.id = ${Number(material_id)} AND c.tenant_id = ${session.tenantId} AND m.status = 'aprovado'`;
  if (!mat) return NextResponse.json({ error: 'material não encontrado ou não aprovado' }, { status: 404 });
  if (mat.scheduled) return NextResponse.json({ error: 'este material já foi agendado' }, { status: 409 });

  const [post] = await sql`
    INSERT INTO posts (tenant_id, body, platforms, scheduled_for, owner, status, source, file_id)
    VALUES (${session.tenantId}, ${body}, ${platforms}, ${scheduled_for || null}, ${session.name},
            ${scheduled_for ? 'agendado' : 'publicado'}, 'portal', ${mat.file_id})
    RETURNING *`;
  await sql`UPDATE materials SET scheduled = TRUE WHERE id = ${mat.id}`;
  // dá baixa na pendência criada na aprovação
  await sql`
    UPDATE internal_tasks SET done = TRUE
    WHERE tenant_id = ${session.tenantId} AND NOT done
      AND title LIKE ${'Agendar publicação — ' + mat.advertiser + '%'}`;
  await sql`
    INSERT INTO alert_log (tenant_id, title, wa_group, status)
    VALUES (${session.tenantId}, ${`Publicação agendada: ${mat.advertiser} (${mat.title.slice(0, 40)})`}, 'Digital', 'simulado')`;
  await sql`INSERT INTO audit_log (user_email, action, entity, entity_id) VALUES (${session.email}, 'material-schedule', 'material', ${String(mat.id)})`;
  return NextResponse.json({ ok: true, post });
}
