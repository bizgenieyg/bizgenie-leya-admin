'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useI18n} from '@/lib/i18n';
import {Button,ConfirmDialog} from '@/components/ui/primitives';
import type {WhatsAppCardState} from '@/lib/tenant/labels';

/**
 * Z8 «Главная»: one full-width card, two columns (one on phones) — status and text, then the business number and
 * where questions and requests go. Three states; the same minimum height in each, and a placeholder of that
 * height while loading. Connecting and disconnecting happen in «Настройки → WhatsApp».
 * Z8.1: client replies are part of the card — a bottom strip «Ответы клиентам: включены» with «Остановить все ответы»
 * (confirmed first); when stopped, the whole card is amber: «Ответы остановлены» and the filled «Включить ответы».
 */
export default function WhatsAppHomeCard({state,businessPhone,ownerPhone,paused,busy=false,onStop,onResume}:{state:WhatsAppCardState;businessPhone:string|null;ownerPhone:string;paused?:boolean;busy?:boolean;onStop?:()=>void;onResume?:()=>void}){
 const{t}=useI18n();
 const[confirm,setConfirm]=useState(false);
 // A phone number inside a ru/he sentence keeps its own (ltr) direction.
 const withNumber=(key:string,phone:string)=>{const[before,after]=t(key,{phone:'⁣'}).split('⁣');return <>{before}<bdi dir="ltr">{phone}</bdi>{after}</>;};
 if(state==='loading')return <section className="wa-card skeleton-card" aria-busy="true" aria-label={t('loading')}/>;
 const copy=paused?{title:t('repliesStoppedTitle'),text:t('repliesStoppedText'),action:null}:{
  connected:{title:t('waConnectedTitle'),text:businessPhone?withNumber('waConnectedText',businessPhone):t('waConnectedTextNoPhone'),action:null},
  not_connected:{title:t('waNotConnectedTitle'),text:t('waNotConnectedText'),action:t('waConnectAction')},
  lost:{title:t('waLostTitle'),text:t('waLostText'),action:t('waReconnectAction')},
 }[state];
 return <section className={`wa-card wa-${paused?'paused':state}`} aria-labelledby="wa-card-title" role={state==='lost'||paused?'alert':undefined}>
  <div className="wa-card-status"><span className="wa-dot" aria-hidden="true"/><div><h2 id="wa-card-title">{copy.title}</h2><p>{copy.text}</p></div>
   {paused?<Button className="wa-card-action" disabled={busy} onClick={onResume}>{t('enableRepliesAction')}</Button>
    :copy.action?<Link className="button primary wa-card-action" href="/admin/settings?section=whatsapp">{copy.action}</Link>:null}</div>
  <dl className="wa-card-numbers">
   <div><dt>{t('waBusinessNumber')}</dt><dd dir="ltr">{businessPhone??'—'}</dd></div>
   <div><dt className="sr-only">{t('setPhone')}</dt><dd><span>{ownerPhone?withNumber('waOwnerLine',ownerPhone):t('waOwnerMissing')}</span> · <Link href="/admin/settings?section=phone">{ownerPhone?t('waChange'):t('waAdd')}</Link></dd></div>
  </dl>
  {paused===false?<div className="wa-card-replies"><span>{t('repliesOnStatus')}</span><Button tone="warning" disabled={busy} onClick={()=>setConfirm(true)}>{t('stopAllRepliesAction')}</Button></div>:null}
  <ConfirmDialog open={confirm} danger title={t('stopAllReplies')} confirmLabel={t('stopAllRepliesAction')} onCancel={()=>setConfirm(false)} onConfirm={()=>{setConfirm(false);onStop?.();}}><p>{t('stopAllConfirm')}</p></ConfirmDialog>
 </section>;
}
