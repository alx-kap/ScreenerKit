(() => {
  "use strict";

  const root = globalThis.TVCustomizer;
  const STORAGE_KEY = "settings";
  const WIDTH_MIN = 76;
  const WIDTH_MAX = 220;
  const WIDTH_DEFAULT = 100;
  const GRID_LINE_COLOR_DEFAULT = "#2a2e39";
  const THEME_TOKEN_KEYS = Object.freeze([
    "page",
    "surface",
    "elevated",
    "border",
    "text",
    "muted",
    "accent"
  ]);

  const THEME_PRESETS = Object.freeze({
    oled: Object.freeze({
      label: "OLED Black",
      page: "#000000",
      surface: "#000000",
      elevated: "#000000",
      border: "#2a2a2e",
      text: "#f5f5f7",
      muted: "#a1a1aa",
      accent: "#3b82f6"
    })
  });

  const CUSTOM_THEME_DEFAULT = Object.freeze({
    page: "#07111f",
    surface: "#0b1728",
    elevated: "#12233a",
    border: "#263b55",
    text: "#e6edf7",
    muted: "#94a6bd",
    accent: "#5b8cff"
  });

  const DENSITY_PRESETS = Object.freeze({
    comfortable: Object.freeze({
      bodyFontPx: 14,
      headerFontPx: 14,
      rowHeightPx: 41,
      headerHeightPx: 50,
      cellPaddingXPx: 12,
      leftInsetPx: 20
    }),
    compact: Object.freeze({
      bodyFontPx: 13,
      headerFontPx: 13,
      rowHeightPx: 34,
      headerHeightPx: 42,
      cellPaddingXPx: 8,
      leftInsetPx: 8
    }),
    dense: Object.freeze({
      bodyFontPx: 12,
      headerFontPx: 12,
      rowHeightPx: 28,
      headerHeightPx: 36,
      cellPaddingXPx: 4,
      leftInsetPx: 0
    })
  });

  const DENSITY_RANGES = Object.freeze({
    bodyFontPx: Object.freeze({ min: 10, max: 16 }),
    headerFontPx: Object.freeze({ min: 10, max: 16 }),
    rowHeightPx: Object.freeze({ min: 28, max: 52 }),
    headerHeightPx: Object.freeze({ min: 34, max: 56 }),
    cellPaddingXPx: Object.freeze({ min: 0, max: 20 }),
    leftInsetPx: Object.freeze({ min: 0, max: 24 })
  });

  const DEFAULTS = Object.freeze({
    version: 4,
    enabled: true,
    diagnostics: false,
    features: Object.freeze({
      screenerSymbolWidth: Object.freeze({
        enabled: true,
        widthPx: WIDTH_DEFAULT
      }),
      screenerTableDensity: Object.freeze({
        enabled: false,
        preset: "compact",
        ...DENSITY_PRESETS.compact
      }),
      screenerGridLines: Object.freeze({
        enabled: false,
        color: GRID_LINE_COLOR_DEFAULT
      }),
      interfaceTheme: Object.freeze({
        selection: "native",
        custom: CUSTOM_THEME_DEFAULT
      })
    })
  });

  function clampWidth(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return WIDTH_DEFAULT;
    return Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, Math.round(parsed)));
  }

  function clampInteger(value, range, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(range.max, Math.max(range.min, Math.round(parsed)));
  }

  function densityValuesMatch(values, preset) {
    return Object.keys(DENSITY_RANGES).every(key => values[key] === preset[key]);
  }

  function normalizeDensity(input = {}) {
    const requestedPreset = ["comfortable", "compact", "dense", "custom"].includes(input.preset)
      ? input.preset
      : "compact";
    const baseline = requestedPreset === "custom"
      ? DENSITY_PRESETS.compact
      : DENSITY_PRESETS[requestedPreset];
    const values = {};

    for (const [key, range] of Object.entries(DENSITY_RANGES)) {
      values[key] = clampInteger(input[key], range, baseline[key]);
    }

    const preset = requestedPreset !== "custom" && densityValuesMatch(values, baseline)
      ? requestedPreset
      : "custom";

    return {
      enabled: input.enabled === true,
      preset,
      ...values
    };
  }

  function applyDensityPreset(input = {}, presetName = "compact") {
    const preset = DENSITY_PRESETS[presetName] || DENSITY_PRESETS.compact;
    const name = DENSITY_PRESETS[presetName] ? presetName : "compact";
    return {
      enabled: input.enabled === true,
      preset: name,
      ...preset
    };
  }

  function normalizeGridLineColor(value) {
    const color = typeof value === "string" ? value.trim().toLowerCase() : "";
    return /^#[0-9a-f]{6}$/.test(color) ? color : GRID_LINE_COLOR_DEFAULT;
  }

  function normalizeGridLines(input = {}) {
    return {
      enabled: input.enabled === true,
      color: normalizeGridLineColor(input.color)
    };
  }

  function normalizeHexColor(value, fallback) {
    const color = typeof value === "string" ? value.trim().toLowerCase() : "";
    return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
  }

  function themeTokens(input = {}, fallback = CUSTOM_THEME_DEFAULT) {
    return Object.fromEntries(THEME_TOKEN_KEYS.map(key => [
      key,
      normalizeHexColor(input[key], fallback[key])
    ]));
  }

  function normalizeInterfaceTheme(input = {}) {
    const selections = ["native", ...Object.keys(THEME_PRESETS), "custom"];
    return {
      selection: selections.includes(input.selection) ? input.selection : "native",
      custom: themeTokens(input.custom)
    };
  }

  function resolveThemeTokens(input = {}) {
    const normalized = normalizeInterfaceTheme(input);
    if (normalized.selection === "native") return null;
    if (normalized.selection === "custom") return normalized.custom;
    return themeTokens(THEME_PRESETS[normalized.selection]);
  }

  function relativeLuminance(color) {
    const normalized = normalizeHexColor(color, "#000000");
    const channels = [1, 3, 5].map(index => parseInt(normalized.slice(index, index + 2), 16) / 255);
    const [red, green, blue] = channels.map(channel => (
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    ));
    return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
  }

  function contrastRatio(foreground, background) {
    const first = relativeLuminance(foreground);
    const second = relativeLuminance(background);
    const lighter = Math.max(first, second);
    const darker = Math.min(first, second);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function normalize(input = {}) {
    const featureInput = input.features?.screenerSymbolWidth || {};
    const densityInput = input.features?.screenerTableDensity || {};
    const gridLinesInput = input.features?.screenerGridLines || {};
    const interfaceThemeInput = input.features?.interfaceTheme || {};
    return {
      version: 4,
      enabled: input.enabled !== false,
      diagnostics: input.diagnostics === true,
      features: {
        screenerSymbolWidth: {
          enabled: featureInput.enabled !== false,
          widthPx: clampWidth(featureInput.widthPx)
        },
        screenerTableDensity: normalizeDensity(densityInput),
        screenerGridLines: normalizeGridLines(gridLinesInput),
        interfaceTheme: normalizeInterfaceTheme(interfaceThemeInput)
      }
    };
  }

  async function load() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return normalize(result[STORAGE_KEY]);
  }

  async function save(settings) {
    const normalized = normalize(settings);
    await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
    return normalized;
  }

  root.Settings = Object.freeze({
    STORAGE_KEY,
    DEFAULTS,
    WIDTH_MIN,
    WIDTH_MAX,
    WIDTH_DEFAULT,
    GRID_LINE_COLOR_DEFAULT,
    THEME_TOKEN_KEYS,
    THEME_PRESETS,
    CUSTOM_THEME_DEFAULT,
    DENSITY_PRESETS,
    DENSITY_RANGES,
    clampWidth,
    normalizeDensity,
    applyDensityPreset,
    normalizeGridLineColor,
    normalizeGridLines,
    normalizeHexColor,
    themeTokens,
    normalizeInterfaceTheme,
    resolveThemeTokens,
    contrastRatio,
    normalize,
    load,
    save
  });
})();
