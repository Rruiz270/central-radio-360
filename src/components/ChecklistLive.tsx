'use client';

import { useState } from 'react';
import { useToast } from './Toast';

export function ChecklistLive({ items: initial }: { items: { id: number; label: string; done: boolean }[] }) {
  const [items, setItems] = useState(initial);
  const toast = useToast();

  async function toggle(id: number) {
    const it = items.find((x) => x.id === id)!;
    const done = !it.done;
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, done } : x)));
    const res = await fetch(`/api/internal-tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done }),
    });
    if (!res.ok) {
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, done: !done } : x)));
      toast('Não foi possível salvar.', 'warn');
    } else if (done) {
      toast('Pendência concluída.', 'ok');
    }
  }

  return (
    <div style={{ padding: '2px 0' }}>
      {items.map((it) => (
        <div key={it.id} className={`check ${it.done ? '' : 'off'}`} onClick={() => toggle(it.id)} data-check={it.label}>
          <span className="box">✓</span> {it.label}
        </div>
      ))}
    </div>
  );
}
