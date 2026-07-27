import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Kpi, SecTitle, Card, Chip, Hint, Bar, BarRow } from '@/components/ui';
import { MarketSync, EditFollowers } from '@/components/MarketSync';
import { QuickAdd } from '@/components/QuickAdd';

export const dynamic = 'force-dynamic';

const fmtK = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);

export default async function ConcorrenciaPage() {
  const session = await requireModule('concorrencia');
  const [tenant] = await sql`SELECT * FROM tenants WHERE id = ${session.tenantId}`;
  const [comps, ourSocial, rbSelf] = await Promise.all([
    sql`SELECT * FROM competitors WHERE tenant_id = ${session.tenantId} ORDER BY ig_followers DESC`,
    sql`SELECT followers FROM social_accounts WHERE tenant_id = ${session.tenantId} AND platform = 'instagram'`,
    sql`SELECT value FROM settings WHERE key = 'rb_metropolitana'`,
  ]);

  const ourIg = parseInt(String(ourSocial[0]?.followers || '512k').replace(/\D/g, ''), 10) * (String(ourSocial[0]?.followers || '512k').includes('k') ? 1000 : 1) || 512000;
  const rb = rbSelf[0]?.value ? JSON.parse(rbSelf[0].value) : null;
  const maxIg = Math.max(ourIg, ...comps.map((c) => c.ig_followers), 1);
  const totalIg = ourIg + comps.reduce((a, c) => a + c.ig_followers, 0);
  const sovDigital = Math.round((ourIg / totalIg) * 100);
  const pop = tenant.population ? Number(tenant.population) : null;
  const penetration = pop ? Math.round((Number(tenant.listeners) / pop) * 100) : null;
  const rank = 1 + comps.filter((c) => c.ig_followers > ourIg).length;
  const maxClicks = Math.max(rb?.clicks || 0, ...comps.map((c) => c.rb_clicks), 1);

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        <b>Concorrência — {tenant.city} ({tenant.freq}):</b> comparativo da praça usando <b>APIs públicas</b> — população
        IBGE (SIDRA) e popularidade digital do diretório <b>Radio-Browser</b> (cliques/votos de players do mundo todo) —
        mais os números sociais de cada emissora (clique num número pra editar).{' '}
        <b>Kantar entra aqui</b> como a métrica oficial quando o contrato for plugado.
      </Hint>

      <div className="cards g4" style={{ marginBottom: 8 }}>
        <Kpi label="Concorrentes monitorados" value={String(comps.length)} delta={`praça ${tenant.city}`} />
        <Kpi label="Share of voice digital (IG)" value={`${sovDigital}%`} delta={`#${rank} da praça em seguidores`} deltaTone={rank === 1 ? 'up' : 'flat'} tone="b2" />
        <Kpi label="População da praça (IBGE)" value={pop ? fmtK(pop) : '—'} delta={pop ? 'fonte: SIDRA t6579' : 'clique em sincronizar'} tone="y" />
        <Kpi label="Penetração de audiência" value={penetration != null ? `${penetration}%` : '—'} delta={`${fmtK(Number(tenant.listeners))} ouvintes/dia ÷ população`} deltaTone="up" tone="r" />
      </div>

      <SecTitle
        right={
          <span style={{ display: 'flex', gap: 8 }}>
            <QuickAdd
              label="+ Concorrente"
              title="Monitorar novo concorrente"
              endpoint="/api/competitors"
              small
              primary={false}
              fields={[
                { key: 'name', label: 'Nome da rádio' },
                { key: 'dial', label: 'Dial (ex.: 102.1)' },
                { key: 'ig_handle', label: 'Instagram (@handle)' },
                { key: 'ig_followers', label: 'Seguidores IG (número)', type: 'number' },
                { key: 'yt_subs', label: 'Inscritos YouTube (número)', type: 'number' },
                { key: 'rb_name', label: 'Nome no Radio-Browser (p/ sync)' },
              ]}
              successMsg="Concorrente monitorado — sincronize pra puxar a popularidade digital."
            />
            <MarketSync />
          </span>
        }
      >
        Comparativo da praça
      </SecTitle>
      <Card pad0 style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr><th>Emissora</th><th>Dial</th><th>Instagram</th><th>YouTube</th><th>Popularidade digital*</th><th>Fonte</th></tr>
          </thead>
          <tbody>
            <tr style={{ background: 'rgba(0,32,184,.04)' }}>
              <td className="b">Metropolitana FM</td>
              <td>{tenant.freq}</td>
              <td className="b">{fmtK(ourIg)}</td>
              <td className="b">380k</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bar pct={((rb?.clicks || 0) / maxClicks) * 100} width={110} />
                  <span className="tiny muted">{rb ? `${fmtK(rb.clicks)} cliques · ${rb.votes} votos` : 'sincronizar'}</span>
                </div>
              </td>
              <td><Chip tone="blue">nós</Chip></td>
            </tr>
            {comps.map((c) => (
              <tr key={c.id}>
                <td className="b">{c.name}</td>
                <td>{c.dial || '—'}</td>
                <td><EditFollowers id={c.id} field="ig_followers" current={c.ig_followers} label={`Instagram de ${c.name}`} /></td>
                <td><EditFollowers id={c.id} field="yt_subs" current={c.yt_subs} label={`YouTube de ${c.name}`} /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bar pct={(c.rb_clicks / maxClicks) * 100} width={110} />
                    <span className="tiny muted">{c.rb_clicks > 0 ? `${fmtK(c.rb_clicks)} cliques · ${c.rb_votes} votos` : '—'}</span>
                  </div>
                </td>
                <td>
                  {c.source === 'estimativa'
                    ? <Chip tone="amber">estimativa — editar</Chip>
                    : <Chip tone="gray">{c.source}</Chip>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="cards g2">
        <Card title="Share of voice — Instagram da praça">
          <BarRow label={`Metropolitana (${tenant.freq})`} value={fmtK(ourIg)} pct={(ourIg / maxIg) * 100} />
          {comps.map((c) => (
            <BarRow key={c.id} label={c.name} value={fmtK(c.ig_followers)} pct={(c.ig_followers / maxIg) * 100} />
          ))}
          <Hint style={{ marginTop: 12 }}>
            Números sociais dos concorrentes são <b>editáveis</b> (clique no valor) até plugarmos coleta automática — a
            atualização manual leva 5 min/mês e mantém o comparativo honesto.
          </Hint>
        </Card>
        <Card title="Leitura estratégica" tag="automática">
          <div className="check"><span className="box">✓</span> {rank === 1 ? 'Metropolitana lidera a praça em seguidores IG' : `Metropolitana é #${rank} em seguidores IG na praça`}</div>
          <div className="check"><span className="box">✓</span> Share of voice digital de {sovDigital}% entre as monitoradas</div>
          {penetration != null && (
            <div className="check"><span className="box">✓</span> Alcance diário equivale a {penetration}% da população de {tenant.city} (IBGE)</div>
          )}
          <div className={`check ${rb ? '' : 'off'}`}><span className="box">✓</span> Popularidade em players digitais {rb ? `coletada (${fmtK(rb.clicks)} cliques)` : 'aguardando sincronização'}</div>
          <Hint tone="y" style={{ marginTop: 12 }}>
            *Popularidade digital = cliques/votos no diretório público Radio-Browser (proxy de streaming). A "moeda"
            oficial de negociação segue sendo Kantar — entra quando o contrato for plugado (§5 da doc v2).
          </Hint>
        </Card>
      </div>
    </section>
  );
}
