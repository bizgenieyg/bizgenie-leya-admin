export function intlTimeZone(zone:string):string{
 const match=/^UTC([+-])(\d{1,2})$/.exec(zone);if(!match)return zone;
 return `Etc/GMT${match[1]==='+'?'-':'+'}${Number(match[2])}`;
}

export function timeZoneOptionLabel(zone:string,locale:string,now=new Date()):string{
 const parts=new Intl.DateTimeFormat(locale,{timeZone:intlTimeZone(zone),hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'shortOffset'}).formatToParts(now);
 const time=parts.filter(part=>part.type==='hour'||part.type==='minute').map(part=>part.value).join(':');
 const offset=parts.find(part=>part.type==='timeZoneName')?.value??'UTC';
 return `${zone} · ${offset} · ${time}`;
}
