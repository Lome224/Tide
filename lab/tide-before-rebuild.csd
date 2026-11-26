<CsoundSynthesizer>
<CsOptions>
-odac -d -m0
</CsOptions>
<CsInstruments>
sr = 48000
ksmps = 64
nchnls = 2
0dbfs = 1
seed 0

; a sine wave: the vibrato shape the physical models ask for
giSine ftgen 0, 0, 8192, 10, 1

gaDryL init 0
gaDryR init 0
gaRevL init 0
gaRevR init 0

; ---------- binaural (HRTF) ----------
; Measured head-related transfer functions (Csound's data set for the running
; sample rate: 44.1, 48 or 96 kHz). Sources are placed around the listener's head;
; "bin" = 1 for binaural, 0 for plain stereo.
gSHL sprintf "hrtf-%d-left.dat", sr
gSHR sprintf "hrtf-%d-right.dat", sr

; ---------- binaural room ----------
; Four room buses, one per quarter around the listener (front-right, back-right,
; back-left, front-left). Each feeds an hrtfearly room model, so a sound's wall,
; floor and ceiling reflections arrive from its own side of the room. A shared
; hrtfreverb gives the binaural late tail.
gaQ1 init 0
gaQ2 init 0
gaQ3 init 0
gaQ4 init 0

; room amount, set by the Room control (1 = as designed)
gkRoom init 1

opcode RoomSend, 0, akk
  asig, kaz, kamt xin
  kamt = kamt*gkRoom
  k1 = cos((kaz - 45)*$M_PI/180)
  k2 = cos((kaz - 135)*$M_PI/180)
  k3 = cos((kaz - 225)*$M_PI/180)
  k4 = cos((kaz - 315)*$M_PI/180)
  k1 = (k1 < 0 ? 0 : k1)
  k2 = (k2 < 0 ? 0 : k2)
  k3 = (k3 < 0 ? 0 : k3)
  k4 = (k4 < 0 ? 0 : k4)
  gaQ1 = gaQ1 + asig*k1*kamt
  gaQ2 = gaQ2 + asig*k2*kamt
  gaQ3 = gaQ3 + asig*k3*kamt
  gaQ4 = gaQ4 + asig*k4*kamt
endop

; drops, sparkles and the flyer pick from these scale degrees (a pentatonic
; subset of whatever scale is set, over two octaves)
giScale ftgen 0, 0, -8, -2, 0, 1, 2, 4, 5, 7, 8, 9

; ---------- controls ----------
; The page sets every channel and then "ui" = 1. Until then (and whenever this file
; runs on its own in Csound) each control falls back to its default.
opcode Ctl, k, Si
  Sname, idef xin
  kui chnget "ui"
  kv chnget Sname
  kv = (kui > 0.5 ? kv : idef)
  xout kv
endop

opcode CtlI, i, Si
  Sname, idef xin
  iui chnget "ui"
  iv chnget Sname
  iv = (iui > 0.5 ? iv : idef)
  xout iv
endop

; a voice's gain: on/off switch x level slider. The slider is the voice's volume:
; 0.5 = as designed (0 dB), 1 = four times louder (+12 dB), 0.25 = -12 dB, 0 = silent
opcode VGain, k, S
  Skey xin
  Son strcat "on_", Skey
  Slv strcat "lvl_", Skey
  kon Ctl Son, 1
  klv Ctl Slv, 0.5
  kg port kon*klv*klv*4, 0.3
  xout kg
endop

; place a sound at azimuth/elevation: binaural (HRTF + room) or plain stereo pan
opcode Place, 0, akkkkkk
  asig, kaz, kel, kpan, kdry, kwet, kroom xin
  kbin Ctl "bin", 1
  kbin port kbin, 0.3
  kaz wrap kaz, 0, 360
  kpan limit kpan, 0, 1
  aSL, aSR pan2 asig, kpan
  aBL, aBR hrtfmove2 asig, kaz, kel, gSHL, gSHR, 4, 9, sr
  RoomSend asig, kaz, kroom*kbin
  aL = aSL*(1-kbin) + aBL*kbin*1.4
  aR = aSR*(1-kbin) + aBR*kbin*1.4
  gaDryL = gaDryL + aL*kdry
  gaDryR = gaDryR + aR*kdry
  gaRevL = gaRevL + aL*kwet
  gaRevR = gaRevR + aR*kwet
endop

