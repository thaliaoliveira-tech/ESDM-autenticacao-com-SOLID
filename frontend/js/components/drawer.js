// A panel that slides over the app: the menu on the left, the conversation details on the right.
// While it is open the rest of the panel is inert, so keyboard focus stays inside it.
export function createDrawer({ drawer, backdrop, trigger, focusTarget, inertElements }) {
  const isOpen = () => drawer.classList.contains('is-open');

  function open() {
    drawer.classList.add('is-open');
    backdrop.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    for (const element of inertElements()) element.inert = true;
    // Without preventScroll the browser scrolls the clipped panel to reveal the sliding drawer.
    requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
  }

  function close({ returnFocus = true } = {}) {
    if (!isOpen()) return;
    drawer.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    for (const element of inertElements()) element.inert = false;
    if (returnFocus && !trigger.hidden) trigger.focus({ preventScroll: true });
  }

  backdrop.addEventListener('click', () => close());
  drawer.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  return { open, close, isOpen };
}
