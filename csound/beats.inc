; Tide, part 6 of 9: one beat of a phrase, where the notes are chosen

; instr 20, started by a machine (instr 10) for each of its 16 beats.
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
