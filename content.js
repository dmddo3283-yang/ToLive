(() => {
  // Three-way voicing inspired by the requested references:
  // large Japanese arena vocal clarity, dramatic Ado-style front-to-back depth,
  // and G-DRAGON-style PA weight/saturation. Kept subtle so playlists remain listenable.
  const defaults = { enabled: true };
  const profile = { room: 58, warmth: 46, width: 32 };
  let settings = { ...defaults };
  let state = null;

  const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));

  function makeGraph(video) {
    if (state?.video === video) return;
    if (state) state.context.close().catch(() => {});

    const context = new AudioContext();
    const source = context.createMediaElementSource(video);
    const input = context.createGain();
    const bypass = context.createGain();
    const dry = context.createGain();
    const splitter = context.createChannelSplitter(2);
    const merger = context.createChannelMerger(2);
    const leftDirect = context.createGain();
    const rightDirect = context.createGain();
    const leftCross = context.createGain();
    const rightCross = context.createGain();
    const wet = context.createGain();
    const output = context.createGain();
    const eq = context.createBiquadFilter();
    const presence = context.createBiquadFilter();
    const compressor = context.createDynamicsCompressor();
    const wetDelay = context.createDelay(0.2);
    const feedback = context.createGain();
    const roomTone = context.createBiquadFilter();
    const roomTone2 = context.createBiquadFilter();
    const analyser = context.createAnalyser();

    eq.type = "lowshelf"; eq.frequency.value = 180;
    presence.type = "peaking"; presence.frequency.value = 2600; presence.Q.value = 0.7;
    compressor.threshold.value = -20; compressor.knee.value = 18; compressor.ratio.value = 1.35;
    compressor.attack.value = 0.03; compressor.release.value = 0.25;
    wetDelay.delayTime.value = 0.055;
    feedback.gain.value = 0.24;
    roomTone.type = "lowpass"; roomTone.frequency.value = 5200;
    roomTone2.type = "highpass"; roomTone2.frequency.value = 120;

    // A compact synthetic room: early reflection + filtered feedback tail.
    source.connect(input);
    source.connect(bypass).connect(output);
    input.connect(eq).connect(presence).connect(compressor);
    // Width matrix: preserve the center while exaggerating side information.
    compressor.connect(splitter);
    splitter.connect(leftDirect, 0).connect(merger, 0, 0);
    splitter.connect(rightDirect, 1).connect(merger, 0, 1);
    splitter.connect(leftCross, 1).connect(merger, 0, 0);
    splitter.connect(rightCross, 0).connect(merger, 0, 1);
    merger.connect(dry).connect(output);
    compressor.connect(wetDelay).connect(roomTone2).connect(roomTone).connect(wet).connect(output);
    wetDelay.connect(feedback).connect(wetDelay);
    output.connect(analyser).connect(context.destination);

    state = { video, context, input, bypass, dry, wet, output, eq, presence, compressor, wetDelay, feedback, roomTone, analyser, leftDirect, rightDirect, leftCross, rightCross };
    applySettings();

    const resume = () => context.resume().catch(() => {});
    video.addEventListener("play", resume, { passive: true });
    resume();
  }

  function applySettings() {
    if (!state) return;
    const { context: c, input, bypass, dry, wet, eq, presence, compressor, wetDelay, feedback, roomTone, leftDirect, rightDirect, leftCross, rightCross } = state;
    const t = c.currentTime;
    const live = settings.enabled;
    input.gain.setTargetAtTime(live ? 1 : 0, t, 0.02);
    bypass.gain.setTargetAtTime(live ? 0 : 1, t, 0.02);
    dry.gain.setTargetAtTime(live ? 1 - profile.room / 240 : 1, t, 0.04);
    wet.gain.setTargetAtTime(live ? profile.room / 100 * 0.62 : 0, t, 0.04);
    eq.gain.setTargetAtTime(live ? profile.warmth / 38 * 3.2 : 0, t, 0.04);
    presence.gain.setTargetAtTime(live ? -profile.warmth / 38 * 1.8 : 0, t, 0.04);
    wetDelay.delayTime.setTargetAtTime(0.035 + profile.room / 100 * 0.045, t, 0.04);
    feedback.gain.setTargetAtTime(profile.room / 100 * 0.32, t, 0.04);
    roomTone.frequency.setTargetAtTime(7600 - profile.warmth * 42, t, 0.04);
    compressor.threshold.setTargetAtTime(-18 - profile.warmth / 20, t, 0.04);
    const side = live ? profile.width / 100 * 0.42 : 0;
    leftDirect.gain.setTargetAtTime(1 + side, t, 0.04);
    rightDirect.gain.setTargetAtTime(1 + side, t, 0.04);
    leftCross.gain.setTargetAtTime(-side, t, 0.04);
    rightCross.gain.setTargetAtTime(-side, t, 0.04);
  }

  function findVideo() {
    const video = document.querySelector("video");
    if (video) makeGraph(video);
  }

  chrome.storage.local.get(defaults, saved => { settings = { ...defaults, ...saved }; findVideo(); });
  chrome.storage.onChanged.addListener(changes => {
    Object.keys(changes).forEach(key => { settings[key] = changes[key].newValue; });
    applySettings();
  });
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "get-state") {
      sendResponse({ ...settings, ready: Boolean(state) });
    }
  });

  new MutationObserver(findVideo).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(findVideo, 1500);
})();
