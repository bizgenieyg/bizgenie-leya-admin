'use client';
import {useI18n} from '@/lib/i18n';
import {useTheme,type ThemeChoice} from '@/lib/theme';
export default function ThemeToggle(){const{t}=useI18n(),{theme,setTheme}=useTheme();return <label className="compact-select"><span className="sr-only">{t('themeLabel')}</span><select aria-label={t('themeLabel')} value={theme} onChange={e=>setTheme(e.target.value as ThemeChoice)}><option value="system">{t('themeSystem')}</option><option value="light">{t('themeLight')}</option><option value="dark">{t('themeDark')}</option></select></label>}
