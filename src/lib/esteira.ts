/* Domínio da esteira documental da agência — PO → PI → PD → OS → CP → PV.
   Espelha os formulários reais da Metropolitana (modelos .xls / .xlsx de 2025-2026). */

import type { Role } from './auth';

/* ===================== tipos de documento ===================== */

export type DocKind = 'PO' | 'PI' | 'PD' | 'OS' | 'CP' | 'PV';

export const DOC: Record<DocKind, {
  name: string; full: string; tone: string; href: string;
  /* onde o documento mora dentro do sistema (o departamento dono) */
  module: string; where: string;
}> = {
  PO: { name: 'PO', full: 'Pedido de Orçamento', tone: 'po', href: '/esteira/po',
        module: 'financeiro', where: 'Financeiro · aprovação em 4 áreas' },
  PI: { name: 'PI', full: 'Pedido de Inserção', tone: 'pi', href: '/esteira/pi',
        module: 'comercial', where: 'Comercial & Vendas' },
  PD: { name: 'PD', full: 'Planilha de Distribuição', tone: 'pd', href: '/esteira/pd',
        module: 'comercial', where: 'Comercial · rede nacional' },
  OS: { name: 'OS', full: 'Ordem de Serviço', tone: 'os', href: '/esteira/os',
        module: 'acoes', where: 'cada departamento recebe a sua' },
  CP: { name: 'CP', full: 'Controle de Produção', tone: 'cp', href: '/esteira/cp',
        module: 'comercial', where: 'Produção de Spot + Portal do Cliente' },
  PV: { name: 'PV', full: 'Pedido de Veiculação', tone: 'pv', href: '/esteira/pv',
        module: 'comercial', where: 'Comercial (tráfego) + Financeiro' },
};

export const CHAIN: DocKind[] = ['PO', 'PI', 'PD', 'OS', 'CP', 'PV'];

/* ===================== departamentos das O.S. ===================== */
/* Um modelo .xls por departamento — mesma capa, miolo diferente. */

export type Dept = 'opec' | 'operacoes' | 'artistico' | 'promocao' | 'internet' | 'chupim' | 'cobertura';

export const DEPT: Record<Dept, {
  label: string; unit: string; module: string; home: string; homeLabel: string;
  offline: boolean; lines: string[];
}> = {
  operacoes: {
    label: 'Operações', unit: 'ações', module: 'acoes', home: '/acoes', homeLabel: 'Ações & Execução',
    offline: true, lines: ['Pit stop / ativação'],
  },
  promocao: {
    label: 'Promoção', unit: 'sorteios', module: 'acoes', home: '/acoes', homeLabel: 'Ações & Execução',
    offline: true, lines: ['Sorteio / mecânica'],
  },
  opec: {
    label: 'OPEC', unit: 'inserções', module: 'comercial', home: '/comercial', homeLabel: 'Comercial & Vendas',
    offline: false, lines: ['Peça A · 30"', 'Peça B · 15"'],
  },
  artistico: {
    label: 'Artístico', unit: 'testemunhais', module: 'prog', home: '/programacao', homeLabel: 'Programação & Musical',
    offline: false, lines: ['Testemunhal 60"'],
  },
  chupim: {
    label: 'Chupim', unit: 'inserções', module: 'prog', home: '/programacao', homeLabel: 'Programação & Musical',
    offline: false, lines: ['Testemunhal', 'Assinatura 5"'],
  },
  internet: {
    label: 'Internet', unit: 'posts', module: 'digital', home: '/digital', homeLabel: 'Digital & Podcast',
    offline: false, lines: ['Post feed', 'Stories'],
  },
  cobertura: {
    label: 'Cobertura', unit: 'dias', module: 'jornalismo', home: '/jornalismo', homeLabel: 'Jornalismo & Radar',
    offline: false, lines: ['Dia de cobertura'],
  },
};

export const DEPTS = Object.keys(DEPT) as Dept[];
export const isDept = (d: string): d is Dept => DEPTS.includes(d as Dept);

/* Campos específicos de cada modelo de O.S. — extraídos dos .xls originais. */
export type FieldSpec = { key: string; label: string; type?: 'text' | 'area' | 'date' };

