import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Kpi, SecTitle, Card, Chip, Hint } from '@/components/ui';
import { Composer } from '@/components/Composer';
import { TrendFeed } from '@/components/TrendFeed';

export const dynamic = 'force-dynamic';

const PI: Record<string, [string, string, string]> = {
  youtube: ['yt', 'YT', 'YouTube'],
  instagram: ['ig', 'IG', 'Instagram / Meta'],
  facebook: ['fb', 'f', 'Facebook'],
  tiktok: ['tt', 'TT', 'TikTok'],
  google: ['gg', 'G', 'Google Business / Ads'],
  x: ['xx', 'X', 'X (Twitter)'],
};

export default async function MarketingPage() {
  const session = await requireModule('marketing');
  const [accounts, posts, trends] = await Promise.all([
    sql`SELECT * FROM social_accounts WHERE tenant_id = ${session.tenantId} ORDER BY id`,
    sql`SELECT * FROM posts WHERE tenant_id = ${session.tenantId} ORDER BY id DESC LIMIT 10`,
    sql`SELECT * FROM trends ORDER BY posted, id`,
  ]);
  const connected = accounts.filter((a) => a.connected).length;

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        <b>Central de Marketing:</b> todas as redes plugadas por API. Os colaboradores criam e agendam posts num só lugar —
        com publicação automática, geração por IA e captação de novidades/tendências que viram post na hora.
      </Hint>
      <div className="cards g4" style={{ marginBottom: 8 }}>
        <Kpi label="Contas conectadas" value={`${connected}/${accounts.length}`} delta="conectar em Configurações" />
        <Kpi label="Posts agendados" value={String(posts.filter((p) => p.status === 'agendado').length)} delta="próx. 7 dias" tone="b2" />
        <Kpi label="Alcance semana" value="1.9M" delta="▲ 9%" deltaTone="up" tone="y" />
        <Kpi label="Auto-posts (IA)" value="42" delta="novidades/hora" deltaTone="up" tone="r" />
      </div>

      <div className="cards g2" style={{ marginBottom: 8 }}>
        <Card title="Contas conectadas (API)" right={<span className="wa"><span className="wd" />OAuth</span>}>
          {accounts.map((a) => {
            const [cls, letter, name] = PI[a.platform] || ['gg', '?', a.platform];
            return (
              <div className="plat" key={a.id}>
                <div className={`pi ${cls}`}>{letter}</div>
                <div style={{ flex: 1 }}><b>{name}</b><div className="tiny muted">{a.handle} · {a.followers}</div></div>
                {a.connected ? <span className="lock">conectado</span> : <a className="btn sm" href="/configuracoes">Conectar</a>}
              </div>
            );
          })}
        </Card>
        <Card title="Criar publicação"><Composer /></Card>
      </div>

      <SecTitle right={<span className="tiny muted">vira post com 1 clique</span>}>Radar de novidades & tendências (scraping)</SecTitle>
      <Card><TrendFeed trends={trends as never} /></Card>

      <SecTitle>Fila de publicações</SecTitle>
      <Card pad0>
        <table>
          <thead><tr><th>Post</th><th>Redes</th><th>Quando</th><th>Responsável</th><th>Status</th></tr></thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td className="b">{p.body.length > 48 ? p.body.slice(0, 48) + '…' : p.body}</td>
                <td>{(p.platforms as string[]).map((x) => x.slice(0, 2).toUpperCase()).join(' · ')}</td>
                <td>{p.status === 'recorrente' ? 'Auto (IA)' : p.scheduled_for ? new Date(p.scheduled_for).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'agora'}</td>
                <td>{p.owner}</td>
                <td>
                  {p.status === 'publicado' ? <Chip tone="green">publicado</Chip>
                    : p.status === 'recorrente' ? <Chip tone="green">recorrente</Chip>
                    : p.status === 'agendado' ? <Chip tone="blue">agendado</Chip>
                    : <Chip tone="amber">{p.status}</Chip>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
