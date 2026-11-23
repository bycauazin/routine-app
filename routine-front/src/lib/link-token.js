/**
 * E-mail links carry their one-time token after "#" (/redefinir-senha#token=…),
 * so it never reaches a server log or a Referer header.
 */

/** Token in the current address, or null. */
export function readLinkToken() {
  return window.location.hash.match(/token=([A-Za-z0-9_-]{43})/)?.[1] ?? null;
}

/** Removes the token from the address bar and the history once it was read. */
export function clearLinkToken() {
  if (window.location.hash) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
}
