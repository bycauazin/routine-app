/**
 * Press ripple: spawns a circle at the pointer position that grows and fades.
 * The element needs `position: relative` and `overflow: hidden` (see .ripple
 * in index.css).
 * @param {PointerEvent & { currentTarget: HTMLElement }} event
 */
export function ripple(event) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const span = document.createElement("span");
  span.className = "ripple";
  span.style.width = span.style.height = `${size}px`;
  span.style.left = `${event.clientX - rect.left - size / 2}px`;
  span.style.top = `${event.clientY - rect.top - size / 2}px`;
  el.appendChild(span);
  span.addEventListener("animationend", () => span.remove());
}
