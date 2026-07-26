import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Kpi, Card, Chip, Hint, ListLi, AiTag } from '@/components/ui';
import { Tabs } from '@/components/Tabs';
import { RadarSend } from '@/components/RadarSend';

export const dynamic = 'force-dynamic';

export default async function JornalismoPage() {
  const session = await requireModule('jornalismo');
  const [pautas, radar] = await Promise.all([
    sql`SELECT * FROM pautas WHERE tenant_id = ${session.tenantId} AND source = 'redacao' ORDER BY id`,
    sql`SELECT * FROM pautas WHERE tenant_id = ${session.tenantId} AND source = 'radar' ORDER BY id`,
  ]);
  const statusChip = (s: string) =>
    s === 'no-ar' ? <Chip tone="green">no ar</Chip> : s === 'producao' ? <Chip tone="amber">produção</Chip> : <Chip tone="blue">apurando</Chip>;

  return (
    <section className="view on">
      <Tabs
        tabs={[
          {
            id: 'pauta', label: 'Redação & Pauta',
            content: (
              <>
                <div className="cards g3" style={{ marginBottom: 8 }}>
                  <Kpi label="Matérias no ar hoje" value="28" delta="▲ 6" deltaTone="up" />
                  <Kpi label="Pautas em produção" value={String(pautas.filter((p) => p.status === 'producao').length)} delta="3 urgentes" tone="b2" />
                  <Kpi label="Boletins/hora" value="2" delta="grade jornalística" tone="y" />
                </div>
                <Card title="Espelho de pauta" right={<button className="btn sm p">+ Pauta</button>} pad0>
                  <table>
                    <thead><tr><th>Pauta</th><th>Editoria</th><th>Repórter</th><th>Status</th><th>Horário</th></tr></thead>
                    <tbody>
                      {pautas.map((p) => (
                        <tr key={p.id}>
                          <td className="b">{p.title}</td><td>{p.editoria}</td><td>{p.reporter || '—'}</td>
                          <td>{statusChip(p.status)}</td><td>{p.time_slot || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </>
            ),
          },
          {
            id: 'radar', label: <>Radar do Jornalista <AiTag /></>,
            content: (
              <>
                <Hint style={{ marginBottom: 16 }}>
                  <b>Radar do Jornalista (IA):</b> a IA faz a pesquisa pela redação — coleta educação + setor público, vira
                  pauta pronta e dispara no WhatsApp. Motor já rodando: <b>85 notícias reais</b> hoje.
                </Hint>
                <div className="cards g4" style={{ marginBottom: 8 }}>
                  <Kpi label="Notícias coletadas" value="85" delta="últimas 48h" />
                  <Kpi label="Pautas curadas" value={String(radar.length)} delta="prontas p/ enviar" deltaTone="up" tone="b2" />
                  <Kpi label="Jornalistas na base" value="1" delta="+ importar" tone="y" />
                  <Kpi label="Disparo WhatsApp" value="Meta" delta="template" tone="r" />
                </div>
                <div className="cards g2">
                  <Card title="Pautas de hoje (coleta real)" tag="educação municipal">
                    {radar.map((p, i) => (
                      <ListLi key={p.id} icoTone={['green', 'blue', 'teal', 'amber', 'red'][i % 5]} ico={p.title.slice(0, 1)} title={p.title} sub={p.meta} />
                    ))}
                  </Card>
                  <Card title="Disparo diário" tag="WhatsApp · Meta Cloud API">
                    <div style={{ background: 'rgba(37,194,87,.10)', border: '1px solid rgba(37,194,87,.35)', borderRadius: 12, padding: 14 }}>
                      <div className="b" style={{ marginBottom: 6 }}>Radar do Jornalista — {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div>
                      <div className="tiny">
                        Olá, Raphael — seu radar de hoje com <b>{radar.length} pautas quentes</b> de educação e setor público, prontas pra publicar:
                        <br /><br />
                        {radar.slice(0, 2).map((p, i) => <span key={p.id}>{i + 1}. {p.title}…<br /></span>)}
                        <br />Publicou? Marque a Metropolitana e amplie seu alcance.
                      </div>
                    </div>
                    <RadarSend />
                    <div className="tiny muted" style={{ marginTop: 8 }}>Pipeline: scraping → curadoria (IA) → template Meta.</div>
                  </Card>
                </div>
              </>
            ),
          },
          {
            id: 'esportes', label: 'Esportes',
            content: (
              <Card title="Cobertura esportiva" tag="agenda" pad0>
                <table>
                  <thead><tr><th>Evento</th><th>Modalidade</th><th>Narrador</th><th>Horário</th></tr></thead>
                  <tbody>
                    <tr><td className="b">Campeonato — jogo da rodada</td><td>Futebol</td><td>Time A</td><td>16:00</td></tr>
                    <tr><td className="b">Mesa redonda esportiva</td><td>Debate</td><td>Bancada</td><td>19:00</td></tr>
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
