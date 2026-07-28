import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Hint, SecTitle, Kpi } from '@/components/ui';
import { CpBoard, type Cp } from '@/components/esteira/CpBoard';
import { canCreate } from '@/lib/esteira';

export const dynamic = 'force-dynamic';

export default async function CPPage({ searchParams }: { searchParams: Promise<{ pi?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const sp = await searchParams;
  const afiliada = session.role === 'afiliada';

  const rows = (await sql`
    SELECT p.*, p.due::text AS due, o.code AS os_code, o.id AS os_id,
           pi.code AS pi_code, pi.id AS pi_id, t.name AS praca
    FROM productions p
    LEFT JOIN service_orders o ON o.id = p.os_id
    JOIN insertion_orders pi ON pi.id = p.pi_id
    JOIN tenants t ON t.id = p.tenant_id
    WHERE TRUE
      ${sp.pi ? sql`AND p.pi_id = ${Number(sp.pi)}` : sql``}
      ${afiliada ? sql`AND p.tenant_id = ${session.tenantId}` : sql``}
    ORDER BY p.step, p.id DESC`) as unknown as Cp[];

  /* Campanhas com produção aberta — e quantas peças ainda travam a veiculação. */
  const piAll = (await sql`
    SELECT pi.id, pi.code, pi.client,
      (SELECT count(*)::int FROM productions x WHERE x.pi_id = pi.id AND x.client_status <> 'aprovado') AS pend
    FROM insertion_orders pi
    WHERE EXISTS (SELECT 1 FROM productions x WHERE x.pi_id = pi.id)
      AND NOT EXISTS (SELECT 1 FROM airing_orders v WHERE v.pi_id = pi.id)
    ORDER BY pi.id DESC`) as unknown as { id: number; code: string; client: string; pend: number }[];

  const noAr = rows.filter((r) => r.step === 5).length;
  const aguardando = rows.filter((r) => r.client_status === 'aguardando').length;
  const ajuste = rows.filter((r) => r.client_status === 'ajuste').length;

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        O <b>CP</b> é a ponte entre a O.S. e o ar: roteiro, gravação, aprovação do cliente e liberação.
        A aprovação usa o <b>Portal do Cliente</b> que já existe — sem criar um segundo canal.
      </Hint>

      <div className="cards g4" style={{ marginBottom: 16 }}>
        <Kpi label="Peças em produção" value={String(rows.length - noAr)} />
        <Kpi label="Liberadas para o ar" value={String(noAr)} tone="b2" deltaTone="up" delta="aprovadas pelo cliente" />
        <Kpi label="Aguardando cliente" value={String(aguardando)} tone="y" delta="travam a veiculação" />
        <Kpi label="Em ajuste" value={String(ajuste)} tone="r" delta="cliente pediu mudança" deltaTone={ajuste ? 'down' : 'flat'} />
      </div>

      <SecTitle>Controle de Produção</SecTitle>
      <CpBoard initial={rows} canEdit={canCreate(session.role, 'CP')} piAll={piAll} />

      <SecTitle>Fluxo de uma peça</SecTitle>
      <div className="steps">
        {['Briefing recebido', 'Roteiro', 'Gravação / locução', 'Aprovação do cliente', 'Liberada para o ar'].map((s, i) => (
          <span key={s} style={{ display: 'contents' }}>
            <div className="step"><span className="n">{i + 1}</span> {s}</div>
            {i < 4 && <span className="arrow">→</span>}
          </span>
        ))}
      </div>
      <div className="nota">
        Peça sem aprovação do cliente não vai para o ar — a trava está na API, não só na tela.
      </div>
    </section>
  );
}
