'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';

export function TrendFeed({ trends }: { trends: { id: number; kind: string; title: string; meta: string; posted: boolean }[] }) {
  const toast = useToast();
  const router = useRouter();
  const [done, setDone] = useState<number[]>(trends.filter((t) => t.posted).map((t) => t.id));
  const TONES: Record<string, string> = { T: 'red', F: 'amber', N: 'blue', E: 'teal' };

  async function post(id: number, title: string) {
    const res = await fetch(`/api/trends/${id}/post`, { method: 'POST' });
    if (res.ok) {
      setDone((d) => [...d, id]);
      toast(`"${title.slice(0, 40)}…" virou post e entrou na fila.`, 'ok');
      router.refresh();
    } else toast('Falha ao postar.', 'warn');
  }

  return (
    <div style={{ padding: '2px 0' }}>
      {trends.map((t) => (
        <div key={t.id} className="list-li" style={done.includes(t.id) ? { opacity: 0.45 } : undefined}>
          <div className={`ico c-${TONES[t.kind] || 'gray'}`}>{t.kind}</div>
          <div style={{ flex: 1 }}><b>{t.title}</b><div className="tiny muted">{t.meta}</div></div>
          {done.includes(t.id)
            ? <span className="chip c-green">postado</span>
            : <button className="btn sm p" onClick={() => post(t.id, t.title)}>Postar</button>}
        </div>
      ))}
    </div>
  );
}
