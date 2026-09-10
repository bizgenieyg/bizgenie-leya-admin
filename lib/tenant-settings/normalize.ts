type RecordValue=Record<string,unknown>;
const object=(value:unknown):RecordValue=>value&&typeof value==='object'&&!Array.isArray(value)?value as RecordValue:{};
const number=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const strings=(value:unknown,fallback:string[])=>Array.isArray(value)&&value.every(x=>typeof x==='string')?value:fallback;
const routes=(value:unknown,key:'keyword'|'source')=>Array.isArray(value)?value.filter(x=>typeof object(x)[key]==='string'&&typeof object(x).agent==='string'):[];
const day={mode:'working_day'};
const schedule=(value:unknown)=>{const source=object(value);return Object.fromEntries(Array.from({length:7},(_,i)=>{const row=object(source[String(i)]);return[String(i),['working_day','day_off','working_hours'].includes(String(row.mode))?row:day];}));};
const DEFAULT_TIME_ZONES=['Asia/Jerusalem','Europe/Moscow','Europe/London','America/New_York','America/Los_Angeles','Asia/Dubai',...Array.from({length:27},(_,i)=>i===12?'UTC':`UTC${i<12?'-':'+'}${Math.abs(i-12)}`)];
const timeZones=(value:unknown)=>Array.from(new Set([...strings(value,[]),...DEFAULT_TIME_ZONES]));

export function normalizeTenantSettings(value:unknown){const raw=object(value);return{
 messages_per_month:number(raw.messages_per_month,0),voice_minutes_per_month:number(raw.voice_minutes_per_month,0),warning_percent:number(raw.warning_percent,80),plan:typeof raw.plan==='string'?raw.plan:null,
 time_zone:typeof raw.time_zone==='string'?raw.time_zone:'Asia/Jerusalem',supported_time_zones:timeZones(raw.supported_time_zones),weekly_schedule:schedule(raw.weekly_schedule),
 auto_replies_paused:raw.auto_replies_paused===true,translate_owner_answer:raw.translate_owner_answer===true,escalation_remind_minutes:number(raw.escalation_remind_minutes,120),escalation_close_minutes:number(raw.escalation_close_minutes,1440),
 auto_resume_hours:number(raw.auto_resume_hours,0),deferred_max_age_hours:number(raw.deferred_max_age_hours,12),context_message_count:number(raw.context_message_count,10),context_retention_hours:number(raw.context_retention_hours,48),message_retention_days:number(raw.message_retention_days,30),
 enabled_agents:strings(raw.enabled_agents,['SALE','SUPPORT']),intent_confidence_threshold:number(raw.intent_confidence_threshold,.75),route_stickiness_hours:number(raw.route_stickiness_hours,24),reception_max_messages:number(raw.reception_max_messages,0),
 campaign_routes:routes(raw.campaign_routes,'keyword'),source_routes:routes(raw.source_routes,'source'),templates:object(raw.templates),owner_phone:typeof raw.owner_phone==='string'?raw.owner_phone:'',paired:raw.paired===true,exceptions:Array.isArray(raw.exceptions)?raw.exceptions:[],summary_frequency:['off','daily','weekly'].includes(String(raw.summary_frequency))?raw.summary_frequency:'weekly',summary_time:typeof raw.summary_time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.summary_time)?raw.summary_time:'09:00',summary_weekday:Number.isInteger(raw.summary_weekday)&&Number(raw.summary_weekday)>=0&&Number(raw.summary_weekday)<=6?Number(raw.summary_weekday):1,
};}
export function normalizeUsage(value:unknown){const raw=object(value),events=object(raw.events);return{messages_used:number(raw.messages_used,0),voice_minutes_used:number(raw.voice_minutes_used,0),period_end:typeof raw.period_end==='string'?raw.period_end:new Date().toISOString(),time_zone:typeof raw.time_zone==='string'?raw.time_zone:'Asia/Jerusalem',events:{model_calls:number(events.model_calls,0),stt_calls:number(events.stt_calls,0)}};}
