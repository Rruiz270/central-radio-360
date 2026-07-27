'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';

/* Sincroniza APIs públicas: IBGE (população) + Radio-Browser (popularidade digital) */
export function MarketSync() {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function sync() {
    setBusy(true);
    toast('Consultando IBGE e Radio-Browser…', 'ok');
    const res = await fetch('/api/cron/market');
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && !data.skipped) { toast(`Dados públicos atualizados — ${data.detail}.`, 'ok'); router.refresh(); }
    else if (data.skipped) toast('Sincronizado há pouco — dados já atuais.', 'ok');
    else toast(data.error || 'Falha na sincronização.', 'warn');
  }

  return (
    <button className="btn sm p" disabled={busy} onClick={sync} data-testid="market-sync">
      {busy ? 'Sincronizando…' : 'Sincronizar dados públicos'}
    </button>
  );
}

export function EditFollowers({ id, field, current, label }: { id: number; field: 'ig_followers' | 'yt_subs'; current: number; label: string }) {
  const toast = useToast();
  const router = useRouter();
  async function edit() {
    const v = window.prompt(`${label} — novo valor:`, String(current));
    if (v == null) return;
    const res = await fetch(`/api/competitors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: parseInt(v.replace(/\D/g, ''), 10) || 0 }),
    });
    if (res.ok) { toast('Atualizado.', 'ok'); router.refresh(); }
    else toast('Falha ao atualizar.', 'warn');
  }
  return (
    <span onClick={edit} style={{ cursor: 'pointer', borderBottom: '1px dashed currentColor' }} title="Clique para editar">
      {current >= 1_000_000 ? `${(current / 1_000_000).toFixed(1).replace('.', ',')}M` : current >= 1000 ? `${Math.round(current / 1000)}k` : current}
    </span>
  );
}
