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
    const sideDiff = context.createGain();
    const sideInvert = context.createGain();
    const sideTone = context.createBiquadFilter();
    const sessionBody = context.createBiquadFilter();
    const sessionAttack = context.createBiquadFilter();
    const sideAir = context.createBiquadFilter();
    const sideBus = context.createGain();
    const sideLeft = context.createGain();
    const sideRight = context.createGain();
    const sideMerger = context.createChannelMerger(2);
    const processedGain = context.createGain();
    const sessionDelay = context.createDelay(0.2);
    const sessionFeedback = context.createGain();
    const sessionRoomTone = context.createBiquadFilter();
    const sessionRoomTone2 = context.createBiquadFilter();
    const sessionRoomGain = context.createGain();
    const sessionRoomLeft = context.createGain();
    const sessionRoomRight = context.createGain();
    const leftDirect = context.createGain();
    const rightDirect = context.createGain();
    const leftCross = context.createGain();
    const rightCross = context.createGain();
    const wet = context.createGain();
    const output = context.createGain();
    const eq = context.createBiquadFilter();
    const bassEQ = context.createBiquadFilter();
    const rhythmEQ = context.createBiquadFilter();
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
    bassEQ.type = "peaking"; bassEQ.frequency.value = 92; bassEQ.Q.value = 0.8;
    rhythmEQ.type = "peaking"; rhythmEQ.frequency.value = 145; rhythmEQ.Q.value = 0.9;
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
    sideInvert.gain.value = -0.5;
    sideTone.type = "peaking"; sideTone.frequency.value = 220; sideTone.Q.value = 0.7;
    sessionBody.type = "peaking"; sessionBody.frequency.value = 430; sessionBody.Q.value = 0.8;
    sessionAttack.type = "peaking"; sessionAttack.frequency.value = 3000; sessionAttack.Q.value = 0.9;
    sideAir.type = "highshelf"; sideAir.frequency.value = 6800;
    sideLeft.gain.value = 1;
    sideRight.gain.value = -1;
    sessionDelay.delayTime.value = 0.085;
    sessionFeedback.gain.value = 0.18;
    sessionRoomTone.type = "lowpass"; sessionRoomTone.frequency.value = 5200;
    sessionRoomTone2.type = "highpass"; sessionRoomTone2.frequency.value = 150;
    sessionRoomLeft.gain.value = 1;
    sessionRoomRight.gain.value = -1;

    // A compact synthetic room: early reflection + filtered feedback tail.
    source.connect(input);
    source.connect(bypass).connect(output);
    input.connect(eq).connect(bassEQ).connect(rhythmEQ).connect(mudCut).connect(presence).connect(air).connect(compressor);
    // Width matrix: preserve the center while exaggerating side information.
    compressor.connect(splitter);
    splitter.connect(leftDirect, 0).connect(merger, 0, 0);
    splitter.connect(rightDirect, 1).connect(merger, 0, 1);
    splitter.connect(leftCross, 1).connect(merger, 0, 0);
    splitter.connect(rightCross, 0).connect(merger, 0, 1);
    // Mid/Side parallel path: keep the center vocal stable while giving
    // stereo instruments their own PA weight and room contribution.
    splitter.connect(sideDiff, 0);
    splitter.connect(sideInvert, 1).connect(sideDiff);
    sideDiff.connect(sideTone).connect(sessionBody).connect(sessionAttack).connect(sideAir).connect(sideBus);
    sideBus.connect(sideLeft).connect(sideMerger, 0, 0);
    sideBus.connect(sideRight).connect(sideMerger, 0, 1);
    sideMerger.connect(processedGain);
    merger.connect(dry).connect(processedGain);
    processedGain.connect(output);
    compressor.connect(wetDelay).connect(roomTone2).connect(roomTone).connect(wet).connect(processedGain);
    wetDelay.connect(feedback).connect(wetDelay);
    compressor.connect(earlyDelay1).connect(earlyGain1).connect(roomTone2);
    compressor.connect(earlyDelay2).connect(earlyGain2).connect(roomTone2);
    compressor.connect(earlyDelay3).connect(earlyGain3).connect(roomTone2);
    // Give the stereo instrument field a separate, slightly longer room tail.
    sideAir.connect(sessionDelay).connect(sessionRoomTone2).connect(sessionRoomTone).connect(sessionRoomGain);
    sessionRoomGain.connect(sessionRoomLeft).connect(sideMerger, 0, 0);
    sessionRoomGain.connect(sessionRoomRight).connect(sideMerger, 0, 1);
    sessionDelay.connect(sessionFeedback).connect(sessionDelay);
    output.connect(analyser).connect(context.destination);

    state = { video, context, input, bypass, dry, wet, output, processedGain, eq, bassEQ, rhythmEQ, mudCut, presence, air, compressor, wetDelay, feedback, earlyGain1, earlyGain2, earlyGain3, roomTone, sideTone, sessionBody, sessionAttack, sideAir, sideBus, sessionDelay, sessionFeedback, sessionRoomGain, analyser, leftDirect, rightDirect, leftCross, rightCross };
    applySettings();

    const resume = () => context.resume().catch(() => {});
    video.addEventListener("play", resume, { passive: true });
    resume();
  }

  function applySettings() {
    if (!state) return;
    const { context: c, input, bypass, dry, wet, processedGain, eq, bassEQ, rhythmEQ, mudCut, presence, air, compressor, wetDelay, feedback, earlyGain1, earlyGain2, earlyGain3, roomTone, sideTone, sessionBody, sessionAttack, sideAir, sideBus, sessionDelay, sessionFeedback, sessionRoomGain, leftDirect, rightDirect, leftCross, rightCross } = state;
    const t = c.currentTime;
    const live = settings.enabled;
    input.gain.setTargetAtTime(live ? 1 : 0, t, 0.02);
    bypass.gain.setTargetAtTime(live ? 0 : 1, t, 0.02);
    dry.gain.setTargetAtTime(live ? 1 - profile.room / 240 : 1, t, 0.04);
    processedGain.gain.setTargetAtTime(live ? 0.9 : 1, t, 0.04);
    wet.gain.setTargetAtTime(live ? profile.room / 100 * 0.78 : 0, t, 0.04);
    eq.gain.setTargetAtTime(live ? profile.warmth / 38 * 3.1 : 0, t, 0.04);
    bassEQ.gain.setTargetAtTime(live ? 3.0 + profile.warmth / 60 : 0, t, 0.04);
    rhythmEQ.gain.setTargetAtTime(live ? 1.8 + profile.warmth / 100 : 0, t, 0.04);
    mudCut.gain.setTargetAtTime(live ? -0.8 - profile.warmth / 80 : 0, t, 0.04);
    presence.gain.setTargetAtTime(live ? 0.6 - profile.warmth / 80 : 0, t, 0.04);
    air.gain.setTargetAtTime(live ? 0.8 - profile.warmth / 100 : 0, t, 0.04);
    wetDelay.delayTime.setTargetAtTime(0.065 + profile.room / 100 * 0.06, t, 0.04);
    feedback.gain.setTargetAtTime(profile.room / 100 * 0.42, t, 0.04);
    earlyGain1.gain.setTargetAtTime(live ? profile.room / 100 * 0.18 : 0, t, 0.04);
    earlyGain2.gain.setTargetAtTime(live ? profile.room / 100 * 0.12 : 0, t, 0.04);
    earlyGain3.gain.setTargetAtTime(live ? profile.room / 100 * 0.08 : 0, t, 0.04);
    roomTone.frequency.setTargetAtTime(8200 - profile.warmth * 35, t, 0.04);
    compressor.threshold.setTargetAtTime(-16 - profile.warmth / 24, t, 0.04);
    sideTone.gain.setTargetAtTime(live ? 1.2 + profile.warmth / 80 : 0, t, 0.04);
    sessionBody.gain.setTargetAtTime(live ? 0.8 + profile.warmth / 120 : 0, t, 0.04);
    sessionAttack.gain.setTargetAtTime(live ? 0.7 + profile.width / 160 : 0, t, 0.04);
    sideAir.gain.setTargetAtTime(live ? 0.6 + profile.width / 120 : 0, t, 0.04);
    sideBus.gain.setTargetAtTime(live ? profile.width / 100 * 0.32 : 0, t, 0.04);
    sessionDelay.delayTime.setTargetAtTime(0.075 + profile.room / 100 * 0.035, t, 0.04);
    sessionFeedback.gain.setTargetAtTime(live ? profile.room / 100 * 0.3 : 0, t, 0.04);
    sessionRoomGain.gain.setTargetAtTime(live ? profile.room / 100 * 0.27 : 0, t, 0.04);
    // Slightly tuck the dry stereo field so the bass and room tail carry the mix.
    const sideWidth = live ? profile.width / 100 * 0.42 : 0;
    const sideTrim = live ? 0.16 : 0;
    leftDirect.gain.setTargetAtTime(1 - sideTrim + sideWidth, t, 0.04);
    rightDirect.gain.setTargetAtTime(1 - sideTrim + sideWidth, t, 0.04);
    leftCross.gain.setTargetAtTime(sideTrim - sideWidth, t, 0.04);
    rightCross.gain.setTargetAtTime(sideTrim - sideWidth, t, 0.04);
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
