const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

const TOKEN_KEY = 'admin_access_token';
const COOKIE_NAME = 'admin_session';

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  const maxAge = 60 * 60 * 24 * 7;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${maxAge}; SameSite=Strict${secure}`;
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Strict${secure}`;
}

// ── Error type ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Backend envelope ──────────────────────────────────────────────────────────
// Every backend response is wrapped: { success: true, data: T, meta: {...} }
// apiClient automatically unwraps it so callers get T directly.

type Envelope<T> = { success: boolean; data: T; meta?: unknown };

function isEnvelope(v: unknown): v is Envelope<unknown> {
  return (
    typeof v === 'object' &&
    v !== null &&
    'success' in v &&
    'data' in v
  );
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

export async function apiClient<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired. Please sign in again.');
  }

  if (!res.ok) {
    let code = 'UNKNOWN_ERROR';
    let message = 'Something went wrong. Please try again.';
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string }; code?: string; message?: string };
      // Support both { error: { code, message } } and flat { code, message } envelopes
      const rawCode    = body.error?.code    ?? body.code;
      const rawMessage = body.error?.message ?? body.message;
      if (rawCode) code = rawCode;
      // Only surface safe, user-facing messages — never raw DB or stack errors
      if (rawMessage && rawMessage.length < 200 && !rawMessage.includes('stack') && !rawMessage.includes('prisma')) {
        message = rawMessage;
      }
    } catch (_) { /* keep defaults */ }
    throw new ApiError(res.status, code, message);
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json();

  // Unwrap backend envelope { success, data, meta } → return data directly
  if (isEnvelope(json)) return json.data as T;

  return json as T;
}

// ── Typed method helpers ──────────────────────────────────────────────────────

export function apiGet<T>(path: string): Promise<T> {
  return apiClient<T>(path);
}

export function apiPost<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  return apiClient<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers,
  });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiClient<T>(path, {
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiClient<T>(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiClient<T>(path, { method: 'DELETE' });
}
