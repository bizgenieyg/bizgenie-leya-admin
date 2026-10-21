'use client';
import {useI18n} from '@/lib/i18n';
import {sectorSuggestions} from '@/lib/tenant/labels';

/** Z8: «Сфера» with grouped suggestions (ru/he/en); free input stays. The group is the option label. */
export default function SectorInput({id,value,onChange,disabled=false,className='field-control'}:{id:string;value:string;onChange:(value:string)=>void;disabled?:boolean;className?:string}){
 const{t}=useI18n();
 return <><input id={id} className={`${className} business-sector-input`} dir="auto" list={`${id}-options`} maxLength={100} disabled={disabled} value={value} onChange={event=>onChange(event.target.value)} placeholder={t('businessSectorPlaceholder')}/>
  <datalist id={`${id}-options`}>{sectorSuggestions(t).flatMap(group=>group.items.map(item=><option key={`${group.key}-${item}`} value={item} label={group.label}/>))}</datalist></>;
}
