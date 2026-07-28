import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { DocHead, HG, Chain } from '@/components/esteira/DocUI';
import { OsEditor, type OsAction, type MapCell } from '@/components/esteira/OsEditor';
import { DEPT, isDept, canEditOS, deptsForRole, type Dept } from '@/lib/esteira';

export const dynamic = 'force-dynamic';

export default async function OSPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const osId = Number(id);
  const [os] = await sql`SELECT o.*, t.name AS praca, t.uf FROM service_orders o
                         JOIN tenants t ON t.id = o.tenant_id WHERE o.id = ${osId}`;
  if (!os) notFound();

  const dept = String(os.dept);
  if (!isDept(dept)) notFound();
  const d = DEPT[dept as Dept];

  /* O documento mora no departamento dono: quem não é do time vê, mas não edita. */
  const podeVer = deptsForRole(session.role).length > 0;
  if (!podeVer) redirect('/');
  if (session.role === 'afiliada' && os.tenant_id !== session.tenantId) redirect('/esteira/os');
  const canEdit = canEditOS(session.role, dept as Dept);

  const [pi] = await sql`SELECT * FROM insertion_orders WHERE id = ${os.pi_id}`;
  const map = (await sql`SELECT line, month, day, qty FROM os_map WHERE os_id = ${osId}`) as unknown as MapCell[];
  const actions = (await sql`SELECT id, seq, action_date::text, action_time, place, goal, mechanics, team,
                                    equipment, uniform, car, gifts, photos, delivery_city, notes, done
                             FROM os_actions WHERE os_id = ${osId} ORDER BY seq`) as unknown as OsAction[];
  const [cp] = await sql`SELECT count(*)::int n FROM productions WHERE os_id = ${osId}`;
  const [pv] = await sql`SELECT id FROM airing_orders WHERE pi_id = ${os.pi_id}`;

  /* Meses da campanha vêm da PD — o mapa só abre nos meses contratados. */
  const [mesesRow] = await sql`
    SELECT months FROM distribution_items
    WHERE pd_id = ${os.pd_id} AND tenant_id = ${os.tenant_id} AND dept = ${dept} LIMIT 1`;
  const months = Object.keys((mesesRow?.months as Record<string, number>) || {}).map(Number).sort((a, b) => a - b);
  const year = new Date(os.created_at as string).getFullYear();

  const step = pv ? 6 : cp.n ? 5 : 4;

  return (
    <section className="view on">
      <div style={{ marginBottom: 14 }}>
        <Chain step={step} links={{
          PO: `/esteira/po/${pi.po_id}`, PI: `/esteira/pi/${pi.id}`, PD: `/esteira/pd/${os.pd_id}`,
          OS: `/esteira/os?pd=${os.pd_id}`,
          ...(cp.n ? { CP: `/esteira/cp?pi=${pi.id}` } : {}),
          ...(pv ? { PV: `/esteira/pv/${pv.id}` } : {}),
        }} />
      </div>

      <div className="doc">
        <DocHead
          kind="OS"
          title={`O.S. Depto. ${d.label}`}
          sub={<>{os.code} · P.I. <Link href={`/esteira/pi/${pi.id}`} style={{ color: '#8fa8ff' }}>{pi.code}</Link> · {os.praca} · mora em <b>{d.homeLabel}</b></>}
          right={<>
            {d.offline && <span className="aitag" title="A IA propõe mecânica, equipe e equipamentos a partir do briefing">IA · mecânica da ação</span>}
            <span className="wa"><span className="wd" />alerta 48h</span>
            <span className={`chip c-${os.status === 'concluida' ? 'green' : os.status === 'em_execucao' ? 'amber' : 'blue'}`}>
              {String(os.status).replace('_', ' ').toUpperCase()}
            </span>
            {!canEdit && <span className="chip c-gray">somente leitura</span>}
          </>}
        />
        <div className="db">
          <div className="headgrid" style={{ marginBottom: 16 }}>
            <HG label="Cliente" value={os.client} />
            <HG label="Veículo" value="Asa Mídia e Comunicações Ltda." />
            <HG label="Agência" value={os.agency} />
            <HG label="Nº P.I." value={pi.code} />
            <HG label="Executivo" value={os.executive} />
            <HG label="Planner" value={os.planner} />
            <HG label="Período" value={os.period} />
            <HG label="Praça" value={`${os.praca} / ${os.uf}`} />
          </div>

          {!canEdit && (
            <div className="hint y" style={{ marginBottom: 14 }}>
              Esta O.S. pertence a <b>{d.homeLabel}</b>. Seu perfil pode acompanhar, mas quem executa e dá baixa
              é o departamento dono — a mesma divisão de responsabilidade do papel, agora aplicada pelo sistema.
            </div>
          )}

          <OsEditor
            osId={osId}
            dept={dept as Dept}
            bought={Number(os.bought)}
            unit={String(os.unit)}
            initialMap={map}
            initialActions={actions}
            initialFields={(os.fields as Record<string, string>) || {}}
            months={months}
            year={year}
            status={String(os.status)}
            canEdit={canEdit}
            hasCP={cp.n > 0}
          />
        </div>
      </div>
    </section>
  );
}
