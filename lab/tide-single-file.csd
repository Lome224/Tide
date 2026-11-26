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
; 0.5 = as designed (0 dB), 1 = four times louder (+12 dB), 0 = silent
opcode VGain, k, i
  iv xin
  Son sprintf "on%d", iv
  Slv sprintf "lvl%d", iv
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

; ---------- the music's shared state ----------
; Voices: 0 counter, 1 bass, 2 chords, 3 drops, 4 waves, 5 shimmer, 6 flyer.
; Each voice is driven by its own machine (instr 10): it plays a phrase, rests, and
; starts again, on its own cycle. What all voices share is the harmony:
;   colour  whole-tone and pentatonic (mood 0, after Debussy), or the half-whole
;           scale (mood 1, dark, after Berklee Harmony 4). It changes only when the
;           three pitched voices are all waiting, never during a phrase.
;   set     the notes of the current colour, as semitones above the tonic
;   root    which note of the set is "home" for now. It moves when the counter
;           starts a phrase; the set stays, so voices in mid-phrase never clash.
; The page can overwrite each voice's rhythm row and breath row (a Max multislider
; is exactly such a list). A voice reads its rows when its phrase BEGINS and never
; during it, so each phrase keeps one character.
giSet ftgen 0, 0, -8, -2, 0, 2, 4, 7, 9, 0, 0, 0
giSetN init 5
giColour init 0
; the three colours: whole-tone (6 notes), pentatonic (5), half-whole (8)
giSets ftgen 0, 0, -24, -2, 0, 2, 4, 6, 8, 10, 0, 0,  0, 2, 4, 7, 9, 0, 0, 0,  0, 1, 3, 4, 6, 7, 9, 10
giSetNs ftgen 0, 0, -3, -2, 6, 5, 8
giSection init 0
giTonic init 0
giShift init 0
giRootIdx init 0
; chord shapes, as steps of the set above the chord's lowest note.
;   whole-tone: an augmented triad plus ninth       pentatonic: stacked fifths plus tenth
;   dark: polychords (Harmony 4, part 5). The lower structure is root and fifth; the
;   upper structure is a close major triad more than a third above it: on the
;   tritone (C with F sharp major above), or on the sixth (C with A major above).
giShapes ftgen 0, 0, -20, -2, 0, 2, 4, 7, 9,  0, 3, 6, 7, 9,  0, 5, 12, 15, 17,  0, 5, 14, 17, 19
; where the dark chord stands in its descent, and how the root last moved
giChPos init 0
giLastMove init 0
giGatherDone init 0
; root movement is a Markov chain: the row is the last move, the columns are the
; chances of the next one. Moves: a step up, a step down, a skip up.
; After a step the line tends to continue; after a skip it tends to turn back.
giMarkov ftgen 0, 0, -9, -2,  0.55, 0.25, 0.2,   0.3, 0.5, 0.2,   0.2, 0.65, 0.15
; the motif: 8 notes, as steps of the set above the root. The piece develops it.
giMotD ftgen 0, 0, -8, -2, 0, 2, 1, 4, 3, 2, 0, -1
; rhythm, one row of 8 beats per voice: how many notes start in each beat
; (0 = the note before is held). The waves read their row as a swell height.
;                              counter                  bass                     chords
giDivDef ftgen 0, 0, -56, -2,  0, 1, 0, 0, 1, 0, 0, 0,  1, 0, 0, 0, 0, 0, 0, 0,  1, 0, 0, 0, 0, 0, 0, 0, \
                               1, 0, 2, 0, 0, 1, 0, 0,  1, 1, 2, 2, 3, 2, 1, 1,  0, 0, 0, 0, 1, 0, 0, 0,  0, 0, 0, 0, 0, 0, 1, 0
