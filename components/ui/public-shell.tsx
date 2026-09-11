'use client';
import type {ReactNode} from 'react';
import {useI18n,type Locale} from '@/lib/i18n';
import ThemeToggle from './theme-toggle';

export default function PublicShell({children}:{children:ReactNode}){
  const {t,locale,setLocale}=useI18n();
  return <main className="public-page">
    <header className="public-head"><a className="brand" href="/login"><span className="brand-mark">L</span><span>Leya</span></a><div className="header-controls"><ThemeToggle/><select aria-label={t('cabinetLanguage')} value={locale} onChange={event=>setLocale(event.target.value as Locale)}><option value="ru">RU</option><option value="he">עב</option><option value="en">EN</option></select></div></header>
    <section className="public-card">{children}</section>
  </main>;
}
