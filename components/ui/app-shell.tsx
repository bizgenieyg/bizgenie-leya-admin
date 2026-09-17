'use client';

import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {type ReactNode,useEffect,useRef,useState} from 'react';
import {type Locale,useI18n} from '@/lib/i18n';
import {createClient} from '@/lib/supabase/client';
import ThemeToggle from './theme-toggle';

const items = [
  {href: '/admin', key: 'homeNav', icon: 'home'},
  {href: '/admin/clients', key: 'clientsLink', icon: 'people'},
  {href: '/admin/assistant', key: 'assistantNav', icon: 'book'},
  {href: '/admin/settings', key: 'settingsNav', icon: 'settings'},
] as const;
const localeOptions:Array<{value:Locale;label:string}>=[{value:'ru',label:'RU'},{value:'en',label:'EN'},{value:'he',label:'עב'}];

function LanguageSelect({className=''}:{className?:string}){
  const{t,locale,setLocale}=useI18n();
  return <label className={`language-picker ${className}`.trim()} title={t('cabinetLanguage')}><span className="sr-only">{t('cabinetLanguage')}</span><select aria-label={t('cabinetLanguage')} value={locale} onChange={event=>setLocale(event.target.value as Locale)}>{localeOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select><svg aria-hidden="true" viewBox="0 0 20 20"><path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg></label>;
}

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
  const {t} = useI18n();
  const [collapsed,setCollapsed]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false),[logoutError,setLogoutError]=useState(''),[profile,setProfile]=useState<{businessName:string;role:string;email:string}|null>(null),menuRef=useRef<HTMLDivElement>(null);
  useEffect(()=>setCollapsed(localStorage.getItem('leya-sidebar-collapsed')==='true'),[]);
  useEffect(()=>{let active=true;void (async()=>{try{const response=await fetch('/api/profile',{cache:'no-store'});if(response.ok){const value=await response.json();if(active)setProfile(value);return}const supabase=createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)return;const membership=await supabase.from('tenant_users').select('tenant_id,role').eq('user_id',user.id).limit(1).maybeSingle();const tenant=membership.data?await supabase.from('tenants').select('business_name,name').eq('id',membership.data.tenant_id).maybeSingle():null;if(active)setProfile({email:user.email??'',role:String(membership.data?.role??'owner'),businessName:String(tenant?.data?.business_name||tenant?.data?.name||t('businessName'))});}catch{/* The shell remains usable while profile details retry on the next load. */}})();return()=>{active=false}},[t]);
  useEffect(()=>{const{data:{subscription}}=createClient().auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||!session){router.replace('/login?error=session_expired');router.refresh()}});return()=>subscription.unsubscribe()},[router]);
  useEffect(()=>{if(!menuOpen)return;const close=(event:MouseEvent)=>{if(!menuRef.current?.contains(event.target as Node))setMenuOpen(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[menuOpen]);
  async function logout(){setLogoutError('');try{const response=await fetch('/api/auth/logout',{method:'POST'});if(!response.ok){setLogoutError(t('logoutError'));return}router.replace('/login');router.refresh()}catch{setLogoutError(t('logoutError'))}}
  const toggleCollapsed=()=>setCollapsed(value=>{const next=!value;localStorage.setItem('leya-sidebar-collapsed',String(next));return next});
  const isActive = (href: string) => href === '/admin' ? pathname === '/admin' : href.includes('#') ? false : pathname.startsWith(href);
  return <div className={`app-shell ${collapsed?'sidebar-collapsed':''}`}>
    <aside className="side-nav">
      <div className="side-brand"><Link href="/admin" className="brand" aria-label="Leya"><span className="brand-mark">L</span><span className="collapsible-label">Leya</span></Link><button type="button" className="collapse-button" onClick={toggleCollapsed} aria-label={collapsed?t('expandNavigation'):t('collapseNavigation')} title={collapsed?t('expandNavigation'):t('collapseNavigation')}><svg className="collapse-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></button></div>
      <nav className="nav-list" aria-label={t('mainNav')}>
        {items.map(item => {
          const active = isActive(item.href);
          return <Link key={item.href} href={item.href} title={collapsed?t(item.key):undefined} className={`nav-item ${active ? 'active' : ''}`}><Icon name={item.icon}/><span className="collapsible-label">{t(item.key)}</span></Link>;
        })}
      </nav>
      <div className="side-controls"><ThemeToggle/><LanguageSelect/></div><div className="user-menu-wrap" ref={menuRef}>{menuOpen?<div className="user-menu" role="menu"><Link href="/admin/profile" role="menuitem" onClick={()=>setMenuOpen(false)}>{t('profileMenu')}</Link><button type="button" role="menuitem" onClick={()=>void logout()}>{t('logout')}</button>{logoutError?<p role="alert" className="user-menu-error">{logoutError}</p>:null}</div>:null}<button type="button" className="side-foot" aria-haspopup="menu" aria-expanded={menuOpen} aria-label={t('userMenu')} onClick={()=>setMenuOpen(value=>!value)}>
        <div className="avatar" aria-hidden="true">{(profile?.businessName||'L').slice(0,1).toUpperCase()}</div><div className="collapsible-label user-identity"><strong>{profile?.businessName||t('businessName')}</strong><small>{profile?.email||t('ownerRole')}</small></div>
      </button></div>
    </aside>
    <div className="app-main">
      <header className="mobile-head"><Link href="/admin" className="brand"><span className="brand-mark">L</span><span>Leya</span></Link><div className="header-controls"><ThemeToggle/><LanguageSelect className="mobile-language-picker"/><div className="user-menu-wrap mobile-user-menu">{menuOpen?<div className="user-menu" role="menu"><Link href="/admin/profile" role="menuitem" onClick={()=>setMenuOpen(false)}>{t('profileMenu')}</Link><button type="button" role="menuitem" onClick={()=>void logout()}>{t('logout')}</button>{logoutError?<p role="alert" className="user-menu-error">{logoutError}</p>:null}</div>:null}<button type="button" className="avatar profile-shortcut" aria-label={t('userMenu')} aria-haspopup="menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(value=>!value)}>{(profile?.businessName||'L').slice(0,1).toUpperCase()}</button></div></div></header>
      {children}
    </div>
    <nav className="bottom-nav" aria-label={t('mainNav')}>{items.map(item => {const active=isActive(item.href);return <Link key={item.href} href={item.href} className={active?'active':''}><Icon name={item.icon}/><span>{t(item.key)}</span></Link>})}</nav>
  </div>;
}
