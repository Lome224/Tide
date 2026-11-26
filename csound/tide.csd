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

; The piece is in seven parts, in the files beside this one.
; Run it from this folder:  csound tide.csd
#include "space.inc"
#include "controls.inc"
#include "harmony.inc"
#include "machines.inc"
#include "voices-pitched.inc"
#include "voices-texture.inc"
#include "output.inc"
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
