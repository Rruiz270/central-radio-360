import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { DocHead, HG, Chain } from '@/components/esteira/DocUI';
import { PoApprovals, type PoApproval } from '@/components/esteira/PoApprovals';
import { SheetEditor, type SheetItem } from '@/components/esteira/SheetEditor';
import { canCreate, num } from '@/lib/esteira';

export const dynamic = 'force-dynamic';

/* Serve para o PO (orçado) e para o CP (mesma planilha, custo realizado). */
export default async function SheetPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModule('financeiro');
  const { id } = await params;
  const poId = Number(id);

  const [po] = await sql`SELECT * FROM purchase_orders WHERE id = ${poId}`;
  if (!po) notFound();
  const kind = (String(po.kind) === 'CP' ? 'CP' : 'PO') as 'PO' | 'CP';

  const items = (await sql`SELECT * FROM po_items WHERE po_id = ${poId} ORDER BY rubrica, pos, id`) as unknown as SheetItem[];
  const aps = (await sql`SELECT area, approved, approved_by, approved_at::text FROM po_approvals WHERE po_id = ${poId}`) as unknown as PoApproval[];
  const [pi] = await sql`SELECT id, code FROM insertion_orders WHERE po_id = ${poId}`;
  const [cp] = await sql`SELECT id, code FROM purchase_orders WHERE source_po_id = ${poId} AND kind = 'CP'`;
  const [origem] = po.source_po_id
    ? await sql`SELECT id, code, (SELECT COALESCE(sum(qty*period*unit_price),0) FROM po_items WHERE po_id = ${po.source_po_id}) AS cost
                FROM purchase_orders WHERE id = ${po.source_po_id}`
    : [null];

  const pend = aps.filter((a) => !a.approved).length;
  const canEdit = canCreate(session.role, kind) && po.status === 'aberta';

  return (
    <section className="view on">
      <div style={{ marginBottom: 14 }}>
        <Chain
          step={kind === 'CP' ? 5 : pi ? 2 : 1}
          blocked={kind === 'PO' && pend ? `${pend} aprovação(ões) pendente(s)` : null}
          links={{
            PO: `/esteira/po/${origem?.id ?? poId}`,
            ...(pi ? { PI: `/esteira/pi/${pi.id}` } : {}),
            ...(cp ? { CP: `/esteira/po/${cp.id}` } : {}),
          }}
        />
      </div>

      <div className="doc">
        <DocHead
          kind={kind}
          title={kind === 'CP' ? 'Custo de Produção' : 'Planilha Orçamentária — Pedido de Orçamento'}
          sub={<>
            {po.code} · formato PROMOONE por rubricas · mora no <b>Financeiro</b>
            {origem && <> · fecha o orçamento <Link href={`/esteira/po/${origem.id}`} style={{ color: '#8fa8ff' }}>{origem.code}</Link></>}
          </>}
          right={<>
            <span className="aitag" title="A IA sugere fornecedor e valor a partir do histórico de jobs parecidos">IA · orçamento assistido</span>
            <span className={`chip c-${po.status === 'fechada' ? 'green' : po.status === 'cancelada' ? 'red' : 'amber'}`}>
              {String(po.status).toUpperCase()}
            </span>
            {po.contract_no && <span className="chip c-gray">Contrato nº {po.contract_no}</span>}
          </>}
        />
        <div className="db">
          <div className="headgrid" style={{ marginBottom: 18 }}>
            <HG label="Cliente" value={po.client} />
            <HG label="Projeto" value={po.project || po.prospect} />
            <HG label="Data do evento" value={po.event_date ? new Date(po.event_date as string).toLocaleDateString('pt-BR') : null} />
            <HG label="Local do evento" value={po.event_place} />
            <HG label="Contato" value={po.contact} />
            <HG label="Período" value={po.period} />
            <HG label="Aberto por" value={po.created_by} />
            <HG label="Data" value={new Date(po.created_at as string).toLocaleDateString('pt-BR')} />
          </div>

          <SheetEditor
            poId={poId}
            kind={kind}
            initialItems={items}
            feePct={num(po.fee_pct) || 0.1}
            chargesPct={num(po.charges_pct) || 0.17}
            planningPct={num(po.planning_pct) || 0.05}
            canEdit={canEdit}
            compareTo={origem ? { label: origem.code as string, total: 0, cost: num(origem.cost) } : null}
          />

          {kind === 'PO' && (
            <PoApprovals
              poId={poId}
              initial={aps}
              role={session.role}
              status={String(po.status)}
              hasPI={!!pi}
              piId={pi?.id as number | undefined}
              hasCP={!!cp}
              cpId={cp?.id as number | undefined}
            />
          )}

          {kind === 'CP' && (
            <div className="hint" style={{ marginTop: 16 }}>
              Esta é a <b>mesma planilha do orçamento</b>, agora com o que foi de fato gasto. A diferença entre as duas
              é a margem real do job — e ela volta para o Financeiro sem ninguém refazer conta.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
