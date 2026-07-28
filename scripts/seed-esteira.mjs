/* Seed da esteira — uma campanha nacional atravessando PO → PI → PD → OS → CP → PV.
   Idempotente: não roda de novo se já houver PO. Valores são exemplos. */
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url =
  process.env.DATABASE_URL ||
  readFileSync(join(__dirname, '..', '.env.local'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim().replace(/^"|"$/g, '');
const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 25 });

const [{ n }] = await sql`SELECT count(*)::int n FROM purchase_orders`;
if (n > 0) { console.log('esteira já semeada —', n, 'PO(s)'); await sql.end(); process.exit(0); }

const YEAR = new Date().getFullYear();
const DESC = 0.8568282, COM = 0.2;
const MESES = { '9': 0.3, '10': 0.28, '11': 0.24, '12': 0.18 };
const PERIODO = `Setembro à Dezembro ${YEAR}`;
const PROJETO = `Ativação Verão ${YEAR}/${YEAR + 1}`;

async function code(kind) {
  const r = await sql`
    INSERT INTO doc_counters (kind, year, seq) VALUES (${kind}, ${YEAR}, 1)
    ON CONFLICT (kind, year) DO UPDATE SET seq = doc_counters.seq + 1 RETURNING seq`;
  return `${kind}-${YEAR}-${String(r[0].seq).padStart(4, '0')}`;
}

const [hq] = await sql`SELECT id FROM tenants WHERE is_hq LIMIT 1`;
const pracas = await sql`SELECT id, slug, name FROM tenants ORDER BY is_hq DESC, name`;
const alvo = pracas.filter((p) => ['sp', 'litoral', 'ribeirao', 'goiania'].includes(p.slug));

/* ---------------- PO ---------------- */
const poCode = await code('PO');
const [po] = await sql`
  INSERT INTO purchase_orders (tenant_id, code, client, contact, prospect, period, contract_no, revenue, status, created_by)
  VALUES (${hq.id}, ${poCode}, 'SMIRNOFF', 'Otávio Ferraz', 'Ativação verão — 4 praças',
          'Set/2026 – Dez/2026', '220', 486000, 'fechada', 'Bruno')
  RETURNING id`;

const custos = [
  ['Locação de van plotada', '01/09 – 20/12', 'Plotcar Frotas', 1, 14800, '30 dd'],
  ['Equipe de promotores (diária)', 'sáb/dom set–dez', 'Vibe Promo Staff', 96, 280, 'quinzenal'],
  ['Uniformes personalizados', 'até 20/08', 'Brandwear', 24, 189, 'à vista'],
  ['Brindes (kit copo + squeeze)', 'até 25/08', 'Prime Brindes', 6000, 11.9, '50/50'],
  ['Som e caixas ativas', 'set–dez', 'Áudio Rental SP', 4, 2100, '30 dd'],
  ['Gerador + operador', '12 datas', 'GeraTec', 12, 890, '30 dd'],
  ['Produção de vídeo externo', 'out/nov', 'Casa 12 Filmes', 2, 9500, '50/50'],
  ['Alimentação e deslocamento', 'set–dez', 'reembolso interno', 12, 1450, 'reembolso'],
];
let pos = 0;
for (const [item, dates, sup, qty, unit, pay] of custos) {
  await sql`INSERT INTO po_items (po_id, pos, item, dates, supplier, qty, unit_price, payment)
            VALUES (${po.id}, ${pos++}, ${item}, ${dates}, ${sup}, ${qty}, ${unit}, ${pay})`;
}
for (const [area, quem] of [['diretoria', 'Bruno'], ['financeiro', 'Cláudia'], ['rh', 'Cláudia'], ['operacoes', 'Marcos']]) {
  await sql`INSERT INTO po_approvals (po_id, area, approved, approved_by, approved_at)
            VALUES (${po.id}, ${area}, TRUE, ${quem}, now())`;
}

/* ---------------- PI ---------------- */
const piCode = await code('PI');
const [pi] = await sql`
  INSERT INTO insertion_orders (tenant_id, code, po_id, client, agency, executive, planner, period, status, pieces, created_by)
  VALUES (${hq.id}, ${piCode}, ${po.id}, 'SMIRNOFF', 'ALMAP BBDO', 'BRUNO', 'OTAVIO',
          ${PERIODO}, 'distribuida',
          ${sql.json(['Smirnoff Verão 30"', 'Smirnoff Verão 15"', 'Testemunhal Chupim'])}, 'Bruno')
  RETURNING id`;

