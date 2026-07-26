import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { createSession, COOKIE, type Session } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Informe e-mail e senha.' }, { status: 400 });
  }

  const rows = await sql`
    SELECT u.id, u.email, u.name, u.password_hash, u.role, u.tenant_id, t.name AS tenant_name
    FROM users u JOIN tenants t ON t.id = u.tenant_id
    WHERE lower(u.email) = lower(${email}) AND u.active`;
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ error: 'E-mail ou senha inválidos.' }, { status: 401 });
  }

  const session: Session = {
    uid: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenant_id,
    tenantName: user.tenant_name,
  };
  const token = await createSession(session);
  await sql`INSERT INTO audit_log (user_email, action) VALUES (${user.email}, 'login')`;

  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return res;
}
