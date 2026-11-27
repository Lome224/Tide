; Tide, part 3 of 9: each voice's rhythm and rests, and what the machines share

; The page can overwrite each voice's rhythm row and breath row (a Max multislider is
; exactly such a list). The rhythm row is read at every beat, so a change is heard from
; the next beat. The breath row is read when a phrase begins.

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
