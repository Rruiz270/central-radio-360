/* Ícones SVG limpos (traço 1.7, herdando currentColor) — sem emoji em UI de produto */
const P: Record<string, React.ReactNode> = {
  dash: <><rect x="2" y="2" width="6" height="6" rx="1.5" /><rect x="10" y="2" width="6" height="6" rx="1.5" /><rect x="2" y="10" width="6" height="6" rx="1.5" /><rect x="10" y="10" width="6" height="6" rx="1.5" /></>,
  rede: <><circle cx="9" cy="9" r="2.2" /><circle cx="3.5" cy="4" r="1.6" /><circle cx="14.5" cy="4" r="1.6" /><circle cx="3.5" cy="14" r="1.6" /><circle cx="14.5" cy="14" r="1.6" /><path d="M5 5.2 7.4 7.6M13 5.2 10.6 7.6M5 12.8 7.4 10.4M13 12.8 10.6 10.4" /></>,
  org: <><rect x="6" y="2" width="6" height="4" rx="1" /><rect x="1.5" y="12" width="6" height="4" rx="1" /><rect x="10.5" y="12" width="6" height="4" rx="1" /><path d="M9 6v3M9 9H4.5v3M9 9h4.5v3" /></>,
  prog: <><circle cx="6" cy="12.5" r="2.5" /><path d="M8.5 12.5V4l7-1.5V11" /><circle cx="13" cy="11" r="2.5" /></>,
  jornalismo: <><rect x="2" y="3" width="11" height="12" rx="1.5" /><path d="M13 6h2.5a1 1 0 0 1 1 1v7a1.5 1.5 0 0 1-1.5 1.5H4" /><path d="M4.8 6.5h5.4M4.8 9.5h5.4M4.8 12h3.4" /></>,
  comercial: <><path d="M2 16h14" /><path d="M4 16V9.5M8 16V5M12 16V7.5M16 16V3.5" /></>,
  cliente: <><circle cx="9" cy="6" r="3" /><path d="M3 16c0-3 2.7-4.8 6-4.8s6 1.8 6 4.8" /></>,
  digital: <><rect x="2" y="3" width="14" height="9.5" rx="1.5" /><path d="M6.5 16h5M9 12.5V16" /><path d="M7.2 6.2 10.8 8 7.2 9.8Z" /></>,
  tecnica: <><circle cx="9" cy="9" r="2.3" /><path d="M9 2v2.2M9 13.8V16M2 9h2.2M13.8 9H16M4.1 4.1l1.5 1.5M12.4 12.4l1.5 1.5M13.9 4.1l-1.5 1.5M5.6 12.4l-1.5 1.5" /></>,
  acoes: <><rect x="1.8" y="6" width="10" height="7" rx="1.2" /><path d="M11.8 8h3l1.4 2.4V13h-4.4" /><circle cx="5" cy="14.5" r="1.6" /><circle cx="13.5" cy="14.5" r="1.6" /><path d="M4 3.5h6" /></>,
  planejamento: <><circle cx="9" cy="9" r="7" /><circle cx="9" cy="9" r="4" /><circle cx="9" cy="9" r="1.2" /></>,
  estoque: <><path d="M2 5.5 9 2l7 3.5v7L9 16l-7-3.5Z" /><path d="M2 5.5 9 9l7-3.5M9 9v7" /></>,
  equipe: <><circle cx="6" cy="6.5" r="2.4" /><circle cx="12.5" cy="7.5" r="2" /><path d="M1.8 15c0-2.5 1.9-4 4.2-4s4.2 1.5 4.2 4M10.8 14.5c.3-1.9 1.7-3 3.4-3 1.4 0 2.6.7 3.2 2" /></>,
  marketing: <><path d="M2 8v3l3 .5V16h2v-4l1.5.3L15 15V4L7 6.5 2 8Z" /><path d="M15 7.5a2.5 2.5 0 0 1 0 4" /></>,
  monetizacao: <><circle cx="9" cy="9" r="7" /><path d="M9 5v8M11.3 6.5c-.5-.8-1.3-1.2-2.3-1.2-1.2 0-2.2.7-2.2 1.8 0 2.4 4.8 1.3 4.8 3.7 0 1.1-1 1.9-2.4 1.9-1.1 0-2-.5-2.5-1.3" /></>,
  ia: <><rect x="3" y="5" width="12" height="9" rx="2" /><circle cx="6.8" cy="9.5" r="1" /><circle cx="11.2" cy="9.5" r="1" /><path d="M9 2.5V5M9 2.5a1 1 0 1 0-.1 0M6 16h6" /></>,
  alertas: <><path d="M9 2.5a4.6 4.6 0 0 1 4.6 4.6c0 3.4 1 4.4 1.6 5H2.8c.6-.6 1.6-1.6 1.6-5A4.6 4.6 0 0 1 9 2.5Z" /><path d="M7.3 14.8a1.8 1.8 0 0 0 3.4 0" /></>,
  casa: <><path d="M2.5 8.5 9 2.8l6.5 5.7" /><path d="M4.2 7.5V15h9.6V7.5" /><path d="M7.3 15v-4h3.4v4" /></>,
  financeiro: <><rect x="2" y="4" width="14" height="10" rx="1.8" /><path d="M2 7.5h14" /><path d="M4.5 11.5h4" /></>,
  config: <><circle cx="9" cy="9" r="2.2" /><path d="M14.7 9c0-.5.6-1.1.5-1.6-.2-.5-1-.5-1.3-1s0-1.2-.4-1.6-1.1 0-1.6-.3-.5-1.1-1-1.3c-.5-.1-1 .5-1.6.5S8 3 7.4 3.2c-.5.2-.5 1-1 1.3s-1.2 0-1.6.4 0 1.1-.3 1.6-1.1.5-1.3 1c-.1.5.5 1 .5 1.5s-.6 1.1-.5 1.6c.2.5 1 .5 1.3 1s0 1.2.4 1.6 1.1 0 1.6.3.5 1.1 1 1.3c.5.1 1-.5 1.6-.5s1.1.7 1.7.5c.5-.2.5-1 1-1.3s1.2 0 1.6-.4 0-1.1.3-1.6 1.1-.5 1.3-1c.1-.5-.5-1-.5-1.5Z" /></>,
  logout: <><path d="M7 2.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 15.5h3" /><path d="M12 12.5 15.5 9 12 5.5M15.5 9H7" /></>,
  bell: <><path d="M9 2.5a4.6 4.6 0 0 1 4.6 4.6c0 3.4 1 4.4 1.6 5H2.8c.6-.6 1.6-1.6 1.6-5A4.6 4.6 0 0 1 9 2.5Z" /><path d="M7.3 14.8a1.8 1.8 0 0 0 3.4 0" /></>,
};

export function Ic({ name, size = 17 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {P[name] || P.dash}
    </svg>
  );
}
