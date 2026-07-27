import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { sendWhatsApp } from '@/lib/whatsapp';

/* "Enviar WhatsApp" do modal do lead — dispara (ou simula) mensagem ao cliente e registra */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  const { id } = await params;
  const [deal] = await sql`SELECT advertiser FROM deals WHERE id = ${Number(id)} AND tenant_id = ${session.tenantId}`;
  if (!deal) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  const wa = await sendWhatsApp(`Olá! Aqui é a Metropolitana FM sobre a proposta de ${deal.advertiser}. Podemos falar?`);
  await sql`INSERT INTO alert_log (tenant_id, title, wa_group, status)
    VALUES (${session.tenantId}, ${'Mensagem ao cliente ' + deal.advertiser}, 'Comercial', ${wa.sent ? 'entregue' : 'simulado'})`;
  return NextResponse.json({ ok: true, delivered: wa.sent, note: wa.note });
}
