'use client';

import { useEffect, useState } from 'react';
import { useToast } from './Toast';

type IngKey = { id: number; key: string; label: string; active: boolean; last_used: string | null; tenant_name: string };
type Run = { id: number; job: string; ran_at: string; ok: boolean; detail: string };

export function SystemPanel({ runs }: { runs: Run[] }) {
  const toast = useToast();
  const [keys, setKeys] = useState<IngKey[]>([]);
  const [running, setRunning] = useState('');

  useEffect(() => { fetch('/api/ingest-keys').then(async (r) => { if (r.ok) setKeys((await r.json()).keys); }); }, []);

  async function runJob(job: string) {
    setRunning(job);
    const r = await fetch(`/api/cron/${job}`);
    const data = await r.json().catch(() => ({}));
    setRunning('');
    if (r.ok && !data.skipped) toast(`Job ${job}: ${data.detail}`, 'ok');
    else if (data.skipped) toast(`Job ${job} rodou há pouco — pulado.`, 'ok');
    else toast(data.error || `Falha no job ${job}.`, 'warn');
  }

  async function toggleKey(k: IngKey) {
    await fetch('/api/ingest-keys', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: k.id, active: !k.active }) });
    setKeys((ks) => ks.map((x) => (x.id === k.id ? { ...x, active: !x.active } : x)));
    toast(k.active ? 'Chave revogada.' : 'Chave reativada.', 'ok');
  }

  return (
    <div className="cards g2">
      <div className="card">
        <div className="hd"><h3 className="disp">Rotinas automáticas (crons)</h3><span className="tag">Vercel Cron + oportunista</span></div>
        <div className="bd">
          <div className="tiny muted" style={{ marginBottom: 10 }}>
            Radar roda 06h30 (BRT) via Vercel Cron; publicador/cobrança/estoque rodam no cron diário <b>e</b> a cada visita
            (com janela mínima). Botões abaixo forçam execução agora:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {['radar', 'publisher', 'cobranca', 'estoque', 'market'].map((j) => (
              <button key={j} className="btn sm" disabled={running === j} onClick={() => runJob(j)} data-cronbtn={j}>
                {running === j ? 'Rodando…' : `Rodar ${j}`}
              </button>
            ))}
          </div>
          <div className="tiny b" style={{ marginBottom: 6 }}>Últimas execuções</div>
          <table>
            <thead><tr><th>Job</th><th>Quando</th><th>Resultado</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="b">{r.job}</td>
                  <td>{new Date(r.ran_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{r.ok ? <span className="chip c-green">{r.detail || 'ok'}</span> : <span className="chip c-red">{r.detail}</span>}</td>
                </tr>
              ))}
              {runs.length === 0 && <tr><td colSpan={3} className="tiny muted">nenhuma execução ainda</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="hd"><h3 className="disp">Conector Pulsar & Backup</h3></div>
        <div className="bd">
          <div className="tiny b" style={{ marginBottom: 6 }}>Chaves de ingestão (API <code>/api/v1/ingest</code>)</div>
          {keys.map((k) => (
            <div key={k.id} className="list-li">
              <div style={{ flex: 1 }}>
                <b>{k.label}</b>
                <div className="tiny muted mono" style={{ wordBreak: 'break-all' }}>{k.key}</div>
                <div className="tiny muted">{k.last_used ? `último envio: ${new Date(k.last_used).toLocaleString('pt-BR')}` : 'nunca usada'}</div>
              </div>
              <span className={`sw ${k.active ? 'on' : ''}`} role="switch" aria-checked={k.active} onClick={() => toggleKey(k)} />
            </div>
          ))}
          <div className="tiny muted" style={{ margin: '8px 0 14px' }}>
            Script de referência do conector: <code>scripts/pulsar-connector-sample.mjs</code> no repositório — roda na
            máquina do Pulsar e envia o log de execução em lotes idempotentes.
          </div>
          <div className="tiny b" style={{ marginBottom: 6 }}>Backup</div>
          <a className="btn p sm" href="/api/admin/export" data-testid="backup">Baixar backup completo (JSON)</a>
          <div className="tiny muted" style={{ marginTop: 6 }}>Além do PITR nativo do Neon. Rode 1x/semana e guarde no Drive.</div>
        </div>
      </div>
    </div>
  );
}
