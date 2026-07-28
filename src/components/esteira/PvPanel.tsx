'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { brl, brlShort } from '@/lib/esteira';

export type Delivery = {
  id: number; label: string; praca: string; planned: number; done: number; unit: string;
};

/* Autorização de Veiculação (contrato Asa Mídia) + comprovação de entrega por praça. */
export function PvPanel({ pvId, initial, status, total, custo, canEdit }: {
  pvId: number; initial: Delivery[]; status: string; total: number; custo: number; canEdit: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);

  const planned = rows.reduce((a, r) => a + r.planned, 0);
  const done = rows.reduce((a, r) => a + r.done, 0);
  const pct = planned ? done / planned : 0;
  const entregue = total * pct;

  async function patch(body: unknown, msg?: string) {
    setBusy(true);
    const res = await fetch(`/api/esteira/pv/${pvId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(data.error || 'Falha ao salvar.', 'warn'); return null; }
    if (data.deliveries) setRows(data.deliveries);
    if (msg) toast(msg, 'ok');
    router.refresh();
    return data;
  }

  return (
    <>
      <div className="sec-title"><h2 className="disp">Comprovação de entrega</h2><div className="ln" />
        <span className="tiny muted">por praça — alimenta o Portal do Cliente</span>
      </div>
      <div className="sheet">
        <table>
          <thead><tr>
            <th>Entrega</th><th>Praça</th><th className="num">Previsto</th><th className="num">Realizado</th>
            <th style={{ minWidth: 150 }}>Consumo</th><th>Status</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ padding: 20, textAlign: 'center' }}>
                Sem entregas registradas.
              </td></tr>
            )}
            {rows.map((r) => {
              const p = r.planned ? Math.round((r.done / r.planned) * 100) : 0;
              return (
                <tr key={r.id}>
                  <td className="b">{r.label}</td>
                  <td>{String(r.praca).replace('Metropolitana ', '')}</td>
                  <td className="num">{r.planned}</td>
                  <td className="num">{canEdit ? (
                    <input className="ed w60 num" defaultValue={r.done}
                      onBlur={(e) => patch({ delivery: { id: r.id, done: Number(e.target.value) || 0 } })} />
                  ) : r.done}</td>
                  <td>
                    <div className="bar" style={{ width: 120 }}><i style={{ width: `${Math.min(100, p)}%` }} /></div>
                    <span className="tiny muted">{p}%</span>
                  </td>
                  <td><span className={`chip c-${p >= 100 ? 'green' : p >= 70 ? 'blue' : p >= 40 ? 'amber' : 'red'}`}>
                    {p >= 100 ? 'completo' : `${p}%`}
                  </span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sec-title"><h2 className="disp">Fechamento financeiro</h2><div className="ln" /></div>
      <div className="cards g4">
        <div className="card kpi"><div className="lab">Contratado</div>
          <div className="val">{brlShort(total)}</div><div className="delta flat">líquido da P.I.</div></div>
        <div className="card kpi b2"><div className="lab">Entregue</div>
          <div className="val">{brlShort(entregue)}</div>
          <div className="delta up">{Math.round(pct * 100)}% das entregas</div></div>
        <div className="card kpi y"><div className="lab">A faturar</div>
          <div className="val">{brlShort(total - entregue)}</div><div className="delta flat">saldo em aberto</div></div>
        <div className="card kpi r"><div className="lab">Custo do PO</div>
          <div className="val">{brlShort(custo)}</div>
          <div className={`delta ${total - custo > 0 ? 'up' : 'down'}`}>
            margem real {total ? Math.round((1 - custo / total) * 100) : 0}%
          </div></div>
      </div>
      <div className="nota">
        O realizado volta para o <b>PO</b> e mede a margem de verdade — o ciclo fecha onde começou.
      </div>

      {canEdit && (
        <div className="df" style={{ marginTop: 18, borderRadius: 14, border: '1px solid var(--linha)' }}>
          {status === 'rascunho' && (
            <button className="btn p" disabled={busy} onClick={() => patch({ authorize: true }, 'Veiculação autorizada.')}
                    data-testid="autorizar-pv">
              Autorizar veiculação
            </button>
          )}
          {status === 'autorizado' && (
            <button className="btn" disabled={busy} onClick={() => patch({ status: 'veiculando' }, 'Campanha no ar.')}>
              Marcar como no ar
            </button>
          )}
          {(status === 'autorizado' || status === 'veiculando') && (
            <button className="btn y" disabled={busy || pct < 1}
              title={pct < 1 ? 'ainda há entrega pendente' : 'encerrar campanha'}
              onClick={() => patch({ status: 'encerrado' }, 'Campanha encerrada — comprovação no Portal.')}>
              {pct < 1 ? `Faltam ${planned - done} entregas` : 'Encerrar campanha'}
            </button>
          )}
          <span className="tiny muted" style={{ marginLeft: 'auto' }}>
            Total contratado: <b>{brl(total)}</b>
          </span>
        </div>
      )}
    </>
  );
}