export const OS_FIELDS: Record<Dept, FieldSpec[]> = {
  operacoes: [
    { key: 'endereco', label: 'Endereços' },
    { key: 'obs', label: 'Observações gerais', type: 'area' },
  ],
  promocao: [
    { key: 'praca_entrega', label: 'Praça da entrega' },
    { key: 'sorteios', label: 'Número de sorteios' },
    { key: 'mecanica', label: 'Mecânica', type: 'area' },
    { key: 'premio', label: 'Prêmio', type: 'area' },
    { key: 'regulamento', label: 'Regulamento' },
    { key: 'obs', label: 'Observações', type: 'area' },
  ],
  opec: [
    { key: 'credito', label: 'O.S. crédito / utilização' },
    { key: 'motivo', label: 'Motivo do crédito' },
    { key: 'obs', label: 'Observações', type: 'area' },
  ],
  artistico: [
    { key: 'programa', label: 'Programa ou projeto' },
    { key: 'edicao', label: 'Edição / horário' },
    { key: 'formato', label: 'Formato' },
    { key: 'secundagem', label: 'Secundagem' },
    { key: 'comprovante', label: 'Necessidade de comprovante' },
    { key: 'testemunhal', label: 'Texto do testemunhal', type: 'area' },
    { key: 'obs', label: 'Observações', type: 'area' },
  ],
  chupim: [
    { key: 'chamadas', label: 'Chamadas' },
    { key: 'tempo_testemunhal', label: 'Testemunhal (tempo)' },
    { key: 'qrcode', label: 'QR-code' },
    { key: 'testemunhal', label: 'Texto do testemunhal', type: 'area' },
    { key: 'assinatura', label: 'Texto de assinatura (5")', type: 'area' },
    { key: 'obs', label: 'Observações', type: 'area' },
  ],
  internet: [
    { key: 'plataformas', label: 'Plataformas (Facebook / Instagram / X / Hotsite)' },
    { key: 'periodo_campanha', label: 'Período da campanha' },
    { key: 'artes', label: 'Artes' },
    { key: 'pos_venda', label: 'Pós-venda / comprovantes' },
    { key: 'obs', label: 'Observações', type: 'area' },
  ],
  cobertura: [
    { key: 'entrega', label: 'Entrega da cobertura' },
    { key: 'credenciamento', label: 'Dados para credenciamento' },
    { key: 'obs', label: 'Observações', type: 'area' },
  ],
};

/* Saldos de cada departamento — os quadros do rodapé de cada .xls. */
export const OS_BALANCES: Record<Dept, { label: string; unit: string; key: string }[]> = {
  operacoes: [{ label: 'Ações compradas', unit: 'ações', key: 'acoes' }],
  promocao: [{ label: 'Sorteios', unit: 'sorteios', key: 'sorteios' }],
  opec: [{ label: 'Inserções', unit: 'inserções', key: 'insercoes' }],
  artistico: [{ label: 'Testemunhais', unit: 'un.', key: 'testemunhais' }],
  chupim: [
    { label: 'Abertura e encerramento', unit: 'un.', key: 'abertura' },
    { label: 'Chamada do programa', unit: 'un.', key: 'chamada' },
    { label: 'Assinatura e retorno de break', unit: 'un.', key: 'assinatura' },
    { label: 'Testemunhal', unit: 'un.', key: 'testemunhal' },
  ],
  internet: [
    { label: 'Impressões de banner', unit: 'imp.', key: 'banner' },
    { label: 'Stories Instagram', unit: 'un.', key: 'stories' },
    { label: 'Posts Instagram', unit: 'un.', key: 'posts' },
  ],
  cobertura: [{ label: 'Dias de cobertura', unit: 'dias', key: 'dias' }],
};

/* ===================== permissões por documento ===================== */

/* Quem cria cada documento. admin sempre pode. */
const CREATORS: Record<DocKind, Role[]> = {
  PO: ['comercial', 'operacoes'],
  PI: ['comercial'],
  PD: ['comercial'],
  OS: ['comercial', 'operacoes'],
  CP: ['comercial', 'operacoes', 'programacao'],
  PV: ['comercial'],
};

/* Quem autoriza / fecha cada documento. */
const APPROVERS: Record<DocKind, Role[]> = {
  PO: ['comercial'],            // as 4 áreas aprovam item a item; o fechamento é do comercial
  PI: ['comercial'],
  PD: ['comercial'],
  OS: ['operacoes', 'comercial', 'programacao', 'jornalismo', 'marketing'],
  CP: ['comercial', 'operacoes', 'programacao'],
  PV: ['comercial'],
};

