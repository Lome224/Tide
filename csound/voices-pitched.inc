; Tide, part 5 of 7: the pitched voices (chords, bass, counter)

; ---------- chords: slow sine chord tones that swell and fade (scheduled by phrases) ----------
instr 4
  ifreq = cpsmidinn(p4)
  ; each chord tone drifts slowly from one side to the other over its life
  iside random 0, 1
  ioff random 0.28, 0.42
  ipanA = (iside > 0.5 ? 0.5 - ioff : 0.5 + ioff)
  ipanB = 1 - ipanA
  kpan line ipanA, p3, ipanB
  ; binaural: each tone travels 60-140 degrees around the head over its life
  iaz0 random 0, 360
  isweep random 150, 300
  idir random 0, 1
  isweep = (idir > 0.5 ? isweep : -isweep)
  kaz line iaz0, p3, iaz0 + isweep
  kaz wrap kaz, 0, 360
  iel random -10, 25
  iatt = (p3*0.3 < 4 ? p3*0.3 : 4)
  aenv linseg 0, iatt, 1, p3-2*iatt, 1, iatt, 0
  irate random 0.05, 0.2
  kdrift oscili 0.0025, irate
  ktone oscili 0.5, 1/23
  ; an aeolian harp: wind (noise) blows across two strings, each a waveguide
  ; (a delay line with a damping filter, the physical model of a string).
  ; The 3.2-sample term corrects the tuning for the filter's own delay.
  awn noise 1, 0
  ifc = 1/(1/ifreq - 3.2/sr)
  ifc2 = 1/(0.5/ifreq - 3.2/sr)
  a1 wguide1 awn, ifc*(1+kdrift), 2000 + 1400*ktone, 0.99
  a3 wguide1 awn, ifc2, 2600, 0.985
  a1 dcblock2 a1
  a3 dcblock2 a3
  kbin Ctl "bin", 1
  kbin port kbin, 0.3
  kvg VGain 2
  ; airy upper shimmer (only in 3D): gives the ear something above 2 kHz to track
  aair noise 1, 0
  aair butbp aair, ifreq*8, ifreq*1.5
  aair = aair * (0.5 + 0.5*ktone) * 0.35 * kbin
  asig = (a1*1.6 + a3*0.5*(0.6 + ktone) + aair) * aenv * 0.022 * kvg
  aSL, aSR pan2 asig, kpan
  if giLite == 1 then
    aBL = aSL
    aBR = aSR
  else
    aBL, aBR hrtfmove2 asig, kaz, iel, gSHL, gSHR, 4, 9, sr
  endif
  RoomSend asig, kaz, 0.7*kbin
  aL = aSL*(1-kbin) + aBL*kbin*1.25
  aR = aSR*(1-kbin) + aBR*kbin*1.25
  gaDryL = gaDryL + aL*0.6
  gaDryR = gaDryR + aR*0.6
  gaRevL = gaRevL + aL*0.5
  gaRevR = gaRevR + aR*0.5
endin

; ---------- bass: a long low string, plucked ----------
instr 7
  ifreq = cpsmidinn(p4)
  irel = (p3*0.4 < 1.8 ? p3*0.4 : 1.8)
  ; a waveguide string plucked near its end and heard from a third of the way along
  apl wgpluck2 0.85, 1, ifreq, 0.33, 0.6
  apl butlp apl, ifreq*7
  ; the model rings almost for ever: let it die away over the note
  aenv expseg 1, p3, 0.15
  afade linseg 0, 0.01, 1, p3-irel-0.01, 1, irel, 0
  kvg VGain 1
  asig = apl*aenv*afade*p5*kvg*2.6
  ; low notes carry little direction: the bass stays centred, with a little room
  gaDryL = gaDryL + asig*0.55
  gaDryR = gaDryR + asig*0.55
  gaRevL = gaRevL + asig*0.12
  gaRevR = gaRevR + asig*0.12
endin

; ---------- counter: a bowed string, warm, behind you ----------
instr 9
  ifreq = cpsmidinn(p4)
  iatt = (p3*0.3 < 0.5 ? p3*0.3 : 0.5)
  irel = (p3*0.45 < 1.5 ? p3*0.45 : 1.5)
  aenv linseg 0, iatt, 1, p3-iatt-irel, 0.8, irel, 0
  ; a waveguide model of a bowed string, with a slow gentle vibrato
  abow wgbow 1, ifreq, 3, 0.127236, 4.6, 0.004, giSine, 30
  ; kept dark and a little distant
  abow butlp abow, ifreq*2.5
  abow dcblock2 abow
  kvg VGain 0
  asig = abow*aenv*p5*kvg*1.1
  Place asig, gkCntAz, 0, 0.5 + 0.4*sin(gkCntAz*$M_PI/180), 0.55, 0.6, 0.9
endin
