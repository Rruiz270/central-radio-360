'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type Toast = { id: number; msg: string; type?: 'ok' | 'warn' };
const ToastCtx = createContext<(msg: string, type?: 'ok' | 'warn') => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((msg: string, type?: 'ok' | 'warn') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div id="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type || ''}`}>
            <span className="tk">{t.type === 'warn' ? '!' : '✓'}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
