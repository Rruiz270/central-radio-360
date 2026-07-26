'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';

const EMPTY = { title: '', artist1: '', artist2: '', composer: '', category: '01 · Sucessos', rhythm: '', bpm_year: '', origin: 'Nacional', interval_h: '3', is_new: 'Não' };

export function SongForm() {
  const toast = useToast();
  const router = useRouter();
  const [f, setF] = useState({ ...EMPTY, title: 'Meu Erro', artist1: 'Chimarruts', category: '11 · Depósito', rhythm: 'R1 · 01', bpm_year: '98 · 2005' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save() {
    if (!f.title || !f.artist1) { toast('Preencha música e intérprete.', 'warn'); return; }
    const [code, cat] = f.category.split(' · ');
    const [bpm, year] = f.bpm_year.split('·').map((s) => parseInt(s.trim(), 10) || null);
    const res = await fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: f.title, artist1: f.artist1, artist2: f.artist2, composer: f.composer,
        category_code: code, category: cat, rhythm: f.rhythm, bpm, year,
        origin: f.origin, interval_h: parseInt(f.interval_h, 10) || 3, is_new: f.is_new === 'Sim',
      }),
    });
    if (res.ok) { toast(`Música "${f.title}" salva no acervo.`, 'ok'); router.refresh(); }
    else toast('Erro ao salvar.', 'warn');
  }

  return (
    <div>
      <div className="form">
        <div className="field full"><label>Música</label><input value={f.title} onChange={set('title')} /></div>
        <div className="field"><label>1º Intérprete</label><input value={f.artist1} onChange={set('artist1')} /></div>
        <div className="field"><label>2º Intérprete</label><input value={f.artist2} onChange={set('artist2')} placeholder="—" /></div>
        <div className="field"><label>Compositor</label><input value={f.composer} onChange={set('composer')} placeholder="—" /></div>
        <div className="field"><label>Categoria</label>
          <select value={f.category} onChange={set('category')}>
            <option>01 · Sucessos</option><option>03 · Novidades</option><option>07 · Clássicos</option><option>11 · Depósito</option>
          </select>
        </div>
        <div className="field"><label>Ritmo / Peso</label><input value={f.rhythm} onChange={set('rhythm')} /></div>
        <div className="field"><label>BPM / Ano</label><input value={f.bpm_year} onChange={set('bpm_year')} /></div>
        <div className="field"><label>Nac / Int</label>
          <select value={f.origin} onChange={set('origin')}><option>Nacional</option><option>Internacional</option></select>
        </div>
        <div className="field"><label>Intervalo (h)</label><input value={f.interval_h} onChange={set('interval_h')} /></div>
        <div className="field"><label>Novidade</label>
          <select value={f.is_new} onChange={set('is_new')}><option>Não</option><option>Sim</option></select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn p" onClick={save}>Salvar</button>
        <button className="btn" onClick={() => setF(EMPTY)}>+ Nova</button>
      </div>
    </div>
  );
}
