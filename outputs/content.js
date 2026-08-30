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
    const earlyDelay1 = context.createDelay(0.12);
    const earlyDelay2 = context.createDelay(0.12);
    const earlyDelay3 = context.createDelay(0.12);
    const earlyGain1 = context.createGain();
    const earlyGain2 = context.createGain();
    const earlyGain3 = context.createGain();
    const roomTone = context.createBiquadFilter();
    const roomTone2 = context.createBiquadFilter();
    const mudCut = context.createBiquadFilter();
    const air = context.createBiquadFilter();
    const analyser = context.createAnalyser();

    eq.type = "lowshelf"; eq.frequency.value = 180;
    mudCut.type = "peaking"; mudCut.frequency.value = 320; mudCut.Q.value = 0.75;
    presence.type = "peaking"; presence.frequency.value = 2600; presence.Q.value = 0.7;
    air.type = "highshelf"; air.frequency.value = 9000;
    compressor.threshold.value = -18; compressor.knee.value = 24; compressor.ratio.value = 1.2;
    compressor.attack.value = 0.02; compressor.release.value = 0.28;
    wetDelay.delayTime.value = 0.075;
    feedback.gain.value = 0.28;
    earlyDelay1.delayTime.value = 0.022;
    earlyDelay2.delayTime.value = 0.041;
    earlyDelay3.delayTime.value = 0.067;
    earlyGain1.gain.value = 0.16;
    earlyGain2.gain.value = 0.11;
    earlyGain3.gain.value = 0.07;
    roomTone.type = "lowpass"; roomTone.frequency.value = 5200;
    roomTone2.type = "highpass"; roomTone2.frequency.value = 120;

    // A compact synthetic room: early reflection + filtered feedback tail.
    source.connect(input);
    source.connect(bypass).connect(output);
    input.connect(eq).connect(mudCut).connect(presence).connect(air).connect(compressor);
    // Width matrix: preserve the center while exaggerating side information.
    compressor.connect(splitter);
    splitter.connect(leftDirect, 0).connect(merger, 0, 0);
    splitter.connect(rightDirect, 1).connect(merger, 0, 1);
    splitter.connect(leftCross, 1).connect(merger, 0, 0);
    splitter.connect(rightCross, 0).connect(merger, 0, 1);
    merger.connect(dry).connect(output);
    compressor.connect(wetDelay).connect(roomTone2).connect(roomTone).connect(wet).connect(output);
    wetDelay.connect(feedback).connect(wetDelay);
    compressor.connect(earlyDelay1).connect(earlyGain1).connect(roomTone2);
    compressor.connect(earlyDelay2).connect(earlyGain2).connect(roomTone2);
    compressor.connect(earlyDelay3).connect(earlyGain3).connect(roomTone2);
    output.connect(analyser).connect(context.destination);

    state = { video, context, input, bypass, dry, wet, output, eq, mudCut, presence, air, compressor, wetDelay, feedback, earlyGain1, earlyGain2, earlyGain3, roomTone, analyser, leftDirect, rightDirect, leftCross, rightCross };
    applySettings();

    const resume = () => context.resume().catch(() => {});
    video.addEventListener("play", resume, { passive: true });
    resume();
  }

  function applySettings() {
    if (!state) return;
    const { context: c, input, bypass, dry, wet, eq, mudCut, presence, air, compressor, wetDelay, feedback, earlyGain1, earlyGain2, earlyGain3, roomTone, leftDirect, rightDirect, leftCross, rightCross } = state;
    const t = c.currentTime;
    const live = settings.enabled;
    input.gain.setTargetAtTime(live ? 1 : 0, t, 0.02);
    bypass.gain.setTargetAtTime(live ? 0 : 1, t, 0.02);
    dry.gain.setTargetAtTime(live ? 1 - profile.room / 240 : 1, t, 0.04);
    wet.gain.setTargetAtTime(live ? profile.room / 100 * 0.72 : 0, t, 0.04);
    eq.gain.setTargetAtTime(live ? profile.warmth / 38 * 2.6 : 0, t, 0.04);
    mudCut.gain.setTargetAtTime(live ? -0.8 - profile.warmth / 80 : 0, t, 0.04);
    presence.gain.setTargetAtTime(live ? -profile.warmth / 38 * 1.2 : 0, t, 0.04);
    air.gain.setTargetAtTime(live ? 0.8 - profile.warmth / 100 : 0, t, 0.04);
    wetDelay.delayTime.setTargetAtTime(0.055 + profile.room / 100 * 0.045, t, 0.04);
    feedback.gain.setTargetAtTime(profile.room / 100 * 0.38, t, 0.04);
    earlyGain1.gain.setTargetAtTime(live ? profile.room / 100 * 0.18 : 0, t, 0.04);
    earlyGain2.gain.setTargetAtTime(live ? profile.room / 100 * 0.12 : 0, t, 0.04);
    earlyGain3.gain.setTargetAtTime(live ? profile.room / 100 * 0.08 : 0, t, 0.04);
    roomTone.frequency.setTargetAtTime(8200 - profile.warmth * 35, t, 0.04);
    compressor.threshold.setTargetAtTime(-16 - profile.warmth / 24, t, 0.04);
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
