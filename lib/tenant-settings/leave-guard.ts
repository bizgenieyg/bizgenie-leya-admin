'use client';
import {useCallback,useEffect,useRef,useState,type RefObject} from 'react';
import {useRouter} from 'next/navigation';

/**
 * Z9: leaving «Настройки» with unsaved changes asks «Уйти без сохранения?» — a link in the menu (or anywhere on the
 * page), the browser «назад», and closing the tab (the browser's own dialog). `asking` drives a ConfirmDialog.
 */
export function useLeaveGuard(dirty:boolean){
 const router=useRouter();
 const[asking,setAsking]=useState(false);
 const target=useRef<string|null>(null),dirtyRef=useRef(dirty),guarded=useRef(false);
 dirtyRef.current=dirty;
 useEffect(()=>{
  if(!dirty)return;
  const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  const click=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const link=(event.target as Element|null)?.closest?.('a[href]') as HTMLAnchorElement|null;
   if(!link||link.target==='_blank'||link.hasAttribute('download'))return;
   const url=new URL(link.href,window.location.href);
   if(url.origin!==window.location.origin||url.pathname===window.location.pathname&&url.search===window.location.search)return;
   event.preventDefault();event.stopPropagation();target.current=url.pathname+url.search+url.hash;setAsking(true);
  };
  // «Назад»: one extra entry of this page (with the router's own state, so the router treats it as this page).
  if(!guarded.current){window.history.pushState({...(window.history.state??{}),leyaLeaveGuard:true},'',window.location.href);guarded.current=true;}
  const back=()=>{if(!dirtyRef.current)return;window.history.pushState({...(window.history.state??{}),leyaLeaveGuard:true},'',window.location.href);target.current='back';setAsking(true);};
  window.addEventListener('beforeunload',unload);
  document.addEventListener('click',click,true);
  window.addEventListener('popstate',back);
  return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',click,true);window.removeEventListener('popstate',back);};
 },[dirty]);
 // Saved or cancelled: the extra entry is dropped so «назад» works as usual again.
 useEffect(()=>{if(!dirty&&guarded.current){guarded.current=false;if(window.history.state?.leyaLeaveGuard)window.history.back();}},[dirty]);
 const stay=useCallback(()=>{target.current=null;setAsking(false);},[]);
 const go=useCallback(()=>{const next=target.current;target.current=null;setAsking(false);dirtyRef.current=false;guarded.current=false;
  if(next==='back')window.history.go(-2);else if(next)router.push(next);},[router]);
 return {asking,stay,go};
}

/**
 * Z9, phones: the save bar stays above the on-screen keyboard (iOS Safari keeps fixed elements behind it) and the
 * page gets a bottom padding of the bar's height, so the bar never covers the field being edited.
 */
export function useKeyboardInset(bar:RefObject<HTMLElement>,active:boolean){
 useEffect(()=>{
  const root=document.documentElement,viewport=window.visualViewport;
  if(!active){root.style.removeProperty('--save-bar-height');root.style.removeProperty('--keyboard-inset');return;}
  const update=()=>{
   const inset=viewport?Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop):0;
   root.style.setProperty('--keyboard-inset',`${inset}px`);
   root.style.setProperty('--save-bar-height',`${bar.current?.offsetHeight??0}px`);
  };
  update();
  viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);window.addEventListener('resize',update);
  return()=>{viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);window.removeEventListener('resize',update);root.style.removeProperty('--save-bar-height');root.style.removeProperty('--keyboard-inset');};
 },[bar,active]);
}
