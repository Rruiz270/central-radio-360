import Link from 'next/link';
import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Hint, SecTitle } from '@/components/ui';
import { brlShort } from '@/lib/esteira';

export const dynamic = 'force-dynamic';

export default async function PVListPage() {
  await requireModule('comercial');
  const rows = await sql`
    SELECT v.*, pi.code AS pi_code, pi.id AS pi_id,
      (SELECT COALESCE(sum(planned),0)::int FROM airing_deliveries d WHERE d.pv_id = v.id) AS planned,
      (SELECT COALESCE(sum(done),0)::int FROM airing_deliveries d WHERE d.pv_id = v.id) AS done,
      (SELECT count(DISTINCT tenant_id)::int FROM airing_deliveries d WHERE d.pv_id = v.id) AS pracas
    FROM airing_orders v JOIN insertion_orders pi ON pi.id = v.pi_id
    ORDER BY v.id DESC`;

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        O <b>PV</b> fecha o ciclo: autoriza a veiculação sob o contrato da Asa Mídia, acompanha a entrega praça a praça
        e devolve o realizado para o Financeiro e para o PO.
      </Hint>
      <SecTitle>Pedidos de Veiculação</SecTitle>
      <div className="card"><div className="bd" style={{ padding: 0 }}>
        <div className="sheet" style={{ border: 0, borderRadius: 16 }}>
          <table>
            <thead><tr>
              <th>Código</th><th>P.I.</th><th>Cliente</th><th>Campanha</th><th>Período</th>
              <th className="num">Praças</th><th className="num">Total</th><th style={{ minWidth: 150 }}>Entrega</th><th>Status</th>
            </tr></thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={9} className="muted" style={{ padding: 22, textAlign: 'center' }}>
                  Nenhum PV. Ele é emitido quando todas as peças do CP estão aprovadas.
                </td></tr>
              )}
              {rows.map((v) => {
                const pct = v.planned ? Math.round((Number(v.done) / Number(v.planned)) * 100) : 0;
                return (
                  <tr key={v.id}>
                    <td><Link href={`/esteira/pv/${v.id}`} className="b" style={{ color: '#8fa8ff' }}>{v.code}</Link></td>
                    <td><Link href={`/esteira/pi/${v.pi_id}`} className="chip c-blue">{v.pi_code}</Link></td>
                    <td className="b">{v.trade_name}</td>
                    <td className="tiny muted">{v.campaign || '—'}</td>
                    <td className="tiny">{v.period || '—'}</td>
                    <td className="num">{v.pracas}</td>
                    <td className="num b">{brlShort(v.total)}</td>
                    <td>
                      <div className="bar" style={{ width: 120 }}><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
                      <span className="tiny muted">{v.done}/{v.planned}</span>
                    </td>
                    <td><span className={`chip c-${v.status === 'encerrado' ? 'green' : v.status === 'rascunho' ? 'amber' : 'blue'}`}>{v.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div></div>
    </section>
  );
}
