import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { canCreate } from '@/lib/esteira';
import { alerta, audit, nextCode } from '@/lib/esteira-server';

/* O.S. → CP. Abre uma ficha de produção por peça da P.I. que ainda não tenha uma. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  if (!canCreate(session.role, 'CP')) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });

  const { id } = await params;
  const osId = Number(id);
  const [os] = await sql`SELECT * FROM service_orders WHERE id = ${osId}`;
  if (!os) return NextResponse.json({ error: 'O.S. não encontrada' }, { status: 404 });

  const items = await sql`
    SELECT DISTINCT item, seconds FROM distribution_items
    WHERE pd_id = ${os.pd_id} AND tenant_id = ${os.tenant_id} AND dept = ${os.dept}`;

  const kindOf = (dept: string) =>
    dept === 'internet' ? 'imagem' : dept === 'cobertura' ? 'video' : dept === 'chupim' ? 'texto' : 'audio';

  const criadas: string[] = [];
  for (const it of items) {
    const [ja] = await sql`SELECT id FROM productions WHERE os_id = ${osId} AND piece = ${it.item}`;
    if (ja) continue;
    const code = await nextCode('CP');
    await sql`
      INSERT INTO productions (tenant_id, code, pi_id, os_id, piece, kind, seconds, step, owner, client_status)
      VALUES (${os.tenant_id}, ${code}, ${os.pi_id}, ${osId}, ${it.item}, ${kindOf(String(os.dept))},
              ${it.seconds || 0}, 1, ${session.name}, 'pendente')`;
    criadas.push(code);
  }

  if (criadas.length) {
    await audit(session, `${criadas.length} CP abertos da O.S. ${os.code}`, 'service_order', osId);
    await alerta(session, `${criadas.length} peça(s) entraram em produção — O.S. ${os.code}`, 'Produção');
  }
  return NextResponse.json({ ok: true, criadas, total: criadas.length });
}
