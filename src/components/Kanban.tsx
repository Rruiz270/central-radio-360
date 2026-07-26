'use client';

import { useState, useRef } from 'react';
import { useToast } from './Toast';
import { fmtBRL } from './ui';

export type KDeal = { id: number; advertiser: string; descr: string | null; value: string; stage: string };

export function Kanban({ deals, stages, pipeline, wonStage }: {
  deals: KDeal[]; stages: string[]; pipeline: 'radio' | 'agencia'; wonStage: string;
}) {
  const toast = useToast();
  const [items, setItems] = useState(deals);
  const dragId = useRef<number | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  async function moveTo(id: number, stage: string) {
    const prev = items;
    setItems((its) => its.map((d) => (d.id === id ? { ...d, stage } : d)));
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
      toast('Fechado! Alerta enviado no WhatsApp → Comercial + Financeiro.', 'ok');
    } else {
      toast(`Movido para ${stage}.`, 'ok');
    }
  }

  return (
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
                  e.dataTransfer.setData('text/plain', String(d.id));
                  e.dataTransfer.effectAllowed = 'move';
                }}
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
  );
}
