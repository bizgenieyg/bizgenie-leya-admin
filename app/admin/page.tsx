'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import OwnerSummary from '@/components/tenant/owner-summary';
import EmergencyStop from '@/components/tenant/emergency-stop';
import WhatsAppHomeCard from '@/components/tenant/whatsapp-home-card';
import FeedbackCard from '@/components/tenant/feedback-card';
import AppShell from '@/components/ui/app-shell';
import PageHeading from '@/components/ui/page-heading';
import {useI18n} from '@/lib/i18n';
import {requestSession} from '@/lib/waha/connection';
import {displayPhone,whatsappCardState} from '@/lib/tenant/labels';

type Home={status:string;businessPhone:string|null;ownerPhone:string;paused:boolean|undefined;questions:number;improve:number};

/**
 * Z8 «Главная»: the WhatsApp card, then «Вопросы к вам» / «Можно улучшить» (only when N > 0), the summary.
 * Everything that depends on loaded data waits for it (a placeholder of the card's height meanwhile), so after a
 * reload nothing appears or disappears.
 */
export default function AdminPage(){
 const{t}=useI18n();
 const[home,setHome]=useState<Home|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  const json=(path:string)=>fetch(path,{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():null).catch(()=>null);
  void Promise.all([requestSession('/api/waha/status',controller.signal).catch(()=>({status:'FAILED',qrAvailable:false})),json('/api/tenant-settings'),json('/api/knowledge-profile')]).then(([session,settings,profile])=>{
   if(controller.signal.aborted)return;
   const s=settings?.settings;
   setHome({status:session.status,businessPhone:'phone' in session&&session.phone?session.phone:null,ownerPhone:displayPhone(s?.owner_phone),paused:typeof s?.auto_replies_paused==='boolean'?s.auto_replies_paused:undefined,
    questions:Array.isArray(profile?.owner_questions)?profile.owner_questions.length:0,improve:Array.isArray(profile?.audit)?profile.audit.length:0});
  });
  return()=>controller.abort();
 },[]);
 return <AppShell><main className="page-wrap"><div className="content-stack">
  <PageHeading title={t('helloTitle')}/>
  <WhatsAppHomeCard state={home?whatsappCardState(home.status):'loading'} businessPhone={home?.businessPhone??null} ownerPhone={home?.ownerPhone??''}/>
  {home&&(home.questions||home.improve)?<div className="home-badges">
   {home.questions?<Link className="soft-badge attention" href="/admin/knowledge#kp-questions-title">{t('homeQuestions',{count:home.questions})}</Link>:null}
   {home.improve?<Link className="soft-badge" href="/admin/knowledge#kp-audit-title">{t('homeImprove',{count:home.improve})}</Link>:null}
  </div>:null}
  {home?<EmergencyStop launchGuide initialPaused={home.paused}/>:null}
  <OwnerSummary/><FeedbackCard/>
 </div></main></AppShell>;
}
