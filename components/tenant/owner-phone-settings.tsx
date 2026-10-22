'use client';
import {type FormEvent,useState} from 'react';
import {useI18n} from '@/lib/i18n';
import {translatedApiError} from '@/lib/i18n/api-error';
import {Button,Select} from '@/components/ui/primitives';
import {COUNTRY_CODES,formatPhone,normalizePhone} from '@/lib/tenant/phone';

/**
 * Z9 «Настройки → Связь с вами → Ваш номер WhatsApp»: its own action, not part of the save bar. At rest —
 * «+972 52-369-5741 · ✓ Подтверждён» and «Изменить»; changing — the country code, the number (shown at once in one
 * form) and «Отправить код». A new number waits for confirmation; until then questions go to the current one.
 */
export type OwnerPhone={phone:string;paired:boolean;pendingPhone:string};
export default function OwnerPhoneSettings({initial}:{initial:OwnerPhone}){
 const{t}=useI18n();
 const[state,setState]=useState(initial),[editing,setEditing]=useState(false),[country,setCountry]=useState(()=>COUNTRY_CODES.find(code=>initial.phone.startsWith(code))??COUNTRY_CODES[0]),[input,setInput]=useState('');
 const[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const normalized=normalizePhone(input,country);
 async function refresh(){const r=await fetch('/api/owner-settings',{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error();setState({phone:d.phone??'',paired:d.paired===true,pendingPhone:d.pendingPhone??''});return d;}
 async function submit(event:FormEvent){event.preventDefault();if(!normalized)return;setBusy(true);setError('');setNotice('');try{const r=await fetch('/api/owner-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:normalized})}),d=await r.json();if(!r.ok)throw new Error(translatedApiError(t,d,'saveError'));setNotice(d.pending==='whatsapp'?t('ownerPendingWhatsapp'):t('ownerPairHelp'));setEditing(false);setInput('');await refresh().catch(()=>undefined);}catch(e){setError(e instanceof Error?e.message:t('saveError'));}finally{setBusy(false);}}
 async function verify(){setBusy(true);setError('');try{const d=await refresh();if(!d.paired||d.pendingPhone)setError(t('ownerVerifyPending'));else setNotice('');}catch{setError(t('ownerVerifyError'));}finally{setBusy(false);}}
 const waiting=Boolean(state.pendingPhone)||Boolean(state.phone&&!state.paired);
 return <div className="setting-row owner-phone-row">
  <span className="setting-label" id="owner-phone-label">{t('z9OwnerPhone')}</span>
  {state.phone?<p className="setting-value"><bdi dir="ltr">{formatPhone(state.phone)}</bdi> · {state.paired?<span className="success-copy">✓ {t('z9Confirmed')}</span>:<span className="warning-copy">{t('phoneWaiting')}</span>}</p>:<p className="setting-value muted">{t('setPhoneNone')}</p>}
  {state.pendingPhone?<p className="setting-value"><bdi dir="ltr">{formatPhone(state.pendingPhone)}</bdi> · <span className="warning-copy">{t('phoneWaiting')}</span><span className="setting-help">{t('phonePendingHelp')}</span></p>:null}
  {editing?<form className="owner-phone-form" onSubmit={submit}>
   <div className="owner-phone-inputs"><Select aria-label={t('countryCode')} className="field-control field-country" value={country} onChange={e=>setCountry(e.target.value as typeof country)}>{COUNTRY_CODES.map(code=><option key={code} value={code}>+{code}</option>)}</Select>
    <input id="owner-phone" aria-labelledby="owner-phone-label" className="field-control field-phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={input} onChange={e=>setInput(e.target.value)}/></div>
   {input.trim()?<p className="setting-help" aria-live="polite">{normalized?<bdi dir="ltr">{formatPhone(normalized)}</bdi>:t('phoneInvalid')}</p>:null}
   <div className="row-actions"><Button tone="secondary" className="small" disabled={busy||!normalized}>{busy?t('saving'):t('sendCode')}</Button><Button type="button" tone="quiet" className="small" disabled={busy} onClick={()=>{setEditing(false);setInput('');}}>{t('cancel')}</Button></div>
  </form>:<div className="row-actions"><Button type="button" tone="secondary" className="small" disabled={busy} onClick={()=>setEditing(true)}>{state.phone?t('waChange'):t('setOwnerPhoneAction')}</Button>{waiting?<Button type="button" tone="quiet" className="small" disabled={busy} onClick={()=>void verify()}>{t('verifyOwner')}</Button>:null}</div>}
  {notice?<p role="status" className="setting-help">{notice}</p>:null}
  {error?<p role="alert" className="error-copy">{error}</p>:null}
 </div>;
}