const itens = [
  ['radio', 'opec', 'Comercial (horário) 30"', 30, 240, 5460],
  ['radio', 'opec', 'Comercial (horário) 15"', 15, 120, 3200],
  ['radio', 'chupim', 'Testemunhal — Chupim', 60, 24, 8900],
  ['radio', 'artistico', 'Patrocínio de programa', 30, 60, 4100],
  ['agencia', 'operacoes', 'Pit stop (ativação)', 0, 12, 18500],
  ['agencia', 'promocao', 'Promoção / sorteio', 0, 8, 9600],
  ['agencia', 'cobertura', 'Cobertura de evento', 0, 6, 7400],
  ['agencia', 'internet', 'Internet (posts/stories)', 0, 40, 1250],
];
pos = 0;
for (const [scope, dept, item, sec, qty, rate] of itens) {
  await sql`INSERT INTO io_items (pi_id, pos, scope, dept, item, seconds, qty, rate, discount, commission)
            VALUES (${pi.id}, ${pos++}, ${scope}, ${dept}, ${item}, ${sec}, ${qty}, ${rate}, ${DESC}, ${COM})`;
}

/* ---------------- PD ---------------- */
const pdCode = await code('PD');
const [pd] = await sql`
  INSERT INTO distributions (code, pi_id, project, payment, status, authorized_by, authorized_at)
  VALUES (${pdCode}, ${pi.id}, ${PROJETO}, '30/60/90 dd', 'autorizada', 'Bruno', now())
  RETURNING id`;

/* fator por praça — rede nacional tem tabela diferente em cada mercado */
const fator = { sp: 1, litoral: 0.48, ribeirao: 0.38, goiania: 0.35 };
for (const p of alvo) {
  const f = fator[p.slug] ?? 0.4;
  for (const [scope, dept, item, sec, qty, rate] of itens) {
    const q = p.slug === 'sp' ? qty : Math.max(1, Math.round(qty * 0.4));
    await sql`
      INSERT INTO distribution_items (pd_id, tenant_id, scope, dept, item, seconds, qty, rate, discount, commission, months)
      VALUES (${pd.id}, ${p.id}, 'praca', ${dept}, ${item}, ${sec}, ${q},
              ${Math.round(rate * f * 100) / 100}, ${DESC}, ${COM}, ${sql.json(MESES)})`;
  }
}

/* ---------------- OS ---------------- */
const UNIT = {
  opec: 'inserções', operacoes: 'ações', artistico: 'testemunhais', promocao: 'sorteios',
  internet: 'posts', chupim: 'inserções', cobertura: 'dias',
};
const grupos = await sql`
  SELECT tenant_id, dept, sum(qty)::int qty FROM distribution_items
  WHERE pd_id = ${pd.id} GROUP BY tenant_id, dept ORDER BY tenant_id, dept`;

const osIds = [];
for (const g of grupos) {
  const c = await code('OS');
  const [os] = await sql`
    INSERT INTO service_orders (tenant_id, code, pi_id, pd_id, dept, client, agency, executive, planner,
                                period, status, bought, unit, fields)
    VALUES (${g.tenant_id}, ${c}, ${pi.id}, ${pd.id}, ${g.dept}, 'SMIRNOFF', 'ALMAP BBDO', 'BRUNO', 'OTAVIO',
            ${PERIODO}, 'em_execucao', ${g.qty}, ${UNIT[g.dept] || 'un.'}, ${sql.json({})})
    RETURNING id, dept, tenant_id`;
  await sql`UPDATE distribution_items SET os_id = ${os.id}
            WHERE pd_id = ${pd.id} AND tenant_id = ${g.tenant_id} AND dept = ${g.dept}`;
  osIds.push(os);
}

/* mapa de inserções da O.S. de OPEC da matriz */
const opecSP = osIds.find((o) => o.dept === 'opec' && o.tenant_id === hq.id);
if (opecSP) {
  for (const dia of [2, 4, 6, 9, 11, 13, 16, 18, 20, 23, 25, 27, 30]) {
    await sql`INSERT INTO os_map (os_id, line, month, day, qty) VALUES (${opecSP.id}, 'Peça A · 30"', 9, ${dia}, 2)
              ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO os_map (os_id, line, month, day, qty) VALUES (${opecSP.id}, 'Peça B · 15"', 9, ${dia}, 1)
              ON CONFLICT DO NOTHING`;
  }
}

