import Link from 'next/link';
import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Hint, SecTitle } from '@/components/ui';
import { NovoPO } from '@/components/esteira/NovoPO';
import { brlShort } from '@/lib/esteira';

export const dynamic = 'force-dynamic';

export default async function POListPage() {
  await requireModule('financeiro');
  const rows = await sql`
    SELECT po.*,
      (SELECT count(*)::int FROM po_approvals a WHERE a.po_id = po.id AND NOT a.approved) AS pend,
      (SELECT COALESCE(sum(i.qty * i.period * i.unit_price),0) FROM po_items i WHERE i.po_id = po.id) AS custo,
      (SELECT cp.id FROM purchase_orders cp WHERE cp.source_po_id = po.id AND cp.kind = 'CP') AS cp_id,
      (SELECT pi.code FROM insertion_orders pi WHERE pi.po_id = po.id) AS pi_code,
      (SELECT pi.id FROM insertion_orders pi WHERE pi.po_id = po.id) AS pi_id
    FROM purchase_orders po WHERE po.kind = 'PO' ORDER BY po.id DESC`;

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        <b>Pedido de Orçamento</b> é o primeiro documento da esteira e mora no <b>Financeiro</b>. É a planilha
        orçamentária por rubricas (Criação, Espaço, Cenografia, Técnica, Operação, Equipe, Taxas), com o custo
        interno de um lado e o faturamento ao cliente do outro — honorários, encargos e mark up. Sem as quatro
        assinaturas — Diretoria, Financeiro, R.H. e Operações — a P.I. não sai.
      </Hint>
      <SecTitle right={<NovoPO />}>Orçamentos</SecTitle>
      <div className="card"><div className="bd" style={{ padding: 0 }}>
        <div className="sheet" style={{ border: 0, borderRadius: 16 }}>
          <table>
            <thead><tr>
              <th>Código</th><th>Cliente</th><th>Prospecção</th><th>Período</th>
              <th className="num">Receita</th><th className="num">Custo</th><th className="num">Margem</th>
              <th>Assinaturas</th><th>P.I.</th><th>C.P.</th>
            </tr></thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={10} className="muted" style={{ padding: 22, textAlign: 'center' }}>
                  Nenhum orçamento aberto ainda.
                </td></tr>
              )}
              {rows.map((p) => {
                const rec = Number(p.revenue), cus = Number(p.custo);
                const mg = rec > 0 ? Math.round((1 - cus / rec) * 100) : null;
                return (
                  <tr key={p.id}>
                    <td><Link href={`/esteira/po/${p.id}`} className="b" style={{ color: '#8fa8ff' }}>{p.code}</Link></td>
                    <td className="b">{p.client}</td>
                    <td className="tiny muted">{p.prospect || '—'}</td>
                    <td>{p.period || '—'}</td>
                    <td className="num">{rec ? brlShort(rec) : '—'}</td>
                    <td className="num">{cus ? brlShort(cus) : '—'}</td>
                    <td className="num b">{mg === null ? '—' : `${mg}%`}</td>
                    <td>{p.pend
                      ? <span className="chip c-amber">{p.pend} pendente(s)</span>
                      : <span className="chip c-green">4 de 4</span>}</td>
                    <td>{p.pi_id
                      ? <Link href={`/esteira/pi/${p.pi_id}`} className="chip c-blue">{p.pi_code}</Link>
                      : <span className="muted tiny">—</span>}</td>
                    <td>{p.cp_id
                      ? <Link href={`/esteira/po/${p.cp_id}`} className="chip c-amber">fechado</Link>
                      : <span className="muted tiny">a fechar</span>}</td>
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
