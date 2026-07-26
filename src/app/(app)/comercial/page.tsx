import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Kpi, Card, Chip, Hint, Bar, AiTag, WoTag, Mini, fmtBRL } from '@/components/ui';
import { Tabs } from '@/components/Tabs';
import { Kanban } from '@/components/Kanban';
import { BreakAllocator } from '@/components/BreakAllocator';
import { OrderForm } from '@/components/OrderForm';

export const dynamic = 'force-dynamic';

export default async function ComercialPage() {
  const session = await requireModule('comercial');
  const t = session.tenantId;
  const [deals, spots, breaks, prods, rates, orders] = await Promise.all([
    sql`SELECT id, advertiser, descr, value::text, stage, seller FROM deals WHERE tenant_id = ${t} AND pipeline = 'radio' ORDER BY id`,
    sql`SELECT id, advertiser, duration_sec, break_id FROM spots WHERE tenant_id = ${t} ORDER BY position, id`,
    sql`SELECT id, hour, limit_sec FROM breaks WHERE tenant_id = ${t} ORDER BY hour`,
    sql`SELECT * FROM spot_productions WHERE tenant_id = ${t} ORDER BY id`,
    sql`SELECT * FROM rate_card WHERE tenant_id = ${t} ORDER BY id`,
    sql`SELECT * FROM orders WHERE tenant_id = ${t} ORDER BY id DESC LIMIT 8`,
  ]);
  const dealsWithTarget = deals.length ? await sql`SELECT * FROM deals WHERE tenant_id = ${t} AND annual_target IS NOT NULL ORDER BY annual_target DESC` : [];
  const pipelineTotal = deals.filter((d) => !['Fechado'].includes(d.stage)).reduce((a, d) => a + parseFloat(d.value), 0);

  const stepIdx = (s: string) => ['Pedido', 'Roteiro', 'Gravação', 'Aprovação', 'No ar'].indexOf(s);

  return (
    <section className="view on">
      <Tabs
        tabs={[
          {
            id: 'kanban', label: 'Funil de Vendas (Kanban)',
            content: (
              <>
                <Hint style={{ marginBottom: 16 }}>
                  Arraste os cards entre as colunas para mover a venda no funil. Ao chegar em <b>Fechado</b>, dispara alerta
                  automático no WhatsApp para Comercial + Financeiro.
                </Hint>
                <div className="tiny muted" style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span><WoTag />&nbsp; prática trazida do WideOrbit Traffic</span>
                  <span><AiTag />&nbsp; diferencial exclusivo Central 360</span>
                </div>
                <Kanban deals={deals as never} stages={['Lead', 'Contato', 'Proposta', 'Fechado']} pipeline="radio" wonStage="Fechado" />
              </>
            ),
          },
          {
            id: 'orders', label: <>Pedidos & Avails <WoTag /></>,
            content: (
              <>
                <Hint style={{ marginBottom: 16 }}>
                  <b>Order Entry + Avails (padrão WideOrbit):</b> pedido com flight (período), inventário disponível por
                  daypart e sell-through — as regras batem no ponto de entrada.
                </Hint>
                <div className="cards g2">
                  <Card title="Novo pedido" right={<WoTag />}><OrderForm /></Card>
                  <div>
                    <Card title="Avails — inventário disponível" tag="próx. 7 dias" pad0 style={{ marginBottom: 14 }}>
                      <table>
                        <thead><tr><th>Daypart</th><th>Disponível</th><th>Vendido</th><th>Sell-through</th></tr></thead>
                        <tbody>
                          <tr><td className="b">Manhã 6–10h</td><td>18</td><td>62</td><td><Chip tone="green">78%</Chip></td></tr>
                          <tr><td className="b">Almoço 12–13h</td><td>4</td><td>44</td><td><Chip tone="amber">92%</Chip></td></tr>
                          <tr><td className="b">Drive 17–20h</td><td>22</td><td>58</td><td><Chip tone="green">72%</Chip></td></tr>
                          <tr><td className="b">Madrugada</td><td>96</td><td>12</td><td><Chip tone="gray">11%</Chip></td></tr>
                        </tbody>
                      </table>
                    </Card>
                    <Card title="Pedidos lançados" tag="recentes" pad0>
                      <table>
                        <thead><tr><th>Anunciante</th><th>Daypart</th><th>Inserções</th><th>Valor</th></tr></thead>
                        <tbody>
                          {orders.map((o) => (
                            <tr key={o.id}>
                              <td className="b">{o.advertiser}</td><td>{o.daypart}</td><td>{o.insertions}× {o.duration_sec}&quot;</td>
                              <td>{fmtBRL(Number(o.value))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
                  </div>
                </div>
              </>
            ),
          },
          {
            id: 'trafego', label: <>Tráfego & Log <WoTag /></>,
            content: (
              <>
                <Hint style={{ marginBottom: 16 }}>
                  <b>Grade de breaks editável (coração operacional):</b> arraste um spot para um break disponível. A{' '}
                  <b>minutagem ANATEL</b> de cada hora recalcula na hora — se estourar o limite, o servidor recusa e o break
                  avisa. No período eleitoral, os breaks do horário obrigatório são bloqueados automaticamente.
                </Hint>
                <Card
                  title="Alocação de spots nos breaks"
                  right={<><span className="chip c-amber" style={{ marginLeft: 'auto' }}>ANATEL · limite 3:00/break</span><button className="btn sm" style={{ marginLeft: 8 }}>Export automação (BXF)</button></>}
                >
                  <BreakAllocator spots={spots as never} breaks={breaks as never} />
                  <Hint style={{ marginTop: 6 }}>
                    O spot alocado cai automático na grade da Programação e no log de execução — <b>traffic-aware</b>, sem digitar duas vezes.
                  </Hint>
                </Card>
              </>
            ),
          },
          {
            id: 'rate', label: <>Rate Card & Pacing <WoTag /></>,
            content: (
              <div className="cards g2">
                <Card title="Rate Card / Pricing Grid" right={<WoTag />} pad0>
                  <table>
                    <thead><tr><th>Inventory / Daypart</th><th>Preço 30&quot;</th><th>Yield</th><th>Copilot IA</th></tr></thead>
                    <tbody>
                      {rates.map((r) => (
                        <tr key={r.id}>
                          <td className="b">{r.daypart}</td><td>R$ {Number(r.price_30).toFixed(0)}</td><td>{r.yield}</td>
                          <td><Chip tone={r.ai_hint?.startsWith('▲') ? 'green' : r.ai_hint?.startsWith('▼') ? 'amber' : 'gray'}>{r.ai_hint}</Chip></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
                <Card title="Pacing — booked vs. meta" tag="mês">
                  <div style={{ marginBottom: 12 }}>
                    <div className="tiny muted" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Vendido (booked)</span><span className="b">R$ 486k</span></div>
                    <Bar pct={82} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div className="tiny muted" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Meta do mês</span><span className="b">R$ 590k</span></div>
                    <div className="bar"><i style={{ width: '100%', opacity: 0.25 }} /></div>
                  </div>
                  <Mini items={[{ v: '82%', l: 'da meta' }, { v: '+14%', l: 'YoY' }, { v: 'R$ 104k', l: 'gap p/ meta' }]} />
                  <Hint tone="y" style={{ marginTop: 12 }}>
                    <AiTag /> Forecast: fechamento projetado <b>R$ 604k</b> (102% da meta) — ritmo atual + sazonalidade.
                  </Hint>
                </Card>
              </div>
            ),
          },
          {
            id: 'deal', label: <>Deal Mgmt <WoTag /></>,
            content: (
              <>
                <Hint style={{ marginBottom: 16 }}>
                  <b>Deal Management:</b> meta anual por anunciante ligada aos pedidos — o sistema compara o realizado com o
                  combinado e avisa o vendedor antes de perder o deal. <WoTag />
                </Hint>
                <div className="cards g3" style={{ marginBottom: 16 }}>
                  <Kpi label="Deals ativos" value={String(dealsWithTarget.length)} delta="anunciantes com meta" />
                  <Kpi label="Comprometido no ano" value="R$ 1,9M" delta="68% realizado" deltaTone="up" tone="b2" />
                  <Kpi label="Em risco" value="1" delta="abaixo do pace" deltaTone="down" tone="r" />
                </div>
                <Card title="Metas por anunciante" right={<button className="btn sm p">Novo deal</button>} pad0>
                  <table>
                    <thead><tr><th>Anunciante</th><th>Meta anual</th><th>Realizado</th><th>Pace</th><th>Status</th></tr></thead>
                    <tbody>
                      {dealsWithTarget.map((d) => {
                        const pct = Math.round((Number(d.realized) / Number(d.annual_target)) * 100);
                        return (
                          <tr key={d.id}>
                            <td className="b">{d.advertiser}</td>
                            <td>{fmtBRL(Number(d.annual_target))}</td>
                            <td>{fmtBRL(Number(d.realized))}</td>
                            <td><Bar pct={pct} width={120} red={pct < 40} /></td>
                            <td>{pct >= 60 ? <Chip tone="green">no ritmo</Chip> : pct >= 40 ? <Chip tone="amber">atenção</Chip> : <Chip tone="red">risco — alertar vendedor</Chip>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              </>
            ),
          },
          {
            id: 'spot', label: <>Produção de Spot <AiTag /></>,
            content: (
              <>
                <Hint tone="y" style={{ marginBottom: 16 }}>
                  <b>Workflow de produção de spot (padrão americano — vCreative):</b> do pedido do vendedor ao áudio no ar,
                  sem planilha. Cada etapa tem responsável e prazo.
                </Hint>
                <Card style={{ marginBottom: 16 }}>
                  <div className="steps">
                    {['Pedido (vendedor)', 'Roteiro', 'Gravação/Locução', 'Aprovação cliente', 'No ar (tráfego)'].map((s, i) => (
                      <span key={s} style={{ display: 'contents' }}>
                        <div className={`step ${i < 2 ? 'done' : i === 2 ? 'now' : ''}`}><span className="n">{i < 2 ? '✓' : i + 1}</span> {s}</div>
                        {i < 4 && <span className="arrow">→</span>}
                      </span>
                    ))}
                  </div>
                </Card>
                <Card title="Rodízio de copy (rotação de versões)" right={<WoTag />} pad0 style={{ marginBottom: 16 }}>
                  <table>
                    <thead><tr><th>Anunciante</th><th>Versões</th><th>Rotação</th><th>Status</th></tr></thead>
                    <tbody>
                      <tr><td className="b">Casas Bahia</td><td>V1 Ofertas · V2 Institucional</td><td>50% / 50%</td><td><Chip tone="green">ok</Chip></td></tr>
                      <tr><td className="b">Guaraná</td><td>V1 Verão</td><td>100%</td><td><Chip tone="amber">material vence 30/07</Chip></td></tr>
                    </tbody>
                  </table>
                </Card>
                <Card title="Spots em produção" right={<button className="btn sm p">+ Pedido de spot</button>} pad0>
                  <table>
                    <thead><tr><th>Cliente</th><th>Duração</th><th>Etapa</th><th>Responsável</th><th>Prazo</th></tr></thead>
                    <tbody>
                      {prods.map((p) => (
                        <tr key={p.id}>
                          <td className="b">{p.client}</td><td>{p.duration}</td>
                          <td><Chip tone={stepIdx(p.step) >= 4 ? 'green' : stepIdx(p.step) >= 2 ? 'amber' : 'blue'}>{p.step}</Chip></td>
                          <td>{p.owner}</td><td>{p.due}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </>
            ),
          },
          {
            id: 'pipe', label: 'Anunciantes',
            content: (
              <>
                <div className="cards g4" style={{ marginBottom: 8 }}>
                  <Kpi label="Propostas abertas" value={String(deals.filter((d) => d.stage !== 'Fechado').length)} delta={`${fmtBRL(pipelineTotal)} pipeline`} deltaTone="up" />
                  <Kpi label="Taxa de fechamento" value="38%" delta="▲ 5 pts" deltaTone="up" tone="b2" />
                  <Kpi label="Ticket médio / ação" value="R$ 22k" delta="estável" tone="y" />
                  <Kpi label="Anunciantes ativos" value="63" delta="▲ 4" deltaTone="up" tone="r" />
                </div>
                <Card title="Pipeline de propostas" right={<button className="btn sm p">+ Nova proposta</button>} pad0>
                  <table>
                    <thead><tr><th>Cliente</th><th>Formato</th><th>Valor</th><th>Vendedor</th><th>Etapa</th></tr></thead>
                    <tbody>
                      {deals.map((d) => (
                        <tr key={d.id}>
                          <td className="b">{d.advertiser}</td><td>{d.descr}</td><td>{fmtBRL(d.value)}</td>
                          <td>{(d as never as { seller?: string }).seller || '—'}</td>
                          <td><Chip tone={d.stage === 'Fechado' ? 'green' : d.stage === 'Proposta' ? 'blue' : 'gray'}>{d.stage}</Chip></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </>
            ),
          },
        ]}
      />
    </section>
  );
}
