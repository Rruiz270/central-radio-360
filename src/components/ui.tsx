/* Blocos presentacionais do design system (server-safe) */

export function Kpi({ label, value, delta, tone, deltaTone }: {
  label: string; value: string; delta?: string;
  tone?: 'y' | 'r' | 'b2'; deltaTone?: 'up' | 'down' | 'flat';
}) {
  return (
    <div className={`card kpi ${tone || ''}`}>
      <div className="lab">{label}</div>
      <div className="val">{value}</div>
      {delta && <div className={`delta ${deltaTone || 'flat'}`}>{delta}</div>}
    </div>
  );
}

export function SecTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="sec-title">
      <h2 className="disp">{children}</h2>
      <div className="ln" />
      {right}
    </div>
  );
}

export function Card({ title, tag, right, children, pad0, style }: {
  title?: React.ReactNode; tag?: string; right?: React.ReactNode;
  children: React.ReactNode; pad0?: boolean; style?: React.CSSProperties;
}) {
  return (
    <div className="card" style={style}>
      {title && (
        <div className="hd">
          <h3 className="disp">{title}</h3>
          {tag && <span className="tag">{tag}</span>}
          {right}
        </div>
      )}
      <div className="bd" style={pad0 ? { padding: 0 } : undefined}>{children}</div>
    </div>
  );
}

export function Chip({ tone = 'gray', children }: { tone?: string; children: React.ReactNode }) {
  return <span className={`chip c-${tone}`}>{children}</span>;
}

export function Bar({ pct, yellow, red, width }: { pct: number; yellow?: boolean; red?: boolean; width?: number }) {
  return (
    <div className={`bar ${yellow ? 'y' : ''}`} style={width ? { width } : undefined}>
      <i style={{ width: `${Math.min(100, Math.max(0, pct))}%`, ...(red ? { background: 'var(--mred)' } : {}) }} />
    </div>
  );
}

export function BarRow({ label, value, pct, red }: { label: string; value: string; pct: number; red?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="tiny muted" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span><span className="b">{value}</span>
      </div>
      <Bar pct={pct} red={red} />
    </div>
  );
}

export function Hint({ tone, children, style }: { tone?: 'y' | 'r'; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className={`hint ${tone || ''}`} style={style}>{children}</div>;
}

export function Mini({ items }: { items: { v: string; l: string }[] }) {
  return (
    <div className="mini" style={{ marginTop: 0 }}>
      {items.map((it) => (
        <div key={it.l}><div className="v">{it.v}</div><div className="l">{it.l}</div></div>
      ))}
    </div>
  );
}

export function ListLi({ icoTone, ico, title, sub, right }: {
  icoTone: string; ico: string; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <div className="list-li">
      <div className={`ico c-${icoTone}`}>{ico}</div>
      <div style={{ flex: 1 }}>
        <b>{title}</b>
        {sub && <div className="tiny muted">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function WaBadge({ children = 'entregue' }: { children?: React.ReactNode }) {
  return <span className="wa"><span className="wd" />{children}</span>;
}

export function AiTag({ children = 'IA' }: { children?: React.ReactNode }) {
  return <span className="aitag">{children}</span>;
}

export function WoTag() {
  return <span className="wotag" title="prática do WideOrbit Traffic">WO</span>;
}

export function fmtBRL(v: number | string): string {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (n >= 1000) return `R$ ${Math.round(n / 1000)}k`;
  return `R$ ${n.toLocaleString('pt-BR')}`;
}
