'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useI18n} from '@/lib/i18n';
import {Button,ConfirmDialog} from '@/components/ui/primitives';
import type {WhatsAppCardState} from '@/lib/tenant/labels';
import {formatPhone} from '@/lib/tenant/phone';

/**
 * Z8 «Главная»: one full-width card in three WhatsApp states; the same minimum height in each, and a placeholder of
 * that height while loading. Connecting and disconnecting happen in «Настройки → WhatsApp».
 * Z8.1: client replies are part of the card — a bottom strip «Ответы клиентам: включены» with «Остановить все ответы»
 * (confirmed first); when stopped, the whole card is amber: «Ответы остановлены» and the filled «Включить ответы».
 * Z9: one column, the business number once («WhatsApp подключён · +972 52-216-4724»). The owner number appears only
 * when it needs an action (not set / not confirmed) with «Указать номер» → «Настройки → Связь с вами».
 */
export default function WhatsAppHomeCard({state,businessPhone,owner,paused,busy=false,onStop,onResume}:{state:WhatsAppCardState;businessPhone:string|null;owner:'ok'|'missing'|'unconfirmed';paused?:boolean;busy?:boolean;onStop?:()=>void;onResume?:()=>void}){
 const{t}=useI18n();
 const[confirm,setConfirm]=useState(false);
 if(state==='loading')return <section className="wa-card skeleton-card" aria-busy="true" aria-label={t('loading')}/>;
 const phone=businessPhone?formatPhone(businessPhone):'';
 const copy=paused?{title:t('repliesStoppedTitle'),text:t('repliesStoppedText'),action:null}:{
  connected:{title:<>{t('waConnectedTitle')}{phone?<> · <bdi dir="ltr">{phone}</bdi></>:null}</>,text:null,action:null},
  not_connected:{title:t('waNotConnectedTitle'),text:t('waNotConnectedText'),action:t('waConnectAction')},
  lost:{title:t('waLostTitle'),text:t('waLostText'),action:t('waReconnectAction')},
 }[state];
 return <section className={`wa-card wa-${paused?'paused':state}`} aria-labelledby="wa-card-title" role={state==='lost'||paused?'alert':undefined}>
  <div className="wa-card-status"><span className="wa-dot" aria-hidden="true"/><div><h2 id="wa-card-title">{copy.title}</h2>{copy.text?<p>{copy.text}</p>:null}</div>
   {paused?<Button className="wa-card-action" disabled={busy} onClick={onResume}>{t('enableRepliesAction')}</Button>
    :copy.action?<Link className="button primary wa-card-action" href="/admin/settings?section=whatsapp">{copy.action}</Link>:null}</div>
  {owner!=='ok'?<div className="wa-card-owner" role="status"><span>{owner==='missing'?t('ownerPhoneMissingWarning'):t('ownerPhoneUnconfirmedWarning')}</span><Link className="button secondary small" href="/admin/settings?section=contact">{t('setOwnerPhoneAction')}</Link></div>:null}
  {paused===false?<div className="wa-card-replies"><span>{t('repliesOnStatus')}</span><Button tone="warning" disabled={busy} onClick={()=>setConfirm(true)}>{t('stopAllRepliesAction')}</Button></div>:null}
  <ConfirmDialog open={confirm} danger title={t('stopAllReplies')} confirmLabel={t('stopAllRepliesAction')} onCancel={()=>setConfirm(false)} onConfirm={()=>{setConfirm(false);onStop?.();}}><p>{t('stopAllConfirm')}</p></ConfirmDialog>
 </section>;
}
