'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Ic } from './icons';

const TITLES: Record<string, [string, string]> = {
  '/': ['Comando', 'Visão Geral'],
  '/rede': ['Comando', 'Rede & Afiliadas'],
  '/organograma': ['Comando', 'Organograma & Acessos'],
  '/programacao': ['Rádio', 'Programação & Musical'],
  '/jornalismo': ['Rádio', 'Jornalismo & Radar'],
  '/comercial': ['Rádio', 'Comercial & Vendas'],
  '/portal-cliente': ['Rádio', 'Portal do Cliente'],
  '/digital': ['Rádio', 'Digital & Podcast'],
  '/tecnica': ['Rádio', 'Técnica & Engenharia'],
  '/vendas-agencia': ['Agência', 'Vendas & Propostas'],
  '/acoes': ['Agência', 'Ações & Execução'],
  '/planejamento': ['Agência', 'Planejamento & Criação'],
  '/equipamentos': ['Agência', 'Equipamentos & Frota'],
  '/equipe': ['Agência', 'Equipe & Promotores'],
  '/marketing': ['Marketing', 'Central de Marketing'],
  '/monetizacao': ['Marketing', 'Monetização Social'],
  '/ia': ['Inteligência', 'IA & Automação'],
  '/alertas': ['Inteligência', 'Comunicação & Alertas'],
  '/gestao-interna': ['Gestão', 'Gestão Interna'],
  '/financeiro': ['Gestão', 'Financeiro'],
  '/configuracoes': ['Gestão', 'Configurações & Integrações'],
};

export function Topbar({ userName, roleLabel }: { userName: string; roleLabel: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const [crumb, title] = TITLES[pathname] || ['Central 360', 'Central 360'];
  const initials = userName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="top">
      <div>
        <div className="crumb">{crumb}</div>
        <h1 className="disp">{title}</h1>
      </div>
      <div className="search"><input placeholder="Buscar ação, cidade, música, cliente…" /></div>
      <div className="rolesel">Perfil: <b style={{ color: '#8fa8ff', fontFamily: 'var(--disp)', fontSize: 12 }}>{roleLabel}</b></div>
      <div className="clock">
        <b suppressHydrationWarning>{now ? now.toLocaleTimeString('pt-BR') : '--:--:--'}</b>
        <span suppressHydrationWarning>{now ? now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }) : ''}</span>
      </div>
      <div className="bell" title="Notificações"><Ic name="bell" /></div>
      <div className="me" title={userName}>{initials}</div>
      <button className="btn sm" onClick={logout} title="Sair" aria-label="Sair" data-testid="logout">
        <Ic name="logout" size={14} /> Sair
      </button>
    </div>
  );
}
