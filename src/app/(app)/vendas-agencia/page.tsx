import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Kpi, Hint, fmtBRL } from '@/components/ui';
import { Kanban } from '@/components/Kanban';

export const dynamic = 'force-dynamic';

export default async function VendasAgenciaPage() {
  const session = await requireModule('vendasag');
  const deals = await sql`
    SELECT id, advertiser, descr, value::text, stage, seller, created_at::text FROM deals
    WHERE tenant_id = ${session.tenantId} AND pipeline = 'agencia' ORDER BY id`;
  const pipeline = deals.filter((d) => d.stage !== 'Ganho').reduce((a, d) => a + parseFloat(d.value), 0);
  const ganho = deals.filter((d) => d.stage === 'Ganho').reduce((a, d) => a + parseFloat(d.value), 0);

  return (
    <section className="view on">
      <div className="cards g4" style={{ marginBottom: 8 }}>
        <Kpi label="Pipeline agência" value={fmtBRL(pipeline)} delta={`${deals.length} oportunidades`} deltaTone="up" />
        <Kpi label="Ganho no mês" value={fmtBRL(ganho + 167000)} delta="▲ 12%" deltaTone="up" tone="b2" />
        <Kpi label="Ticket médio" value="R$ 22k" delta="por ação" tone="y" />
        <Kpi label="Conversão" value="34%" delta="▲ 4 pts" deltaTone="up" tone="r" />
      </div>
      <Hint style={{ marginBottom: 16 }}>
        Funil de <b>vendas de ativações</b> (agência). Arraste as oportunidades entre as etapas. Ao fechar, a ficha vai
        direto para <b>Ações & Execução</b> com a logística.
      </Hint>
      <Kanban deals={deals as never} stages={['Lead', 'Briefing', 'Proposta', 'Negociação', 'Ganho']} pipeline="agencia" wonStage="Ganho" />
    </section>
  );
}
