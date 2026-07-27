'use client';

import { useState } from 'react';
import { useToast } from './Toast';

const PREV: Record<string, [string, string]> = {
  audio: ['aud', 'ÁUDIO · SPOT 30"'],
  imagem: ['img', 'IMAGEM · ARTE/MERCHAN'],
  video: ['vid', 'VÍDEO · TESTEMUNHAL'],
};

export function MaterialCard({ id, kind, title, status: initialStatus, note, token, fileUuid }: {
  id: number; kind: string; title: string; status: string; note?: string | null; token?: string; fileUuid?: string | null;
}) {
  const toast = useToast();
  const [status, setStatus] = useState(initialStatus);
  const [cls, label] = PREV[kind] || PREV.imagem;

  async function setTo(next: string, msg: string) {
    const res = await fetch(`/api/materials/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, token }),
    });
    if (res.ok) { setStatus(next); toast(msg, 'ok'); }
    else toast('Não foi possível atualizar.', 'warn');
  }

  function comment() {
    const c = window.prompt('Comentário para a produção:');
    if (c) {
      fetch(`/api/materials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note: c, token }),
      }).then((r) => toast(r.ok ? 'Comentário registrado.' : 'Falha ao comentar.', r.ok ? 'ok' : 'warn'));
    }
  }

  return (
    <div className="matcard" data-material={title}>
      <div className={`prev ${cls}`}>{label}</div>
      <div className="mc">
        <b>{title}</b>
        <div className="tiny muted" style={{ margin: '4px 0 10px' }}>
          {status === 'aprovado' ? <span className="chip c-green">aprovado pelo cliente</span>
            : status === 'ajuste' ? <span className="chip c-amber">ajuste solicitado</span>
            : status === 'reprovado' ? <span className="chip c-red">reprovado</span>
            : note || 'aguardando cliente'}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {fileUuid && (
            <a className="btn sm" href={`/api/files/${fileUuid}`} target="_blank" rel="noreferrer">
              {kind === 'audio' ? 'Ouvir' : kind === 'video' ? 'Assistir' : 'Ver'}
            </a>
          )}
          {status !== 'aprovado' && <button className="btn sm p" onClick={() => setTo('aprovado', 'Material aprovado — produção avisada no WhatsApp.')}>Aprovar</button>}
          {status !== 'reprovado' && status !== 'aprovado' && <button className="btn sm" onClick={() => setTo('reprovado', 'Material reprovado — produção vai revisar.')}>Reprovar</button>}
          <button className="btn sm" onClick={comment}>Comentar</button>
        </div>
      </div>
    </div>
  );
}
