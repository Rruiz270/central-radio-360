import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Kpi, SecTitle, Card, Chip, Hint, BarRow, AiTag, WoTag, fmtBRL } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function FinanceiroPage() {
  const session = await requireModule('financeiro');
  const t = session.tenantId;
  const [invoices, recv, rates] = await Promise.all([
    sql`SELECT * FROM invoices WHERE tenant_id = ${t} ORDER BY id`,
    sql`SELECT * FROM receivables WHERE tenant_id = ${t} ORDER BY days_overdue DESC`,
    sql`SELECT * FROM rate_card WHERE tenant_id = ${t} ORDER BY id`,
  ]);
  const aReceber = recv.filter((r) => r.status === 'aberto').reduce((a, r) => a + Number(r.value), 0);
  const emRisco = recv.filter((r) => r.risk === 'alto').reduce((a, r) => a + Number(r.value), 0);
  const aging = [
    ['0–15 dias', recv.filter((r) => r.days_overdue <= 15 && r.days_overdue > 0)],
    ['16–30 dias', recv.filter((r) => r.days_overdue > 15 && r.days_overdue <= 30)],
    ['30+ dias', recv.filter((r) => r.days_overdue > 30)],
  ] as const;

  return (
    <section className="view on">
      <div className="cards g4" style={{ marginBottom: 8 }}>
        <Kpi label="Receita (mês)" value="R$ 486k" delta="▲ 14%" deltaTone="up" />
        <Kpi label="A receber" value={fmtBRL(aReceber)} delta={`${recv.length} títulos`} tone="b2" />
        <Kpi label="A pagar" value="R$ 138k" delta="fornec. + folha" tone="y" />
        <Kpi label="Margem por ação" value="41%" delta="▲ 3 pts" deltaTone="up" tone="r" />
      </div>
      <div className="cards g2">
        <Card title="Receita por origem">
          <BarRow label="Spots / grade comercial" value="R$ 240k" pct={100} />
          <BarRow label="Ações offline (agência)" value="R$ 186k" pct={78} />
          <BarRow label="Eventos / patrocínios / digital" value="R$ 60k" pct={25} />
        </Card>
        <Card title="Yield — precificação de inventário" right={<AiTag />}>
          <Hint tone="y" style={{ marginBottom: 12 }}>
            <b>Padrão americano (MaximRMS):</b> precifica o inventário como companhia aérea — mais demanda + menos espaço = preço sobe.
          </Hint>
          <table>
            <thead><tr><th>Faixa</th><th>Ocupação</th><th>Preço 30&quot;</th><th>Sugestão IA</th></tr></thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id}>
                  <td className="b">{r.daypart}</td><td>{r.occupancy}%</td><td>R$ {Number(r.price_30).toFixed(0)}</td>
                  <td><Chip tone={r.ai_hint?.startsWith('▲') ? 'green' : r.ai_hint?.startsWith('▼') ? 'amber' : 'gray'}>{r.ai_hint}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <SecTitle right={<WoTag />}>Faturamento (Invoice)</SecTitle>
      <div className="cards g2" style={{ marginBottom: 16 }}>
        <Card
          title="Geração de faturas"
          right={<div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}><button className="btn sm">Em lote (batch)</button><button className="btn sm p">On-demand</button></div>}
          pad0
        >
          <table>
            <thead><tr><th>Cliente</th><th>Período</th><th>Valor</th><th>e-Invoice</th><th>Status</th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td className="b">{i.client}</td><td>{i.period}</td><td>{fmtBRL(Number(i.value))}</td>
                  <td>{i.einvoice === 'emitida' ? <Chip tone="green">NFS-e emitida</Chip> : <Chip tone="gray">pendente</Chip>}</td>
                  <td>
                    {i.status === 'paga' ? <Chip tone="green">paga</Chip>
                      : i.status === 'vencida' ? <Chip tone="red">vencida</Chip>
                      : <Chip tone="blue">aberta</Chip>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Spot preemptado" tag="tratamento">
          <div className="tiny muted" style={{ marginBottom: 10 }}>
            Spot que não foi ao ar (preempt) nunca vira fatura errada: o sistema oferece <b>crédito</b> ou{' '}
            <b>make-good</b> (reveiculação) antes de faturar. <WoTag />
          </div>
          <div className="steps">
            <div className="step done"><span className="n">✓</span> Preempt detectado (log)</div><span className="arrow">→</span>
            <div className="step now"><span className="n">2</span> Crédito ou make-good</div><span className="arrow">→</span>
            <div className="step"><span className="n">3</span> Fatura ajustada</div>
          </div>
          <Hint style={{ marginTop: 12 }}>Integrações Omie / Vindi / Pagar.me alimentam a conciliação automática (motores do Better já validados).</Hint>
        </Card>
      </div>

      <SecTitle right={<AiTag>Delinquency Radar IA</AiTag>}>Aging & Cobrança</SecTitle>
      <div className="cards g2">
        <Card title="Aging por faixa">
          {aging.map(([label, items]) => (
            <BarRow
              key={label}
              label={label as string}
              value={fmtBRL(items.reduce((a, r) => a + Number(r.value), 0))}
              pct={Math.min(100, items.length * 34)}
              red={label === '30+ dias'}
            />
          ))}
          <Hint tone="r" style={{ marginTop: 10 }}>
            Risco alto: <b>{fmtBRL(emRisco)}</b> — régua de cobrança automática no WhatsApp já acionada.
          </Hint>
        </Card>
        <Card title="Cobrança & statements" pad0>
          <table>
            <thead><tr><th>Cliente</th><th>Valor</th><th>Atraso</th><th>Risco IA</th></tr></thead>
            <tbody>
              {recv.map((r) => (
                <tr key={r.id}>
                  <td className="b">{r.client}</td><td>{fmtBRL(Number(r.value))}</td>
                  <td>{r.days_overdue > 0 ? `${r.days_overdue} dias` : 'em dia'}</td>
                  <td>
                    {r.risk === 'alto' ? <Chip tone="red">alto — cobrar</Chip>
                      : r.risk === 'medio' ? <Chip tone="amber">médio</Chip>
                      : <Chip tone="green">baixo</Chip>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </section>
  );
}
