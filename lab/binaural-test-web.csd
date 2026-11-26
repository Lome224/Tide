<CsoundSynthesizer>
<CsOptions>
-odac -d -m0
</CsOptions>
<CsInstruments>
; Binaural A/B test for Tide (headphones!).
; One isolated source, heard three ways, so you can judge the HRTF on its own:
;   0-12 s   A: plain stereo pan, circling once         (reference)
;  13-25 s   B: hrtfmove2, same circle, plus up/down     (dry binaural)
;  26-38 s   C: B + hrtfearly room + hrtfreverb tail     (binaural room)
;  40-48 s   D: the "flyer": passes 0.8 m from your head with Doppler
; Browser version: the page writes the HRTF data for the running sample rate into
; Csound's file system before start, and the "vol" channel sets the level.
sr = 48000
ksmps = 32
nchnls = 2
0dbfs = 1

gSHL sprintf "hrtf-%d-left.dat", sr
gSHR sprintf "hrtf-%d-right.dat", sr
gaRoom init 0

opcode VolOut, 0, aa
  aL, aR xin
  kv chnget "vol"
  kv port kv, 0.25
  outs aL*kv, aR*kv
endop

; the test source: bright articulated ticks (energy above 4 kHz carries direction cues)
opcode Ticks, a, i
  ifreq xin
  ; 9 pings per second, each a fast-decaying sine with a little downward chirp
  aph phasor 9
  aenv = exp(-aph*9)
  afr = ifreq*(1 + 0.08*exp(-aph*30))
  a1 poscil aenv, afr
  a2 poscil aenv*aenv*0.35, afr*2.71
  xout a1 + a2
endop

instr 1   ; A: stereo reference, one circle
  kaz line 0, p3, 360
  asig Ticks 3520
  aenv linseg 0, 0.3, 1, p3-0.6, 1, 0.3, 0
  asig = asig*aenv*0.3
  kpan = 0.5 + 0.5*sin(kaz*$M_PI/180)
  aL, aR pan2 asig, kpan
  VolOut aL, aR
endin

instr 2   ; B (p4=0) / C (p4=1): binaural circle, rising and falling
  kaz line 0, p3, 360
  kel oscili 30, 2/p3
  kel = kel + 10
  asig Ticks 3520
  aenv linseg 0, 0.3, 1, p3-0.6, 1, 0.3, 0
  asig = asig*aenv*0.3
  aL, aR hrtfmove2 asig, kaz, kel, gSHL, gSHR, 4, 9, sr
  VolOut aL*1.4, aR*1.4
  gaRoom = gaRoom + asig*p4
endin

instr 3   ; D: flyer with Doppler, straight line past the head
  kx line -16, p3, 16
  iy = 0.8
  iz = 0.4
  kd = sqrt(kx*kx + iy*iy + iz*iz)
  kaz = taninv2(kx, iy)*180/$M_PI
  kaz wrap kaz, 0, 360
  kel = taninv2(iz, sqrt(kx*kx + iy*iy))*180/$M_PI
  asrc Ticks 3520
  adel interp kd*1000/343
  asrc vdelay3 asrc, adel, 100
  aenv linseg 0, 0.3, 1, p3-0.6, 1, 0.3, 0
  asig = asrc*aenv*0.25/kd
  aL, aR hrtfmove2 asig, kaz, kel, gSHL, gSHR, 4, 9, sr
  VolOut aL*1.4, aR*1.4
  gaRoom = gaRoom + asig*0.3
endin

instr 98  ; room for C and D: early reflections from the source side + binaural tail
  aEL, aER, ilo, ihi, imfp hrtfearly gaRoom, 6.5, 6.5, 1.7, 5, 5, 1.7, gSHL, gSHR, 1, 8, sr, 1, 1
  aTL, aTR, idel hrtfreverb gaRoom*0.5, 2.4, 1.2, gSHL, gSHR, sr, imfp, 1
  aTL delay aTL, idel
  aTR delay aTR, idel
  VolOut aEL*2 + aTL, aER*2 + aTR
  clear gaRoom
endin
</CsInstruments>
<CsScore>
i 98 0 50
i 1  0  12
i 2 13  12 0
i 2 26  12 1
i 3 40   8
e
</CsScore>
</CsoundSynthesizer>
