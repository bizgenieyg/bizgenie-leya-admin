'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {Button,ConfirmDialog,ErrorState} from '@/components/ui/primitives';
import {useI18n} from '@/lib/i18n';

export default function EmergencyStop({showHelp=false,launchGuide=false}:{showHelp?:boolean;launchGuide?:boolean}){
 const{t}=useI18n(),[paused,setPaused]=useState<boolean|null>(null),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{void fetch('/api/tenant-settings',{cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error();return response.json()}).then(x=>setPaused(Boolean(x.settings?.auto_replies_paused))).catch(()=>setError(t('emergencyLoadError')))},[t]);
 async function toggle(){setConfirm(false);setBusy(true);try{const response=await fetch('/api/tenant-settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({auto_replies_paused:!paused})});if(!response.ok)throw new Error();setPaused(value=>!value);setError('');}catch{setError(t('emergencySaveError'));}finally{setBusy(false)}}
 const dialog=<ConfirmDialog open={confirm} title={paused?t('enableClientReplies'):t('stopAllReplies')} danger={!paused} onCancel={()=>setConfirm(false)} onConfirm={()=>void toggle()}><p>{paused?t('resumeAllConfirm'):t('stopAllConfirm')}</p></ConfirmDialog>;
 if(launchGuide&&paused)return <section className="launch-guide" aria-labelledby="launch-guide-title"><div><p className="card-kicker">{t('safeStartKicker')}</p><h2 id="launch-guide-title">{t('repliesPausedTitle')}</h2><p>{t('repliesPausedHelp')}</p></div>{error?<ErrorState message={error}/>:null}<ol><li><Link href="/admin/knowledge">{t('launchAddKnowledge')}</Link></li><li><a href="#simulator">{t('launchTestSimulator')}</a></li><li><Link href="/admin/settings#owner-contact">{t('launchAddOwnerPhone')}</Link></li></ol><Button disabled={busy} onClick={()=>setConfirm(true)}>{t('enableClientReplies')}</Button>{dialog}</section>;
 return <div className="emergency-control">{showHelp?<div><h3>{t('clientReplies')}</h3><p className="muted">{paused?t('resumeAllConfirm'):t('stopAllConfirm')}</p></div>:null}{error?<ErrorState message={error}/>:null}<Button tone={paused?'primary':'danger'} disabled={paused===null||busy} onClick={()=>setConfirm(true)}>{paused?t('resumeAllReplies'):t('stopAllReplies')}</Button>{dialog}</div>;
}
