'use client';
import {type FormEvent,useState} from 'react';
import {useI18n} from '@/lib/i18n';
import {translatedApiError} from '@/lib/i18n/api-error';
import {Button,Select} from '@/components/ui/primitives';
import {COUNTRY_CODES,formatPhone,normalizePhone} from '@/lib/tenant/phone';

/**
 * Z10 «Подключаюсь с этого телефона»: the QR cannot be scanned from the phone showing it, so WhatsApp links the
 * business number by a code instead. Number (same input and normalization as Z9) → «Получить код» → the code in
 * large type and where to enter it. The code expires: «Получить новый код». «Вернуться к QR» closes the panel.
 */
export default function PairingCodePanel({onBack}:{onBack:()=>void}){
 const{t}=useI18n();
 const[country,setCountry]=useState<string>(COUNTRY_CODES[0]),[input,setInput]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const normalized=normalizePhone(input,country);
 async function request(event?:FormEvent){event?.preventDefault();if(!normalized)return;setBusy(true);setError('');
  try{const r=await fetch('/api/waha/pairing-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:input,country})}),d=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(translatedApiError(t,d,'pairingFailed'));setCode(String(d.code));}
  catch(e){setCode('');setError(e instanceof Error?e.message:t('pairingFailed'));}finally{setBusy(false);}}
 return <section className="pairing-panel" aria-labelledby="pairing-title">
  <h2 id="pairing-title">{t('pairingTitle')}</h2>
  {code?<>
   <p className="pairing-code" dir="ltr" aria-live="polite">{code}</p>
   <ol className="pairing-steps"><li>{t('pairingStep1')}</li><li>{t('pairingStep2')}</li><li>{t('pairingStep3')}</li></ol>
   <div className="row-actions"><Button type="button" tone="secondary" disabled={busy} onClick={()=>void request()}>{busy?t('loading'):t('pairingNewCode')}</Button></div>
  </>:<form className="pairing-form" onSubmit={request}>
   <label className="field-label" htmlFor="pairing-phone">{t('pairingPhoneLabel')}</label>
   <div className="owner-phone-inputs"><Select aria-label={t('countryCode')} className="field-control field-country" value={country} onChange={e=>setCountry(e.target.value)}>{COUNTRY_CODES.map(c=><option key={c} value={c}>+{c}</option>)}</Select>
    <input id="pairing-phone" className="field-control field-phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={input} onChange={e=>setInput(e.target.value)}/></div>
   {input.trim()?<p className="setting-help" aria-live="polite">{normalized?<bdi dir="ltr">{formatPhone(normalized)}</bdi>:t('phoneInvalid')}</p>:null}
   <div className="row-actions"><Button type="submit" disabled={busy||!normalized}>{busy?t('loading'):t('pairingGetCode')}</Button></div>
  </form>}
  {error?<p role="alert" className="error-copy">{error}</p>:null}
  <button type="button" className="text-link-inline pairing-back" onClick={onBack}>{t('pairingBackToQr')}</button>
 </section>;
}
