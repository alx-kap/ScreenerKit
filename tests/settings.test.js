const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadSettings() {
  const context = vm.createContext({ globalThis: {} });
  for (const file of ["src/core/namespace.js", "src/core/settings.js"]) {
    const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    vm.runInContext(source, context, { filename: file });
  }
  return context.globalThis.TVCustomizer.Settings;
}

test("normalizes missing settings to safe defaults", () => {
  const Settings = loadSettings();
  const result = Settings.normalize();
  assert.equal(result.enabled, true);
  assert.equal(result.diagnostics, false);
  assert.equal(result.features.screenerSymbolWidth.enabled, true);
  assert.equal(result.features.screenerSymbolWidth.widthPx, 100);
  assert.equal(result.version, 4);
  assert.equal(result.features.screenerTableDensity.enabled, false);
  assert.equal(result.features.screenerTableDensity.preset, "compact");
  assert.equal(result.features.screenerTableDensity.rowHeightPx, 34);
  assert.equal(result.features.screenerGridLines.enabled, false);
  assert.equal(result.features.screenerGridLines.color, "#2a2e39");
  assert.equal(result.features.screenerMultiSort.enabled, false);
  assert.equal(result.features.screenerMultiSort.pinnedField, null);
  assert.equal(result.features.screenerMultiSort.pinnedOrder, "asc");
  assert.equal(result.features.interfaceTheme.selection, "native");
  assert.equal(result.features.interfaceTheme.custom.surface, Settings.CUSTOM_THEME_DEFAULT.surface);
});

test("migrates version 1 settings without changing Symbol width", () => {
  const Settings = loadSettings();
  const result = Settings.normalize({
    version: 1,
    enabled: true,
    features: { screenerSymbolWidth: { enabled: true, widthPx: 88 } }
  });
  assert.equal(result.version, 4);
  assert.equal(result.features.screenerSymbolWidth.widthPx, 88);
  assert.equal(result.features.screenerTableDensity.enabled, false);
  assert.equal(result.features.screenerTableDensity.preset, "compact");
  assert.equal(result.features.screenerGridLines.enabled, false);
  assert.equal(result.features.screenerGridLines.color, "#2a2e39");
});

test("migrates version 2 settings with grid lines disabled", () => {
  const Settings = loadSettings();
  const result = Settings.normalize({
    version: 2,
    features: {
      screenerSymbolWidth: { enabled: false, widthPx: 120 },
      screenerTableDensity: { enabled: true, preset: "dense" }
    }
  });
  assert.equal(result.version, 4);
  assert.equal(result.features.screenerSymbolWidth.enabled, false);
  assert.equal(result.features.screenerTableDensity.enabled, true);
  assert.equal(result.features.screenerGridLines.enabled, false);
  assert.equal(result.features.screenerGridLines.color, Settings.GRID_LINE_COLOR_DEFAULT);
});

test("migrates version 3 settings to the native interface theme", () => {
  const Settings = loadSettings();
  const result = Settings.normalize({
    version: 3,
    features: {
      screenerGridLines: { enabled: true, color: "#abcdef" }
    }
  });
  assert.equal(result.version, 4);
  assert.equal(result.features.screenerGridLines.color, "#abcdef");
  assert.equal(result.features.interfaceTheme.selection, "native");
});

test("density presets normalize to their documented values", () => {
  const Settings = loadSettings();
  const expected = {
    comfortable: [14, 14, 41, 50, 12, 20],
    compact: [13, 13, 34, 42, 8, 8],
    dense: [12, 12, 28, 36, 4, 0]
  };

  for (const [name, values] of Object.entries(expected)) {
    const result = Settings.applyDensityPreset({ enabled: true }, name);
    assert.equal(result.enabled, true);
    assert.equal(result.preset, name);
    assert.deepEqual(
      [result.bodyFontPx, result.headerFontPx, result.rowHeightPx, result.headerHeightPx, result.cellPaddingXPx, result.leftInsetPx],
      values
    );
  }
});

test("density values clamp safely and mismatched presets become custom", () => {
  const Settings = loadSettings();
  const result = Settings.normalizeDensity({
    enabled: true,
    preset: "compact",
    bodyFontPx: 1,
    headerFontPx: 99,
    rowHeightPx: 20,
    headerHeightPx: 100,
    cellPaddingXPx: -5,
    leftInsetPx: 99
  });
  assert.equal(result.preset, "custom");
  assert.equal(result.bodyFontPx, 10);
  assert.equal(result.headerFontPx, 16);
  assert.equal(result.rowHeightPx, 28);
  assert.equal(result.headerHeightPx, 56);
  assert.equal(result.cellPaddingXPx, 0);
  assert.equal(result.leftInsetPx, 24);
});

