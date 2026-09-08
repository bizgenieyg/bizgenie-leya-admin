'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { StepFrame, inputClass, buttonClass } from '../step-frame';
export default function OwnerStep() {
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
    }).catch(()=>{if(!controller.signal.aborted)setError('Не удалось загрузить настройки. Обновите страницу.');});
    return ()=>controller.abort();
  },[]);
  async function submit(event:FormEvent) {
    event.preventDefault();setBusy(true);setError('');
    try {
      const response=await fetch('/api/owner-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,quietStart,quietEnd,timeZone})});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      setCommand(data.pairingCommand);setPaired(false);
    }catch(e){setError(e instanceof Error?e.message:'Не удалось сохранить настройки.');}finally{setBusy(false);}
  }
  async function verify() {
    setBusy(true);setError('');
    try{const r=await fetch('/api/owner-settings');const data=await r.json();if(!r.ok)throw new Error();setPaired(data.paired);if(!data.paired)setError('Подтверждение пока не получено. Отправьте команду с телефона владельца на бизнес-номер.');}
    catch{setError('Не удалось проверить подтверждение.');}finally{setBusy(false);}
  }
  return <StepFrame step={3} title="Телефон владельца">
    <p className="mb-4 text-sm text-gray-600">Укажите отдельный номер владельца: сюда ассистент будет отправлять вопросы клиентов. Это не бизнес-номер, подключённый к WhatsApp.</p>
    <form onSubmit={submit} className="space-y-4">
      <label className="block">Номер владельца с кодом страны<input required type="tel" className={inputClass} value={phone} onChange={e=>{setPhone(e.target.value);setPaired(false);}} /></label>
      <p className="text-sm text-gray-600">Тихие часы по местному времени владельца. Оставьте оба поля пустыми, чтобы получать вопросы в любое время.</p>
      <label className="block">Часовой пояс владельца<input required list="owner-time-zones" className={inputClass} value={timeZone} onChange={e=>{setTimeZone(e.target.value);setPaired(false);}} /><datalist id="owner-time-zones">{zones.map(zone=><option key={zone} value={zone} />)}</datalist></label>
      <p className="text-sm text-gray-600">Для нового подключения часовой пояс определяется по устройству. Проверьте, что он соответствует местоположению владельца.</p>
      <label className="block">С<input type="time" className={inputClass} value={quietStart} onChange={e=>{setStart(e.target.value);setPaired(false);}} /></label>
      <label className="block">До<input type="time" className={inputClass} value={quietEnd} onChange={e=>{setEnd(e.target.value);setPaired(false);}} /></label>
      <button className={buttonClass} disabled={busy||!loaded}>Сохранить</button>
    </form>
    {command&&!paired?<div className="mt-5 space-y-3"><p>Отправьте эту одноразовую команду с телефона владельца на подключённый бизнес-номер. Команда действует 30 минут.</p><code className="block break-all rounded bg-gray-100 p-3">{command}</code><button type="button" className={buttonClass} disabled={busy} onClick={verify}>Проверить подтверждение</button></div>:null}
    {paired?<p role="status" className="mt-4 text-green-700">Владелец подтверждён</p>:null}
    {error?<p role="alert" className="mt-4 text-red-600">{error}</p>:null}
    <div className="mt-6 flex justify-between"><Link href="/onboarding/step-3">Назад</Link>{paired?<Link className={buttonClass} href="/onboarding/step-4">Далее →</Link>:null}</div>
  </StepFrame>;
}
