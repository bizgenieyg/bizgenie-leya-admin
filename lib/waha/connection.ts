export const isConnected = (status: string) => status === 'WORKING';
export const isFailed = (status: string) => ['FAILED', 'STOPPED', 'DISCONNECTED'].includes(status);
export const backendUnavailable = 'Бэкенд недоступен. Попробуйте подключиться позже.';
export const shouldPoll = (status: string) => ['STARTING', 'SCAN_QR_CODE'].includes(status);
export type SessionState = { status: string; qrAvailable: boolean; reason?: string };

export function statusLabel(status: string) {
  switch (status) {
    case 'NOT_CREATED': return 'Не подключено';
    case 'STOPPED': case 'DISCONNECTED': return 'Отключено';
    case 'STARTING': return 'Подключаем...';
    case 'SCAN_QR_CODE': return 'Ожидаем сканирования QR-кода.';
    case 'WORKING': return 'Подключено';
    case 'FAILED': return 'Не удалось подключиться';
    default: return status;
  }
}
export function actionLabel(status: string) {
  if (status === 'NOT_CREATED') return 'Подключить WhatsApp';
  if (status === 'STOPPED' || status === 'DISCONNECTED') return 'Подключить';
  return 'Попробовать заново';
}

export async function requestSession(path: string, signal: AbortSignal, method = 'GET'): Promise<SessionState> {
  let response: Response;
  try { response = await fetch(path, { method, signal, cache: 'no-store' }); }
  catch { throw new Error(backendUnavailable); }
  if (!response.ok) {
    if (response.status >= 500) throw new Error(backendUnavailable);
    if (response.status === 401) throw new Error('Сессия истекла. Войдите снова.');
    if (response.status === 403) throw new Error('Нет доступа к подключению WhatsApp.');
    if (response.status === 409) throw new Error('Не удалось выполнить действие. Обновите статус подключения.');
    throw new Error('Не удалось выполнить запрос. Попробуйте ещё раз.');
  }
  let data;
  try { data = await response.json(); } catch { throw new Error('Получен некорректный ответ о статусе WhatsApp.'); }
  if (typeof data.status !== 'string' || !data.status.trim()) throw new Error('Получен некорректный ответ о статусе WhatsApp.');
  const status = data.status.trim();
  return { status, qrAvailable: status === 'SCAN_QR_CODE' && data.qrAvailable !== false,
    ...(status === 'FAILED' && typeof data.reason === 'string' ? { reason: data.reason } : {}) };
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
