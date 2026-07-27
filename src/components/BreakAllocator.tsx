'use client';

import { useState, useRef } from 'react';
import { useToast } from './Toast';

type Spot = { id: number; advertiser: string; duration_sec: number; break_id: number | null };
type Brk = { id: number; hour: number; limit_sec: number; program?: string | null };

/* Coração operacional: alocação de spots nos breaks com minutagem ANATEL ao vivo */
export function BreakAllocator({ spots: initial, breaks, recommended, recommendedReason }: {
  spots: Spot[]; breaks: Brk[]; recommended?: number; recommendedReason?: string;
}) {
  const toast = useToast();
  const [spots, setSpots] = useState(initial);
  const dragId = useRef<number | null>(null);
  const [over, setOver] = useState<number | 'pool' | null>(null);

  const used = (bid: number) => spots.filter((s) => s.break_id === bid).reduce((a, s) => a + s.duration_sec, 0);

  async function move(spotId: number, target: number | null) {
    const prev = spots;
    setSpots((ss) => ss.map((s) => (s.id === spotId ? { ...s, break_id: target } : s)));
    const res = await fetch(`/api/spots/${spotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ break_id: target }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSpots(prev);
      toast(data.error || 'Não foi possível alocar.', 'warn');
      return;
    }
    if (target == null) toast('Spot devolvido ao pool.', 'ok');
    else {
      const b = breaks.find((x) => x.id === target)!;
      toast(`Alocado em ${b.program || 'break'} (${String(b.hour).padStart(2, '0')}h) — grade, log e pendência atualizados.`, 'ok');
    }
  }

  const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  const chip = (s: Spot) => (
    <span
      key={s.id}
      className="spotchip"
      draggable
      onDragStart={(e) => {
        dragId.current = s.id;
        e.dataTransfer.setData('text/plain', String(s.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
      data-spot={s.advertiser}
    >
      {s.advertiser} <span className="s">{s.duration_sec}&quot;</span>
    </span>
  );

  return (
    <div>
      <div className="tiny b" style={{ marginBottom: 6 }}>Spots a alocar (arraste para um break)</div>
      <div
        className="spotpool"
        style={over === 'pool' ? { borderColor: 'var(--cyan)' } : undefined}
        onDragOver={(e) => { e.preventDefault(); setOver('pool'); }}
        onDragLeave={() => setOver(null)}
        onDrop={(e) => { e.preventDefault(); setOver(null); if (dragId.current != null) move(dragId.current, null); dragId.current = null; }}
      >
        {spots.filter((s) => s.break_id == null).map(chip)}
        {spots.filter((s) => s.break_id == null).length === 0 && (
          <span className="tiny muted">todos os spots alocados</span>
        )}
      </div>
      <div style={{ height: 14 }} />
      {breaks.map((b) => {
        const u = used(b.id);
        const pct = Math.min(100, (u / b.limit_sec) * 100);
        const overq = u > b.limit_sec;
        const full = !overq && u >= b.limit_sec * 0.85;
        return (
          <div key={b.id} className={`brk ${overq ? 'overq' : full ? 'full' : ''} ${over === b.id ? 'over' : ''}`}
            style={recommended === b.id ? { borderColor: 'var(--mblue-l)', boxShadow: '0 0 0 2px rgba(36,71,255,.18)' } : undefined}>
            <div className="bh">
              <b className="disp" style={{ minWidth: 190 }}>
                {String(b.hour).padStart(2, '0')}h · {b.program || 'Break'}
              </b>
              {recommended === b.id && (
                <span className="aitag" title={recommendedReason}>IA recomenda</span>
              )}
              <div className="meter"><i style={{ width: `${pct}%` }} /></div>
              <span className="used">{fmt(u)} / {fmt(b.limit_sec)}</span>
            </div>
            <div
              className="slots"
              onDragOver={(e) => { e.preventDefault(); setOver(b.id); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); if (dragId.current != null) move(dragId.current, b.id); dragId.current = null; }}
            >
              {spots.filter((s) => s.break_id === b.id).map(chip)}
            </div>
            {overq && <div className="tiny" style={{ color: '#ff7c8b', marginTop: 6 }}>Estouro da minutagem ANATEL — remover um spot ou mover para outro break.</div>}
          </div>
        );
      })}
    </div>
  );
}
