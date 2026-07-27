import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function POST(req: NextRequest) {
  const session = await requireApi('rede');
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'só a matriz cria afiliadas' }, { status: 403 });
  const b = await req.json();
  if (!b.city || !b.freq) return NextResponse.json({ error: 'cidade e frequência são obrigatórias' }, { status: 400 });
  const slug = String(b.city).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
  const exists = await sql`SELECT 1 FROM tenants WHERE slug = ${slug}`;
  if (exists.length) return NextResponse.json({ error: 'praça já cadastrada' }, { status: 409 });
  const rows = await sql`
    INSERT INTO tenants (slug, name, freq, city, uf, is_hq, system, migration_phase, listeners, revenue_month, map_x, map_y)
    VALUES (${slug}, ${'Metropolitana ' + b.city}, ${b.freq}, ${b.city}, ${(b.uf || '').toUpperCase().slice(0, 2)},
            FALSE, 'pulsar', 1, 0, 0, ${110 + Math.round((slug.charCodeAt(0) % 9) * 8)}, ${60 + Math.round((slug.length % 9) * 12)})
    RETURNING *`;
  await sql`INSERT INTO audit_log (user_email, action, entity, entity_id) VALUES (${session.email}, 'tenant-create', 'tenant', ${slug})`;
  return NextResponse.json({ ok: true, tenant: rows[0] });
}
