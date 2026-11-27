; Tide, part 4 of 7: the conductor and the machines that give each voice its phrases

; ---------- conductor: space, and the change of colour ----------
instr 1
  giLite CtlI "lite", 0
  NewSection
  krm Ctl "room", 0.5
  gkRoom = krm*2
  ; the counter-voice moves slowly behind you and to the side
  kca oscili 70, 1/53
  gkCntAz = 180 + kca
  ; the page has changed the root or the colours: gather at once. Every voice that is not
  ; already waiting is retired (its number in giGen moves on, so its phrase stops sounding
  ; new notes and anything it had planned is ignored) and put to wait. The shared silence
  ; then comes within a few seconds.
  kreq chnget "gather"
  kdone table 7, giGen
  kasked init -1
  if kreq != kdone && kreq != kasked then
    kasked = kreq
    kv = 0
    while kv < 7 do
      if gkWait[kv] == 0 then
        kg table kv, giGen
        tablew kg + 1, kv, giGen
        event "i", 11, 0, 36000, kv, kg + 1
      endif
      kv = kv + 1
    od
  endif
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

; a machine waiting for the structural pause: when the colour has changed, begin again.
; p4 = voice, p5 = its number in giGen when this was planned (see instr 10)
instr 11
  igen table p4, giGen
  if p5 != igen then
    turnoff
  else
    kfrom init -1
    kfrom = (kfrom < 0 ? gkSec : kfrom)
    gkWait[p4] = 1
    if gkSec != kfrom then
      gkWait[p4] = 0
      event "i", 10, 1.5, 1, p4, p5
      turnoff
    endif
  endif
endin

; ---------- machine: one per voice. A phrase, a rest, and again. ----------
; p4 = voice. This instrument stands where a sculpture will: it decides when the
; voice's phrase starts and how long it runs, warns that the pause is coming, and
; rests. A phrase is two passes of the voice's 8-beat rhythm row.
; p5 = the voice's number in giGen when this phrase was planned. If the number has
; moved on since (the page asked everyone to gather), the phrase is out of date.
instr 10
  iv = p4
  igen table iv, giGen
  if p5 != igen then
    turnoff
  else
    iph table iv, giPhN
    tableiw iph + 1, iv, giPhN
    ; each machine is a little slower than the one before, so they drift apart
    ; and come back together (phasing)
    idrift CtlI "drift", 0.5
    irun = 13 + 2.4*idrift*iv
    ibl = irun/16
    ReadRows iv
    iwv table iv*8 + iph % 8, giWaitT
    irest = 1 + 9*iwv
    p3 = irun
    ; after the phrase: rest and begin again, or wait for the structural pause
    if iwv >= 0.95 then
      event_i "i", 11, irun, 36000, iv, igen
    else
      event_i "i", 10, irun + irest, 1, iv, igen
    endif
    ; the counter leads: when it begins a phrase, home moves to a neighbouring note
    ; of the set, and the motif may change a little
    if iv == 0 && iph > 0 then
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
    ; the second pass varies the motif: as is, upside down, backwards, or a step higher
    ivar random 0, 3.99
    ivar = int(ivar)
    ; the chords begin each phrase from their home position
    if iv == 2 then
      tableiw 0, 8, giGen
    endif
    ; The phrase is played beat by beat (instr 20), 16 beats in all. Each beat reads the
    ; voice's rhythm row and activity when it arrives, so a change on the page is heard
    ; from the next beat. The waves do not play notes; they read their row as a swell.
    if iv != 4 then
      ib = 0
      while ib < 16 do
        event_i "i", 20, 0.1 + ib*ibl, 0.1, iv, igen, int(ib/8), ib % 8, irun, ibl, giRootIdx, ivar, iwv
        ib = ib + 1
      od
    endif
    ; while the phrase runs: tell the others, count the beats, warn of the pause
    kt timeinsts
    krun = (kt < p3 - 3/kr ? 1 : 0)
    gkRun[iv] = krun
    gkBeatV[iv] = int(kt/ibl) % 8
    kwarn limit (kt - (p3 - 3))/3, 0, 1
    gkWarnV[iv] = kwarn*krun
    ; retired by the conductor: stop at once
    kg table iv, giGen
    if kg != igen then
      gkRun[iv] = 0
      gkWarnV[iv] = 0
      turnoff
    endif
  endif
endin

; ---------- one beat of a phrase ----------
; p4 voice, p5 its giGen number, p6 pass (0 or 1), p7 beat (0 to 7), p8 the phrase's
; length, p9 one beat's length, p10 home when the phrase began, p11 how the second
; pass varies the motif, p12 the rest that follows the phrase.
; It reads the rhythm row and the activity now, and plays the notes that fall in this beat.
instr 20
  iv = p4
  igen table iv, giGen
  if p5 == igen then
    ipass = p6
    ibeat = p7
    irun = p8
    ibl = p9
    irt = p10
    ivar = p11
    iwv = p12
    ReadRows iv
    icnt Onsets iv
    Sa sprintf "act%d", iv
    iact CtlI Sa, 0.5
    id0 MotDeg 0
    ; chord tones: 2 to 4 by activity; a polychord needs both its structures
    ichn = (iact > 0.65 ? 4 : (iact > 0.25 ? 3 : 2)) + (giColour == 2 ? 1 : 0)
    ; chord shapes: the octatonic colour has its two polychords, whole-tone its augmented
    ; shape, and every other colour the stacked shape
    irow = (giColour == 2 ? 2 + giSection % 2 : (giColour == 0 ? 0 : 1))
    ic = 0
    while ic < icnt do
      ion table ic, giOn
      if ion >= ibeat && ion < ibeat + 1 then
        idu table ic, giLen
        ; iabs: since the phrase began. it: from now.
        iabs = 0.1 + (ipass*8 + ion)*ibl
        it = (ion - ibeat)*ibl
        ilast = (ipass == 1 && ic == icnt-1 ? 1 : 0)
        id = (ilast == 1 ? irun - iabs : idu*ibl)
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
            event_i "i", 9, it, id + 1.5, imid, 0.085*(0.7 + 0.4*sin($M_PI*iabs/irun))
          elseif iv == 1 then
            ; bass: a pedal on the note that was home when its phrase began
            imid SetMidi irt - (ic % 2), 38
            event_i "i", 7, it, id + 1.2, imid, (ic == 0 ? 0.055 : 0.04)
          elseif iv == 2 then
            ; chords: one shape, moved in parallel from entry to entry
            ipos table 8, giGen
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
              tableiw ipos + (irn < 0.5 ? 1 : -1), 8, giGen
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
      endif
      ic = ic + 1
    od
  endif
endin
