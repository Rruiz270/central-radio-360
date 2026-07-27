'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [need2fa, setNeed2fa] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, totp: totp || undefined }),
    });
    const data = await res.json();
    if (data.need2fa && !data.ok) {
      setNeed2fa(true);
      setErr(res.ok ? '' : data.error || '');
      setBusy(false);
      return;
    }
    if (!res.ok) {
      setErr(data.error || 'Falha no login.');
      setBusy(false);
      return;
    }
    const raw = params.get('next') || '/';
    // Só caminhos relativos same-origin (evita open redirect)
    const next = raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : '/';
    router.push(next);
    router.refresh();
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <span className="memblem" style={{ background: '#fff', borderRadius: 12, padding: '6px 8px', display: 'inline-flex' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" width={40} height={40} alt="Metropolitana" />
        </span>
        <div className="sub" style={{ marginTop: 14 }}>Metropolitana · 98.5</div>
        <h1 className="disp">Central 360</h1>
        <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
          Rádio + Agência + Rede — entre com seu acesso.
        </p>
        <div className="field">
          <label>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@metropolitana.fm"
            autoComplete="username"
            required
          />
        </div>
        <div className="field">
          <label>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>
        {need2fa && (
          <div className="field">
            <label>Código 2FA (app autenticador)</label>
            <input
              inputMode="numeric"
              maxLength={6}
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              placeholder="000000"
              autoFocus
            />
          </div>
        )}
        {err && <div className="login-err">{err}</div>}
        <button className="btn p w100" style={{ marginTop: 18 }} disabled={busy}>
          {busy ? <span className="spinner" /> : 'Entrar'}
        </button>
        <div className="login-hint">
          Perfis de demonstração (senha <code>metro360</code>):<br />
          <code>admin@metropolitana.fm</code> · <code>comercial@…</code> · <code>programacao@…</code> ·{' '}
          <code>jornalismo@…</code> · <code>marketing@…</code> · <code>operacoes@…</code>
          <br />
          Afiliadas (cada uma vê só a sua praça): <code>rio@…</code> · <code>bh@…</code> · <code>recife@…</code> ·{' '}
          <code>fortaleza@…</code> · <code>curitiba@…</code>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
