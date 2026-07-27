import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

/* Importadores CSV — cabeçalhos documentados na tela. Parser simples com suporte a aspas. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',' || c === ';') { row.push(field.trim()); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (field || row.length) { row.push(field.trim()); rows.push(row); row = []; field = ''; }
    } else field += c;
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row); }
  return rows.filter((r) => r.some(Boolean));
}

const num = (s?: string) => parseFloat(String(s || '0').replace(/[R$.\s]/g, '').replace(',', '.')) || 0;

export async function POST(req: NextRequest) {
  const session = await requireApi('config');
  if (!session || !['admin', 'comercial'].includes(session.role)) {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }
  const { entity, csv } = await req.json();
  if (!entity || !csv) return NextResponse.json({ error: 'entidade e csv obrigatórios' }, { status: 400 });

  const rows = parseCsv(csv);
  if (rows.length < 2) return NextResponse.json({ error: 'CSV vazio (precisa de cabeçalho + linhas)' }, { status: 400 });
  const data = rows.slice(1); // ignora cabeçalho
  const t = session.tenantId;
  let count = 0;

  try {
    for (const r of data) {
      if (entity === 'anunciantes') {
        // nome, agencia, limite_credito
        if (!r[0]) continue;
        await sql`INSERT INTO advertisers (tenant_id, name, agency, credit_limit) VALUES (${t}, ${r[0]}, ${r[1] || null}, ${num(r[2])})`;
      } else if (entity === 'propostas') {
        // anunciante, formato, valor, etapa, vendedor
        if (!r[0]) continue;
        const stage = ['Lead', 'Contato', 'Proposta', 'Fechado'].includes(r[3]) ? r[3] : 'Lead';
        await sql`INSERT INTO deals (tenant_id, pipeline, advertiser, descr, value, stage, seller) VALUES (${t}, 'radio', ${r[0]}, ${r[1] || null}, ${num(r[2])}, ${stage}, ${r[4] || null})`;
      } else if (entity === 'pedidos') {
        // anunciante, inicio(AAAA-MM-DD), fim, daypart, insercoes, duracao_seg, valor
        if (!r[0]) continue;
        await sql`INSERT INTO orders (tenant_id, advertiser, flight_start, flight_end, daypart, insertions, duration_sec, value) VALUES (${t}, ${r[0]}, ${r[1] || null}, ${r[2] || null}, ${r[3] || 'Rotativo'}, ${parseInt(r[4], 10) || 0}, ${parseInt(r[5], 10) || 30}, ${num(r[6])})`;
      } else if (entity === 'musicas') {
        // titulo, interprete, cod_categoria, categoria, bpm, ano, origem, intervalo_h
        if (!r[0] || !r[1]) continue;
        await sql`INSERT INTO songs (tenant_id, title, artist1, category_code, category, bpm, year, origin, interval_h) VALUES (${t}, ${r[0]}, ${r[1]}, ${r[2] || '01'}, ${r[3] || 'Sucessos'}, ${parseInt(r[4], 10) || null}, ${parseInt(r[5], 10) || null}, ${r[6] || 'Nacional'}, ${parseInt(r[7], 10) || 3})`;
      } else if (entity === 'campanhas') {
        // anunciante, nome, periodo, contratadas, investimento
        if (!r[0] || !r[1]) continue;
        const token = (r[0] + '-' + r[1]).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).slice(2, 6);
        await sql`INSERT INTO campaigns (tenant_id, advertiser, name, token, period, contracted, investment) VALUES (${t}, ${r[0]}, ${r[1]}, ${token}, ${r[2] || null}, ${parseInt(r[3], 10) || 0}, ${num(r[4])})`;
      } else if (entity === 'equipamentos') {
        // tipo(caixa|veiculo|pendrive|outro), nome, qtd, status, obs
        if (!r[1]) continue;
        await sql`INSERT INTO equipment (tenant_id, kind, name, qty, status, note) VALUES (${t}, ${r[0] || 'outro'}, ${r[1]}, ${parseInt(r[2], 10) || 1}, ${r[3] || 'disponivel'}, ${r[4] || null})`;
      } else if (entity === 'equipe') {
        // nome, funcao, turno, dias, status
        if (!r[0]) continue;
        await sql`INSERT INTO team_schedule (tenant_id, person, role, shift, day, status) VALUES (${t}, ${r[0]}, ${r[1] || 'Campo'}, ${r[2] || 'a definir'}, ${r[3] || 'Seg–Sex'}, ${r[4] || 'escalado'})`;
      } else {
        return NextResponse.json({ error: 'entidade desconhecida' }, { status: 400 });
      }
      count++;
    }
  } catch (e) {
    return NextResponse.json({ error: `Erro na linha ${count + 2}: ${(e as Error).message.slice(0, 120)}`, imported: count }, { status: 422 });
  }

  await sql`INSERT INTO audit_log (user_email, action, entity, entity_id) VALUES (${session.email}, 'csv-import', ${entity}, ${String(count)})`;
  return NextResponse.json({ ok: true, imported: count });
}
