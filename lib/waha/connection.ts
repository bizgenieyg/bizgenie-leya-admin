export const isConnected = (status: string) => status === 'WORKING' || status === 'CONNECTED';
export const isFailed = (status: string) => ['FAILED', 'STOPPED', 'DISCONNECTED'].includes(status);
export const backendUnavailable = 'Бэкенд недоступен. Попробуйте подключиться позже.';

export async function requestStatus(path: string, signal: AbortSignal, method = 'GET') {
  try {
    const response = await fetch(path, { method, signal, cache: 'no-store' });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Сессия истекла. Войдите снова.');
      if (response.status === 403) throw new Error('Нет доступа к подключению WhatsApp.');
      if (response.status === 409) throw new Error('Не удалось однозначно определить текущий бизнес.');
      throw new Error(backendUnavailable);
    }
    const data = await response.json();
    if (typeof data.status !== 'string' || !data.status.trim()) throw new Error(backendUnavailable);
    return data.status.toUpperCase() as string;
  } catch (error) {
    if (error instanceof Error && [backendUnavailable, 'Сессия истекла. Войдите снова.', 'Нет доступа к подключению WhatsApp.', 'Не удалось однозначно определить текущий бизнес.'].includes(error.message)) throw error;
    throw new Error(backendUnavailable);
  }
}

export async function beginConnection(signal: AbortSignal, retry: boolean) {
  const status = await requestStatus('/api/waha/status', signal);
  if (status === 'NOT_CREATED') return requestStatus('/api/waha/create', signal, 'POST');
  if (retry && isFailed(status)) return requestStatus('/api/waha/reconnect', signal, 'POST');
  // Unknown/nonterminal statuses still describe an existing session: never create it again.
  return status;
}
