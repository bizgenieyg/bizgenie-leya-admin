'use client';
import type {ButtonHTMLAttributes,ReactNode} from 'react';
import {useI18n} from '@/lib/i18n';

export function Spinner(){return <span className="spinner" aria-hidden="true"/>}
export function LoadingState({label}:{label:string}){return <div className="state-card" role="status"><Spinner/><p>{label}</p></div>}
export function EmptyState({title,action}:{title:string;action?:ReactNode}){return <div className="state-card empty-state"><span className="state-mark">＋</span><p>{title}</p>{action}</div>}
export function ErrorState({message,onRetry}:{message:string;onRetry?:()=>void}){const{t}=useI18n();return <div className="state-card error-state" role="alert"><span className="state-mark">!</span><p>{message}</p>{onRetry&&<button type="button" className="button secondary" onClick={onRetry}>{t('tryAgain')}</button>}</div>}
export function Button({tone='primary',className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{tone?:'primary'|'secondary'|'danger'|'quiet'}){return <button {...props} className={`button ${tone} ${className}`.trim()}/>}
export function Switch({checked,onChange,label}:{checked:boolean;onChange:(checked:boolean)=>void;label:string}){return <label className="switch-row"><span>{label}</span><input className="sr-only" type="checkbox" checked={checked} onChange={event=>onChange(event.target.checked)}/><span className="switch" aria-hidden="true"><span/></span></label>}
export function ConfirmDialog({open,title,children,danger=false,onCancel,onConfirm}:{open:boolean;title:string;children:ReactNode;danger?:boolean;onCancel:()=>void;onConfirm:()=>void}){const{t}=useI18n();if(!open)return null;return <div className="dialog-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onCancel()}}><section className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><h2 id="confirm-title">{title}</h2><div>{children}</div><div className="dialog-actions"><Button tone="secondary" onClick={onCancel}>{t('cancel')}</Button><Button tone={danger?'danger':'primary'} onClick={onConfirm}>{t('confirmAction')}</Button></div></section></div>}
