; Tide, part 6 of 7: the textures (drops, waves, shimmer, flyer)

; ---------- drops: water on glazed porcelain ----------
; A drop lands: a soft wet tick (a tiny bubble and a breath of noise), and that
; tick strikes the porcelain. Thin glazed porcelain is heavily damped, so its
; modes ring for a third of a second and are gone: a tick with a body, not a bell.
; p4 = pitch
instr 2
  idet random -0.3, 0.3
  ifreq = cpsmidinn(p4 + idet)
  iamp random 0.03, 0.08
  ; anywhere around the head, a little above ear level, falling past you
  iaz random 0, 360
  iel random -5, 50
  kel line iel, p3, iel - 20
  inear random 0, 1
  ; water
  kf expseg ifreq*0.6, 0.03, ifreq*1.1, p3, ifreq*1.1
  aeb expseg 0.0001, 0.004, 1, 0.05, 0.0001, p3, 0.0001
  abub poscil aeb, kf
  aet expseg 1, 0.012, 0.0001, p3, 0.0001
  ant noise 1, 0
  ant butbp ant, 2600, 2600
  atick = abub*0.6 + ant*aet
  ; porcelain: four damped modes of a thin shard (1 : 2.3 : 3.9 : 6.1)
  ilim = sr*0.29
  if2 = (ifreq*2.3 < ilim ? ifreq*2.3 : ilim)
  if3 = (ifreq*3.9 < ilim ? ifreq*3.9 : ilim)
  if4 = (ifreq*6.1 < ilim ? ifreq*6.1 : ilim)
  am1 mode atick, ifreq, 0.455*ifreq*0.35
  am2 mode atick, if2, 0.455*if2*0.22
  am3 mode atick, if3, 0.455*if3*0.14
  am4 mode atick, if4, 0.455*if4*0.09
  kvg VGain 3
  asig = (atick*0.5 + (am1 + am2*0.6 + am3*0.4 + am4*0.25)) * iamp * 2.5 * kvg
  Place asig*(0.55 + 1.1*inear), iaz, kel, (iaz < 180 ? 0.65 : 0.35), 0.35 + 0.9*inear, 0.9 - 0.7*inear, 0.6 + 0.8*(1 - inear)
endin

; ---------- water: band-passed noise breathing like waves ----------
instr 3
  ; The waves' rhythm row is a swell pattern: each beat's bar is how high the
  ; water rises there (0 = drawn back, 4 = a full wave). In the waves' rest the
  ; water lies low. Activity sets how deep and
  ; how quick the swells are.
  kaw Ctl "act_wave", 0.5
  kdv table 4*8 + gkBeatV[4], giDivT
  ktg = 0.3 + gkRun[4]*kdv*0.175*(0.4 + 1.2*kaw)
  ktg = ktg*(1 - 0.4*gkWarnV[4])
  kw2 oscili 1, 1/31.3
  kw3 oscili 1, 1/127
  kamp portk ktg, 1.6 - 1.1*kaw
  kamp = kamp*(1 + 0.12*kw2) + 0.06*kw3
  kamp limit kamp, 0.05, 1.3
  kcf = 330 + 520*kamp + 180*kw3
  aNL noise 0.5, 0.7
  aNR noise 0.5, 0.7
  aL butbp aNL, kcf, kcf*0.7
  aR butbp aNR, kcf*1.07, kcf*0.7
  aSh noise 0.04, 0
  aSh butbp aSh, 3200 + 800*kw2, 1500
  kgain = kamp*kamp*0.7
  aL = aL*kgain + aSh*kamp*0.18
  aR = aR*kgain + aSh*kamp*0.18
  ; slow wave-like drift between left and right (about 41 s per cycle)
  kwp oscili 0.3, 1/41
  kwpan = 0.5 + kwp
  aL = aL * sqrt(2*(1-kwpan))
  aR = aR * sqrt(2*kwpan)
  kbw Ctl "bin", 1
  kbw port kbw, 0.3
  kvg VGain 4
  kwg = (1 - 0.4*kbw)*kvg
  gaDryL = gaDryL + aL*0.55*kwg
  gaDryR = gaDryR + aR*0.55*kwg
  gaRevL = gaRevL + aL*0.35*kwg
  gaRevR = gaRevR + aR*0.35*kwg
endin

