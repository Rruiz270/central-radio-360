'use client';

import { useState } from 'react';
import { useToast } from './Toast';

export function ApproveButton({ id }: { id: number }) {
  const toast = useToast();
  const [ok, setOk] = useState(false);
  async function approve() {
    const res = await fetch(`/api/internal-tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    });
    if (res.ok) { setOk(true); toast('Aprovado — responsável avisado no WhatsApp.', 'ok'); }
    else toast('Falha ao aprovar.', 'warn');
  }
  return ok ? <span className="chip c-green">aprovado</span> : <button className="btn sm" onClick={approve}>Aprovar</button>;
}
