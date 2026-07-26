import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Kpi, Card, Chip, Hint, BarRow, fmtBRL } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function MonetizacaoPage() {
  const session = await requireModule('monetizacao');
  const [own, rede] = await Promise.all([
    sql`SELECT * FROM social_revenue WHERE tenant_id = ${session.tenantId} ORDER BY value DESC`,
    sql`SELECT t.name, t.freq, t.uf, COALESCE(SUM(r.value),0)::numeric v
        FROM tenants t LEFT JOIN social_revenue r ON r.tenant_id = t.id
        GROUP BY t.id ORDER BY v DESC`,
  ]);
  const total = own.reduce((a, r) => a + Number(r.value), 0);
  const max = Math.max(...own.map((r) => Number(r.value)), 1);

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        <b>Monetização / remuneração das mídias sociais</b> integrada ao sistema: receita de cada plataforma (AdSense, bônus
        de reels, fundo do TikTok, live gifts) consolidada e ligada ao Financeiro.
      </Hint>
      <div className="cards g4" style={{ marginBottom: 8 }}>
        <Kpi label="Receita social (mês)" value={fmtBRL(total)} delta="▲ 18%" deltaTone="up" />
        {own.slice(0, 3).map((r, i) => (
          <Kpi key={r.id} label={r.platform} value={fmtBRL(Number(r.value))} delta="▲" deltaTone="up" tone={(['b2', 'y', 'r'] as const)[i]} />
        ))}
      </div>
      <div className="cards g2">
        <Card title="Receita por plataforma">
          {own.map((r) => (
            <BarRow key={r.id} label={r.platform} value={fmtBRL(Number(r.value))} pct={(Number(r.value) / max) * 100} />
          ))}
          <Hint style={{ marginTop: 14 }}>Integra com o <b>Financeiro</b> como uma nova origem de receita, por praça.</Hint>
        </Card>
        <Card title="Monetização por afiliada" tag="rede" pad0>
          <table>
            <thead><tr><th>Praça</th><th>Social/mês</th><th>Tendência</th></tr></thead>
            <tbody>
              {rede.filter((r) => Number(r.v) > 0).map((r) => (
                <tr key={r.name}>
                  <td className="b">{r.name} · {r.freq}</td><td>{fmtBRL(Number(r.v))}</td>
                  <td><Chip tone="green">▲</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </section>
  );
}
