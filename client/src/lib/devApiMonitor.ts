/* Development-only API monitor for NT-life.
 * Captures fetch requests/responses, classifies the API domain and records the current actor.
 * Sensitive keys are redacted; this is NOT a PostgreSQL query/audit log.
 */

export type DevApiActor = {
  id?: string | number;
  email?: string;
  name?: string;
  plan?: string;
} | null;

export type DevApiRecord = {
  id: number;
  startedAt: string;
  method: string;
  url: string;
  area: string;
  actor: string;
  status: number | null;
  ok: boolean | null;
  durationMs: number | null;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: string;
};

type Listener = (records: DevApiRecord[]) => void;

const MAX_RECORDS = 150;
const MAX_BODY_CHARS = 16_000;
const MAX_RAW_BODY_CHARS = 256_000;

const SENSITIVE_KEY =
  /(password|passwd|token|authorization|cookie|secret|api[_-]?key|credential|private[_-]?key|refresh[_-]?token)/i;

const IMAGE_KEY = /^(avatar|image|photo|picture|file|blob)$/i;

let records: DevApiRecord[] = [];
let nextId = 1;
let currentActor: DevApiActor = null;
let originalFetch: typeof window.fetch | null = null;

const listeners = new Set<Listener>();

function emit(): void {
  const snapshot = [...records];

  listeners.forEach((listener) => {
    listener(snapshot);
  });
}

export function getDevApiRecords(): DevApiRecord[] {
  return [...records];
}

export function subscribeDevApiRecords(
  listener: Listener,
): () => void {
  listeners.add(listener);
  listener(getDevApiRecords());

  return () => {
    listeners.delete(listener);
  };
}

export function setDevApiActor(actor: DevApiActor): void {
  currentActor = actor;
}

export function clearDevApiRecords(): void {
  records = [];
  emit();
}

function safeString(value: string): string {
  if (value.startsWith('data:image/')) {
    return '[imagem omitida]';
  }

  return value.length > MAX_BODY_CHARS
    ? `${value.slice(0, MAX_BODY_CHARS)}… [conteúdo truncado]`
    : value;
}

function sanitize(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEY.test(key)) {
    return '[REDACTED]';
  }

  if (IMAGE_KEY.test(key)) {
    return typeof value === 'string' && value.startsWith('data:')
      ? '[arquivo/imagem omitido]'
      : sanitize(value);
  }

  if (typeof value === 'string') {
    return safeString(value);
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 300)
      .map((item) => sanitize(item));
  }

  const result: Record<string, unknown> = {};

  for (const [childKey, childValue] of Object.entries(
    value as Record<string, unknown>,
  ).slice(0, 300)) {
    result[childKey] = sanitize(childValue, childKey);
  }

  return result;
}

