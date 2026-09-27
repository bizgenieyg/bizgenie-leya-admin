'use client';
import Link from 'next/link';
import {type FormEvent,useCallback,useEffect,useRef,useState} from 'react';
import {Button,ErrorState,LoadingState} from '@/components/ui/primitives';
import {useFormat,useI18n} from '@/lib/i18n';

type Fact={id:string;topic:string;text:string;quote:string|null;source_id:string|null;updated_at:string;status?:string};
type Topic={topic:string;required:boolean;facts:Fact[];updated_at:string|null};
type Card={id:string;kind:'audit'|'gap';check_type:string;topic:string;before_text:string|null;suggested_text:string|null;question:string|null;reason:string|null};
type Profile={topics:Topic[];filled:number;required:number;audit:Card[];waiting_questions:number;assistant_name:string|null;sources:Array<{id:string;kind:string;title:string|null;url:string|null}>};
type Source={id:string;status:'processing'|'ready'|'failed';error:string|null;drafts:Fact[];conflicts:Array<{id:string}>};
type Tab='text'|'file'|'link'|'photo';

const TABS:Tab[]=['text','file','link','photo'];
const POLL_MS=2000;
const errorKey=async(r:Response,fallback:string)=>{const d=await r.json().catch(()=>({})) as {code?:string};return d.code??fallback;};

/** "Что знает Лея": the business profile by topic, "Добавить что угодно", improvement cards (task R). */
export default function KnowledgeProfile(){
 const{t}=useI18n(),format=useFormat();
 const[profile,setProfile]=useState<Profile|null>(null),[error,setError]=useState(''),[open,setOpen]=useState<string|null>(null);
 const[adding,setAdding]=useState<{topic:string|null}|null>(null);
 const load=useCallback(async()=>{setError('');const r=await fetch('/api/knowledge-profile',{cache:'no-store'});if(!r.ok){setError(t(await errorKey(r,'kpErrorLoad')));return;}setProfile(await r.json() as Profile);},[t]);
 useEffect(()=>{void load().catch(()=>setError(t('kpErrorLoad')));},[load,t]);
 if(!profile)return error?<ErrorState message={error} onRetry={()=>void load()}/>:<LoadingState label={t('loading')}/>;
 const name=profile.assistant_name?.trim();
 const shown=profile.topics.filter(topic=>topic.facts.length||topic.required);
 const current=profile.topics.find(topic=>topic.topic===open);
 return <div className="kp">
  <header className="page-heading kp-head">
   <div><p className="eyebrow">{name||'Leya'}</p><h1>{name?t('kpTitleNamed',{name}):t('kpTitle')}</h1><p>{t('kpFilled',{filled:profile.filled,total:profile.required})}</p></div>
   <Button onClick={()=>setAdding({topic:null})}>{t('kpAdd')}</Button>
  </header>
  <p className="field-help">{t('kpAddHelp')}</p>
  {error?<p role="alert" className="error-copy">{error}</p>:null}
  <div className="kp-topics">
   {shown.map(topic=>topic.facts.length
    ?<button key={topic.topic} type="button" className={`kp-topic ${open===topic.topic?'active':''}`} aria-expanded={open===topic.topic} onClick={()=>setOpen(open===topic.topic?null:topic.topic)}>
      <strong>{t(`kpTopic_${topic.topic}`)}</strong>
      <span dir="auto" className="kp-topic-summary">{t('kpFactsCount',{count:topic.facts.length})} · {topic.facts[0]!.text}</span>
      {topic.updated_at?<small>{t('kpUpdated',{date:format.date(topic.updated_at)})}</small>:null}
     </button>
    :<button key={topic.topic} type="button" className="kp-topic empty" onClick={()=>setAdding({topic:topic.topic})}>
      <strong>{t(`kpTopic_${topic.topic}`)}</strong><span className="kp-tell">{t('kpTell')} <span className="direction-icon">→</span></span>
     </button>)}
  </div>
  {current?<TopicFacts topic={current} sources={profile.sources} onChanged={load}/>:null}
  {profile.audit.length?<section className="kp-audit" aria-labelledby="kp-audit-title">
   <h2 id="kp-audit-title">{t('kpImprove',{count:profile.audit.length})}</h2>
   {profile.audit.map(card=><AuditCard key={card.id} card={card} onDone={load}/>)}
  </section>:null}
  {profile.waiting_questions?<p className="kp-waiting">{t('kpWaiting',{count:profile.waiting_questions})} · <Link href="/admin/clients">{t('kpAnswer')}</Link></p>:null}
  {adding?<AddAnything topic={adding.topic} onClose={()=>{setAdding(null);void load();}}/>:null}
 </div>;
}

function TopicFacts({topic,sources,onChanged}:{topic:Topic;sources:Profile['sources'];onChanged:()=>Promise<void>}){
 const{t}=useI18n();
 return <section className="surface-card kp-facts" aria-label={t(`kpTopic_${topic.topic}`)}>
  <h2>{t(`kpTopic_${topic.topic}`)}</h2>
  <ul>{topic.facts.map(fact=><li key={fact.id}><FactRow fact={fact} source={sources.find(s=>s.id===fact.source_id)??null} onChanged={onChanged}/></li>)}</ul>
 </section>;
}

