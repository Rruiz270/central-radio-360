'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';
import { Modal } from './Modal';

export type QField = { key: string; label: string; type?: 'text' | 'number' | 'select'; options?: string[]; value?: string; full?: boolean };

/* Botão "+ Novo X" genérico: abre modal com campos, POSTa no endpoint, refresh */
export function QuickAdd({ label, title, endpoint, fields, successMsg, small, primary = true }: {
  label: string; title: string; endpoint: string; fields: QField[]; successMsg: string;
  small?: boolean; primary?: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((x) => [x.key, x.value || (x.type === 'select' ? x.options?.[0] || '' : '')])),
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    const required = fields[0];
    if (!f[required.key]) { toast(`Preencha "${required.label}".`, 'warn'); return; }
    setBusy(true);
    const body: Record<string, unknown> = { ...f };
    fields.forEach((x) => { if (x.type === 'number') body[x.key] = parseFloat(f[x.key]) || 0; });
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      toast(successMsg, 'ok');
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      toast(data.error || 'Não foi possível salvar.', 'warn');
    }
  }

  return (
    <>
      <button className={`btn ${small ? 'sm' : ''} ${primary ? 'p' : ''}`} onClick={() => setOpen(true)} data-quickadd={label}>
        {label}
      </button>
      {open && (
        <Modal title={title} onClose={() => setOpen(false)}>
          <div className="form">
            {fields.map((x) => (
              <div key={x.key} className={`field ${x.full ? 'full' : ''}`}>
                <label>{x.label}</label>
                {x.type === 'select' ? (
                  <select value={f[x.key]} onChange={(e) => setF({ ...f, [x.key]: e.target.value })}>
                    {x.options?.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input value={f[x.key]} onChange={(e) => setF({ ...f, [x.key]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button className="btn p" disabled={busy} onClick={save} data-testid="quickadd-save">Salvar</button>
            <button className="btn" onClick={() => setOpen(false)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
