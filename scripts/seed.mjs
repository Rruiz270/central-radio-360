/* Central 360 — seed com os dados do mockup aprovado. Idempotente: só roda se tenants vazio. */
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL || readFileSync(join(__dirname, '..', '.env.local'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim();
const sql = postgres(url, { prepare: false, max: 1 });

const existing = await sql`SELECT count(*)::int n FROM tenants`;
if (existing[0].n > 0 && !process.argv.includes('--force')) {
  console.log('Seed já aplicado (tenants não vazio). Use --force para complementar.');
  await sql.end();
  process.exit(0);
}

/* ---- Tenants (rede) ---- */
const tenants = await sql`
  INSERT INTO tenants (slug, name, freq, city, uf, is_hq, system, migration_phase, listeners, revenue_month, map_x, map_y) VALUES
  ('sp',        'Metropolitana — Matriz', '98.5',  'São Paulo',      'SP', TRUE,  'c360',     6, 1200000, 486000, 137, 150),
  ('rio',       'Metropolitana Rio',      '101.9', 'Rio de Janeiro', 'RJ', FALSE, 'c360',     5, 210000,  92000,  152, 142),
  ('bh',        'Metropolitana BH',       '99.7',  'Belo Horizonte', 'MG', FALSE, 'c360',     4, 168000,  74000,  147, 127),
  ('recife',    'Metropolitana Recife',   '100.1', 'Recife',         'PE', FALSE, 'migrando', 3, 142000,  61000,  191, 68),
  ('fortaleza', 'Metropolitana Fortaleza','96.3',  'Fortaleza',      'CE', FALSE, 'pulsar',   1, 120000,  48000,  170, 46),
  ('curitiba',  'Metropolitana Curitiba', '102.5', 'Curitiba',       'PR', FALSE, 'c360',     6, 134000,  57000,  125, 168)
  RETURNING id, slug`;
const T = Object.fromEntries(tenants.map(t => [t.slug, t.id]));
const HQ = T.sp;

/* ---- Usuários (senha padrão por perfil) ---- */
const hash = await bcrypt.hash('metro360', 10);
await sql`
  INSERT INTO users (tenant_id, email, name, password_hash, role) VALUES
  (${HQ}, 'admin@metropolitana.fm',      'Raphael Ruiz',    ${hash}, 'admin'),
  (${HQ}, 'comercial@metropolitana.fm',  'Bruno Costa',     ${hash}, 'comercial'),
  (${HQ}, 'programacao@metropolitana.fm','João Locutor',    ${hash}, 'programacao'),
  (${HQ}, 'jornalismo@metropolitana.fm', 'Ana Reporter',    ${hash}, 'jornalismo'),
  (${HQ}, 'marketing@metropolitana.fm',  'Marina Social',   ${hash}, 'marketing'),
  (${HQ}, 'operacoes@metropolitana.fm',  'Carla Campo',     ${hash}, 'operacoes'),
  (${T.rio}, 'rio@metropolitana.fm',     'Gestor Rio',      ${hash}, 'afiliada')`;

/* ---- Programação ---- */
await sql`
  INSERT INTO categories (tenant_id, code, name, weight, interval_h, rotation, active) VALUES
  (${HQ}, '01', 'Sucessos',  'Alto',  2, '3–4', TRUE),
  (${HQ}, '03', 'Novidades', 'Médio', 3, '1–2', TRUE),
  (${HQ}, '07', 'Clássicos', 'Baixo', 4, '1',   TRUE),
  (${HQ}, '11', 'Depósito',  NULL,    NULL, NULL, FALSE)`;
await sql`
  INSERT INTO songs (tenant_id, title, artist1, category_code, category, rhythm, bpm, year, origin, interval_h) VALUES
  (${HQ}, 'Meu Erro',       'Chimarruts',            '11', 'Depósito',  'R1 · 01', 98,  2005, 'Nacional', 3),
  (${HQ}, 'Sunday Morning', 'Maroon 5',              '01', 'Sucessos',  'R2 · 02', 104, 2004, 'Internacional', 2),
  (${HQ}, 'Evidências',     'Chitãozinho & Xororó',  '07', 'Clássicos', 'R1 · 03', 92,  1990, 'Nacional', 4),
  (${HQ}, 'Envolver',       'Anitta',                '03', 'Novidades', 'R3 · 01', 110, 2022, 'Nacional', 3)`;
await sql`
  INSERT INTO play_log (tenant_id, played_at, title, artist, category, origin) VALUES
  (${HQ}, now() - interval '4 minutes',  'Meu Erro', 'Chimarruts', 'Depósito', 'Automático'),
  (${HQ}, now() - interval '8 minutes',  'Sunday Morning', 'Maroon 5', 'Sucessos', 'Automático'),
  (${HQ}, now() - interval '12 minutes', 'Spot — Casas Bahia', 'Comercial 30"', 'Comercial', 'Tráfego (auto)'),
  (${HQ}, now() - interval '15 minutes', 'Evidências', 'Chitãozinho & Xororó', 'Clássicos', 'Manual (locutor)')`;

/* ---- Comercial: funil rádio + agência ---- */
await sql`
  INSERT INTO deals (tenant_id, pipeline, advertiser, descr, value, stage, seller, annual_target, realized) VALUES
  (${HQ}, 'radio', 'Óticas Carol',      'spots 30"',          18000,  'Lead',     'Bruno', NULL, 0),
  (${HQ}, 'radio', 'Auto Posto BR',     'patrocínio',         30000,  'Lead',     'Bruno', NULL, 0),
  (${HQ}, 'radio', 'Faculdade Uni',     'campanha vestibular',42000,  'Lead',     'Carla', NULL, 0),
  (${HQ}, 'radio', 'Supermercados Dia', 'spots + ação',       55000,  'Contato',  'Bruno', 300000, 95000),
  (${HQ}, 'radio', 'Guaraná',           'rede',               48000,  'Contato',  'Bruno', 480000, 210000),
  (${HQ}, 'radio', 'Nescau',            'sampling',           31000,  'Proposta', 'Carla', NULL, 0),
  (${HQ}, 'radio', 'Shopping RioMar',   'ativação',           26000,  'Proposta', 'Carla', NULL, 0),
  (${HQ}, 'radio', 'Casas Bahia',       'spots 30"',          120000, 'Fechado',  'Bruno', 1200000, 840000),
  (${HQ}, 'agencia', 'Rede de Farmácias','blitz PDV',         24000,  'Lead',       'Carla', NULL, 0),
  (${HQ}, 'agencia', 'Cervejaria local', 'evento',            38000,  'Lead',       'Bruno', NULL, 0),
  (${HQ}, 'agencia', 'Guaraná — Fortaleza','arena',           48000,  'Briefing',   'Bruno', NULL, 0),
  (${HQ}, 'agencia', 'Nescau — Curitiba','sampling',          31000,  'Briefing',   'Carla', NULL, 0),
  (${HQ}, 'agencia', 'Concessionária',   'test drive',        52000,  'Proposta',   'Bruno', NULL, 0),
  (${HQ}, 'agencia', 'Shopping RioMar',  'ativação verão',    26000,  'Negociação', 'Carla', NULL, 0),
  (${HQ}, 'agencia', 'Blitz Guarujá',    'praia',             19000,  'Ganho',      'Carla', NULL, 0)`;

await sql`
  INSERT INTO orders (tenant_id, advertiser, agency, flight_start, flight_end, daypart, insertions, duration_sec, value, sale_type) VALUES
  (${HQ}, 'Casas Bahia', NULL, '2026-07-25', '2026-08-10', 'Manhã (6–10h)', 180, 30, 120000, 'Dinheiro'),
  (${HQ}, 'Guaraná', 'AlmapBBDO', '2026-07-20', '2026-08-20', 'Drive (17–20h)', 120, 30, 48000, 'Dinheiro')`;

/* ---- Breaks + spots ---- */
const brks = await sql`
  INSERT INTO breaks (tenant_id, hour, limit_sec) VALUES
  (${HQ}, 7, 180), (${HQ}, 12, 180), (${HQ}, 18, 180)
  RETURNING id, hour`;
const B = Object.fromEntries(brks.map(b => [b.hour, b.id]));
await sql`
  INSERT INTO spots (tenant_id, break_id, advertiser, duration_sec, status, position) VALUES
  (${HQ}, NULL,   'Guaraná',        30, 'aprovado', 0),
  (${HQ}, NULL,   'Nescau',         30, 'aprovado', 1),
  (${HQ}, NULL,   'Óticas Carol',   15, 'aprovado', 2),
  (${HQ}, NULL,   'Auto Posto BR',  30, 'aprovado', 3),
  (${HQ}, NULL,   'Faculdade Uni',  15, 'aprovado', 4),
  (${HQ}, ${B[7]},  'Casas Bahia',  30, 'no-ar', 0),
  (${HQ}, ${B[7]},  'Magazine',     30, 'no-ar', 1),
  (${HQ}, ${B[7]},  'Padaria SP',   15, 'no-ar', 2),
  (${HQ}, ${B[12]}, 'Institucional',60, 'no-ar', 0),
  (${HQ}, ${B[12]}, 'Casas Bahia',  30, 'no-ar', 1),
  (${HQ}, ${B[12]}, 'Concessionária',45,'no-ar', 2),
  (${HQ}, ${B[18]}, 'Shopping RioMar',30,'no-ar', 0)`;

await sql`
  INSERT INTO spot_productions (tenant_id, client, duration, step, owner, due) VALUES
  (${HQ}, 'Casas Bahia — Ofertas', '30"', 'Gravação',  'Estúdio 1', 'Hoje 16h'),
  (${HQ}, 'Guaraná — Verão',       '15"', 'Roteiro',   'Redação criativa', 'Amanhã'),
  (${HQ}, 'Shopping RioMar',       '45"', 'No ar',     'Tráfego', '✓')`;

await sql`
  INSERT INTO rate_card (tenant_id, daypart, price_30, yield, occupancy, ai_hint) VALUES
  (${HQ}, 'Manhã (prime)', 560, 'alto', 96, '▲ manter'),
  (${HQ}, 'Almoço',        480, 'alto', 92, '▲ R$ 520'),
  (${HQ}, 'Drive',         520, 'alto', 72, 'manter'),
  (${HQ}, 'Madrugada',     120, 'baixo', 28, '▼ pacote')`;

/* ---- Financeiro ---- */
await sql`
  INSERT INTO invoices (tenant_id, client, period, value, einvoice, status, due_date) VALUES
  (${HQ}, 'Casas Bahia',     'Julho/26',  120000, 'emitida',  'aberta',  '2026-08-05'),
  (${HQ}, 'Guaraná',         'Julho/26',  48000,  'emitida',  'paga',    '2026-07-20'),
  (${HQ}, 'Shopping RioMar', 'Julho/26',  26000,  'pendente', 'aberta',  '2026-08-10'),
  (${HQ}, 'Supermercados Dia','Junho/26', 18000,  'emitida',  'vencida', '2026-07-01')`;
await sql`
  INSERT INTO receivables (tenant_id, client, value, days_overdue, risk) VALUES
  (${HQ}, 'Supermercados Dia', 18000, 25, 'alto'),
  (${HQ}, 'Padaria SP',        4200,  8,  'medio'),
  (${HQ}, 'Auto Posto BR',     2400,  2,  'baixo'),
  (${HQ}, 'Casas Bahia',       120000, 0, 'baixo')`;

/* ---- Agência ---- */
await sql`
  INSERT INTO activations (tenant_id, name, client, city, uf, has_fm, audio_source, stage, when_label, vehicle, team, speakers, progress, checklist) VALUES
  (${HQ}, 'Ativação Arena — Fortaleza', 'Guaraná', 'Fortaleza', 'CE', FALSE, 'Pendrive (sem FM)', 'Briefing', '10/08', NULL, NULL, NULL, 10, '[]'),
  (${HQ}, 'Sampling — Curitiba', 'Nescau', 'Curitiba', 'PR', TRUE, 'FM ao vivo', 'Briefing', '15/08', NULL, NULL, NULL, 5, '[]'),
  (${HQ}, 'Blitz Praia — Guarujá', 'Metropolitana', 'Guarujá', 'SP', TRUE, 'FM ao vivo', 'Planejada', 'Sáb 14h', 'Fiorino', '2 promotoras', '2 caixas', 60, '[]'),
  (${HQ}, 'Ação anunciante — Niterói', 'Anunciante', 'Niterói', 'RJ', TRUE, 'FM ao vivo', 'Planejada', 'Seg 10h', NULL, NULL, NULL, 40, '[]'),
  (${HQ}, 'Ativação Shopping Recife', 'Shopping RioMar', 'Recife', 'PE', FALSE, 'Pendrive (sem FM)', 'Em campo', 'Hoje 9h', 'Van Sprinter — ABC1D23', '3 (2 promotoras + 1 técnico)', '3 (2 ativas + 1 reserva)', 85,
    '[{"item":"Pendrive gravado com spots + trilha","done":true},{"item":"Caixas testadas + cabos","done":true},{"item":"Brindes conferidos (500 un.)","done":false},{"item":"Autorização do shopping impressa","done":false},{"item":"Fotos/relatório enviados ao cliente","done":false}]'),
  (${HQ}, 'Ação Palmas', 'Cliente Palmas', 'Palmas', 'TO', TRUE, 'FM ao vivo', 'Concluída', '✓ prestação pendente', NULL, NULL, NULL, 100, '[]'),
  (${HQ}, 'Merenda — Rondonópolis', 'Prefeitura', 'Rondonópolis', 'MT', FALSE, 'Pendrive (sem FM)', 'Concluída', '✓ concluída', NULL, NULL, NULL, 100, '[]')`;

await sql`
  INSERT INTO equipment (tenant_id, kind, name, status, qty, note) VALUES
  (${HQ}, 'caixa',    'Caixa ativa JBL 15"',   'disponivel', 5, '2 em campo (Recife)'),
  (${HQ}, 'caixa',    'Caixa reserva 12"',     'disponivel', 3, NULL),
  (${HQ}, 'veiculo',  'Van Sprinter — ABC1D23','em campo',   1, 'Recife'),
  (${HQ}, 'veiculo',  'Fiorino — DEF4G56',     'disponivel', 1, NULL),
  (${HQ}, 'veiculo',  'Saveiro — HIJ7K89',     'manutencao', 1, 'revisão'),
  (${HQ}, 'veiculo',  'Kombi som — LMN0P12',   'disponivel', 1, NULL),
  (${HQ}, 'pendrive', 'Pendrive gravado (praça sem FM)', 'critico', 2, 'repor — mínimo 4')`;

await sql`
  INSERT INTO team_schedule (tenant_id, person, role, shift, day, status) VALUES
  (${HQ}, 'João Locutor',   'Locução',   'Manhã 6–10h',  'Seg–Sex', 'ok'),
  (${HQ}, 'Patrícia Voz',   'Locução',   'Drive 17–20h', 'Seg–Sex', 'ok'),
  (${HQ}, 'IA — madrugada', 'Locução IA','00h–05h',      'Todos',   'auto'),
  (${HQ}, 'Duda Promotora', 'Campo',     'Ação Recife',  'Sex–Dom', 'em campo'),
  (${HQ}, 'Rafa Técnico',   'Campo/Som', 'Ação Recife',  'Sex–Dom', 'em campo'),
  (${HQ}, 'Léo Promotor',   'Campo',     'Blitz Guarujá','Sáb',     'escalado')`;

/* ---- Portal do cliente ---- */
const camps = await sql`
  INSERT INTO campaigns (tenant_id, advertiser, name, token, period, contracted, aired, reach, clicks, investment, status) VALUES
  (${HQ}, 'Casas Bahia', 'Ofertas de Julho', 'cb-julho-2026', '25/07 – 10/08', 180, 148, '920k', 1240, 120000, 'ativa'),
  (${HQ}, 'Guaraná', 'Verão', 'guarana-verao-26', '20/07 – 20/08', 120, 64, '410k', 380, 48000, 'ativa'),
  (${HQ}, 'Shopping RioMar', 'Ativação', 'riomar-ativ-26', '25/07 – 27/07', 24, 18, '95k', 88, 26000, 'ativa')
  RETURNING id, token`;
const CB = camps[0].id;
await sql`
  INSERT INTO materials (campaign_id, kind, title, status, note) VALUES
  (${CB}, 'audio',  'Spot institucional',    'aguardando', 'enviado pela produção · aguardando cliente'),
  (${CB}, 'imagem', 'Arte para redes',       'aprovado',   'aprovada pelo cliente'),
  (${CB}, 'video',  'Testemunhal em vídeo',  'ajuste',     'ajuste solicitado')`;
await sql`
  INSERT INTO airing_proofs (campaign_id, aired_on, aired_at, program, praca, status) VALUES
  (${CB}, '2026-07-25', '07:42', 'Manhã Metropolitana', '98.5 SP', 'veiculado'),
  (${CB}, '2026-07-25', '12:18', 'Almoço na Metro',     '98.5 SP', 'veiculado'),
  (${CB}, '2026-07-25', '18:05', 'Drive Time',          '98.5 SP', 'veiculado'),
  (${CB}, '2026-07-26', '08:10', 'Manhã Metropolitana', '98.5 SP', 'programado')`;

/* ---- Marketing / social ---- */
await sql`
  INSERT INTO social_accounts (tenant_id, platform, handle, followers, connected) VALUES
  (${HQ}, 'youtube',   'Metropolitana Oficial', '380k inscritos', FALSE),
  (${HQ}, 'instagram', '@metropolitana',        '512k', FALSE),
  (${HQ}, 'facebook',  'Página oficial',        '640k', FALSE),
  (${HQ}, 'tiktok',    '@metropolitanafm',      '220k', FALSE),
  (${HQ}, 'google',    'Perfil + campanhas',    '—', FALSE),
  (${HQ}, 'x',         '@metropolitana',        '—', FALSE)`;
await sql`
  INSERT INTO posts (tenant_id, body, platforms, scheduled_for, owner, status, source) VALUES
  (${HQ}, 'Playlist da semana', '{Instagram,Facebook,YouTube}', now() + interval '6 hours', 'Marina', 'agendado', 'manual'),
  (${HQ}, 'Corte da entrevista', '{TikTok,Instagram}', now() + interval '1 day', 'Diego', 'agendado', 'manual'),
  (${HQ}, 'Enquete do dia', '{Instagram}', NULL, 'Automático', 'recorrente', 'ia')`;
await sql`
  INSERT INTO trends (kind, title, meta) VALUES
  ('T', 'Trend: novo hit sertanejo estoura no TikTok', 'música · +2M vídeos · agora'),
  ('F', 'Fofoca: casal de famosos assume namoro', 'celebridades · alta busca'),
  ('N', 'Novidade: artista anuncia show em SP', 'agenda · relevante p/ praça'),
  ('E', 'Esporte: resultado da rodada', 'tempo real')`;
await sql`
  INSERT INTO social_revenue (tenant_id, platform, month, value) VALUES
  (${HQ}, 'YouTube — AdSense',      '2026-07', 41000),
  (${HQ}, 'Meta — reels + ads',     '2026-07', 26000),
  (${HQ}, 'TikTok — fundo + gifts', '2026-07', 12000),
  (${HQ}, 'Lives — gifts/patrocínio','2026-07', 5000),
  (${T.rio}, 'Consolidado social',  '2026-07', 22000),
  (${T.bh},  'Consolidado social',  '2026-07', 15000),
  (${T.curitiba}, 'Consolidado social', '2026-07', 11000)`;

/* ---- Alertas WhatsApp ---- */
await sql`
  INSERT INTO alert_rules (tenant_id, area, condition, message, wa_group, active) VALUES
  (${HQ}, 'Programação', 'Sinal fora do ar > 30s', 'Rádio fora do ar — verificar player/transmissor.', 'Técnica', TRUE),
  (${HQ}, 'Jornalismo', 'Radar gera pautas (07h)', 'Bom dia! 5 pautas quentes prontas pra hoje.', 'Redação', TRUE),
  (${HQ}, 'Comercial', 'Proposta vira "Ganho"', 'Novo contrato fechado — iniciar produção/execução.', 'Comercial+Fin.', TRUE),
  (${HQ}, 'Tráfego', 'Spot aprovado', 'Spot aprovado e liberado para a grade.', 'Tráfego', TRUE),
  (${HQ}, 'Operações', 'Ação entra em campo', 'Ação iniciada — checklist e fotos ao final.', 'Operações', TRUE),
  (${HQ}, 'Operações', 'Praça sem FM confirmada', 'Atenção: praça sem FM — levar pendrive gravado.', 'Operações', TRUE),
  (${HQ}, 'Equipamentos', 'Estoque pendrive < 2', 'Estoque de pendrive baixo — repor.', 'Produção', TRUE),
  (${HQ}, 'Financeiro', 'Fatura vence em 3 dias', 'Conta a receber vencendo — cobrar cliente.', 'Financeiro', TRUE),
  (${HQ}, 'Arrumar a Casa', 'Aprovação parada > 24h', 'Aprovação pendente há mais de 1 dia.', 'Gestão', TRUE),
  (${HQ}, 'Equipe', 'Furo na escala', 'Furo na escala — remanejar locutor/promotor.', 'RH', FALSE),
  (${HQ}, 'IA', 'Locução automática 00h', 'Locução por IA no ar (madrugada).', 'Programação', TRUE),
  (${HQ}, 'Digital', 'Live iniciada', 'Estamos ao vivo — divulgar nas redes.', 'Digital', TRUE)`;
await sql`
  INSERT INTO alert_log (tenant_id, title, wa_group, status, sent_at) VALUES
  (${HQ}, 'Estoque de pendrive baixo (2)', 'Produção', 'entregue', now()),
  (${HQ}, 'Ação Recife entrou em campo', 'Operações', 'entregue', now() - interval '3 hours'),
  (${HQ}, 'Radar: 5 pautas do dia', 'Redação', 'entregue', now() - interval '5 hours'),
  (${HQ}, 'Proposta Casas Bahia = Ganho', 'Comercial+Fin.', 'entregue', now() - interval '4 hours')`;

/* ---- Jornalismo ---- */
await sql`
  INSERT INTO pautas (tenant_id, title, editoria, reporter, status, time_slot, source, meta) VALUES
  (${HQ}, 'Alfabetização SP supera meta MEC', 'Educação', 'Ana', 'no-ar', '08:10', 'redacao', NULL),
  (${HQ}, 'Concurso educação Niterói', 'Cidades', 'Léo', 'producao', '09:30', 'redacao', NULL),
  (${HQ}, 'Novas creches em Paulista', 'Educação', 'Ana', 'apurando', NULL, 'redacao', NULL),
  (${HQ}, 'SP supera meta de alfabetização do MEC', 'Educação', NULL, 'apurando', NULL, 'radar', 'Estúdio Folha · política pública'),
  (${HQ}, 'Paulista: reformas, climatização e novas creches', 'Educação', NULL, 'apurando', NULL, 'radar', 'Pref. do Paulista · investimento na rede'),
  (${HQ}, 'Niterói contrata 132 profissionais de educação', 'Educação', NULL, 'apurando', NULL, 'radar', 'A Seguir Niterói · concurso'),
  (${HQ}, 'Feira valoriza merenda e agricultura familiar', 'Cidades', NULL, 'apurando', NULL, 'radar', 'Rondonópolis · pauta local'),
  (${HQ}, 'Lauro de Freitas fortalece educação inclusiva', 'Educação', NULL, 'apurando', NULL, 'radar', 'Bahia Jornal · inclusão')`;

/* ---- Gestão interna ---- */
await sql`
  INSERT INTO internal_tasks (tenant_id, title, kind, detail, done) VALUES
  (${HQ}, 'Fechar escala de locutores da semana', 'pendencia', NULL, TRUE),
  (${HQ}, 'Contrato anunciante — assinatura', 'pendencia', NULL, FALSE),
  (${HQ}, 'Conferir estoque de pendrives (sem FM)', 'pendencia', NULL, FALSE),
  (${HQ}, 'Prestação de contas — ação Palmas', 'pendencia', NULL, FALSE),
  (${HQ}, 'Revisar SOP de montagem de som', 'pendencia', NULL, FALSE),
  (${HQ}, 'Contrato — Anunciante Paulista', 'aprovacao', 'aguarda assinatura', FALSE),
  (${HQ}, 'Reembolso combustível — Palmas', 'aprovacao', 'R$ 780', FALSE),
  (${HQ}, 'NF fornecedor de brindes', 'aprovacao', 'R$ 4.200', FALSE),
  (${HQ}, 'Montagem de som em campo', 'sop', NULL, TRUE),
  (${HQ}, 'Gravação de pendrive p/ praça sem FM', 'sop', NULL, TRUE),
  (${HQ}, 'Roteiro de blitz de praia', 'sop', NULL, FALSE),
  (${HQ}, 'Prestação de contas de ação', 'sop', NULL, FALSE),
  (${HQ}, 'Passagem de plantão de locução', 'sop', NULL, FALSE)`;

console.log('✓ seed aplicado:', tenants.length, 'praças');
await sql.end();
