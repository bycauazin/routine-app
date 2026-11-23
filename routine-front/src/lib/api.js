
/**
 * Thin client for routine-back. All requests go to the same origin (/api),
 * carry the HttpOnly session cookie automatically and exchange JSON only.
 */

export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {{ code?: string, message?: string, fields?: Record<string, string> }} [body]
   */
  constructor(status, body = {}) {
    super(body.message ?? "Não foi possível concluir a operação.");
    this.name = "ApiError";
    this.status = status;
    this.code = body.code ?? "UNKNOWN";
    this.fields = body.fields ?? {};
  }
}

/** Listeners notified when the API reports the session is gone (401). */
const unauthorizedListeners = new Set();
export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

/**
 * @param {string} path  e.g. "/accounts" (prefixed with /api/v1)
 * @param {{ method?: string, body?: unknown, query?: Record<string, unknown>, signal?: AbortSignal }} [options]
 */
export async function api(path, { method = "GET", body, query, signal } = {}) {
  let url = `/api/v1${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      signal,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(0, { code: "NETWORK_ERROR", message: "Sem conexão com o servidor. Tente novamente." });
  }

  if (response.status === 204) {
    return null;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // non-JSON (e.g. proxy error page)
  }

  if (!response.ok) {
    // routine-back error shape: { meta: { success: false }, code, message, fields? }
    const error = new ApiError(response.status, payload ?? undefined);
    // A 401 on anything but the login calls means the session expired.
    if (response.status === 401 && !path.startsWith("/auth/login")) {
      unauthorizedListeners.forEach((listener) => listener(error));
    }
    throw error;
  }
  return payload;
}
