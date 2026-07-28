import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Card, Chip, Hint, Bar, AiTag } from '@/components/ui';
import { Tabs } from '@/components/Tabs';
import { Player } from '@/components/Player';
import { GradeHeatmap } from '@/components/GradeHeatmap';
import { SongForm } from '@/components/SongForm';
import { MetasIA } from '@/components/MetasIA';
import { QuickAdd } from '@/components/QuickAdd';
import { OsInbox } from '@/components/esteira/DocInbox';

export const dynamic = 'force-dynamic';

export default async function ProgPage() {
  const session = await requireModule('prog');
  const [cats, log, current] = await Promise.all([
    sql`SELECT * FROM categories WHERE tenant_id = ${session.tenantId} ORDER BY code`,
    sql`SELECT * FROM play_log WHERE tenant_id = ${session.tenantId} ORDER BY played_at DESC LIMIT 12`,
    sql`SELECT * FROM play_log WHERE tenant_id = ${session.tenantId} ORDER BY played_at DESC LIMIT 1`,
  ]);
  const now = current[0];

  return (
    <section className="view on">
      <OsInbox session={session} depts={['artistico', 'chupim']}
               title="O.S. da Programação — Artístico e Chupim" />

      <Player
        title={now ? `${now.artist} — ${now.title} · Categoria ${now.category?.toUpperCase()}` : 'Sem execução registrada'}
        sub="00:20 / 04:12"
      />
      <Tabs
        tabs={[
          {
            id: 'cad', label: 'Cadastro de Música',
            content: (
              <div className="cards g2">
                <Card title="Cadastro / Vínculo de Música" tag="modelo herdado do console"><SongForm /></Card>
                <Card title="Histórico da Música" tag="últimos toques">
                  <div className="tiny muted" style={{ marginBottom: 10 }}>Mapa dia × hora de execução (evita repetição na mesma faixa):</div>
                  <GradeHeatmap seed={2.3} compact />
                  <Hint style={{ marginTop: 14 }}>
                    A regra de intervalo garante que a música não toque duas vezes na mesma faixa — igual ao Pulsar, agora
                    integrado ao comercial e à execução.
                  </Hint>
                </Card>
              </div>
            ),
          },
          {
            id: 'metas', label: <>Programação por Metas <AiTag /></>,
            content: (
              <>
                <Hint tone="y" style={{ marginBottom: 16 }}>
                  <b>Programação por Metas (padrão americano — RCS GSelector):</b> em vez de só regra de intervalo, a IA
                  equilibra <b>energia, variedade de gênero, rotação de artista e época</b> — e gera a grade sozinha
                  respeitando as restrições.
                </Hint>
                <div className="cards g2">
                  <Card title="Metas da programação" right={<AiTag />}><MetasIA /></Card>
                  <Card title="Prévia da hora otimizada" tag="10h–11h" pad0>
                    <table>
                      <thead><tr><th>#</th><th>Faixa</th><th>Categoria</th><th>Energia</th></tr></thead>
                      <tbody>
                        <tr><td>1</td><td className="b">Sucesso pop nacional</td><td><Chip tone="blue">Sucessos</Chip></td><td><Bar pct={75} width={60} /></td></tr>
                        <tr><td>2</td><td className="b">Spot — Casas Bahia</td><td><Chip tone="amber">Comercial</Chip></td><td>—</td></tr>
                        <tr><td>3</td><td className="b">Sertanejo atual</td><td><Chip tone="blue">Sucessos</Chip></td><td><Bar pct={65} width={60} /></td></tr>
                        <tr><td>4</td><td className="b">Novidade internacional</td><td><Chip tone="teal">Novidades</Chip></td><td><Bar pct={85} width={60} /></td></tr>
                        <tr><td>5</td><td className="b">Clássico romântico</td><td><Chip tone="gray">Clássicos</Chip></td><td><Bar pct={35} width={60} /></td></tr>
                      </tbody>
                    </table>
                  </Card>
                </div>
              </>
            ),
          },
          {
            id: 'cat', label: 'Categorias',
            content: (
              <Card
                title="Categorias da programação"
                right={<QuickAdd label="+ Categoria" title="Nova categoria" endpoint="/api/categories" small
                  fields={[
                    { key: 'name', label: 'Nome' },
                    { key: 'code', label: 'Código' },
                    { key: 'weight', label: 'Peso', type: 'select', options: ['Alto', 'Médio', 'Baixo'] },
                    { key: 'interval_h', label: 'Intervalo (h)', value: '3' },
                    { key: 'rotation', label: 'Rotação/h', value: '1-2' },
                  ]}
                  successMsg="Categoria criada e ativa na programação." />}
                pad0>
                <table>
                  <thead><tr><th>Cód</th><th>Categoria</th><th>Peso</th><th>Intervalo</th><th>Rotação/h</th><th /></tr></thead>
                  <tbody>
                    {cats.map((c) => (
                      <tr key={c.id}>
                        <td>{c.code}</td><td className="b">{c.name}</td><td>{c.weight || '—'}</td>
                        <td>{c.interval_h ? `${c.interval_h}h` : '—'}</td><td>{c.rotation || '—'}</td>
                        <td>{c.active ? <Chip tone="green">ativa</Chip> : <Chip tone="gray">reserva</Chip>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ),
          },
          {
            id: 'grade', label: 'Grade de Restrições',
            content: (
              <Card title="Grade de Restrições — 7 dias × 24 horas" tag="quando cada categoria pode tocar">
                <GradeHeatmap seed={1.1} />
              </Card>
            ),
          },
          {
            id: 'hist', label: 'Histórico',
            content: (
              <Card title="Log de execução" tag="hoje" pad0>
                <table>
                  <thead><tr><th>Hora</th><th>Música</th><th>Intérprete</th><th>Categoria</th><th>Origem</th></tr></thead>
                  <tbody>
                    {log.map((l) => (
                      <tr key={l.id}>
                        <td>{new Date(l.played_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="b">{l.title}</td><td>{l.artist}</td>
                        <td><Chip tone={l.category === 'Comercial' ? 'amber' : l.category === 'Sucessos' ? 'blue' : 'gray'}>{l.category}</Chip></td>
                        <td>{l.origin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ),
          },
        ]}
      />
    </section>
  );
}
