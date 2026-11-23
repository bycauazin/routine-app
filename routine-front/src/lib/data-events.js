/**
 * "Something changed": after an action that touches data shown on other
 * screens, every useApi reloads (it listens to `routine:data-changed`).
 */
const EVENT = "routine:data-changed";

export function announceDataChanged() {
  window.dispatchEvent(new Event(EVENT));
}

export function onDataChanged(listener) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
