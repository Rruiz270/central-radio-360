import Link from 'next/link';
import { sql } from '@/lib/db';
import { DEPT, type Dept } from '@/lib/esteira';
import type { Session } from '@/lib/auth';

/* Caixa de entrada da esteira dentro do departamento — as O.S. que são deste time.
   É o que faz o documento morar no lugar certo em vez de num módulo separado. */
export async function OsInbox({ session, depts, title }: {
  session: Session; depts: Dept[]; title?: string;
}) {
  const afiliada = session.role === 'afiliada';
  const rows = await sql`
    SELECT o.id, o.code, o.dept, o.client, o.status, o.bought, o.unit, t.name AS praca,
      COALESCE((SELECT sum(m.qty) FROM os_map m WHERE m.os_id = o.id),0)::int AS used_map,
      (SELECT count(*)::int FROM os_actions a WHERE a.os_id = o.id AND a.done) AS feitas,
      pi.code AS pi_code
    FROM service_orders o
    JOIN tenants t ON t.id = o.tenant_id
    JOIN insertion_orders pi ON pi.id = o.pi_id
    WHERE o.dept = ANY(${depts as string[]}) AND o.status <> 'concluida'
      ${afiliada ? sql`AND o.tenant_id = ${session.tenantId}` : sql``}
    ORDER BY o.id DESC LIMIT 6`;

  if (rows.length === 0) return null;

  return (
    <>
      <div className="sec-title">
        <h2 className="disp">{title || 'Ordens de Serviço deste departamento'}</h2>
        <div className="ln" />
        <Link href={`/esteira/os?dept=${depts[0]}`} className="btn sm">ver todas</Link>
      </div>
      <div className="card"><div className="bd" style={{ padding: 0 }}>
        <div className="sheet" style={{ border: 0, borderRadius: 16 }}>
          <table>
            <thead><tr>
              <th>O.S.</th><th>Depto.</th><th>Cliente</th><th>P.I.</th><th>Praça</th>
              <th style={{ minWidth: 140 }}>Saldo</th><th>Status</th>
            </tr></thead>
            <tbody>
              {rows.map((o) => {
                const d = DEPT[o.dept as Dept];
                const used = d?.offline ? Number(o.feitas) : Number(o.used_map);
                const pct = o.bought ? Math.round((used / Number(o.bought)) * 100) : 0;
                return (
                  <tr key={o.id}>
                    <td><Link href={`/esteira/os/${o.id}`} className="b" style={{ color: '#8fa8ff' }}>{o.code}</Link></td>
                    <td>{d?.label}{d?.offline && <span className="chip c-red" style={{ marginLeft: 6 }}>off-line</span>}</td>
                    <td className="b">{o.client}</td>
                    <td><span className="chip c-blue">{o.pi_code}</span></td>
                    <td className="tiny">{String(o.praca).replace('Metropolitana ', '')}</td>
                    <td>
                      <div className="bar" style={{ width: 110 }}><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
                      <span className="tiny muted">{used}/{o.bought} {o.unit}</span>
                    </td>
                    <td><span className={`chip c-${o.status === 'em_execucao' ? 'amber' : 'blue'}`}>
                      {String(o.status).replace('_', ' ')}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div></div>
    </>
  );
}

/* Atalhos da esteira que pertencem a este módulo. */
export function DocLinks({ items }: { items: { kind: string; label: string; href: string; sub: string }[] }) {
  return (
    <div className="flowmap" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)},1fr)`, marginBottom: 4 }}>
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="fm">
          <div className={`sg sig ${i.kind.toLowerCase()}`}>{i.kind}</div>
          <div className="nm">{i.label}</div>
          <div className="dsc">{i.sub}</div>
        </Link>
      ))}
    </div>
  );
}
