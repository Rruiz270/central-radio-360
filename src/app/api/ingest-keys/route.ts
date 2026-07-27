import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function GET() {
  const session = await requireApi('config');
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'só admin' }, { status: 403 });
  const keys = await sql`
    SELECT k.id, k.key, k.label, k.active, k.last_used, t.name AS tenant_name
    FROM ingest_keys k JOIN tenants t ON t.id = k.tenant_id ORDER BY k.id`;
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const session = await requireApi('config');
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'só admin' }, { status: 403 });
  const { tenant_slug, label } = await req.json();
  const [tenant] = tenant_slug
    ? await sql`SELECT id, name FROM tenants WHERE slug = ${tenant_slug}`
    : await sql`SELECT id, name FROM tenants WHERE id = ${session.tenantId}`;
  if (!tenant) return NextResponse.json({ error: 'praça inválida' }, { status: 400 });
  const key = 'ing_' + randomBytes(18).toString('hex');
  const rows = await sql`
    INSERT INTO ingest_keys (tenant_id, key, label) VALUES (${tenant.id}, ${key}, ${label || 'Conector Pulsar — ' + tenant.name})
    RETURNING id, key, label`;
  return NextResponse.json({ ok: true, key: rows[0] });
}

export async function PATCH(req: NextRequest) {
  const session = await requireApi('config');
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'só admin' }, { status: 403 });
  const { id, active } = await req.json();
  await sql`UPDATE ingest_keys SET active = ${!!active} WHERE id = ${Number(id)}`;
  return NextResponse.json({ ok: true });
}
