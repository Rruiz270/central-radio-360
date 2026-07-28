'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';

/* Abre o primeiro documento da esteira. Tudo nasce aqui. */
export function NovoPO() {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    client: '', contact: '', prospect: '', period: '', revenue: '', contract_no: '',
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function criar() {
    if (!f.client.trim()) { toast('Informe o cliente.', 'warn'); return; }
    setBusy(true);
    const res = await fetch('/api/esteira/po', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, revenue: parseFloat(f.revenue) || 0 }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(data.error || 'Não foi possível abrir o orçamento.', 'warn'); return; }
    toast(`${data.po.code} aberto — 4 aprovações criadas.`, 'ok');
    setOpen(false);
    router.push(`/esteira/po/${data.po.id}`);
  }

  return (
    <>
      <button className="btn p sm" onClick={() => setOpen(true)} data-testid="novo-po">+ Pedido de Orçamento</button>
      {open && (
        <Modal title="Novo Pedido de Orçamento" stage="PO" stageTone="blue" onClose={() => setOpen(false)}>
          <div className="form">
            <div className="field"><label>Cliente</label>
              <input value={f.client} onChange={set('client')} placeholder="ex.: Smirnoff" autoFocus /></div>
            <div className="field"><label>Contato</label>
              <input value={f.contact} onChange={set('contact')} placeholder="nome do contato" /></div>
            <div className="field full"><label>Prospecção</label>
              <input value={f.prospect} onChange={set('prospect')} placeholder="ex.: Ativação verão — 4 praças" /></div>
            <div className="field"><label>Período</label>
              <input value={f.period} onChange={set('period')} placeholder="Set/2026 – Dez/2026" /></div>
            <div className="field"><label>Valor atual (R$)</label>
              <input value={f.revenue} onChange={set('revenue')} placeholder="486000" /></div>
            <div className="field"><label>Nº do contrato</label>
              <input value={f.contract_no} onChange={set('contract_no')} placeholder="220" /></div>
          </div>
          <div className="hint" style={{ marginTop: 14 }}>
            Ao abrir, o sistema cria as quatro linhas de assinatura — <b>Diretoria, Financeiro, R.H. e Operações</b> —
            e cada uma só pode ser marcada pelo perfil dono da área.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn p" onClick={criar} disabled={busy}>{busy ? 'Abrindo…' : 'Abrir orçamento'}</button>
            <button className="btn" onClick={() => setOpen(false)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
