import type { Metadata } from 'next';

import './globals.css';
import {I18nProvider} from '@/lib/i18n';
import {ThemeProvider} from '@/lib/theme';
import {Manrope,Noto_Sans_Hebrew,IBM_Plex_Mono} from 'next/font/google';

const manrope=Manrope({subsets:['latin','cyrillic'],variable:'--font-sans',display:'swap'});
const hebrew=Noto_Sans_Hebrew({subsets:['hebrew'],variable:'--font-hebrew',display:'swap'});
const mono=IBM_Plex_Mono({subsets:['latin','cyrillic'],weight:['400','500','600'],variable:'--font-mono',display:'swap'});

export const metadata: Metadata = {
  title: 'Leya — ваш помощник в WhatsApp',
  description: 'Личный кабинет Leya для малого бизнеса',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:"try{const t=localStorage.getItem('leya-theme')||'system';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}catch{}"}}/></head>
      <body className={`${manrope.variable} ${hebrew.variable} ${mono.variable}`}><ThemeProvider><I18nProvider>{children}</I18nProvider></ThemeProvider></body>
    </html>
  );
}
