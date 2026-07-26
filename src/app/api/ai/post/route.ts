import { NextRequest, NextResponse } from 'next/server';
import { requireApi } from '@/lib/guard';
import { generateText } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const session = await requireApi('marketing');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const { topic } = await req.json().catch(() => ({ topic: '' }));
  const { text, engine } = await generateText(
    topic
      ? `Escreva um post curto de rede social sobre: ${topic}`
      : 'Escreva um post curto de rede social convidando a audiência a sintonizar agora.',
    'Você é o social media da rádio Metropolitana FM 98.5 de São Paulo. Tom jovem, energético, brasileiro. Máximo 280 caracteres, com 1-2 hashtags. Responda só com o texto do post.',
  );
  return NextResponse.json({ ok: true, text, engine });
}
