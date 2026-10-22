import type {SettingsSection} from '@/lib/tenant/labels';

/**
 * Z9 «Настройки»: the settings covered by the save bar, edited as one draft. `draftPatch` sends only what changed —
 * one PATCH /api/tenant-settings, one transaction on the backend. «Не беспокоить» off = empty quiet hours.
 */
export type Draft={
 assistant_name:string;polish_owner_answer:boolean;auto_resume_hours:number|'';
 business_name:string;business_sector:string;owner_name:string;time_zone:string;
 owner_language:'ru'|'en'|'he';summary_frequency:'off'|'daily'|'weekly';summary_time:string;summary_weekday:number;
 dnd:boolean;quiet_start:string;quiet_end:string;
};
const str=(value:unknown)=>typeof value==='string'?value:'';
export function draftFrom(settings:Record<string,unknown>):Draft{
 const start=str(settings.quiet_hours_start),end=str(settings.quiet_hours_end);
 return {assistant_name:str(settings.assistant_name),polish_owner_answer:settings.polish_owner_answer!==false,auto_resume_hours:Number(settings.auto_resume_hours)||'',
  business_name:str(settings.business_name),business_sector:str(settings.business_sector),owner_name:str(settings.owner_name),time_zone:str(settings.time_zone),
  owner_language:(['ru','en','he'].includes(str(settings.owner_language))?settings.owner_language:'he') as Draft['owner_language'],
  summary_frequency:(['off','daily','weekly'].includes(str(settings.summary_frequency))?settings.summary_frequency:'off') as Draft['summary_frequency'],
  summary_time:str(settings.summary_time),summary_weekday:Number(settings.summary_weekday)||0,
  // Empty quiet hours in the database → the switch is off (no time is shown or invented).
  dnd:Boolean(start&&end),quiet_start:start,quiet_end:end};
}
export const DRAFT_SECTIONS:Record<keyof Draft,SettingsSection>={
 assistant_name:'assistant',polish_owner_answer:'assistant',auto_resume_hours:'assistant',
 business_name:'business',business_sector:'business',owner_name:'business',time_zone:'business',
 owner_language:'contact',summary_frequency:'contact',summary_time:'contact',summary_weekday:'contact',
 dnd:'quiet',quiet_start:'quiet',quiet_end:'quiet',
};
const changed=(saved:Draft,draft:Draft)=>{
 const keys=(Object.keys(DRAFT_SECTIONS) as (keyof Draft)[]).filter(key=>saved[key]!==draft[key]);
 // Times typed in while «Не беспокоить» stays off change nothing.
 return !draft.dnd&&!saved.dnd?keys.filter(key=>key!=='quiet_start'&&key!=='quiet_end'):keys;
};
export function dirtySections(saved:Draft,draft:Draft):Set<SettingsSection>{return new Set(changed(saved,draft).map(key=>DRAFT_SECTIONS[key]));}
export type DraftProblem='required'|'quiet_missing'|'quiet_equal';
export function draftProblem(draft:Draft):DraftProblem|null{
 if(!draft.assistant_name.trim()||!draft.business_name.trim()||!draft.owner_name.trim()||draft.auto_resume_hours===''||draft.auto_resume_hours<1||draft.auto_resume_hours>48||!draft.time_zone)return 'required';
 if(draft.dnd&&(!draft.quiet_start||!draft.quiet_end))return 'quiet_missing';
 if(draft.dnd&&draft.quiet_start===draft.quiet_end)return 'quiet_equal';
 return null;
}
export function draftPatch(saved:Draft,draft:Draft):Record<string,unknown>{
 const patch:Record<string,unknown>={};
 for(const key of changed(saved,draft)){
  if(key==='dnd'||key==='quiet_start'||key==='quiet_end'){patch.quiet_hours_start=draft.dnd?draft.quiet_start:null;patch.quiet_hours_end=draft.dnd?draft.quiet_end:null;}
  else if(key==='auto_resume_hours')patch.auto_resume_hours=Math.round(Number(draft.auto_resume_hours));
  else if(typeof draft[key]==='string'&&key!=='time_zone'&&key!=='owner_language'&&key!=='summary_frequency'&&key!=='summary_time')patch[key]=(draft[key] as string).trim();
  else patch[key]=draft[key];
 }
 return patch;
}
/** After a save: the server values, except fields changed again after the request was sent (they stay unsaved). */
export function rebaseDraft(sent:Draft,current:Draft,server:Draft):Draft{
 return Object.fromEntries((Object.keys(DRAFT_SECTIONS) as (keyof Draft)[]).map(key=>[key,current[key]!==sent[key]?current[key]:server[key]])) as Draft;
}
