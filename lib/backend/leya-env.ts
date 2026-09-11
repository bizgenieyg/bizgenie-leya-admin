import 'server-only';

type Environment=Record<string,string|undefined>;
const warned=new Set<string>();

function preferred(source:Environment,current:string,legacy:string,warn:(message:string)=>void){
  const value=source[current]?.trim();
  if(value)return value;
  const fallback=source[legacy]?.trim();
  if(fallback&& !warned.has(legacy)){
    warned.add(legacy);
    warn(`deprecated_environment_variable ${legacy}; use ${current}`);
  }
  return fallback||undefined;
}

export function readLeyaBackendEnv(source:Environment=process.env,warn:(message:string)=>void=console.warn){
  return {
    apiUrl:preferred(source,'LEYA_API_URL','LEIA_API_URL',warn),
    adminApiKey:preferred(source,'LEYA_ADMIN_API_KEY','LEIA_ADMIN_API_KEY',warn),
  };
}
