import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

/* Upload de material (metadados; binário vai pro R2 na fase de storage).
   Aceita sessão interna do tenant dono OU token da campanha (portal público). */
export async function POST(req: NextRequest) {
  const { campaign_id, token, kind, title } = await req.json();
  if (!campaign_id || !title) return NextResponse.json({ error: 'campanha e título obrigatórios' }, { status: 400 });

  const session = await getSession();
  if (session) {
    const [ok] = await sql`SELECT 1 FROM campaigns WHERE id = ${campaign_id} AND tenant_id = ${session.tenantId}`;
    if (!ok) return NextResponse.json({ error: 'campanha de outra praça' }, { status: 403 });
  } else {
    if (!token) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
    const [ok] = await sql`SELECT 1 FROM campaigns WHERE id = ${campaign_id} AND token = ${token}`;
    if (!ok) return NextResponse.json({ error: 'token inválido' }, { status: 403 });
  }

  const rows = await sql`
    INSERT INTO materials (campaign_id, kind, title, status, note, uploaded_by)
    VALUES (${campaign_id}, ${kind || 'imagem'}, ${title}, 'aguardando',
            ${session ? 'enviado pela produção' : 'enviado pelo cliente'}, ${session?.email || 'cliente'})
    RETURNING *`;
  return NextResponse.json({ ok: true, material: rows[0] });
}
