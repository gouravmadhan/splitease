export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}
const TIMEOUT_MS = 15000;

/** Cookie-based session: nothing secret is kept in the browser's storage, and no passcode is sent per request. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, signal: ctrl.signal, credentials: "same-origin", headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } });
  } catch (e) {
    throw new ApiError(0, (e as Error).name === "AbortError" ? "The server took too long to respond. Please try again." : "Can't reach the server. Check your connection and try again.");
  } finally { clearTimeout(timer); }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && body.code === "AUTH_REQUIRED") window.dispatchEvent(new Event("auth-required")); // session missing or expired
    throw new ApiError(res.status, body.error ?? res.statusText, body.code);
  }
  return body;
}
