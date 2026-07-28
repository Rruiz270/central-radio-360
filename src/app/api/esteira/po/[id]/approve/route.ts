import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { canSignPO, PO_AREAS } from '@/lib/esteira';
import { audit, alerta } from '@/lib/esteira-server';

/* Assinatura de uma das 4 áreas da planilha orçamentária.
   Só o perfil dono da área (ou admin) consegue assinar — é o controle que a planilha nunca teve. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });

  const { id } = await params;
  const poId = Number(id);
  const { area, approved } = await req.json();

  if (!PO_AREAS.some((a) => a.key === area))
    return NextResponse.json({ error: 'área inválida' }, { status: 400 });
  if (!canSignPO(session.role, area))
    return NextResponse.json({ error: `assinatura de ${area} é de outro perfil` }, { status: 403 });

  await sql`
    UPDATE po_approvals
    SET approved = ${!!approved},
        approved_by = ${approved ? session.name : null},
        approved_at = ${approved ? new Date() : null}
    WHERE po_id = ${poId} AND area = ${area}`;

  const rows = await sql`SELECT area, approved, approved_by, approved_at FROM po_approvals WHERE po_id = ${poId}`;
  const pending = rows.filter((r) => !r.approved).length;

  /* Todas as áreas assinaram → o PO fecha e libera a emissão da P.I. */
  if (pending === 0) {
    await sql`UPDATE purchase_orders SET status = 'fechada', updated_at = now() WHERE id = ${poId} AND status = 'aberta'`;
    const [po] = await sql`SELECT code, client FROM purchase_orders WHERE id = ${poId}`;
    await alerta(session, `${po.code} aprovado nas 4 áreas — liberado para emitir P.I. (${po.client})`, 'Comercial');
  }

  await audit(session, `PO ${area} ${approved ? 'aprovado' : 'revogado'}`, 'purchase_order', poId);
  return NextResponse.json({ ok: true, approvals: rows, pending });
}
