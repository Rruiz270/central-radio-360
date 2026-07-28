'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { brl, money, num, DEPT, DEPTS, type Dept } from '@/lib/esteira';

export type IoItem = {
  id: number; scope: string; dept: string; item: string;
  seconds: number; qty: number; rate: string; discount: string; commission: string;
};
export type Praca = { id: number; name: string; city: string; uf: string; is_hq: boolean };

const SCOPES = [
  { k: 'radio', label: 'Veiculação na rádio', chip: 'blue' },
  { k: 'agencia', label: 'Ativação da agência (off-line)', chip: 'red' },
];

/* Itens da P.I. com o desmembramento que a casa faz: o que é rádio e o que é agência.
   Na agência não é "inserção", mas o documento continua se chamando Pedido de Inserção. */
export function PiEditor({ piId, initialItems, pracas, status, canEdit, hasPD, pdId }: {
  piId: number; initialItems: IoItem[]; pracas: Praca[];
  status: string; canEdit: boolean; hasPD: boolean; pdId?: number;
}) {
  const toast = useToast();
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [distOpen, setDistOpen] = useState(false);
  const [sel, setSel] = useState<number[]>(pracas.filter((p) => p.is_hq).map((p) => p.id));
  const [meses, setMeses] = useState<number[]>([9, 10, 11, 12]);

  const calc = (i: IoItem) => money(num(i.qty), num(i.rate), num(i.discount), num(i.commission));
  const tot = (scope: string) =>
    items.filter((i) => i.scope === scope).reduce(
      (a, i) => { const m = calc(i); return { tab: a.tab + m.tableTotal, neg: a.neg + m.negotiated, net: a.net + m.net }; },
      { tab: 0, neg: 0, net: 0 },
    );
  const tRadio = tot('radio'), tAg = tot('agencia');

  async function patch(body: unknown, msg?: string) {
    setBusy(true);
    const res = await fetch(`/api/esteira/pi/${piId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(data.error || 'Falha ao salvar.', 'warn'); return null; }
    if (data.items) setItems(data.items);
    if (msg) toast(msg, 'ok');
    return data;
  }

  const edit = (id: number, k: keyof IoItem, v: string) =>
    setItems((its) => its.map((i) => (i.id === id ? { ...i, [k]: v } as IoItem : i)));
  const commit = (id: number, k: keyof IoItem, v: string) => {
    const numeric = ['qty', 'rate', 'seconds', 'discount', 'commission'].includes(k);
    patch({ item: { id, [k]: numeric ? num(v) : v } });
  };

  async function emitir() {
    const d = await patch({ status: 'emitida' });
    if (d) { toast('P.I. emitida — pronta para distribuir.', 'ok'); router.refresh(); }
  }

  async function distribuir() {
    if (!sel.length) { toast('Escolha ao menos uma praça.', 'warn'); return; }
    if (!meses.length) { toast('Escolha ao menos um mês.', 'warn'); return; }
    setBusy(true);
    const res = await fetch(`/api/esteira/pi/${piId}/emit-pd`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenants: sel, months: meses }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(data.error || 'Não foi possível distribuir.', 'warn'); return; }
    toast(data.already ? 'PD já existia — abrindo.' : `PD ${data.pd.code} criada em ${data.tenants} praças.`, 'ok');
    setDistOpen(false);
    router.push(`/esteira/pd/${data.pd.id}`);
  }

  const MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <>
      <div className="hint y" style={{ marginBottom: 14 }}>
        <b>O desmembramento acontece aqui.</b> A mesma P.I. separa o que é veiculação na rádio do que é ativação da
        agência — e esse corte é o que a PD usa para abrir uma O.S. em cada departamento.
      </div>

      <div className="sec-title"><h2 className="disp">Itens da P.I.</h2><div className="ln" />
        {canEdit && (
          <>
            <button className="btn sm" disabled={busy}
              onClick={() => patch({ addItem: { scope: 'radio', dept: 'opec', item: 'Novo item de rádio', rate: 5460 } }, 'Item de rádio adicionado.')}>
              + rádio
            </button>
            <button className="btn sm" disabled={busy}
              onClick={() => patch({ addItem: { scope: 'agencia', dept: 'operacoes', item: 'Nova ativação', rate: 18500 } }, 'Item de agência adicionado.')}>
              + agência
            </button>
          </>
        )}
      </div>

      <div className="sheet">
        <table>
          <thead><tr>
            <th style={{ minWidth: 170 }}>Ítem</th><th>Departamento</th><th className="num">Sec.</th><th className="num">Qtd.</th>
            <th className="num">Valor tabela</th><th className="num">Total tabela</th><th className="num">Desc.</th>
            <th className="num">Negociado</th><th className="num">Com.</th><th className="num">Total líquido</th>
            <th className="num">Líq. unit.</th>{canEdit && <th />}
          </tr></thead>
          <tbody>
            {SCOPES.map((s) => {
              const linhas = items.filter((i) => i.scope === s.k);
              return (
                <>
                  <tr className="grp" key={s.k}>
                    <td colSpan={canEdit ? 12 : 11}>▸ {s.label}</td>
                  </tr>
                  {linhas.length === 0 && (
                    <tr key={s.k + '-vazio'}>
                      <td colSpan={canEdit ? 12 : 11} className="muted tiny" style={{ padding: 14 }}>
                        Nenhum item neste bloco.
                      </td>
                    </tr>
                  )}
                  {linhas.map((i) => {
                    const m = calc(i);
                    return (
                      <tr key={i.id}>
                        <td>{canEdit
                          ? <input className="ed w160" value={i.item} onChange={(e) => edit(i.id, 'item', e.target.value)} onBlur={(e) => commit(i.id, 'item', e.target.value)} />
                          : <span className="b">{i.item}</span>}</td>
                        <td>{canEdit ? (
                          <select className="ed w110" value={i.dept}
                            onChange={(e) => { edit(i.id, 'dept', e.target.value); commit(i.id, 'dept', e.target.value); }}>
                            {DEPTS.map((d) => <option key={d} value={d}>{DEPT[d as Dept].label}</option>)}
                          </select>
                        ) : <span className="chip c-gray">{DEPT[i.dept as Dept]?.label || i.dept}</span>}</td>
                        <td className="num">{canEdit
                          ? <input className="ed w60 num" value={i.seconds} onChange={(e) => edit(i.id, 'seconds', e.target.value)} onBlur={(e) => commit(i.id, 'seconds', e.target.value)} />
                          : i.seconds || '—'}</td>
                        <td className="num">{canEdit
                          ? <input className="ed w60 num" value={i.qty} onChange={(e) => edit(i.id, 'qty', e.target.value)} onBlur={(e) => commit(i.id, 'qty', e.target.value)} />
                          : i.qty}</td>
                        <td className="num">{canEdit
                          ? <input className="ed w80 num" value={i.rate} onChange={(e) => edit(i.id, 'rate', e.target.value)} onBlur={(e) => commit(i.id, 'rate', e.target.value)} />
                          : brl(i.rate)}</td>
                        <td className="num">{brl(m.tableTotal)}</td>
                        <td className="num">{(num(i.discount) * 100).toFixed(2)}%</td>
                        <td className="num">{brl(m.negotiated)}</td>
                        <td className="num">{(num(i.commission) * 100).toFixed(0)}%</td>
                        <td className="num b">{brl(m.net)}</td>
                        <td className="num">{brl(m.netUnit)}</td>
                        {canEdit && (
                          <td><button className="btn sm" disabled={busy}
                            onClick={() => patch({ removeItem: i.id }, 'Item removido.')}>✕</button></td>
                        )}
                      </tr>
                    );
                  })}
                </>
              );
            })}
          </tbody>
          <tfoot>
            <tr><td colSpan={5}>TOTAL RÁDIO</td><td className="num">{brl(tRadio.tab)}</td><td /><td className="num">{brl(tRadio.neg)}</td><td /><td className="num">{brl(tRadio.net)}</td><td colSpan={canEdit ? 2 : 1} /></tr>
            <tr><td colSpan={5}>TOTAL AGÊNCIA (off-line)</td><td className="num">{brl(tAg.tab)}</td><td /><td className="num">{brl(tAg.neg)}</td><td /><td className="num">{brl(tAg.net)}</td><td colSpan={canEdit ? 2 : 1} /></tr>
            <tr><td colSpan={5}>TOTAL GERAL DA P.I.</td><td className="num">{brl(tRadio.tab + tAg.tab)}</td><td /><td className="num">{brl(tRadio.neg + tAg.neg)}</td><td /><td className="num">{brl(tRadio.net + tAg.net)}</td><td colSpan={canEdit ? 2 : 1} /></tr>
          </tfoot>
        </table>
      </div>

      <div className="df" style={{ marginTop: 18, borderRadius: 14, border: '1px solid var(--linha)' }}>
        {status === 'rascunho' && canEdit && (
          <button className="btn p" disabled={busy || items.every((i) => !num(i.qty))} onClick={emitir} data-testid="emitir">
            Emitir P.I.
          </button>
        )}
        {status !== 'rascunho' && !hasPD && canEdit && (
          <button className="btn p" disabled={busy} onClick={() => setDistOpen(true)} data-testid="distribuir">
            Distribuir na rede (PD) →
          </button>
        )}
        {hasPD && pdId && (
          <button className="btn p" onClick={() => router.push(`/esteira/pd/${pdId}`)}>Abrir a PD →</button>
        )}
        <span className="tiny muted" style={{ marginLeft: 'auto' }}>
          {status === 'rascunho'
            ? 'Preencha as quantidades antes de emitir. Item com quantidade zero não gera O.S.'
            : 'Este número de P.I. será carimbado em toda PD, O.S., CP e PV desta campanha.'}
        </span>
      </div>

      {distOpen && (
        <Modal title="Distribuir na rede nacional" stage="PD" stageTone="teal" onClose={() => setDistOpen(false)}>
          <div className="tiny muted" style={{ marginBottom: 10 }}>
            Escolha as praças. Cada uma recebe as linhas da P.I. com o <b>valor de tabela da própria praça</b> —
            é o que torna a distribuição nacional sem virar oito planilhas.
          </div>
          <div className="pchips">
            {pracas.map((p) => (
              <span key={p.id}
                className={`pchk ${sel.includes(p.id) ? 'on' : ''}`}
                onClick={() => setSel((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))}>
                {p.name.replace('Metropolitana ', '')} <span className="tiny muted">{p.uf}</span>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn sm" onClick={() => setSel(pracas.map((p) => p.id))}>todas ({pracas.length})</button>
            <button className="btn sm" onClick={() => setSel(pracas.filter((p) => p.is_hq).map((p) => p.id))}>só a matriz</button>
            <button className="btn sm" onClick={() => setSel([])}>limpar</button>
          </div>

          <div className="sec-title"><h2 className="disp">Meses da campanha</h2><div className="ln" /></div>
          <div className="pchips">
            {MES.map((m, idx) => (
              <span key={m} className={`pchk ${meses.includes(idx + 1) ? 'on' : ''}`}
                onClick={() => setMeses((s) => (s.includes(idx + 1) ? s.filter((x) => x !== idx + 1) : [...s, idx + 1].sort((a, b) => a - b)))}>
                {m}
              </span>
            ))}
          </div>

          <div className="hint" style={{ marginTop: 12 }}>
            Serão criadas <b>{sel.length * items.length}</b> linhas de distribuição
            ({sel.length} praça(s) × {items.length} item(ns)), com o investimento repartido em {meses.length} mês(es).
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn p" onClick={distribuir} disabled={busy}>{busy ? 'Distribuindo…' : 'Gerar PD'}</button>
            <button className="btn" onClick={() => setDistOpen(false)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
