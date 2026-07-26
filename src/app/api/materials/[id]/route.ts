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
  if (!session) {
    // Portal público: exige token válido da campanha dona do material
    if (!token) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
    const [ok] = await sql`
      SELECT m.id FROM materials m JOIN campaigns c ON c.id = m.campaign_id
      WHERE m.id = ${Number(id)} AND c.token = ${token}`;
    if (!ok) return NextResponse.json({ error: 'token inválido' }, { status: 403 });
  }

  const rows = await sql`
    UPDATE materials SET status = ${status}, note = ${note || null}
    WHERE id = ${Number(id)} RETURNING *`;
  if (!rows[0]) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  await sql`INSERT INTO audit_log (user_email, action, entity, entity_id)
    VALUES (${session?.email || 'portal-cliente'}, ${'material→' + status}, 'material', ${id})`;
  return NextResponse.json({ ok: true, material: rows[0] });
}