; ---------- harmony and motif ----------
; The lists the piece is built from. The page overwrites the scale and each voice's
; rhythm and breath rows; the rest are set here. The phrase instrument copies the
; page's values in when a phrase BEGINS and never during it.
;   giMaj      sc0..sc6          the scale: semitones above the tonic, per degree
;   giProg                       the chords: scale degree of each chord's root, in order
;   giShape                      the chord shape: scale steps of each chord tone above the root
;   giMotD                       the motif: its 8 notes as scale steps above the tonic
;   giVarW                       how often the motif is played as is / upside down /
;                                backwards / slower / as a climbing fragment
;   giDivT     div<v>_<beat>     rhythm, one row of 8 beats per voice: notes in each beat
;   giWaitT    wait<v>_<phrase>  breath, one row of 8 phrases per voice: how late it joins
;   giRestDef  rest0..rest7      breath of the whole ensemble: the silence after each phrase
;   voices <v>: 0 melody, 1 counter, 2 bass, 3 chords, 4 drops, 5 waves, 6 shimmer, 7 flyer
giMaj ftgen 0, 0, -7, -2, 0, 2, 4, 5, 7, 9, 11
giTonic init 0
giProg ftgen 0, 0, -8, -2, 0, 5, 3, 4, 0, 3, 1, 4
; root, fifth, tenth, ninth: an open voicing rather than a closed triad
giShape ftgen 0, 0, -4, -2, 0, 4, 9, 8
giMotD ftgen 0, 0, -8, -2, 0, 2, 1, 4, 3, 2, 0, -1
giVarW ftgen 0, 0, -5, -2, 0.35, 0.15, 0.12, 0.18, 0.2
giRestDef ftgen 0, 0, -8, -2, 0.3, 0.25, 0.55, 0.3, 0.25, 0.4, 0.3, 0.9
;                              melody                   counter                  bass                     chords
giDivDef ftgen 0, 0, -64, -2,  1, 2, 1, 0, 2, 1, 0, 0,  0, 1, 0, 0, 1, 0, 0, 0,  1, 0, 0, 0, 1, 0, 0, 0,  1, 0, 0, 0, 0, 0, 0, 0, \
                               1, 0, 2, 0, 0, 1, 0, 0,  1, 1, 2, 2, 3, 2, 1, 1,  0, 0, 0, 0, 1, 0, 0, 0,  0, 0, 0, 0, 0, 0, 1, 0
;                              drops                    waves                    shimmer                  flyer
giWaitDef ftgen 0, 0, -64, -2, 0, 0, 0, 0, 0, 0, 0, 0,  1, 0.3, 0, 0.5, 0, 0.3, 0, 0,  0.3, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0, \
                               0, 0.5, 0, 1, 0, 0.5, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,  1, 0, 1, 0, 0.5, 0, 1, 0,  1, 0, 1, 1, 0, 1, 0, 1
giDivT ftgen 0, 0, -64, -2, 0
giWaitT ftgen 0, 0, -64, -2, 0
; scratch lists filled by Onsets: where each note of a voice starts, and how long it is (in beats)
giOn ftgen 0, 0, -32, -2, 0
giLen ftgen 0, 0, -32, -2, 0
; the melody's note lengths, from its rhythm row
giMotR ftgen 0, 0, -16, -2, 0
giMotN init 2
giProgPos init 0
giPhraseN init 0
giMelPrev init 0
giLastRoot init 50

gkPhrase init 0
gkInPhrase init 0
gkRoot init 50
gkArc init 0.5
gkMelAz init 0
gkCntAz init 180
; "pause coming": rises 0 -> 1 over the last seconds of a phrase
gkWarn init 0
gkWarnSet init 0
; the piece listening to itself: its loudness now, and the average of its recent phrases
gkLoud init 0
gkLoudAvg init 0
; where the phrase is in its 8-beat cycle, and whether the waves have joined it yet
gkBeat init 0
gkWaveIn init 1

opcode Deg2Midi, i, ii
  ideg, ibase xin
  ioct = floor(ideg/7)
  istep = ideg - ioct*7
  isemi table istep, giMaj
  xout ibase + giTonic + 12*ioct + isemi
endop

; nearest chord tone (or, with ionly = 1, nearest root) to a degree.
; The chord tones are whatever the chord shape says.
opcode SnapChord, i, iii
  ideg, iroot, ionly xin
  is1 table 1, giShape
  is2 table 2, giShape
  is3 table 3, giShape
  is1 = is1 % 7
  is2 = is2 % 7
  is3 = is3 % 7
  ires = ideg
  ifound = 0
  ik = 0
  while ik < 7 do
    ioff = (ik % 2 == 1 ? (ik+1)/2 : -ik/2)
    icand = ideg + ioff
    irel = icand - iroot
    irel = irel - 7*floor(irel/7)
    if ifound == 0 then
      if irel == 0 || (ionly < 0.5 && (irel == is1 || irel == is2 || irel == is3)) then
        ires = icand
        ifound = 1
      endif
    endif
    ik = ik + 1
  od
  xout ires
endop

; copy one list from the page's channels into a table (or keep the defaults)
opcode ReadList, 0, Siii
  Spre, ifn, idefn, icount xin
  ik = 0
  while ik < icount do
    idef table ik, idefn
    Sn sprintf "%s%d", Spre, ik
    iv CtlI Sn, idef
    tableiw iv, ik, ifn
    ik = ik + 1
  od
endop

; read tonic and scale
opcode ReadTonality, 0, 0
  giTonic CtlI "tonic", 0
  ReadList "sc", giMaj, giMaj, 7
endop

