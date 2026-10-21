'use client';
import Link from 'next/link';
import {useI18n} from '@/lib/i18n';
import type {WhatsAppCardState} from '@/lib/tenant/labels';

/**
 * Z8 «Главная»: one full-width card, two columns (one on phones) — status and text, then the business number and
 * where questions and requests go. Three states; the same minimum height in each, and a placeholder of that
 * height while loading. Connecting and disconnecting happen in «Настройки → WhatsApp».
 */
export default function WhatsAppHomeCard({state,businessPhone,ownerPhone}:{state:WhatsAppCardState;businessPhone:string|null;ownerPhone:string}){
 const{t}=useI18n();
 // A phone number inside a ru/he sentence keeps its own (ltr) direction.
 const withNumber=(key:string,phone:string)=>{const[before,after]=t(key,{phone:'\u2063'}).split('\u2063');return <>{before}<bdi dir="ltr">{phone}</bdi>{after}</>;};
 if(state==='loading')return <section className="wa-card skeleton-card" aria-busy="true" aria-label={t('loading')}/>;
 const copy={
  connected:{title:t('waConnectedTitle'),text:businessPhone?withNumber('waConnectedText',businessPhone):t('waConnectedTextNoPhone'),action:null},
  not_connected:{title:t('waNotConnectedTitle'),text:t('waNotConnectedText'),action:t('waConnectAction')},
  lost:{title:t('waLostTitle'),text:t('waLostText'),action:t('waReconnectAction')},
 }[state];
 return <section className={`wa-card wa-${state}`} aria-labelledby="wa-card-title" role={state==='lost'?'alert':undefined}>
  <div className="wa-card-status"><span className="wa-dot" aria-hidden="true"/><div><h2 id="wa-card-title">{copy.title}</h2><p>{copy.text}</p></div>
   {copy.action?<Link className="button primary wa-card-action" href="/admin/settings?section=whatsapp">{copy.action}</Link>:null}</div>
  <dl className="wa-card-numbers">
   <div><dt>{t('waBusinessNumber')}</dt><dd dir="ltr">{businessPhone??'—'}</dd></div>
   <div><dt className="sr-only">{t('setPhone')}</dt><dd><span>{ownerPhone?withNumber('waOwnerLine',ownerPhone):t('waOwnerMissing')}</span> · <Link href="/admin/settings?section=phone">{ownerPhone?t('waChange'):t('waAdd')}</Link></dd></div>
  </dl>
 </section>;
}
