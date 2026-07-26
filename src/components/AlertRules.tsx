'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';

type Rule = { id: number; area: string; condition: string; message: string; wa_group: string; active: boolean };

export function AlertRulesTable({ rules: initial }: { rules: Rule[] }) {
  const toast = useToast();
  const [rules, setRules] = useState(initial);

  async function toggle(r: Rule) {
    const active = !r.active;
    setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, active } : x)));
    const res = await fetch(`/api/alert-rules/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) {
      setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, active: !active } : x)));
      toast('Falha ao alterar gatilho.', 'warn');
    } else toast(active ? 'Gatilho ativado.' : 'Gatilho desativado.', active ? 'ok' : 'warn');
  }

  async function test(r: Rule) {
    const res = await fetch(`/api/alert-rules/${r.id}/test`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (res.ok) toast(`Alerta de teste → ${r.wa_group}. ${data.note || ''}`, data.delivered ? 'ok' : 'warn');
    else toast(data.error || 'Falha no teste.', 'warn');
  }

  return (
    <table>
      <thead>
        <tr><th>Área</th><th>Gatilho (condição)</th><th>Mensagem no WhatsApp</th><th>Grupo</th><th>Ativo</th><th /></tr>
      </thead>
      <tbody>
        {rules.map((r) => (
          <tr key={r.id}>
            <td className="b">{r.area}</td><td>{r.condition}</td><td>{r.message}</td><td>{r.wa_group}</td>
            <td><span className={`sw ${r.active ? 'on' : ''}`} onClick={() => toggle(r)} data-rule={r.condition} role="switch" aria-checked={r.active} /></td>
            <td><button className="btn sm" onClick={() => test(r)}>Testar</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function NewRuleForm() {
  const toast = useToast();
  const router = useRouter();
  const [f, setF] = useState({
    area: 'Programação', condition: 'Estoque de pendrive < 2',
    message: 'Estoque de pendrive baixo. Repor antes das ações.',
    wa_group: 'Grupo Operações', channel: 'Template Meta (proativo)',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save() {
    if (!f.condition || !f.message) { toast('Preencha condição e mensagem.', 'warn'); return; }
    const res = await fetch('/api/alert-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, wa_group: f.wa_group.replace('Grupo ', ''), channel: f.channel.startsWith('Template') ? 'template' : 'sessao' }),
    });
    if (res.ok) { toast('Gatilho salvo e ativo.', 'ok'); router.refresh(); }
    else toast('Falha ao salvar gatilho.', 'warn');
  }

  return (
    <div>
      <div className="form">
        <div className="field"><label>Área</label>
          <select value={f.area} onChange={set('area')}>
            {['Programação', 'Jornalismo', 'Comercial / Tráfego', 'Operações / Ações', 'Equipamentos', 'Financeiro', 'Arrumar a Casa', 'Equipe', 'Digital', 'IA'].map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="field"><label>Condição (gatilho)</label><input value={f.condition} onChange={set('condition')} /></div>
        <div className="field full"><label>Mensagem</label><input value={f.message} onChange={set('message')} /></div>
        <div className="field"><label>Grupo destino</label>
          <select value={f.wa_group} onChange={set('wa_group')}>
            {['Grupo Operações', 'Grupo Técnica', 'Grupo Redação', 'Grupo Comercial', 'Grupo Financeiro', 'Grupo Produção', 'Grupo RH', 'Gestão'].map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div className="field"><label>Canal</label>
          <select value={f.channel} onChange={set('channel')}>
            <option>Template Meta (proativo)</option><option>Sessão (24h)</option>
          </select>
        </div>
      </div>
      <button className="btn p" style={{ marginTop: 14 }} onClick={save}>Salvar gatilho</button>
    </div>
  );
}