; read every voice's rhythm row and breath row
opcode ReadPatterns, 0, 0
  ik = 0
  while ik < 64 do
    iv = int(ik/8)
    ib = ik % 8
    idef table ik, giDivDef
    Sn sprintf "div%d_%d", iv, ib
    ival CtlI Sn, idef
    tableiw ival, ik, giDivT
    idef table ik, giWaitDef
    Sn sprintf "wait%d_%d", iv, ib
    ival CtlI Sn, idef
    tableiw ival, ik, giWaitT
    ik = ik + 1
  od
endop

; note number n of the motif (it has 8; a longer rhythm goes round again a step higher)
opcode MotDeg, i, i
  inum xin
  id table inum % 8, giMotD
  xout id + int(inum/8)
endop

; turn one voice's rhythm row into notes: a bar of 3 = three notes in that beat,
; 1 = one note, 0 = no new note (the one before is held; at the start, silence).
; Fills giOn (start, in beats) and giLen (length, in beats); returns how many notes.
opcode Onsets, i, i
  iv xin
  icnt = 0
  ik = 0
  while ik < 8 do
    idv table iv*8 + ik, giDivT
    idv = round(idv)
    if idv < 1 then
      if icnt > 0 then
        ilast table icnt-1, giLen
        tableiw ilast + 1, icnt-1, giLen
      endif
    else
      ij = 0
      while ij < idv do
        if icnt < 32 then
          tableiw ik + ij/idv, icnt, giOn
          tableiw 1/idv, icnt, giLen
          icnt = icnt + 1
        endif
        ij = ij + 1
      od
    endif
    ik = ik + 1
  od
  xout icnt
endop

; development between phrases: the motif changes a little
opcode MutateMotif, 0, 0
  ir random 0, 1
  if ir < 0.2 then
    ; sequence: the whole idea moves one step up or down
    ish random 0, 1
    ish = (ish < 0.5 ? 1 : -1)
    ik = 0
    while ik < 8 do
      id table ik, giMotD
      id = id + ish
      id = (id > 9 ? id - 7 : (id < -3 ? id + 7 : id))
      tableiw id, ik, giMotD
      ik = ik + 1
    od
  elseif ir < 0.65 then
    ; one note moves a step
    ij random 1, 7.99
    ij = int(ij)
    id table ij, giMotD
    is random 0, 1
    tableiw id + (is < 0.5 ? 1 : -1), ij, giMotD
  else
    ; two neighbouring notes swap places
    ij random 0, 6.99
    ij = int(ij)
    ia table ij, giMotD
    ib table ij+1, giMotD
    tableiw ib, ij, giMotD
    tableiw ia, ij+1, giMotD
  endif
endop

; ---------- conductor: space, and the slow arc ----------
; All notes and events come from the phrase instrument (10). This one keeps the
; slow motions going and passes the phrase's signals to the other instruments.
instr 1
  ; did a phrase sing during the last control period? (set by instr 10)
  gkInPhrase = gkPhrase
  gkPhrase = 0
  chnset gkInPhrase, "ph_in"
  gkWarn = gkWarnSet
  gkWarnSet = 0
  krm Ctl "room", 0.5
  gkRoom = krm*2
  ; a slow arc (~2.5 min) that lifts and settles everything's activity
  karc oscili 0.5, 1/151
  gkArc = 0.5 + karc
  ; melody wanders in front of you, the counter-voice behind and to the side
  kma oscili 32, 1/37
  gkMelAz = kma
  kca oscili 70, 1/53
  gkCntAz = 180 + kca
endin

