'use client';

import { useEffect } from 'react';

/* Execução oportunista: cada visita dispara (fire-and-forget) os jobs leves.
   O servidor respeita a janela mínima por job — sem custo se já rodou há pouco. */
export function Opportunistic() {
  useEffect(() => {
    const t = setTimeout(() => {
      fetch('/api/cron/ops?opportunistic=1').catch(() => {});
    }, 2500);
    return () => clearTimeout(t);
  }, []);
  return null;
}