;                              drops                    waves                    shimmer                  flyer
; breath, one row of 8 phrases per voice: how long it rests after each (0 short ..
; 0.9 long). A full bar (1) means: wait until everyone is silent. When counter,
; bass and chords are all waiting, the colour changes and they start
; again together, then drift apart once more.
giWaitDef ftgen 0, 0, -56, -2, 0.4, 0.3, 0.6, 0.4, 0.3, 0.5, 0.4, 1,  0.2, 0.2, 0.4, 0.2, 0.2, 0.3, 0.2, 1,  0.2, 0.2, 0.3, 0.2, 0.2, 0.3, 0.2, 1, \
                               0.3, 0.5, 0.3, 0.8, 0.3, 0.5, 0.3, 0.6,  0.2, 0.2, 0.3, 0.2, 0.2, 0.3, 0.2, 0.4,  0.8, 0.5, 0.9, 0.6, 0.8, 0.5, 0.9, 0.7,  0.9, 0.8, 0.9, 0.9, 0.7, 0.9, 0.9, 0.9
giDivT ftgen 0, 0, -64, -2, 0
giWaitT ftgen 0, 0, -64, -2, 0
; scratch lists filled by Onsets: where each note starts, and how long it is (in beats)
giOn ftgen 0, 0, -32, -2, 0
giLen ftgen 0, 0, -32, -2, 0
; how many phrases each voice has played
giPhN ftgen 0, 0, -8, -2, 0
; each machine's state, for the other instruments and for the page
gkRun[] init 7
gkWait[] init 7
gkWarnV[] init 7
gkBeatV[] init 7
gkSec init 0
gkCntAz init 180

; a note of the current set: degree 0 is the tonic, degrees wrap by the octave
opcode SetMidi, i, ii
  ideg, ibase xin
  ioct = floor(ideg/giSetN)
  isemi table ideg - ioct*giSetN, giSet
  xout ibase + giTonic + 12*ioct + isemi
endop

; note number n of the motif
opcode MotDeg, i, i
  inum xin
  id table inum % 8, giMotD
  xout id + int(inum/8)
endop

; a new section. Mood 0 alternates whole-tone and pentatonic; mood 1 is the
; half-whole scale. The key moves by a semitone or a minor third.
opcode NewSection, 0, 0
  giSection = giSection + 1
  imood CtlI "mood", 0
  giColour = (imood > 0.5 ? 2 : (giColour == 1 ? 0 : 1))
  giSetN table giColour, giSetNs
  ik = 0
  while ik < 8 do
    iv table giColour*8 + ik, giSets
    tableiw iv, ik, giSet
    ik = ik + 1
  od
  ; the key moves by itself at each section, unless the page has just asked for a
  ; change: then the root chosen there is used exactly
  ireq chnget "gather"
  if ireq != giGatherDone then
    giShift = 0
  elseif giSection > 1 then
    im random 0, 3.99
    im = int(im)
    giShift = giShift + (im == 0 ? 1 : (im == 1 ? -1 : (im == 2 ? 3 : -3)))
  endif
  itn CtlI "tonic", 0
  itn = itn + giShift
  giTonic = itn - 12*floor((itn + 5)/12)
  giRootIdx = 0
  giChPos = 0
  ; a change of root or mood on the page asks everyone to gather; this answers it
  giGatherDone = ireq
  chnset giColour, "colour_now"
  chnset giTonic, "tonic_now"
  chnset giSection, "section_now"
endop

; read one voice's rhythm row and breath row from the page (or keep the defaults)
opcode ReadRows, 0, i
  iv xin
  ik = 0
  while ik < 8 do
    idef table iv*8 + ik, giDivDef
    Sn sprintf "div%d_%d", iv, ik
    ival CtlI Sn, idef
    tableiw ival, iv*8 + ik, giDivT
    idef table iv*8 + ik, giWaitDef
    Sn sprintf "wait%d_%d", iv, ik
    ival CtlI Sn, idef
    tableiw ival, iv*8 + ik, giWaitT
    ik = ik + 1
  od
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

; development: between phrases the motif changes a little
opcode MutateMotif, 0, 0
  ir random 0, 1
  ij random 1, 6.99
  ij = int(ij)
  ia table ij, giMotD
  ib table ij+1, giMotD
  if ir < 0.6 then
    ; one note moves a step
    is random 0, 1
    ia = ia + (is < 0.5 ? 1 : -1)
    tableiw (ia > 7 ? 6 : (ia < -3 ? -2 : ia)), ij, giMotD
  else
    ; two neighbouring notes swap places
    tableiw ib, ij, giMotD
    tableiw ia, ij+1, giMotD
  endif
