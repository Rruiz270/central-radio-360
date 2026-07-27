import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/* MIMEs que podem renderizar inline com segurança; o resto baixa como octet-stream */
const SAFE_INLINE = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/aac',
  'video/mp4', 'video/webm', 'application/pdf',
]);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const [f] = await sql`SELECT name, mime, data FROM files WHERE uuid = ${uuid}`;
  if (!f) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  const safe = SAFE_INLINE.has(f.mime);
  return new NextResponse(Buffer.from(f.data), {
    headers: {
      'Content-Type': safe ? f.mime : 'application/octet-stream',
      'Content-Disposition': `${safe ? 'inline' : 'attachment'}; filename="${encodeURIComponent(f.name)}"`,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
