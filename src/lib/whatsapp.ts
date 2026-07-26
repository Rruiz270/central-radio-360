import { sql } from './db';

/* Meta Cloud API — usa credenciais do env OU da tabela settings (Configurações → Integrações).
   Sem credenciais: modo simulado (loga, não envia). */
export async function sendWhatsApp(message: string, to?: string): Promise<{ sent: boolean; note: string }> {
  let token = process.env.WHATSAPP_TOKEN;
  let phoneId = process.env.WHATSAPP_PHONE_ID;
  let dest = to;

  if (!token || !phoneId) {
    const rows = await sql`SELECT key, value FROM settings WHERE key IN ('whatsapp_token','whatsapp_phone_id','whatsapp_default_to')`;
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    token = token || map.whatsapp_token;
    phoneId = phoneId || map.whatsapp_phone_id;
    dest = dest || map.whatsapp_default_to;
  }

  if (!token || !phoneId || !dest) {
    return { sent: false, note: 'Credenciais WhatsApp não configuradas — disparo simulado (registrado no log).' };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: dest,
        type: 'text',
        text: { body: message },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { sent: false, note: `Meta API recusou: ${err.slice(0, 160)}` };
    }
    return { sent: true, note: 'Enviado via Meta Cloud API.' };
  } catch (e) {
    return { sent: false, note: `Falha de rede: ${(e as Error).message}` };
  }
}
