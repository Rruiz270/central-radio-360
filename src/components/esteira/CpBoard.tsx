'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';

export type Cp = {
  id: number; code: string; piece: string; kind: string; seconds: number; step: number;
  owner: string | null; due: string | null; client_status: string; script: string | null;
  os_code: string | null; os_id: number | null; pi_code: string; pi_id: number; praca: string;
};

const STEPS = ['Briefing', 'Roteiro', 'Gravação', 'Aprovação', 'Liberada'];
const TONE: Record<string, string> = {
  aprovado: 'green', aguardando: 'blue', ajuste: 'amber', pendente: 'gray',
};

/* Controle de Produção: a peça caminha do briefing ao ar.
   A etapa 5 só abre com o "aprovado" que vem do Portal do Cliente. */
export function CpBoard({ initial, canEdit, piAll }: {
  initial: Cp[]; canEdit: boolean; piAll: { id: number; code: string; client: string; pend: number }[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState<Cp | null>(null);
  const [busy, setBusy] = useState(false);

  async function patch(cp: Cp, body: unknown, msg?: string) {
    setBusy(true);
    const res = await fetch(`/api/esteira/cp/${cp.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(data.error || 'Falha ao salvar.', 'warn'); return null; }
    setRows((rs) => rs.map((r) => (r.id === cp.id ? { ...r, ...data.cp } : r)));
    setOpen((o) => (o && o.id === cp.id ? { ...o, ...data.cp } : o));
    if (msg) toast(msg, 'ok');
    router.refresh();
    return data;
  }

  async function emitirPV(piId: number) {
    setBusy(true);
    const res = await fetch('/api/esteira/pv', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pi_id: piId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(data.error || 'Não foi possível emitir o PV.', 'warn'); return; }
    toast(data.already ? 'PV já existia — abrindo.' : `PV ${data.pv.code} emitido.`, 'ok');
    router.push(`/esteira/pv/${data.pv.id}`);
  }

  return (
    <>
      <div className="sheet">
        <table>
          <thead><tr>
            <th>Peça</th><th>O.S. de origem</th><th>Praça</th><th>Tipo</th><th className="num">Sec.</th>
            <th style={{ minWidth: 240 }}>Etapa</th><th>Responsável</th><th>Prazo</th><th>Cliente</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={9} className="muted" style={{ padding: 22, textAlign: 'center' }}>
                Nenhuma peça em produção. Elas nascem ao abrir o CP a partir de uma O.S.
              </td></tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setOpen(c)}>
                <td className="b">{c.piece}<div className="tiny muted">{c.code}</div></td>
                <td className="tiny">{c.os_code || '—'}</td>
                <td className="tiny">{String(c.praca).replace('Metropolitana ', '')}</td>
                <td><span className="chip c-gray">{c.kind}</span></td>
                <td className="num">{c.seconds || '—'}</td>
                <td>
                  <span className="chain sm">
                    {STEPS.map((s, i) => (
                      <span key={s} className={`ch ${i + 1 < c.step ? 'done' : i + 1 === c.step ? 'now' : ''}`}>{s}</span>
                    ))}
                  </span>
                </td>
                <td className="tiny">{c.owner || '—'}</td>
                <td className="tiny">{c.due ? new Date(c.due + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                <td><span className={`chip c-${TONE[c.client_status] || 'gray'}`}>{c.client_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {piAll.length > 0 && (
        <>
          <div className="sec-title"><h2 className="disp">Liberar campanha para o ar</h2><div className="ln" /></div>
          <div className="cards g2">
            {piAll.map((p) => (
              <div className="card" key={p.id}><div className="bd">
                <div className="list-li">
                  <span className="chip c-blue">{p.code}</span>
                  <div style={{ flex: 1 }}>
                    <b>{p.client}</b>
                    <div className="tiny muted">
                      {p.pend ? `${p.pend} peça(s) sem aprovação do cliente` : 'todas as peças aprovadas'}
                    </div>
                  </div>
                  <button className="btn p sm" disabled={busy || p.pend > 0} onClick={() => emitirPV(p.id)}
                          title={p.pend ? 'peça sem aprovação bloqueia a veiculação' : 'emitir PV'}>
                    {p.pend ? `Faltam ${p.pend}` : 'Emitir PV →'}
                  </button>
                </div>
              </div></div>
            ))}
          </div>
        </>
      )}

      {open && (
        <Modal title={open.piece} stage={STEPS[open.step - 1]} stageTone="blue" onClose={() => setOpen(null)}>
          <div className="mgrid">
            <div><div className="l">Ficha</div><div className="v">{open.code}</div></div>
            <div><div className="l">O.S. de origem</div><div className="v">{open.os_code || '—'}</div></div>
            <div><div className="l">Praça</div><div className="v">{open.praca}</div></div>
            <div><div className="l">Secundagem</div><div className="v">{open.seconds || '—'}</div></div>
          </div>

          <div className="sec-title"><h2 className="disp">Roteiro</h2><div className="ln" /></div>
          <div className="fl">
            <textarea rows={4} defaultValue={open.script || ''} readOnly={!canEdit}
              placeholder="Texto da peça / roteiro de gravação"
              onBlur={(e) => canEdit && e.target.value !== (open.script || '') && patch(open, { fields: { script: e.target.value } }, 'Roteiro salvo.')} />
          </div>

          <div className="sec-title"><h2 className="disp">Produção</h2><div className="ln" /></div>
          <div className="form">
            <div className="field"><label>Responsável</label>
              <input defaultValue={open.owner || ''} readOnly={!canEdit}
                onBlur={(e) => canEdit && patch(open, { fields: { owner: e.target.value } })} /></div>
            <div className="field"><label>Prazo</label>
              <input type="date" defaultValue={open.due || ''} readOnly={!canEdit}
                onBlur={(e) => canEdit && patch(open, { fields: { due: e.target.value } })} /></div>
          </div>

          {canEdit && (
            <>
              <div className="sec-title"><h2 className="disp">Avançar</h2><div className="ln" /></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn p" disabled={busy || open.step >= 5}
                  onClick={() => patch(open, { step: open.step + 1 }, `Peça em ${STEPS[Math.min(open.step, 4)]}.`)}>
                  Avançar etapa
                </button>
                <button className="btn" disabled={busy || open.step <= 1}
                  onClick={() => patch(open, { step: open.step - 1 }, 'Peça voltou uma etapa.')}>
                  Voltar
                </button>
              </div>

              <div className="sec-title"><h2 className="disp">Resposta do cliente</h2><div className="ln" />
                <span className="tiny muted">chega pelo Portal do Cliente</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn" disabled={busy}
                  onClick={() => patch(open, { client_status: 'aguardando' }, 'Enviada ao cliente para aprovação.')}>
                  Enviar ao cliente
                </button>
                <button className="btn y" disabled={busy}
                  onClick={() => patch(open, { client_status: 'aprovado' }, 'Cliente aprovou — liberada para o ar.')}>
                  Registrar aprovação
                </button>
                <button className="btn" disabled={busy}
                  onClick={() => patch(open, { client_status: 'ajuste' }, 'Ajuste solicitado.')}>
                  Pediu ajuste
                </button>
              </div>
              <div className="hint" style={{ marginTop: 14 }}>
                A etapa <b>Liberada</b> só abre com aprovação do cliente. É a mesma trava que o Portal já aplica —
                aqui ela deixa de depender de alguém lembrar.
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
