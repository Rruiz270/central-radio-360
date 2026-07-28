'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Saldo } from './DocUI';
import {
  DEPT, OS_FIELDS, MESES_FULL, daysInMonth, dowOf, isWeekend, type Dept,
} from '@/lib/esteira';

export type OsAction = {
  id: number; seq: number; action_date: string | null; action_time: string | null;
  place: string | null; goal: string | null; mechanics: string | null; team: string | null;
  equipment: string | null; uniform: string | null; car: string | null; gifts: string | null;
  photos: string | null; delivery_city: string | null; notes: string | null; done: boolean;
};
export type MapCell = { line: string; month: number; day: number; qty: number };

export function OsEditor({
  osId, dept, bought, unit, initialMap, initialActions, initialFields, months, year, status, canEdit, hasCP,
}: {
  osId: number; dept: Dept; bought: number; unit: string;
  initialMap: MapCell[]; initialActions: OsAction[]; initialFields: Record<string, string>;
  months: number[]; year: number; status: string; canEdit: boolean; hasCP: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const d = DEPT[dept];
  const [map, setMap] = useState<MapCell[]>(initialMap);
  const [actions, setActions] = useState<OsAction[]>(initialActions);
  const [fields, setFields] = useState<Record<string, string>>(initialFields || {});
  const [mes, setMes] = useState<number>(months[0] || new Date().getMonth() + 1);
  const [busy, setBusy] = useState(false);

  const offline = d.offline;
  /* Saldo é derivado: em campo conta ação executada; no ar conta inserção marcada no mapa. */
  const used = offline
    ? actions.filter((a) => a.done).length
    : map.reduce((a, c) => a + c.qty, 0);

  const cellQty = useMemo(() => {
    const m = new Map<string, number>();
    map.forEach((c) => m.set(`${c.line}|${c.month}|${c.day}`, c.qty));
    return m;
  }, [map]);

  async function patch(body: unknown, msg?: string) {
    setBusy(true);
    const res = await fetch(`/api/esteira/os/${osId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(data.error || 'Falha ao salvar.', 'warn'); return null; }
    if (msg) toast(msg, 'ok');
    return data;
  }

  function toggleCell(line: string, day: number) {
    if (!canEdit) return;
    const key = `${line}|${mes}|${day}`;
    const atual = cellQty.get(key) || 0;
    const novo = atual >= 4 ? 0 : atual + 1;
    setMap((m) => {
      const rest = m.filter((c) => !(c.line === line && c.month === mes && c.day === day));
      return novo ? [...rest, { line, month: mes, day, qty: novo }] : rest;
    });
    patch({ cell: { line, month: mes, day, qty: novo } });
  }

  async function addAcao() {
    setBusy(true);
    const res = await fetch(`/api/esteira/os/${osId}/actions`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(data.error || 'Falha ao criar a ação.', 'warn'); return; }
    setActions((a) => [...a, data.action]);
    toast(`Ação ${data.action.seq} criada.`, 'ok');
  }

  async function saveAcao(a: OsAction, patchBody: Partial<OsAction>) {
    const res = await fetch(`/api/esteira/os/${osId}/actions`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, ...patchBody }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast(data.error || 'Falha ao salvar a ação.', 'warn'); return; }
    setActions(data.actions);
  }

  async function delAcao(id: number) {
    const res = await fetch(`/api/esteira/os/${osId}/actions`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actionId: id }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setActions(data.actions); toast('Ação removida.', 'warn'); }
  }

  function setField(k: string, v: string) { setFields((f) => ({ ...f, [k]: v })); }
  const commitField = (k: string, v: string) => patch({ fields: { [k]: v } });

  async function abrirCP() {
    setBusy(true);
    const res = await fetch(`/api/esteira/os/${osId}/open-cp`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(data.error || 'Falha ao abrir produção.', 'warn'); return; }
    if (!data.total) { toast('As peças desta O.S. já estão em produção.', 'warn'); router.push('/esteira/cp'); return; }
    toast(`${data.total} peça(s) entraram em produção.`, 'ok');
    router.push('/esteira/cp');
  }

  const dias = daysInMonth(mes, year);
  const linhas = d.lines;

  return (
    <>
      {/* ---------- mapa de reserva ---------- */}
      <div className="sec-title"><h2 className="disp">Mapa de reserva — inserções por dia</h2><div className="ln" />
        <span className="tiny muted">{canEdit ? 'clique na célula para marcar' : 'somente leitura'}</span>
      </div>
      <div className="subtabs">
        {(months.length ? months : [mes]).map((m) => (
          <button key={m} className={m === mes ? 'on' : ''} onClick={() => setMes(m)}>{MESES_FULL[m - 1]}</button>
        ))}
      </div>
      <div className="mapa">
        <table>
          <thead>
            <tr>
              <th className="rl">Peça / item</th>
              {Array.from({ length: dias }, (_, k) => k + 1).map((day) => (
                <th key={day} className={isWeekend(year, mes, day) ? 'fds' : ''}>{day}</th>
              ))}
              <th className="tot">TOT</th>
            </tr>
            <tr>
              <th className="rl" style={{ background: 'transparent' }} />
              {Array.from({ length: dias }, (_, k) => k + 1).map((day) => (
                <th key={day} className={`dw ${isWeekend(year, mes, day) ? 'fds' : ''}`}>{dowOf(year, mes, day)}</th>
              ))}
              <th className="tot" />
            </tr>
          </thead>
          <tbody>
            {linhas.map((line) => {
              let t = 0;
              return (
                <tr key={line}>
                  <td className="rl">{line}</td>
                  {Array.from({ length: dias }, (_, k) => k + 1).map((day) => {
                    const q = cellQty.get(`${line}|${mes}|${day}`) || 0;
                    t += q;
                    return (
                      <td key={day} className={`cel v${Math.min(q, 4)}`}
                          onClick={() => toggleCell(line, day)}
                          title={`${line} — ${day}/${mes}`}>
                        {q || ''}
                      </td>
                    );
                  })}
                  <td className="tot">{t}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="legend">
        <span><i style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--linha)' }} />sem inserção</span>
        <span><i style={{ background: '#17265f' }} />1</span>
        <span><i style={{ background: '#2447ff' }} />2</span>
        <span><i style={{ background: '#00a8e8' }} />3</span>
        <span><i style={{ background: 'var(--myellow)' }} />4+</span>
      </div>

      {/* ---------- fichas de ação (off-line) ---------- */}
      {offline && (
        <>
          <div className="sec-title">
            <h2 className="disp">Detalhamento das ações <span className="chip c-red" style={{ marginLeft: 6 }}>off-line</span></h2>
            <div className="ln" />
            {canEdit && <button className="btn sm" onClick={addAcao} disabled={busy} data-testid="add-acao">+ ação</button>}
          </div>

          {actions.length === 0 && (
            <div className="hint" style={{ marginBottom: 14 }}>
              Nenhuma ação cadastrada. Cada ficha aqui é uma ida a campo — data, local, mecânica, equipe,
              equipamento, uniforme, carro plotado e brindes. É o formulário da O.S. de Operações, agora rastreável.
            </div>
          )}

          {actions.map((a) => (
            <div className={`acao ${a.done ? 'ok' : ''}`} key={a.id}>
              <div className="ah">
                <span className={`chip c-${a.done ? 'green' : 'red'}`}>AÇÃO {a.seq}</span>
                <b>{a.place || 'Local a definir'}</b>
                <span className="tiny muted">
                  {a.action_date ? new Date(a.action_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'sem data'}
                  {a.action_time ? ` · ${a.action_time}` : ''}
                </span>
                {canEdit && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button className={`btn sm ${a.done ? '' : 'y'}`} onClick={() => saveAcao(a, { done: !a.done })}>
                      {a.done ? 'Reabrir' : 'Marcar executada'}
                    </button>
                    <button className="btn sm" onClick={() => delAcao(a.id)}>✕</button>
                  </div>
                )}
              </div>
              <div className="ab">
                <F label="Data" type="date" v={a.action_date || ''} on={(v) => saveAcao(a, { action_date: v })} ro={!canEdit} />
                <F label="Horário" v={a.action_time || ''} on={(v) => saveAcao(a, { action_time: v })} ro={!canEdit} />
                <F label="Local" v={a.place || ''} on={(v) => saveAcao(a, { place: v })} ro={!canEdit} />
                <F label="Objetivo da ação" area v={a.goal || ''} on={(v) => saveAcao(a, { goal: v })} ro={!canEdit} />
                <F label="Mecânica da ação" area v={a.mechanics || ''} on={(v) => saveAcao(a, { mechanics: v })} ro={!canEdit} />
                <F label="Equipe" area v={a.team || ''} on={(v) => saveAcao(a, { team: v })} ro={!canEdit} />
                <F label="Equipamentos" v={a.equipment || ''} on={(v) => saveAcao(a, { equipment: v })} ro={!canEdit} />
                <F label="Uniforme" v={a.uniform || ''} on={(v) => saveAcao(a, { uniform: v })} ro={!canEdit} />
                <F label="Carro plotado" v={a.car || ''} on={(v) => saveAcao(a, { car: v })} ro={!canEdit} />
                <F label="Brindes" v={a.gifts || ''} on={(v) => saveAcao(a, { gifts: v })} ro={!canEdit} />
                <F label="Fotos" v={a.photos || ''} on={(v) => saveAcao(a, { photos: v })} ro={!canEdit} />
                <F label="Praça da entrega" v={a.delivery_city || ''} on={(v) => saveAcao(a, { delivery_city: v })} ro={!canEdit} />
                <div className="full">
                  <F label="Observações" area v={a.notes || ''} on={(v) => saveAcao(a, { notes: v })} ro={!canEdit} />
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ---------- campos próprios do departamento ---------- */}
      {OS_FIELDS[dept].length > 0 && (
        <>
          <div className="sec-title"><h2 className="disp">Campos da O.S. de {d.label}</h2><div className="ln" />
            <span className="tiny muted">idênticos ao modelo em Excel</span>
          </div>
          <div className="acao"><div className="ab">
            {OS_FIELDS[dept].map((f) => (
              <div key={f.key} className={f.type === 'area' ? 'full' : ''}>
                <F label={f.label} area={f.type === 'area'} v={fields[f.key] || ''}
                   on={(v) => { setField(f.key, v); commitField(f.key, v); }} ro={!canEdit} />
              </div>
            ))}
          </div></div>
        </>
      )}

      {/* ---------- saldo ---------- */}
      <div className="sec-title"><h2 className="disp">Controle de saldo</h2><div className="ln" />
        <span className="tiny muted">derivado — nunca digitado</span>
      </div>
      <div className="saldos">
        <Saldo label={offline ? 'Ações compradas' : 'Comprado na P.I.'} bought={bought} used={used} unit={unit} />
      </div>
      <div className="nota">
        O comprado vem da PD; o utilizado vem {offline ? 'das ações marcadas como executadas' : 'do mapa de reserva acima'}.
        Nenhum dos dois é digitado à mão — é isso que impede dois documentos de discordarem.
      </div>

      <div className="df" style={{ marginTop: 18, borderRadius: 14, border: '1px solid var(--linha)' }}>
        {canEdit && !hasCP && (
          <button className="btn p" onClick={abrirCP} disabled={busy} data-testid="abrir-cp">
            Abrir produção das peças (CP) →
          </button>
        )}
        {canEdit && status !== 'em_execucao' && status !== 'concluida' && (
          <button className="btn" disabled={busy}
            onClick={() => patch({ status: 'em_execucao' }, 'O.S. em execução.').then(() => router.refresh())}>
            Colocar em execução
          </button>
        )}
        {canEdit && status !== 'concluida' && (
          <button className="btn y" disabled={busy || used < bought}
            title={used < bought ? `faltam ${bought - used} ${unit}` : 'saldo consumido'}
            onClick={() => patch({ status: 'concluida' }, 'O.S. concluída.').then(() => router.refresh())}>
            {used < bought ? `Faltam ${bought - used} ${unit}` : 'Concluir O.S.'}
          </button>
        )}
        <span className="tiny muted" style={{ marginLeft: 'auto' }}>
          Alerta no grupo de {d.label} dispara ao ficar 48h sem movimento.
        </span>
      </div>
    </>
  );
}

/* Campo com salvamento no blur — a planilha nunca teve isso. */
function F({ label, v, on, area, type, ro }: {
  label: string; v: string; on: (v: string) => void; area?: boolean; type?: string; ro?: boolean;
}) {
  const [val, setVal] = useState(v);
  return (
    <div className="fl">
      <label>{label}</label>
      {area ? (
        <textarea rows={2} value={val} readOnly={ro}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => { if (!ro && val !== v) on(val); }} />
      ) : (
        <input type={type || 'text'} value={val} readOnly={ro}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => { if (!ro && val !== v) on(val); }} />
      )}
    </div>
  );
}