function FactRow({fact,source,onChanged,draft=false}:{fact:Fact;source?:Profile['sources'][number]|null;onChanged:()=>Promise<void>|void;draft?:boolean}){
 const{t}=useI18n();
 const[editing,setEditing]=useState(false),[text,setText]=useState(fact.text),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const call=async(init:RequestInit)=>{setBusy(true);setError('');try{const r=await fetch(`/api/knowledge-profile/facts/${fact.id}`,init);if(!r.ok){setError(t(await errorKey(r,'kpErrorSave')));return;}setEditing(false);await onChanged();}finally{setBusy(false);}};
 const save=(event:FormEvent)=>{event.preventDefault();void call({method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});};
 return <div className="kp-fact">
  {editing?<form onSubmit={save} className="kp-edit"><label className="sr-only" htmlFor={`fact-${fact.id}`}>{t('kpFactText')}</label><textarea id={`fact-${fact.id}`} className="field-control" dir="auto" rows={2} maxLength={500} value={text} onChange={e=>setText(e.target.value)}/><div className="kp-actions"><Button disabled={busy||!text.trim()}>{t('save')}</Button><Button type="button" tone="quiet" onClick={()=>{setEditing(false);setText(fact.text);}}>{t('cancel')}</Button></div></form>
   :<p dir="auto">{fact.text}</p>}
  {fact.quote?<details className="kp-quote"><summary>{t('kpSource')}{source?.title?`: ${source.title}`:''}</summary><blockquote dir="auto">«{fact.quote}»</blockquote></details>:null}
  {error?<p role="alert" className="error-copy">{error}</p>:null}
  {!editing?<div className="kp-actions"><Button tone="quiet" disabled={busy} onClick={()=>setEditing(true)}>{t('edit')}</Button><Button tone="quiet" disabled={busy} onClick={()=>void call({method:'DELETE'})}>{draft?t('delete'):t('kpArchive')}</Button></div>:null}
 </div>;
}

