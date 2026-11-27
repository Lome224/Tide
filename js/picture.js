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
  let down = false, W = 0, H = 0, touched = 0, what = '', k = 1, PAD = 34;
  const unit = v => Math.max(0, Math.min(1, Math.round(v * 100) / 100));

  function draw(now) {
    requestAnimationFrame(draw);
    if (!cv.offsetParent) return;   // hidden: nothing to draw
    const d = window.devicePixelRatio || 1, { density, drift, room } = o.get();
    W = cv.clientWidth; H = cv.clientHeight;
    if (cv.width !== Math.round(W * d) || cv.height !== Math.round(H * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); }
    k = parseFloat(getComputedStyle(cv).fontSize) / 11 || 1; PAD = 34 * k;
    g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);

    // the phrases: the same lengths the piece uses (13 beats, plus 2.4 × drift for each voice down)
    const SPAN = 72, beat = (W - 2 * PAD) / SPAN, notes = Math.round(2 + density * 8);
    g.shadowColor = '#fff'; g.shadowBlur = room * 16 * k;
    for (let v = 0; v < rows; v++) {
      const y = PAD + (H - 2 * PAD) * (v + 0.5) / rows, len = 13 + 2.4 * drift * v, cycle = len + 5;
      g.fillStyle = 'rgba(255,255,255,.45)';
      for (let start = 0; start < SPAN; start += cycle)
        for (let i = 0; i < notes; i++) {
          const x = PAD + (start + len * i / notes) * beat;
          if (x < W - PAD) g.fillRect(x, y - 5 * k, 1.5 * k, 10 * k);
        }
    }
    g.shadowBlur = 0;

    // where the controls are now: a dot, with a ring as wide as the room
    const x = PAD + density * (W - 2 * PAD), y = H - PAD - drift * (H - 2 * PAD);
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, PAD); g.lineTo(x, H - PAD); g.moveTo(PAD, y); g.lineTo(W - PAD, y); g.stroke();
    g.strokeStyle = '#fff'; g.beginPath(); g.arc(x, y, (8 + room * 16) * k, 0, 2 * Math.PI); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, (down ? 6 : 4) * k, 0, 2 * Math.PI); g.fill();

    // while a control is being moved, its value is written beside the dot
    g.font = `${12 * k}px ui-monospace, Menlo, monospace`; g.textBaseline = 'middle';
    if (down || now - touched < 1500) {
      const pct = v => Math.round(v * 100), text = what === 'room' ? `ROOM ${pct(room)}` : `DENSITY ${pct(density)}  ·  DRIFT ${pct(drift)}`;
      const left = x > W / 2, tx = x + (left ? -1 : 1) * (16 + room * 16) * k, w = g.measureText(text).width + 12 * k;
      g.fillStyle = '#000'; g.fillRect(left ? tx - w : tx, y - 22 * k, w, 18 * k);
      g.fillStyle = '#fff'; g.textAlign = left ? 'right' : 'left'; g.fillText(text, tx + (left ? -6 : 6) * k, y - 13 * k);
    }
    // one name for each direction, with an arrow toward more
    g.fillStyle = '#fff'; g.textAlign = 'center';
    g.fillText('DENSITY →', W / 2, H - 12 * k);
    g.save(); g.translate(13 * k, H / 2); g.rotate(-Math.PI / 2); g.fillText('DRIFT →', 0, 0); g.restore();
  }

  const at = e => {
    const b = cv.getBoundingClientRect();
    o.set('density', unit((e.clientX - b.left - PAD) / (W - 2 * PAD)));
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
