'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';

export function OrderForm() {
  const toast = useToast();
  const router = useRouter();
  const [f, setF] = useState({
    advertiser: 'Casas Bahia', agency: '', flight_start: '', flight_end: '',
    daypart: 'Manhã (6–10h)', insertions: '180', duration: '30"', value: '120000', sale_type: 'Dinheiro',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save() {
    if (!f.advertiser) { toast('Informe o anunciante.', 'warn'); return; }
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        advertiser: f.advertiser, agency: f.agency || null,
        flight_start: f.flight_start || null, flight_end: f.flight_end || null,
        daypart: f.daypart, insertions: parseInt(f.insertions, 10) || 0,
        duration_sec: parseInt(f.duration, 10) || 30,
        value: parseFloat(f.value) || 0, sale_type: f.sale_type,
      }),
    });
    if (res.ok) { toast(`Pedido de ${f.advertiser} lançado — flight validado contra avails.`, 'ok'); router.refresh(); }
    else toast('Erro ao lançar pedido.', 'warn');
  }

  return (
    <div>
      <div className="form">
        <div className="field"><label>Anunciante</label><input value={f.advertiser} onChange={set('advertiser')} /></div>
        <div className="field"><label>Agência</label><input value={f.agency} onChange={set('agency')} placeholder="direto" /></div>
        <div className="field"><label>Flight (início)</label><input type="date" value={f.flight_start} onChange={set('flight_start')} /></div>
        <div className="field"><label>Flight (fim)</label><input type="date" value={f.flight_end} onChange={set('flight_end')} /></div>
        <div className="field"><label>Daypart</label>
          <select value={f.daypart} onChange={set('daypart')}>
            <option>Manhã (6–10h)</option><option>Almoço (12–13h)</option><option>Drive (17–20h)</option><option>Rotativo</option>
          </select>
        </div>
        <div className="field"><label>Inserções</label><input value={f.insertions} onChange={set('insertions')} /></div>
        <div className="field"><label>Duração</label>
          <select value={f.duration} onChange={set('duration')}><option>30&quot;</option><option>15&quot;</option><option>45&quot;</option><option>60&quot;</option></select>
        </div>
        <div className="field"><label>Valor (R$)</label><input value={f.value} onChange={set('value')} /></div>
        <div className="field"><label>Tipo de venda</label>
          <select value={f.sale_type} onChange={set('sale_type')}><option>Dinheiro</option><option>Permuta (barter)</option><option>Bonificação</option></select>
        </div>
        <div className="field"><label>Crédito do cliente</label><input readOnly value="Aprovado — limite R$ 150k" style={{ color: '#35e07a' }} /></div>
      </div>
      <button className="btn p" style={{ marginTop: 14 }} onClick={save}>Lançar pedido</button>
    </div>
  );
}
