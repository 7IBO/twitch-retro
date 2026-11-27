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

/**
 * Svelte action: sizes the rank column of every ranked list inside the node to
 * the widest number it actually shows (1-9: one digit, up to 99: two...), so
 * short lists do not keep room for four-digit ranks.
 */
export function rankDigits(node: HTMLElement) {
  let frame = 0;
  const update = () => {
    frame = 0;
    for (const ol of node.querySelectorAll<HTMLElement>('ol.rank')) {
      let max = 1;
      for (const el of ol.querySelectorAll(':scope > li > .rank-n')) max = Math.max(max, (el.textContent ?? '').trim().length);
      ol.style.setProperty('--rank-digits', String(max));
    }
  };
  const schedule = () => (frame ||= requestAnimationFrame(update));
  update();
  const mo = new MutationObserver(schedule);
  mo.observe(node, { subtree: true, childList: true, characterData: true });
  return { destroy: () => (mo.disconnect(), cancelAnimationFrame(frame)) };
}
