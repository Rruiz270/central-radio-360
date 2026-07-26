import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Kpi, SecTitle, Card, Hint, ListLi, WaBadge } from '@/components/ui';
import { AlertRulesTable, NewRuleForm } from '@/components/AlertRules';

export const dynamic = 'force-dynamic';

export default async function AlertasPage() {
  const session = await requireModule('alertas');
  const [rules, log] = await Promise.all([
    sql`SELECT * FROM alert_rules WHERE tenant_id = ${session.tenantId} ORDER BY id`,
    sql`SELECT * FROM alert_log WHERE tenant_id = ${session.tenantId} ORDER BY sent_at DESC LIMIT 8`,
  ]);
  const active = rules.filter((r) => r.active).length;

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        Cada área tem <b>gatilhos automáticos</b> que disparam mensagem no WhatsApp para o grupo responsável — sem ninguém
        precisar lembrar. Ligue/desligue e teste cada um.
      </Hint>
      <div className="cards g4" style={{ marginBottom: 8 }}>
        <Kpi label="Alertas hoje" value={String(log.length)} delta={`entregues ${log.filter((l) => l.status === 'entregue').length}`} deltaTone="up" />
        <Kpi label="Gatilhos ativos" value={String(active)} delta={`de ${rules.length}`} tone="b2" />
        <Kpi label="Grupos WhatsApp" value="9" delta="por área" tone="y" />
        <Kpi label="Taxa de entrega" value="98%" delta="Meta Cloud API" deltaTone="up" tone="r" />
      </div>

      <div className="cards g2" style={{ marginBottom: 8 }}>
        <Card title="Novo gatilho automático" right={<WaBadge>WhatsApp</WaBadge>}><NewRuleForm /></Card>
        <Card title="Fila de alertas — ao vivo" right={<span className="badge-live"><span className="dot" />AO VIVO</span>}>
          {log.map((l) => (
            <ListLi
              key={l.id}
              icoTone={l.status === 'entregue' ? 'green' : 'amber'}
              ico={l.title.slice(0, 1).toUpperCase()}
              title={l.title}
              sub={`${l.wa_group} · ${new Date(l.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
              right={<WaBadge>{l.status}</WaBadge>}
            />
          ))}
        </Card>
      </div>

      <SecTitle right={<span className="tiny muted">clique em Testar para simular o disparo</span>}>Gatilhos por área</SecTitle>
      <Card pad0><AlertRulesTable rules={rules as never} /></Card>
    </section>
  );
}
