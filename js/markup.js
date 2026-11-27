// Tide: the controller's parts, as HTML. The page (Tide's own, or a site showing Tide) only needs
// an empty <div id="controllerBody">; main.js puts this inside it and connects every part by its id.

export const CONTROLLER = `
<div class="menubar" id="presets" role="group" aria-label="Sound"></div>
<canvas id="picture" role="img" aria-label="A pad. Left to right sets density, bottom to top sets drift, scrolling sets room. The same three controls are the knobs below."></canvas>
<div class="strip">
  <span class="knob still" title="The note the harmony is on at this moment. It moves by itself; HOME, under MORE, is where it starts."><span class="key" id="keyBox"></span><span>NOW ON</span></span>
  <label class="knob" title="How many notes every voice plays"><i class="dial" aria-hidden="true"></i><input type="range" id="density" min="0" max="1" step="0.01"><span>DENSITY</span><output></output></label>
  <label class="knob" title="How far apart the voices drift: each phrase longer than the one before"><i class="dial" aria-hidden="true"></i><input type="range" id="drift" min="0" max="1" step="0.01"><span>DRIFT</span><output></output></label>
  <label class="knob" title="How much binaural room, dry to wet"><i class="dial" aria-hidden="true"></i><input type="range" id="room" min="0" max="1" step="0.01"><span>ROOM</span><output></output></label>
  <button class="push" id="moreBtn" type="button" aria-expanded="false" aria-controls="more">MORE</button>
</div>
<div id="more" hidden>
  <div class="tabs" id="moreTabs" role="group" aria-label="Finer controls">
    <button type="button" data-show="voices">VOICES</button><button type="button" data-show="harmony">HARMONY</button>
  </div>
  <section data-tab="voices" aria-label="Voices">
    <canvas id="lines" role="img"  aria-label="Seven lines, one for each voice. Click a name to switch the voice on or off, click a line to choose it, drag a line for its level."></canvas>
    <div class="trow">
      <b id="selTxt"></b><span class="ends" id="pendTxt"></span><span class="ends" id="mixTxt" title="The chosen voices have different settings. The rows show the first one; a change is written to all of them."></span><span class="ends" id="phraseTxt" title="How long this voice plays before it rests. The DRIFT knob changes it."></span>
      <label class="hs" for="notes" title="How many notes the chosen voices play in a phrase. The DENSITY knob sets this for all seven.">NOTES <input type="range" id="notes" min="0" max="1" step="0.01"></label>
      <button class="push" id="selAll" type="button" title="Choose every voice. Shift-click lines to choose some.">ALL</button>
    </div>
    <div class="pair">
      <div><div class="lab" id="divLab">RHYTHM</div><div class="ms short" id="msDiv" role="group" aria-label="Notes in each beat"></div></div>
      <div><div class="lab" title="How long the chosen voices rest after each of their phrases. A full bar reads WAIT: the voice stays silent until counter, bass and chords are all waiting; then the harmony changes and everyone begins again.">RESTS</div><div class="ms short" id="msWait" role="group" aria-label="Rest after each phrase"></div></div>
    </div>
  </section>
  <section data-tab="harmony" aria-label="Harmony">
    <div class="lab">HOME NOTE</div>
    <div class="keys" id="keys" role="group" aria-label="Home note. Lit keys are the scale sounding now."></div>
    <div class="lab">TWO SCALES, TAKING TURNS</div>
    <div class="trow"><select id="colA" aria-label="First scale" title="The piece alternates between these two scales, changing only in a shared silence. Choose the same one twice to stay in it."></select><span aria-hidden="true">⇄</span><select id="colB" aria-label="Second scale"></select><span class="ends" id="scaleTxt"></span></div>
    <p hidden><select id="tonic"></select></p>
  </section>
  <a class="readmore" href="https://github.com/Lome224/Tide" target="_blank" rel="noopener">How Tide works, and its code, on GitHub ↗</a>
</div>
`;
