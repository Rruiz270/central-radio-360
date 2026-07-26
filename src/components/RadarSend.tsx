'use client';

import { useState } from 'react';
import { useToast } from './Toast';

export function RadarSend() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function send(test: boolean) {
    setBusy(true);
    const res = await fetch('/api/radar/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) toast(data.note || (test ? 'Teste disparado.' : 'Radar enviado para a base.'), data.delivered ? 'ok' : 'warn');
    else toast(data.error || 'Falha no disparo.', 'warn');
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <button className="btn p" disabled={busy} onClick={() => send(false)}>Enviar para base</button>
      <button className="btn y" disabled={busy} onClick={() => send(true)}>Testar disparo</button>
    </div>
  );
}
