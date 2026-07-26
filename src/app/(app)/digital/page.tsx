import { requireModule } from '@/lib/guard';
import { Kpi, Card, Chip, Hint, BarRow } from '@/components/ui';

export default async function DigitalPage() {
  await requireModule('digital');
  return (
    <section className="view on">
      <div className="cards g4" style={{ marginBottom: 8 }}>
        <Kpi label="Ouvintes streaming" value="8.4k" delta="▲ 12%" deltaTone="up" />
        <Kpi label="Seguidores (redes)" value="312k" delta="▲ 3.1k" deltaTone="up" tone="b2" />
        <Kpi label="Episódios podcast" value="146" delta="4 no mês" tone="y" />
        <Kpi label="Views vídeo/mês" value="1.2M" delta="▲ 9%" deltaTone="up" tone="r" />
      </div>
      <div className="cards g2">
        <Card title="Conteúdo on-demand" tag="portal + app" pad0>
          <table>
            <thead><tr><th>Conteúdo</th><th>Formato</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td className="b">Entrevista da semana</td><td>Vídeo + corte</td><td><Chip tone="green">publicado</Chip></td></tr>
              <tr><td className="b">Podcast — bastidores</td><td>Áudio</td><td><Chip tone="amber">edição</Chip></td></tr>
              <tr><td className="b">Reels — melhores momentos</td><td>Vídeo curto</td><td><Chip tone="blue">agendado</Chip></td></tr>
            </tbody>
          </table>
        </Card>
        <Card title="Integração rádio ↔ vídeo ↔ digital">
          <Hint>O mesmo conteúdo vira rádio (ao vivo), vídeo (streaming), corte (redes) e on-demand (app). O digital amplia o alcance da Metropolitana.</Hint>
          <div style={{ marginTop: 12 }}>
            <BarRow label="Live simultânea rádio+vídeo" value="ativa" pct={100} />
          </div>
        </Card>
      </div>
    </section>
  );
}
