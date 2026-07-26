import { requireModule } from '@/lib/guard';
import { Card, Chip, Hint, ListLi } from '@/components/ui';

export default async function TecnicaPage() {
  await requireModule('tecnica');
  return (
    <section className="view on">
      <div className="cards g3">
        <Card title="Transmissão" tag="status">
          <div className="check"><span className="box">✓</span> Transmissor principal — OK</div>
          <div className="check"><span className="box">✓</span> Link de estúdio — OK</div>
          <div className="check off"><span className="box">✓</span> Torre secundária — inspeção pendente</div>
          <Hint style={{ marginTop: 10 }}>Sinal FM não cobre todas as praças (ex.: Recife) → ações usam pendrive. Integra com Operações.</Hint>
        </Card>
        <Card title="Estúdios & TI" pad0>
          <table>
            <thead><tr><th>Recurso</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td className="b">Estúdio 1 (locução)</td><td><Chip tone="green">operante</Chip></td></tr>
              <tr><td className="b">Estúdio 2 (podcast/vídeo)</td><td><Chip tone="amber">em uso</Chip></td></tr>
              <tr><td className="b">Automação (player)</td><td><Chip tone="green">no ar</Chip></td></tr>
            </tbody>
          </table>
        </Card>
        <Card title="Manutenção" tag="rotina">
          <ListLi icoTone="blue" ico="P" title="Preventiva transmissor" sub="agendada 02/08" />
          <ListLi icoTone="teal" ico="A" title="Ajuste processador de áudio" sub="concluído" />
        </Card>
      </div>
    </section>
  );
}
