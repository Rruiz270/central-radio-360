import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Kpi, SecTitle, Card, Chip, Hint, BarRow, Bar, fmtBRL } from '@/components/ui';

export const dynamic = 'force-dynamic';

const FASES = ['—', 'Diagnóstico', 'Coexistência', 'Espelhar dados', 'Playout piloto', 'Cutover', 'Completo'];

function fmtK(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')}M` : `${Math.round(n / 1000)}k`;
}

export default async function RedePage() {
  await requireModule('rede');
  const tenants = await sql`SELECT * FROM tenants ORDER BY is_hq DESC, listeners DESC`;
  const c360 = tenants.filter((t) => t.system === 'c360');
  const audSum = tenants.reduce((a, t) => a + Number(t.listeners), 0);

  const dotCls = (t: Record<string, unknown>) =>
    t.is_hq ? 'matriz' : t.system === 'c360' ? 'c360' : t.system === 'migrando' ? 'mig' : 'pulsar';

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        <b>Rede Metropolitana — a 98.5 é a matriz</b> e controla todas as afiliadas. Hoje elas usam o Pulsar isolado; a
        Central 360 unifica programação, comercial e dados de toda a rede num só lugar.
      </Hint>
      <div className="cards g4" style={{ marginBottom: 8 }}>
        <Kpi label="Afiliadas" value={String(tenants.length)} delta="14 estados" />
        <Kpi label="No ar agora" value={String(tenants.length - 1)} delta="1 em manutenção" deltaTone="down" tone="b2" />
        <Kpi label="Migradas p/ Central 360" value={String(c360.length)} delta="meta: todas até dez" deltaTone="up" tone="y" />
        <Kpi label="Audiência somada" value={fmtK(audSum)} delta="ouvintes/dia" deltaTone="up" tone="r" />
      </div>

      <SecTitle right={<span className="tiny muted">status por praça</span>}>Mapa da rede — Brasil</SecTitle>
      <Card style={{ marginBottom: 16 }}>
        <div className="mapwrap">
          <div>
            <svg className="mapbr" viewBox="0 0 240 236" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="landg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#13215f" /><stop offset="1" stopColor="#0a1233" />
                </linearGradient>
                <pattern id="mdots" width="7" height="7" patternUnits="userSpaceOnUse">
                  <circle cx="1.2" cy="1.2" r=".9" fill="rgba(122,150,255,.25)" />
                </pattern>
              </defs>
              <path className="land" d="M78,16 L100,8 L114,20 L130,26 L150,33 L167,43 L186,53 L193,66 L187,84 L177,101 L169,121 L159,139 L142,151 L130,167 L124,183 L113,200 L101,211 L92,197 L96,179 L86,168 L77,151 L63,141 L57,119 L36,111 L31,97 L45,85 L38,69 L51,53 L65,41 L71,27 Z" />
              <path className="landdots" d="M78,16 L100,8 L114,20 L130,26 L150,33 L167,43 L186,53 L193,66 L187,84 L177,101 L169,121 L159,139 L142,151 L130,167 L124,183 L113,200 L101,211 L92,197 L96,179 L86,168 L77,151 L63,141 L57,119 L36,111 L31,97 L45,85 L38,69 L51,53 L65,41 L71,27 Z" fill="url(#mdots)" />
              <g className="beams">
                {tenants.filter((t) => !t.is_hq).map((t) => (
                  <path key={t.id} className="beam" d={`M137,150 Q${(137 + Number(t.map_x)) / 2 + 12},${(150 + Number(t.map_y)) / 2 - 20} ${t.map_x},${t.map_y}`} />
                ))}
              </g>
              {tenants.map((t) => (
                <g key={t.id} className={`mapdot ${dotCls(t)}`} transform={`translate(${t.map_x},${t.map_y})`}>
                  <circle className="rip" r={t.is_hq ? 8 : 6}>
                    <animate attributeName="r" values={t.is_hq ? '7;20' : '5;14'} dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values=".6;0" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                  <circle r={t.is_hq ? 7 : 5} />
                  <text x={Number(t.map_x) > 150 ? -10 : 10} y="4" textAnchor={Number(t.map_x) > 150 ? 'end' : 'start'}>
                    {t.freq}{t.is_hq ? ' SP' : ''}
                  </text>
                </g>
              ))}
            </svg>
            <div className="maplegend">
              <span><i style={{ background: '#3d5eff' }} />Matriz</span>
              <span><i style={{ background: '#25c257' }} />Central 360</span>
              <span><i style={{ background: '#ffe200' }} />Migrando</span>
              <span><i style={{ background: '#8791ab' }} />Pulsar</span>
            </div>
          </div>
          <div>
            <b className="disp" style={{ fontSize: 15 }}>Cobertura nacional</b>
            <div className="tiny muted" style={{ marginBottom: 12 }}>{tenants.length} praças · a matriz 98.5 controla todas</div>
            <table>
              <thead><tr><th>Praça</th><th>Ouvintes</th><th>Sistema</th></tr></thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id}>
                    <td className="b">{t.is_hq ? 'Matriz 98.5 SP' : `${t.city} ${t.freq}`}</td>
                    <td>{fmtK(Number(t.listeners))}</td>
                    <td>
                      {t.system === 'c360' ? <Chip tone={t.is_hq ? 'blue' : 'green'}>360</Chip>
                        : t.system === 'migrando' ? <Chip tone="amber">migrando</Chip>
                        : <Chip tone="gray">Pulsar</Chip>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <SecTitle right={<button className="btn sm p">+ Nova afiliada</button>}>Praças da rede</SecTitle>
      <div className="affgrid">
        {tenants.map((t) => (
          <div key={t.id} className={`aff ${t.is_hq ? 'matriz' : ''}`}>
            <div className="h">
              <div className="fq">{t.freq}<br />{t.uf}</div>
              <div><b>{t.name}</b><div className="tiny muted">{t.city} / {t.uf}</div></div>
              <span style={{ marginLeft: 'auto' }}>
                {t.is_hq ? <Chip tone="amber">Matriz</Chip>
                  : t.system === 'c360' ? <Chip tone="green">Central 360</Chip>
                  : t.system === 'migrando' ? <Chip tone="amber">Migrando</Chip>
                  : <Chip tone="gray">Pulsar</Chip>}
              </span>
            </div>
            <div className="mini">
              <div><div className="v">{fmtK(Number(t.listeners))}</div><div className="l">ouvintes</div></div>
              <div><div className="v">{fmtBRL(Number(t.revenue_month))}</div><div className="l">receita</div></div>
              <div><div className="v">{t.system === 'c360' ? 'no ar' : FASES[t.migration_phase]}</div><div className="l">{t.system === 'c360' ? 'status' : 'migração'}</div></div>
            </div>
          </div>
        ))}
      </div>

      <SecTitle right={<span className="tiny muted">o Pulsar não expõe API → coexistência + conector local</span>}>
        Migração Pulsar → Central 360
      </SecTitle>
      <Hint tone="y" style={{ marginBottom: 16 }}>
        <b>Estratégia:</b> consumir os dados do Pulsar por <b>conector local</b> (banco/export/log) e rodar os dois{' '}
        <b>em paralelo</b>. O 360 vira a fonte de BI e comercial primeiro; o playout só migra depois de validado. Zero risco de sair do ar.
      </Hint>
      <Card style={{ marginBottom: 16 }}>
        <div className="steps">
          {FASES.slice(1).map((f, i) => (
            <span key={f} style={{ display: 'contents' }}>
              <div className={`step ${i < 2 ? 'done' : i === 2 ? 'now' : ''}`}>
                <span className="n">{i < 2 ? '✓' : i + 1}</span> {i + 1}. {f}
              </div>
              {i < 5 && <span className="arrow">→</span>}
            </span>
          ))}
        </div>
      </Card>
      <div className="cards g2" style={{ marginBottom: 16 }}>
        <Card title="Como entram os dados (conector local)">
          <div className="check"><span className="box">✓</span> Export do acervo (músicas, intérpretes, categorias)</div>
          <div className="check"><span className="box">✓</span> Grade e restrições (dia×hora) importadas</div>
          <div className="check off"><span className="box">✓</span> Log de execução sincronizado por arquivo</div>
          <div className="check off"><span className="box">✓</span> Leitura do banco local (quando houver acesso)</div>
          <Hint style={{ marginTop: 12 }}>
            Se o diagnóstico achar exportação/DB acessível, a ingestão é automatizada via <code>POST /api/v1/ingest</code>; senão, importação assistida.
          </Hint>
        </Card>
        <Card title="Status por afiliada" tag="rollout" pad0>
          <table>
            <thead><tr><th>Praça</th><th>Fase</th><th>Progresso</th></tr></thead>
            <tbody>
              {tenants.filter((t) => !t.is_hq).map((t) => (
                <tr key={t.id}>
                  <td className="b">{t.city} · {t.freq}</td>
                  <td>{FASES[t.migration_phase]}</td>
                  <td><Bar pct={(t.migration_phase / 6) * 100} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </section>
  );
}
