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
  const fileUrl = fileUuid ? `/api/files/${fileUuid}` : null;
  const cleanTitle = title.replace(/\.(m4a|mp3|wav|mp4|webm|png|jpe?g|gif|pdf)$/i, '');

  async function setTo(next: string, msg: string) {
    const res = await fetch(`/api/materials/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, token }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus(next);
      if (data.triggered === 'trafego') {
        toast('Aprovado! Spot enviado pro Tráfego & Log — a equipe define agora em qual break entra no ar.', 'ok');
      } else if (data.triggered === 'digital') {
        toast('Aprovado! Pendência criada pro Digital agendar a publicação.', 'ok');
      } else {
        toast(msg, 'ok');
      }
    } else toast('Não foi possível atualizar.', 'warn');
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
      {fileUrl && kind === 'imagem' ? (
        <a href={fileUrl} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileUrl} alt={cleanTitle} style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }} />
        </a>
      ) : fileUrl && kind === 'video' ? (
        <video src={fileUrl} controls preload="metadata" style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block', background: '#04061a' }} />
      ) : fileUrl && kind === 'audio' ? (
        <div className={`prev ${cls}`} style={{ height: 170, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span>{label}</span>
          <audio src={fileUrl} controls preload="metadata" style={{ width: '90%' }} />
        </div>
      ) : (
        <div className={`prev ${cls}`}>{label}</div>
      )}
      <div className="mc">
        <b>{cleanTitle}</b>
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
