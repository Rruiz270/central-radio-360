import { redirect } from 'next/navigation';
import { getSession, type Session } from './auth';
import { canAccess, type ModuleKey } from './rbac';

/* Guarda de página: sessão obrigatória + módulo permitido pro perfil */
export async function requireModule(mod: ModuleKey): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess(session.role, mod)) redirect('/');
  return session;
}

export async function requireApi(mod?: ModuleKey): Promise<Session | null> {
  const session = await getSession();
  if (!session) return null;
  if (mod && !canAccess(session.role, mod)) return null;
  return session;
}