function parseText(text: string): unknown {
  // Parse before truncating so a long JSON payload cannot bypass
  // key-based redaction.
  if (text.length > MAX_RAW_BODY_CHARS) {
    try {
      const parsed = sanitize(JSON.parse(text));
      const serialized = JSON.stringify(parsed);

      return serialized.length > MAX_BODY_CHARS
        ? `${serialized.slice(0, MAX_BODY_CHARS)}… [conteúdo truncado]`
        : parsed;
    } catch {
      return '[corpo textual muito grande omitido para segurança]';
    }
  }

  try {
    const parsed = sanitize(JSON.parse(text));
    const serialized = JSON.stringify(parsed);

    return serialized.length > MAX_BODY_CHARS
      ? `${serialized.slice(0, MAX_BODY_CHARS)}… [conteúdo truncado]`
      : parsed;
  } catch {
    // Redact common credential-like key/value pairs in non-JSON text.
    const redacted = text.replace(
      /(["']?(?:password|passwd|token|authorization|cookie|secret|api[_-]?key|credential|private[_-]?key|refresh[_-]?token)["']?\s*[:=]\s*)(["'][^"']*["']|[^,;\s}]+)/gi,
      '$1"[REDACTED]"',
    );

    return safeString(redacted);
  }
}

async function readRequestBody(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<unknown> {
  try {
    if (init?.body != null) {
      const body = init.body;

      if (typeof body === 'string') {
        return parseText(body);
      }

      if (body instanceof URLSearchParams) {
        return sanitize(Object.fromEntries(body.entries()));
      }

      if (body instanceof FormData) {
        const output: Record<string, unknown> = {};

        body.forEach((value, key) => {
          output[key] =
            value instanceof File
              ? {
                  fileName: value.name,
                  size: value.size,
                  type: value.type,
                }
              : value;
        });

        return sanitize(output);
      }

      if (body instanceof Blob) {
        return {
          type: body.type,
          size: body.size,
          content: '[blob omitido]',
        };
      }

      return '[corpo não textual omitido]';
    }

    if (input instanceof Request && input.body) {
      const text = await input.clone().text();
      return text ? parseText(text) : undefined;
    }
  } catch {
    return '[não foi possível ler o payload]';
  }

  return undefined;
}

async function readResponseBody(
  response: Response,
): Promise<unknown> {
  try {
    const contentType =
      response.headers.get('content-type') ?? '';

    if (
      !contentType.includes('json') &&
      !contentType.includes('text/')
    ) {
      return contentType
        ? `[corpo não exibido: ${contentType}]`
        : undefined;
    }

    const text = await response.clone().text();

    if (!text) {
      return undefined;
    }

    return parseText(text);
  } catch {
    return '[não foi possível ler a resposta]';
  }
}

function getUrl(input: RequestInfo | URL): URL | null {
  try {
    const value =
      input instanceof Request ? input.url : String(input);

    return new URL(value, window.location.href);
  } catch {
    return null;
  }
}

function classifyArea(pathname: string): string {
  const path = pathname.toLowerCase();

  if (/\/(auth|login|logout|dev)(\/|$)/.test(path)) {
    return 'auth';
  }

  if (
    /\/(finance|transactions|accounts|budgets|categories|billing|payments)(\/|$)/.test(
      path,
    )
  ) {
    return 'finance';
  }

  if (
    /\/(tasks|task|dashboard|important-days|calendar)(\/|$)/.test(
      path,
    )
  ) {
    return path.includes('dashboard')
      ? 'dashboard'
      : 'tasks/calendar';
  }

  if (/\/(team|members|invites|roles)(\/|$)/.test(path)) {
    return 'team';
  }

  if (/\/(reports|analytics|metrics)(\/|$)/.test(path)) {
    return 'reports';
  }

  if (/\/(projects|project|pages|notes)(\/|$)/.test(path)) {
    return 'projects/notes';
  }

  if (/\/(profile|me|settings|upload|avatar)(\/|$)/.test(path)) {
    return 'profile/settings';
  }

  if (/\/(notifications|activity)(\/|$)/.test(path)) {
    return 'notifications/activity';
  }

  if (path.startsWith('/api/')) {
    return 'api (não classificada)';
  }

  return 'outros';
}

function shouldCapture(url: URL): boolean {
  if (
    url.origin !== window.location.origin &&
    !/^(localhost|127\.0\.0\.1)$/.test(url.hostname)
  ) {
    return false;
  }

  const path = url.pathname.toLowerCase();

  if (
    /\.(js|mjs|css|map|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|eot|mp4|mp3)$/i.test(
      path,
    )
  ) {
    return false;
  }

  return (
    path.startsWith('/api/') ||
    /\/(auth|login|logout|dev|tasks|task|dashboard|important-days|calendar|team|members|invites|roles|reports|analytics|metrics|projects|project|pages|notes|profile|me|settings|upload|avatar|notifications|activity|finance|transactions|accounts|budgets|categories|billing|payments)(\/|$)/i.test(
      path,
    )
  );
}

function actorLabel(actor: DevApiActor): string {
  if (!actor) {
    return 'Não autenticado / não identificado';
  }

  const who = actor.email || actor.name || 'Usuário identificado';

  return actor.id != null
    ? `${who} · ID ${actor.id}`
    : who;
}

export function installDevApiMonitor(): void {
  if (
    !import.meta.env.DEV ||
    typeof window === 'undefined' ||
    originalFetch
  ) {
    return;
  }

  originalFetch = window.fetch.bind(window);

  const baseFetch = originalFetch;

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = getUrl(input);

    if (!url || !shouldCapture(url)) {
      return baseFetch(input, init);
    }

    const method = (
      init?.method ||
      (input instanceof Request ? input.method : 'GET')
    ).toUpperCase();

    const id = nextId++;
    const start = performance.now();
    const requestBodyPromise = readRequestBody(input, init);

    const record: DevApiRecord = {
      id,
      startedAt: new Date().toISOString(),
      method,
      url: `${url.pathname}${url.search}`,
      area: classifyArea(url.pathname),
      actor: actorLabel(currentActor),
      status: null,
      ok: null,
      durationMs: null,
    };

    records = [record, ...records].slice(0, MAX_RECORDS);
    emit();

    try {
      const response = await baseFetch(input, init);

      const [requestBody, responseBody] = await Promise.all([
        requestBodyPromise,
        readResponseBody(response),
      ]);

      record.requestBody = requestBody;
      record.responseBody = responseBody;
      record.status = response.status;
      record.ok = response.ok;
      record.durationMs = Math.round(performance.now() - start);

      emit();

      return response;
    } catch (cause) {
      record.requestBody = await requestBodyPromise;
      record.error =
        cause instanceof Error
          ? cause.message
          : 'Falha de rede desconhecida';

      record.ok = false;
      record.durationMs = Math.round(performance.now() - start);

      emit();

      throw cause;
    }
  };
}

export function restoreDevApiMonitor(): void {
  if (originalFetch && typeof window !== 'undefined') {
    window.fetch = originalFetch;
    originalFetch = null;
  }
}