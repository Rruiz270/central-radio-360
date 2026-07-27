import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function GET() {
  const session = await requireApi('config');
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'só admin' }, { status: 403 });
  const users = await sql`
    SELECT u.id, u.email, u.name, u.role, u.active, u.totp_secret IS NOT NULL AS has_2fa,
           t.name AS tenant_name, t.slug AS tenant_slug
    FROM users u JOIN tenants t ON t.id = u.tenant_id
    ORDER BY t.is_hq DESC, u.role, u.email`;
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await requireApi('config');
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'só admin' }, { status: 403 });
  const b = await req.json();
  if (!b.email || !b.name || !b.password) {
    return NextResponse.json({ error: 'nome, e-mail e senha são obrigatórios' }, { status: 400 });
  }
  if (String(b.password).length < 8) {
    return NextResponse.json({ error: 'senha precisa de ao menos 8 caracteres' }, { status: 400 });
  }
  const [tenant] = b.tenant_slug
    ? await sql`SELECT id FROM tenants WHERE slug = ${b.tenant_slug}`
    : await sql`SELECT id FROM tenants WHERE id = ${session.tenantId}`;
  if (!tenant) return NextResponse.json({ error: 'praça inválida' }, { status: 400 });
  const hash = await bcrypt.hash(b.password, 10);
  try {
    const rows = await sql`
      INSERT INTO users (tenant_id, email, name, password_hash, role, active)
      VALUES (${tenant.id}, ${String(b.email).toLowerCase()}, ${b.name}, ${hash}, ${b.role || 'afiliada'}, TRUE)
      RETURNING id, email, name, role`;
    await sql`INSERT INTO audit_log (user_email, action, entity, entity_id) VALUES (${session.email}, 'user-create', 'user', ${rows[0].email})`;
    return NextResponse.json({ ok: true, user: rows[0] });
  } catch {
    return NextResponse.json({ error: 'e-mail já cadastrado' }, { status: 409 });
  }
}
