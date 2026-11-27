; Tide, part 9 of 9: the binaural room and the master output

; ---------- room: binaural early reflections + late tail ----------
; Listener stands in the middle of a 10 x 10 x 3 m room (+x = right, +y = ahead);
; each bus sounds from 2.2 m away in its quarter.
instr 98
  ; the light engine has no binaural room
  if giLite == 0 then
    ir = 2.2
    ic = 5
    ih = 1.7
    ip = ir*0.7071
    a1L, a1R, ilo, ihi, imfp hrtfearly gaQ1, ic+ip, ic+ip, ih, ic, ic, ih, gSHL, gSHR, 1, 8, sr, 1, 1
    a2L, a2R, i0, i1, i2 hrtfearly gaQ2, ic+ip, ic-ip, ih, ic, ic, ih, gSHL, gSHR, 1, 8, sr, 1, 1
    a3L, a3R, i3, i4, i5 hrtfearly gaQ3, ic-ip, ic-ip, ih, ic, ic, ih, gSHL, gSHR, 1, 8, sr, 1, 1
    a4L, a4R, i6, i7, i8 hrtfearly gaQ4, ic-ip, ic+ip, ih, ic, ic, ih, gSHL, gSHR, 1, 8, sr, 1, 1
    aEL = a1L + a2L + a3L + a4L
    aER = a1R + a2R + a3R + a4R
    ; late tail: binaural diffuse reverb, longer than the room's own decay for a dreamy wash
    aTin = (gaQ1 + gaQ2 + gaQ3 + gaQ4)*0.5
    aTL, aTR, idel hrtfreverb aTin, 3.2, 1.6, gSHL, gSHR, sr, imfp, 1
    aTL delay aTL, idel
    aTR delay aTR, idel
    gaDryL = gaDryL + aEL*2.2 + aTL*1.5
    gaDryR = gaDryR + aER*2.2 + aTR*1.5
  endif
  clear gaQ1, gaQ2, gaQ3, gaQ4
endin

; ---------- master: reverb, volume, fade-in, soft limit ----------
instr 99
  kvol Ctl "vol", 0.8
  kvol port kvol, 0.25
  ; a 2 s fade-in: soon enough to hear that it has begun, slow enough not to startle
  kfade linseg 0, 2, 1
  kbm Ctl "bin", 1
  kbm port kbm, 0.3
  aRL, aRR reverbsc gaRevL, gaRevR, 0.9 - 0.08*kbm, 7000 + 4000*kbm
  ; in binaural mode the plain stereo wash mostly gives way to the HRTF room,
  ; which keeps the sources outside the head
  krv = 0.9 - 0.75*kbm
  ; loudness match: the binaural mix measures quieter, so lift it to stereo level
  kmk = 1 + 0.8*kbm
  aL = (gaDryL + aRL*krv) * kmk
  aR = (gaDryR + aRR*krv) * kmk
  aL = aL * kvol * kfade
  aR = aR * kvol * kfade
  aL = tanh(aL)
  aR = tanh(aR)
  krms rms aL + aR
  chnset krms, "level"
  outs aL, aR
  clear gaDryL, gaDryR, gaRevL, gaRevR
endin
