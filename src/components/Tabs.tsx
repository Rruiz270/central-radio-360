'use client';

import { useState } from 'react';

export function Tabs({ tabs, initial }: { tabs: { id: string; label: React.ReactNode; content: React.ReactNode }[]; initial?: string }) {
  const [on, setOn] = useState(initial || tabs[0]?.id);
  return (
    <>
      <div className="subtabs">
        {tabs.map((t) => (
          <button key={t.id} className={on === t.id ? 'on' : ''} onClick={() => setOn(t.id)} data-tab={t.id}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} className={`pane ${on === t.id ? 'on' : ''}`}>{t.content}</div>
      ))}
    </>
  );
}
