import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret');
export const COOKIE = 'c360_session';

export type Session = {
  uid: number;
  email: string;
  name: string;
  role: Role;
  tenantId: number;
  tenantName: string;
};

export type Role =
  | 'admin'
  | 'comercial'
  | 'programacao'
  | 'jornalismo'
  | 'marketing'
  | 'operacoes'
  | 'afiliada'
  | 'cliente';

export async function createSession(payload: Session): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret);
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
