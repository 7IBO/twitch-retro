/**
 * Svelte action: a background pill that glides to the active item of a group
 * (the item with class "on"). Used by the sidebar, the year bar and the
 * segmented controls. The pill is the container's ::before; this only feeds
 * it position and size through CSS variables.
 */
export function slide(node: HTMLElement) {
  let first = true;

  function place() {
    const on = node.querySelector<HTMLElement>(':scope > .on');
    if (!on) {
      node.style.setProperty('--io', '0');
      return;
    }
    node.style.setProperty('--ix', on.offsetLeft + 'px');
    node.style.setProperty('--iy', on.offsetTop + 'px');
    node.style.setProperty('--iw', on.offsetWidth + 'px');
    node.style.setProperty('--ih', on.offsetHeight + 'px');
    node.style.setProperty('--io', '1');
    if (first) {
      first = false;
      // Appear in place the first time, glide afterwards.
      requestAnimationFrame(() => node.classList.add('slide-ready'));
    }
  }

  node.classList.add('slide');
  place();
  void document.fonts?.ready.then(place);
  const mo = new MutationObserver(place);
  mo.observe(node, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
  const ro = new ResizeObserver(place);
  ro.observe(node);
  return {
    destroy() {
      mo.disconnect();
      ro.disconnect();
    },
  };
}
