'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { brl, brlShort, num, PO_AREAS } from '@/lib/esteira';
import type { Role } from '@/lib/auth';

export type PoItem = {
  id: number; item: string; dates: string | null; supplier: string | null;
  qty: string; unit_price: string; payment: string | null;
};
export type PoApproval = {
  area: string; approved: boolean; approved_by: string | null; approved_at: string | null;
};

/* Planilha orçamentária editável + as quatro assinaturas.
   Cada célula salva no banco; cada assinatura respeita o perfil. */
export function PoEditor({ poId, initialItems, initialApprovals, revenue, status, role, canEdit }: {
  poId: number; initialItems: PoItem[]; initialApprovals: PoApproval[];
  revenue: number; status: string; role: Role; canEdit: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [aps, setAps] = useState(initialApprovals);
  const [busy, setBusy] = useState(false);

  const custo = items.reduce((a, i) => a + num(i.qty) * num(i.unit_price), 0);
  const margem = revenue > 0 ? Math.round((1 - custo / revenue) * 100) : 0;
  const pendentes = aps.filter((a) => !a.approved).length;

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

  function edit(id: number, k: keyof PoItem, v: string) {
    setItems((its) => its.map((i) => (i.id === id ? { ...i, [k]: v } : i)));
  }
  function commit(id: number, k: keyof PoItem, v: string) {
    const payload: Record<string, unknown> = { id };
    payload[k] = k === 'qty' || k === 'unit_price' ? num(v) : v;
    patch({ item: payload });
  }

  async function assinar(area: string, atual: boolean) {
    setBusy(true);
    const res = await fetch(`/api/esteira/po/${poId}/approve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area, approved: !atual }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(data.error || 'Sem permissão para esta assinatura.', 'warn'); return; }
    setAps(data.approvals);
    toast(!atual ? 'Assinatura registrada.' : 'Assinatura revogada.', !atual ? 'ok' : 'warn');
    if (data.pending === 0) toast('Todas as áreas aprovaram — P.I. liberada.', 'ok');
    router.refresh();
  }

  async function emitirPI() {
    setBusy(true);
    const res = await fetch(`/api/esteira/po/${poId}/emit-pi`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(data.error || 'Não foi possível emitir.', 'warn'); return; }
    toast(data.already ? 'P.I. já existia — abrindo.' : `P.I. ${data.pi.code} emitida.`, 'ok');
    router.push(`/esteira/pi/${data.pi.id}`);
  }

  const podeAssinar = (area: string) =>
    role === 'admin' || (PO_AREAS.find((a) => a.key === area)?.roles as string[] | undefined)?.includes(role);

  return (
    <>
      <div className="sec-title"><h2 className="disp">Checking — custo geral</h2><div className="ln" />
        {canEdit && (
          <button className="btn sm" disabled={busy}
            onClick={() => patch({ addItem: { item: 'Novo item', qty: 1, unit_price: 0 } }, 'Linha adicionada.')}>
            + linha
          </button>
        )}
      </div>

      <div className="sheet">
        <table>
          <thead><tr>
            <th style={{ minWidth: 180 }}>Ítem</th><th>Datas</th><th style={{ minWidth: 140 }}>Fornecedor</th>
            <th className="num">Qtd.</th><th className="num">Valor unit.</th><th className="num">Valor orçado</th>
            <th>Forma de pagamento</th>{canEdit && <th />}
          </tr></thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={canEdit ? 8 : 7} className="muted" style={{ textAlign: 'center', padding: 18 }}>
                Sem linhas de custo. Adicione a primeira.
              </td></tr>
            )}
            {items.map((i) => (
              <tr key={i.id}>
                <td>{canEdit
                  ? <input className="ed w160" value={i.item} onChange={(e) => edit(i.id, 'item', e.target.value)} onBlur={(e) => commit(i.id, 'item', e.target.value)} />
                  : <span className="b">{i.item}</span>}</td>
                <td>{canEdit
                  ? <input className="ed w110" value={i.dates || ''} onChange={(e) => edit(i.id, 'dates', e.target.value)} onBlur={(e) => commit(i.id, 'dates', e.target.value)} />
                  : i.dates || '—'}</td>
                <td>{canEdit
                  ? <input className="ed w160" value={i.supplier || ''} onChange={(e) => edit(i.id, 'supplier', e.target.value)} onBlur={(e) => commit(i.id, 'supplier', e.target.value)} />
                  : i.supplier || '—'}</td>
                <td className="num">{canEdit
                  ? <input className="ed w60 num" value={i.qty} onChange={(e) => edit(i.id, 'qty', e.target.value)} onBlur={(e) => commit(i.id, 'qty', e.target.value)} />
                  : num(i.qty).toLocaleString('pt-BR')}</td>
                <td className="num">{canEdit
                  ? <input className="ed w80 num" value={i.unit_price} onChange={(e) => edit(i.id, 'unit_price', e.target.value)} onBlur={(e) => commit(i.id, 'unit_price', e.target.value)} />
                  : brl(i.unit_price)}</td>
                <td className="num b">{brl(num(i.qty) * num(i.unit_price))}</td>
                <td>{canEdit
                  ? <input className="ed w110" value={i.payment || ''} onChange={(e) => edit(i.id, 'payment', e.target.value)} onBlur={(e) => commit(i.id, 'payment', e.target.value)} />
                  : i.payment || '—'}</td>
                {canEdit && (
                  <td><button className="btn sm" title="remover" disabled={busy}
                    onClick={() => patch({ removeItem: i.id }, 'Linha removida.')}>✕</button></td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot><tr>
            <td colSpan={5}>CUSTO GERAL</td>
            <td className="num">{brl(custo)}</td>
            <td colSpan={canEdit ? 2 : 1} />
          </tr></tfoot>
        </table>
      </div>

      <div className="sec-title"><h2 className="disp">Aprovação</h2><div className="ln" />
        <span className="tiny muted">{pendentes ? `${pendentes} pendente(s)` : 'todas assinadas'}</span>
      </div>
      <div className="aprv">
        {PO_AREAS.map((a) => {
          const ap = aps.find((x) => x.area === a.key);
          const on = !!ap?.approved;
          const pode = podeAssinar(a.key);
          return (
            <button key={a.key} className={`ap ${on ? 'on' : ''}`} disabled={!pode || busy}
              title={pode ? 'clique para assinar' : `assinatura exclusiva de ${a.label}`}
              onClick={() => assinar(a.key, on)} data-testid={`ap-${a.key}`}>
              <div className="who">{a.label}</div>
              <div className="st"><span className="mk">✓</span> {on ? 'Aprovado' : 'Pendente'}</div>
              <div className="qd">
                {on && ap?.approved_by
                  ? `${ap.approved_by}${ap.approved_at ? ' · ' + new Date(ap.approved_at).toLocaleDateString('pt-BR') : ''}`
                  : pode ? 'você pode assinar' : 'outro perfil'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="cards g3" style={{ marginTop: 18 }}>
        <div className="card kpi"><div className="lab">Receita prevista</div>
          <div className="val">{brlShort(revenue)}</div><div className="delta flat">valor da prospecção</div></div>
        <div className="card kpi y"><div className="lab">Custo orçado</div>
          <div className="val">{brlShort(custo)}</div><div className="delta flat">soma do checking</div></div>
        <div className="card kpi b2"><div className="lab">Margem estimada</div>
          <div className="val">{revenue > 0 ? `${margem}%` : '—'}</div>
          <div className={`delta ${margem >= 40 ? 'up' : 'down'}`}>antes da comissão de agência</div></div>
      </div>

      <div className="df" style={{ marginTop: 18, borderRadius: 14, border: '1px solid var(--linha)' }}>
        <button className="btn p" disabled={busy || pendentes > 0} onClick={emitirPI} data-testid="emitir-pi">
          {pendentes > 0 ? `Faltam ${pendentes} assinatura(s)` : 'Fechar PO e emitir P.I. →'}
        </button>
        {status === 'aberta' && canEdit && (
          <button className="btn" disabled={busy} onClick={() => patch({ status: 'cancelada' }, 'Orçamento cancelado.')}>
            Cancelar orçamento
          </button>
        )}
        <span className="tiny muted" style={{ marginLeft: 'auto' }}>
          {pendentes > 0
            ? 'Assinatura pendente bloqueia a emissão da P.I. — é a regra da casa, agora aplicada pelo sistema.'
            : 'Tudo assinado. A P.I. herda cliente e período automaticamente.'}
        </span>
      </div>
    </>
  );
}
