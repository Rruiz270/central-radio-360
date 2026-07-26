'use client';

import { useState } from 'react';

export function Player({ title, sub }: { title: string; sub: string }) {
  const [playing, setPlaying] = useState(true);
  return (
    <div className="player" style={{ marginBottom: 16 }}>
      <button
        className="pbtn"
        style={{ border: 0, cursor: 'pointer' }}
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? 'Pausar' : 'Tocar'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div style={{ minWidth: 200 }}>
        <b className="disp">NO AR AGORA</b>
        <div className="tiny" style={{ opacity: 0.9 }}>{title}</div>
      </div>
      <div className="wave eq" style={{ height: 30 }}>
        {Array.from({ length: 42 }, (_, i) => (
          <i key={i} style={{ animationDelay: `${(i % 7) * 0.11}s`, animationPlayState: playing ? 'running' : 'paused' }} />
        ))}
      </div>
      <div style={{ textAlign: 'right' }}>
        <span className="badge-live" style={{ color: '#fff' }}><span className="dot" />AO VIVO</span>
        <div className="tiny" style={{ opacity: 0.8 }}>{sub}</div>
      </div>
    </div>
  );
}
