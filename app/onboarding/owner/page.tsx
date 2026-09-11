'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { StepFrame, inputClass, buttonClass } from '../step-frame';
import {useI18n} from '@/lib/i18n';
export default function OwnerStep() {
  const{t}=useI18n();
  const [phone,setPhone]=useState('');
  const [quietStart,setStart]=useState('');
  const [quietEnd,setEnd]=useState('');
  const [timeZone,setTimeZone]=useState('');
  const [zones,setZones]=useState<string[]>([]);
  const [command,setCommand]=useState('');
  const [paired,setPaired]=useState(false);
  const [busy,setBusy]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    const deviceZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimeZone(deviceZone);
    setZones(Intl.supportedValuesOf('timeZone'));
    const controller=new AbortController();
    fetch('/api/owner-settings',{signal:controller.signal}).then(async r=>{
      const data=await r.json();if(!r.ok) throw new Error(data.error);
      setTimeZone(data.phone?data.timeZone:deviceZone);setPhone(data.phone);setStart(data.quietStart);setEnd(data.quietEnd);setPaired(data.paired);setLoaded(true);
    }).catch(()=>{if(!controller.signal.aborted)setError(t('ownerLoadError'));});
    return ()=>controller.abort();
  },[]);
  async function submit(event:FormEvent) {
    event.preventDefault();setBusy(true);setError('');
    try {
      const response=await fetch('/api/owner-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,quietStart,quietEnd,timeZone})});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      setCommand(data.pairingCommand);setPaired(false);
    }catch(e){setError(e instanceof Error?e.message:t('saveError'));}finally{setBusy(false);}
  }
  async function verify() {
    setBusy(true);setError('');
    try{const r=await fetch('/api/owner-settings');const data=await r.json();if(!r.ok)throw new Error();setPaired(data.paired);if(!data.paired)setError(t('ownerVerifyPending'));}
    catch{setError(t('ownerVerifyError'));}finally{setBusy(false);}
  }
  return <StepFrame step={3} title={t('ownerStepTitle')}>
    <p className="mb-4 text-sm text-gray-600">{t('ownerStepHelp')}</p>
    <form onSubmit={submit} className="space-y-4">
      <label className="block">{t('ownerPhoneLabel')}<input required type="tel" className={inputClass} value={phone} onChange={e=>{setPhone(e.target.value);setPaired(false);}} /></label>
      <p className="text-sm text-gray-600">{t('ownerHoursHelp')}</p>
      <label className="block">{t('ownerZone')}<input required list="owner-time-zones" className={inputClass} value={timeZone} onChange={e=>{setTimeZone(e.target.value);setPaired(false);}} /><datalist id="owner-time-zones">{zones.map(zone=><option key={zone} value={zone} />)}</datalist></label>
      <p className="text-sm text-gray-600">{t('ownerZoneHelp')}</p>
      <label className="block">{t('fromTime')}<input type="time" className={inputClass} value={quietStart} onChange={e=>{setStart(e.target.value);setPaired(false);}} /></label>
      <label className="block">{t('toTime')}<input type="time" className={inputClass} value={quietEnd} onChange={e=>{setEnd(e.target.value);setPaired(false);}} /></label>
      <button className={buttonClass} disabled={busy||!loaded}>{t('save')}</button>
    </form>
    {command&&!paired?<div className="mt-5 space-y-3"><p>{t('ownerPairHelp')}</p><code className="block break-all rounded bg-gray-100 p-3">{command}</code><button type="button" className={buttonClass} disabled={busy} onClick={verify}>{t('verifyOwner')}</button></div>:null}
    {paired?<p role="status" className="mt-4 text-green-700">{t('ownerVerified')}</p>:null}
    {error?<p role="alert" className="mt-4 text-red-600">{error}</p>:null}
    <div className="mt-6 flex justify-between"><Link href="/onboarding/step-3">{t('back')}</Link>{paired?<Link className={buttonClass} href="/onboarding/step-4">{t('next')} <span className="direction-icon">→</span></Link>:null}</div>
  </StepFrame>;
}
