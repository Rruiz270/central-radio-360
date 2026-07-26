'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Ic } from './icons';

export function NavLink({ href, icon, label, pill }: { href: string; icon: string; label: string; pill?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const on = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <a className={on ? 'on' : ''} onClick={() => router.push(href)} data-nav={href}>
      <span className="ic"><Ic name={icon} /></span> {label}
      {pill && <span className="pill">{pill}</span>}
    </a>
  );
}
