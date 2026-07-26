import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Card, Chip, Hint } from '@/components/ui';
import { CampaignView } from '@/components/CampaignView';
import { CopyLink } from '@/components/CopyLink';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PortalClientePage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const session = await requireModule('cliente');
  const { c } = await searchParams;
  const campaigns = await sql`SELECT * FROM campaigns WHERE tenant_id = ${session.tenantId} ORDER BY id`;
  const campaign = campaigns.find((x) => String(x.id) === c) || campaigns[0];
  if (!campaign) return <Hint>Nenhuma campanha cadastrada ainda.</Hint>;
  const [materials, proofs] = await Promise.all([
    sql`SELECT * FROM materials WHERE campaign_id = ${campaign.id} ORDER BY id`,
    sql`SELECT * FROM airing_proofs WHERE campaign_id = ${campaign.id} ORDER BY aired_on, aired_at`,
  ]);

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        <b>Página do Cliente</b> — o próprio anunciante acessa (link exclusivo) para <b>acompanhar a campanha em tempo
        real</b>, ver a comprovação de veiculação e <b>aprovar ou subir</b> materiais (spot, testemunhal, arte, vídeo).
      </Hint>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div className="field" style={{ minWidth: 260 }}>
            <label>Cliente / Campanha</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {campaigns.map((x) => (
                <Link
                  key={x.id}
                  href={`/portal-cliente?c=${x.id}`}
                  className="btn sm"
                  style={x.id === campaign.id ? { borderColor: 'var(--mblue-l)', background: 'rgba(61,94,255,.16)', color: '#fff' } : undefined}
                >
                  {x.advertiser} — {x.name}
                </Link>
              ))}
            </div>
          </div>
          <span style={{ marginLeft: 'auto' }}><Chip tone="green">Campanha ativa</Chip></span>
          <Chip tone="gray">{campaign.period}</Chip>
          <CopyLink token={campaign.token} />
        </div>
      </Card>
      <CampaignView campaign={campaign} materials={materials} proofs={proofs} />
    </section>
  );
}
