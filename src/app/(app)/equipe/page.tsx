import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Card, Chip } from '@/components/ui';
import { QuickAdd } from '@/components/QuickAdd';

export const dynamic = 'force-dynamic';

export default async function EquipePage() {
  const session = await requireModule('equipe');
  const rows = await sql`SELECT * FROM team_schedule WHERE tenant_id = ${session.tenantId} ORDER BY id`;
  return (
    <section className="view on">
      <Card
        title="Escala da semana"
        tag="locução + campo"
        right={
          <QuickAdd
            label="+ Pessoa na escala"
            title="Adicionar pessoa à escala"
            endpoint="/api/team"
            small
            fields={[
              { key: 'person', label: 'Nome' },
              { key: 'role', label: 'Função', type: 'select', options: ['Locução', 'Campo', 'Campo/Som', 'Produção', 'Técnica'] },
              { key: 'shift', label: 'Turno / ação (ex.: Drive 17–20h)' },
              { key: 'day', label: 'Dias (ex.: Seg–Sex)', value: 'Seg–Sex' },
              { key: 'status', label: 'Status', type: 'select', options: ['OK / escalado', 'Em campo', 'Locução IA', 'Folga'] },
            ]}
            successMsg="Pessoa adicionada à escala da semana."
          />
        }
        pad0>
        <table>
          <thead><tr><th>Pessoa</th><th>Função</th><th>Turno / Ação</th><th>Dias</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="b">{r.person}</td><td>{r.role}</td><td>{r.shift}</td><td>{r.day}</td>
                <td>
                  {r.status === 'ok' ? <Chip tone="green">ok</Chip>
                    : r.status === 'em campo' ? <Chip tone="amber">em campo</Chip>
                    : r.status === 'auto' ? <Chip tone="blue">IA</Chip>
                    : <Chip tone="gray">{r.status}</Chip>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