; ---------- droplet: bubble chirp + inharmonic porcelain partials ----------
instr 2
  irnd random 0, 7.99
  isemi table int(irnd), giScale
  ; pitch varies over three octaves (lower ones more likely), slightly detuned each time
  io random 0, 1
  ioct = (io < 0.5 ? 0 : (io < 0.88 ? 1 : 2))
  idet random -0.3, 0.3
  imidi Deg2Midi isemi, 62
  ifreq = cpsmidinn(imidi + 12*ioct + idet)
  iamp random 0.03, 0.08
  ; stereo placement: 30% toward left or right, side chosen at random per drop
  iside random 0, 1
  ipan = (iside > 0.5 ? 0.65 : 0.35)
  ; binaural placement: anywhere around the head, a little above ear level,
  ; drifting downward as it rings, like a drop falling past you
  iaz random 0, 360
  iel random -5, 50
  kel line iel, p3, iel - 30
  ; each drop also travels 50-130 degrees around you while it rings
  itrav random 50, 130
  itd random 0, 1
  itrav = (itd > 0.5 ? itrav : -itrav)
  kaz line iaz, p3, iaz + itrav
  kaz wrap kaz, 0, 360
  ; distance: near drops are louder and dry, far drops quieter and wetter
  inear random 0, 1
  igain = 0.55 + 1.1*inear
  idry = 0.35 + 0.9*inear
  iwet = 0.95 - 0.7*inear
  ; gentler chirp (smaller, slower pitch rise) and softer attack than before
  kf expseg ifreq*0.82, 0.05, ifreq, p3-0.05, ifreq*1.01
  aenv expseg 0.0001, 0.012, 1, p3-0.012, 0.0001
  aen2 expseg 0.0001, 0.01, 1, p3*0.3, 0.0001, p3*0.7, 0.0001
  ; water: a short bubble that chirps upward
  abub poscil aen2, kf
  ; porcelain: the drop strikes a small cup. Three resonant modes (measured cup
  ; ratios 1 : 2.756 : 5.404) ring and die away at their own rates
  aex mpulse 2, 0
  aex butlp aex, 6000
  ilim = sr*0.29
  if2 = (ifreq*2.756 < ilim ? ifreq*2.756 : ilim)
  if3 = (ifreq*5.404 < ilim ? ifreq*5.404 : ilim)
  ig3 = (ifreq*5.404 < ilim ? 0.12 : 0)
  am1 mode aex, ifreq, 0.455*ifreq*p3
  am2 mode aex, if2, 0.455*if2*p3*0.45
  am3 mode aex, if3, 0.455*if3*p3*0.2
  kvg VGain "drop"
  asig = (abub*0.55 + am1 + am2*0.3 + am3*ig3) * iamp * 1.3 * kvg
  kbin Ctl "bin", 1
  kbin port kbin, 0.3
  ; high cut: soft (3.75 kHz) in stereo; opened up in 3D, because the
  ; ear's direction cues (above / behind / in front) live above 4 kHz
  kcut chnget "cut"
  kcut = (kcut < 200 ? 3000 : kcut)
  kcut = kcut + (9000 - kcut)*kbin
  asig butlp asig, kcut
  asig butlp asig, kcut
  ; a tiny bright tick at the start of each drop gives the ear an exact position
  atk expseg 1, 0.006, 0.0001, p3-0.006, 0.0001
  an noise 1, 0
  an buthp an, 2500
  asig = asig + an*atk*iamp*0.25*kbin*kvg
  aSL, aSR pan2 asig, ipan
  aBL, aBR hrtfmove2 asig*igain, kaz, kel, gSHL, gSHR, 4, 9, sr
  aL = aSL*(1-kbin) + aBL*kbin*1.4
  aR = aSR*(1-kbin) + aBR*kbin*1.4
  RoomSend asig*igain, kaz, (0.6 + 0.8*(1-inear))*kbin
  kdry = 0.3 + (idry - 0.3)*kbin
  kwet = 0.85 + (iwet - 0.85)*kbin
  gaDryL = gaDryL + aL*kdry
  gaDryR = gaDryR + aR*kdry
  gaRevL = gaRevL + aL*kwet
  gaRevR = gaRevR + aR*kwet
endin

; ---------- water: band-passed noise breathing like waves ----------
instr 3
  ; The waves' rhythm row is a swell pattern: each beat's bar is how high the
  ; water rises there (0 = drawn back, 4 = a full wave). In a rest, or before the
  ; waves have joined a phrase, the water lies low. Activity sets how deep and
  ; how quick the swells are.
  kaw Ctl "act_wave", 0.5
  kdv table 5*8 + gkBeat, giDivT
  kin = (gkInPhrase > 0.5 && gkWaveIn > 0.5 ? 1 : 0)
  ktg = 0.3 + kin*kdv*0.175*(0.4 + 1.2*kaw)
  ktg = ktg*(1 - 0.4*gkWarn)
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
  kvg VGain "wave"
  kwg = (1 - 0.4*kbw)*kvg
  gaDryL = gaDryL + aL*0.55*kwg
  gaDryR = gaDryR + aR*0.55*kwg
  gaRevL = gaRevL + aL*0.35*kwg
  gaRevR = gaRevR + aR*0.35*kwg
endin

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
  kvg VGain "pad"
  ; airy upper shimmer (only in 3D): gives the ear something above 2 kHz to track
  aair noise 1, 0
  aair butbp aair, ifreq*8, ifreq*1.5
  aair = aair * (0.5 + 0.5*ktone) * 0.35 * kbin
  asig = (a1*1.6 + a3*0.5*(0.6 + ktone) + aair) * aenv * 0.022 * kvg
  aSL, aSR pan2 asig, kpan
  aBL, aBR hrtfmove2 asig, kaz, iel, gSHL, gSHR, 4, 9, sr
  RoomSend asig, kaz, 0.7*kbin
  aL = aSL*(1-kbin) + aBL*kbin*1.25
  aR = aSR*(1-kbin) + aBR*kbin*1.25
  gaDryL = gaDryL + aL*0.6
  gaDryR = gaDryR + aR*0.6
  gaRevL = gaRevL + aL*0.5
  gaRevR = gaRevR + aR*0.5
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
  irnd random 0, 7.99
  isemi table int(irnd), giScale
  imidi Deg2Midi isemi, 86
  ifreq = cpsmidinn(imidi)
  ; p4 = how dense the sparkle is
  kdens randomi 9*p4, 22*p4, 0.5
  agr dust2 1, kdens
  ; shards of porcelain touching: each grain strikes two ringing modes
  ilim = sr*0.29
  if2 = (ifreq*2.756 < ilim ? ifreq*2.756 : ilim)
  ar1 mode agr, ifreq, 900
  ar2 mode agr, if2, 700
  ahi buthp agr, 5000
  kvg VGain "shim"
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
  irnd random 0, 7.99
  isemi table int(irnd), giScale
  imidi Deg2Midi isemi, 91
  ifreq = cpsmidinn(imidi)
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
  kvg VGain "fly"
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
  kvg VGain "bass"
  asig = apl*aenv*afade*p5*kvg*2.6
  ; low notes carry little direction: the bass stays centred, with a little room
  gaDryL = gaDryL + asig*0.55
  gaDryR = gaDryR + asig*0.55
  gaRevL = gaRevL + asig*0.12
  gaRevR = gaRevR + asig*0.12
