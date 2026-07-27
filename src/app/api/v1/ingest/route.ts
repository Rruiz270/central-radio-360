import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const maxDuration = 60;

/* API de ingestão do Conector Pulsar (doc v1 §7 / v2 §8).
   Auth: header x-praca-key (chave por tenant, revogável em Configurações).
   Payload: { type: 'playlog'|'songs', batch_id?: string, items: [...] }
   Idempotência: batch_id já processado é ignorado. */
export async function POST(req: NextRequest) {
  const key = req.headers.get('x-praca-key');
  if (!key) return NextResponse.json({ error: 'header x-praca-key obrigatório' }, { status: 401 });
  const [k] = await sql`SELECT tenant_id FROM ingest_keys WHERE key = ${key} AND active`;
  if (!k) return NextResponse.json({ error: 'chave inválida ou revogada' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.type || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'payload: { type, items[] , batch_id? }' }, { status: 400 });
  }
  if (body.items.length > 500) return NextResponse.json({ error: 'máx. 500 itens por lote' }, { status: 413 });

  // idempotência por batch_id
  if (body.batch_id) {
    const bk = `ingest_batch_${k.tenant_id}_${body.batch_id}`;
    const [done] = await sql`SELECT 1 FROM settings WHERE key = ${bk}`;
    if (done) return NextResponse.json({ ok: true, skipped: 'batch já processado' });
    await sql`INSERT INTO settings (key, value) VALUES (${bk}, 'ok') ON CONFLICT (key) DO NOTHING`;
  }

  let count = 0;
  if (body.type === 'playlog') {
    // item: { played_at: ISO, title, artist?, category?, origin? }
    for (const it of body.items) {
      if (!it.title) continue;
      await sql`
        INSERT INTO play_log (tenant_id, played_at, title, artist, category, origin)
        VALUES (${k.tenant_id}, ${it.played_at || new Date().toISOString()}, ${String(it.title).slice(0, 200)},
                ${it.artist || null}, ${it.category || null}, ${it.origin || 'Pulsar (conector)'})`;
      count++;
    }
  } else if (body.type === 'songs') {
    // item: { title, artist1, category_code?, category?, bpm?, year?, origin?, interval_h? }
    for (const it of body.items) {
      if (!it.title || !it.artist1) continue;
      const [dup] = await sql`
        SELECT 1 FROM songs WHERE tenant_id = ${k.tenant_id} AND title = ${it.title} AND artist1 = ${it.artist1}`;
      if (dup) continue;
      await sql`
        INSERT INTO songs (tenant_id, title, artist1, category_code, category, bpm, year, origin, interval_h)
        VALUES (${k.tenant_id}, ${String(it.title).slice(0, 200)}, ${String(it.artist1).slice(0, 120)},
                ${it.category_code || '01'}, ${it.category || 'Sucessos'}, ${it.bpm || null}, ${it.year || null},
                ${it.origin || 'Nacional'}, ${it.interval_h || 3})`;
      count++;
    }
  } else {
    return NextResponse.json({ error: `type "${body.type}" não suportado (playlog | songs)` }, { status: 400 });
  }

  await sql`UPDATE ingest_keys SET last_used = now() WHERE key = ${key}`;
  return NextResponse.json({ ok: true, type: body.type, ingested: count });
}
