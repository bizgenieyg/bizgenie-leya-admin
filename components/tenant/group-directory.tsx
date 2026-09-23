'use client';

import {useCallback,useEffect,useState} from 'react';
import {useFormat,useI18n} from '@/lib/i18n';

type Group={id:string;name:string;participantsCount:number;lastActivityAt?:string};

function initials(name:string){
  return name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part.charAt(0)).join('').toLocaleUpperCase()||'WA';
}

export default function GroupDirectory(){
  const{t}=useI18n(),format=useFormat();
  const[groups,setGroups]=useState<Group[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{const response=await fetch('/api/groups',{cache:'no-store'}),payload=await response.json();if(!response.ok)throw new Error();setGroups(Array.isArray(payload.groups)?payload.groups:[]);}catch{setError(t('groupsLoadError'));}finally{setLoading(false);}},[t]);
  useEffect(()=>{void load();},[load]);
  if(loading)return <div className="state-card"><span className="spinner"/><span>{t('loading')}</span></div>;
  if(error)return <div className="error-state"><span>{error}</span><button type="button" onClick={()=>void load()}>{t('tryAgain')}</button></div>;
  if(!groups.length)return <div className="empty-state"><strong>{t('noGroups')}</strong><span>{t('noGroupsHelp')}</span></div>;
  return <ul className="group-list">{groups.map(group=><li key={group.id} className="group-card"><span className="group-avatar" aria-hidden="true">{initials(group.name)}</span><span className="group-copy"><strong>{group.name}</strong><small>{t('groupMembers',{count:format.number(group.participantsCount)})}</small></span>{group.lastActivityAt?<time dateTime={group.lastActivityAt}>{format.date(group.lastActivityAt)===format.date(new Date())?format.time(group.lastActivityAt):format.date(group.lastActivityAt)}</time>:null}</li>)}</ul>;
}
