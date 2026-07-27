import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

/* Backup completo em JSON (sem hashes de senha nem segredos) — download pelo admin */
export async function GET() {
  const session = await requireApi('config');
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'só admin' }, { status: 403 });

  const tables = [
    'tenants', 'advertisers', 'deals', 'orders', 'breaks', 'spots', 'spot_productions', 'rate_card',
    'invoices', 'receivables', 'activations', 'equipment', 'team_schedule', 'campaigns', 'materials',
    'airing_proofs', 'social_accounts', 'posts', 'trends', 'social_revenue', 'alert_rules', 'alert_log',
    'pautas', 'internal_tasks', 'songs', 'categories', 'play_log', 'competitors', 'audit_log',
  ];
  const dump: Record<string, unknown> = { exported_at: new Date().toISOString(), by: session.email };
  for (const t of tables) {
    dump[t] = await sql.unsafe(`SELECT * FROM ${t} ORDER BY 1`);
  }
  dump.users = await sql`SELECT id, tenant_id, email, name, role, active, created_at FROM users ORDER BY id`;

  await sql`INSERT INTO audit_log (user_email, action) VALUES (${session.email}, 'backup-export')`;
  return new NextResponse(JSON.stringify(dump, null, 1), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="central360-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
