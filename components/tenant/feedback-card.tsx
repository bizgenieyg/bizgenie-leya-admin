'use client';

import {useState,type FormEvent} from 'react';
import {useI18n} from '@/lib/i18n';

export default function FeedbackCard(){
  const{t}=useI18n();
  const[message,setMessage]=useState(''),[status,setStatus]=useState<'idle'|'sending'|'success'|'error'>('idle');
  async function submit(event:FormEvent){
    event.preventDefault();
    const value=message.trim();
    if(!value){setStatus('error');return;}
    setStatus('sending');
    try{
      const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:value})});
      if(!response.ok)throw new Error('feedback request failed');
      setMessage('');setStatus('success');
    }catch{setStatus('error');}
  }
  return <form className="feedback-card" onSubmit={submit}><h2>{t('feedbackTitle')}</h2><p>{t('feedbackText')}</p><label className="sr-only" htmlFor="platform-feedback">{t('feedbackPlaceholder')}</label><textarea id="platform-feedback" maxLength={2000} placeholder={t('feedbackPlaceholder')} value={message} onChange={event=>{setMessage(event.target.value);if(status!=='idle')setStatus('idle');}}/><button className="feedback-button" type="submit" disabled={status==='sending'}>{status==='sending'?t('feedbackSending'):t('feedbackAction')}</button>{status==='success'?<p className="success-copy" role="status">{t('feedbackSuccess')}</p>:null}{status==='error'?<p className="error-copy" role="alert">{t(message.trim()?'feedbackError':'feedbackInvalid')}</p>:null}</form>;
}
