import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { DocHead, HG, Chain } from '@/components/esteira/DocUI';
import { PvPanel, type Delivery } from '@/components/esteira/PvPanel';
import { canApprove, num } from '@/lib/esteira';

export const dynamic = 'force-dynamic';

export default async function PVPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModule('comercial');
  const { id } = await params;
  const pvId = Number(id);

  const [pv] = await sql`SELECT * FROM airing_orders WHERE id = ${pvId}`;
  if (!pv) notFound();
  const [pi] = await sql`SELECT * FROM insertion_orders WHERE id = ${pv.pi_id}`;
  const [pd] = await sql`SELECT id FROM distributions WHERE pi_id = ${pi.id}`;

  const deliveries = (await sql`
    SELECT d.id, d.label, d.planned, d.done, d.unit, t.name AS praca
    FROM airing_deliveries d JOIN tenants t ON t.id = d.tenant_id
    WHERE d.pv_id = ${pvId} ORDER BY t.is_hq DESC, t.name, d.label`) as unknown as Delivery[];

  const [custoRow] = await sql`
    SELECT COALESCE(sum(i.qty * i.unit_price),0) AS custo
    FROM po_items i WHERE i.po_id = ${pi.po_id}`;

  return (
    <section className="view on">
      <div style={{ marginBottom: 14 }}>
        <Chain step={6} links={{
          PO: `/esteira/po/${pi.po_id}`, PI: `/esteira/pi/${pi.id}`,
          ...(pd ? { PD: `/esteira/pd/${pd.id}` } : {}),
          OS: `/esteira/os?pi=${pi.id}`, CP: `/esteira/cp?pi=${pi.id}`, PV: `/esteira/pv/${pvId}`,
        }} />
      </div>

      <div className="doc">
        <DocHead
          kind="PV"
          title="Pedido de Veiculação"
          sub={<>{pv.code} · P.I. <Link href={`/esteira/pi/${pi.id}`} style={{ color: '#8fa8ff' }}>{pi.code}</Link> · autorização de veiculação</>}
          right={<>
            <span className="wotag" title="Limite de 180s/hora validado no servidor">ANATEL OK</span>
            <span className="chip c-teal">comprovação automática</span>
            <span className={`chip c-${pv.status === 'encerrado' ? 'green' : pv.status === 'rascunho' ? 'amber' : 'blue'}`}>
              {String(pv.status).toUpperCase()}
            </span>
          </>}
        />
        <div className="db">
          <div className="cards g2" style={{ marginBottom: 8 }}>
            <div className="card"><div className="hd"><h3 className="disp">Autorização de Veiculação</h3>
              <span className="tag">contrato Asa Mídia</span></div><div className="bd">
              <div className="headgrid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <HG label="Nº de pedido" value={pi.code} />
                <HG label="Data" value={new Date(pv.created_at as string).toLocaleDateString('pt-BR')} />
                <HG label="Razão social" value={pv.legal_name} />
                <HG label="Nome fantasia" value={pv.trade_name} />
                <HG label="CNPJ" value={pv.cnpj} />
                <HG label="Campanha" value={pv.campaign} />
                <HG label="Período" value={pv.period} />
                <HG label="Forma de pagto" value={pv.installments} />
                <HG label="Autorizado por" value={pv.authorized_by ? `${pv.authorized_by} · ${new Date(pv.authorized_at as string).toLocaleDateString('pt-BR')}` : null} />
                <HG label="Veículo" value="Asa Mídia e Comunicações Ltda." />
              </div>
              <div className="nota">
                Cláusulas gerais do contrato (mora de 1% a.m., multa de 20%, compensação de impedimentos e foro
                Central da Capital/SP) entram no rodapé do PDF gerado — CNPJ 01.832.291/0001-47.
              </div>
            </div></div>

            <div className="card"><div className="hd"><h3 className="disp">Onde este documento mora</h3>
              <span className="tag">Comercial · tráfego</span></div><div className="bd">
              <div className="list-li"><span className="chip c-blue">Tráfego</span>
                <div style={{ flex: 1 }}><b>Emite e valida</b>
                  <div className="tiny muted">A veiculação respeita o limite ANATEL de 180s por hora, checado no servidor.</div></div></div>
              <div className="list-li"><span className="chip c-teal">Portal</span>
                <div style={{ flex: 1 }}><b>Comprova ao cliente</b>
                  <div className="tiny muted">As entregas ao lado viram o relatório de pós-venda, sem montagem manual.</div></div></div>
              <div className="list-li"><span className="chip c-amber">Financeiro</span>
                <div style={{ flex: 1 }}><b>Fatura o entregue</b>
                  <div className="tiny muted">O realizado alimenta a fatura e volta ao PO para medir a margem real.</div></div></div>
            </div></div>
          </div>

          <PvPanel
            pvId={pvId}
            initial={deliveries}
            status={String(pv.status)}
            total={num(pv.total)}
            custo={num(custoRow?.custo)}
            canEdit={canApprove(session.role, 'PV')}
          />
        </div>
      </div>
    </section>
  );
}
