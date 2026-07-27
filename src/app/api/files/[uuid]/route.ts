import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const [f] = await sql`SELECT name, mime, data FROM files WHERE uuid = ${uuid}`;
  if (!f) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  return new NextResponse(Buffer.from(f.data), {
    headers: {
      'Content-Type': f.mime,
      'Content-Disposition': `inline; filename="${encodeURIComponent(f.name)}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
