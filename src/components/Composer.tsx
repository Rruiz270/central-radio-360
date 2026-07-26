'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';

const PLATS = [
  ['YouTube', 'yt', 'Y'], ['Instagram', 'ig', 'I'], ['Facebook', 'fb', 'f'], ['TikTok', 'tt', 'T'], ['X', 'xx', 'X'],
] as const;

export function Composer() {
  const toast = useToast();
  const router = useRouter();
  const [text, setText] = useState('A playlist mais diversificada tá no ar! Sintoniza a Metropolitana 98.5 e marca a gente.');
  const [on, setOn] = useState<string[]>(['YouTube', 'Instagram', 'Facebook']);
  const [when, setWhen] = useState('');
  const [owner, setOwner] = useState('Marina (social)');
  const [busy, setBusy] = useState(false);

  const togg = (p: string) => setOn((xs) => (xs.includes(p) ? xs.filter((x) => x !== p) : [...xs, p]));

  async function genIA() {
    setBusy(true);
    const res = await fetch('/api/ai/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setText(data.text);
      toast(data.engine === 'template' ? 'Post gerado (modo template — plugue uma chave de IA em Configurações).' : `Post gerado com IA (${data.engine}).`, 'ok');
    } else toast(data.error || 'Falha na geração.', 'warn');
  }

  async function save(status: 'publicado' | 'agendado') {
    if (!on.length) { toast('Selecione ao menos uma rede.', 'warn'); return; }
    if (!text.trim()) { toast('Escreva o post.', 'warn'); return; }
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text, platforms: on, scheduled_for: when || null, owner: owner.split(' ')[0], status }),
    });
    if (res.ok) {
      toast(status === 'publicado' ? `Publicado agora em: ${on.join(', ')}` : `Agendado em: ${on.join(', ')}`, 'ok');
      router.refresh();
    } else toast('Falha ao salvar o post.', 'warn');
  }

  return (
    <div className="composer">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva o post… ou gere com IA a partir de uma pauta/novidade." />
      <div className="pchips">
        {PLATS.map(([name, cls, letter]) => (
          <span key={name} className={`pchk ${on.includes(name) ? 'on' : ''}`} onClick={() => togg(name)} data-plat={name}>
            <span className={`pi ${cls}`}>{letter}</span>{name}
          </span>
        ))}
      </div>
      <div className="form">
        <div className="field"><label>Agendar para</label><input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
        <div className="field"><label>Responsável</label>
          <select value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option>Marina (social)</option><option>Diego (social)</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <button className="btn p" onClick={() => save('publicado')}>Publicar agora</button>
        <button className="btn" onClick={() => save('agendado')}>Agendar</button>
        <button className="btn y" disabled={busy} onClick={genIA}>{busy ? 'Gerando…' : 'Gerar com IA'}</button>
      </div>
    </div>
  );
}
