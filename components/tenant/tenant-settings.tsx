"use client";
import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent,type ReactNode} from 'react';
import SettingsSectionBoundary from './settings-section-boundary';
import {normalizeTenantSettings,normalizeUsage} from '@/lib/tenant-settings/normalize';
import {useFormat,useI18n} from '@/lib/i18n';
import AssistantSettings from './assistant-settings';
import DiscoveryQuestions from './discovery-questions';
import GreetingTemplates from './greeting-templates';
import OwnerPhoneSettings,{type OwnerPhone} from './owner-phone-settings';
import ProfilePanel from './profile-panel';
import SectorInput from './sector-input';
import WhatsAppStatus from './whatsapp-status';
import type {AccountProfile} from '@/lib/auth/profile';
import {SETTINGS_SECTIONS,type SettingsSection} from '@/lib/tenant/labels';
import {translatedApiError} from '@/lib/i18n/api-error';
import {Button,Check,ConfirmDialog,ErrorState,Select,Switch} from '@/components/ui/primitives';
import {useRouter} from 'next/navigation';
import {timeZoneLabel} from '@/lib/tenant-settings/time-zone';
import {useSimulatorDrawer} from '@/lib/tenant/simulator-drawer';
import {draftFrom,draftPatch,draftProblem,dirtySections,type Draft} from '@/lib/tenant-settings/draft';
import {useKeyboardInset,useLeaveGuard} from '@/lib/tenant-settings/leave-guard';
type X={id:string;start_date:string;end_date:string;kind:'day_off'|'special_hours';work_start:string|null;work_end:string|null;name:string;recurs_annually:boolean};
type S=Record<string,unknown>&{plan:string|null;messages_per_month:number;time_zone:string;supported_time_zones:string[];instruction_answers:boolean;exceptions:X[];owner_phone:string;paired:boolean;pending_owner_phone:string};
type U={messages_used:number;period_end:string};
type Status={kind:'idle'}|{kind:'saving'}|{kind:'saved'}|{kind:'error';message:string};
const blank=():Omit<X,'id'>=>({start_date:'',end_date:'',kind:'day_off',work_start:null,work_end:null,name:'',recurs_annually:false});
const iso=(d:Date)=>d.toISOString().slice(0,10);
function ExceptionCalendar({items,selectedStart,selectedEnd,onRange,onRemove}:{items:X[];selectedStart:string;selectedEnd:string;onRange:(a:string,b:string)=>void;onRemove:(id:string)=>void}){const{t}=useI18n(),format=useFormat();
 const[month,setMonth]=useState(()=>{const d=new Date();return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1));}),[drag,setDrag]=useState<string|null>(null);
 const first=(month.getUTCDay()+6)%7,total=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();
 const cells=Array.from({length:first+total},(_,i)=>i<first?null:new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),i-first+1)));
 const match=(date:string)=>items.find(x=>{if(!x.recurs_annually)return date>=x.start_date&&date<=x.end_date;const value=date.slice(5),a=x.start_date.slice(5),b=x.end_date.slice(5);return a<=b?value>=a&&value<=b:value>=a||value<=b;});
 const finish=(date:string)=>{if(!drag)return;const found=drag===date?match(date):undefined;if(found)onRemove(found.id);else onRange(drag<date?drag:date,drag<date?date:drag);setDrag(null);};
 return <div className="select-none rounded-xl border p-4"><div className="mb-3 flex items-center justify-between"><button type="button" aria-label={t('back')} onClick={()=>setMonth(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()-1,1)))}><span className="direction-icon calendar-direction-icon">←</span></button><strong>{format.month(month)}</strong><button type="button" aria-label={t('next')} onClick={()=>setMonth(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,1)))}><span className="direction-icon calendar-direction-icon">→</span></button></div><div className="grid grid-cols-7 gap-1 text-center text-sm calendar-grid">{['mon','tue','wed','thu','fri','sat','sun'].map(x=><b key={x}>{t(x)}</b>)}{cells.map((date,i)=>{if(!date)return <span key={`blank-${i}`}/>;const value=iso(date),marked=match(value),selected=Boolean(selectedStart&&value>=selectedStart&&value<=(selectedEnd||selectedStart));return <button type="button" key={value} title={marked?.name} onPointerDown={e=>{e.preventDefault();setDrag(value);}} onPointerEnter={e=>{if(drag&&e.buttons)onRange(drag<value?drag:value,drag<value?value:drag);}} onPointerUp={()=>finish(value)} className={`rounded p-2 calendar-day ${selected?'selected':marked?.kind==='day_off'?'day-off':marked?'special':''} ${marked?.recurs_annually?'annual':''}`}>{date.getUTCDate()}</button>;})}</div><p className="mt-3 text-xs muted">{t('calendarLegend')}</p></div>;
}
/** One «Настройки» section: a card with its title (a dot when it has unsaved changes). Top-level, so inputs keep focus. */
function SettingsCard({id,title,dirty,children}:{id:SettingsSection;title:string;dirty:boolean;children:ReactNode}){
 return <section id={`settings-${id}`} className="surface-card settings-section" aria-labelledby={`settings-${id}-title`}>
  <h2 className="settings-section-title" id={`settings-${id}-title`}>{title}{dirty?<span className="unsaved-dot" aria-hidden="true"/>:null}</h2>
  <div className="settings-section-body">{children}</div></section>;
}
/** A setting: the label, at most one line of help, the field 8 below. */
function Row({label,help,htmlFor,children}:{label:string;help?:string;htmlFor?:string;children:ReactNode}){
 return <div className="setting-row">{htmlFor?<label className="setting-label" htmlFor={htmlFor}>{label}</label>:<span className="setting-label">{label}</span>}{help?<span className="setting-help">{help}</span>:null}{children}</div>;
}
/**
 * Z9 «Настройки»: Ассистент · Бизнес · Связь с вами · Когда не беспокоить · WhatsApp · Аккаунт, one after another.
 * Ordinary settings are edited in place; the first change shows the sticky save bar («Отменить» · «Сохранить», the
 * only filled button). «Сохранить» is one request and one transaction (save_tenant_settings_bundle); the bar goes
 * only after the server confirms. The owner number, WhatsApp, schedule exceptions and sign out are own actions.
 */
