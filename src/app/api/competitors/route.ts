import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function POST(req: NextRequest) {
  const session = await requireApi('concorrencia');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: 'nome obrigatório' }, { status: 400 });
  const rows = await sql`
    INSERT INTO competitors (tenant_id, name, dial, city, uf, ig_handle, ig_followers, yt_handle, yt_subs, rb_name, source)
    VALUES (${session.tenantId}, ${b.name}, ${b.dial || null}, ${b.city || session.tenantName}, ${b.uf || null},
            ${b.ig_handle || null}, ${parseInt(b.ig_followers, 10) || 0}, ${b.yt_handle || null},
            ${parseInt(b.yt_subs, 10) || 0}, ${b.rb_name || b.name}, 'manual')
    RETURNING *`;
  return NextResponse.json({ ok: true, competitor: rows[0] });
}
