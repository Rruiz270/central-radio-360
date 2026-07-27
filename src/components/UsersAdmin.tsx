'use client';

import { useEffect, useState } from 'react';
import { useToast } from './Toast';
import { Modal } from './Modal';

type U = { id: number; email: string; name: string; role: string; active: boolean; has_2fa: boolean; tenant_name: string; tenant_slug: string };

const ROLES = ['admin', 'comercial', 'programacao', 'jornalismo', 'marketing', 'operacoes', 'afiliada'];

export function UsersAdmin({ tenants, myId }: { tenants: { slug: string; name: string }[]; myId: number }) {
  const toast = useToast();
  const [users, setUsers] = useState<U[]>([]);
  const [openNew, setOpenNew] = useState(false);
  const [twoFa, setTwoFa] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState('');
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'afiliada', tenant_slug: tenants[0]?.slug || 'sp' });

  const load = () => fetch('/api/users').then(async (r) => { if (r.ok) setUsers((await r.json()).users); });
  useEffect(() => { load(); }, []);

  async function create() {
    if (!f.name || !f.email || !f.password) { toast('Preencha nome, e-mail e senha.', 'warn'); return; }
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const data = await res.json();
    if (res.ok) { toast(`Usuário ${f.email} criado.`, 'ok'); setOpenNew(false); setF({ ...f, name: '', email: '', password: '' }); load(); }
    else toast(data.error || 'Falha ao criar.', 'warn');
  }

  async function patch(id: number, body: Record<string, unknown>, msg: string) {
    const res = await fetch(`/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { toast(msg, 'ok'); load(); } else toast(data.error || 'Falha.', 'warn');
  }

  function resetPassword(u: U) {
    const p = window.prompt(`Nova senha para ${u.email} (mín. 8 caracteres):`);
    if (p) patch(u.id, { password: p }, 'Senha redefinida.');
  }

  async function start2fa() {
    const r = await fetch('/api/auth/totp');
    if (r.ok) setTwoFa(await r.json());
  }
  async function confirm2fa() {
    const r = await fetch('/api/auth/totp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    const data = await r.json();
    if (r.ok) { toast('2FA ativado na sua conta.', 'ok'); setTwoFa(null); setCode(''); load(); }
    else toast(data.error || 'Código inválido.', 'warn');
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className="btn p sm" onClick={() => setOpenNew(true)} data-testid="new-user">+ Novo usuário</button>
        <button className="btn sm" onClick={start2fa} data-testid="setup-2fa">Ativar 2FA na minha conta</button>
      </div>
      <table>
        <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Praça</th><th>2FA</th><th>Ativo</th><th /></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={u.active ? undefined : { opacity: 0.5 }}>
              <td className="b">{u.name}</td>
              <td>{u.email}</td>
              <td><span className="chip c-blue">{u.role}</span></td>
              <td>{u.tenant_name}</td>
              <td>{u.has_2fa ? <span className="chip c-green">ativo</span> : <span className="chip c-gray">—</span>}</td>
              <td>
                <span
                  className={`sw ${u.active ? 'on' : ''}`}
                  role="switch" aria-checked={u.active}
                  onClick={() => u.id !== myId && patch(u.id, { active: !u.active }, u.active ? 'Usuário desativado.' : 'Usuário reativado.')}
                  style={u.id === myId ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                />
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn sm" onClick={() => resetPassword(u)}>Redefinir senha</button>
                {u.has_2fa && <button className="btn sm" style={{ marginLeft: 6 }} onClick={() => patch(u.id, { reset_2fa: true }, '2FA removido.')}>Zerar 2FA</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {openNew && (
        <Modal title="Novo usuário" onClose={() => setOpenNew(false)}>
          <div className="form">
            <div className="field"><label>Nome</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="field"><label>E-mail</label><input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div className="field"><label>Senha (mín. 8)</label><input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
            <div className="field"><label>Perfil</label>
              <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
            </div>
            <div className="field"><label>Praça</label>
              <select value={f.tenant_slug} onChange={(e) => setF({ ...f, tenant_slug: e.target.value })}>
                {tenants.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button className="btn p" onClick={create} data-testid="create-user">Criar usuário</button>
            <button className="btn" onClick={() => setOpenNew(false)}>Cancelar</button>
          </div>
        </Modal>
      )}

      {twoFa && (
        <Modal title="Ativar 2FA (app autenticador)" onClose={() => setTwoFa(null)}>
          <p className="tiny muted" style={{ marginTop: 0 }}>
            No Google Authenticator / Authy: adicionar conta → inserir chave manualmente, ou abra o link no celular.
          </p>
          <div className="field"><label>Chave secreta</label><input readOnly value={twoFa.secret} onFocus={(e) => e.target.select()} /></div>
          <div className="field" style={{ marginTop: 10 }}><label>Link otpauth (abrir no celular)</label><input readOnly value={twoFa.uri} onFocus={(e) => e.target.select()} /></div>
          <div className="field" style={{ marginTop: 10 }}><label>Código de 6 dígitos do app</label>
            <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button className="btn p" onClick={confirm2fa}>Confirmar e ativar</button>
            <button className="btn" onClick={() => setTwoFa(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