export default function TenantSettings({profile,section}:{profile:AccountProfile|null;section:SettingsSection|null}){
 const{t,locale}=useI18n(),router=useRouter(),{setDirty}=useSimulatorDrawer();
 const tag=locale==='he'?'he-IL':locale==='en'?'en-US':'ru-RU';
 const DAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].map(key=>t(key));
 const[s,setS]=useState<S|null>(null),[u,setU]=useState<U|null>(null),[saved,setSaved]=useState<Draft|null>(null),[draft,setDraft]=useState<Draft|null>(null);
 const[error,setError]=useState(''),[status,setStatus]=useState<Status>({kind:'idle'}),[busy,setBusy]=useState(false),[exception,setException]=useState(blank()),[editing,setEditing]=useState<string|null>(null);
 const[ownerPhone,setOwnerPhone]=useState<OwnerPhone|null|undefined>(undefined),[now,setNow]=useState(()=>new Date());
 const barRef=useRef<HTMLDivElement>(null);
 const apply=useCallback((d:Record<string,unknown>)=>{const settings=normalizeTenantSettings(d.settings) as S;setS(settings);setU(normalizeUsage(d.usage) as U);const next=draftFrom(settings);setSaved(next);return next;},[]);
 const load=useCallback(async()=>{const r=await fetch('/api/tenant-settings',{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(translatedApiError(t,d,'settingsLoadError'));return apply(d);},[t,apply]);
 const loadAll=useCallback(()=>{setError('');return Promise.all([load().then(next=>setDraft(next)),fetch('/api/owner-settings',{cache:'no-store'}).then(async r=>{if(!r.ok)return;const d=await r.json();setOwnerPhone({phone:d.phone??'',paired:d.paired===true,pendingPhone:d.pendingPhone??''});}).catch(()=>undefined).finally(()=>setOwnerPhone(value=>value??null))]).catch(()=>setError(t('settingsLoadError')));},[load,t]);
 useEffect(()=>{void loadAll();},[loadAll]);
 useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(section&&s&&typeof document!=='undefined')document.getElementById(`settings-${section}`)?.scrollIntoView?.({block:'start'});},[section,s]);
 const dirty=useMemo(()=>saved&&draft?dirtySections(saved,draft):new Set<SettingsSection>(),[saved,draft]);
 const isDirty=dirty.size>0;
 useEffect(()=>{setDirty('settings',isDirty);},[isDirty,setDirty]);
 useEffect(()=>()=>setDirty('settings',false),[setDirty]);
 const leave=useLeaveGuard(isDirty);
 useKeyboardInset(barRef,isDirty||status.kind!=='idle');
 useEffect(()=>{if(status.kind!=='saved')return;const timer=setTimeout(()=>setStatus({kind:'idle'}),3000);return()=>clearTimeout(timer);},[status]);
 const set=<K extends keyof Draft>(key:K,value:Draft[K])=>{setDraft(x=>x?{...x,[key]:value}:x);setStatus(x=>x.kind==='saved'?{kind:'idle'}:x);};
 const problem=draft?draftProblem(draft):null;
 async function save(){if(!saved||!draft||problem)return;setStatus({kind:'saving'});
  try{const r=await fetch('/api/tenant-settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(draftPatch(saved,draft))}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(translatedApiError(t,d,'saveNotSaved'));
   const next=await load();setDraft(next);setStatus({kind:'saved'});}
  catch(e){setStatus({kind:'error',message:e instanceof Error?e.message:t('saveNotSaved')});}}
 async function saveX(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/schedule-exceptions'+(editing?`?id=${editing}`:''),{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(exception)}),d=await r.json();if(!r.ok)throw new Error(translatedApiError(t,d,'saveError'));setException(blank());setEditing(null);await load();}catch(e){setError(e instanceof Error?e.message:t('saveError'));}finally{setBusy(false);}}
 async function remove(id:string){setBusy(true);setError('');try{const r=await fetch(`/api/schedule-exceptions?id=${id}`,{method:'DELETE'});if(!r.ok)throw new Error();await load();}catch{setError(t('deleteError'));}finally{setBusy(false);}}
 const titles:Record<SettingsSection,string>={assistant:'setAssistant',business:'setBusiness',contact:'setContact',quiet:'setQuiet',whatsapp:'setWhatsapp',account:'setAccount'};
 const card=(id:SettingsSection,children:ReactNode)=><SettingsCard id={id} title={t(titles[id])} dirty={dirty.has(id)}>{children}</SettingsCard>;
 const planRow=(s:S|null)=>s&&u?<div className="setting-row"><span className="setting-label">{t('yourPlan')}</span><p className="setting-value">{s.plan==='pilot'?t('pilotPaymentStatus'):s.plan==='basic'?t('basicPlan'):s.plan||t('notAssigned')}</p></div>:null;
 const account=profile?<ProfilePanel profile={profile} plan={planRow(s)}/>:<ErrorState message={t('accountLoadError')} onRetry={()=>router.refresh()}/>;
 if(!s&&error)return <div className="settings-stack"><ErrorState message={error} onRetry={()=>{router.refresh();void loadAll();}}/>{card('account',account)}</div>;
 if(!s||!draft||!saved||ownerPhone===undefined)return <div className="settings-stack">{SETTINGS_SECTIONS.map(id=><div key={id} className="surface-card settings-section skeleton-card" aria-busy="true"/>)}</div>;
 const legacy=!s.instruction_answers;
 const night=draft.dnd&&draft.quiet_start&&draft.quiet_end&&draft.quiet_start>draft.quiet_end;
 const showBar=isDirty||status.kind==='saving'||status.kind==='saved'||status.kind==='error';
 return <div className={`settings-stack ${showBar?'has-save-bar':''}`}>{error?<p role="alert" className="error-copy">{error}</p>:null}
  <SettingsSectionBoundary render={()=>card('assistant',<>
   <Row label={t('assistantName')} help={t('assistantNameHelp')} htmlFor="settings-assistant-name"><input id="settings-assistant-name" className="field-control field-text" dir="auto" maxLength={60} value={draft.assistant_name} onChange={e=>set('assistant_name',e.target.value)}/></Row>
   <div className="setting-row"><Switch label={t('z9Polish')} checked={draft.polish_owner_answer} onChange={checked=>set('polish_owner_answer',checked)}/><span className="setting-help">{t('z9PolishHelp')}</span></div>
   <div className="setting-row"><div className="setting-inline"><label className="setting-label" htmlFor="settings-auto-resume">{t('z9ResumeBefore')}</label><input id="settings-auto-resume" aria-label={t('z9ResumeLabel')} className="field-control field-number" type="number" inputMode="numeric" min={1} max={48} step={1} value={draft.auto_resume_hours} onChange={e=>set('auto_resume_hours',e.target.value===''?'':Number(e.target.value))}/><span>{t('z9ResumeAfter')}</span></div></div>
   {legacy?<><div className="settings-subsection"><AssistantSettings styleOnly/></div><div className="settings-subsection"><h3>{t('discoveryTitle')}</h3><DiscoveryQuestions/></div><div className="settings-subsection"><h3>{t('greetingTitle')}</h3><GreetingTemplates/></div></>:null}
  </>)}/>
  <SettingsSectionBoundary render={()=>card('business',<>
   <Row label={t('businessLabel')} htmlFor="settings-business-name"><input id="settings-business-name" className="field-control field-text" dir="auto" maxLength={100} value={draft.business_name} onChange={e=>set('business_name',e.target.value)}/></Row>
   <Row label={t('businessSectorOptional')} htmlFor="settings-business-sector"><SectorInput id="settings-business-sector" className="field-control field-text" value={draft.business_sector} onChange={value=>set('business_sector',value)}/></Row>
   <Row label={t('z9OwnerName')} help={t('ownerNameHelp')} htmlFor="settings-owner-name"><input id="settings-owner-name" className="field-control field-text" dir="auto" maxLength={100} value={draft.owner_name} onChange={e=>set('owner_name',e.target.value)}/></Row>
   <Row label={t('timeZone')} htmlFor="settings-time-zone"><Select id="settings-time-zone" className="field-control field-list" value={draft.time_zone} onChange={e=>set('time_zone',e.target.value)}>{s.supported_time_zones.map(zone=><option key={zone} value={zone}>{timeZoneLabel(zone,tag,t,now)}</option>)}</Select></Row>
  </>)}/>
  <SettingsSectionBoundary render={()=>card('contact',<>
   {ownerPhone?<OwnerPhoneSettings initial={ownerPhone}/>:<p role="alert" className="error-copy">{t('ownerLoadError')}</p>}
   <Row label={t('z9OwnerLanguage')} htmlFor="settings-owner-language"><Select id="settings-owner-language" className="field-control field-list" value={draft.owner_language} onChange={e=>set('owner_language',e.target.value as Draft['owner_language'])}><option value="he">{t('hebrew')}</option><option value="ru">{t('russian')}</option><option value="en">{t('english')}</option></Select></Row>
   <Row label={t('z9Summary')}><div className="setting-inline"><Select aria-label={t('summaryFrequency')} className="field-control field-list" value={draft.summary_frequency} onChange={e=>set('summary_frequency',e.target.value as Draft['summary_frequency'])}><option value="off">{t('off')}</option><option value="daily">{t('daily')}</option><option value="weekly">{t('weekly')}</option></Select>
    {draft.summary_frequency!=='off'?<input aria-label={t('summaryTime')} className="field-control field-time" type="time" value={draft.summary_time} onChange={e=>set('summary_time',e.target.value)}/>:null}
    {draft.summary_frequency==='weekly'?<Select aria-label={t('summaryDay')} className="field-control field-list" value={draft.summary_weekday} onChange={e=>set('summary_weekday',Number(e.target.value))}>{DAYS.map((value,index)=><option key={value} value={index}>{value}</option>)}</Select>:null}</div></Row>
  </>)}/>
  <SettingsSectionBoundary render={()=>card('quiet',<>
   <div className="setting-row"><Switch label={t('dndSwitch')} checked={draft.dnd} onChange={checked=>set('dnd',checked)}/><span className="setting-help">{t('dndHelp')}</span></div>
   {draft.dnd?<div className="setting-row"><div className="setting-inline dnd-range"><span>{t('z9From')}</span><input aria-label={t('dndStart')} className="field-control field-time" type="time" value={draft.quiet_start} onChange={e=>set('quiet_start',e.target.value)}/><span>{t('z9To')}</span><input aria-label={t('dndEnd')} className="field-control field-time" type="time" value={draft.quiet_end} onChange={e=>set('quiet_end',e.target.value)}/></div>
    {problem==='quiet_equal'?<p role="alert" className="error-copy">{t('quietHoursEqual')}</p>:problem==='quiet_missing'?<p className="setting-help">{t('quietHoursMissing')}</p>:<p className="setting-help">{draft.quiet_start} – {draft.quiet_end}{night?` ${t('untilMorning')}`:''}</p>}</div>:null}
   <div className="settings-subsection exception-section"><h3>{t('z9Exceptions')}</h3><ExceptionCalendar items={s.exceptions} selectedStart={exception.start_date} selectedEnd={exception.end_date} onRange={(start_date,end_date)=>setException(x=>({...x,start_date,end_date}))} onRemove={id=>void remove(id)}/>{s.exceptions.length===0?<p className="muted">{t('noHolidays')}</p>:<div className="exception-list">{s.exceptions.map(x=><article key={x.id}><div><strong>{x.name}</strong><p>{x.start_date} — {x.end_date}{x.recurs_annually?` · ${t('annual')}`:''}</p><small>{x.kind==='day_off'?t('dayOff'):`${t('workingHours')} ${x.work_start?.slice(0,5)}—${x.work_end?.slice(0,5)}`}</small></div><div className="row-actions"><Button type="button" tone="quiet" className="small" onClick={()=>{setEditing(x.id);setException({...x})}}>{t('edit')}</Button><Button type="button" tone="quiet" className="small" onClick={()=>void remove(x.id)}>{t('delete')}</Button></div></article>)}</div>}
    {/* Its own form (not in the save bar): exceptions are added and removed at once. Not a <form>: nested forms are not allowed. */}
    <div className="compact-form exception-form" role="group" aria-label={editing?t('editException'):t('addException')}><p className="muted">{exception.start_date?`${t('selected')}: ${exception.start_date} — ${exception.end_date}`:t('chooseCalendarRange')}</p><div className="settings-fields"><input className="field-control field-text" placeholder={t('name')} value={exception.name} onChange={e=>setException({...exception,name:e.target.value})}/><Select className="field-control field-list" value={exception.kind} onChange={e=>setException({...exception,kind:e.target.value as X['kind'],work_start:null,work_end:null})}><option value="day_off">{t('dayOff')}</option><option value="special_hours">{t('specialHours')}</option></Select></div>{exception.kind==='special_hours'?<div className="setting-inline"><input aria-label={`${t('specialHours')} start`} className="field-control field-time" type="time" value={exception.work_start||''} onChange={e=>setException({...exception,work_start:e.target.value})}/><span>—</span><input aria-label={`${t('specialHours')} end`} className="field-control field-time" type="time" value={exception.work_end||''} onChange={e=>setException({...exception,work_end:e.target.value})}/></div>:null}<Check label={t('repeatAnnually')} checked={exception.recurs_annually} onChange={checked=>setException({...exception,recurs_annually:checked})}/><div className="row-actions"><Button type="button" tone="secondary" className="small" disabled={busy||!exception.start_date||!exception.name.trim()||exception.kind==='special_hours'&&(!exception.work_start||!exception.work_end)} onClick={e=>void saveX(e as unknown as FormEvent)}>{editing?t('save'):t('addException')}</Button>{editing?<Button type="button" tone="quiet" className="small" onClick={()=>{setEditing(null);setException(blank())}}>{t('cancel')}</Button>:null}</div></div></div>
  </>)}/>
  <SettingsSectionBoundary render={()=>card('whatsapp',<WhatsAppStatus/>)}/>
  <SettingsSectionBoundary render={()=>card('account',account)}/>
  {showBar?<div ref={barRef} className={`save-bar save-bar-${status.kind}`} role="region" aria-label={t('saveBarLabel')}>
   <p role="status">{status.kind==='saved'?`✓ ${t('savedShort')}`:status.kind==='error'?<span className="error-copy">{t('saveNotSavedShort')}</span>:problem?<span className="warning-copy">{t(problem==='quiet_equal'?'quietHoursEqual':problem==='quiet_missing'?'quietHoursMissing':'requiredFieldsMissing')}</span>:t('unsavedChanges')}</p>
   {status.kind==='saved'?null:<div className="save-bar-actions"><Button type="button" tone="quiet" disabled={status.kind==='saving'} onClick={()=>{setDraft(saved);setStatus({kind:'idle'});}}>{t('z9Cancel')}</Button><Button type="button" disabled={status.kind==='saving'||Boolean(problem)} onClick={()=>void save()}>{status.kind==='saving'?t('saving'):status.kind==='error'?t('z9Retry'):t('save')}</Button></div>}
  </div>:null}
  <ConfirmDialog open={leave.asking} title={t('leaveWithoutSaving')} confirmLabel={t('leaveAction')} onCancel={leave.stay} onConfirm={leave.go}><p>{t('leaveWithoutSavingText')}</p></ConfirmDialog>
 </div>;
}
