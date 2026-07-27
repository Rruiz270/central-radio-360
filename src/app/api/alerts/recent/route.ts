import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function GET() {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  const rows = await sql`
    SELECT id, title, wa_group, status, sent_at FROM alert_log
    WHERE tenant_id = ${session.tenantId}
    ORDER BY sent_at DESC LIMIT 10`;
  return NextResponse.json({ alerts: rows });
}
