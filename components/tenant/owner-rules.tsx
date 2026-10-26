'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useI18n} from '@/lib/i18n';
import {Button,ConfirmDialog,ErrorState} from '@/components/ui/primitives';

/**
 * Z11 «Правила»: the owner's rules for the assistant. Adding or changing one goes through the same understanding as in
 * WhatsApp: the text → «Поняла так: … Сохранить?» (or «Какие условия …?» first) → saved only after «Сохранить».
 * `RuleFlow` is shared with «Исправить» in the simulator.
 */
type Rule={id:string;number:number;text:string};
type Proposal={id:string;status:'pending'|'details';action:string};
const errorKey=async(r:Response,fallback:string)=>{const d=await r.json().catch(()=>({})) as {code?:unknown};return typeof d.code==='string'?d.code:fallback;};

/** Voice → text (the owner sees it and can correct it before sending). */
export function VoiceToText({onText}:{onText:(text:string)=>void}){
 const{t}=useI18n();
 const[state,setState]=useState<'idle'|'recording'|'busy'|'unsupported'>('idle'),[error,setError]=useState('');
 const recorder=useRef<MediaRecorder|null>(null);
 async function start(){setError('');
  if(typeof window==='undefined'||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){setState('unsupported');return;}
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:true}),r=new MediaRecorder(stream),chunks:Blob[]=[];
   r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   r.onstop=async()=>{stream.getTracks().forEach(track=>track.stop());setState('busy');
    try{const form=new FormData();form.append('file',new Blob(chunks,{type:r.mimeType||'audio/webm'}),'voice');
     const res=await fetch('/api/knowledge-profile/voice-text',{method:'POST',body:form});
     if(!res.ok){setError(t(await errorKey(res,'kpErrorVoiceFailed')));return;}
     onText(String((await res.json() as {text?:unknown}).text??''));}finally{setState('idle');}};
   recorder.current=r;r.start();setState('recording');}catch{setState('unsupported');}}
 return <span className="voice-to-text">
  {state==='recording'?<Button type="button" tone="secondary" className="small" onClick={()=>recorder.current?.stop()}>{t('voiceStop')}</Button>
   :<Button type="button" tone="secondary" className="small" disabled={state==='busy'} onClick={()=>void start()}>{state==='busy'?t('loading'):t('voiceRecord')}</Button>}
  {state==='unsupported'?<span className="setting-help">{t('kpVoiceUnsupported')}</span>:null}
  {error?<span role="alert" className="error-copy">{error}</span>:null}
 </span>;
}

/** Text (or voice) → «Поняла так …» → «Сохранить» / «Нет». `number` — the rule being changed; `context` — what is corrected. */
export function RuleFlow({number,initial='',context,placeholder,onSaved,onCancel}:{number?:number;initial?:string;context?:string;placeholder:string;onSaved:(reply:string)=>void;onCancel?:()=>void}){
 const{t}=useI18n();
 const[text,setText]=useState(initial),[reply,setReply]=useState(''),[proposal,setProposal]=useState<Proposal|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const call=async(path:string,body:Record<string,unknown>)=>{setBusy(true);setError('');
  try{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(!r.ok){setError(t(await errorKey(r,'kpErrorSave')));return null;}
   return await r.json() as {reply:string;proposal?:Proposal|null};}finally{setBusy(false);}};
 async function understand(){const d=proposal?.status==='details'?await call(`/api/knowledge-profile/rules/proposals/${proposal.id}/details`,{text})
   :await call('/api/knowledge-profile/rules',{text,...(number?{number}:{}),...(context?{context}:{})});
  if(!d)return;setReply(d.reply);setProposal(d.proposal??null);if(d.proposal?.status==='details')setText('');}
 async function decide(action:'confirm'|'decline'){if(!proposal)return;const d=await call(`/api/knowledge-profile/rules/proposals/${proposal.id}/${action}`,{});if(!d)return;
  setProposal(null);if(action==='confirm'){setText('');setReply('');onSaved(d.reply);}else setReply(d.reply);}
 const waiting=proposal?.status==='pending';
 return <div className="rule-flow">
  {reply?<p className="rule-reply" role="status" dir="auto">{reply}</p>:null}
  {waiting?<div className="row-actions"><Button type="button" disabled={busy} onClick={()=>void decide('confirm')}>{t('save')}</Button><Button type="button" tone="secondary" disabled={busy} onClick={()=>void decide('decline')}>{t('ruleNo')}</Button></div>
   :<><textarea className="field-control" dir="auto" rows={2} maxLength={3000} placeholder={proposal?.status==='details'?t('ruleDetailsPlaceholder'):placeholder} value={text} onChange={e=>setText(e.target.value)}/>
    <div className="row-actions"><Button type="button" tone="secondary" disabled={busy||!text.trim()} onClick={()=>void understand()}>{busy?t('loading'):t('ruleCheck')}</Button><VoiceToText onText={value=>setText(current=>current?`${current} ${value}`:value)}/>{onCancel?<Button type="button" tone="quiet" onClick={onCancel}>{t('cancel')}</Button>:null}</div></>}
  {error?<p role="alert" className="error-copy">{error}</p>:null}
 </div>;
}

