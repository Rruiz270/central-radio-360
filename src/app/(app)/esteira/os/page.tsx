import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Hint, SecTitle, Kpi } from '@/components/ui';
import { DEPT, DEPTS, deptsForRole, isDept, type Dept } from '@/lib/esteira';

export const dynamic = 'force-dynamic';

export default async function OSListPage({ searchParams }: {
  searchParams: Promise<{ pi?: string; pd?: string; dept?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');
  const sp = await searchParams;

  const meus = deptsForRole(session.role);
  const afiliada = session.role === 'afiliada';

  const rows = await sql`
    SELECT o.*, t.name AS praca, t.uf, pi.code AS pi_code, pi.id AS pi_id,
      COALESCE((SELECT sum(m.qty) FROM os_map m WHERE m.os_id = o.id),0)::int AS used_map,
      (SELECT count(*)::int FROM os_actions a WHERE a.os_id = o.id) AS acoes,
      (SELECT count(*)::int FROM os_actions a WHERE a.os_id = o.id AND a.done) AS feitas,
      (SELECT count(*)::int FROM productions p WHERE p.os_id = o.id) AS cps
    FROM service_orders o
    JOIN tenants t ON t.id = o.tenant_id
    JOIN insertion_orders pi ON pi.id = o.pi_id
    WHERE TRUE
      ${sp.pi ? sql`AND o.pi_id = ${Number(sp.pi)}` : sql``}
      ${sp.pd ? sql`AND o.pd_id = ${Number(sp.pd)}` : sql``}
      ${sp.dept ? sql`AND o.dept = ${sp.dept}` : sql``}
      ${afiliada ? sql`AND o.tenant_id = ${session.tenantId}` : sql``}
    ORDER BY o.id DESC`;

  const abertas = rows.filter((o) => o.status !== 'concluida').length;
  const offline = rows.filter((o) => isDept(String(o.dept)) && DEPT[o.dept as Dept].offline);
  const semCP = rows.filter((o) => !o.cps && o.status !== 'concluida').length;

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        A <b>O.S.</b> é onde o trabalho acontece — e cada departamento recebe a sua. Você enxerga a rede inteira,
        mas só edita as O.S. do seu time: {meus.map((m) => DEPT[m].label).join(', ') || '—'}.
      </Hint>

      <div className="cards g4" style={{ marginBottom: 16 }}>
        <Kpi label="O.S. abertas" value={String(abertas)} delta={`${rows.length} no total`} />
        <Kpi label="Ações off-line" value={String(offline.reduce((a, o) => a + Number(o.acoes), 0))} tone="r"
             delta={`${offline.reduce((a, o) => a + Number(o.feitas), 0)} executadas`} deltaTone="up" />
        <Kpi label="Sem produção aberta" value={String(semCP)} tone="y" delta="peça não entrou no CP" />
        <Kpi label="Praças envolvidas" value={String(new Set(rows.map((o) => o.tenant_id)).size)} tone="b2"
             delta="rede nacional" />
      </div>

      <div className="subtabs">
        <Link href="/esteira/os" className={!sp.dept ? '' : ''}>
          <button className={!sp.dept ? 'on' : ''}>Todos</button>
        </Link>
        {DEPTS.map((dp) => (
          <Link key={dp} href={`/esteira/os?dept=${dp}`}>
            <button className={sp.dept === dp ? 'on' : ''}>
              {DEPT[dp].label}
              {DEPT[dp].offline && <span className="chip c-red" style={{ padding: '1px 6px', fontSize: 9 }}>off-line</span>}
            </button>
          </Link>
        ))}
      </div>

      <SecTitle>Ordens de Serviço</SecTitle>
      <div className="card"><div className="bd" style={{ padding: 0 }}>
        <div className="sheet" style={{ border: 0, borderRadius: 16 }}>
          <table>
            <thead><tr>
              <th>O.S.</th><th>Departamento</th><th>Onde fica</th><th>Praça</th><th>Cliente</th><th>P.I.</th>
              <th style={{ minWidth: 150 }}>Saldo</th><th>Produção</th><th>Status</th><th />
            </tr></thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={10} className="muted" style={{ padding: 22, textAlign: 'center' }}>
                  Nenhuma O.S. ainda. Elas nascem ao gerar as O.S. de uma PD autorizada.
                </td></tr>
              )}
              {rows.map((o) => {
                const dp = isDept(String(o.dept)) ? DEPT[o.dept as Dept] : null;
                const off = dp?.offline;
                const used = off ? Number(o.feitas) : Number(o.used_map);
                const pct = o.bought ? Math.round((used / Number(o.bought)) * 100) : 0;
                const meu = meus.includes(o.dept as Dept);
                return (
                  <tr key={o.id}>
                    <td><Link href={`/esteira/os/${o.id}`} className="b" style={{ color: '#8fa8ff' }}>{o.code}</Link></td>
                    <td className="b">{dp?.label || o.dept}{off && <span className="chip c-red" style={{ marginLeft: 6 }}>off-line</span>}</td>
                    <td className="tiny muted">{dp?.homeLabel}</td>
                    <td>{String(o.praca).replace('Metropolitana ', '')}/{o.uf}</td>
                    <td>{o.client}</td>
                    <td><Link href={`/esteira/pi/${o.pi_id}`} className="chip c-blue">{o.pi_code}</Link></td>
                    <td>
                      <div className="bar" style={{ width: 120 }}><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
                      <span className="tiny muted">{used}/{o.bought} {o.unit}</span>
                    </td>
                    <td>{o.cps ? <span className="chip c-green">{o.cps} peça(s)</span> : <span className="chip c-amber">a abrir</span>}</td>
                    <td><span className={`chip c-${o.status === 'concluida' ? 'green' : o.status === 'em_execucao' ? 'amber' : 'blue'}`}>
                      {String(o.status).replace('_', ' ')}</span></td>
                    <td>{meu ? <span className="chip c-teal">seu time</span> : <span className="tiny muted">leitura</span>}</td>
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
