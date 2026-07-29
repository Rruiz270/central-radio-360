'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { PO_AREAS } from '@/lib/esteira';
import type { Role } from '@/lib/auth';

export type PoApproval = {
  area: string; approved: boolean; approved_by: string | null; approved_at: string | null;
};

/* As quatro assinaturas da planilha — cada uma só pode ser marcada pelo perfil dono da área. */
export function PoApprovals({ poId, initial, role, status, hasPI, piId, hasCP, cpId }: {
  poId: number; initial: PoApproval[]; role: Role; status: string;
  hasPI: boolean; piId?: number; hasCP: boolean; cpId?: number;
}) {
  const toast = useToast();
  const router = useRouter();
  const [aps, setAps] = useState(initial);
  const [busy, setBusy] = useState(false);
  const pend = aps.filter((a) => !a.approved).length;

  const podeAssinar = (area: string) =>
    role === 'admin' || (PO_AREAS.find((a) => a.key === area)?.roles as string[] | undefined)?.includes(role);

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

  async function acao(url: string, chave: 'pi' | 'cp', destino: (id: number) => string) {
    setBusy(true);
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(data.error || 'Não foi possível concluir.', 'warn'); return; }
    toast(data.already ? 'Documento já existia — abrindo.' : `${data[chave].code} criado.`, 'ok');
    router.push(destino(data[chave].id));
  }

  return (
    <>
      <div className="sec-title"><h2 className="disp">Aprovação</h2><div className="ln" />
        <span className="tiny muted">{pend ? `${pend} pendente(s)` : 'todas assinadas'}</span>
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

      <div className="df" style={{ marginTop: 18, borderRadius: 14, border: '1px solid var(--linha)' }}>
        {!hasPI ? (
          <button className="btn p" disabled={busy || pend > 0} data-testid="emitir-pi"
            onClick={() => acao(`/api/esteira/po/${poId}/emit-pi`, 'pi', (id) => `/esteira/pi/${id}`)}>
            {pend > 0 ? `Faltam ${pend} assinatura(s)` : 'Fechar PO e emitir P.I. →'}
          </button>
        ) : (
          <button className="btn p" onClick={() => router.push(`/esteira/pi/${piId}`)}>Abrir a P.I. →</button>
        )}

        {!hasCP ? (
          <button className="btn y" disabled={busy || pend > 0} data-testid="abrir-cp"
            title={pend > 0 ? 'o orçamento precisa estar aprovado' : 'copia a planilha para o custo realizado'}
            onClick={() => acao(`/api/esteira/po/${poId}/close-cp`, 'cp', (id) => `/esteira/po/${id}`)}>
            Abrir Custo de Produção (CP) →
          </button>
        ) : (
          <button className="btn" onClick={() => router.push(`/esteira/po/${cpId}`)}>Abrir o CP →</button>
        )}

        <span className="tiny muted" style={{ marginLeft: 'auto' }}>
          {pend > 0
            ? 'Assinatura pendente bloqueia a emissão da P.I. — regra da casa, agora aplicada pelo sistema.'
            : status === 'cancelada' ? 'Orçamento cancelado.' : 'Tudo assinado.'}
        </span>
      </div>
    </>
  );
}