; ---------- shimmer: sparkles circling the head ----------
instr 5
  ; one or two full turns around the listener, rising and dipping
  iaz random 0, 360
  iturns random 1, 2
  idir random 0, 1
  iturns = (idir > 0.5 ? iturns : -iturns)
  kaz line iaz, p3, iaz + 360*iturns
  kaz wrap kaz, 0, 360
  kel oscili 25, 1/7.3
  kel = kel + 15
  aenv linseg 0, p3*0.25, 1, p3*0.5, 1, p3*0.25, 0
  ; sparse bright grains, tuned to the scale
  ; p4 = how dense the sparkle is, p5 = pitch
  ifreq = cpsmidinn(p5)
  kdens randomi 9*p4, 22*p4, 0.5
  agr dust2 1, kdens
  ; shards of porcelain touching: each grain strikes two ringing modes
  ilim = sr*0.29
  if2 = (ifreq*2.756 < ilim ? ifreq*2.756 : ilim)
  ar1 mode agr, ifreq, 900
  ar2 mode agr, if2, 700
  ahi buthp agr, 5000
  kvg VGain 5
  asig = (ar1*0.6 + ar2*0.3 + ahi*0.25) * aenv * 0.1 * kvg
  kbin Ctl "bin", 1
  kbin port kbin, 0.3
  ; stereo: follow the same circle with a simple pan
  kpan = 0.5 + 0.45*sin(kaz*$M_PI/180)
  aSL, aSR pan2 asig*0.6, kpan
  aBL, aBR hrtfmove2 asig, kaz, kel, gSHL, gSHR, 4, 9, sr
  RoomSend asig, kaz, 0.8*kbin
  aL = aSL*(1-kbin) + aBL*kbin*1.4
  aR = aSR*(1-kbin) + aBR*kbin*1.4
  gaDryL = gaDryL + aL*0.7
  gaDryR = gaDryR + aR*0.7
  gaRevL = gaRevL + aL*0.25
  gaRevR = gaRevR + aR*0.25
endin

; ---------- flyer: a small bright creature passing by, with Doppler ----------
; It flies in a straight line past the listener (origin, facing +y). Its distance
; drives a delay line, so the pitch slides down as it passes (Doppler), the level
; follows 1/distance, and hrtfmove2 places it from its true angle.
instr 6
  ; path: from far on one side to far on the other, passing 0.6-1.8 m from the head
  iside random 0, 1
  ix0 = (iside > 0.5 ? -16 : 16)
  iy random -1.8, 1.8
  iy = (abs(iy) < 0.6 ? 0.6*(iy < 0 ? -1 : 1) : iy)
  iz random -0.3, 1.2
  kx line ix0, p3, -ix0
  kd = sqrt(kx*kx + iy*iy + iz*iz)
  kd = (kd < 0.5 ? 0.5 : kd)
  kaz = taninv2(kx, iy)*180/$M_PI
  kaz wrap kaz, 0, 360
  kel = taninv2(iz, sqrt(kx*kx + iy*iy))*180/$M_PI
  ; articulated call: short tuned pings in little bursts
  ifreq = cpsmidinn(p4)
  irate random 7, 11
  kgate oscili 0.5, irate/7
  kgate = (kgate > -0.15 ? 1 : 0)
  kgate port kgate, 0.02
  ; each ping: a fast-decaying sine with a small downward chirp
  aph phasor irate
  apenv = exp(-aph*9)
  afr = ifreq*(1 + 0.08*exp(-aph*30))
  ar1 poscil apenv, afr
  ar2 poscil apenv*apenv*0.3, afr*2.71
  asrc = (ar1 + ar2) * kgate
  ; Doppler: propagation delay of the current distance (343 m/s)
  adel interp kd*1000/343
  asrc vdelay3 asrc, adel, 100
  aenv linseg 0, 0.4, 1, p3-0.8, 1, 0.4, 0
  kvg VGain 6
  asig = asrc * aenv * 0.16 / kd * kvg
  kbin Ctl "bin", 1
  kbin port kbin, 0.3
  kpan = 0.5 + 0.5*kx/sqrt(kx*kx + 4)
  aSL, aSR pan2 asig*0.7, kpan
  aBL, aBR hrtfmove2 asig, kaz, kel, gSHL, gSHR, 4, 9, sr
  RoomSend asig, kaz, 0.25*kbin
  aL = aSL*(1-kbin) + aBL*kbin*1.4
  aR = aSR*(1-kbin) + aBR*kbin*1.4
  gaDryL = gaDryL + aL*0.8
  gaDryR = gaDryR + aR*0.8
  gaRevL = gaRevL + aL*0.15
  gaRevR = gaRevR + aR*0.15
endin
