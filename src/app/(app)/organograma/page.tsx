import Link from 'next/link';
import { requireModule } from '@/lib/guard';
import { SecTitle, Card, Chip, Hint } from '@/components/ui';

const RADIO = [
  { nome: 'Direção Artística / Programação', href: '/programacao', roles: ['Programação musical', 'Locução', 'Produção', 'Discoteca/Acervo', 'Op. controle mestre'] },
  { nome: 'Jornalismo', href: '/jornalismo', roles: ['Redação', 'Pauta', 'Reportagem', 'Edição', 'Esportes', 'Radar IA'] },
  { nome: 'Comercial / Tráfego', href: '/comercial', roles: ['Executivos multiplataforma', 'Planners', 'Tráfego', 'Atendimento', 'Mídia'] },
  { nome: 'Digital', href: '/digital', roles: ['Portal', 'Redes sociais', 'Podcast', 'Vídeo/Streaming', 'On-demand'] },
  { nome: 'Técnica / Engenharia', href: '/tecnica', roles: ['Transmissores/Torres', 'Estúdios', 'TI', 'Manutenção', 'Remotas'] },
  { nome: 'Direção Geral / Administrativa', href: '/gestao-interna', roles: ['Administração', 'RH', 'Jurídico', 'Financeiro', 'Logística'] },
];
const AGENCIA = [
  { nome: 'Atendimento / Comercial', href: '/vendas-agencia', roles: ['Vendedores', 'Briefing', 'Propostas', 'Personalização'] },
  { nome: 'Planejamento / Criação', href: '/planejamento', roles: ['Planners criativos', 'Conceito', 'Roteiro'] },
  { nome: 'Operações / Field Marketing', href: '/acoes', roles: ['Logística de campo', 'Frota', 'Montagem de som', 'FM/sem FM', 'Execução'] },
  { nome: 'Produção', href: '/equipamentos', roles: ['Brindes/Materiais', 'Fornecedores', 'Equipamentos'] },
  { nome: 'Recrutamento & Equipes', href: '/equipe', roles: ['Promotores', 'Escala', 'Treinamento'] },
  { nome: 'Trade & Varejo / PDV', href: '', roles: ['Ações em PDV', 'Merchandising', 'Relacionamento varejo'] },
  { nome: 'BI / Relatório pós-ação', href: '/financeiro', roles: ['Relatório ao cliente', 'Fotos/Evidências', 'Métricas', 'Prestação de contas'] },
];

const PERFIS = [
  ['Administração (Matriz 98.5)', 'Tudo — rede, comercial, marketing, financeiro, BI', 'Rede inteira', 'amber'],
  ['Diretor Comercial', 'Comercial, Vendas, Tráfego, Financeiro, BI, Rede', 'Rede (comercial)', 'blue'],
  ['Programação', 'Programação, IA, Alertas', 'Praça', 'gray'],
  ['Jornalismo', 'Jornalismo & Radar, IA, Alertas', 'Praça', 'gray'],
  ['Marketing Digital', 'Central de Marketing, Monetização, Digital, Alertas', 'Rede (social)', 'blue'],
  ['Operações (Agência)', 'Ações, Vendas Agência, Planejamento, Equipamentos, Equipe', 'Agência', 'gray'],
  ['Gestor de Afiliada', 'Painel da própria praça: Programação, Jornalismo, Comercial local, Alertas', 'Só a afiliada', 'green'],
  ['Cliente (anunciante)', 'Portal do Cliente: números, comprovação, aprovar/subir materiais', 'Só a própria campanha', 'teal'],
] as const;

export default async function OrgPage() {
  await requireModule('org');
  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        <b>Mapa de departamentos</b> — estrutura de emissora (direções Geral, Artística, Jornalismo, Comercial, Técnica) +
        agência de ativação (field marketing). Clique em <b>abrir →</b> para entrar.
      </Hint>
      <div className="org">
        <div className="orgcol radio">
          <div className="oh">RÁDIO — EMISSORA</div>
          {RADIO.map((d) => (
            <div className="dep" key={d.nome}>
              <b>{d.nome} {d.href && <Link href={d.href} className="go">abrir →</Link>}</b>
              <div className="roles">{d.roles.map((r) => <span key={r}>{r}</span>)}</div>
            </div>
          ))}
        </div>
        <div className="orgcol agencia">
          <div className="oh">AGÊNCIA DE ATIVAÇÃO (OFFLINE)</div>
          {AGENCIA.map((d) => (
            <div className="dep" key={d.nome}>
              <b>{d.nome} {d.href && <Link href={d.href} className="go">abrir →</Link>}</b>
              <div className="roles">{d.roles.map((r) => <span key={r}>{r}</span>)}</div>
            </div>
          ))}
        </div>
      </div>
      <SecTitle right={<span className="tiny muted">o login de cada usuário aplica o perfil automaticamente</span>}>
        Acessos por perfil (quem vê o quê)
      </SecTitle>
      <Card pad0>
        <table>
          <thead><tr><th>Perfil</th><th>Vê</th><th>Escopo</th></tr></thead>
          <tbody>
            {PERFIS.map(([p, ve, esc, tone]) => (
              <tr key={p}><td className="b">{p}</td><td>{ve}</td><td><Chip tone={tone}>{esc}</Chip></td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
