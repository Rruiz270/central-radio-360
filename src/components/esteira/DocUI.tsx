/* Blocos presentacionais da esteira (server-safe). */
import Link from 'next/link';
import { CHAIN, DOC, type DocKind } from '@/lib/esteira';

export function DocHead({ kind, title, sub, right, children }: {
  kind: DocKind; title: string; sub?: React.ReactNode; right?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <div className="dh">
      <div className={`sig ${DOC[kind].tone}`}>{kind}</div>
      <div>
        <h3 className="disp">{title}</h3>
        {sub && <div className="sb">{sub}</div>}
      </div>
      {right && <div className="rt">{right}</div>}
      {children}
    </div>
  );
}

export function HG({ label, value, em }: { label: string; value?: React.ReactNode; em?: boolean }) {
  return (
    <div className="hg">
      <div className="l">{label}</div>
      <div className={`v ${em || !value ? 'em' : ''}`}>{value || '—'}</div>
    </div>
  );
}

/* Trilha PO→PI→PD→OS→CP→PV com links reais para cada documento existente. */
export function Chain({ step, blocked, links, sm }: {
  step: number; blocked?: string | null; links?: Partial<Record<DocKind, string>>; sm?: boolean;
}) {
  return (
    <span className={`chain ${sm ? 'sm' : ''}`}>
      {CHAIN.map((k, i) => {
        const n = i + 1;
        const cls = n < step ? 'done' : n === step ? (blocked ? 'block' : 'now') : '';
        const href = links?.[k];
        return href ? (
          <Link key={k} href={href} className={`ch link ${cls}`} title={DOC[k].full}>{k}</Link>
        ) : (
          <span key={k} className={`ch ${cls}`} title={DOC[k].full}>{k}</span>
        );
      })}
    </span>
  );
}

export function Saldo({ label, bought, used, unit }: {
  label: string; bought: number; used: number; unit: string;
}) {
  const left = bought - used;
  const pct = bought ? used / bought : 0;
  const tone = bought === 0 ? '' : pct >= 0.9 ? 'ok' : pct >= 0.5 ? 'warn' : 'bad';
  return (
    <div className={`sal ${tone}`}>
      <div className="t">{label}</div>
      <div className="ln"><span>Saldo comprado</span><b className="b">{bought} {unit}</b></div>
      <div className="ln"><span>Agendado / utilizado</span><b className="b">{used} {unit}</b></div>
      <div className="ln f"><span>Saldo final</span><span>{left} {unit}</span></div>
    </div>
  );
}

export function DocFoot({ children }: { children: React.ReactNode }) {
  return <div className="df">{children}</div>;
}
