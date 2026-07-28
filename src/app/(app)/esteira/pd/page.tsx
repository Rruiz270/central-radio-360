import Link from 'next/link';
import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Hint, SecTitle } from '@/components/ui';
import { brlShort } from '@/lib/esteira';

export const dynamic = 'force-dynamic';

export default async function PDListPage() {
  const session = await requireModule('comercial');
  const afiliada = session.role === 'afiliada';
  const rows = await sql`
    SELECT d.*, pi.code AS pi_code, pi.client, pi.id AS pi_id,
      (SELECT count(DISTINCT di.tenant_id)::int FROM distribution_items di WHERE di.pd_id = d.id) AS pracas,
      (SELECT COALESCE(sum(di.qty*di.rate*(1-di.discount)*(1-di.commission)),0) FROM distribution_items di WHERE di.pd_id = d.id) AS net,
      (SELECT count(*)::int FROM service_orders o WHERE o.pd_id = d.id) AS os
    FROM distributions d JOIN insertion_orders pi ON pi.id = d.pi_id
    ${afiliada
      ? sql`WHERE EXISTS (SELECT 1 FROM distribution_items di WHERE di.pd_id = d.id AND di.tenant_id = ${session.tenantId})`
      : sql``}
    ORDER BY d.id DESC`;

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        A <b>PD</b> reparte a P.I. entre as praças da rede e entre os departamentos. Cada praça é um tenant:
        a afiliada enxerga só a aba dela, e o valor de tabela sai do rate card local — não de um número colado.
      </Hint>
      <SecTitle>Planilhas de Distribuição</SecTitle>
      <div className="card"><div className="bd" style={{ padding: 0 }}>
        <div className="sheet" style={{ border: 0, borderRadius: 16 }}>
          <table>
            <thead><tr>
              <th>Código</th><th>P.I.</th><th>Cliente</th><th>Projeto</th>
              <th className="num">Praças</th><th className="num">Líquido</th><th className="num">O.S. geradas</th><th>Status</th>
            </tr></thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="muted" style={{ padding: 22, textAlign: 'center' }}>
                  Nenhuma distribuição. Ela nasce ao distribuir uma P.I. emitida.
                </td></tr>
              )}
              {rows.map((d) => (
                <tr key={d.id}>
                  <td><Link href={`/esteira/pd/${d.id}`} className="b" style={{ color: '#8fa8ff' }}>{d.code}</Link></td>
                  <td><Link href={`/esteira/pi/${d.pi_id}`} className="chip c-blue">{d.pi_code}</Link></td>
                  <td className="b">{d.client}</td>
                  <td className="tiny muted">{d.project || '—'}</td>
                  <td className="num">{d.pracas}</td>
                  <td className="num b">{brlShort(d.net)}</td>
                  <td className="num">{d.os || '—'}</td>
                  <td><span className={`chip c-${d.status === 'autorizada' ? 'green' : 'amber'}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div></div>
    </section>
  );
}
