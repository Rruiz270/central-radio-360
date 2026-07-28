'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { brl, brlShort, money, num, DEPT, MESES, type Dept } from '@/lib/esteira';

export type PdItem = {
  id: number; tenant_id: number; praca: string; uf: string; dept: string; item: string;
  seconds: number; qty: number; rate: string; discount: string; commission: string;
  months: Record<string, number>; os_id: number | null; os_code: string | null;
};

/* Planilha de Distribuição: uma aba por praça no Excel — aqui, um seletor.
   A rede é nacional, então cada praça carrega o próprio valor de tabela. */
export function PdEditor({ pdId, piCode, initialItems, status, canEdit }: {
  pdId: number; piCode: string; initialItems: PdItem[]; status: string; canEdit: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);

  const pracas = Array.from(new Map(items.map((i) => [i.tenant_id, { id: i.tenant_id, name: i.praca, uf: i.uf }])).values());
  const [praca, setPraca] = useState<number>(pracas[0]?.id ?? 0);
  const linhas = items.filter((i) => i.tenant_id === praca);

  const calc = (i: PdItem) => money(num(i.qty), num(i.rate), num(i.discount), num(i.commission));
  const totPraca = linhas.reduce((a, i) => a + calc(i).net, 0);
  const totRede = items.reduce((a, i) => a + calc(i).net, 0);
  const meses = Object.keys(linhas[0]?.months || {}).map(Number).sort((a, b) => a - b);

  async function patch(body: unknown, msg?: string) {
    setBusy(true);
    const res = await fetch(`/api/esteira/pd/${pdId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(data.error || 'Falha ao salvar.', 'warn'); return null; }
    if (msg) toast(msg, 'ok');
    return data;
  }

  const edit = (id: number, k: keyof PdItem, v: string) =>
    setItems((its) => its.map((i) => (i.id === id ? { ...i, [k]: v } as PdItem : i)));
  const commit = (id: number, k: keyof PdItem, v: string) =>
    patch({ item: { id, [k]: ['qty', 'rate'].includes(k) ? num(v) : v } });

  async function autorizar() {
    const d = await patch({ authorize: true }, 'PD autorizada — liberada para gerar as O.S.');
    if (d) router.refresh();
  }

  async function gerarOS(apenasEsta: boolean) {
    setBusy(true);
    const res = await fetch(`/api/esteira/pd/${pdId}/generate-os`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apenasEsta ? { tenant: praca } : {}),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(data.error || 'Não foi possível gerar.', 'warn'); return; }
    if (!data.total) { toast('Nenhuma O.S. nova — todas já existiam.', 'warn'); return; }
    toast(`${data.total} O.S. abertas e enviadas aos departamentos.`, 'ok');
    router.push(`/esteira/os?pd=${pdId}`);
  }

  const semQtd = items.every((i) => !num(i.qty));

  return (
    <>
      <div className="subtabs">
        {pracas.map((p) => {
          const t = items.filter((i) => i.tenant_id === p.id).reduce((a, i) => a + calc(i).net, 0);
          return (
            <button key={p.id} className={p.id === praca ? 'on' : ''} onClick={() => setPraca(p.id)}>
              {p.name.replace('Metropolitana ', '')}
              <span className="tiny" style={{ opacity: .75 }}>{brlShort(t)}</span>
            </button>
          );
        })}
      </div>

      <div className="sheet">
        <table>
          <thead><tr>
            <th style={{ minWidth: 170 }}>Ítem</th><th>Departamento</th><th className="num">Sec.</th><th className="num">Qtd.</th>
            <th className="num">Valor tabela</th><th className="num">Total tabela</th><th className="num">Desc.</th>
            <th className="num">Negociado</th><th className="num">Com.</th><th className="num">Total líquido</th>
            <th className="num">Líq. unit.</th><th>O.S.</th>
          </tr></thead>
          <tbody>
            {linhas.map((i) => {
              const m = calc(i);
              const d = DEPT[i.dept as Dept];
              return (
                <tr key={i.id}>
                  <td className="b">{i.item}</td>
                  <td>
                    <span className={`chip c-${d?.offline ? 'red' : 'gray'}`}>{d?.label || i.dept}</span>
                  </td>
                  <td className="num">{i.seconds || '—'}</td>
                  <td className="num">{canEdit && status !== 'executada'
                    ? <input className="ed w60 num" value={i.qty} onChange={(e) => edit(i.id, 'qty', e.target.value)} onBlur={(e) => commit(i.id, 'qty', e.target.value)} />
                    : i.qty}</td>
                  <td className="num">{canEdit && status === 'rascunho'
                    ? <input className="ed w80 num" value={i.rate} onChange={(e) => edit(i.id, 'rate', e.target.value)} onBlur={(e) => commit(i.id, 'rate', e.target.value)} />
                    : brl(i.rate)}</td>
                  <td className="num">{brl(m.tableTotal)}</td>
                  <td className="num">{(num(i.discount) * 100).toFixed(2)}%</td>
                  <td className="num">{brl(m.negotiated)}</td>
                  <td className="num">{(num(i.commission) * 100).toFixed(0)}%</td>
                  <td className="num b">{brl(m.net)}</td>
                  <td className="num">{brl(m.netUnit)}</td>
                  <td>{i.os_id
                    ? <a href={`/esteira/os/${i.os_id}`} className="chip c-green">{i.os_code}</a>
                    : <span className="chip c-gray">a gerar</span>}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr>
            <td colSpan={9}>TOTAL DA PRAÇA</td><td className="num">{brl(totPraca)}</td><td colSpan={2} />
          </tr></tfoot>
        </table>
      </div>

      <div className="sec-title"><h2 className="disp">Distribuição mensal &amp; nº de P.I. por mês</h2><div className="ln" /></div>
      <div className="sheet">
        <table>
          <thead><tr>
            <th>Mês</th>
            {MESES.map((m, i) => <th key={m} className="num" style={{ opacity: meses.includes(i + 1) ? 1 : .35 }}>{m}</th>)}
            <th className="num">Total</th>
          </tr></thead>
          <tbody>
            <tr>
              <td className="b">Valor líquido</td>
              {MESES.map((m, i) => {
                const share = linhas[0]?.months?.[String(i + 1)] || 0;
                return <td key={m} className="num">{share ? brlShort(totPraca * share) : '—'}</td>;
              })}
              <td className="num b">{brl(totPraca)}</td>
            </tr>
            <tr>
              <td className="b">Nº da P.I.</td>
              {MESES.map((m, i) => {
                const share = linhas[0]?.months?.[String(i + 1)] || 0;
                return <td key={m} className="num">{share
                  ? <span className="chip c-blue">{piCode.split('-').pop()}/{String(i + 1).padStart(2, '0')}</span>
                  : '—'}</td>;
              })}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <div className="nota">
        No Excel, cada mês vira uma P.I. digitada à mão em cada aba de praça. Aqui a numeração deriva da P.I. mãe
        <b> {piCode}</b> — some a renumeração e a chance de duas praças usarem o mesmo número.
      </div>

      <div className="df" style={{ marginTop: 18, borderRadius: 14, border: '1px solid var(--linha)' }}>
        {status === 'rascunho' && canEdit && (
          <button className="btn p" disabled={busy || semQtd} onClick={autorizar} data-testid="autorizar-pd">
            Autorizar distribuição
          </button>
        )}
        {status === 'autorizada' && canEdit && (
          <>
            <button className="btn p" disabled={busy} onClick={() => gerarOS(false)} data-testid="gerar-os">
              Gerar O.S. de toda a rede →
            </button>
            <button className="btn" disabled={busy} onClick={() => gerarOS(true)}>
              Só desta praça
            </button>
          </>
        )}
        <span className="tiny muted" style={{ marginLeft: 'auto' }}>
          Rede: <b>{brl(totRede)}</b> líquido em {pracas.length} praça(s).
          {semQtd && ' Informe quantidades antes de autorizar.'}
        </span>
      </div>
    </>
  );
}
