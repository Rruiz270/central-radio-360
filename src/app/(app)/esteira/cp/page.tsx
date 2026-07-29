import Link from 'next/link';
import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Hint, SecTitle, Kpi } from '@/components/ui';
import { brlShort, num } from '@/lib/esteira';

export const dynamic = 'force-dynamic';

/* C.P. — Custo de Produção. A mesma planilha do PO, fechada com o gasto real. */
export default async function CPListPage() {
  await requireModule('financeiro');

  const rows = await sql`
    SELECT cp.*, po.code AS po_code, po.id AS po_id,
      (SELECT COALESCE(sum(qty*period*unit_price),0) FROM po_items WHERE po_id = cp.id) AS custo,
      (SELECT COALESCE(sum(qty*period*unit_price),0) FROM po_items WHERE po_id = cp.source_po_id) AS orcado,
      (SELECT COALESCE(sum(client_unit*client_qty*client_period),0) FROM po_items WHERE po_id = cp.id) AS faturado
    FROM purchase_orders cp
    LEFT JOIN purchase_orders po ON po.id = cp.source_po_id
    WHERE cp.kind = 'CP' ORDER BY cp.id DESC`;

  const custo = rows.reduce((a, r) => a + num(r.custo), 0);
  const orcado = rows.reduce((a, r) => a + num(r.orcado), 0);
  const desvio = orcado ? (custo - orcado) / orcado : 0;

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        <b>C.P. — Custo de Produção.</b> É a mesma planilha do orçamento, agora com o que foi de fato gasto:
        rubrica a rubrica, com honorários, encargos e mark up. A diferença entre o CP e o PO é a margem real do
        job. Não confundir com <Link href="/esteira/pecas" style={{ color: '#8fa8ff' }}>Produção de peças</Link>,
        que é roteiro e gravação.
      </Hint>

      <div className="cards g4" style={{ marginBottom: 16 }}>
        <Kpi label="Jobs fechados" value={String(rows.length)} />
        <Kpi label="Custo realizado" value={brlShort(custo)} tone="r" />
        <Kpi label="Custo orçado" value={brlShort(orcado)} tone="y" />
        <Kpi label="Desvio" value={orcado ? `${(desvio * 100).toFixed(1)}%` : '—'} tone="b2"
             delta={desvio <= 0 ? 'abaixo do orçado' : 'acima do orçado'} deltaTone={desvio <= 0 ? 'up' : 'down'} />
      </div>

      <SecTitle>Custos de Produção</SecTitle>
      <div className="card"><div className="bd" style={{ padding: 0 }}>
        <div className="sheet" style={{ border: 0, borderRadius: 16 }}>
          <table>
            <thead><tr>
              <th>Código</th><th>Orçamento</th><th>Cliente</th><th>Projeto</th><th>Evento</th>
              <th className="num">Orçado</th><th className="num">Realizado</th><th className="num">Desvio</th>
              <th className="num">Faturado</th><th>Status</th>
            </tr></thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={10} className="muted" style={{ padding: 22, textAlign: 'center' }}>
                  Nenhum custo fechado. O CP nasce de um <b>PO aprovado</b>, copiando a planilha inteira.
                </td></tr>
              )}
              {rows.map((c) => {
                const o = num(c.orcado), r = num(c.custo);
                const d = o ? (r - o) / o : 0;
                return (
                  <tr key={c.id}>
                    <td><Link href={`/esteira/po/${c.id}`} className="b" style={{ color: '#8fa8ff' }}>{c.code}</Link></td>
                    <td>{c.po_id
                      ? <Link href={`/esteira/po/${c.po_id}`} className="chip c-blue">{c.po_code}</Link>
                      : <span className="muted tiny">—</span>}</td>
                    <td className="b">{c.client}</td>
                    <td className="tiny muted">{c.project || '—'}</td>
                    <td className="tiny">{c.event_place || '—'}</td>
                    <td className="num">{o ? brlShort(o) : '—'}</td>
                    <td className="num b">{r ? brlShort(r) : '—'}</td>
                    <td className="num">{o
                      ? <span className={`chip c-${d <= 0 ? 'green' : d < 0.1 ? 'amber' : 'red'}`}>{(d * 100).toFixed(1)}%</span>
                      : '—'}</td>
                    <td className="num">{brlShort(c.faturado)}</td>
                    <td><span className={`chip c-${c.status === 'fechada' ? 'green' : 'amber'}`}>{c.status}</span></td>
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