endin

; ---------- melody: a flute, played with breath ----------
; A waveguide flute: an air jet drives a tube. More breath noise at the start of
; each note, a glide from the note before, vibrato only on notes that linger.
; p4 pitch, p5 previous pitch, p6 amplitude
instr 8
  ifreq = cpsmidinn(p4)
  iprev = cpsmidinn(p5)
  iatt = (p3*0.2 < 0.14 ? p3*0.2 : 0.14)
  irel = (p3*0.45 < 1.3 ? p3*0.45 : 1.3)
  kfr expseg iprev, 0.11, ifreq, p3, ifreq
  kvd linseg 0, 0.6, 0, 1.2, 1
  kvib oscili 0.005*kvd, 5.1
  kfr = kfr*(1 + kvib)
  ; the model plays 15-35 cents sharp depending on pitch (measured): tune it
  kcor = 35 - 12.6*log(kfr/293.66)/log(2)
  kft = kfr*exp(-kcor*log(2)/1200)
  aenv linseg 0, iatt, 1, p3-iatt-irel, 0.75, irel, 0
  ; breath: airy at the onset, clearer as the note settles
  kng expseg 0.4, 0.35, 0.12, p3, 0.09
  afl wgflute 0.9, kft, 0.32, 0.08, 0.2, kng, 0, 0, giSine, 80
  asig = afl*aenv*p6*1.9
  asig butlp asig, 7000
  kvg VGain "mel"
  Place asig*kvg, gkMelAz, 8, 0.5 + gkMelAz/120, 0.75, 0.45, 0.6
endin

; ---------- counter-melody: a bowed string, warm, behind you ----------
instr 9
  ifreq = cpsmidinn(p4)
  iatt = (p3*0.3 < 0.5 ? p3*0.3 : 0.5)
  irel = (p3*0.45 < 1.5 ? p3*0.45 : 1.5)
  aenv linseg 0, iatt, 1, p3-iatt-irel, 0.8, irel, 0
  ; a waveguide model of a bowed string, with a slow gentle vibrato
  abow wgbow 1, ifreq, 3, 0.127236, 4.6, 0.004, giSine, 30
  ; kept dark and further back, so it supports the melody rather than leading
  abow butlp abow, ifreq*2.5
  abow dcblock2 abow
  kvg VGain "cnt"
  asig = abow*aenv*p5*kvg*1.1
  Place asig, gkCntAz, 0, 0.5 + 0.4*sin(gkCntAz*$M_PI/180), 0.55, 0.6, 0.9
endin

