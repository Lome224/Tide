// Tide: the voices as lines, a small mixer. One line per voice; it moves like water while the
// voice plays a phrase and lies flat while it rests.
//   click a name          switch that voice on or off
//   click a line          choose that voice (shift-click to choose several)
//   drag a line up/down   its level, shown in dB while dragging

// cv: a <canvas>. o:
//   names, about(v)                     short name of each voice, and a sentence describing it
//   on(v), lvl(v), chosen(v), dB(x)     what to show
//   toggle(v), level(v, x), choose(v, add)   called for the three gestures above
// Returns update(bits): which voices are playing now.
export function lines(cv, o) {
  const g = cv.getContext('2d'), n = o.names.length;
  // k: the drawing's scale. Everything is sized for an 11px controller and follows its font-size.
  let k = 1, LEFT = 48;
  const swell = Array(n).fill(0);   // 0 = flat, 1 = fully moving; eases toward the voice's state
  let bits = 0, hover = -1, drag = null, W = 0, H = 0, last = performance.now();

  function draw(now) {
    requestAnimationFrame(draw);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!cv.offsetParent) return;   // hidden: nothing to draw
    const d = window.devicePixelRatio || 1, t = now / 1000;
    W = cv.clientWidth; H = cv.clientHeight;
    if (cv.width !== Math.round(W * d) || cv.height !== Math.round(H * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); }
    k = parseFloat(getComputedStyle(cv).fontSize) / 11 || 1; LEFT = 48 * k;
    g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
    g.lineCap = 'round'; g.lineJoin = 'round'; g.textBaseline = 'middle';
    g.font = `${9 * k}px ui-monospace, Menlo, monospace`;

    for (let v = 0; v < n; v++) {
      const y = H * (v + 0.5) / n, on = o.on(v), run = on && (bits >> v & 1), sel = o.chosen(v);
      swell[v] += ((run ? 1 : 0) - swell[v]) * Math.min(1, dt * 1.6);
      if (sel) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, y - H / n / 2 + 1, W, H / n - 2); }
      g.textAlign = 'left'; g.fillStyle = !on ? '#555' : sel || v === hover ? '#fff' : '#9a9a9a';
      g.fillText(o.names[v], 8 * k, y);
      const amp = swell[v] * (1.5 + 0.28 * H / n * o.lvl(v));
      g.setLineDash(on ? [] : [1, 6]);
      g.lineWidth = (0.6 + 3 * o.lvl(v)) * k;   // louder = thicker
      g.strokeStyle = on ? `rgba(255,255,255,${0.3 + 0.6 * swell[v]})` : '#444';
      g.beginPath();
      for (let x = LEFT; x <= W - 10 * k; x += 4) {
        // two slow waves of different length, a little different for every voice
        const yy = y + amp * (0.65 * Math.sin(x * (0.018 + v * 0.003) - t * (0.9 + v * 0.13)) + 0.35 * Math.sin(x * 0.041 + t * (0.5 + v * 0.07) + v));
        x === LEFT ? g.moveTo(x, yy) : g.lineTo(x, yy);
      }
      g.stroke(); g.setLineDash([]);
      if (drag && drag.moved && drag.v === v) { g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText(o.dB(o.lvl(v)) + ' dB', W - 10 * k, y - 9 * k); }
    }
  }

  const rowAt = e => { const v = Math.floor((e.clientY - cv.getBoundingClientRect().top) / H * n); return v >= 0 && v < n ? v : -1; };
  const onName = e => e.clientX - cv.getBoundingClientRect().left < LEFT;
  cv.addEventListener('pointerdown', e => {
    const v = rowAt(e); if (v < 0) return;
    if (onName(e)) { o.toggle(v); return; }
    drag = { v, y: e.clientY, from: o.lvl(v), moved: false, add: e.shiftKey || e.metaKey || e.ctrlKey };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) {
      hover = rowAt(e); cv.style.cursor = hover < 0 ? 'default' : onName(e) ? 'pointer' : 'ns-resize';
      const tip = hover < 0 ? '' : o.about(hover); if (cv.title !== tip) cv.title = tip;
      return;
    }
    const dy = e.clientY - drag.y;
    if (Math.abs(dy) > 4) drag.moved = true;
    if (drag.moved) o.level(drag.v, Math.max(0, Math.min(1, Math.round((drag.from - dy / 140) * 100) / 100)));
  });
  cv.addEventListener('pointerup', () => { if (drag && !drag.moved) o.choose(drag.v, drag.add); drag = null; });
  cv.addEventListener('pointercancel', () => { drag = null; });
  cv.addEventListener('pointerleave', () => { hover = -1; });

  requestAnimationFrame(draw);
  return b => { bits = b; };
}