endop

; ---------- conductor: space, and the change of colour ----------
instr 1
  NewSection
  krm Ctl "room", 0.5
  gkRoom = krm*2
  ; the counter-voice moves slowly behind you and to the side
  kca oscili 70, 1/53
  gkCntAz = 180 + kca
  ; when counter, bass and chords have all been waiting for a second, the piece
  ; is at its structural pause: change colour (instr 11 then restarts everyone).
  ; The colour changes at no other time.
  kwt init 0
  kwt = (gkWait[0] + gkWait[1] + gkWait[2] > 2.5 ? kwt + 1/kr : 0)
  if kwt > 1 then
    event "i", 12, 0, 0.1
    kwt = 0
  endif
  ; tell the page which machines are running
  chnset gkRun[0] + 2*gkRun[1] + 4*gkRun[2] + 8*gkRun[3] + 16*gkRun[4] + 32*gkRun[5] + 64*gkRun[6], "runbits"
endin

instr 12
  NewSection
  gkSec = giSection
endin

; a machine waiting for the structural pause: when the colour has changed, begin again
instr 11
  kfrom init -1
  kfrom = (kfrom < 0 ? gkSec : kfrom)
  gkWait[p4] = 1
  if gkSec != kfrom then
    gkWait[p4] = 0
    event "i", 10, 1.5, 1, p4
    turnoff
  endif
endin

