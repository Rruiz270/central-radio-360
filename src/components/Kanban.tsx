'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';
import { Modal } from './Modal';
import { fmtBRL } from './ui';

export type KDeal = {
  id: number; advertiser: string; descr: string | null; value: string; stage: string;
  seller?: string | null; created_at?: string;
};

const TONE: Record<string, string> = {
  Lead: 'gray', Contato: 'blue', Proposta: 'blue', Negociação: 'amber', Briefing: 'teal',
  Fechado: 'green', Ganho: 'green',
};

export function Kanban({ deals, stages, pipeline, wonStage, praca = '98.5 · SP' }: {
  deals: KDeal[]; stages: string[]; pipeline: 'radio' | 'agencia'; wonStage: string; praca?: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [items, setItems] = useState(deals);
  const [open, setOpen] = useState<KDeal | null>(null);
  const dragId = useRef<number | null>(null);
  const didDrag = useRef(false);
  const [overCol, setOverCol] = useState<string | null>(null);
  const isAg = pipeline === 'agencia';

  async function moveTo(id: number, stage: string, opts?: { silent?: boolean }) {
    const prev = items;
    setItems((its) => its.map((d) => (d.id === id ? { ...d, stage } : d)));
    setOpen((o) => (o && o.id === id ? { ...o, stage } : o));
    const res = await fetch(`/api/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) {
      setItems(prev);
      toast('Não foi possível mover o card.', 'warn');
      return false;
    }
    if (opts?.silent) return true;
    if (stage === wonStage) toast('Venda fechada!', 'ok');
    else toast('Avançou para: ' + stage, 'ok');
    return true;
  }

  const nextStage = (s: string) => stages[Math.min(stages.indexOf(s) + 1, stages.length - 1)];

  /* ações do modal — idênticas ao mockup */
  function advCard(d: KDeal) {
    if (d.stage === wonStage) { toast('Já está na última etapa.'); return; }
    moveTo(d.id, nextStage(d.stage));
    setOpen(null);
  }
  async function sendWa(d: KDeal) {
    const res = await fetch(`/api/deals/${d.id}/notify`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (res.ok) toast(data.delivered ? 'Mensagem enviada ao cliente via WhatsApp.' : 'Mensagem ao cliente registrada (WhatsApp em modo simulado).', 'ok');
    else toast('Falha no envio.', 'warn');
  }
  async function markWon(d: KDeal) {
    const ok = await moveTo(d.id, wonStage, { silent: true });
    if (!ok) return;
    toast('Ganho! Ficha enviada para execução + Página do Cliente liberada.', 'ok');
    setOpen(null);
    setTimeout(() => router.push(isAg ? '/acoes' : '/portal-cliente'), 300);
  }

  return (
    <>
      <div className="kanban" style={{ gridTemplateColumns: `repeat(${stages.length}, 1fr)` }} data-kan={pipeline}>
        {stages.map((s) => {
          const col = items.filter((d) => d.stage === s);
          return (
            <div
              key={s}
              className={`kcol ${overCol === s ? 'over' : ''}`}
              data-s={s}
              onDragOver={(e) => { e.preventDefault(); setOverCol(s); }}
              onDragLeave={() => setOverCol(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOverCol(null);
                if (dragId.current != null) moveTo(dragId.current, s);
                dragId.current = null;
              }}
            >
              <h4 className="disp">{s} <span className="n">{col.length}</span></h4>
              {col.map((d) => (
                <div
                  key={d.id}
                  className="kcard"
                  draggable
                  style={s === wonStage ? { borderLeftColor: '#25c257' } : undefined}
                  onDragStart={(e) => {
                    dragId.current = d.id;
                    didDrag.current = true;
                    e.dataTransfer.setData('text/plain', String(d.id));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => { setTimeout(() => { didDrag.current = false; }, 50); }}
                  onClick={() => { if (!didDrag.current) setOpen(d); }}
                  data-deal={d.advertiser}
                >
                  <b>{d.advertiser}</b>
                  <div className="km">
                    <span className="tiny muted">{d.descr || '—'}</span>
                    <span className="kval">{fmtBRL(d.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {open && (
        <Modal title={open.advertiser} stage={open.stage} stageTone={TONE[open.stage]} onClose={() => setOpen(null)}>
          <div className="mgrid">
            <div><div className="l">Valor</div><div className="v">{fmtBRL(open.value)}</div></div>
            <div><div className="l">Etapa</div><div className="v">{open.stage}</div></div>
            <div><div className="l">Formato</div><div className="v">{open.descr || '—'}</div></div>
            <div><div className="l">Praça</div><div className="v">{praca}</div></div>
            <div><div className="l">Contato</div><div className="v">comercial@cliente.com · (11) 9····</div></div>
            <div><div className="l">Vendedor</div><div className="v">{open.seller || 'Bruno'}</div></div>
          </div>

          <div className="sec-title"><h2 className="disp">Histórico</h2><div className="ln" /></div>
          <div className="tl">
            <div className="ti"><b>Contato inicial</b> — reunião<div className="t">há 5 dias</div></div>
            <div className="ti"><b>Proposta enviada</b> — {fmtBRL(open.value)}<div className="t">há 2 dias</div></div>
            <div className="ti"><b>Follow-up</b> — cliente pediu ajuste de horários<div className="t">ontem</div></div>
          </div>

          <div className="sec-title"><h2 className="disp">Materiais</h2><div className="ln" /></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="chip c-gray">briefing.pdf</span>
            <span className="chip c-gray">tabela-precos.xlsx</span>
            <span className="chip c-blue">proposta.pdf</span>
          </div>

          <div className="sec-title"><h2 className="disp">Ações</h2><div className="ln" /></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn p" onClick={() => advCard(open)} data-testid="md-adv">Avançar etapa</button>
            <button className="btn" onClick={() => sendWa(open)} data-testid="md-wa">Enviar WhatsApp</button>
            <button className="btn" onClick={() => toast('Proposta gerada e anexada.', 'ok')} data-testid="md-prop">Gerar proposta</button>
            <button className="btn y" onClick={() => markWon(open)} data-testid="md-win">Marcar Ganho → execução</button>
            <button className="btn" onClick={() => { setOpen(null); router.push('/portal-cliente'); }} data-testid="md-cli">Abrir Página do Cliente</button>
          </div>

          <div className="hint" style={{ marginTop: 14 }}>
            Ao marcar <b>Ganho</b>, a ficha vai automática para <b>{isAg ? 'Ações & Execução' : 'Produção de Spot / Tráfego'}</b> com
            a logística, e o cliente ganha acesso à <b>Página do Cliente</b>.
          </div>
        </Modal>
      )}
    </>
  );
}
