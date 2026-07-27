'use client';

import { useEffect, useState } from 'react';

type Alert = { id: number; title: string; wa_group: string; status: string; sent_at: string };

/* Fila de alertas ao vivo — polling leve a cada 20s (SSE entra com infra dedicada) */
export function LiveFeed({ initial }: { initial: Alert[] }) {
  const [alerts, setAlerts] = useState(initial);
  const [fresh, setFresh] = useState<number[]>([]);

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch('/api/alerts/recent');
        if (!r.ok) return;
        const data = await r.json();
        setAlerts((prev) => {
          const prevIds = new Set(prev.map((a) => a.id));
          const novel = data.alerts.filter((a: Alert) => !prevIds.has(a.id)).map((a: Alert) => a.id);
          if (novel.length) {
            setFresh(novel);
            setTimeout(() => setFresh([]), 4000);
          }
          return data.alerts;
        });
      } catch { /* offline momentâneo */ }
    }, 20000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ padding: '2px 0' }}>
      {alerts.slice(0, 8).map((l) => (
        <div key={l.id} className="list-li" style={fresh.includes(l.id) ? { background: 'rgba(37,194,87,.08)', borderRadius: 8 } : undefined}>
          <div className={`ico c-${l.status === 'entregue' ? 'green' : 'amber'}`}>{l.title.slice(0, 1).toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <b>{l.title}</b>
            <div className="tiny muted">
              {l.wa_group} · {new Date(l.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <span className="wa"><span className="wd" />{l.status}</span>
        </div>
      ))}
    </div>
  );
}
