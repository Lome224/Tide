; Tide, part 2 of 9: reading the page's controls, voice gain, placing a sound

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

; Place a sound: binaurally at azimuth kaz and elevation kel (HRTF, plus a send to the
; binaural room), or as a plain stereo pan at kpan when binaural is off. Every voice ends here.
;   kdry, kwet   how much goes to the direct mix and to the reverb
;   kroom        how much goes to the binaural room
;   kst, kbg     level of the stereo version, and of the binaural one
opcode Place, 0, akkkkkkkk
  asig, kaz, kel, kpan, kdry, kwet, kroom, kst, kbg xin
  kbin Ctl "bin", 1
  kbin port kbin, 0.3
  kaz wrap kaz, 0, 360
  kpan limit kpan, 0, 1
  aSL, aSR pan2 asig*kst, kpan
  if giLite == 1 then
    aBL = aSL
    aBR = aSR
  else
    aBL, aBR hrtfmove2 asig, kaz, kel, gSHL, gSHR, 4, 9, sr
  endif
  RoomSend asig, kaz, kroom*kbin
  aL = aSL*(1-kbin) + aBL*kbin*kbg
  aR = aSR*(1-kbin) + aBR*kbin*kbg
  gaDryL = gaDryL + aL*kdry
  gaDryR = gaDryR + aR*kdry
  gaRevL = gaRevL + aL*kwet
  gaRevR = gaRevR + aR*kwet
endop