/* fichas de ação da O.S. de Operações do Litoral — o coração do off-line */
const litoral = pracas.find((p) => p.slug === 'litoral');
const opsLit = osIds.find((o) => o.dept === 'operacoes' && o.tenant_id === litoral?.id);
if (opsLit) {
  const acoes = [
    [`${YEAR}-09-12`, '14h – 20h', 'Praia Grande — Av. Presidente Costa e Silva',
     'Sampling de Smirnoff Ice e captação de leads para o sorteio.',
     'Van plotada com som; 2 promotores abordam, 1 opera o QR de cadastro; brinde mediante cadastro.',
     '4 promotores + 1 líder de equipe + 1 motorista', '2 caixas ativas, gerador, tenda 3×3',
     'Camiseta Smirnoff + bermuda branca', 'Sim — van Kombi plotada', 'Copo térmico (300 un.)',
     'Obrigatório — 20 fotos + 3 vídeos', 'Litoral SP', 'Confirmar alvará com a prefeitura até 05/09.', true],
    [`${YEAR}-09-19`, '15h – 21h', 'Guarujá — Praia da Enseada',
     'Ativação com locução ao vivo e sorteio na hora.',
     'Transmissão da 98.5 na van; locutor faz 4 entradas ao vivo; sorteio às 18h.',
     '4 promotores + 1 líder + locutor', '2 caixas ativas, mesa, microfone sem fio',
     'Camiseta Smirnoff + bermuda branca', 'Sim — van Kombi plotada', 'Kit copo + squeeze (500 un.)',
     'Obrigatório', 'Litoral SP', 'Praça pega FM — sem necessidade de pendrive.', false],
  ];
  let seq = 1;
  for (const a of acoes) {
    await sql`
      INSERT INTO os_actions (os_id, seq, action_date, action_time, place, goal, mechanics, team, equipment,
                              uniform, car, gifts, photos, delivery_city, notes, done)
      VALUES (${opsLit.id}, ${seq++}, ${a[0]}, ${a[1]}, ${a[2]}, ${a[3]}, ${a[4]}, ${a[5]}, ${a[6]},
              ${a[7]}, ${a[8]}, ${a[9]}, ${a[10]}, ${a[11]}, ${a[12]}, ${a[13]})`;
  }
}

/* campos específicos de alguns departamentos */
for (const o of osIds) {
  if (o.dept === 'chupim') {
    await sql`UPDATE service_orders SET fields = ${sql.json({
      chamadas: '2 por edição', tempo_testemunhal: '60"', qrcode: 'Sim — cadastro do sorteio',
      testemunhal: 'Smirnoff Ice — o verão começa agora na Metropolitana.',
      assinatura: 'Chupim. Uma apresentação Smirnoff.',
    })} WHERE id = ${o.id}`;
  }
  if (o.dept === 'internet') {
    await sql`UPDATE service_orders SET fields = ${sql.json({
      plataformas: 'Instagram, Facebook, Hotsite', periodo_campanha: 'Setembro – Dezembro',
      artes: 'Fornecidas pela agência', pos_venda: 'Relatório mensal',
    })} WHERE id = ${o.id}`;
  }
  if (o.dept === 'promocao') {
    await sql`UPDATE service_orders SET fields = ${sql.json({
      praca_entrega: 'Litoral SP', sorteios: '8', mecanica: 'Cadastro por QR + sorteio ao vivo',
      premio: 'Kit verão + ingresso', regulamento: 'SP/2026/0912',
    })} WHERE id = ${o.id}`;
  }
}

/* ---------------- CP ---------------- */
const pecas = [
  ['Smirnoff Verão 30"', 'audio', 30, 5, 'aprovado', 'Estúdio Metrô'],
  ['Smirnoff Verão 15"', 'audio', 15, 5, 'aprovado', 'Estúdio Metrô'],
  ['Testemunhal Chupim', 'texto', 60, 4, 'aguardando', 'Redação'],
  ['Arte stories verão', 'imagem', 0, 3, 'ajuste', 'Design i10'],
];
for (const [peca, kind, sec, step, cs, owner] of pecas) {
  const c = await code('CP');
  await sql`
    INSERT INTO productions (tenant_id, code, pi_id, os_id, piece, kind, seconds, step, owner, client_status)
    VALUES (${hq.id}, ${c}, ${pi.id}, ${opecSP ? opecSP.id : null}::int, ${peca}, ${kind}, ${sec}, ${step}, ${owner}, ${cs})`;
}

const totais = await sql`
  SELECT count(*)::int os, (SELECT count(*)::int FROM distribution_items WHERE pd_id = ${pd.id}) linhas
  FROM service_orders WHERE pd_id = ${pd.id}`;

console.log(`✓ esteira semeada: ${poCode} → ${piCode} → ${pdCode} → ${totais[0].os} O.S. (${totais[0].linhas} linhas de PD) → 4 CP`);
console.log('  praças:', alvo.map((p) => p.name).join(', '));
await sql.end();
