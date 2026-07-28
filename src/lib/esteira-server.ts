import { sql } from './db';
import type { Session } from './auth';

/* Trilha de auditoria + gatilho de alerta — mesmo padrão já usado em /api/deals. */
export async function audit(session: Session, action: string, entity: string, entityId: string | number) {
  await sql`INSERT INTO audit_log (user_email, action, entity, entity_id)
            VALUES (${session.email}, ${action}, ${entity}, ${String(entityId)})`;
}

export async function alerta(session: Session, title: string, group: string) {
  await sql`INSERT INTO alert_log (tenant_id, title, wa_group, status)
            VALUES (${session.tenantId}, ${title}, ${group}, 'entregue')`;
}

/* Escopo de leitura: a matriz vê a rede inteira, a afiliada vê só a sua praça. */
export function scopeTenants(session: Session): number[] | null {
  return session.role === 'afiliada' ? [session.tenantId] : null;
}

/* Sequência atômica por tipo e ano — vale para toda a rede (o sistema é nacional).
   Fica no servidor porque toca o banco; o domínio puro em esteira.ts é importável pelo cliente. */
export async function nextCode(kind: string, year = new Date().getFullYear()): Promise<string> {
  const rows = await sql`
    INSERT INTO doc_counters (kind, year, seq) VALUES (${kind}, ${year}, 1)
    ON CONFLICT (kind, year) DO UPDATE SET seq = doc_counters.seq + 1
    RETURNING seq`;
  return `${kind}-${year}-${String(rows[0].seq).padStart(4, '0')}`;
}
