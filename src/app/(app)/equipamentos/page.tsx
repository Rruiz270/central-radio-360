import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Card, Chip, Hint, SecTitle } from '@/components/ui';
import { QuickAdd } from '@/components/QuickAdd';

export const dynamic = 'force-dynamic';

export default async function EquipamentosPage() {
  const session = await requireModule('estoque');
  const eq = await sql`SELECT * FROM equipment WHERE tenant_id = ${session.tenantId} ORDER BY kind, id`;
  const caixas = eq.filter((e) => e.kind === 'caixa');
  const frota = eq.filter((e) => e.kind === 'veiculo');
  const pendrives = eq.filter((e) => e.kind === 'pendrive');
  const totalCaixas = caixas.reduce((a, e) => a + e.qty, 0);

  const statusChip = (s: string) =>
    s === 'disponivel' ? <Chip tone="green">disponível</Chip>
      : s === 'em campo' ? <Chip tone="amber">em campo</Chip>
      : s === 'critico' ? <Chip tone="red">crítico</Chip>
      : <Chip tone="gray">{s}</Chip>;

  return (
    <section className="view on">
      <SecTitle
        right={
          <QuickAdd
            label="+ Novo equipamento"
            title="Cadastrar equipamento / veículo"
            endpoint="/api/equipment"
            small
            fields={[
              { key: 'name', label: 'Nome (ex.: Caixa JBL 15", Van — ABC1D23)', full: true },
              { key: 'kind', label: 'Tipo', type: 'select', options: ['Caixa de som', 'Veículo', 'Pendrive', 'Outro'] },
              { key: 'qty', label: 'Quantidade', value: '1' },
              { key: 'status', label: 'Status', type: 'select', options: ['Disponível', 'Em campo', 'Manutenção', 'Crítico'] },
              { key: 'note', label: 'Observação' },
            ]}
            successMsg="Equipamento cadastrado no inventário."
          />
        }
      >
        Inventário da agência
      </SecTitle>
      <div className="cards g3">
        <Card title="Caixas de som" tag={`${totalCaixas} no total`}>
          {caixas.map((e) => (
            <div key={e.id} className="list-li">
              <div className="ico c-blue">{e.qty}</div>
              <div style={{ flex: 1 }}><b>{e.name}</b>{e.note && <div className="tiny muted">{e.note}</div>}</div>
              {statusChip(e.status)}
            </div>
          ))}
        </Card>
        <Card title="Frota" tag={`${frota.length} veículos`} pad0>
          <table>
            <thead><tr><th>Veículo</th><th>Status</th></tr></thead>
            <tbody>
              {frota.map((e) => (
                <tr key={e.id}><td className="b">{e.name}</td><td>{statusChip(e.status)}{e.note && <span className="tiny muted"> · {e.note}</span>}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Pendrives (sem FM)" tag="crítico">
          {pendrives.map((e) => (
            <div key={e.id}>
              <div className="list-li">
                <div className="ico c-red">{e.qty}</div>
                <div style={{ flex: 1 }}><b>{e.name}</b><div className="tiny muted">{e.note}</div></div>
                {statusChip(e.status)}
              </div>
              <Hint tone="r" style={{ marginTop: 10 }}>
                Estoque abaixo do mínimo — gatilho automático já disparou no WhatsApp do grupo Produção.
              </Hint>
            </div>
          ))}
        </Card>
      </div>
    </section>
  );
}
