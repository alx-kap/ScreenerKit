(() => {
  "use strict";

  const SETTINGS_KEY = "settings";
  const HOOK_FILE = "src/features/screener-multi-sort-hook.js";

  async function multiSortEnabled() {
    try {
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      return result[SETTINGS_KEY]?.features?.screenerMultiSort?.enabled === true;
    } catch (error) {
      return false;
    }
  }

  async function injectHook(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        injectImmediately: true,
        files: [HOOK_FILE]
      });
    } catch (error) {
      // The tab may be closed, restricted, or the host may reject injection.
    }
  }

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "loading") return;
    if (!tab.url?.startsWith("https://") || !tab.url.includes("tradingview.com")) return;
    multiSortEnabled().then(enabled => {
      if (enabled) injectHook(tabId);
    });
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "TVT_ENSURE_SCAN_HOOK" && sender?.tab?.id) {
      injectHook(sender.tab.id);
      sendResponse({ ok: true });
      return false;
    }
    return false;
  });
})();
