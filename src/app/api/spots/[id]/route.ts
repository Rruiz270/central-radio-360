import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  const { id } = await params;
  const { break_id } = await req.json();

  if (break_id != null) {
    // Validação ANATEL no servidor: nunca deixar o log estourar sem aviso
    const [brk] = await sql`SELECT id, limit_sec FROM breaks WHERE id = ${break_id} AND tenant_id = ${session.tenantId}`;
    if (!brk) return NextResponse.json({ error: 'break inexistente' }, { status: 404 });
    const [{ used }] = await sql`
      SELECT COALESCE(SUM(duration_sec), 0)::int AS used FROM spots
      WHERE break_id = ${break_id} AND id != ${Number(id)}`;
    const [spot] = await sql`SELECT duration_sec FROM spots WHERE id = ${Number(id)} AND tenant_id = ${session.tenantId}`;
    if (!spot) return NextResponse.json({ error: 'spot inexistente' }, { status: 404 });
    if (used + spot.duration_sec > brk.limit_sec) {
      return NextResponse.json(
        { error: `Estouro ANATEL: break ficaria com ${used + spot.duration_sec}s (limite ${brk.limit_sec}s).` },
        { status: 422 },
      );
    }
  }

  const rows = await sql`
    UPDATE spots SET break_id = ${break_id ?? null}, status = ${break_id != null ? 'no-ar' : 'aprovado'}
    WHERE id = ${Number(id)} AND tenant_id = ${session.tenantId}
    RETURNING *`;
  if (!rows[0]) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true, spot: rows[0] });
}