test("density preserves a flush custom left inset", () => {
  const Settings = loadSettings();
  const result = Settings.normalizeDensity({
    enabled: true,
    preset: "custom",
    leftInsetPx: 0
  });

  assert.equal(result.leftInsetPx, 0);
});

test("clamps Symbol width to the supported range", () => {
  const Settings = loadSettings();
  assert.equal(Settings.clampWidth(10), 76);
  assert.equal(Settings.clampWidth(999), 220);
  assert.equal(Settings.clampWidth("111.6"), 112);
  assert.equal(Settings.clampWidth("invalid"), 100);
});

test("preserves explicit feature and master disable states", () => {
  const Settings = loadSettings();
  const result = Settings.normalize({
    enabled: false,
    diagnostics: true,
    features: { screenerSymbolWidth: { enabled: false, widthPx: 92 } }
  });
  assert.equal(result.enabled, false);
  assert.equal(result.diagnostics, true);
  assert.equal(result.features.screenerSymbolWidth.enabled, false);
  assert.equal(result.features.screenerSymbolWidth.widthPx, 92);
});

test("normalizes grid-line colors and preserves the enable state", () => {
  const Settings = loadSettings();
  const upper = Settings.normalizeGridLines({ enabled: true, color: "  #A1B2C3 " });
  assert.equal(upper.enabled, true);
  assert.equal(upper.color, "#a1b2c3");

  for (const invalid of ["#abc", "a1b2c3", "#gggggg", "red", "", null]) {
    assert.equal(
      Settings.normalizeGridLineColor(invalid),
      Settings.GRID_LINE_COLOR_DEFAULT,
      `unexpected color accepted: ${invalid}`
    );
  }
});

test("normalizes the multi-sort pin state safely", () => {
  const Settings = loadSettings();
  const defaults = Settings.normalizeMultiSort({});
  assert.equal(defaults.enabled, false);
  assert.equal(defaults.pinnedField, null);
  assert.equal(defaults.pinnedOrder, "asc");

  const pinned = Settings.normalizeMultiSort({
    enabled: true,
    pinnedField: "EpsDilutedGrowth|YoYTTM",
    pinnedOrder: "desc"
  });
  assert.equal(pinned.enabled, true);
  assert.equal(pinned.pinnedField, "EpsDilutedGrowth|YoYTTM");
  assert.equal(pinned.pinnedOrder, "desc");

  const invalid = Settings.normalizeMultiSort({ enabled: true, pinnedField: "Sector; drop table", pinnedOrder: "sideways" });
  assert.equal(invalid.pinnedField, null);
  assert.equal(invalid.pinnedOrder, "asc");
});

test("normalizes interface theme selections and custom colors", () => {
  const Settings = loadSettings();
  const custom = Settings.normalizeInterfaceTheme({
    selection: "custom",
    custom: { page: " #AABBCC ", surface: "invalid", accent: "#123456" }
  });
  assert.equal(custom.selection, "custom");
  assert.equal(custom.custom.page, "#aabbcc");
  assert.equal(custom.custom.surface, Settings.CUSTOM_THEME_DEFAULT.surface);
  assert.equal(custom.custom.accent, "#123456");

  const invalid = Settings.normalizeInterfaceTheme({ selection: "unknown" });
  assert.equal(invalid.selection, "native");
  assert.equal(Settings.resolveThemeTokens(invalid), null);
  assert.equal(Settings.resolveThemeTokens({ selection: "oled" }).surface, "#000000");
  assert.equal(Settings.normalizeInterfaceTheme({ selection: "nord" }).selection, "native");
});

test("theme presets are frozen and expose every theme token", () => {
  const Settings = loadSettings();
  assert.equal(Object.isFrozen(Settings.THEME_PRESETS), true);
  for (const preset of Object.values(Settings.THEME_PRESETS)) {
    assert.equal(Object.isFrozen(preset), true);
    for (const key of Settings.THEME_TOKEN_KEYS) assert.match(preset[key], /^#[0-9a-f]{6}$/);
  }
});

test("OLED uses true black for every surface token", () => {
  const Settings = loadSettings();
  const oled = Settings.resolveThemeTokens({ selection: "oled" });
  assert.equal(oled.page, "#000000");
  assert.equal(oled.surface, "#000000");
  assert.equal(oled.elevated, "#000000");
});

test("calculates WCAG contrast ratios", () => {
  const Settings = loadSettings();
  assert.equal(Settings.contrastRatio("#000000", "#ffffff"), 21);
  assert.ok(Settings.contrastRatio("#e6edf7", "#0b1728") >= 4.5);
  assert.ok(Settings.contrastRatio("#777777", "#777777") < 4.5);
});
