import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function POST(req: NextRequest) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  const { advertiser, descr, value, pipeline, seller, annual_target } = await req.json();
  if (!advertiser) return NextResponse.json({ error: 'anunciante obrigatório' }, { status: 400 });
  const rows = await sql`
    INSERT INTO deals (tenant_id, pipeline, advertiser, descr, value, stage, seller, annual_target)
    VALUES (${session.tenantId}, ${pipeline || 'radio'}, ${advertiser}, ${descr || null}, ${value || 0}, 'Lead',
            ${seller || session.name}, ${annual_target || null})
    RETURNING *`;
  return NextResponse.json({ ok: true, deal: rows[0] });
}
