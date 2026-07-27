import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

/* Aprovação de material — usada pelo time interno e pelo portal do cliente (via token) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status, note, token } = await req.json();
  if (!['aprovado', 'ajuste', 'reprovado', 'aguardando'].includes(status)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 });
  }

  const session = await getSession();
  if (session) {
    // Interno: o material precisa pertencer a uma campanha do tenant do usuário
    const [ok] = await sql`
      SELECT m.id FROM materials m JOIN campaigns c ON c.id = m.campaign_id
      WHERE m.id = ${Number(id)} AND c.tenant_id = ${session.tenantId}`;
    if (!ok) return NextResponse.json({ error: 'material de outra praça' }, { status: 403 });
  } else {
    // Portal público: exige token válido da campanha dona do material
    if (!token) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
    const [ok] = await sql`
      SELECT m.id FROM materials m JOIN campaigns c ON c.id = m.campaign_id
      WHERE m.id = ${Number(id)} AND c.token = ${token}`;
    if (!ok) return NextResponse.json({ error: 'token inválido' }, { status: 403 });
  }

  const [before] = await sql`SELECT status FROM materials WHERE id = ${Number(id)}`;
  const rows = await sql`
    UPDATE materials SET status = ${status}, note = ${note || null}
    WHERE id = ${Number(id)} RETURNING *`;
  if (!rows[0]) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  const mat = rows[0];
  await sql`INSERT INTO audit_log (user_email, action, entity, entity_id)
    VALUES (${session?.email || 'portal-cliente'}, ${'material→' + status}, 'material', ${id})`;

  /* Gatilho de aprovação (traffic-aware): cliente aprovou →
     - áudio: vira SPOT no pool do Tráfego & Log, pro tráfego arrastar pro break (definir quando entra no ar)
     - vídeo/imagem: pendência pro Digital agendar a publicação
     Dispara só na transição para "aprovado" (não repete em re-aprovação). */
  let triggered: string | null = null;
  if (status === 'aprovado' && before?.status !== 'aprovado') {
    const [camp] = await sql`SELECT tenant_id, advertiser, name FROM campaigns WHERE id = ${mat.campaign_id}`;
    if (camp) {
      // Notificação a quem subiu o material: aprovação fecha o ciclo de quem produziu
      if (mat.uploaded_by && mat.uploaded_by !== 'cliente') {
        await sql`
          INSERT INTO alert_log (tenant_id, title, wa_group, status)
          VALUES (${camp.tenant_id},
                  ${`Seu material foi aprovado pelo cliente: ${String(mat.title).slice(0, 40)} (${camp.advertiser}) → ${mat.uploaded_by}`},
                  'Produção', 'simulado')`;
      }
      if (mat.kind === 'audio') {
        await sql`
          INSERT INTO spots (tenant_id, break_id, advertiser, duration_sec, status, position)
          VALUES (${camp.tenant_id}, NULL, ${camp.advertiser}, 30, 'aprovado', 99)`;
        await sql`
          INSERT INTO alert_log (tenant_id, title, wa_group, status)
          VALUES (${camp.tenant_id}, ${`Spot aprovado pelo cliente: ${camp.advertiser} — alocar na grade`}, 'Tráfego', 'simulado')`;
        await sql`
          INSERT INTO internal_tasks (tenant_id, title, kind, detail, done)
          VALUES (${camp.tenant_id}, ${`Agendar veiculação — ${camp.advertiser} (${mat.title})`}, 'pendencia', 'spot no pool do Tráfego & Log', FALSE)`;
        triggered = 'trafego';
      } else {
        await sql`
          INSERT INTO alert_log (tenant_id, title, wa_group, status)
          VALUES (${camp.tenant_id}, ${`Material aprovado: ${camp.advertiser} (${mat.kind}) — agendar publicação`}, 'Digital', 'simulado')`;
        await sql`
          INSERT INTO internal_tasks (tenant_id, title, kind, detail, done)
          VALUES (${camp.tenant_id}, ${`Agendar publicação — ${camp.advertiser} (${mat.title})`}, 'pendencia', 'material aprovado no portal', FALSE)`;
        triggered = 'digital';
      }
    }
  }
  return NextResponse.json({ ok: true, material: mat, triggered });
}
