import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { DocHead, HG, Chain } from '@/components/esteira/DocUI';
import { PdEditor, type PdItem } from '@/components/esteira/PdEditor';
import { canCreate } from '@/lib/esteira';

export const dynamic = 'force-dynamic';

export default async function PDPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModule('comercial');
  const { id } = await params;
  const pdId = Number(id);

  const [pd] = await sql`SELECT * FROM distributions WHERE id = ${pdId}`;
  if (!pd) notFound();
  const [pi] = await sql`SELECT * FROM insertion_orders WHERE id = ${pd.pi_id}`;

  /* A afiliada só enxerga a aba da própria praça — multi-tenant de verdade. */
  const afiliada = session.role === 'afiliada';
  const items = (await sql`
    SELECT di.*, t.name AS praca, t.uf, o.code AS os_code
    FROM distribution_items di
    JOIN tenants t ON t.id = di.tenant_id
    LEFT JOIN service_orders o ON o.id = di.os_id
    WHERE di.pd_id = ${pdId}
      ${afiliada ? sql`AND di.tenant_id = ${session.tenantId}` : sql``}
    ORDER BY t.is_hq DESC, t.name, di.dept, di.id`) as unknown as PdItem[];

  const [cnt] = await sql`
    SELECT (SELECT count(*)::int FROM service_orders WHERE pd_id = ${pdId}) AS os,
           (SELECT count(*)::int FROM productions WHERE pi_id = ${pd.pi_id}) AS cp`;
  const [pv] = await sql`SELECT id FROM airing_orders WHERE pi_id = ${pd.pi_id}`;

  const step = pv ? 6 : cnt.cp ? 5 : cnt.os ? 4 : 3;

  return (
    <section className="view on">
      <div style={{ marginBottom: 14 }}>
        <Chain step={step} blocked={pd.status === 'rascunho' ? 'PD aguardando autorização' : null} links={{
          PO: `/esteira/po/${pi.po_id}`, PI: `/esteira/pi/${pi.id}`, PD: `/esteira/pd/${pdId}`,
          ...(cnt.os ? { OS: `/esteira/os?pd=${pdId}` } : {}),
          ...(cnt.cp ? { CP: `/esteira/pecas?pi=${pi.id}` } : {}),
          ...(pv ? { PV: `/esteira/pv/${pv.id}` } : {}),
        }} />
      </div>

      <div className="doc">
        <DocHead
          kind="PD"
          title="Planilha de Distribuição"
          sub={<>{pd.code} · P.I. <Link href={`/esteira/pi/${pi.id}`} style={{ color: '#8fa8ff' }}>{pi.code}</Link> · distribui para agência e para rádio</>}
          right={<>
            <span className="wotag" title="Valor de tabela puxado do rate card da praça">RATE CARD</span>
            <span className="chip c-blue">rede nacional</span>
            <span className={`chip c-${pd.status === 'autorizada' ? 'green' : 'amber'}`}>{String(pd.status).toUpperCase()}</span>
          </>}
        />
        <div className="db">
          <div className="headgrid" style={{ marginBottom: 16 }}>
            <HG label="Cliente" value={pi.client} />
            <HG label="Projeto" value={pd.project} />
            <HG label="Executivo" value={pi.executive} />
            <HG label="Autorização" value={pd.authorized_by ? `${pd.authorized_by} · ${new Date(pd.authorized_at as string).toLocaleDateString('pt-BR')}` : null} />
            <HG label="Agência" value={pi.agency} />
            <HG label="Planner" value={pi.planner} />
            <HG label="Forma de pagamento" value={pd.payment} />
            <HG label="Período" value={pi.period} />
          </div>

          {items.length === 0 ? (
            <div className="hint">Nenhuma linha de distribuição visível para o seu perfil.</div>
          ) : (
            <PdEditor
              pdId={pdId}
              piCode={String(pi.code)}
              initialItems={items}
              status={String(pd.status)}
              canEdit={canCreate(session.role, 'PD')}
            />
          )}
        </div>
      </div>
    </section>
  );
}