export const canCreate = (role: Role, kind: DocKind) => role === 'admin' || CREATORS[kind].includes(role);
export const canApprove = (role: Role, kind: DocKind) => role === 'admin' || APPROVERS[kind].includes(role);

/* Departamentos de O.S. que cada perfil enxerga e edita. */
export function deptsForRole(role: Role): Dept[] {
  switch (role) {
    case 'admin': return DEPTS;
    case 'operacoes': return ['operacoes', 'promocao'];
    case 'comercial': return DEPTS;
    case 'programacao': return ['artistico', 'chupim'];
    case 'jornalismo': return ['cobertura'];
    case 'marketing': return ['internet'];
    case 'afiliada': return DEPTS;
    default: return [];
  }
}
export const canEditOS = (role: Role, dept: Dept) => deptsForRole(role).includes(dept);

/* Áreas que assinam o PO (colunas reais da planilha orçamentária). */
export const PO_AREAS = [
  { key: 'diretoria', label: 'Diretoria', roles: ['admin'] as Role[] },
  { key: 'financeiro', label: 'Financeiro', roles: ['admin', 'comercial'] as Role[] },
  { key: 'rh', label: 'R.H.', roles: ['admin'] as Role[] },
  { key: 'operacoes', label: 'Operações', roles: ['admin', 'operacoes'] as Role[] },
];
export const canSignPO = (role: Role, area: string) =>
  role === 'admin' || (PO_AREAS.find((a) => a.key === area)?.roles.includes(role) ?? false);

/* ===================== cálculo financeiro ===================== */
/* Fluxo real da PD: tabela → total tabela → desconto → negociado → comissão → líquido. */

export type Money = {
  tableTotal: number; negotiated: number; net: number; netUnit: number;
};

export function money(qty: number, rate: number, discount: number, commission: number): Money {
  const tableTotal = qty * rate;
  const negotiated = tableTotal * (1 - discount);
  const net = negotiated * (1 - commission);
  return { tableTotal, negotiated, net, netUnit: qty ? net / qty : 0 };
}

export const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
};

export const brl = (v: number | string): string =>
  'R$ ' + num(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const brlShort = (v: number | string): string => {
  const n = num(v);
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (Math.abs(n) >= 1000) return `R$ ${Math.round(n / 1000)}k`;
  return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};

/* Padrão negociado da casa (modelo P.D. 2025 Rede). */
export const DEFAULT_DISCOUNT = 0.8568282;
export const DEFAULT_COMMISSION = 0.2;

export const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const MESES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const daysInMonth = (m: number, y: number) => new Date(y, m, 0).getDate();
export const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const dowOf = (y: number, m: number, d: number) => DOW[new Date(y, m - 1, d).getDay()];
export const isWeekend = (y: number, m: number, d: number) => [0, 6].includes(new Date(y, m - 1, d).getDay());

/* ===================== etapa atual da esteira ===================== */

export type ChainState = { step: number; blocked: string | null };

/* Devolve em que ponto da esteira uma P.I. está, e o que a trava. */
export function chainState(f: {
  poStatus?: string | null; poPending?: number;
  piStatus?: string | null; pdStatus?: string | null;
  osTotal?: number; osOpen?: number;
  cpTotal?: number; cpUnapproved?: number;
  pvStatus?: string | null;
}): ChainState {
  if (f.pvStatus === 'encerrado') return { step: 6, blocked: null };
  if (f.pvStatus === 'autorizado' || f.pvStatus === 'veiculando') return { step: 6, blocked: null };
  if (f.cpTotal && f.cpUnapproved) return { step: 5, blocked: `${f.cpUnapproved} peça(s) sem aprovação do cliente` };
  if (f.cpTotal) return { step: 5, blocked: null };
  if (f.osTotal && f.osOpen) return { step: 4, blocked: `${f.osOpen} O.S. ainda aberta(s)` };
  if (f.osTotal) return { step: 4, blocked: null };
  if (f.pdStatus === 'autorizada') return { step: 3, blocked: null };
  if (f.pdStatus) return { step: 3, blocked: 'PD aguardando autorização' };
  if (f.piStatus === 'emitida' || f.piStatus === 'distribuida') return { step: 2, blocked: null };
  if (f.piStatus) return { step: 2, blocked: 'P.I. em rascunho' };
  if (f.poPending) return { step: 1, blocked: `${f.poPending} aprovação(ões) pendente(s)` };
  return { step: 1, blocked: null };
}
