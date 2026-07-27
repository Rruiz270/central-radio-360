import { sql } from './db';
import { sendWhatsApp } from './whatsapp';

/* Guarda de execução: evita rodar o mesmo job mais de 1x na janela (execução oportunista) */
export async function shouldRun(job: string, minMinutes: number): Promise<boolean> {
  const [last] = await sql`SELECT ran_at FROM cron_runs WHERE job = ${job} ORDER BY ran_at DESC LIMIT 1`;
  if (last && Date.now() - new Date(last.ran_at).getTime() < minMinutes * 60_000) return false;
  return true;
}
export async function logRun(job: string, ok: boolean, detail: string) {
  await sql`INSERT INTO cron_runs (job, ok, detail) VALUES (${job}, ${ok}, ${detail.slice(0, 400)})`;
}

/* ---- RADAR: scraping real do Google News RSS (público, sem chave) ---- */
export async function runRadar(): Promise<string> {
  const queries = [
    'educação municipal prefeitura',
    'música sertanejo lançamento',
    'famosos celebridades Brasil',
  ];
  let inserted = 0;
  const [hq] = await sql`SELECT id FROM tenants WHERE is_hq LIMIT 1`;

  for (const q of queries) {
    let xml = '';
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Central360/1.0' }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      xml = await res.text();
    } catch { continue; }
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 4);
    for (const m of items) {
      const title = (m[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] || '')
        .replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();
      const source = (m[1].match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || 'Google News').trim();
      if (!title || title.length < 12) continue;
      const clean = title.replace(/\s+-\s+[^-]+$/, ''); // remove " - Veículo" do fim
      const [dup] = await sql`SELECT 1 FROM pautas WHERE tenant_id = ${hq.id} AND title = ${clean.slice(0, 200)}`;
      if (dup) continue;
      await sql`
        INSERT INTO pautas (tenant_id, title, editoria, status, source, meta)
        VALUES (${hq.id}, ${clean.slice(0, 200)}, ${q.includes('educação') ? 'Educação' : q.includes('sertanejo') ? 'Música' : 'Entretenimento'},
                'apurando', 'radar', ${source + ' · coleta automática'})`;
      inserted++;
    }
  }
  // mantém o radar enxuto: só as 12 mais recentes
  await sql`
    DELETE FROM pautas WHERE source = 'radar' AND id NOT IN (
      SELECT id FROM pautas WHERE source = 'radar' ORDER BY id DESC LIMIT 12)`;
  if (inserted > 0) {
    await sql`INSERT INTO alert_log (tenant_id, title, wa_group, status)
      VALUES (${hq.id}, ${`Radar: ${inserted} pautas novas coletadas`}, 'Redação', 'simulado')`;
  }
  return `${inserted} pautas novas`;
}

/* ---- PUBLICADOR: posts agendados cuja hora chegou ---- */
export async function runPublisher(): Promise<string> {
  const due = await sql`
    UPDATE posts SET status = 'publicado'
    WHERE status = 'agendado' AND scheduled_for IS NOT NULL AND scheduled_for <= now()
    RETURNING id, tenant_id, body, platforms`;
  for (const p of due) {
    await sql`INSERT INTO alert_log (tenant_id, title, wa_group, status)
      VALUES (${p.tenant_id}, ${'Post publicado: ' + String(p.body).slice(0, 40) + '…'}, 'Digital', 'simulado')`;
  }
  return `${due.length} posts publicados`;
}

/* ---- COBRANÇA: faturas vencendo em 3 dias ou vencidas (1 alerta/dia por fatura) ---- */
export async function runCobranca(): Promise<string> {
  const due = await sql`
    SELECT i.* FROM invoices i
    WHERE i.status IN ('aberta', 'vencida') AND i.due_date IS NOT NULL
      AND i.due_date <= (CURRENT_DATE + INTERVAL '3 days')
      AND NOT EXISTS (
        SELECT 1 FROM alert_log a
        WHERE a.tenant_id = i.tenant_id AND a.title = 'Cobrança: ' || i.client
          AND a.sent_at > now() - INTERVAL '20 hours')`;
  for (const i of due) {
    const overdue = new Date(i.due_date) < new Date();
    const msg = overdue
      ? `Fatura de ${i.client} (R$ ${Number(i.value).toLocaleString('pt-BR')}) está vencida — régua de cobrança acionada.`
      : `Fatura de ${i.client} vence em breve — cobrar cliente.`;
    await sendWhatsApp(msg);
    await sql`INSERT INTO alert_log (tenant_id, title, wa_group, status)
      VALUES (${i.tenant_id}, ${'Cobrança: ' + i.client}, 'Financeiro', 'simulado')`;
    if (overdue && i.status !== 'vencida') {
      await sql`UPDATE invoices SET status = 'vencida' WHERE id = ${i.id}`;
    }
  }
  return `${due.length} cobranças`;
}

