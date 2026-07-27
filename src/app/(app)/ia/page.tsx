import Link from 'next/link';
import { requireModule } from '@/lib/guard';
import { Kpi, SecTitle, Card, Hint, ListLi, AiTag, BarRow } from '@/components/ui';
import { PricingApply } from '@/components/actions';

export default async function IaPage() {
  await requireModule('ia');
  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        <b>Camada de IA (padrão americano — Futuri RadioGPT / TopicPulse + Veritone):</b> descoberta de pauta, geração de
        script, voz sintética, locução automática e tradução — tudo conectado à rádio e à agência.
      </Hint>
      <div className="cards g4" style={{ marginBottom: 8 }}>
        <Kpi label="Pautas descobertas (TopicPulse)" value="85" delta="radar hoje" deltaTone="up" />
        <Kpi label="Scripts gerados" value="12" delta="boletins + spots" tone="b2" />
        <Kpi label="Horas de locução IA" value="5h" delta="madrugada 00–05h" tone="y" />
        <Kpi label="Anúncios verificados" value="100%" delta="Veritone" deltaTone="up" tone="r" />
      </div>
      <div className="cards g3">
        <Card title="Descoberta de pauta" right={<AiTag>TopicPulse</AiTag>}>
          <div className="tiny muted">A IA varre notícias e redes e entrega pautas locais quentes — alimenta a redação e a locução.</div>
          <div className="check" style={{ marginTop: 10 }}><span className="box">✓</span> 85 notícias → 5 pautas</div>
          <div className="check"><span className="box">✓</span> Ranqueadas por potencial de audiência</div>
          <Link href="/jornalismo" className="btn p sm" style={{ marginTop: 10, display: 'inline-flex' }}>Ver no Radar →</Link>
        </Card>
        <Card title="Locução automática" right={<AiTag>AudioAI</AiTag>}>
          <div className="tiny muted">Voz sintética (ou clone de locutor) apresenta a madrugada e cobre horários sem equipe.</div>
          <div style={{ marginTop: 10 }}><BarRow label="Cobertura por IA" value="00h–05h" pct={42} /></div>
          <div className="check off" style={{ marginTop: 8 }}><span className="box">✓</span> Aprovar voz clonada do locutor João</div>
        </Card>
        <Card title="Tradução & verificação" right={<AiTag>Veritone</AiTag>}>
          <div className="tiny muted">Traduz podcasts para outras línguas e verifica veiculação de anúncios (inclusive menções orgânicas).</div>
          <div className="check" style={{ marginTop: 10 }}><span className="box">✓</span> Podcast traduzido (EN/ES)</div>
          <div className="check"><span className="box">✓</span> Spots do dia verificados</div>
        </Card>
      </div>

      <SecTitle>Pipeline de conteúdo por IA</SecTitle>
      <Card>
        <div className="steps">
          {['Descobre pauta (TopicPulse)', 'Gera script (IA)', 'Converte em voz', 'Entra na grade/locução', 'Publica no digital'].map((s, i) => (
            <span key={s} style={{ display: 'contents' }}>
              <div className={`step ${i < 2 ? 'done' : i === 2 ? 'now' : ''}`}><span className="n">{i < 2 ? '✓' : i + 1}</span> {s}</div>
              {i < 4 && <span className="arrow">→</span>}
            </span>
          ))}
        </div>
      </Card>

      <SecTitle right={<span className="tiny muted">diferenciais que o WideOrbit não tem</span>}>Copilots comerciais & financeiros</SecTitle>
      <div className="cards g3">
        <Card title="Pricing Copilot" right={<AiTag />}>
          <div className="tiny muted">Sugere preço por daypart conforme demanda, ocupação e sazonalidade — vendedor fecha melhor.</div>
          <ListLi icoTone="green" ico="A" title="Almoço: subir p/ R$ 520" sub="ocupação 92%" right={<PricingApply daypart="Almoço" price={520} label="Almoço" />} />
          <ListLi icoTone="amber" ico="M" title="Madrugada: montar pacote" sub="ocupação 28%" right={<Link href="/comercial" className="btn sm">Ver</Link>} />
        </Card>
        <Card title="Delinquency Radar" right={<AiTag />}>
          <div className="tiny muted">Prevê quem vai atrasar (motor do Better Inadimplência) e dispara cobrança automática.</div>
          <div style={{ marginTop: 10 }}><BarRow label="Risco de inadimplência" value="R$ 24k" pct={30} red /></div>
          <Link href="/financeiro" className="btn p sm" style={{ marginTop: 12, display: 'inline-flex' }}>Ver Aging →</Link>
        </Card>
        <Card title="Log Copilot / auto-fill" right={<AiTag />}>
          <div className="tiny muted">Preenche o log de veiculação e sugere o melhor break para cada spot — menos digitação.</div>
          <div className="check" style={{ marginTop: 8 }}><span className="box">✓</span> 42 breaks preenchidos hoje</div>
          <div className="check off"><span className="box">✓</span> Revisar 3 conflitos de daypart</div>
          <Link href="/comercial" className="btn p sm" style={{ marginTop: 8, display: 'inline-flex' }}>Abrir Tráfego →</Link>
        </Card>
      </div>
    </section>
  );
}
