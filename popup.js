(() => {
  "use strict";

  const Settings = globalThis.TVCustomizer.Settings;
  const CONTENT_SCRIPT_FILES = [
    "src/core/namespace.js",
    "src/core/settings.js",
    "src/core/style-manager.js",
    "src/core/screener-table-adapter.js",
    "src/features/interface-theme.js",
    "src/features/screener-symbol-width.js",
    "src/features/screener-table-density.js",
    "src/features/screener-grid-lines.js",
    "src/features/screener-multi-sort.js",
    "src/core/lifecycle.js",
    "src/content.js"
  ];
  const DENSITY_CONTROLS = Object.freeze({
    bodyFontPx: { input: "body-font", output: "body-font-output" },
    headerFontPx: { input: "header-font", output: "header-font-output" },
    rowHeightPx: { input: "row-height", output: "row-height-output" },
    headerHeightPx: { input: "header-height", output: "header-height-output" },
    cellPaddingXPx: { input: "cell-padding", output: "cell-padding-output" },
    leftInsetPx: { input: "left-inset", output: "left-inset-output" }
  });
  const THEME_LABELS = Object.freeze({
    native: "Default",
    oled: Settings.THEME_PRESETS.oled.label,
    custom: "Custom"
  });
  const FEATURE_LABELS = Object.freeze({
    "interface-theme": "Interface theme",
    "screener-symbol-width": "Symbol column",
    "screener-table-density": "Table density",
    "screener-grid-lines": "Grid lines",
    "screener-multi-sort": "Secondary sort"
  });
  const elements = {};
  let currentSettings;

  function cacheElements() {
    elements.master = document.getElementById("master-enabled");
    elements.themeSelectionName = document.getElementById("theme-selection-name");
    elements.themeButtons = Array.from(document.querySelectorAll("[data-theme-selection]"));
    elements.customThemeEditor = document.getElementById("custom-theme-editor");
    elements.customThemeControls = Object.fromEntries(Settings.THEME_TOKEN_KEYS.map(key => [
      key,
      document.querySelector(`[data-theme-token="${key}"]`)
    ]));
    elements.customThemeSwatch = document.getElementById("custom-theme-swatch");
    elements.themeContrast = document.getElementById("theme-contrast");
    elements.resetCustomTheme = document.getElementById("reset-custom-theme");
    elements.symbolFeature = document.getElementById("feature-enabled");
    elements.width = document.getElementById("symbol-width");
    elements.widthOutput = document.getElementById("width-output");
    elements.densityFeature = document.getElementById("density-enabled");
    elements.densityPresetName = document.getElementById("density-preset-name");
    elements.presetButtons = Array.from(document.querySelectorAll("[data-density-preset]"));
    elements.densityControls = Object.fromEntries(
      Object.entries(DENSITY_CONTROLS).map(([key, ids]) => [key, {
        input: document.getElementById(ids.input),
        output: document.getElementById(ids.output)
      }])
    );
    elements.densityAdvanced = document.getElementById("density-advanced");
    elements.gridLinesFeature = document.getElementById("grid-lines-enabled");
    elements.gridLinesColor = document.getElementById("grid-lines-color");
    elements.gridLinesColorOutput = document.getElementById("grid-lines-color-output");
    elements.resetGridLinesColor = document.getElementById("reset-grid-lines-color");
    elements.multiSortFeature = document.getElementById("multi-sort-enabled");
    elements.multiSortStatus = document.getElementById("multi-sort-status");
    elements.resetMultiSort = document.getElementById("reset-multi-sort");
    elements.diagnostics = document.getElementById("diagnostics-enabled");
    elements.resetWidth = document.getElementById("reset-width");
    elements.resetDensity = document.getElementById("reset-density");
    elements.refresh = document.getElementById("refresh");
    elements.status = document.getElementById("status");
  }

  function render() {
    const theme = currentSettings.features.interfaceTheme;
    const symbol = currentSettings.features.screenerSymbolWidth;
    const density = currentSettings.features.screenerTableDensity;
    const gridLines = currentSettings.features.screenerGridLines;
    const multiSort = currentSettings.features.screenerMultiSort;
    const masterDisabled = !currentSettings.enabled;

    elements.master.checked = currentSettings.enabled;
    elements.themeSelectionName.value = THEME_LABELS[theme.selection];
    elements.symbolFeature.checked = symbol.enabled;
    elements.width.value = String(symbol.widthPx);
    elements.widthOutput.value = `${symbol.widthPx} px`;
    elements.densityFeature.checked = density.enabled;
    elements.densityPresetName.value = density.preset === "custom"
      ? "Custom"
      : density.preset[0].toUpperCase() + density.preset.slice(1);
    elements.diagnostics.checked = currentSettings.diagnostics;
    elements.gridLinesFeature.checked = gridLines.enabled;
    elements.gridLinesColor.value = gridLines.color;
    elements.gridLinesColorOutput.value = gridLines.color;
    elements.multiSortFeature.checked = multiSort.enabled;
    elements.multiSortStatus.dataset.pinned = String(Boolean(multiSort.pinnedField));
    elements.multiSortStatus.textContent = multiSort.pinnedField
      ? `Pinned: ${multiSort.pinnedField} (${multiSort.pinnedOrder}).`
      : "No column pinned.";

    elements.symbolFeature.disabled = masterDisabled;
    elements.width.disabled = masterDisabled || !symbol.enabled;
    elements.resetWidth.disabled = elements.width.disabled;
    elements.densityFeature.disabled = masterDisabled;
    elements.resetDensity.disabled = masterDisabled || !density.enabled;
    elements.gridLinesFeature.disabled = masterDisabled;
    elements.gridLinesColor.disabled = masterDisabled || !gridLines.enabled;
    elements.resetGridLinesColor.disabled = elements.gridLinesColor.disabled;
    elements.multiSortFeature.disabled = masterDisabled;
    elements.resetMultiSort.disabled = masterDisabled || !multiSort.enabled || !multiSort.pinnedField;

    for (const button of elements.themeButtons) {
      button.disabled = masterDisabled;
      button.setAttribute("aria-pressed", String(button.dataset.themeSelection === theme.selection));
    }

    elements.customThemeEditor.hidden = theme.selection !== "custom";
    for (const [key, input] of Object.entries(elements.customThemeControls)) {
      input.value = theme.custom[key];
      input.disabled = masterDisabled || theme.selection !== "custom";
    }
    elements.resetCustomTheme.disabled = masterDisabled || theme.selection !== "custom";
    renderCustomThemeFeedback();

    for (const button of elements.presetButtons) {
      button.disabled = masterDisabled || !density.enabled;
      button.setAttribute("aria-pressed", String(button.dataset.densityPreset === density.preset));
    }

    for (const [key, control] of Object.entries(elements.densityControls)) {
      control.input.value = String(density[key]);
      control.output.value = `${density[key]} px`;
      control.input.disabled = masterDisabled || !density.enabled;
    }
  }

  function renderCustomThemeFeedback() {
    const custom = currentSettings.features.interfaceTheme.custom;
    elements.customThemeSwatch.style.setProperty("--swatch-page", custom.page);
    elements.customThemeSwatch.style.setProperty("--swatch-surface", custom.surface);
    elements.customThemeSwatch.style.setProperty("--swatch-accent", custom.accent);

    const textRatio = Settings.contrastRatio(custom.text, custom.surface);
    const mutedRatio = Settings.contrastRatio(custom.muted, custom.surface);
    const hasWarning = textRatio < 4.5 || mutedRatio < 4.5;
    elements.themeContrast.dataset.warning = String(hasWarning);
    elements.themeContrast.textContent = hasWarning
      ? `Low contrast: text ${textRatio.toFixed(1)}:1; muted ${mutedRatio.toFixed(1)}:1. Recommended: 4.5:1.`
      : `Contrast: text ${textRatio.toFixed(1)}:1; muted ${mutedRatio.toFixed(1)}:1.`;
  }

  async function persist() {
    currentSettings = await Settings.save(currentSettings);
    render();
    await updateDiagnostics();
  }

  function renderStatusItems(items) {
    elements.status.replaceChildren();
    for (const item of items) {
      const row = document.createElement("div");
      row.className = "status";
      row.dataset.state = item.state || "";
      const title = document.createElement("span");
      title.className = "status-title";
      title.textContent = item.title;
      const detail = document.createElement("span");
      detail.textContent = item.detail;
      row.append(title, detail);
      elements.status.append(row);
    }
  }

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  async function requestDiagnostics(type = "TVT_GET_DIAGNOSTICS") {
    const tab = await getActiveTab();
    if (!tab?.id || !tab.url?.startsWith("https://") || !tab.url.includes("tradingview.com")) {
      throw new Error("Open a TradingView tab to check detection.");
    }

    try {
      return await chrome.tabs.sendMessage(tab.id, { type });
    } catch (error) {
      const missingReceiver = String(error?.message || error).includes("Receiving end does not exist");
      if (!missingReceiver) throw error;

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: CONTENT_SCRIPT_FILES
      });

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        files: ["src/features/screener-multi-sort-hook.js"]
      }).catch(() => {});

      return chrome.tabs.sendMessage(tab.id, { type });
    }
  }

  async function updateDiagnostics(type) {
    try {
      const result = await requestDiagnostics(type);
      if (!result.features?.length) throw new Error("No feature diagnostics were returned.");
      renderStatusItems(result.features.map(feature => {
        const suffix = result.diagnosticsEnabled
          ? ` Status: ${feature.status}; targets: ${feature.targetCount}; checked: ${feature.checkedAt}.`
          : "";
        return {
          title: FEATURE_LABELS[feature.id] || feature.id,
          detail: feature.detail + suffix,
          state: feature.status
        };
      }));
    } catch (error) {
      renderStatusItems([{
        title: "Connection",
        detail: error.message || "Unable to initialize the customizer in this TradingView tab.",
        state: "error"
      }]);
    }
  }

  function bindEvents() {
    elements.master.addEventListener("change", () => {
      currentSettings.enabled = elements.master.checked;
      persist();
    });

    for (const button of elements.themeButtons) {
      button.addEventListener("click", () => {
        currentSettings.features.interfaceTheme.selection = button.dataset.themeSelection;
        persist();
      });
    }

    for (const [key, input] of Object.entries(elements.customThemeControls)) {
      input.addEventListener("input", () => {
        currentSettings.features.interfaceTheme.custom[key] = Settings.normalizeHexColor(
          input.value,
          Settings.CUSTOM_THEME_DEFAULT[key]
        );
        renderCustomThemeFeedback();
      });
      input.addEventListener("change", persist);
    }

    elements.resetCustomTheme.addEventListener("click", () => {
      currentSettings.features.interfaceTheme.custom = Settings.themeTokens(Settings.CUSTOM_THEME_DEFAULT);
      persist();
    });

    elements.symbolFeature.addEventListener("change", () => {
      currentSettings.features.screenerSymbolWidth.enabled = elements.symbolFeature.checked;
      persist();
    });

    elements.width.addEventListener("input", () => {
      const width = Settings.clampWidth(elements.width.value);
      currentSettings.features.screenerSymbolWidth.widthPx = width;
      elements.widthOutput.value = `${width} px`;
    });
    elements.width.addEventListener("change", persist);

    elements.densityFeature.addEventListener("change", () => {
      currentSettings.features.screenerTableDensity.enabled = elements.densityFeature.checked;
      persist();
    });

    for (const button of elements.presetButtons) {
      button.addEventListener("click", () => {
        currentSettings.features.screenerTableDensity = Settings.applyDensityPreset(
          currentSettings.features.screenerTableDensity,
          button.dataset.densityPreset
        );
        persist();
      });
    }

    for (const [key, control] of Object.entries(elements.densityControls)) {
      control.input.addEventListener("input", () => {
        const range = Settings.DENSITY_RANGES[key];
        const value = Math.min(range.max, Math.max(range.min, Math.round(Number(control.input.value))));
        currentSettings.features.screenerTableDensity[key] = value;
        currentSettings.features.screenerTableDensity.preset = "custom";
        control.output.value = `${value} px`;
        elements.densityPresetName.value = "Custom";
        for (const button of elements.presetButtons) button.setAttribute("aria-pressed", "false");
      });
      control.input.addEventListener("change", persist);
    }

    elements.diagnostics.addEventListener("change", () => {
      currentSettings.diagnostics = elements.diagnostics.checked;
      persist();
    });

    elements.gridLinesFeature.addEventListener("change", () => {
      currentSettings.features.screenerGridLines.enabled = elements.gridLinesFeature.checked;
      persist();
    });

    elements.gridLinesColor.addEventListener("input", () => {
      const color = Settings.normalizeGridLineColor(elements.gridLinesColor.value);
      currentSettings.features.screenerGridLines.color = color;
      elements.gridLinesColorOutput.value = color;
    });
    elements.gridLinesColor.addEventListener("change", persist);

    elements.resetWidth.addEventListener("click", () => {
      currentSettings.features.screenerSymbolWidth.widthPx = Settings.WIDTH_DEFAULT;
      persist();
    });

    elements.resetDensity.addEventListener("click", () => {
      currentSettings.features.screenerTableDensity = Settings.applyDensityPreset(
        currentSettings.features.screenerTableDensity,
        "compact"
      );
      persist();
    });

    elements.resetGridLinesColor.addEventListener("click", () => {
      currentSettings.features.screenerGridLines.color = Settings.GRID_LINE_COLOR_DEFAULT;
      persist();
    });

    elements.multiSortFeature.addEventListener("change", () => {
      currentSettings.features.screenerMultiSort.enabled = elements.multiSortFeature.checked;
      persist();
    });

    elements.resetMultiSort.addEventListener("click", () => {
      currentSettings.features.screenerMultiSort.pinnedField = null;
      persist();
    });

    elements.refresh.addEventListener("click", () => updateDiagnostics("TVT_REFRESH"));
  }

  document.addEventListener("DOMContentLoaded", async () => {
    cacheElements();
    currentSettings = await Settings.load();
    render();
    bindEvents();
    await updateDiagnostics();
  });
})();
