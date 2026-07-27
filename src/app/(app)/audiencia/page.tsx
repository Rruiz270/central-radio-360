import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Kpi, SecTitle, Card, Chip, Hint, Bar } from '@/components/ui';
import { Tabs } from '@/components/Tabs';

export const dynamic = 'force-dynamic';

const STATIONS = ['Metropolitana', 'Jovem Pan FM', 'Mix FM', 'Band FM', '89 FM', 'Antena 1'];
const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')}k` : String(n));

type Row = { source: string; block: string; segment: string; station: string; value: string; unit: string; pos: number };

function bySegment(rows: Row[], block: string) {
  const map = new Map<string, Record<string, number>>();
  rows.filter((r) => r.block === block).forEach((r) => {
    if (!map.has(r.segment)) map.set(r.segment, {});
    map.get(r.segment)![r.station] = Number(r.value);
  });
  return [...map.entries()];
}

function MatrixTable({ data, unit = '%', highlightBest = true }: { data: [string, Record<string, number>][]; unit?: string; highlightBest?: boolean }) {
  return (
    <table>
      <thead>
        <tr><th>Público / Segmento</th>{STATIONS.map((s) => <th key={s} style={s === 'Metropolitana' ? { background: '#0020b8' } : undefined}>{s}</th>)}</tr>
      </thead>
      <tbody>
        {data.map(([seg, vals]) => {
          const max = Math.max(...STATIONS.map((s) => vals[s] || 0));
          return (
            <tr key={seg}>
              <td className="b">{seg}</td>
              {STATIONS.map((s) => {
                const v = vals[s] ?? 0;
                const isMetro = s === 'Metropolitana';
                const lider = highlightBest && v === max && v > 0;
                return (
                  <td key={s} style={isMetro ? { background: 'rgba(0,32,184,.05)', fontWeight: 700 } : undefined}>
                    {v}{unit === '%' ? '%' : ''} {lider && <span className="chip c-green" style={{ marginLeft: 4, padding: '1px 7px' }}>líder</span>}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ShareBars({ vals }: { vals: Record<string, number> }) {
  const max = Math.max(...Object.values(vals), 1);
  return (
    <div>
      {STATIONS.map((s) => (
        <div key={s} style={{ marginBottom: 10 }}>
          <div className="tiny muted" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={s === 'Metropolitana' ? { fontWeight: 800, color: 'var(--mblue-l)' } : undefined}>{s}</span>
            <span className="b">{vals[s] ?? 0}%</span>
          </div>
          <Bar pct={((vals[s] ?? 0) / max) * 100} yellow={s === 'Metropolitana'} />
        </div>
      ))}
    </div>
  );
}

export default async function AudienciaPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const session = await requireModule('dash');
  const { f } = await searchParams;
  const rows = (await sql`SELECT * FROM audience_data WHERE tenant_id = ${session.tenantId} ORDER BY pos`) as unknown as Row[];
  const kantar = rows.filter((r) => r.source === 'kantar');
  const triton = rows.filter((r) => r.source === 'triton');
  const nextdial = rows.filter((r) => r.source === 'nextdial');

  const totalShare = bySegment(kantar, 'share_total')[0]?.[1] || {};
  const metroShare = totalShare['Metropolitana'] || 0;
  const rank = 1 + STATIONS.filter((s) => (totalShare[s] || 0) > metroShare).length;
  const alcance = bySegment(kantar, 'alcance')[0]?.[1] || {};
  const streamNow = bySegment(triton, 'stream_now')[0]?.[1] || {};
  const tsl = bySegment(triton, 'tsl')[0]?.[1] || {};
  const publico = bySegment(kantar, 'share_publico');
  const jovem = publico.find(([s]) => s === '10-19 anos')?.[1] || {};
  const metroLideraJovem = (jovem['Metropolitana'] || 0) === Math.max(...Object.values(jovem));
  const curve = bySegment(triton, 'stream_curve').map(([h, v]) => ({ h, v: v['Metropolitana'] || 0 }));
  const maxCurve = Math.max(...curve.map((c) => c.v), 1);

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        <b>Audiência — fontes plugadas por praça:</b> Kantar IBOPE (a "moeda" de negociação), Triton (streaming) e
        Nextdial (áudio digital). Metro vs. principais concorrentes no topo, lista completa por público embaixo.
      </Hint>

      <div className="cards g4" style={{ marginBottom: 8 }}>
        <Kpi label="Share Metro (total dia)" value={`${metroShare}%`} delta={`#${rank} geral na praça`} deltaTone={rank <= 3 ? 'up' : 'flat'} />
        <Kpi label="Segmento jovem 10-19" value={`${jovem['Metropolitana'] || 0}%`} delta={metroLideraJovem ? '1º lugar — liderança' : 'disputando'} deltaTone="up" tone="y" />
        <Kpi label="Alcance/dia" value={`${((alcance['Metropolitana'] || 0) / 1000).toFixed(1).replace('.', ',')}M`} delta="Kantar" tone="b2" />
        <Kpi label="Streaming agora" value={fmtK(streamNow['Metropolitana'] || 0)} delta={`TSL ${tsl['Metropolitana'] || 0} min`} deltaTone="up" tone="r" />
      </div>

      <Tabs
        initial={f === 'triton' ? 'triton' : f === 'nextdial' ? 'nextdial' : 'kantar'}
        tabs={[
          {
            id: 'kantar', label: 'Kantar IBOPE Media',
            content: (
              <>
                <div className="cards g2" style={{ marginBottom: 8 }}>
                  <Card title="Share total do dia — Metro vs. concorrentes" tag="05h–05h · AM/FM">
                    <ShareBars vals={totalShare} />
                  </Card>
                  <Card title="Share por faixa horária" pad0>
                    <MatrixTable data={bySegment(kantar, 'share_daypart')} />
                  </Card>
                </div>
                <SecTitle right={<span className="tiny muted">verde = líder do segmento</span>}>Lista completa por público</SecTitle>
                <Card pad0>
                  <MatrixTable data={publico} />
                </Card>
                <Card pad0 style={{ marginTop: 14 }}>
                  <MatrixTable data={bySegment(kantar, 'alcance')} unit="mil" />
                </Card>
                <Hint tone="y" style={{ marginTop: 14 }}>
                  <b>Base demonstrativa</b> no formato do Client Center. Com o <b>contrato Kantar da praça</b>, o import
                  mensal (Easymedia/Client Center) substitui estes números pelos oficiais — a tela já está pronta.
                </Hint>
              </>
            ),
          },
          {
            id: 'triton', label: 'Triton Digital',
            content: (
              <>
                <div className="cards g2" style={{ marginBottom: 8 }}>
                  <Card title="Ouvintes simultâneos agora — Metro vs. concorrentes" tag="webcast metrics">
                    {STATIONS.map((s) => (
                      <div key={s} style={{ marginBottom: 10 }}>
                        <div className="tiny muted" style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={s === 'Metropolitana' ? { fontWeight: 800, color: 'var(--mblue-l)' } : undefined}>{s}</span>
                          <span className="b">{fmtK(streamNow[s] || 0)}</span>
                        </div>
                        <Bar pct={((streamNow[s] || 0) / Math.max(...Object.values(streamNow), 1)) * 100} yellow={s === 'Metropolitana'} />
                      </div>
                    ))}
                  </Card>
                  <Card title="Curva do dia — Metropolitana" tag="ouvintes simultâneos">
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 150, padding: '10px 0' }}>
                      {curve.map((c) => (
                        <div key={c.h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <div className="tiny muted" style={{ fontSize: 9 }}>{fmtK(c.v)}</div>
                          <div style={{ width: '100%', height: `${(c.v / maxCurve) * 100}%`, minHeight: 4, borderRadius: 4, background: 'linear-gradient(180deg,#00c2ff,#2447ff)' }} />
                          <div className="tiny muted" style={{ fontSize: 9 }}>{c.h}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
                <SecTitle>Tempo médio de escuta (TSL)</SecTitle>
                <Card pad0><MatrixTable data={bySegment(triton, 'tsl')} unit="min" /></Card>
                <Hint style={{ marginTop: 14 }}>
                  Números demonstrativos no formato Webcast Metrics. Com a credencial Triton da emissora (ou o Icecast
                  próprio da fase de playout), esta tela passa a bater em <b>tempo real</b>.
                </Hint>
              </>
            ),
          },
          {
            id: 'nextdial', label: 'Nextdial',
            content: (
              <>
                <div className="cards g2" style={{ marginBottom: 8 }}>
                  <Card title="Onde ouvem — dispositivos (% do streaming)" pad0>
                    <MatrixTable data={bySegment(nextdial, 'devices')} />
                  </Card>
                  <Card title="Cidades — streaming da Metropolitana" tag="top praças">
                    {bySegment(nextdial, 'cidades').map(([cid, v]) => (
                      <div key={cid} style={{ marginBottom: 10 }}>
                        <div className="tiny muted" style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{cid}</span><span className="b">{v['Metropolitana']}%</span>
                        </div>
                        <Bar pct={v['Metropolitana'] || 0} />
                      </div>
                    ))}
                  </Card>
                </div>
                <Hint style={{ marginTop: 6 }}>
                  Aferição de áudio digital (formato Nextdial). Vira coleta automática com a credencial da emissora.
                </Hint>
              </>
            ),
          },
        ]}
      />
      <div className="tiny muted" style={{ marginTop: 16 }}>
        Complementos já reais nesta praça: população IBGE e popularidade digital Radio-Browser no módulo{' '}
        <a href="/concorrencia" style={{ color: 'var(--mblue-l)', fontWeight: 700 }}>Concorrência</a>.
      </div>
    </section>
  );
}
