// Tide: explanations. When the pointer comes to rest on a control that has one, it appears at
// once, stays where it is, and goes when the pointer leaves. (The browser's own tooltips wait,
// and flicker as the pointer moves.) On a touch screen a tap shows it for a few seconds.
// A control's explanation is its data-tip; any title inside `within` is turned into one.

export function tips(within) {
  document.querySelectorAll(within).forEach(el => { el.dataset.tip = el.title; el.removeAttribute('title'); });
  const box = document.createElement('div');
  box.className = 'tide-tip'; box.hidden = true;
  document.body.appendChild(box);
  let from = null, shown = '', timer = 0;

  function show(el, e) {
    from = el; shown = el.dataset.tip; box.textContent = shown; box.hidden = false;
    // under the control; for a drawing, beside the pointer. Kept inside the window.
    const r = el.getBoundingClientRect(), drawing = el.tagName === 'CANVAS';
    const x = drawing ? e.clientX + 14 : r.left, y = drawing ? e.clientY + 18 : r.bottom + 6;
    box.style.left = Math.max(8, Math.min(x, innerWidth - box.offsetWidth - 8)) + 'px';
    box.style.top = (y + box.offsetHeight > innerHeight - 8 ? (drawing ? e.clientY : r.top) - box.offsetHeight - 6 : y) + 'px';
    clearTimeout(timer);
    if (e.pointerType === 'touch') timer = setTimeout(hide, 4000);
  }
  function hide() { from = null; shown = ''; box.hidden = true; }

  document.addEventListener('pointerover', e => {
    const el = e.target.closest('[data-tip]');
    if (!el || !el.dataset.tip) hide(); else if (el !== from) show(el, e);
  });
  // a drawing sets its own explanation as the pointer moves over its parts
  document.addEventListener('pointermove', e => {
    const el = e.target.closest('canvas[data-tip]');
    if (el && el.dataset.tip !== shown) el.dataset.tip ? show(el, e) : hide();
  });
  document.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') hide(); });
  document.addEventListener('pointerleave', hide);
  addEventListener('scroll', hide, true);
}