; ---------- phrase: the breathing conductor ----------
; Each phrase plays the motif 1-3 times (statements), one chord each: the melody
; varies it (as is, inverted, backwards, slower, or a fragment in sequence), and the
; counter, bass and chords follow the harmony. Then the music rests.
;  - Every voice has its own rhythm row (notes in each of 8 beats, stretched over
;    the statement) and its own breath row (how late it joins each phrase; a full
;    bar means it sits that phrase out).
;  - Inputs are frozen: tonality, motif, rhythm, breath and activity are read once, here,
;    when the phrase begins. A change on the page is heard from the next phrase.
;  - The music decides when to rest: a phrase ends when a statement arrives on the
;    root or fifth of its chord (or after three statements).
;  - The phrase has a shape: it rises to its second statement and falls to the rest.
;  - It prepares the rest: gkWarn rises over its last seconds (drops thin and ring
;    longer), the last note is the chord's root and is held longest, and before a
;    long rest the harmony comes home to I.
;  - The rest is earned: longer after a long phrase, and after a loud one (the
;    piece measures its own loudness while the phrase plays).
instr 10
  giPhraseN = giPhraseN + 1
  ReadTonality
  ReadPatterns
  ; development between phrases: every other phrase or so, the motif changes a little
  iev random 0, 1
  if giPhraseN > 1 && iev < 0.5 then
    MutateMotif
  endif
  ; the melody's rhythm: its row becomes the motif's note lengths
  icnt Onsets 0
  icnt = (icnt > 16 ? 16 : icnt)
  ik = 0
  while ik < icnt do
    itmp table ik, giLen
    tableiw itmp, ik, giMotR
    ik = ik + 1
  od
  if icnt < 2 then
    tableiw 1, 0, giMotR
    tableiw 2, 1, giMotR
    icnt = 2
  endif
  giMotN = icnt
  iph = (giPhraseN - 1) % 8
  irdef table iph, giRestDef
  Srn sprintf "rest%d", iph
  irestv CtlI Srn, irdef
  iarc = i(gkArc)
  iamel CtlI "act_mel", 0.5
  iacnt CtlI "act_cnt", 0.5
  iabas CtlI "act_bass", 0.5
  iapad CtlI "act_pad", 0.5
  iadr CtlI "act_drop", 0.5
  iash CtlI "act_shim", 0.5
  iafl CtlI "act_fly", 0.5
  iamel limit iamel*(0.75 + 0.5*iarc), 0, 1
  iacnt limit iacnt*(0.75 + 0.5*iarc), 0, 1
  iabas limit iabas*(0.75 + 0.5*iarc), 0, 1
  ; a slightly different tempo each phrase; calmer melody = slower, more lingering
  ibeat random 0.72, 0.86
  ibeat = ibeat*(1.3 - 0.5*iamel)
  ; breath per voice: when each one may join this phrase (99999 = not at all)
  iW[] init 8
  ik = 0
  while ik < 8 do
    iwv table ik*8 + iph, giWaitT
    iW[ik] = (iwv >= 0.95 ? 99999 : (iwv <= 0.02 ? 0 : 0.2 + iwv*16*ibeat))
    ik = ik + 1
  od
  ; development weights
  iVw[] init 5
  isumw = 0
  ik = 0
  while ik < 5 do
    itmp table ik, giVarW
    itmp = (itmp < 0 ? 0 : itmp)
    iVw[ik] = itmp
    isumw = isumw + itmp
    ik = ik + 1
  od
  irs random 0, 1
  idone = 0
  iDeg[] init 40
  iDur[] init 40
  itime = 0.2
  ilastM = 0
  ilastM2 = 0
  iroot = 0
  ist = 0
  while ist < 3 && idone == 0 do
    iroot table giProgPos % 8, giProg
    inextr table (giProgPos + 1) % 8, giProg
    iroot = iroot % 7
    inextr = inextr % 7
    giProgPos = giProgPos + 1
    ; a third statement before a long rest comes home to the first chord (cadence)
    if ist == 2 && irestv > 0.6 then
      iroot table 0, giProg
      iroot = iroot % 7
    endif
    ; ---- this statement's version of the motif, chosen by the development weights ----
    ivr random 0, isumw
    ivar = 0
    iacc = iVw[0]
    ik = 1
    while ik < 5 do
      if ivr >= iacc then
        ivar = ik
      endif
      iacc = iacc + iVw[ik]
      ik = ik + 1
    od
    ivar = (isumw <= 0 ? 0 : ivar)
    itrans = (iroot > 3 ? iroot - 7 : iroot)
    id0 MotDeg 0
    iN = 0
    if ivar == 4 then
      ; fragment, then the same fragment a step higher
      ihalf = ceil(giMotN/2)
      irep = 0
      while irep < 2 do
        ij = 0
        while ij < ihalf do
          itmp MotDeg ij
          iDeg[iN] = itmp + irep + itrans
          itmp table ij, giMotR
          iDur[iN] = itmp
          iN = iN + 1
          ij = ij + 1
        od
        irep = irep + 1
      od
    else
      ij = 0
      while ij < giMotN do
        idx = (ivar == 2 ? giMotN - 1 - ij : ij)
        itmp MotDeg idx
        itmp = (ivar == 1 ? 2*id0 - itmp : itmp)
        iDeg[iN] = itmp + itrans
        itmp table idx, giMotR
        iDur[iN] = itmp*(ivar == 3 ? 1.5 : 1)
        iN = iN + 1
        ij = ij + 1
      od
    endif
    ; the music decides: has this statement arrived somewhere it can rest?
    itmp = iDeg[iN-1]
    irel = itmp - iroot
    irel = irel - 7*floor(irel/7)
    ifinal = (ist == 2 ? 1 : 0)
    if ist > 0 && (irel == 0 || irel == 4) then
      ifinal = 1
    endif
    if ist == 0 && irs < 0.15 then
      ifinal = 1
    endif
    idone = ifinal
    ; the shape of the whole phrase: rise to the second statement, fall to the rest
    ishape = (ist == 0 ? 0.8 : (ist == 1 ? 1.1 : 0.92))
    ishape = (ifinal == 1 && ist > 0 ? ishape*0.88 : ishape)
    ; linger on the last note, with a little ritardando into it,
    ; landing on a chord tone (on the root, held longest, at the end of the phrase)
    iDur[iN-1] = (iDur[iN-1] < 2 ? 2 : iDur[iN-1])*(ifinal == 1 ? 2.2 : 1.5)
    if iN > 1 then
      iDur[iN-2] = iDur[iN-2]*1.25
    endif
    itmp = iDeg[iN-1]
    isn SnapChord itmp, iroot, ifinal
    iDeg[iN-1] = isn
    ; ---- schedule the melody: low activity drops notes and lets the others ring ----
    istart = itime
    ipdeg = iDeg[0]
    ipst = itime
    ipdur = iDur[0]*ibeat
    itime = itime + ipdur
    ij = 1
    while ij <= iN do
      iskip = 0
      if ij < iN - 1 then
        isk random 0, 1
        iskip = (isk < (0.4 - 0.6*iamel) ? 1 : 0)
      endif
      if iskip == 1 then
        itmp = iDur[ij]*ibeat
        ipdur = ipdur + itmp
        itime = itime + itmp
      else
        idg = ipdeg
        idg = (idg > 10 ? idg - 7 : (idg < -4 ? idg + 7 : idg))
        imid Deg2Midi idg, 62
        iprev = (giMelPrev > 0 ? giMelPrev : imid)
        ; dynamics: each statement swells to its middle and falls away (a breath)
        iamp = 0.085*ishape*(0.7 + 0.4*sin($M_PI*(ij - 0.5)/iN))
        iorn random 0, 1
        if iorn < (iamel - 0.45)*0.9 && ipdur > ibeat*0.9 then
          ; busier: a quick neighbour note leans into the main one
          igr = 0.22*ibeat
          ign Deg2Midi idg + 1, 62
          if ipst >= iW[0] then
            event_i "i", 8, ipst, igr + 0.6, ign, iprev, iamp*0.6
            event_i "i", 8, ipst + igr, ipdur - igr + 1.3, imid, ign, iamp
          endif
        elseif ipst >= iW[0] then
          event_i "i", 8, ipst, ipdur + 1.3, imid, iprev, iamp
        endif
        giMelPrev = imid
        ilastM2 = ilastM
        ilastM = imid
        if ij < iN then
          ipdeg = iDeg[ij]
          ipst = itime
          ipdur = iDur[ij]*ibeat
          itime = itime + ipdur
        endif
      endif
      ij = ij + 1
    od
    ilen = itime - istart
    ; the other voices lay their 8 beats across the statement
    ibl = ilen/8
    ; ---- chords: one entry per note of the chords' rhythm row; tones from the chord shape ----
    ipr = (iroot > 4 ? iroot - 7 : iroot)
    ip1 Deg2Midi ipr, 50
    giLastRoot = ip1
    intn = (iapad > 0.65 ? 4 : (iapad > 0.25 ? 3 : 2))
    icnt Onsets 3
    ic = 0
    while ic < icnt do
      ion table ic, giOn
      idu table ic, giLen
      itc = istart + ion*ibl
      ; chords overlap into what follows, but the phrase's last chord fades with its
      ; last note, so the rest is a real rest
      ipd = idu*ibl + (ic == icnt-1 ? (ifinal == 1 ? 2 : 7) : 2.5)
      ik = 0
      while ik < intn do
        ish table ik, giShape
        ipm Deg2Midi ipr + ish, 50
        if itc >= iW[3] then
          event_i "i", 4, itc + ik*(ic == 0 ? 0.7 : 0.25), ipd, ipm
        endif
        ik = ik + 1
      od
      ic = ic + 1
    od
    ; ---- bass: the root first, then fifth and root in turn; busier steps into the next chord ----
    ibr = (iroot > 4 ? iroot - 7 : iroot)
    inr = (inextr > 4 ? inextr - 7 : inextr)
    icnt Onsets 2
    ic = 0
    while ic < icnt do
      ion table ic, giOn
      idu table ic, giLen
      itb = istart + ion*ibl
      isk random 0, 1
      ibd = ibr + (ic % 2 == 1 ? 4 : 0)
      if ic == icnt-1 && ic > 0 && iabas > 0.6 then
        ibd = inr - 1
      endif
      ibm Deg2Midi ibd, 38
      if (ic == 0 || isk > 0.5 - iabas) && itb >= iW[2] then
        event_i "i", 7, itb, idu*ibl + 1.2, ibm, (ic == 0 ? 0.07 : 0.05)
      endif
      ic = ic + 1
    od
    ; ---- counter: its own rhythm, moving against the melody on chord tones ----
    idir = (iDeg[iN-1] > iDeg[0] ? -1 : 1)
    icd = (idir < 0 ? 9 : 4)
    icd SnapChord icd, iroot, 0
    icnt Onsets 1
    ic = 0
    while ic < icnt do
      ion table ic, giOn
      idu table ic, giLen
      itc = istart + ion*ibl
      isk random 0, 1
      if isk < 0.35 + 1.3*iacnt && iacnt > 0.03 && itc >= iW[1] then
        icm Deg2Midi icd, 50
        event_i "i", 9, itc, idu*ibl + 1.6, icm, 0.06
        icd SnapChord icd + 2*idir, iroot, 0
      endif
      ic = ic + 1
    od
    ; ---- drops: on their own rhythm; toward the rest they ring longer ----
    icnt Onsets 4
    ic = 0
    while ic < icnt do
      ion table ic, giOn
      itd = istart + ion*ibl
      isk random 0, 1
      if isk < 0.25 + 1.2*iadr && itd >= iW[4] then
        idd random 1.4, 3.8
        idd = idd*(ifinal == 1 && ion >= 5 ? 1.6 : 1)
        ijit random 0, 0.05
        event_i "i", 2, itd + ijit, idd
      endif
      ic = ic + 1
    od
    ; ---- shimmer: a sparkle circling the head at each note of its row ----
    icnt Onsets 6
    ic = 0
    while ic < icnt do
      ion table ic, giOn
      idu table ic, giLen
      its = istart + ion*ibl
      isk random 0, 1
      if isk < 0.2 + 1.4*iash && its >= iW[6] then
        isd = idu*ibl + 1.5
        event_i "i", 5, its, (isd < 3 ? 3 : isd), 0.5 + iash
      endif
      ic = ic + 1
    od
    ; ---- flyer: a fly-by at each note of its row (more activity = more often) ----
    icnt Onsets 7
    ic = 0
    while ic < icnt do
      ion table ic, giOn
      itf = istart + ion*ibl
      isk random 0, 1
      if isk < 1.4*iafl^1.5 && itf >= iW[7] then
        ifd random 6, 9
        event_i "i", 6, itf, ifd
      endif
      ic = ic + 1
    od
    ; a short breath between statements
    igap random 0.3, 0.9
    itime = itime + igap*ibeat
    ist = ist + 1
  od
  p3 = itime
  ; ---- the rest: from the breath multislider, longer after a longer phrase ----
  irv random 0.9, 1.1
  ilenf limit 0.75 + itime/60, 0.8, 1.25
  irest = (1 + 9*irestv)*irv*ilenf
  ; after a long rest the next phrase starts the progression again (a new paragraph)
  if irestv > 0.6 then
    giProgPos = 0
  endif
  ; tell the page which breath bar this phrase uses
  chnset (giPhraseN - 1) % 8, "ph_idx"
  ; a busy counter answers the melody's last two notes as the rest begins
  if iacnt > 0.6 && irest > 4 then
    event_i "i", 9, itime + 0.5, 2.2, ilastM2 - 12, 0.05
    event_i "i", 9, itime + 1.6, 2.8, ilastM - 12, 0.05
  endif
  ; ---- while the phrase sings ----
  kt timeinsts
  gkPhrase = 1
  gkBeat = int(kt/ibeat) % 8
  gkWaveIn = (kt >= iW[5] ? 1 : 0)
  gkRoot = giLastRoot
  ; warn the rest of the piece that a pause is coming (last 4 seconds)
  gkWarnSet limit (kt - (p3 - 4))/4, 0, 1
  ; listen: how loud was this phrase compared with the phrases before it?
  ksum init 0
  kn init 0
  ksum = ksum + gkLoud
  kn = kn + 1
  kdone init 0
  if kt >= p3 - 4*ksmps/sr && kdone == 0 then
    kmean = ksum/kn
    kratio = (gkLoudAvg > 0.00001 ? kmean/gkLoudAvg : 1)
    kratio limit kratio, 0.8, 1.25
    gkLoudAvg = (gkLoudAvg > 0.00001 ? gkLoudAvg + 0.3*(kmean - gkLoudAvg) : kmean)
    ; a louder phrase earns a longer breath; then the next phrase begins
    event "i", 10, 4*ksmps/sr + irest*kratio, 1
    chnset irest*kratio, "ph_rest"
    kdone = 1
  endif
