const DEFAULTS = { enabled: true, echo: 5 };

chrome.commands.onCommand.addListener(async command => {
  if (command === "toggle-live") {
    const current = await chrome.storage.local.get(DEFAULTS);
    await chrome.storage.local.set({ enabled: !current.enabled });
    const tabs = await chrome.tabs.query({ url: ["https://www.youtube.com/*", "https://music.youtube.com/*"] });
    await Promise.all(tabs.map(tab => chrome.tabs.sendMessage(tab.id, {
      type: "state-changed",
      enabled: !current.enabled
    }).catch(() => undefined)));
    return;
  }

  if (command !== "echo-up" && command !== "echo-down") return;
  const current = await chrome.storage.local.get(DEFAULTS);
  const delta = command === "echo-up" ? 1 : -1;
  const echo = Math.min(10, Math.max(0, Number(current.echo) + delta));
  await chrome.storage.local.set({ echo });
});
