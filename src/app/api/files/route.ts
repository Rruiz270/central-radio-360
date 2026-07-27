import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

const MAX = 8 * 1024 * 1024; // 8 MB por arquivo (spots/artes; vídeo grande vai pro R2 na próxima fase)

/* Upload real: multipart → bytea no Postgres, servido por UUID não-adivinhável */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  const campaignId = Number(form.get('campaign_id') || 0);
  const token = String(form.get('token') || '');
  if (!file || !campaignId) return NextResponse.json({ error: 'arquivo e campanha obrigatórios' }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: 'arquivo acima de 8 MB — use um corte menor por enquanto' }, { status: 413 });

  const session = await getSession();
  if (session) {
    const [ok] = await sql`SELECT 1 FROM campaigns WHERE id = ${campaignId} AND tenant_id = ${session.tenantId}`;
    if (!ok) return NextResponse.json({ error: 'campanha de outra praça' }, { status: 403 });
  } else {
    if (!token) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
    const [ok] = await sql`SELECT 1 FROM campaigns WHERE id = ${campaignId} AND token = ${token}`;
    if (!ok) return NextResponse.json({ error: 'token inválido' }, { status: 403 });
  }

  // MIME allowlist no upload: só áudio, imagem, vídeo e PDF
  const type = file.type || '';
  if (!/^(audio|image|video)\//.test(type) && type !== 'application/pdf') {
    return NextResponse.json({ error: 'formato não permitido — envie áudio, imagem, vídeo ou PDF' }, { status: 415 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const uuid = randomUUID();
  const [f] = await sql`
    INSERT INTO files (uuid, name, mime, size, data)
    VALUES (${uuid}, ${file.name}, ${file.type || 'application/octet-stream'}, ${file.size}, ${buf})
    RETURNING id, uuid`;

  const kind = file.type.startsWith('audio') ? 'audio' : file.type.startsWith('video') ? 'video' : 'imagem';
  const [mat] = await sql`
    INSERT INTO materials (campaign_id, kind, title, status, note, file_id)
    VALUES (${campaignId}, ${kind}, ${file.name}, 'aguardando', ${session ? 'enviado pela produção' : 'enviado pelo cliente'}, ${f.id})
    RETURNING *`;
  return NextResponse.json({ ok: true, material: mat, file_uuid: f.uuid });
}