function AuditCard({card,onDone}:{card:Card;onDone:()=>Promise<void>}){
 const{t}=useI18n();
 const[text,setText]=useState(card.kind==='gap'?'':card.suggested_text??''),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const decide=async(action:'accept'|'edit'|'skip'|'answer')=>{setBusy(true);setError('');try{const r=await fetch(`/api/knowledge-profile/audit/${card.id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,text})});if(!r.ok){setError(t(await errorKey(r,'kpErrorSave')));return;}await onDone();}finally{setBusy(false);}};
 return <article className="surface-card kp-card">
  <p className="kp-card-kind">{t(`kpTopic_${card.topic}`)} · {t(`kpCheck_${card.check_type}`)}</p>
  {card.kind==='gap'?<>
   <p dir="auto">{card.question}</p>
   <label className="sr-only" htmlFor={`gap-${card.id}`}>{t('kpYourAnswer')}</label>
   <textarea id={`gap-${card.id}`} className="field-control" dir="auto" rows={2} maxLength={500} placeholder={t('kpYourAnswer')} value={text} onChange={e=>setText(e.target.value)}/>
   <div className="kp-actions"><Button disabled={busy||!text.trim()} onClick={()=>void decide('answer')}>{t('save')}</Button><Button tone="secondary" disabled={busy} onClick={()=>void decide('skip')}>{t('kpSkip')}</Button></div>
  </>:<>
   <div className="kp-compare"><p dir="auto"><strong>{t('kpBefore')}</strong> {card.before_text}</p>
    {editing?<div><label className="field-label" htmlFor={`card-${card.id}`}>{t('kpSuggested')}</label><textarea id={`card-${card.id}`} className="field-control" dir="auto" rows={2} maxLength={500} value={text} onChange={e=>setText(e.target.value)}/></div>
     :<p dir="auto"><strong>{t('kpSuggested')}</strong> {card.suggested_text}</p>}</div>
   {card.reason&&card.check_type!=='conflict'?<p className="field-help" dir="auto">{card.reason}</p>:null}
   <div className="kp-actions">
    {editing?<Button disabled={busy||!text.trim()} onClick={()=>void decide('edit')}>{t('save')}</Button>:<Button disabled={busy} onClick={()=>void decide('accept')}>{t('kpAccept')}</Button>}
    {editing?<Button tone="quiet" onClick={()=>{setEditing(false);setText(card.suggested_text??'');}}>{t('cancel')}</Button>:<Button tone="secondary" disabled={busy} onClick={()=>setEditing(true)}>{t('edit')}</Button>}
    <Button tone="secondary" disabled={busy} onClick={()=>void decide('skip')}>{t('kpSkip')}</Button>
   </div>
  </>}
  {error?<p role="alert" className="error-copy">{error}</p>:null}
 </article>;
}

/** Text / File / Link / Photo → processing (polled) → "Лея поняла так" → "Верно". */
function AddAnything({topic,onClose}:{topic:string|null;onClose:()=>void}){
 const{t}=useI18n();
 const[tab,setTab]=useState<Tab>('text'),[text,setText]=useState(''),[url,setUrl]=useState(''),[file,setFile]=useState<File|null>(null);
 const[busy,setBusy]=useState(false),[error,setError]=useState(''),[source,setSource]=useState<Source|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 const poll=useCallback(async(id:string)=>{const r=await fetch(`/api/knowledge-profile/sources/${id}`,{cache:'no-store'});if(!r.ok){setError(t(await errorKey(r,'kpErrorLoad')));return;}const next=await r.json() as Source;setSource(next);if(next.status==='processing')timer.current=setTimeout(()=>void poll(id),POLL_MS);},[t]);
 async function submit(event:FormEvent){
  event.preventDefault();setBusy(true);setError('');
  const form=new FormData();
  if(tab==='text'){form.set('kind','text');form.set('text',text);if(topic)form.set('topic',topic);}
  else if(tab==='link'){form.set('kind','link');form.set('url',url);}
  else if(file){form.set('kind','file');form.set('file',file);}
  try{const r=await fetch('/api/knowledge-profile/sources',{method:'POST',body:form});if(!r.ok){setError(t(await errorKey(r,'kpErrorSave')));return;}const{id}=await r.json() as {id:string};await poll(id);}
  catch{setError(t('kpErrorUnavailable'));}finally{setBusy(false);}
 }
 async function confirm(){if(!source)return;setBusy(true);setError('');try{const r=await fetch(`/api/knowledge-profile/sources/${source.id}/confirm`,{method:'POST'});if(!r.ok){setError(t(await errorKey(r,'kpErrorSave')));return;}onClose();}finally{setBusy(false);}}
 const ready=tab==='text'?!!text.trim():tab==='link'?!!url.trim():!!file;
 return <div className="dialog-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}>
  <section className="dialog kp-dialog" role="dialog" aria-modal="true" aria-labelledby="kp-add-title">
   <h2 id="kp-add-title">{topic?t('kpTellAbout',{topic:t(`kpTopic_${topic}`)}):t('kpAddTitle')}</h2>
   {!source?<form onSubmit={submit} className="kp-add">
    {!topic?<div className="kp-tabs" role="tablist" aria-label={t('kpAddTitle')}>{TABS.map(item=><button key={item} type="button" role="tab" aria-selected={tab===item} className={tab===item?'active':''} onClick={()=>{setTab(item);setError('');}}>{t(`kpTab_${item}`)}</button>)}</div>:null}
    {tab==='text'?<><label className="field-label" htmlFor="kp-text">{t('kpTextLabel')}</label><textarea id="kp-text" className="field-control" dir="auto" rows={8} maxLength={50000} value={text} onChange={e=>setText(e.target.value)} placeholder={t('kpTextPlaceholder')}/></>:null}
    {tab==='link'?<><label className="field-label" htmlFor="kp-url">{t('kpLinkLabel')}</label><input id="kp-url" className="field-control" type="url" inputMode="url" dir="ltr" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://"/><p className="field-help">{t('kpLinkHelp')}</p></>:null}
    {tab==='file'||tab==='photo'?<><label className="field-label" htmlFor="kp-file">{t(tab==='photo'?'kpPhotoLabel':'kpFileLabel')}</label><input id="kp-file" className="field-control" type="file" accept={tab==='photo'?'image/jpeg,image/png,image/webp,image/heic,image/heif':'.md,.txt,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'} onChange={e=>setFile(e.target.files?.[0]??null)}/><p className="field-help">{t(tab==='photo'?'kpPhotoHelp':'kpFileHelp')}</p></>:null}
    {error?<p role="alert" className="error-copy">{error}</p>:null}
    <div className="dialog-actions"><Button type="button" tone="secondary" disabled={busy} onClick={onClose}>{t('cancel')}</Button><Button disabled={busy||!ready}>{busy?t('saving'):t('kpSend')}</Button></div>
   </form>
   :source.status==='processing'?<div role="status" className="kp-processing"><LoadingState label={t('kpProcessing')}/></div>
   :source.status==='failed'?<><ErrorState message={t(source.error??'kpErrorProcessing')}/><div className="dialog-actions"><Button tone="secondary" onClick={()=>setSource(null)}>{t('kpTryAgain')}</Button><Button onClick={onClose}>{t('close')}</Button></div></>
   :<div className="kp-understood">
     <h3>{t('kpUnderstood')}</h3>
     {source.drafts.length?<ul>{source.drafts.map(fact=><li key={fact.id}><p className="kp-card-kind">{t(`kpTopic_${fact.topic}`)}</p><FactRow fact={fact} draft onChanged={()=>poll(source.id)}/></li>)}</ul>:<p>{t('kpNothingNew')}</p>}
     {source.conflicts.length?<p className="field-help">{t('kpConflictsNote')}</p>:null}
     {error?<p role="alert" className="error-copy">{error}</p>:null}
     <div className="dialog-actions"><Button tone="secondary" disabled={busy} onClick={onClose}>{t('close')}</Button>{source.drafts.length?<Button disabled={busy} onClick={()=>void confirm()}>{t('kpCorrect')}</Button>:null}</div>
    </div>}
  </section>
 </div>;
}
