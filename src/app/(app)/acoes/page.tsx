import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { SecTitle, Card, Chip, Hint, Bar } from '@/components/ui';

export const dynamic = 'force-dynamic';

const COLS = ['Briefing', 'Planejada', 'Em campo', 'Concluída'];

export default async function AcoesPage() {
  const session = await requireModule('acoes');
  const acts = await sql`SELECT * FROM activations WHERE tenant_id = ${session.tenantId} ORDER BY id`;
  const emCampo = acts.find((a) => a.stage === 'Em campo');
  const checklist = (emCampo?.checklist || []) as { item: string; done: boolean }[];

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        <b>Da venda à execução:</b> o vendedor personaliza a ação (chamadas, cidade, equipe) e a operação recebe a ficha
        pronta — carro, caixas de som, com/sem FM, pendrive. Nada se perde no caminho.
      </Hint>
      <div className="board">
        {COLS.map((col) => {
          const items = acts.filter((a) => a.stage === col);
          return (
            <div className="col" key={col}>
              <h4 className="disp">{col} <span className="n">{items.length}</span></h4>
              {items.map((a) => (
                <div className="task" key={a.id} style={a.stage === 'Em campo' ? { borderColor: 'rgba(255,226,0,.55)' } : undefined}>
                  <b>{a.name}</b>
                  <div className="tiny muted">{a.client ? `Cliente: ${a.client}` : a.when_label}</div>
                  {a.progress > 0 && a.progress < 100 && <div className="bar" style={{ marginTop: 8 }}><i style={{ width: `${a.progress}%` }} /></div>}
                  <div className="meta">
                    <span className="chip c-gray">{a.city}/{a.uf}</span>
                    {!a.has_fm && <span className="chip c-amber">SEM FM · pendrive</span>}
                    {a.speakers && <span className="chip c-teal">{a.speakers}</span>}
                    {a.stage === 'Concluída' && a.when_label?.includes('prestação') && <span className="chip c-red">financeiro</span>}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {emCampo && (
        <>
          <SecTitle right={<span className="badge-live"><span className="dot" />EM CAMPO</span>}>
            Ficha de execução — {emCampo.name}
          </SecTitle>
          <div className="cards g2">
            <Card title="Personalização (comercial)">
              <div className="form">
                <div className="field"><label>Cidade / Praça</label><input readOnly defaultValue={`${emCampo.city} / ${emCampo.uf}`} /></div>
                <div className="field"><label>Cliente</label><input readOnly defaultValue={emCampo.client || ''} /></div>
                <div className="field"><label>Nº de chamadas</label><input readOnly defaultValue="8 inserções/dia" /></div>
                <div className="field"><label>Período</label><input readOnly defaultValue="25–27/07" /></div>
                <div className="field"><label>Tipo de ação</label><input readOnly defaultValue="Sampling + sorteio" /></div>
                <div className="field"><label>Pega FM na praça?</label><input readOnly defaultValue={emCampo.has_fm ? 'Sim' : 'Não — usar pendrive'} /></div>
              </div>
            </Card>
            <Card title="Logística (execução)">
              <div className="form" style={{ marginBottom: 12 }}>
                <div className="field"><label>Veículo</label><input readOnly defaultValue={emCampo.vehicle || '—'} /></div>
                <div className="field"><label>Equipe (pessoas)</label><input readOnly defaultValue={emCampo.team || '—'} /></div>
                <div className="field"><label>Caixas de som</label><input readOnly defaultValue={emCampo.speakers || '—'} /></div>
                <div className="field"><label>Fonte de áudio</label><input readOnly defaultValue={emCampo.audio_source} /></div>
              </div>
              <div className="tiny b" style={{ marginBottom: 6 }}>Checklist de campo</div>
              {checklist.map((c) => (
                <div key={c.item} className={`check ${c.done ? '' : 'off'}`}><span className="box">✓</span> {c.item}</div>
              ))}
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
