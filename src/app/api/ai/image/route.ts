import { NextRequest, NextResponse } from 'next/server';
import { requireApi } from '@/lib/guard';
import { generateImage } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const session = await requireApi('marketing');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const { prompt } = await req.json();
  if (!prompt) return NextResponse.json({ error: 'prompt obrigatório' }, { status: 400 });
  const result = await generateImage(
    `Arte para rede social da rádio Metropolitana FM 98.5 (azul #0020b8, amarelo #ffe200, estilo jovem e vibrante): ${prompt}`,
  );
  if (result.error) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json({ ok: true, ...result });
}