; ---------- machine: one per voice. A phrase, a rest, and again. ----------
; p4 = voice. This instrument stands where a sculpture will: it decides when the
; voice's phrase starts and how long it runs, warns that the pause is coming, and
; rests. A phrase is two passes of the voice's 8-beat rhythm row.
instr 10
  iv = p4
  ReadRows iv
  iph table iv, giPhN
  tableiw iph + 1, iv, giPhN
  ; each machine is a little slower than the one before, so they drift apart
  ; and come back together (phasing)
  idrift CtlI "drift", 0.5
  irun = 13 + 2.4*idrift*iv
  ibl = irun/16
  iwv table iv*8 + iph % 8, giWaitT
  irest = 1 + 9*iwv
  ; the page has changed the root or the mood: do not start a phrase. Wait, so the
  ; shared silence comes as soon as the phrases now sounding have ended.
  ireq chnget "gather"
  igath = (ireq != giGatherDone ? 1 : 0)
  irun = (igath == 1 ? 0.05 : irun)
  p3 = irun
  ; after the phrase: rest and begin again, or wait for the structural pause
  if iwv >= 0.95 || igath == 1 then
    event_i "i", 11, irun, 36000, iv
  else
    event_i "i", 10, irun + irest, 1, iv
  endif
  Sa sprintf "act%d", iv
  iact CtlI Sa, 0.5
  ; the counter leads: when it begins a phrase, home moves to a neighbouring note
  ; of the set, and the motif may change a little
  if iv == 0 && iph > 0 && igath == 0 then
    ; the next move is drawn from the Markov row of the last one
    ir random 0, 1
    ip0 table giLastMove*3, giMarkov
    ip1 table giLastMove*3 + 1, giMarkov
    im = (ir < ip0 ? 0 : (ir < ip0 + ip1 ? 1 : 2))
    giLastMove = im
    ; in the dark colour a step is a minor third and a skip a tritone, so home
    ; moves round the four tonics of the scale
    iunit = (giColour == 2 ? 2 : 1)
    giRootIdx = (giRootIdx + iunit*(im == 0 ? 1 : (im == 1 ? giSetN - 1 : 2))) % giSetN
    idev random 0, 1
    if idev < 0.5 then
      MutateMotif
    endif
  endif
  irt = giRootIdx
  ; the second pass varies the motif: as is, upside down, backwards, or a step higher
  ivar random 0, 3.99
  ivar = int(ivar)
  id0 MotDeg 0
  ; chord tones: 2 to 4 by activity; a polychord needs both its structures
  ichn = (iact > 0.65 ? 4 : (iact > 0.25 ? 3 : 2)) + (giColour == 2 ? 1 : 0)
  irow = (giColour == 2 ? 2 + giSection % 2 : giColour)
  ipos = 0
  icnt Onsets iv
  ipass = 0
  while ipass < 2 && iv != 4 && igath == 0 do
    ic = 0
    while ic < icnt do
      ion table ic, giOn
      idu table ic, giLen
      it = 0.1 + (ipass*8 + ion)*ibl
      ilast = (ipass == 1 && ic == icnt-1 ? 1 : 0)
      id = (ilast == 1 ? irun - it : idu*ibl)
      isk random 0, 1
      irn random 0, 1
      ; activity: how many of the row's notes are played (first and last always)
      if isk < 0.3 + 1.4*iact || ilast == 1 || ipass + ic == 0 then
        if iv == 0 then
          ; counter: the motif, upside down
          idx = (ipass == 1 && ivar == 2 ? icnt - 1 - ic : ic)
          idg MotDeg idx
          idg = (ipass == 1 && ivar == 1 ? 2*id0 - idg : idg)
          idg = idg + (ipass == 1 && ivar == 3 ? 1 : 0)
          idg = 2*id0 - idg
          ; the phrase ends unresolved: on the second, or on the note below home
          if ilast == 1 then
            idg = (irn < 0.5 ? 1 : -1)
          endif
          imid SetMidi idg + irt, 50
          ; each phrase swells to its middle and falls away
          event_i "i", 9, it, id + 1.5, imid, 0.085*(0.7 + 0.4*sin($M_PI*it/irun))
        elseif iv == 1 then
          ; bass: a pedal on the note that was home when its phrase began
          imid SetMidi irt - (ic % 2), 38
          event_i "i", 7, it, id + 1.2, imid, (ic == 0 ? 0.055 : 0.04)
        elseif iv == 2 then
          ; chords: one shape, moved in parallel from entry to entry
          ik = 0
          while ik < ichn do
            ish table irow*5 + ik, giShapes
            imid SetMidi irt + ipos + giChPos + ish, 50
            event_i "i", 4, it + ik*0.5, id + (ilast == 1 ? 1.5 : 3), imid
            ik = ik + 1
          od
          if giColour == 2 then
            ; constant structure (Harmony 4, part 6): the same polychord, down a
            ; minor third each time. The half-whole scale is the same at every
            ; minor third, so the chord scale stays constant. Before the shared
            ; silence the pattern is broken: the last chord moves by one step instead.
            giChPos = giChPos + (iwv >= 0.95 && ilast == 1 ? 1 : -2)
            giChPos = (giChPos < -7 ? giChPos + 8 : giChPos)
          else
            ipos = ipos + (irn < 0.5 ? 1 : -1)
          endif
        elseif iv == 3 then
          imid SetMidi int(irn*2*giSetN), 74
          event_i "i", 2, it + irn*0.05, 0.9, imid
        elseif iv == 5 then
          imid SetMidi int(irn*giSetN), 86
          event_i "i", 5, it, (id + 1.5 < 3 ? 3 : id + 1.5), 0.5 + iact, imid
        elseif isk < 1.4*iact^1.5 then
          imid SetMidi int(irn*giSetN), 91
          event_i "i", 6, it, 6 + 3*irn, imid
        endif
      endif
      ic = ic + 1
    od
    ipass = ipass + 1
  od
  ; while the phrase runs: tell the others, count the beats, warn of the pause
  kt timeinsts
  krun = (kt < p3 - 3/kr ? 1 : 0)
  gkRun[iv] = krun
  gkBeatV[iv] = int(kt/ibl) % 8
  kwarn limit (kt - (p3 - 3))/3, 0, 1
  gkWarnV[iv] = kwarn*krun
endin

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
; the seven machines start together and drift apart
i 10 2 1 0
i 10 2 1 1
i 10 2 1 2
i 10 2 1 3
i 10 2 1 4
i 10 2 1 5
i 10 2 1 6
i 98 0 z
i 99 0 z
</CsScore>
</CsoundSynthesizer>
