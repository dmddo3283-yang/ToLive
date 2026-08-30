const DEFAULTS = { enabled: true };

chrome.commands.onCommand.addListener(async command => {
  if (command !== "toggle-live") return;
  const current = await chrome.storage.local.get(DEFAULTS);
  await chrome.storage.local.set({ enabled: !current.enabled });
  const tabs = await chrome.tabs.query({ url: ["https://www.youtube.com/*", "https://music.youtube.com/*"] });
  await Promise.all(tabs.map(tab => chrome.tabs.sendMessage(tab.id, {
    type: "state-changed",
    enabled: !current.enabled
  }).catch(() => undefined)));
});
