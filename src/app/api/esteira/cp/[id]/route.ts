import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';
import { canCreate } from '@/lib/esteira';
import { audit, alerta } from '@/lib/esteira-server';

const STEPS = ['Briefing', 'Roteiro', 'Gravação', 'Aprovação', 'Liberada'];

/* Avança a peça no fluxo de produção e registra a resposta do cliente.
   A etapa 5 (Liberada) só abre com aprovação do cliente — a mesma regra do Portal. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi();
  if (!session) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  if (!canCreate(session.role, 'CP')) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });

  const { id } = await params;
  const cpId = Number(id);
  const [cp] = await sql`SELECT * FROM productions WHERE id = ${cpId}`;
  if (!cp) return NextResponse.json({ error: 'ficha não encontrada' }, { status: 404 });

  const b = await req.json();

  if (b.step != null) {
    const step = Math.max(1, Math.min(5, Number(b.step)));
    if (step === 5 && cp.client_status !== 'aprovado')
      return NextResponse.json({ error: 'peça sem aprovação do cliente não vai para o ar' }, { status: 409 });
    await sql`UPDATE productions SET step = ${step}, updated_at = now() WHERE id = ${cpId}`;
    await audit(session, `CP ${cp.code} → ${STEPS[step - 1]}`, 'production', cpId);
    if (step === 4)
      await alerta(session, `Peça "${cp.piece}" aguardando aprovação do cliente (${cp.code})`, 'Comercial');
  }

  if (b.client_status) {
    await sql`UPDATE productions SET client_status = ${b.client_status}, updated_at = now() WHERE id = ${cpId}`;
    if (b.client_status === 'aprovado')
      await alerta(session, `Cliente aprovou "${cp.piece}" — liberada para o ar`, 'Produção');
    if (b.client_status === 'ajuste')
      await alerta(session, `Cliente pediu ajuste em "${cp.piece}"`, 'Produção');
    await audit(session, `CP ${cp.code} cliente: ${b.client_status}`, 'production', cpId);
  }

  if (b.fields) {
    await sql`
      UPDATE productions SET
        owner = COALESCE(${b.fields.owner ?? null}, owner),
        due = COALESCE(${b.fields.due || null}, due),
        script = COALESCE(${b.fields.script ?? null}, script),
        updated_at = now()
      WHERE id = ${cpId}`;
  }

  const [fresh] = await sql`SELECT * FROM productions WHERE id = ${cpId}`;
  return NextResponse.json({ ok: true, cp: fresh });
}
