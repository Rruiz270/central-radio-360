'use client';

import { useState, useRef } from 'react';
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

export function Kanban({ deals, stages, pipeline, wonStage }: {
  deals: KDeal[]; stages: string[]; pipeline: 'radio' | 'agencia'; wonStage: string;
}) {
  const toast = useToast();
  const [items, setItems] = useState(deals);
  const [open, setOpen] = useState<KDeal | null>(null);
  const dragId = useRef<number | null>(null);
  const didDrag = useRef(false);
  const [overCol, setOverCol] = useState<string | null>(null);

  async function moveTo(id: number, stage: string) {
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
      return;
    }
    if (stage === wonStage) {
      toast(pipeline === 'agencia'
        ? 'Ganho! Ficha enviada para Ações & Execução — alerta no WhatsApp de Operações.'
        : 'Fechado! Alerta enviado no WhatsApp → Comercial + Financeiro.', 'ok');
    } else {
      toast(`Movido para ${stage}.`, 'ok');
    }
  }

  const nextStage = (s: string) => stages[Math.min(stages.indexOf(s) + 1, stages.length - 1)];

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
            <div><div className="l">Formato / escopo</div><div className="v">{open.descr || '—'}</div></div>
            <div><div className="l">Valor</div><div className="v">{fmtBRL(open.value)}</div></div>
            <div><div className="l">Vendedor</div><div className="v">{open.seller || '—'}</div></div>
            <div><div className="l">Funil</div><div className="v">{pipeline === 'agencia' ? 'Agência de Ativação' : 'Rádio — grade comercial'}</div></div>
          </div>
          <div className="l" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--txt-3)', fontWeight: 800, margin: '14px 0 4px' }}>
            Linha do tempo
          </div>
          <div className="tl">
            <div className="ti"><b>Oportunidade criada</b><div className="t">{open.created_at ? new Date(open.created_at).toLocaleDateString('pt-BR') : '—'} · entrada no funil</div></div>
            <div className="ti"><b>Etapa atual: {open.stage}</b><div className="t">arraste o card ou avance por aqui</div></div>
            {open.stage === wonStage && (
              <div className="ti"><b>Gatilho disparado</b><div className="t">WhatsApp → {pipeline === 'agencia' ? 'Operações' : 'Comercial + Financeiro'}</div></div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            {open.stage !== wonStage && (
              <button className="btn p" onClick={() => moveTo(open.id, nextStage(open.stage))} data-testid="advance-stage">
                Avançar → {nextStage(open.stage)}
              </button>
            )}
            <button className="btn" onClick={() => setOpen(null)}>Fechar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