/* ---- ESTOQUE: pendrive abaixo do mínimo (1 alerta/dia) ---- */
export async function runEstoque(): Promise<string> {
  const low = await sql`
    SELECT e.* FROM equipment e
    WHERE e.kind = 'pendrive' AND e.qty < 4
      AND NOT EXISTS (
        SELECT 1 FROM alert_log a
        WHERE a.tenant_id = e.tenant_id AND a.title LIKE 'Estoque de pendrive baixo%'
          AND a.sent_at > now() - INTERVAL '20 hours')`;
  for (const e of low) {
    await sql`INSERT INTO alert_log (tenant_id, title, wa_group, status)
      VALUES (${e.tenant_id}, ${`Estoque de pendrive baixo (${e.qty})`}, 'Produção', 'simulado')`;
  }
  return `${low.length} alertas de estoque`;
}

/* ---- MERCADO: APIs públicas — IBGE (população) + Radio-Browser (popularidade digital) ---- */
export async function runMarket(): Promise<string> {
  let notes: string[] = [];

  // População por praça (IBGE SIDRA t/6579 — pública)
  const tenants = await sql`SELECT id, city, ibge_code FROM tenants WHERE ibge_code IS NOT NULL`;
  let pops = 0;
  for (const t of tenants) {
    try {
      const r = await fetch(`https://apisidra.ibge.gov.br/values/t/6579/n6/${t.ibge_code}/v/9324/p/last`, {
        headers: { Accept: 'application/json' },
      });
      if (!r.ok) continue;
      const data = await r.json();
      const v = parseInt(data?.[1]?.V, 10);
      if (v > 0) { await sql`UPDATE tenants SET population = ${v} WHERE id = ${t.id}`; pops++; }
    } catch { /* segue */ }
  }
  notes.push(`IBGE: ${pops} praças`);

  // Radio-Browser (diretório público de rádios: cliques/votos = proxy de popularidade digital)
  const comps = await sql`SELECT id, name, rb_name, city FROM competitors`;
  let rb = 0;
  for (const c of comps) {
    try {
      const q = encodeURIComponent(c.rb_name || c.name);
      const r = await fetch(`https://de1.api.radio-browser.info/json/stations/search?name=${q}&country=Brazil&limit=1&order=clickcount&reverse=true`, {
        headers: { 'User-Agent': 'Central360/1.0' },
      });
      if (!r.ok) continue;
      const [st] = await r.json();
      if (st) {
        await sql`UPDATE competitors SET rb_clicks = ${st.clickcount || 0}, rb_votes = ${st.votes || 0}, updated_at = now() WHERE id = ${c.id}`;
        rb++;
      }
    } catch { /* segue */ }
  }
  // Metropolitana também (guardado em settings)
  try {
    const r = await fetch(`https://de1.api.radio-browser.info/json/stations/search?name=${encodeURIComponent('Metropolitana FM')}&country=Brazil&limit=1&order=clickcount&reverse=true`, {
      headers: { 'User-Agent': 'Central360/1.0' },
    });
    if (r.ok) {
      const [st] = await r.json();
      if (st) {
        await sql`INSERT INTO settings (key, value, updated_at) VALUES ('rb_metropolitana', ${JSON.stringify({ clicks: st.clickcount || 0, votes: st.votes || 0, name: st.name })}, now())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
      }
    }
  } catch { /* segue */ }
  notes.push(`Radio-Browser: ${rb} concorrentes`);
  return notes.join(' · ');
}
