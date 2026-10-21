'use client';
import {type FormEvent,useEffect,useState} from 'react';
import {useI18n} from '@/lib/i18n';
import {translatedApiError} from '@/lib/i18n/api-error';
import {Button} from '@/components/ui/primitives';
import {displayPhone} from '@/lib/tenant/labels';

/**
 * Z8 «Настройки → Ваш телефон для вопросов и заявок» (was «Настройки владельца», /onboarding/owner): the current
 * number and its confirmation, the hours when the owner is not disturbed, «Сохранить и подтвердить» → the code is
 * sent to WhatsApp (or later, after the business number is connected). The time zone is the business one.
 */
export type OwnerPhone={phone:string;quietStart:string;quietEnd:string;paired:boolean};
/** `initial`: loaded by the settings page together with the other settings, so the section does not grow later. */
export default function OwnerPhoneSettings({timeZone,initial}:{timeZone:string;initial?:OwnerPhone|null}){
 const{t}=useI18n();
 const[loaded,setLoaded]=useState<{phone:string;paired:boolean}|null>(initial?{phone:initial.phone,paired:initial.paired}:null),[phone,setPhone]=useState(initial?.phone??''),[quietStart,setStart]=useState(initial?.quietStart??''),[quietEnd,setEnd]=useState(initial?.quietEnd??'');
 const[busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState(false),[pending,setPending]=useState(false);
 useEffect(()=>{if(initial)return;const controller=new AbortController();fetch('/api/owner-settings',{signal:controller.signal,cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error();setPhone(d.phone??'');setStart(d.quietStart??'');setEnd(d.quietEnd??'');setLoaded({phone:d.phone??'',paired:d.paired===true});}).catch(()=>{if(!controller.signal.aborted)setError(t('ownerLoadError'));});return()=>controller.abort();},[t,initial]);
 async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/owner-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,quietStart,quietEnd,timeZone})}),d=await r.json();if(!r.ok)throw new Error(translatedApiError(t,d,'saveError'));setSent(d.sent===true);setPending(d.pending==='whatsapp');setLoaded({phone,paired:false});}catch(e){setError(e instanceof Error?e.message:t('saveError'));}finally{setBusy(false);}}
 async function verify(){setBusy(true);setError('');try{const r=await fetch('/api/owner-settings',{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error();setLoaded({phone:d.phone??'',paired:d.paired===true});if(!d.paired)setError(t('ownerVerifyPending'));}catch{setError(t('ownerVerifyError'));}finally{setBusy(false);}}
 if(!loaded)return error?<p role="alert" className="error-copy">{error}</p>:<div className="skeleton-block" aria-busy="true"/>;
 const current=displayPhone(loaded.phone);
 return <form className="compact-form" onSubmit={submit}>
  <p className="settings-current">{current?<>{t('setPhoneCurrent',{phone:''})}<bdi dir="ltr">{current}</bdi> · {loaded.paired?t('phoneConfirmed'):t('phoneUnconfirmed')}</>:t('setPhoneNone')}</p>
  <label className="field-label" htmlFor="owner-phone">{t('ownerPhoneLabel')}<input id="owner-phone" className="field-control" required type="tel" inputMode="tel" dir="ltr" placeholder="+972501234567" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
  <fieldset className="field-group"><legend className="field-label">{t('ownerQuietTitle')}</legend><span className="field-help">{t('ownerHoursHelp')}</span>
   <div className="time-range"><input aria-label={t('fromTime')} type="time" value={quietStart} onChange={e=>setStart(e.target.value)}/><span>—</span><input aria-label={t('toTime')} type="time" value={quietEnd} onChange={e=>setEnd(e.target.value)}/></div></fieldset>
  <p className="warning-banner">{t('qrNumberRisk')}</p>
  <div className="row-actions"><Button tone="secondary" disabled={busy||!phone.trim()}>{busy?t('saving'):t('saveConfirm')}</Button>{sent&&!loaded.paired?<Button type="button" tone="quiet" disabled={busy} onClick={()=>void verify()}>{t('verifyOwner')}</Button>:null}</div>
  {sent&&!loaded.paired?<p role="status">{t('ownerPairHelp')}</p>:null}
  {pending?<p role="status" className="muted">{t('ownerPendingWhatsapp')}</p>:null}
  {error?<p role="alert" className="error-copy">{error}</p>:null}
 </form>;
}
