export const isConnected = (status: string) => status === 'WORKING';
export const isFailed = (status: string) => ['FAILED', 'STOPPED', 'DISCONNECTED'].includes(status);
export const backendUnavailable = 'backendUnavailable';
export const connectionErrorKeys={unauthorized:'connectionSessionExpired',forbidden:'connectionForbidden',conflict:'connectionConflict',request:'connectionRequestError',invalidResponse:'connectionInvalidResponse'} as const;
export const shouldPoll = (status: string) => ['STARTING', 'SCAN_QR_CODE'].includes(status);
export type SessionState = { status: string; qrAvailable: boolean; reason?: string; numberChanged?: boolean };

export async function requestSession(path: string, signal: AbortSignal, method = 'GET'): Promise<SessionState> {
  let response: Response;
  try { response = await fetch(path, { method, signal, cache: 'no-store' }); }
  catch { throw new Error(backendUnavailable); }
  if (!response.ok) {
    if (response.status >= 500) throw new Error(backendUnavailable);
    if (response.status === 401) throw new Error(connectionErrorKeys.unauthorized);
    if (response.status === 403) throw new Error(connectionErrorKeys.forbidden);
    if (response.status === 409) throw new Error(connectionErrorKeys.conflict);
    throw new Error(connectionErrorKeys.request);
  }
  let data;
  try { data = await response.json(); } catch { throw new Error(connectionErrorKeys.invalidResponse); }
  if (typeof data.status !== 'string' || !data.status.trim()) throw new Error(connectionErrorKeys.invalidResponse);
  const status = data.status.trim();
  return { status, qrAvailable: status === 'SCAN_QR_CODE' && data.qrAvailable !== false,
    ...(status === 'FAILED' && typeof data.reason === 'string' ? { reason: data.reason } : {}),
    ...(data.numberChanged === true ? { numberChanged: true } : {}) };
}
export async function requestStatus(path: string, signal: AbortSignal, method = 'GET') {
  return (await requestSession(path, signal, method)).status;
}
export async function beginSession(signal: AbortSignal, retry: boolean) {
  const state = await requestSession('/api/waha/status', signal);
  if (state.status === 'NOT_CREATED') return requestSession('/api/waha/create', signal, 'POST');
  if (retry && !isConnected(state.status) && !shouldPoll(state.status)) return requestSession('/api/waha/reconnect', signal, 'POST');
  return state;
}
export async function beginConnection(signal: AbortSignal, retry: boolean) {
  return (await beginSession(signal, retry)).status;
}
