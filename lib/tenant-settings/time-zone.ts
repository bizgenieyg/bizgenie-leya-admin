export function intlTimeZone(zone:string):string{
 const match=/^UTC([+-])(\d{1,2})$/.exec(zone);if(!match)return zone;
 return `Etc/GMT${match[1]==='+'?'-':'+'}${Number(match[2])}`;
}
