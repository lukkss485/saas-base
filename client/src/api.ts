const BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
}

export async function api<T = any>(
  path: string,
  { method = 'GET', body }: RequestOptions = {}
): Promise<T> {
  const token = localStorage.getItem('token');

  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Não foi possível conectar à API. Verifique sua conexão.');
  }

  if (res.status === 401 && token) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return undefined as T;
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Resposta não é JSON (ex.: erro de proxy ou página de manutenção)
  }

  if (!res.ok) {
    const detail = data?.error || data?.message || text.slice(0, 120);
    throw new Error(`Erro ${res.status}: ${detail || 'sem detalhes'}`);
  }

  return data as T;
}