endin

; ---------- tone in silence: a soft drone that fills the rests (switchable) ----------
instr 11
  kon Ctl "drone", 1
  kg port kon*(1 - gkInPhrase), 2.5
  kroot port gkRoot, 3
  kf = cpsmidinn(kroot)
  a1 poscil 1, kf
  a2 poscil 0.5, kf*1.5
  a3 poscil 0.25, kf*2.002
  kbr oscili 0.25, 1/9
  asig = (a1 + a2 + a3)*kg*0.02*(0.75 + kbr)
  asig butlp asig, 1200
  Place asig, 330, 0, 0.35, 0.6, 0.4, 0.5
  Place asig, 30, 0, 0.65, 0.6, 0.4, 0.5
endin

; ---------- room: binaural early reflections + late tail ----------
; Listener stands in the middle of a 10 x 10 x 3 m room (+x = right, +y = ahead);
; each bus sounds from 2.2 m away in its quarter.
instr 98
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
  clear gaQ1, gaQ2, gaQ3, gaQ4
endin

; ---------- master: reverb, volume, fade-in, soft limit ----------
instr 99
  kvol Ctl "vol", 0.8
  kvol port kvol, 0.25
  ; slow 6 s fade-in so nobody is startled on arrival
  kfade linseg 0, 6, 1
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
  ; the piece hears itself (before the volume control)
  gkLoud rms aL + aR
  aL = aL * kvol * kfade
  aR = aR * kvol * kfade
  aL = tanh(aL)
  aR = tanh(aR)
  krms rms aL + aR
  chnset krms, "level"
  outs aL, aR
  clear gaDryL, gaDryR, gaRevL, gaRevR
endin
</CsInstruments>
<CsScore>
i 1 0 z
i 3 0 z
i 10 4 1
i 11 0 z
i 98 0 z
i 99 0 z
</CsScore>
</CsoundSynthesizer>
