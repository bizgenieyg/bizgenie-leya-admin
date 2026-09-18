type Translate=(key:string)=>string;

const supported=new Set([
 'settingsRestricted','settingsInvalid','ownerSettingsInvalid','ownerWhatsappRequired',
 'ownerPairSendFailed','exceptionInvalid','serviceUnavailable','simulatorLimitError',
 'simulatorProcessingError','simulatorInvalidMessage','wahaStatusUnavailable',
]);

export function translatedApiError(t:Translate,payload:unknown,fallback:string):string{
 const code=payload&&typeof payload==='object'&&typeof (payload as {code?:unknown}).code==='string'
  ?(payload as {code:string}).code:'';
 return t(supported.has(code)?code:fallback);
}
