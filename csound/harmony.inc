; Tide, part 3 of 7: the shared harmony (colours, chord shapes, motif, sections)

; ---------- the music's shared state ----------
; Voices: 0 counter, 1 bass, 2 chords, 3 drops, 4 waves, 5 shimmer, 6 flyer.
; Each voice is driven by its own machine (instr 10): it plays a phrase, rests, and
; starts again, on its own cycle. What all voices share is the harmony:
;   colour  one of ten scales. Two of them are chosen (on the page: colA and colB)
;           and the piece alternates between the two. It changes only when the
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
; the ten colours, one row of 8 each, as semitones above the tonic:
;   0 whole-tone (the set a semitone above the tonic)   1 gong (pentatonic)
;   2 octatonic (half-whole)   3 dorian   4 phrygian   5 lydian
;   6 yu   7 jue   8 iwato   9 hirajoshi
giSets ftgen 0, 0, -80, -2, 1, 3, 5, 7, 9, 11, 0, 0,  0, 2, 4, 7, 9, 0, 0, 0,  0, 1, 3, 4, 6, 7, 9, 10, \
                           0, 2, 3, 5, 7, 9, 10, 0,  0, 1, 3, 5, 7, 8, 10, 0,  0, 2, 4, 6, 7, 9, 11, 0, \
                           0, 3, 5, 7, 10, 0, 0, 0,  0, 3, 5, 8, 10, 0, 0, 0,  0, 1, 5, 6, 10, 0, 0, 0,  0, 2, 3, 7, 8, 0, 0, 0
giSetNs ftgen 0, 0, -10, -2, 6, 5, 8, 7, 7, 7, 5, 5, 5, 5
; which of the two chosen colours is sounding: 0 = colA, 1 = colB
giSide init 1
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
; giGen: 0 to 6, a number for each voice that moves on when its machine is retired, so that
; what the old machine had planned is ignored; 7, the last gather request answered (so it
; can be read while playing); 8, how far the chords have moved in their current phrase
giGen ftgen 0, 0, -16, -2, 0
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

; a new section: the other of the two chosen colours (without a page: gong, then
; whole-tone). The key moves by a semitone or a minor third.
opcode NewSection, 0, 0
  giSection = giSection + 1
  ireq chnget "gather"
  ; a change made on the page begins with its first colour
  giSide = (ireq != giGatherDone ? 0 : 1 - giSide)
  ia CtlI "colA", 1
  ib CtlI "colB", 0
  giColour = int(limit(giSide == 0 ? ia : ib, 0, 9))
  giSetN table giColour, giSetNs
  ik = 0
  while ik < 8 do
    iv table giColour*8 + ik, giSets
    tableiw iv, ik, giSet
    ik = ik + 1
  od
  ; the key moves by itself at each section, unless the page has just asked for a
  ; change: then the root chosen there is used exactly
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
  ; a change of root or colours on the page asks everyone to gather; this answers it
  giGatherDone = ireq
  tableiw ireq, 7, giGen
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
