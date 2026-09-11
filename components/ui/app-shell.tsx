'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {type ReactNode} from 'react';
import {useI18n} from '@/lib/i18n';
import ThemeToggle from './theme-toggle';

const items = [
  {href: '/admin', key: 'homeNav', icon: 'home'},
  {href: '/admin/clients', key: 'clientsLink', icon: 'people'},
  {href: '/admin#knowledge', key: 'knowledgeNav', icon: 'book'},
  {href: '/admin/settings', key: 'settingsNav', icon: 'settings'},
] as const;

function Icon({name}: {name: string}) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9.5 20v-6h5v6"/></>,
    people: <><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z"/><path d="M4 6.5v13M8 8h8M8 12h6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function AppShell({children}: {children: ReactNode}) {
  const pathname = usePathname();
  const {t, locale, setLocale} = useI18n();
  const isActive = (href: string) => href === '/admin' ? pathname === '/admin' : href.includes('#') ? false : pathname.startsWith(href);
  return <div className="app-shell">
    <aside className="side-nav">
      <Link href="/admin" className="brand" aria-label="Leya"><span className="brand-mark">L</span><span>Leya</span></Link>
      <nav className="nav-list" aria-label={t('mainNav')}>
        {items.map(item => {
          const active = isActive(item.href);
          return <Link key={item.href} href={item.href} className={`nav-item ${active ? 'active' : ''}`}><Icon name={item.icon}/><span>{t(item.key)}</span></Link>;
        })}
      </nav>
      <div className="side-controls"><ThemeToggle/><select aria-label={t('cabinetLanguage')} value={locale} onChange={e=>setLocale(e.target.value as 'ru'|'he'|'en')}><option value="ru">RU</option><option value="he">עב</option><option value="en">EN</option></select></div><div className="side-foot">
        <div className="avatar" aria-hidden="true">L</div><div><strong>{t('businessName')}</strong><small>{t('ownerRole')}</small></div>
      </div>
    </aside>
    <div className="app-main">
      <header className="mobile-head"><Link href="/admin" className="brand"><span className="brand-mark">L</span><span>Leya</span></Link><div className="header-controls"><ThemeToggle/><select aria-label={t('cabinetLanguage')} value={locale} onChange={e=>setLocale(e.target.value as 'ru'|'he'|'en')}><option value="ru">RU</option><option value="he">עב</option><option value="en">EN</option></select></div></header>
      {children}
    </div>
    <nav className="bottom-nav" aria-label={t('mainNav')}>{items.map(item => {const active=isActive(item.href);return <Link key={item.href} href={item.href} className={active?'active':''}><Icon name={item.icon}/><span>{t(item.key)}</span></Link>})}</nav>
  </div>;
}
