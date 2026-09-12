'use client';

import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {type ReactNode,useEffect,useRef,useState} from 'react';
import {useI18n} from '@/lib/i18n';
import {createClient} from '@/lib/supabase/client';
import ThemeToggle from './theme-toggle';

const items = [
  {href: '/admin', key: 'homeNav', icon: 'home'},
  {href: '/admin/clients', key: 'clientsLink', icon: 'people'},
  {href: '/admin/knowledge', key: 'knowledgeNav', icon: 'book'},
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
  const router=useRouter();
  const {t, locale, setLocale, dir} = useI18n();
  const [collapsed,setCollapsed]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false),[profile,setProfile]=useState<{businessName:string;role:string}|null>(null),menuRef=useRef<HTMLDivElement>(null);
  useEffect(()=>setCollapsed(localStorage.getItem('leya-sidebar-collapsed')==='true'),[]);
  useEffect(()=>{void fetch('/api/profile',{cache:'no-store'}).then(response=>response.ok?response.json():null).then(setProfile).catch(()=>undefined)},[]);
  useEffect(()=>{const{data:{subscription}}=createClient().auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||!session){router.replace('/login?error=session_expired');router.refresh()}});return()=>subscription.unsubscribe()},[router]);
  useEffect(()=>{if(!menuOpen)return;const close=(event:MouseEvent)=>{if(!menuRef.current?.contains(event.target as Node))setMenuOpen(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[menuOpen]);
  async function logout(){await fetch('/api/auth/logout',{method:'POST'}).catch(()=>undefined);router.replace('/login');router.refresh()}
  const toggleCollapsed=()=>setCollapsed(value=>{const next=!value;localStorage.setItem('leya-sidebar-collapsed',String(next));return next});
  const isActive = (href: string) => href === '/admin' ? pathname === '/admin' : href.includes('#') ? false : pathname.startsWith(href);
  return <div className={`app-shell ${collapsed?'sidebar-collapsed':''}`}>
    <aside className="side-nav">
      <div className="side-brand"><Link href="/admin" className="brand" aria-label="Leya"><span className="brand-mark">L</span><span className="collapsible-label">Leya</span></Link><button type="button" className="collapse-button" onClick={toggleCollapsed} aria-label={collapsed?t('expandNavigation'):t('collapseNavigation')} title={collapsed?t('expandNavigation'):t('collapseNavigation')}><span aria-hidden="true" className="direction-icon">{collapsed?'›':'‹'}</span></button></div>
      <nav className="nav-list" aria-label={t('mainNav')}>
        {items.map(item => {
          const active = isActive(item.href);
          return <Link key={item.href} href={item.href} title={collapsed?t(item.key):undefined} className={`nav-item ${active ? 'active' : ''}`}><Icon name={item.icon}/><span className="collapsible-label">{t(item.key)}</span></Link>;
        })}
      </nav>
      <div className="side-controls"><div className="expanded-controls"><ThemeToggle/><select aria-label={t('cabinetLanguage')} value={locale} onChange={e=>setLocale(e.target.value as 'ru'|'he'|'en')}><option value="ru">RU</option><option value="he">עב</option><option value="en">EN</option></select></div><div className="collapsed-controls"><ThemeToggle compact/><button type="button" className="compact-control" title={t('cabinetLanguage')} aria-label={t('cabinetLanguage')} onClick={()=>setLocale(locale==='ru'?'en':locale==='en'?'he':'ru')}>{locale.toUpperCase()}</button></div></div><div className="user-menu-wrap" ref={menuRef}>{menuOpen?<div className="user-menu" role="menu"><Link href="/admin/profile" role="menuitem" onClick={()=>setMenuOpen(false)}>{t('profileMenu')}</Link><button type="button" role="menuitem" onClick={()=>void logout()}>{t('logout')}</button></div>:null}<button type="button" className="side-foot" aria-haspopup="menu" aria-expanded={menuOpen} aria-label={t('userMenu')} onClick={()=>setMenuOpen(value=>!value)}>
        <div className="avatar" aria-hidden="true">{(profile?.businessName||'L').slice(0,1).toUpperCase()}</div><div className="collapsible-label"><strong>{profile?.businessName||t('businessName')}</strong><small>{profile?t(`role_${profile.role}`):t('ownerRole')}</small></div>
      </button></div>
    </aside>
    <div className="app-main">
      <header className="mobile-head"><Link href="/admin" className="brand"><span className="brand-mark">L</span><span>Leya</span></Link><div className="header-controls"><ThemeToggle/><select aria-label={t('cabinetLanguage')} value={locale} onChange={e=>setLocale(e.target.value as 'ru'|'he'|'en')}><option value="ru">RU</option><option value="he">עב</option><option value="en">EN</option></select><div className="user-menu-wrap mobile-user-menu">{menuOpen?<div className="user-menu" role="menu"><Link href="/admin/profile" role="menuitem" onClick={()=>setMenuOpen(false)}>{t('profileMenu')}</Link><button type="button" role="menuitem" onClick={()=>void logout()}>{t('logout')}</button></div>:null}<button type="button" className="avatar profile-shortcut" aria-label={t('userMenu')} aria-haspopup="menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(value=>!value)}>{(profile?.businessName||'L').slice(0,1).toUpperCase()}</button></div></div></header>
      {children}
    </div>
    <nav className="bottom-nav" aria-label={t('mainNav')}>{items.map(item => {const active=isActive(item.href);return <Link key={item.href} href={item.href} className={active?'active':''}><Icon name={item.icon}/><span>{t(item.key)}</span></Link>})}</nav>
  </div>;
}
