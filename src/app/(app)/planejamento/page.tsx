import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Card, Chip } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function PlanejamentoPage() {
  const session = await requireModule('planejamento');
  const acts = await sql`
    SELECT * FROM activations WHERE tenant_id = ${session.tenantId} AND stage != 'Concluída' ORDER BY id LIMIT 5`;

  return (
    <section className="view on">
      <div className="cards g2">
        <Card title="Conceito da ação" tag="criação">
          <div className="form">
            <div className="field full"><label>Nome da ação</label><input defaultValue="Verão RioMar — Rádio na Praia" /></div>
            <div className="field"><label>Objetivo</label>
              <select><option>Sampling + brand</option><option>Geração de leads</option><option>Test drive</option></select>
            </div>
            <div className="field"><label>Público</label><input defaultValue="Famílias, 25–45" /></div>
            <div className="field full"><label>Mecânica / roteiro</label><input defaultValue="Locutor ao vivo + sorteio a cada hora + brindes" /></div>
          </div>
          <button className="btn p" style={{ marginTop: 14 }}>Gerar briefing p/ execução →</button>
        </Card>
        <Card title="Calendário de ativações" tag="próximas praças" pad0>
          <table>
            <thead><tr><th>Praça</th><th>Data</th><th>FM?</th><th>Status</th></tr></thead>
            <tbody>
              {acts.map((a) => (
                <tr key={a.id}>
                  <td className="b">{a.city}</td><td>{a.when_label}</td>
                  <td>{a.has_fm ? <Chip tone="green">com FM</Chip> : <Chip tone="amber">sem FM</Chip>}</td>
                  <td>
                    {a.stage === 'Em campo' ? <Chip tone="red">em campo</Chip>
                      : a.stage === 'Planejada' ? <Chip tone="blue">planejada</Chip>
                      : <Chip tone="gray">briefing</Chip>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </section>
  );
}
