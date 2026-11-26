// Tide: two page parts used more than once. A multislider (a row of bars you drag across,
// like Max's) and a row of tabs for choosing a voice.

// el: the container. o:
//   arr()      the list of numbers the bars show and change
//   min, max, step
//   fmt(v)     label for a value          name(i)   accessible name of bar i
//   onChange(i, v)  called when bar i changes
//   foot       true to number the bars    dim(i), pend(i)  optional: grey / mark as pending
// Returns draw(), to call when the list was changed from outside.
export function multislider(el, o) {
  const bars = o.arr().map((_, i) => {
    const b = document.createElement('div');
    b.className = 'b'; b.tabIndex = 0;
    b.setAttribute('role', 'slider'); b.setAttribute('aria-label', o.name(i));
    b.setAttribute('aria-valuemin', o.min); b.setAttribute('aria-valuemax', o.max);
    b.innerHTML = '<i></i><span></span>' + (o.foot ? `<span class="ft">${i + 1}</span>` : '');
    b.addEventListener('keydown', e => {
      const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
      if (d) { e.preventDefault(); set(i, o.arr()[i] + d * (o.step >= 1 ? o.step : 0.05)); }
    });
    el.appendChild(b);
    return b;
  });
  const n = bars.length;

  function set(i, v) {
    v = Math.max(o.min, Math.min(o.max, Math.round(v / o.step) * o.step));
    v = Math.round(v * 100) / 100;
    if (v === o.arr()[i]) return;
    o.arr()[i] = v;
    draw();
    o.onChange(i, v);
  }

  function draw() {
    bars.forEach((b, i) => {
      const v = o.arr()[i];
      b.firstChild.style.height = Math.max(4, (v - o.min) / (o.max - o.min) * 100) + '%';
      b.children[1].textContent = o.fmt(v);
      b.setAttribute('aria-valuenow', v); b.setAttribute('aria-valuetext', o.fmt(v));
      b.classList.toggle('off', o.dim ? o.dim(i) : false);
      b.classList.toggle('pend', o.pend ? o.pend(i) : false);
    });
  }

  // a fast drag fills in every bar it crossed
  let dragging = false, last = null;
  const at = e => {
    const r = el.getBoundingClientRect(), br = bars[0].getBoundingClientRect();
    const i = Math.max(0, Math.min(n - 1, Math.floor((e.clientX - r.left) / r.width * n)));
    const v = o.min + (1 - (e.clientY - br.top) / br.height) * (o.max - o.min);
    if (last && last.i !== i) {
      const step = i > last.i ? 1 : -1;
      for (let j = last.i + step; j !== i; j += step) set(j, last.v + (v - last.v) * (j - last.i) / (i - last.i));
    }
    set(i, v); last = { i, v };
  };
  el.addEventListener('pointerdown', e => { dragging = true; last = null; el.setPointerCapture(e.pointerId); at(e); });
  el.addEventListener('pointermove', e => { if (dragging) at(e); });
  el.addEventListener('pointerup', () => { dragging = false; });
  el.addEventListener('pointercancel', () => { dragging = false; });
  return draw;
}

// A row of buttons, one per label. get() says which is chosen; choose(i) is called on a click.
// Returns draw().
export function tabs(el, labels, get, choose) {
  const btns = labels.map((label, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label;
    b.addEventListener('click', () => choose(i));
    el.appendChild(b);
    return b;
  });
  return () => btns.forEach((b, i) => b.setAttribute('aria-pressed', get() === i ? 'true' : 'false'));
}
