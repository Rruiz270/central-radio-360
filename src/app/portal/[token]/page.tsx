import { sql } from '@/lib/db';
import { Chip } from '@/components/ui';
import { CampaignView } from '@/components/CampaignView';
import { ToastProvider } from '@/components/Toast';

export const dynamic = 'force-dynamic';

/* Portal público do anunciante — acesso por link com token, sem login (§4 da doc) */
export default async function PortalPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [campaign] = await sql`SELECT * FROM campaigns WHERE token = ${token}`;
  if (!campaign) {
    return (
      <div className="login-wrap">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <h1 className="disp">Link inválido</h1>
          <p className="tiny muted">Este link de campanha não existe ou expirou. Fale com seu atendimento na Metropolitana.</p>
        </div>
      </div>
    );
  }
  const [materials, proofs] = await Promise.all([
    sql`SELECT m.*, f.uuid AS file_uuid FROM materials m LEFT JOIN files f ON f.id = m.file_id WHERE m.campaign_id = ${campaign.id} ORDER BY m.id`,
    sql`SELECT * FROM airing_proofs WHERE campaign_id = ${campaign.id} ORDER BY aired_on, aired_at`,
  ]);

  return (
    <ToastProvider>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 22px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, flexWrap: 'wrap' }}>
          <span className="memblem" style={{ background: '#fff', borderRadius: 11, padding: '5px 7px', display: 'inline-flex' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" width={34} height={34} alt="Metropolitana" />
          </span>
          <div>
            <div className="crumb" style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--txt-3)', fontWeight: 800 }}>
              Portal do Cliente · Metropolitana FM
            </div>
            <h1 className="disp" style={{ margin: 0, fontSize: 22, color: '#fff' }}>
              {campaign.advertiser} — {campaign.name}
            </h1>
          </div>
          <span style={{ marginLeft: 'auto' }}><Chip tone="green">Campanha ativa</Chip></span>
          <Chip tone="gray">{campaign.period}</Chip>
        </div>
        <CampaignView campaign={campaign} materials={materials} proofs={proofs} token={token} />
        <div style={{ marginTop: 40, borderTop: '1px solid var(--linha)', paddingTop: 14 }} className="tiny muted">
          Central 360 · Metropolitana FM 98.5 — dados atualizados em tempo real.
        </div>
      </div>
    </ToastProvider>
  );
}
