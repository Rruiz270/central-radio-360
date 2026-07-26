import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Card, Hint, ListLi, BarRow } from '@/components/ui';
import { ChecklistLive } from '@/components/ChecklistLive';
import { ApproveButton } from '@/components/ApproveButton';

export const dynamic = 'force-dynamic';

export default async function GestaoPage() {
  const session = await requireModule('casa');
  const [aprov, sops] = await Promise.all([
    sql`SELECT * FROM internal_tasks WHERE tenant_id = ${session.tenantId} AND kind = 'aprovacao' AND NOT done ORDER BY id`,
    sql`SELECT * FROM internal_tasks WHERE tenant_id = ${session.tenantId} AND kind = 'sop' ORDER BY id`,
  ]);

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        <b>Gestão Interna:</b> todo o processo interno — administrativo, contratos, SOPs, aprovações e logística central —
        da rádio e da agência num só lugar. A dor nº 1 (organizar a operação) vira painel.
      </Hint>
      <div className="cards g3">
        <Card title="Processos & aprovações" tag={`${aprov.length} aguardando`}>
          {aprov.map((a) => (
            <ListLi key={a.id} icoTone="amber" ico={a.title.slice(0, 1)} title={a.title} sub={a.detail} right={<ApproveButton id={a.id} />} />
          ))}
          {aprov.length === 0 && <div className="tiny muted">Nenhuma aprovação pendente.</div>}
        </Card>
        <Card title="SOPs / Procedimentos" tag="biblioteca">
          <ChecklistLive items={sops.map((s) => ({ id: s.id, label: s.title, done: s.done }))} />
        </Card>
        <Card title="Administrativo & RH" tag="status">
          <BarRow label="Contratos em dia" value="78%" pct={78} />
          <BarRow label="Prestações de conta fechadas" value="64%" pct={64} />
          <BarRow label="Documentos digitalizados" value="90%" pct={90} />
        </Card>
      </div>
    </section>
  );
}
