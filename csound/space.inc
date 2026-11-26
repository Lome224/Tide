; Tide, part 1 of 7: the binaural space (HRTF data, the room buses)

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
