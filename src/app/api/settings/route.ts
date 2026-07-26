import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

const ALLOWED = [
  'openai_api_key', 'anthropic_api_key',
  'whatsapp_token', 'whatsapp_phone_id', 'whatsapp_default_to',
  'meta_app_id', 'meta_app_secret',
  'youtube_client_id', 'youtube_client_secret',
  'tiktok_client_key', 'i10_crm_url', 'i10_crm_key',
];

export async function GET() {
  const session = await requireApi('config');
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'só admin' }, { status: 403 });
  const rows = await sql`SELECT key, value FROM settings`;
  // Mascarar segredos na leitura
  const masked = rows.map((r) => ({
    key: r.key,
    value: r.value && r.value.length > 8 ? r.value.slice(0, 4) + '••••' + r.value.slice(-3) : r.value,
    set: !!r.value,
  }));
  return NextResponse.json({ settings: masked });
}

export async function POST(req: NextRequest) {
  const session = await requireApi('config');
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'só admin' }, { status: 403 });
  const { key, value } = await req.json();
  if (!ALLOWED.includes(key)) return NextResponse.json({ error: 'chave não permitida' }, { status: 400 });
  await sql`
    INSERT INTO settings (key, value, updated_at) VALUES (${key}, ${value}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
  await sql`INSERT INTO audit_log (user_email, action, entity, entity_id) VALUES (${session.email}, 'settings-update', 'settings', ${key})`;
  return NextResponse.json({ ok: true });
}
