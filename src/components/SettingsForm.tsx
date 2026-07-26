'use client';

import { useEffect, useState } from 'react';
import { useToast } from './Toast';

const GROUPS: { title: string; desc: string; keys: [string, string][] }[] = [
  {
    title: 'IA — geração de conteúdo e imagem',
    desc: 'Claude (posts, copilots) e OpenAI (imagens, alternativa de texto). Sem chave, os recursos rodam em modo template.',
    keys: [['anthropic_api_key', 'Anthropic (Claude) API Key'], ['openai_api_key', 'OpenAI API Key']],
  },
  {
    title: 'WhatsApp — Meta Cloud API',
    desc: 'Token de System User + Phone Number ID da WABA. O número destino padrão recebe os alertas de teste.',
    keys: [['whatsapp_token', 'Token (System User)'], ['whatsapp_phone_id', 'Phone Number ID'], ['whatsapp_default_to', 'Número destino padrão (5511…)']],
  },
  {
    title: 'Redes sociais — OAuth (App Review)',
    desc: 'Apps Meta/YouTube/TikTok para publicação automática. Enquanto o review não sai, o agendamento fica em modo fila.',
    keys: [['meta_app_id', 'Meta App ID'], ['meta_app_secret', 'Meta App Secret'], ['youtube_client_id', 'YouTube Client ID'], ['youtube_client_secret', 'YouTube Client Secret'], ['tiktok_client_key', 'TikTok Client Key']],
  },
  {
    title: 'CRM i10 — comunicação & vendas',
    desc: 'Conecta o Audience Hub / CRM i10 para réguas de e-mail, base de contatos e funil integrado.',
    keys: [['i10_crm_url', 'URL da API do CRM'], ['i10_crm_key', 'Chave de integração']],
  },
];

export function SettingsForm() {
  const toast = useToast();
  const [saved, setSaved] = useState<Record<string, { value: string; set: boolean }>>({});
  const [vals, setVals] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/settings').then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        setSaved(Object.fromEntries(data.settings.map((s: { key: string; value: string; set: boolean }) => [s.key, s])));
      }
    });
  }, []);

  async function save(key: string) {
    const value = vals[key];
    if (!value) { toast('Cole a chave antes de salvar.', 'warn'); return; }
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (res.ok) {
      setSaved((s) => ({ ...s, [key]: { value: value.slice(0, 4) + '••••', set: true } }));
      setVals((v) => ({ ...v, [key]: '' }));
      toast('Chave salva com segurança.', 'ok');
    } else toast('Falha ao salvar (só admin).', 'warn');
  }

  return (
    <div className="cards g2">
      {GROUPS.map((g) => (
        <div className="card" key={g.title}>
          <div className="hd"><h3 className="disp">{g.title}</h3></div>
          <div className="bd">
            <div className="tiny muted" style={{ marginBottom: 12 }}>{g.desc}</div>
            {g.keys.map(([key, label]) => (
              <div key={key} className="field" style={{ marginBottom: 10 }}>
                <label>
                  {label}{' '}
                  {saved[key]?.set && <span className="chip c-green" style={{ marginLeft: 6 }}>configurada · {saved[key].value}</span>}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="password"
                    style={{ flex: 1 }}
                    placeholder={saved[key]?.set ? 'substituir…' : 'colar chave…'}
                    value={vals[key] || ''}
                    onChange={(e) => setVals({ ...vals, [key]: e.target.value })}
                  />
                  <button className="btn sm p" onClick={() => save(key)}>Salvar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
