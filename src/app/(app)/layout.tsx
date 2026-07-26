import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { ACCESS, NAV, ROLE_LABEL } from '@/lib/rbac';
import { NavLink } from '@/components/NavLink';
import { Topbar } from '@/components/Topbar';
import { ToastProvider } from '@/components/Toast';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const allowed = ACCESS[session.role];
  const nav = NAV.map((g) => ({
    ...g,
    items: g.items.filter((it) => allowed === 'all' || allowed.includes(it.key)),
  })).filter((g) => g.items.length > 0);

  return (
    <ToastProvider>
      <div className="app">
        <aside className="side">
          <div className="brand">
            <span className="memblem">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" width={34} height={34} alt="Metropolitana" />
            </span>
            <div className="txt">
              <div className="nome">Central 360</div>
              <div className="sub">Metropolitana</div>
            </div>
          </div>
          <div className="cliente">
            <span className="memblem">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" width={26} height={26} alt="" />
            </span>
            <div>
              <b>{session.tenantName}</b>
              <span>Rádio + Agência · {session.tenantName.includes('Matriz') ? '98.5 FM' : 'afiliada'}</span>
            </div>
          </div>
          <nav className="nav">
            {nav.map((g) => (
              <div key={g.grp}>
                <div className={`grp ${g.cls}`}>{g.grp}</div>
                {g.items.map((it) => (
                  <NavLink key={it.key} href={it.href} icon={it.key} label={it.label} pill={it.pill} />
                ))}
              </div>
            ))}
          </nav>
          <div className="foot">v1.0 · marca Metropolitana · by i10</div>
        </aside>
        <div className="main">
          <Topbar userName={session.name} roleLabel={ROLE_LABEL[session.role]} />
          <div className="wrap">{children}</div>
        </div>
      </div>
    </ToastProvider>
  );
}
