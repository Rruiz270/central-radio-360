import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireApi } from '@/lib/guard';

export async function POST(req: NextRequest) {
  const session = await requireApi('estoque');
  if (!session) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: 'nome obrigatório' }, { status: 400 });
  const kindMap: Record<string, string> = { 'Caixa de som': 'caixa', 'Veículo': 'veiculo', 'Pendrive': 'pendrive', 'Outro': 'outro' };
  const statusMap: Record<string, string> = { 'Disponível': 'disponivel', 'Em campo': 'em campo', 'Manutenção': 'manutencao', 'Crítico': 'critico' };
  const rows = await sql`
    INSERT INTO equipment (tenant_id, kind, name, status, qty, note)
    VALUES (${session.tenantId}, ${kindMap[b.kind] || b.kind || 'outro'}, ${b.name},
            ${statusMap[b.status] || b.status || 'disponivel'}, ${parseInt(b.qty, 10) || 1}, ${b.note || null})
    RETURNING *`;
  return NextResponse.json({ ok: true, equipment: rows[0] });
}
