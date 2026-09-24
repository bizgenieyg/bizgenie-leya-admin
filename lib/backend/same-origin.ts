/** Same-origin guard for mutating cabinet routes: blocks cross-site requests before any privileged backend call. */
export function isSameOrigin(request:Request):boolean{
 const expected=new URL(request.url);expected.host=request.headers.get('host')??expected.host;
 return request.headers.get('origin')===expected.origin;
}
export const isMutation=(request:Request)=>!['GET','HEAD','OPTIONS'].includes(request.method.toUpperCase());
