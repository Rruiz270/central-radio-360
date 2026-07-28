'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Ic } from './icons';

export function NavLink({ href, icon, label, pill, exact }: { href: string; icon: string; label: string; pill?: string; exact?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const on = href === '/' || exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
  return (
    <a className={on ? 'on' : ''} onClick={() => router.push(href)} data-nav={href}>
      <span className="ic"><Ic name={icon} /></span> {label}
      {pill && <span className="pill">{pill}</span>}
    </a>
  );
}
