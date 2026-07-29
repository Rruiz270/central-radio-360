import Link from 'next/link';
import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Kpi, Hint, SecTitle } from '@/components/ui';
import { Chain } from '@/components/esteira/DocUI';
import { CHAIN, DOC, chainState, brlShort, money, num, DEPT, isDept, type Dept } from '@/lib/esteira';
import { NovoPO } from '@/components/esteira/NovoPO';

export const dynamic = 'force-dynamic';

type Row = {
  pi_id: number | null; pi_code: string | null; pi_status: string | null;
  po_id: number; po_code: string; po_status: string; po_pending: number;
  client: string; agency: string | null; executive: string | null;
  pd_id: number | null; pd_code: string | null; pd_status: string | null;
  os_total: number; os_open: number;
  cp_total: number; cp_unapproved: number;
  pv_id: number | null; pv_status: string | null;
  net: string | null; pracas: number;
};

export default async function EsteiraPage() {
  const session = await requireModule('esteira');
  const afiliada = session.role === 'afiliada';

  /* Uma linha por processo, com o estado real de cada elo da corrente. */
  const rows = (await sql`
    SELECT
      po.id AS po_id, po.code AS po_code, po.status AS po_status, po.client, po.revenue,
      (SELECT count(*)::int FROM po_approvals a WHERE a.po_id = po.id AND NOT a.approved) AS po_pending,
      pi.id AS pi_id, pi.code AS pi_code, pi.status AS pi_status, pi.agency, pi.executive,
      pd.id AS pd_id, pd.code AS pd_code, pd.status AS pd_status,
      (SELECT count(*)::int FROM service_orders o WHERE o.pi_id = pi.id) AS os_total,
      (SELECT count(*)::int FROM service_orders o WHERE o.pi_id = pi.id AND o.status <> 'concluida') AS os_open,
      (SELECT count(*)::int FROM productions p WHERE p.pi_id = pi.id) AS cp_total,
      (SELECT count(*)::int FROM productions p WHERE p.pi_id = pi.id AND p.client_status <> 'aprovado') AS cp_unapproved,
      pv.id AS pv_id, pv.status AS pv_status,
      (SELECT count(DISTINCT di.tenant_id)::int FROM distribution_items di WHERE di.pd_id = pd.id) AS pracas,
      (SELECT COALESCE(sum(i.qty * i.rate * (1 - i.discount) * (1 - i.commission)),0)::text
         FROM io_items i WHERE i.pi_id = pi.id) AS net
    FROM purchase_orders po
    LEFT JOIN insertion_orders pi ON pi.po_id = po.id
    LEFT JOIN distributions pd ON pd.pi_id = pi.id
    LEFT JOIN airing_orders pv ON pv.pi_id = pi.id
    WHERE po.kind = 'PO'
    ${afiliada
      ? sql`AND EXISTS (SELECT 1 FROM service_orders o WHERE o.pi_id = pi.id AND o.tenant_id = ${session.tenantId})`
      : sql``}
    ORDER BY po.id DESC` ) as unknown as Row[];

  const counts = await sql`
    SELECT
      (SELECT count(*)::int FROM purchase_orders WHERE kind = 'PO' AND status = 'aberta') AS po,
      (SELECT count(*)::int FROM insertion_orders) AS pi,
      (SELECT count(*)::int FROM distributions) AS pd,
      (SELECT count(*)::int FROM service_orders WHERE status <> 'concluida') AS os,
      (SELECT count(*)::int FROM purchase_orders WHERE kind = 'CP') AS cp,
      (SELECT count(*)::int FROM airing_orders) AS pv`;
  const c = counts[0];

  /* Gargalos reais — o que a planilha nunca mostrou. */
  const [garg] = await sql`
    SELECT
      (SELECT count(*)::int FROM service_orders o
         WHERE o.status <> 'concluida'
           AND NOT EXISTS (SELECT 1 FROM productions p WHERE p.os_id = o.id)) AS os_sem_cp,
      (SELECT count(*)::int FROM po_approvals a JOIN purchase_orders p ON p.id = a.po_id
         WHERE NOT a.approved AND p.status = 'aberta') AS aprov_pend,
      (SELECT COALESCE(sum(o.bought),0)::int FROM service_orders o) AS comprado,
      (SELECT COALESCE(sum(m.qty),0)::int FROM os_map m) AS usado`;

  /* Fila de O.S. do departamento de quem está logado. */
  const minhas = await sql`
    SELECT o.id, o.code, o.dept, o.client, o.status, o.bought, o.unit, t.name AS praca,
           COALESCE((SELECT sum(m.qty) FROM os_map m WHERE m.os_id = o.id),0)::int AS used,
           (SELECT count(*)::int FROM os_actions a WHERE a.os_id = o.id AND a.done) AS feitas
    FROM service_orders o JOIN tenants t ON t.id = o.tenant_id
    WHERE o.status <> 'concluida'
      ${afiliada ? sql`AND o.tenant_id = ${session.tenantId}` : sql``}
    ORDER BY o.id DESC LIMIT 8`;

  const qt: Record<string, number> = { PO: c.po, PI: c.pi, PD: c.pd, OS: c.os, CP: c.cp, PV: c.pv };
  const descr: Record<string, string> = {
    PO: 'Planilha orçamentária. Custo de fornecedor e assinatura das 4 áreas.',
    PI: 'Gera o número que amarra tudo. Já desmembra rádio e agência.',
    PD: 'Distribui por praça e departamento, com tabela, desconto e comissão.',
    OS: 'Uma por departamento. É onde a agência off-line executa.',
    CP: 'A mesma planilha do PO fechada com o gasto real — a margem verdadeira do job.',
    PV: 'Autorização de veiculação e comprovação de entrega.',
  };

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        <b>A esteira da casa, dentro do sistema.</b> Todo negócio percorre seis documentos nesta ordem —
        e cada um mora no departamento dono dele. O número da <b>P.I.</b> é a chave: PD, O.S., CP e PV
        apontam para ela, então nada precisa ser renumerado à mão.
      </Hint>

      <div className="flowmap" style={{ marginBottom: 18 }}>
        {CHAIN.map((k) => (
          <Link key={k} href={DOC[k].href} className="fm">
            <div className={`sg sig ${DOC[k].tone}`}>{k}</div>
            <span className={`qt ${k === 'OS' && c.os > 0 ? 'al' : ''}`}>{qt[k]}</span>
            <div className="nm">{DOC[k].full}</div>
            <div className="dsc">{descr[k]}</div>
            <div className="dsc" style={{ marginTop: 6, color: 'var(--txt-2)' }}>▸ {DOC[k].where}</div>
          </Link>
        ))}
      </div>

      <SecTitle right={<NovoPO />}>Processos em andamento</SecTitle>
      <div className="card"><div className="bd" style={{ padding: 0 }}>
        <div className="sheet" style={{ border: 0, borderRadius: 16 }}>
          <table>
            <thead><tr>
              <th>Nº P.I.</th><th>Cliente</th><th>Agência</th><th>Executivo</th><th className="num">Praças</th>
              <th>Etapa</th><th className="num">Valor líquido</th><th>Pendência</th>
            </tr></thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="muted" style={{ padding: 22, textAlign: 'center' }}>
                  Nenhum processo ainda. Comece abrindo um <b>Pedido de Orçamento</b>.
                </td></tr>
              )}
              {rows.map((r) => {
                const st = chainState({
                  poStatus: r.po_status, poPending: r.po_pending,
                  piStatus: r.pi_status, pdStatus: r.pd_status,
                  osTotal: r.os_total, osOpen: r.os_open,
                  cpTotal: r.cp_total, cpUnapproved: r.cp_unapproved,
                  pvStatus: r.pv_status,
                });
                const links = {
                  PO: `/esteira/po/${r.po_id}`,
                  ...(r.pi_id ? { PI: `/esteira/pi/${r.pi_id}` } : {}),
                  ...(r.pd_id ? { PD: `/esteira/pd/${r.pd_id}` } : {}),
                  ...(r.os_total ? { OS: `/esteira/os?pi=${r.pi_id}` } : {}),
                  ...(r.cp_total ? { CP: `/esteira/pecas?pi=${r.pi_id}` } : {}),
                  ...(r.pv_id ? { PV: `/esteira/pv/${r.pv_id}` } : {}),
                };
                return (
                  <tr key={r.po_id}>
                    <td className="b">{r.pi_code || <span className="muted">{r.po_code}</span>}</td>
                    <td className="b">{r.client}</td>
                    <td>{r.agency || '—'}</td>
                    <td>{r.executive || '—'}</td>
                    <td className="num">{r.pracas || '—'}</td>
                    <td><Chain step={st.step} blocked={st.blocked} links={links} sm /></td>
                    <td className="num b">{r.net ? brlShort(r.net) : '—'}</td>
                    <td>{st.blocked
                      ? <span className="chip c-red">{st.blocked}</span>
                      : <span className="chip c-green">em dia</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div></div>

      <SecTitle>Gargalos</SecTitle>
      <div className="cards g3">
        <Kpi label="O.S. sem produção aberta" value={String(garg.os_sem_cp)} tone="r"
             delta="peça não entrou no CP" deltaTone={garg.os_sem_cp ? 'down' : 'flat'} />
        <Kpi label="Aprovações de PO pendentes" value={String(garg.aprov_pend)} tone="y"
             delta="travam a emissão da P.I." />
        <Kpi label="Saldo a executar" value={`${Math.max(0, garg.comprado - garg.usado)}`} tone="b2"
             delta={`de ${garg.comprado} comprados`} deltaTone="up" />
      </div>

      <SecTitle right={<Link href="/esteira/os" className="btn sm">ver todas</Link>}>
        Fila de O.S. — {session.role === 'afiliada' ? session.tenantName : 'rede nacional'}
      </SecTitle>
      <div className="card"><div className="bd" style={{ padding: 0 }}>
        <div className="sheet" style={{ border: 0, borderRadius: 16 }}>
          <table>
            <thead><tr>
              <th>O.S.</th><th>Departamento</th><th>Onde fica</th><th>Praça</th><th>Cliente</th>
              <th style={{ minWidth: 150 }}>Saldo</th><th>Status</th>
            </tr></thead>
            <tbody>
              {minhas.length === 0 && (
                <tr><td colSpan={7} className="muted" style={{ padding: 22, textAlign: 'center' }}>
                  Nenhuma O.S. aberta.
                </td></tr>
              )}
              {minhas.map((o) => {
                const d = isDept(String(o.dept)) ? DEPT[o.dept as Dept] : null;
                const used = o.dept === 'operacoes' || o.dept === 'promocao' ? Number(o.feitas) : Number(o.used);
                const pct = o.bought ? Math.round((used / Number(o.bought)) * 100) : 0;
                return (
                  <tr key={o.id}>
                    <td><Link href={`/esteira/os/${o.id}`} className="b" style={{ color: '#8fa8ff' }}>{o.code}</Link></td>
                    <td className="b">{d?.label || o.dept}{d?.offline && <span className="chip c-red" style={{ marginLeft: 6 }}>off-line</span>}</td>
                    <td className="tiny muted">{d?.homeLabel}</td>
                    <td>{o.praca}</td>
                    <td>{o.client}</td>
                    <td>
                      <div className="bar" style={{ width: 120 }}><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
                      <span className="tiny muted">{used}/{o.bought} {o.unit}</span>
                    </td>
                    <td><span className={`chip c-${o.status === 'concluida' ? 'green' : o.status === 'em_execucao' ? 'amber' : 'blue'}`}>{String(o.status).replace('_', ' ')}</span></td>
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
