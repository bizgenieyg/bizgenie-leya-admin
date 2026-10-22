export function intlTimeZone(zone:string):string{
 const match=/^UTC([+-])(\d{1,2})$/.exec(zone);if(!match)return zone;
 return `Etc/GMT${match[1]==='+'?'-':'+'}${Number(match[2])}`;
}

/** Z9: «Иерусалим · сейчас 14:53» — the city from the dictionaries (an offset zone stays «UTC+3»), the local time now. */
export function localTime(zone:string,locale:string,now=new Date()):string{
 return new Intl.DateTimeFormat(locale,{timeZone:intlTimeZone(zone),hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
}
export function timeZoneLabel(zone:string,locale:string,t:(key:string,vars?:Record<string,string|number>)=>string,now=new Date()):string{
 const key=`tzCity_${zone.replace(/[^A-Za-z0-9]/g,'_')}`,city=/^UTC[+-]\d{1,2}$/.test(zone)?zone:t(key)===key?zone.split('/').pop()!.replace(/_/g,' '):t(key);
 return t('timeZoneNow',{city,time:localTime(zone,locale,now)});
}
