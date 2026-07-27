import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { generateSecret, verifyTotp, otpauthUri } from '@/lib/totp';

/* Setup do 2FA do próprio usuário: GET gera segredo provisório; POST confirma com código */
export async function GET() {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  const secret = generateSecret();
  // guarda provisório no settings (chave por usuário) até confirmar
  await sql`
    INSERT INTO settings (key, value, updated_at) VALUES (${'totp_pending_' + session.uid}, ${secret}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
  return NextResponse.json({ secret, uri: otpauthUri(secret, session.email) });
}

export async function POST(req: NextRequest) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  const { code, disable } = await req.json();

  if (disable) {
    await sql`UPDATE users SET totp_secret = NULL WHERE id = ${session.uid}`;
    return NextResponse.json({ ok: true, enabled: false });
  }

  const [row] = await sql`SELECT value FROM settings WHERE key = ${'totp_pending_' + session.uid}`;
  if (!row?.value) return NextResponse.json({ error: 'gere o segredo primeiro' }, { status: 400 });
  if (!verifyTotp(row.value, String(code || ''))) {
    return NextResponse.json({ error: 'código inválido — confira o app autenticador' }, { status: 401 });
  }
  await sql`UPDATE users SET totp_secret = ${row.value} WHERE id = ${session.uid}`;
  await sql`DELETE FROM settings WHERE key = ${'totp_pending_' + session.uid}`;
  await sql`INSERT INTO audit_log (user_email, action) VALUES (${session.email}, '2fa-enabled')`;
  return NextResponse.json({ ok: true, enabled: true });
}
