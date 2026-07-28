import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { DocHead, HG, Chain } from '@/components/esteira/DocUI';
import { PiEditor, type IoItem, type Praca } from '@/components/esteira/PiEditor';
import { canCreate } from '@/lib/esteira';

export const dynamic = 'force-dynamic';

export default async function PIPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModule('comercial');
  const { id } = await params;
  const piId = Number(id);

  const [pi] = await sql`SELECT * FROM insertion_orders WHERE id = ${piId}`;
  if (!pi) notFound();

  const items = (await sql`SELECT * FROM io_items WHERE pi_id = ${piId} ORDER BY scope DESC, pos, id`) as unknown as IoItem[];
  const pracas = (await sql`SELECT id, name, city, uf, is_hq FROM tenants ORDER BY is_hq DESC, name`) as unknown as Praca[];
  const [pd] = await sql`SELECT id, code, status FROM distributions WHERE pi_id = ${piId}`;
  const [po] = await sql`SELECT id, code FROM purchase_orders WHERE id = ${pi.po_id}`;
  const [pv] = await sql`SELECT id, code FROM airing_orders WHERE pi_id = ${piId}`;
  const [cnt] = await sql`
    SELECT (SELECT count(*)::int FROM service_orders WHERE pi_id = ${piId}) AS os,
           (SELECT count(*)::int FROM productions WHERE pi_id = ${piId}) AS cp`;

  const pieces = (pi.pieces as string[]) || [];
  const canEdit = canCreate(session.role, 'PI');
  const step = pv ? 6 : cnt.cp ? 5 : cnt.os ? 4 : pd ? 3 : 2;

  return (
    <section className="view on">
      <div style={{ marginBottom: 14 }}>
        <Chain step={step} links={{
          ...(po ? { PO: `/esteira/po/${po.id}` } : {}),
          PI: `/esteira/pi/${piId}`,
          ...(pd ? { PD: `/esteira/pd/${pd.id}` } : {}),
          ...(cnt.os ? { OS: `/esteira/os?pi=${piId}` } : {}),
          ...(cnt.cp ? { CP: `/esteira/cp?pi=${piId}` } : {}),
          ...(pv ? { PV: `/esteira/pv/${pv.id}` } : {}),
        }} />
      </div>

      <div className="doc">
        <DocHead
          kind="PI"
          title="Pedido de Inserção"
          sub={<>{pi.code} · o número que amarra toda a esteira · mora no <b>Comercial &amp; Vendas</b></>}
          right={<>
            <span className="aitag" title="A IA lê a P.I. em PDF que a agência envia e preenche os itens">IA · leitura de PDF</span>
            <span className={`chip c-${pi.status === 'rascunho' ? 'amber' : 'green'}`}>{String(pi.status).toUpperCase()}</span>
            {po && <Link href={`/esteira/po/${po.id}`} className="chip c-blue">origem {po.code}</Link>}
          </>}
        />
        <div className="db">
          <div className="headgrid" style={{ marginBottom: 16 }}>
            <HG label="Cliente" value={pi.client} />
            <HG label="Veículo" value={pi.vehicle} />
            <HG label="Agência" value={pi.agency} />
            <HG label="Endereço" value="Av. Paulista, 2.198 — 14º andar" />
            <HG label="Executivo" value={pi.executive} />
            <HG label="Fone" value="(11) 3878-0985" />
            <HG label="Planner" value={pi.planner} />
            <HG label="E-mail" value="comercial@metropolitanafm.com.br" />
          </div>

          <div className="sec-title"><h2 className="disp">Peças / títulos</h2><div className="ln" /></div>
          <div className="headgrid" style={{ marginBottom: 18 }}>
            {['A', 'B', 'C', 'D', 'E', 'F'].map((l, i) => (
              <HG key={l} label={`Peça ${l}`} value={pieces[i]} />
            ))}
          </div>

          <PiEditor
            piId={piId}
            initialItems={items}
            pracas={pracas}
            status={String(pi.status)}
            canEdit={canEdit}
            hasPD={!!pd}
            pdId={pd?.id as number | undefined}
          />
        </div>
      </div>
    </section>
  );
}
