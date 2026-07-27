'use client';

import { useEffect, useState } from 'react';

/* Claro (padrão do manual) ↔ Escuro (console 24/7) */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as 'light' | 'dark') || 'light');
  }, []);

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('c360-theme', next); } catch { /* privado */ }
  }

  return (
    <button
      className="btn sm"
      onClick={toggle}
      title={theme === 'light' ? 'Mudar para modo escuro (console)' : 'Mudar para modo claro'}
      data-testid="theme-toggle"
      style={{ padding: '6px 10px' }}
    >
      {theme === 'light' ? (
        <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M14.8 11.2A6.5 6.5 0 0 1 6.8 3.2a6.5 6.5 0 1 0 8 8Z" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <circle cx="9" cy="9" r="3.4" />
          <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M14.3 3.7l-1.4 1.4M5.1 12.9l-1.4 1.4" />
        </svg>
      )}
    </button>
  );
}
