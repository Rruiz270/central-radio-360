import { sql } from './db';

async function getKey(envName: string, settingKey: string): Promise<string | undefined> {
  if (process.env[envName]) return process.env[envName];
  const rows = await sql`SELECT value FROM settings WHERE key = ${settingKey}`;
  return rows[0]?.value || undefined;
}

/* Geração de texto: Claude primeiro (padrão da doc técnica §8), OpenAI como alternativa,
   template de marca como fallback sem chave. */
export async function generateText(prompt: string, system: string): Promise<{ text: string; engine: string }> {
  const anthropicKey = await getKey('ANTHROPIC_API_KEY', 'anthropic_api_key');
  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 500,
          system,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return { text: data.content[0].text, engine: 'claude' };
      }
    } catch { /* cai pro próximo */ }
  }

  const openaiKey = await getKey('OPENAI_API_KEY', 'openai_api_key');
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 500,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return { text: data.choices[0].message.content, engine: 'openai' };
      }
    } catch { /* cai pro fallback */ }
  }

  return {
    text: 'Hoje na Metropolitana 98.5: a playlist mais quente do Brasil, novidades fresquinhas e a energia que só a Metro tem. Sintoniza e marca a gente! #Metropolitana985',
    engine: 'template',
  };
}

export async function generateImage(prompt: string): Promise<{ url?: string; b64?: string; error?: string }> {
  const openaiKey = await getKey('OPENAI_API_KEY', 'openai_api_key');
  if (!openaiKey) {
    return { error: 'Chave OpenAI não configurada — adicione em Configurações → Integrações.' };
  }
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024', n: 1 }),
  });
  if (!res.ok) return { error: `OpenAI recusou: ${(await res.text()).slice(0, 160)}` };
  const data = await res.json();
  return { b64: data.data[0].b64_json, url: data.data[0].url };
}
