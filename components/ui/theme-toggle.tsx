'use client';
import {useI18n} from '@/lib/i18n';
import {useTheme,type ThemeChoice} from '@/lib/theme';
const order:ThemeChoice[]=['system','light','dark'];
export default function ThemeToggle(){const{t}=useI18n(),{theme,setTheme}=useTheme(),label=theme==='light'?t('themeLight'):theme==='dark'?t('themeDark'):t('themeSystem');return <button type="button" className="compact-control theme-control" aria-label={`${t('themeLabel')}: ${label}`} title={`${t('themeLabel')}: ${label}`} onClick={()=>setTheme(order[(order.indexOf(theme)+1)%order.length]!)}><span aria-hidden="true">{theme==='light'?'☀':theme==='dark'?'☾':'◐'}</span></button>}
