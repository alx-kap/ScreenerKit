(() => {
  "use strict";

  const root = globalThis.TVCustomizer;
  if (root.runtimeStarted) return;
  root.runtimeStarted = true;

  const styleManager = new root.StyleManager(document);
  const adapter = new root.ScreenerTableAdapter(document);
  const interfaceThemeFeature = new root.InterfaceThemeFeature({ document, styleManager });
  const symbolWidthFeature = new root.ScreenerSymbolWidthFeature({ document, styleManager, adapter });
  const tableDensityFeature = new root.ScreenerTableDensityFeature({ document, styleManager, adapter });
  const gridLinesFeature = new root.ScreenerGridLinesFeature({ document, styleManager, adapter });
  const multiSortFeature = new root.ScreenerMultiSortFeature({
    document,
    styleManager,
    adapter,
    persistPin: async pinState => {
      const current = await root.Settings.load();
      current.features.screenerMultiSort.pinnedField = pinState.pinnedField;
      current.features.screenerMultiSort.pinnedOrder = pinState.pinnedOrder;
      await root.Settings.save(current);
    }
  });
  const lifecycle = new root.LifecycleController({
    document,
    window,
    features: [interfaceThemeFeature, symbolWidthFeature, tableDensityFeature, gridLinesFeature, multiSortFeature]
  });

  root.runtime = { lifecycle };

  chrome.runtime.sendMessage({ type: "TVT_ENSURE_SCAN_HOOK" }).catch(() => {});

  root.Settings.load().then(settings => lifecycle.start(settings));

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[root.Settings.STORAGE_KEY]) return;
    lifecycle.setSettings(root.Settings.normalize(changes[root.Settings.STORAGE_KEY].newValue));
    const multiSort = changes[root.Settings.STORAGE_KEY].newValue?.features?.screenerMultiSort;
    if (multiSort?.enabled) {
      chrome.runtime.sendMessage({ type: "TVT_ENSURE_SCAN_HOOK" }).catch(() => {});
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "TVT_GET_DIAGNOSTICS") {
      sendResponse(lifecycle.diagnostics());
      return false;
    }

    if (message?.type === "TVT_REFRESH") {
      lifecycle.run();
      sendResponse(lifecycle.diagnostics());
      return false;
    }

    return false;
  });
})();
