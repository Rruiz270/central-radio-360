'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';
import { Modal } from './Modal';

type Approved = {
  id: number; kind: string; title: string; file_uuid: string | null;
  advertiser: string; campaign_name: string;
};

const PLATS = ['Instagram', 'Facebook', 'YouTube', 'TikTok', 'X'];

/* Materiais aprovados no Portal do Cliente → agendamento direto na Central de Marketing */
export function ApprovedQueue({ items }: { items: Approved[] }) {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState<Approved | null>(null);
  const [body, setBody] = useState('');
  const [plats, setPlats] = useState<string[]>(['Instagram', 'Facebook']);
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);

  function start(m: Approved) {
    setOpen(m);
    setBody(`${m.advertiser} — ${m.campaign_name}: confere essa oferta! 🎯 Você viu primeiro na Metropolitana 98.5. #${m.advertiser.replace(/\s+/g, '')}`);
  }

  async function schedule() {
    if (!open) return;
    setBusy(true);
    const res = await fetch('/api/materials/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ material_id: open.id, body, platforms: plats, scheduled_for: when || null }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      toast(when ? 'Publicação agendada — pendência baixada na Gestão Interna.' : 'Publicado — pendência baixada na Gestão Interna.', 'ok');
      setOpen(null);
      router.refresh();
    } else toast(data.error || 'Falha ao agendar.', 'warn');
  }

  if (!items.length) return null;

  return (
    <>
      <div className="card" style={{ marginBottom: 8, borderLeft: '4px solid #25c257' }}>
        <div className="hd">
          <h3 className="disp">Aprovados pelo cliente — prontos p/ agendar</h3>
          <span className="tag">vindos do Portal do Cliente</span>
        </div>
        <div className="bd" style={{ padding: '8px 16px' }}>
          {items.map((m) => (
            <div key={m.id} className="list-li" data-approved={m.title}>
              {m.file_uuid && m.kind === 'imagem' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/files/${m.file_uuid}`} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 10, flex: 'none' }} />
              ) : (
                <div className={`ico c-${m.kind === 'video' ? 'red' : 'blue'}`}>{m.kind === 'video' ? 'V' : 'A'}</div>
              )}
              <div style={{ flex: 1 }}>
                <b>{m.title.replace(/\.(png|jpe?g|mp4|webm|gif)$/i, '')}</b>
                <div className="tiny muted">{m.advertiser} · {m.campaign_name} · aprovado no portal</div>
              </div>
              <button className="btn sm p" onClick={() => start(m)} data-testid={`schedule-${m.id}`}>Agendar publicação</button>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <Modal title={`Agendar — ${open.advertiser}`} stage="aprovado" stageTone="green" onClose={() => setOpen(null)}>
          {open.file_uuid && open.kind === 'imagem' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/files/${open.file_uuid}`} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 12, marginBottom: 14 }} />
          )}
          {open.file_uuid && open.kind === 'video' && (
            <video src={`/api/files/${open.file_uuid}`} controls style={{ width: '100%', maxHeight: 260, borderRadius: 12, marginBottom: 14 }} />
          )}
          <div className="field"><label>Texto do post</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} style={{ width: '100%', minHeight: 80, borderRadius: 10, padding: 10, fontFamily: 'inherit', fontSize: 13 }} />
          </div>
          <div className="pchips" style={{ marginTop: 10 }}>
            {PLATS.map((p) => (
              <span key={p} className={`pchk ${plats.includes(p) ? 'on' : ''}`}
                onClick={() => setPlats((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]))}>
                {p}
              </span>
            ))}
          </div>
          <div className="field" style={{ marginTop: 6 }}><label>Agendar para (vazio = publicar agora)</label>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn p" disabled={busy} onClick={schedule} data-testid="confirm-schedule">
              {busy ? 'Salvando…' : when ? 'Agendar' : 'Publicar agora'}
            </button>
            <button className="btn" onClick={() => setOpen(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
