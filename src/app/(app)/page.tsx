import Link from 'next/link';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Kpi, SecTitle, Card, Chip, ListLi, BarRow, Mini, fmtBRL } from '@/components/ui';
import { GradeHeatmap } from '@/components/GradeHeatmap';
import { ChecklistLive } from '@/components/ChecklistLive';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const session = (await getSession())!;
  const [acts, tasks, tenants, alerts, deals] = await Promise.all([
    sql`SELECT * FROM activations WHERE stage IN ('Planejada','Em campo','Briefing') ORDER BY stage DESC LIMIT 3`,
    sql`SELECT * FROM internal_tasks WHERE kind = 'pendencia' ORDER BY id LIMIT 5`,
    sql`SELECT * FROM tenants ORDER BY is_hq DESC, listeners DESC`,
    sql`SELECT count(*)::int n FROM alert_log WHERE sent_at > now() - interval '24 hours'`,
    sql`SELECT COALESCE(SUM(value),0)::numeric total FROM deals WHERE stage IN ('Fechado','Ganho')`,
  ]);
  const c360 = tenants.filter((t) => t.system === 'c360').length;
  const audSum = tenants.reduce((a, t) => a + Number(t.listeners), 0);
  const revSum = tenants.reduce((a, t) => a + Number(t.revenue_month), 0);
  const myRev = Number(tenants.find((t) => t.id === session.tenantId)?.revenue_month || 0);

  return (
    <section className="view on">
      <div className="cards g4">
        <Kpi label="Ações no mês" value="34" delta="▲ 8 vs. mês anterior" deltaTone="up" />
        <Kpi label="Cidades atendidas" value="19" delta="▲ 3 novas praças" deltaTone="up" tone="b2" />
        <Kpi label="Inserções no ar" value="1.284" delta="grade 92% ocupada" tone="y" />
        <Kpi label="Receita do mês (praça)" value={fmtBRL(myRev)} delta="▲ 14%" deltaTone="up" tone="r" />
      </div>

      <SecTitle>Prioridades de hoje</SecTitle>
      <div className="cards g3">
        <Card title="Próximas ações em campo" tag="próx. 72h">
          {acts.map((a) => (
            <ListLi
              key={a.id}
              icoTone={a.stage === 'Em campo' ? 'amber' : 'blue'}
              ico={a.name.slice(0, 1)}
              title={a.name}
              sub={<>{a.city}/{a.uf} · {a.has_fm ? 'com FM' : <span className="chip c-amber">SEM FM · pendrive</span>}</>}
              right={<Chip tone={a.stage === 'Em campo' ? 'red' : 'teal'}>{a.when_label}</Chip>}
            />
          ))}
        </Card>
        <Card title="Gestão interna — pendências" tag={`${tasks.filter((t) => !t.done).length} abertas`}>
          <ChecklistLive items={tasks.map((t) => ({ id: t.id, label: t.title, done: t.done }))} />
        </Card>
        <Card title="IA — o que rodou hoje" tag="automação">
          <ListLi icoTone="blue" ico="R" title="Radar: 85 notícias → 5 pautas" sub="educação + setor público" />
          <ListLi icoTone="amber" ico="L" title="Locução automática 00h–05h" sub="voz sintética · madrugada" />
          <ListLi icoTone="green" ico="G" title="Grade gerada por metas" sub="energia + variedade equilibradas" />
          <Link href="/ia" className="btn p sm" style={{ marginTop: 8, display: 'inline-flex' }}>Abrir IA & Automação →</Link>
        </Card>
      </div>

      <SecTitle right={<span className="tiny muted">intensidade = mais inserções</span>}>Ocupação da grade (hoje)</SecTitle>
      <Card><GradeHeatmap seed={1.7} /></Card>

      {session.role === 'admin' && (
        <>
          <SecTitle right={<Link href="/rede" className="tiny muted">ver rede →</Link>}>Rede 98.5 — consolidado das afiliadas</SecTitle>
          <div className="cards g4">
            <Kpi label="Afiliadas na rede" value={String(tenants.length)} delta="▲ 2 no trimestre" deltaTone="up" />
            <Kpi label="Já na Central 360" value={String(c360)} delta="migrando do Pulsar" deltaTone="up" tone="b2" />
            <Kpi label="Audiência somada" value={`${(audSum / 1_000_000).toFixed(1).replace('.', ',')}M`} delta="▲ 6%" deltaTone="up" tone="y" />
            <Kpi label="Receita rede/mês" value={fmtBRL(revSum)} delta="▲ 11%" deltaTone="up" tone="r" />
          </div>
        </>
      )}

      <SecTitle right={<span className="tiny muted">Kantar é a métrica-padrão de negociação</span>}>
        Audiência — pesquisas plugadas por API
      </SecTitle>
      <div className="cards g3" style={{ marginBottom: 16 }}>
        <Card title="Fontes de audiência" right={<span className="wa"><span className="wd" />clique p/ abrir</span>}>
          <Link href="/audiencia?f=kantar" className="plat" style={{ cursor: 'pointer' }} data-fonte="kantar">
            <div className="pi" style={{ background: 'var(--mblue)' }}>KI</div>
            <div style={{ flex: 1 }}><b>Kantar IBOPE Media</b><div className="tiny muted">share Metro vs. concorrentes · por público</div></div>
            <span className="lock">abrir →</span>
          </Link>
          <Link href="/audiencia?f=triton" className="plat" style={{ cursor: 'pointer' }} data-fonte="triton">
            <div className="pi" style={{ background: '#0e807c' }}>TD</div>
            <div style={{ flex: 1 }}><b>Triton Digital</b><div className="tiny muted">streaming ao vivo · curva do dia · TSL</div></div>
            <span className="lock">abrir →</span>
          </Link>
          <Link href="/audiencia?f=nextdial" className="plat" style={{ cursor: 'pointer' }} data-fonte="nextdial">
            <div className="pi" style={{ background: '#a9741a' }}>NX</div>
            <div style={{ flex: 1 }}><b>Nextdial</b><div className="tiny muted">dispositivos · cidades do streaming</div></div>
            <span className="lock">abrir →</span>
          </Link>
        </Card>
        <Card title="Métricas da praça (98.5 · SP)" tag="último período">
          <Mini items={[{ v: '1º', l: 'no segmento jovem' }, { v: '1.2M', l: 'alcance/dia' }, { v: '42min', l: 'tempo médio' }]} />
          <div style={{ marginTop: 14 }}>
            <BarRow label="Share da praça" value="18,4%" pct={74} />
            <BarRow label="Streaming (Triton)" value="8,4k simultâneos" pct={52} />
          </div>
        </Card>
        <Card title="Audiência por faixa horária" tag="Easymedia" pad0>
          <table>
            <thead><tr><th>Faixa</th><th>Alcance</th><th>Share</th></tr></thead>
            <tbody>
              <tr><td className="b">Manhã 6–10h</td><td>alta</td><td><Chip tone="green">22%</Chip></td></tr>
              <tr><td className="b">Tarde 12–16h</td><td>média</td><td><Chip tone="blue">17%</Chip></td></tr>
              <tr><td className="b">Drive 17–20h</td><td>alta</td><td><Chip tone="green">21%</Chip></td></tr>
              <tr><td className="b">Noite 20–24h</td><td>média</td><td><Chip tone="gray">12%</Chip></td></tr>
            </tbody>
          </table>
        </Card>
      </div>
      <div className="tiny muted" style={{ marginTop: 8 }}>
        Alertas WhatsApp nas últimas 24h: <b className="b">{alerts[0].n}</b> · Vendas fechadas no funil: <b className="b">{fmtBRL(Number(deals[0].total))}</b>
      </div>
    </section>
  );
}
