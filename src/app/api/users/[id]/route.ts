import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi('config');
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'só admin' }, { status: 403 });
  const { id } = await params;
  const b = await req.json();
  const uid = Number(id);

  if (typeof b.active === 'boolean') {
    if (uid === session.uid && !b.active) return NextResponse.json({ error: 'não desative a si mesmo' }, { status: 400 });
    await sql`UPDATE users SET active = ${b.active} WHERE id = ${uid}`;
    await sql`INSERT INTO audit_log (user_email, action, entity, entity_id) VALUES (${session.email}, ${b.active ? 'user-activate' : 'user-deactivate'}, 'user', ${id})`;
  }
  if (b.password) {
    if (String(b.password).length < 8) return NextResponse.json({ error: 'senha precisa de ao menos 8 caracteres' }, { status: 400 });
    const hash = await bcrypt.hash(b.password, 10);
    await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${uid}`;
    await sql`INSERT INTO audit_log (user_email, action, entity, entity_id) VALUES (${session.email}, 'user-password-reset', 'user', ${id})`;
  }
  if (b.role) {
    await sql`UPDATE users SET role = ${b.role} WHERE id = ${uid}`;
  }
  if (b.reset_2fa) {
    await sql`UPDATE users SET totp_secret = NULL WHERE id = ${uid}`;
    await sql`INSERT INTO audit_log (user_email, action, entity, entity_id) VALUES (${session.email}, 'user-2fa-reset', 'user', ${id})`;
  }
  return NextResponse.json({ ok: true });
}
