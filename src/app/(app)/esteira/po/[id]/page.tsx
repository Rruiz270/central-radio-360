import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { DocHead, HG, Chain } from '@/components/esteira/DocUI';
import { PoEditor, type PoItem, type PoApproval } from '@/components/esteira/PoEditor';
import { canCreate, num } from '@/lib/esteira';

export const dynamic = 'force-dynamic';

export default async function POPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModule('financeiro');
  const { id } = await params;
  const poId = Number(id);

  const [po] = await sql`SELECT * FROM purchase_orders WHERE id = ${poId}`;
  if (!po) notFound();

  const items = (await sql`SELECT * FROM po_items WHERE po_id = ${poId} ORDER BY pos, id`) as unknown as PoItem[];
  const aps = (await sql`SELECT area, approved, approved_by, approved_at::text FROM po_approvals WHERE po_id = ${poId}`) as unknown as PoApproval[];
  const [pi] = await sql`SELECT id, code FROM insertion_orders WHERE po_id = ${poId}`;

  const pend = aps.filter((a) => !a.approved).length;
  const canEdit = canCreate(session.role, 'PO') && po.status === 'aberta';

  return (
    <section className="view on">
      <div style={{ marginBottom: 14 }}>
        <Chain step={pi ? 2 : 1} blocked={pend ? `${pend} aprovação(ões) pendente(s)` : null}
               links={{ PO: `/esteira/po/${poId}`, ...(pi ? { PI: `/esteira/pi/${pi.id}` } : {}) }} />
      </div>

      <div className="doc">
        <DocHead
          kind="PO"
          title="Planilha Orçamentária — Pedido de Orçamento"
          sub={<>{po.code} · primeiro documento da esteira · mora no <b>Financeiro</b></>}
          right={<>
            <span className="aitag" title="A IA sugere fornecedor e valor a partir do histórico de ações parecidas">IA · orçamento assistido</span>
            <span className={`chip c-${po.status === 'fechada' ? 'green' : po.status === 'cancelada' ? 'red' : 'amber'}`}>
              {String(po.status).toUpperCase()}
            </span>
            {po.contract_no && <span className="chip c-gray">Contrato nº {po.contract_no}</span>}
          </>}
        />
        <div className="db">
          <div className="headgrid" style={{ marginBottom: 18 }}>
            <HG label="Data" value={new Date(po.created_at as string).toLocaleDateString('pt-BR')} />
            <HG label="Cliente" value={po.client} />
            <HG label="Contato" value={po.contact} />
            <HG label="Período" value={po.period} />
            <HG label="Prospecção" value={po.prospect} />
            <HG label="Valor atual" value={num(po.revenue) ? `R$ ${num(po.revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null} />
            <HG label="Aberto por" value={po.created_by} />
            <HG label="Execução" value={po.execution} />
          </div>

          <PoEditor
            poId={poId}
            initialItems={items}
            initialApprovals={aps}
            revenue={num(po.revenue)}
            status={String(po.status)}
            role={session.role}
            canEdit={canEdit}
          />

          {pi && (
            <div className="hint" style={{ marginTop: 16 }}>
              Este orçamento já gerou a <b><Link href={`/esteira/pi/${pi.id}`} style={{ color: '#8fa8ff' }}>P.I. {pi.code}</Link></b> —
              o número que amarra a distribuição, as O.S., a produção e a veiculação.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
