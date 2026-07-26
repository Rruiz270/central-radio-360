import { Kpi, SecTitle, Card, Chip, BarRow, Mini, Hint, fmtBRL } from '@/components/ui';
import { MaterialCard } from '@/components/MaterialCard';

/* Visão da campanha — compartilhada entre o módulo interno e o portal público (token) */
export function CampaignView({ campaign, materials, proofs, token }: {
  campaign: Record<string, unknown>;
  materials: Record<string, unknown>[];
  proofs: Record<string, unknown>[];
  token?: string;
}) {
  const c = campaign as { contracted: number; aired: number; reach: string; clicks: number; investment: string };
  return (
    <>
      <div className="cards g4" style={{ marginBottom: 8 }}>
        <Kpi label="Inserções veiculadas" value={String(c.aired)} delta={`de ${c.contracted} contratadas`} deltaTone="up" />
        <Kpi label="Alcance estimado" value={c.reach || '—'} delta="Kantar + streaming" deltaTone="up" tone="b2" />
        <Kpi label="Cliques / leads" value={String(c.clicks)} delta="cupom + link bio" deltaTone="up" tone="y" />
        <Kpi label="Investimento" value={fmtBRL(Number(c.investment))} delta={`${Math.round((c.aired / Math.max(1, c.contracted)) * 100)}% executado`} tone="r" />
      </div>

      <SecTitle right={<span className="tiny muted">o cliente aprova, reprova ou sobe o material</span>}>Aprovação de materiais</SecTitle>
      <div className="cards g3" style={{ marginBottom: 12 }}>
        {materials.map((m) => {
          const mm = m as { id: number; kind: string; title: string; status: string; note: string | null };
          return <MaterialCard key={mm.id} id={mm.id} kind={mm.kind} title={mm.title} status={mm.status} note={mm.note} token={token} />;
        })}
      </div>
      <div className="drop">Arraste aqui ou clique para <b>subir um material</b> (áudio, imagem ou vídeo)</div>

      <SecTitle right={<span className="tiny muted">horários que o spot entrou no ar</span>}>Comprovação de veiculação (prova)</SecTitle>
      <Card pad0>
        <table>
          <thead><tr><th>Data</th><th>Hora</th><th>Programa</th><th>Praça</th><th>Status</th></tr></thead>
          <tbody>
            {proofs.map((p) => {
              const pp = p as { id: number; aired_on: string; aired_at: string; program: string; praca: string; status: string };
              return (
                <tr key={pp.id}>
                  <td>{new Date(pp.aired_on).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td>
                  <td>{pp.aired_at}</td><td>{pp.program}</td><td>{pp.praca}</td>
                  <td>{pp.status === 'veiculado' ? <Chip tone="green">veiculado</Chip> : <Chip tone="blue">programado</Chip>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <SecTitle>Desempenho da campanha</SecTitle>
      <div className="cards g2">
        <Card title="Entrega por faixa horária">
          <BarRow label="Manhã 6–10h" value="62 inserções" pct={88} />
          <BarRow label="Tarde 12–16h" value="44" pct={60} />
          <BarRow label="Drive 17–20h" value="42" pct={58} />
        </Card>
        <Card title="Retorno" tag="cupom / link">
          <Mini items={[{ v: String(c.clicks), l: 'cliques' }, { v: '312', l: 'cupons usados' }, { v: '4,2%', l: 'conversão' }]} />
          <Hint style={{ marginTop: 14 }}>Relatório enviado automático ao cliente por WhatsApp ao fim da campanha.</Hint>
        </Card>
      </div>
    </>
  );
}
