/**
 * Lets work started during a request finish after the response is sent.
 *
 * On Vercel the function may be frozen as soon as the response goes out, so
 * the pending work is handed to the platform's `waitUntil` (the same request
 * context that `@vercel/functions` reads). Locally, and on any normal Node
 * server, the process keeps running anyway and this does nothing.
 *
 * @param {Promise<unknown>} promise
 */
export function keepAlive(promise) {
  globalThis[Symbol.for("@vercel/request-context")]?.get?.()?.waitUntil?.(promise);
}
