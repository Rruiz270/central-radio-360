import Link from 'next/link';
import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Hint, SecTitle } from '@/components/ui';
import { brlShort } from '@/lib/esteira';

export const dynamic = 'force-dynamic';

export default async function PIListPage() {
  await requireModule('comercial');
  const rows = await sql`
    SELECT pi.*,
      (SELECT COALESCE(sum(i.qty * i.rate * (1-i.discount) * (1-i.commission)),0) FROM io_items i WHERE i.pi_id = pi.id) AS net,
      (SELECT COALESCE(sum(i.qty * i.rate * (1-i.discount) * (1-i.commission)),0) FROM io_items i WHERE i.pi_id = pi.id AND i.scope='agencia') AS net_ag,
      (SELECT count(*)::int FROM io_items i WHERE i.pi_id = pi.id) AS itens,
      (SELECT d.id FROM distributions d WHERE d.pi_id = pi.id) AS pd_id,
      (SELECT d.code FROM distributions d WHERE d.pi_id = pi.id) AS pd_code,
      (SELECT count(DISTINCT di.tenant_id)::int FROM distribution_items di
         JOIN distributions d ON d.id = di.pd_id WHERE d.pi_id = pi.id) AS pracas
    FROM insertion_orders pi ORDER BY pi.id DESC`;

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        A <b>P.I.</b> é o documento do Comercial e a chave de tudo: PD, O.S., CP e PV carregam o número dela.
        Ela já sai desmembrada entre <b>veiculação na rádio</b> e <b>ativação da agência</b>.
      </Hint>
      <SecTitle>Pedidos de Inserção</SecTitle>
      <div className="card"><div className="bd" style={{ padding: 0 }}>
        <div className="sheet" style={{ border: 0, borderRadius: 16 }}>
          <table>
            <thead><tr>
              <th>Nº P.I.</th><th>Cliente</th><th>Agência</th><th>Executivo</th><th>Período</th>
              <th className="num">Itens</th><th className="num">Líquido total</th><th className="num">do qual agência</th>
              <th className="num">Praças</th><th>PD</th><th>Status</th>
            </tr></thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={11} className="muted" style={{ padding: 22, textAlign: 'center' }}>
                  Nenhuma P.I. emitida. Elas nascem do fechamento de um PO.
                </td></tr>
              )}
              {rows.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/esteira/pi/${p.id}`} className="b" style={{ color: '#8fa8ff' }}>{p.code}</Link></td>
                  <td className="b">{p.client}</td>
                  <td>{p.agency || '—'}</td>
                  <td>{p.executive || '—'}</td>
                  <td className="tiny">{p.period || '—'}</td>
                  <td className="num">{p.itens}</td>
                  <td className="num b">{brlShort(p.net)}</td>
                  <td className="num">{Number(p.net_ag) ? <span className="chip c-red">{brlShort(p.net_ag)}</span> : '—'}</td>
                  <td className="num">{p.pracas || '—'}</td>
                  <td>{p.pd_id
                    ? <Link href={`/esteira/pd/${p.pd_id}`} className="chip c-teal">{p.pd_code}</Link>
                    : <span className="muted tiny">—</span>}</td>
                  <td><span className={`chip c-${p.status === 'rascunho' ? 'amber' : 'green'}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div></div>
    </section>
  );
}
