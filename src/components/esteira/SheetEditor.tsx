'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import {
  RUBRICAS, brl, brlShort, num, lineTotals, sheetSummary, CLAUSULAS,
  type Rubrica, type SheetLine,
} from '@/lib/esteira';

export type SheetItem = SheetLine & { id: number; supplier: string | null; payment: string | null };

/* Planilha orçamentária no formato PROMOONE — vale para o PO (orçado) e para o CP (realizado).
   Duas metades, como no Excel: à esquerda o custo interno, à direita o que é faturado ao cliente.
   O botão "versão cliente" esconde as colunas internas (o "EXCLUIR COLUNAS" da planilha). */
export function SheetEditor({ poId, kind, initialItems, feePct, chargesPct, planningPct, canEdit, compareTo }: {
  poId: number; kind: 'PO' | 'CP'; initialItems: SheetItem[];
  feePct: number; chargesPct: number; planningPct: number; canEdit: boolean;
  compareTo?: { label: string; total: number; cost: number } | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [cliente, setCliente] = useState(false); // versão cliente = esconde colunas internas

  const S = sheetSummary(items, feePct, chargesPct, planningPct);

  async function patch(body: unknown, msg?: string) {
    setBusy(true);
    const res = await fetch(`/api/esteira/po/${poId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(data.error || 'Falha ao salvar.', 'warn'); return null; }
    if (data.items) setItems(data.items);
    if (msg) toast(msg, 'ok');
    return data;
  }

  const edit = (id: number, k: keyof SheetItem, v: string | boolean) =>
    setItems((its) => its.map((i) => (i.id === id ? { ...i, [k]: v } as SheetItem : i)));
  const commit = (id: number, k: keyof SheetItem, v: string | boolean) => {
    const numeric = ['unit_price', 'qty', 'period', 'margin', 'markup', 'client_unit', 'client_qty', 'client_period'];
    patch({ item: { id, [k]: typeof v === 'boolean' ? v : numeric.includes(k as string) ? num(v) : v } });
  };

  const colSpan = cliente ? 8 : 14;

  return (
    <>
      {/* ---------- RESUMO (bloco do topo da planilha) ---------- */}
      <div className="sec-title"><h2 className="disp">Resumo</h2><div className="ln" />
        <button className={`btn sm ${cliente ? 'y' : ''}`} onClick={() => setCliente((c) => !c)}
                title="esconde as colunas internas — o 'salvar versão cliente' da planilha">
          {cliente ? 'versão cliente' : 'versão interna'}
        </button>
      </div>
      <div className="sheet" style={{ marginBottom: 4 }}>
        <table>
          <tbody>
            <tr><td>Custos faturados terceiros</td><td className="num b">{brl(S.thirdParty)}</td>
                <td>Total faturamento PROMOONE</td><td className="num b">{brl(S.billedOwn)}</td></tr>
            <tr><td>Custos faturados PROMOONE</td><td className="num b">{brl(S.own)}</td>
                <td>Total faturamento terceiros</td><td className="num b">{brl(S.billedThirdParty)}</td></tr>
            <tr><td>Total planejamento e criação</td><td className="num b">{brl(S.planning)}</td>
                <td>Mark up</td><td className="num b">{brl(S.markup)}</td></tr>
            <tr><td>Honorários <span className="chip c-gray">{(feePct * 100).toFixed(0)}%</span></td>
                <td className="num b">{brl(S.fee)}</td>
                <td>Encargos <span className="chip c-gray">{(chargesPct * 100).toFixed(0)}%</span></td>
                <td className="num b">{brl(S.charges)}</td></tr>
          </tbody>
          <tfoot><tr><td>TOTAL GERAL</td><td className="num">{brl(S.total)}</td>
                     <td>Custo real do job</td><td className="num">{brl(S.cost)}</td></tr></tfoot>
        </table>
      </div>

      {/* ---------- LINHAS POR RUBRICA ---------- */}
      <div className="sec-title"><h2 className="disp">Rubricas</h2><div className="ln" />
        <span className="tiny muted">{items.length} linha(s)</span>
      </div>
      <div className="sheet">
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 40 }}>#</th>
              <th style={{ minWidth: 180 }}>Item</th>
              {!cliente && <>
                <th>Fornecedor</th>
                <th>Pagto. direto</th>
                <th className="num">Custo unit.</th>
                <th className="num">Qtde</th>
                <th className="num">Período</th>
                <th className="num">Custo total</th>
                <th className="num">Mark up</th>
              </>}
              <th className="num">Valor unit.</th>
              <th className="num">Quant.</th>
              <th className="num">Período</th>
              <th className="num">Custo total</th>
              <th className="num">Honorários</th>
              <th className="num">Encargos</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {RUBRICAS.map((r) => {
              const linhas = items.filter((i) => i.rubrica === r.key);
              const sub = linhas.reduce((a, l) => {
                const t = lineTotals(l, feePct, chargesPct);
                return { cost: a.cost + t.cost, client: a.client + t.clientCost, fee: a.fee + t.fee, ch: a.ch + t.charges };
              }, { cost: 0, client: 0, fee: 0, ch: 0 });
              return (
                <>
                  <tr className="grp" key={r.key}>
                    <td colSpan={colSpan + (canEdit ? 1 : 0)}>
                      {r.n}. {r.label}
                      {canEdit && (
                        <button className="btn sm" style={{ marginLeft: 10 }} disabled={busy}
                          onClick={() => patch({ addItem: { rubrica: r.key, item: 'Novo item', qty: 1, period: 1 } }, 'Linha adicionada.')}>
                          + linha
                        </button>
                      )}
                    </td>
                  </tr>
                  {linhas.map((l, idx) => {
                    const t = lineTotals(l, feePct, chargesPct);
                    return (
                      <tr key={l.id}>
                        <td className="tiny muted">{r.n}.{idx + 1}</td>
                        <td>{canEdit
                          ? <input className="ed w160" value={l.item} onChange={(e) => edit(l.id, 'item', e.target.value)} onBlur={(e) => commit(l.id, 'item', e.target.value)} />
                          : <span className="b">{l.item}</span>}</td>
                        {!cliente && <>
                          <td>{canEdit
                            ? <input className="ed w110" value={l.supplier || ''} onChange={(e) => edit(l.id, 'supplier', e.target.value)} onBlur={(e) => commit(l.id, 'supplier', e.target.value)} />
                            : l.supplier || '—'}</td>
                          <td>{canEdit
                            ? <span className={`sw ${l.direct_pay ? 'on' : ''}`} onClick={() => { edit(l.id, 'direct_pay', !l.direct_pay); commit(l.id, 'direct_pay', !l.direct_pay); }} />
                            : <span className={`chip c-${l.direct_pay ? 'green' : 'gray'}`}>{l.direct_pay ? 'Sim' : 'Não'}</span>}</td>
                          <td className="num">{canEdit
                            ? <input className="ed w80 num" value={String(l.unit_price)} onChange={(e) => edit(l.id, 'unit_price', e.target.value)} onBlur={(e) => commit(l.id, 'unit_price', e.target.value)} />
                            : brl(l.unit_price)}</td>
                          <td className="num">{canEdit
                            ? <input className="ed w60 num" value={String(l.qty)} onChange={(e) => edit(l.id, 'qty', e.target.value)} onBlur={(e) => commit(l.id, 'qty', e.target.value)} />
                            : num(l.qty)}</td>
                          <td className="num">{canEdit
                            ? <input className="ed w60 num" value={String(l.period)} onChange={(e) => edit(l.id, 'period', e.target.value)} onBlur={(e) => commit(l.id, 'period', e.target.value)} />
                            : num(l.period)}</td>
                          <td className="num">{brl(t.cost)}</td>
                          <td className="num">{canEdit
                            ? <input className="ed w60 num" value={String(l.markup)} onChange={(e) => edit(l.id, 'markup', e.target.value)} onBlur={(e) => commit(l.id, 'markup', e.target.value)} />
                            : `${(num(l.markup) * 100).toFixed(0)}%`}</td>
                        </>}
                        <td className="num">{canEdit
                          ? <input className="ed w80 num" value={String(l.client_unit)} onChange={(e) => edit(l.id, 'client_unit', e.target.value)} onBlur={(e) => commit(l.id, 'client_unit', e.target.value)} />
                          : brl(l.client_unit)}</td>
                        <td className="num">{canEdit
                          ? <input className="ed w60 num" value={String(l.client_qty)} onChange={(e) => edit(l.id, 'client_qty', e.target.value)} onBlur={(e) => commit(l.id, 'client_qty', e.target.value)} />
                          : num(l.client_qty)}</td>
                        <td className="num">{canEdit
                          ? <input className="ed w60 num" value={String(l.client_period)} onChange={(e) => edit(l.id, 'client_period', e.target.value)} onBlur={(e) => commit(l.id, 'client_period', e.target.value)} />
                          : num(l.client_period)}</td>
                        <td className="num b">{brl(t.clientCost)}</td>
                        <td className="num">{brl(t.fee)}</td>
                        <td className="num">{brl(t.charges)}</td>
                        {canEdit && (
                          <td><button className="btn sm" disabled={busy}
                            onClick={() => patch({ removeItem: l.id }, 'Linha removida.')}>✕</button></td>
                        )}
                      </tr>
                    );
                  })}
                  {linhas.length > 0 && (
                    <tr key={r.key + '-sub'} style={{ opacity: .85 }}>
                      <td />
                      <td className="tiny muted">subtotal</td>
                      {!cliente && <><td /><td /><td /><td /><td /><td className="num b">{brl(sub.cost)}</td><td /></>}
                      <td /><td /><td />
                      <td className="num b">{brl(sub.client)}</td>
                      <td className="num">{brl(sub.fee)}</td>
                      <td className="num">{brl(sub.ch)}</td>
                      {canEdit && <td />}
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>TOTAL GERAL</td>
              {!cliente && <><td /><td /><td /><td /><td /><td className="num">{brl(S.cost)}</td><td className="num">{brl(S.markup)}</td></>}
              <td /><td /><td />
              <td className="num">{brl(S.own + S.thirdParty + S.planning)}</td>
              <td className="num">{brl(S.fee)}</td>
              <td className="num">{brl(S.charges)}</td>
              {canEdit && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ---------- RENTABILIDADE ---------- */}
      <div className="sec-title"><h2 className="disp">Resumo de rentabilidade</h2><div className="ln" /></div>
      <div className="cards g4">
        <div className="card kpi"><div className="lab">Total geral</div>
          <div className="val">{brlShort(S.total)}</div><div className="delta flat">faturamento do job</div></div>
        <div className="card kpi b2"><div className="lab">Honorários + mark up + criação</div>
          <div className="val">{brlShort(S.agencyRevenue)}</div><div className="delta up">receita da agência</div></div>
        <div className="card kpi y"><div className="lab">Rentabilidade</div>
          <div className="val">{(S.profitability * 100).toFixed(1)}%</div>
          <div className={`delta ${S.profitability >= 0.2 ? 'up' : 'down'}`}>sobre o total geral</div></div>
        {compareTo ? (
          <div className="card kpi r"><div className="lab">vs. {compareTo.label}</div>
            <div className="val">{brlShort(S.cost - compareTo.cost)}</div>
            <div className={`delta ${S.cost <= compareTo.cost ? 'up' : 'down'}`}>
              {S.cost <= compareTo.cost ? 'abaixo do orçado' : 'acima do orçado'}
            </div></div>
        ) : (
          <div className="card kpi r"><div className="lab">Custo real do job</div>
            <div className="val">{brlShort(S.cost)}</div><div className="delta flat">antes de honorários</div></div>
        )}
      </div>

      {kind === 'PO' && (
        <>
          <div className="sec-title"><h2 className="disp">Importante</h2><div className="ln" />
            <span className="tiny muted">entra no rodapé do PDF enviado ao cliente</span>
          </div>
          <div className="card"><div className="bd">
            {CLAUSULAS.map((c, i) => (
              <div className="list-li" key={i}>
                <span className="chip c-gray" style={{ flex: 'none' }}>{i + 1}</span>
                <div className="tiny muted" style={{ flex: 1 }}>{c}</div>
              </div>
            ))}
          </div></div>
        </>
      )}
    </>
  );
}
