// Tide: the pad. A picture of the three main controls that is also the way to play them.
// Each row is a voice; each block of marks is one of its phrases.
//   DENSITY (left to right): how many notes are inside a phrase.
//   DRIFT (bottom to top): how much longer each voice's phrase is than the voice above it,
//     so at the bottom the phrases line up and at the top they slide apart.
//   ROOM (scroll, or the knob): how soft the marks glow, and the size of the ring.
// Drag anywhere to set density and drift together. The picture only changes when a control does.

// cv: a <canvas>. o: get() returns { density, drift, room } (each 0 to 1); set(name, value) changes one.
export function picture(cv, o, rows = 7) {
  const g = cv.getContext('2d');
  // k: the drawing's scale. Everything is sized for an 11px controller and follows its font-size.
  // PAD: room above and below for the labels. X0, XW: where the pad begins and how wide it is;
  // its label sits flush with the left edge, in line with the controls around it.
  let down = false, W = 0, H = 0, touched = 0, what = '', k = 1, PAD = 34, X0 = 24, XW = 100;
  const unit = v => Math.max(0, Math.min(1, Math.round(v * 100) / 100));

  function draw(now) {
    requestAnimationFrame(draw);
    if (!cv.offsetParent) return;   // hidden: nothing to draw
    const d = window.devicePixelRatio || 1, { density, drift, room } = o.get();
    W = cv.clientWidth; H = cv.clientHeight;
    if (cv.width !== Math.round(W * d) || cv.height !== Math.round(H * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); }
    k = parseFloat(getComputedStyle(cv).fontSize) / 11 || 1; PAD = 34 * k; X0 = 24 * k; XW = W - X0 - 8 * k;
    g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);

    // the phrases: the same lengths the piece uses (13 beats, plus 2.4 × drift for each voice down)
    const SPAN = 72, beat = XW / SPAN, notes = Math.round(2 + density * 8);
    g.shadowColor = '#fff'; g.shadowBlur = room * 16 * k;
    for (let v = 0; v < rows; v++) {
      const y = PAD + (H - 2 * PAD) * (v + 0.5) / rows, len = 13 + 2.4 * drift * v, cycle = len + 5;
      g.fillStyle = 'rgba(255,255,255,.45)';
      for (let start = 0; start < SPAN; start += cycle)
        for (let i = 0; i < notes; i++) {
          const x = X0 + (start + len * i / notes) * beat;
          if (x < X0 + XW) g.fillRect(x, y - 5 * k, 1.5 * k, 10 * k);
        }
    }
    g.shadowBlur = 0;

    // where the controls are now: a dot, with a ring as wide as the room
    const x = X0 + density * XW, y = H - PAD - drift * (H - 2 * PAD);
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, PAD); g.lineTo(x, H - PAD); g.moveTo(X0, y); g.lineTo(X0 + XW, y); g.stroke();
    g.strokeStyle = '#fff'; g.beginPath(); g.arc(x, y, (8 + room * 16) * k, 0, 2 * Math.PI); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, (down ? 6 : 4) * k, 0, 2 * Math.PI); g.fill();

    // while a control is being moved, its value is written beside the dot
    g.font = `${12 * k}px ui-monospace, Menlo, monospace`; g.textBaseline = 'middle';
    if (down || now - touched < 1500) {
      const pct = v => Math.round(v * 100), text = what === 'room' ? `ROOM ${pct(room)}` : `DENSITY ${pct(density)}  ·  DRIFT ${pct(drift)}`;
      // a small glass label above the dot (below it near the top edge), clear of the cross-lines
      g.font = `${10.5 * k}px ui-monospace, Menlo, monospace`;
      const w = g.measureText(text).width + 16 * k, h = 20 * k, ring = (8 + room * 16) * k;
      const bx = Math.max(2, Math.min(W - w - 2, x - w / 2)), by = y - ring - h - 8 * k < 2 ? y + ring + 8 * k : y - ring - h - 8 * k;
      g.beginPath(); g.roundRect(bx, by, w, h, 5 * k);
      g.fillStyle = 'rgba(22,22,22,.82)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(text, bx + w / 2, by + h / 2 + 0.5 * k);
      g.font = `${12 * k}px ui-monospace, Menlo, monospace`;
    }
    // one name for each direction, with an arrow toward more
    g.fillStyle = '#fff'; g.textAlign = 'center';
    g.fillText('DENSITY →', X0 + XW / 2, H - 12 * k);
    g.save(); g.translate(6 * k, H / 2); g.rotate(-Math.PI / 2); g.fillText('DRIFT →', 0, 0); g.restore();
  }

  const at = e => {
    const b = cv.getBoundingClientRect();
    o.set('density', unit((e.clientX - b.left - X0) / XW));
    o.set('drift', unit(1 - (e.clientY - b.top - PAD) / (H - 2 * PAD)));
  };
  cv.addEventListener('pointerdown', e => { down = true; what = 'pad'; cv.setPointerCapture(e.pointerId); at(e); });
  cv.addEventListener('pointermove', e => { if (down) at(e); });
  cv.addEventListener('pointerup', () => { down = false; });
  cv.addEventListener('pointercancel', () => { down = false; });
  cv.addEventListener('wheel', e => {
    e.preventDefault(); what = 'room'; touched = performance.now();
    o.set('room', unit(o.get().room - e.deltaY / 1000));
  }, { passive: false });

  requestAnimationFrame(draw);
}