export default function OwnerRules(){
 const{t}=useI18n();
 const[rules,setRules]=useState<Rule[]|null>(null),[max,setMax]=useState(30),[error,setError]=useState(''),[mode,setMode]=useState<'list'|'add'|number>('list'),[removing,setRemoving]=useState<Rule|null>(null),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{setError('');const r=await fetch('/api/knowledge-profile/rules',{cache:'no-store'});if(!r.ok){setError(t(await errorKey(r,'kpErrorLoad')));return;}
  const d=await r.json() as {rules:Rule[];max:number};setRules(d.rules);setMax(d.max);},[t]);
 useEffect(()=>{void load();},[load]);
 const saved=(reply:string)=>{setNotice(reply);setMode('list');void load();};
 async function remove(rule:Rule){setRemoving(null);const r=await fetch(`/api/knowledge-profile/rules/${rule.number}`,{method:'DELETE'});if(!r.ok){setError(t(await errorKey(r,'kpErrorSave')));return;}setNotice('');void load();}
 if(error&&!rules)return <ErrorState message={error} onRetry={()=>void load()}/>;
 if(!rules)return <div className="surface-card skeleton-card" aria-busy="true"/>;
 return <section className="surface-card owner-rules" aria-labelledby="owner-rules-title">
  <h2 id="owner-rules-title">{t('rulesTitle')}</h2>
  <p className="setting-help">{t('rulesHelp')}</p>
  {rules.length?<ol className="owner-rules-list" role="list">{rules.map(rule=><li key={rule.id} value={rule.number}>
   {mode===rule.number?<RuleFlow number={rule.number} initial={rule.text} placeholder={t('rulePlaceholder')} onSaved={saved} onCancel={()=>setMode('list')}/>
    :<><span dir="auto"><b className="owner-rule-number">{rule.number}.</b> {rule.text}</span><span className="row-actions"><Button type="button" tone="quiet" className="small" onClick={()=>setMode(rule.number)}>{t('edit')}</Button><Button type="button" tone="quiet" className="small" onClick={()=>setRemoving(rule)}>{t('delete')}</Button></span></>}
  </li>)}</ol>:<p className="muted">{t('rulesEmpty')}</p>}
  {notice?<p role="status" className="success-copy" dir="auto">{notice}</p>:null}
  {mode==='add'?<RuleFlow placeholder={t('rulePlaceholder')} onSaved={saved} onCancel={()=>setMode('list')}/>
   :rules.length<max?<Button type="button" tone="secondary" className="small" onClick={()=>{setNotice('');setMode('add');}}>{t('ruleAdd')}</Button>:<p className="setting-help">{t('rulesFullHelp',{max})}</p>}
  {error?<p role="alert" className="error-copy">{error}</p>:null}
  <ConfirmDialog open={!!removing} danger title={t('ruleDeleteTitle')} confirmLabel={t('delete')} onCancel={()=>setRemoving(null)} onConfirm={()=>removing&&void remove(removing)}><p dir="auto">{removing?.text}</p></ConfirmDialog>
 </section>;
}

/** Z11, several addresses: how they work is the owner's to say (two choices; the second asks «в какие дни где?»). */
export function AddressModeQuestion({onDone}:{onDone:()=>void}){
 const{t}=useI18n();
 const[choice,setChoice]=useState<'simultaneous'|'schedule'|null>(null),[schedule,setSchedule]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(mode:'simultaneous'|'schedule'){setBusy(true);setError('');
  try{const r=await fetch('/api/knowledge-profile/address-mode',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,...(mode==='schedule'?{schedule}:{})})});
   if(!r.ok){setError(t(await errorKey(r,'kpErrorSave')));return;}onDone();}finally{setBusy(false);}}
 return <section className="surface-card address-question" aria-labelledby="address-question-title">
  <h2 id="address-question-title">{t('addressQuestionTitle')}</h2>
  <div className="row-actions"><Button type="button" tone="secondary" disabled={busy} onClick={()=>{setChoice('simultaneous');void save('simultaneous');}}>{t('addressSimultaneous')}</Button>
   <Button type="button" tone="secondary" disabled={busy} onClick={()=>setChoice('schedule')}>{t('addressSchedule')}</Button></div>
  {choice==='schedule'?<><label className="field-label" htmlFor="address-schedule">{t('addressScheduleQuestion')}</label>
   <textarea id="address-schedule" className="field-control" dir="auto" rows={2} maxLength={500} value={schedule} onChange={e=>setSchedule(e.target.value)}/>
   <div className="row-actions"><Button type="button" disabled={busy||!schedule.trim()} onClick={()=>void save('schedule')}>{t('save')}</Button></div></>:null}
  {error?<p role="alert" className="error-copy">{error}</p>:null}
 </section>;
}
