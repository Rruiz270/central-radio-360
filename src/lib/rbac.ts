import type { Role } from './auth';

/* Mapa de acesso por perfil — espelho do mockup aprovado (ACCESS) */
export type ModuleKey =
  | 'dash' | 'rede' | 'org' | 'concorrencia' | 'audiencia' | 'esteira' | 'os'
  | 'prog' | 'jornalismo' | 'comercial' | 'cliente' | 'digital' | 'tecnica'
  | 'vendasag' | 'acoes' | 'planejamento' | 'estoque' | 'equipe'
  | 'marketing' | 'monetizacao'
  | 'ia' | 'alertas'
  | 'casa' | 'financeiro' | 'config';

export const ACCESS: Record<Role, ModuleKey[] | 'all'> = {
  admin: 'all',
  comercial: ['os', 'dash', 'rede', 'concorrencia', 'audiencia', 'esteira', 'comercial', 'cliente', 'vendasag', 'financeiro', 'alertas', 'ia'],
  programacao: ['os', 'dash', 'audiencia', 'esteira', 'prog', 'ia', 'alertas'],
  jornalismo: ['os', 'dash', 'audiencia', 'esteira', 'jornalismo', 'ia', 'alertas'],
  marketing: ['os', 'dash', 'concorrencia', 'audiencia', 'esteira', 'marketing', 'monetizacao', 'digital', 'cliente', 'alertas'],
  operacoes: ['os', 'dash', 'audiencia', 'esteira', 'vendasag', 'acoes', 'planejamento', 'estoque', 'equipe', 'financeiro', 'alertas'],
  afiliada: ['os', 'dash', 'audiencia', 'esteira', 'prog', 'jornalismo', 'comercial', 'alertas'],
  cliente: [],
};

export function canAccess(role: Role, mod: ModuleKey): boolean {
  const a = ACCESS[role];
  return a === 'all' || a.includes(mod);
}

export const NAV: { grp: string; cls: string; items: { key: ModuleKey; href: string; label: string; pill?: string; icon?: string; exact?: boolean }[] }[] = [
  {
    grp: 'Comando', cls: '',
    items: [
      { key: 'dash', href: '/', label: 'Visão Geral (BI)' },
      { key: 'rede', href: '/rede', label: 'Rede & Afiliadas', pill: '6' },
      { key: 'concorrencia', href: '/concorrencia', label: 'Concorrência', pill: 'novo' },
      { key: 'audiencia', href: '/audiencia', label: 'Audiência (fontes)', pill: 'novo' },
      { key: 'esteira', href: '/esteira', label: 'Esteira de Documentos', pill: 'novo', exact: true },
      { key: 'os', href: '/esteira/os', label: 'O.S. · Ordens de Serviço', icon: 'os' },
      { key: 'org', href: '/organograma', label: 'Organograma & Acessos' },
    ],
  },
  {
    grp: 'Rádio — Emissora', cls: 'radio',
    items: [
      { key: 'prog', href: '/programacao', label: 'Programação & Musical', pill: 'no ar' },
      { key: 'jornalismo', href: '/jornalismo', label: 'Jornalismo & Radar' },
      { key: 'comercial', href: '/comercial', label: 'Comercial & Vendas' },
      { key: 'comercial', href: '/esteira/pi', label: 'P.I. · Pedidos de Inserção', icon: 'pi' },
      { key: 'comercial', href: '/esteira/pd', label: 'P.D. · Distribuição', icon: 'pd' },
      { key: 'comercial', href: '/esteira/pecas', label: 'Produção de Peças', icon: 'cp' },
      { key: 'comercial', href: '/esteira/pv', label: 'P.V. · Veiculação', icon: 'pv' },
      { key: 'cliente', href: '/portal-cliente', label: 'Portal do Cliente', pill: 'novo' },
      { key: 'digital', href: '/digital', label: 'Digital & Podcast' },
      { key: 'tecnica', href: '/tecnica', label: 'Técnica & Engenharia' },
    ],
  },
  {
    grp: 'Agência de Ativação', cls: 'agencia',
    items: [
      { key: 'vendasag', href: '/vendas-agencia', label: 'Vendas & Propostas' },
      { key: 'acoes', href: '/acoes', label: 'Ações & Execução' },
      { key: 'planejamento', href: '/planejamento', label: 'Planejamento & Criação' },
      { key: 'estoque', href: '/equipamentos', label: 'Equipamentos & Frota' },
      { key: 'equipe', href: '/equipe', label: 'Equipe & Promotores' },
    ],
  },
  {
    grp: 'Marketing & Social', cls: 'mkt',
    items: [
      { key: 'marketing', href: '/marketing', label: 'Central de Marketing', pill: 'API' },
      { key: 'monetizacao', href: '/monetizacao', label: 'Monetização Social' },
    ],
  },
  {
    grp: 'Inteligência', cls: 'ia',
    items: [
      { key: 'ia', href: '/ia', label: 'IA & Automação' },
      { key: 'alertas', href: '/alertas', label: 'Comunicação & Alertas', pill: 'WhatsApp' },
    ],
  },
  {
    grp: 'Gestão', cls: 'gestao',
    items: [
      { key: 'casa', href: '/gestao-interna', label: 'Gestão Interna' },
      { key: 'financeiro', href: '/financeiro', label: 'Financeiro' },
      { key: 'financeiro', href: '/esteira/po', label: 'P.O. · Orçamentos', icon: 'po' },
      { key: 'financeiro', href: '/esteira/cp', label: 'C.P. · Custo de Produção', icon: 'cp' },
      { key: 'config', href: '/configuracoes', label: 'Configurações & Integrações' },
    ],
  },
];

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administração (Matriz 98.5)',
  comercial: 'Diretor Comercial',
  programacao: 'Programação',
  jornalismo: 'Jornalismo',
  marketing: 'Marketing Digital',
  operacoes: 'Operações (Agência)',
  afiliada: 'Gestor de Afiliada',
  cliente: 'Cliente (anunciante)',
};
