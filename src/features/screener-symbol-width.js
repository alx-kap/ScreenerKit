(() => {
  "use strict";

  const root = globalThis.TVCustomizer;
  const FEATURE_ID = "screener-symbol-width";
  const SETTINGS_KEY = "screenerSymbolWidth";
  const STYLE_ID = "tvt-style-screener-symbol-width";
  const MARKER = "data-tvt-screener-symbol-width";
  const MODE_ATTRIBUTE = "data-tvt-symbol-width-mode";
  const { HEADER_SELECTOR, BODY_SELECTOR } = root.ScreenerTableSelectors;

  const STYLE_TEXT = `
table[${MARKER}="active"] > thead > tr > ${HEADER_SELECTOR},
table[${MARKER}="active"] > ${BODY_SELECTOR} > tr > td:first-child {
  box-sizing: border-box !important;
  width: var(--tvt-symbol-column-width) !important;
  min-width: var(--tvt-symbol-column-width) !important;
  max-width: var(--tvt-symbol-column-width) !important;
}

table[${MARKER}="active"]:not([data-tvt-screener-table-density="active"]) > thead > tr > ${HEADER_SELECTOR} > * {
  box-sizing: border-box !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  padding-inline: 8px 4px !important;
}

table[${MARKER}="active"]:not([data-tvt-screener-table-density="active"]) > ${BODY_SELECTOR} > tr > td:first-child {
  padding-inline: 8px 4px !important;
}

table[${MARKER}="active"] > ${BODY_SELECTOR} > tr > td:first-child > *,
table[${MARKER}="active"] > ${BODY_SELECTOR} > tr > td:first-child a {
  box-sizing: border-box !important;
  min-width: 0 !important;
  max-width: 100% !important;
}

table[${MARKER}="active"]:not([data-tvt-screener-table-density="active"]) > ${BODY_SELECTOR} > tr[data-rowkey] > td:first-child > span > span:first-child {
  flex: 0 0 0 !important;
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
}

table[${MARKER}="active"]:not([data-tvt-screener-table-density="active"]) > ${BODY_SELECTOR} > tr[data-rowkey] > td:first-child > span > span:first-child > div:has(> svg) {
  position: absolute !important;
  left: 0 !important;
  top: 50% !important;
  margin: 0 !important;
  transform: translateY(-50%) !important;
  z-index: 2 !important;
  pointer-events: none !important;
}

table[${MARKER}="active"]:not([data-tvt-screener-table-density="active"]) > ${BODY_SELECTOR} > tr[data-rowkey] > td:first-child > span > span:first-child > div:has(> svg) > svg {
  width: 6px !important;
  min-width: 6px !important;
  max-width: 6px !important;
}

table[${MARKER}="active"] > thead > tr > ${HEADER_SELECTOR} > * {
  overflow: hidden !important;
}

table[${MARKER}="active"] > thead > tr > ${HEADER_SELECTOR} > * > *,
table[${MARKER}="active"] > thead > tr > ${HEADER_SELECTOR} > * > * > * {
  box-sizing: border-box !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  overflow: hidden !important;
}

table[${MARKER}="active"] > thead > tr > ${HEADER_SELECTOR} > * > * > * {
  gap: var(--tvt-symbol-header-gap) !important;
}

table[${MARKER}="active"] > thead > tr > ${HEADER_SELECTOR} > * > * > * > button:first-child {
  box-sizing: border-box !important;
  flex: 0 0 var(--tvt-symbol-search-size) !important;
  width: var(--tvt-symbol-search-size) !important;
  min-width: var(--tvt-symbol-search-size) !important;
  max-width: var(--tvt-symbol-search-size) !important;
  height: var(--tvt-symbol-search-size) !important;
  min-height: var(--tvt-symbol-search-size) !important;
}

table[${MARKER}="active"] > thead > tr > ${HEADER_SELECTOR} > * > * > * > button:first-child span,
table[${MARKER}="active"] > thead > tr > ${HEADER_SELECTOR} > * > * > * > button:first-child svg {
  width: var(--tvt-symbol-search-icon-size) !important;
  min-width: var(--tvt-symbol-search-icon-size) !important;
  max-width: var(--tvt-symbol-search-icon-size) !important;
  height: var(--tvt-symbol-search-icon-size) !important;
  min-height: var(--tvt-symbol-search-icon-size) !important;
  max-height: var(--tvt-symbol-search-icon-size) !important;
}

table[${MARKER}="active"] > thead > tr > ${HEADER_SELECTOR} > * > * > * > div:last-child {
  box-sizing: border-box !important;
  flex: 1 1 auto !important;
  width: auto !important;
  min-width: 0 !important;
  max-width: 100% !important;
  grid-template-columns: minmax(0, 1fr) 18px !important;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr) !important;
  overflow: hidden !important;
}

table[${MARKER}="active"] > thead > tr > ${HEADER_SELECTOR} > * > * > * > div:last-child > div:first-child {
  grid-column: 1 !important;
  grid-row: 1 !important;
  min-width: 0 !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

table[${MARKER}="active"] > thead > tr > ${HEADER_SELECTOR} > * > * > * > div:last-child > div:first-child > * {
  display: block !important;
  min-width: 0 !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

table[${MARKER}="active"] > thead > tr > ${HEADER_SELECTOR} button[data-qa-id="sort-button-direction"] {
  grid-column: 2 !important;
  grid-row: 1 / span 2 !important;
  align-self: center !important;
}

table[${MARKER}="active"] > thead > tr > ${HEADER_SELECTOR} span[data-matches] {
  display: block !important;
  grid-column: 1 !important;
  grid-row: 2 !important;
  min-width: 0 !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

table[${MODE_ATTRIBUTE}="tiny"] > thead > tr > ${HEADER_SELECTOR} > * > * > * > div:last-child {
  grid-template-columns: minmax(0, 1fr) !important;
}

table[${MODE_ATTRIBUTE}="tiny"] > thead > tr > ${HEADER_SELECTOR} button[data-qa-id="sort-button-direction"] {
  display: none !important;
}
`;

  class ScreenerSymbolWidthFeature {
    constructor({ document: doc = document, styleManager, adapter }) {
      this.document = doc;
      this.styleManager = styleManager;
      this.adapter = adapter;
      this.settingsKey = SETTINGS_KEY;
      this.settings = null;
      this.lastDiagnostic = this.makeDiagnostic("waiting", 0, "Screener table not detected yet.");
    }

    makeDiagnostic(status, targetCount, detail) {
      return {
        id: FEATURE_ID,
        status,
        targetCount,
        detail,
        checkedAt: new Date().toISOString()
      };
    }

    update(settings) {
      this.settings = settings;
      if (!settings?.enabled) {
        this.disable();
        return;
      }

      this.styleManager.set(STYLE_ID, STYLE_TEXT);
      const detection = this.adapter.detect();
      const width = root.Settings.clampWidth(settings.widthPx);
      const mode = this.widthMode(width);

      for (const table of detection.tables) {
        table.setAttribute(MARKER, "active");
        table.setAttribute(MODE_ATTRIBUTE, mode.name);
        table.style.setProperty("--tvt-symbol-column-width", `${width}px`);
        table.style.setProperty("--tvt-symbol-search-size", `${mode.searchSize}px`);
        table.style.setProperty("--tvt-symbol-search-icon-size", `${mode.iconSize}px`);
        table.style.setProperty("--tvt-symbol-header-gap", `${mode.gap}px`);
      }

      this.removeStaleMarkers(detection.tables);

      if (detection.tables.length > 0) {
        this.lastDiagnostic = this.makeDiagnostic(
          "active",
          detection.tables.length,
          `Applied ${width}px (${mode.name} header) to ${detection.tables.length} verified Screener table${detection.tables.length === 1 ? "" : "s"}.`
        );
      } else if (detection.headerCount > 0) {
        this.lastDiagnostic = this.makeDiagnostic(
          "degraded",
          0,
          `Found ${detection.headerCount} Symbol header candidate${detection.headerCount === 1 ? "" : "s"}, but the expected row structure was absent. No layout changes were applied.`
        );
      } else {
        this.lastDiagnostic = this.makeDiagnostic("waiting", 0, "Screener table not detected yet.");
      }
    }

    removeStaleMarkers(activeTables) {
      for (const table of this.document.querySelectorAll(`table[${MARKER}]`)) {
        if (!activeTables.includes(table)) this.clearTable(table);
      }
    }

    widthMode(width) {
      if (width >= 140) return { name: "regular", searchSize: 34, iconSize: 28, gap: 12 };
      if (width >= 110) return { name: "compact", searchSize: 28, iconSize: 22, gap: 6 };
      if (width >= 90) return { name: "narrow", searchSize: 24, iconSize: 20, gap: 4 };
      return { name: "tiny", searchSize: 22, iconSize: 18, gap: 2 };
    }

    clearTable(table) {
      table.removeAttribute(MARKER);
      table.removeAttribute(MODE_ATTRIBUTE);
      table.style.removeProperty("--tvt-symbol-column-width");
      table.style.removeProperty("--tvt-symbol-search-size");
      table.style.removeProperty("--tvt-symbol-search-icon-size");
      table.style.removeProperty("--tvt-symbol-header-gap");
    }

    disable() {
      for (const table of this.document.querySelectorAll(`table[${MARKER}]`)) this.clearTable(table);
      this.styleManager.remove(STYLE_ID);
      this.lastDiagnostic = this.makeDiagnostic("disabled", 0, "Feature is disabled.");
    }

    diagnose() {
      return { ...this.lastDiagnostic };
    }
  }

  root.ScreenerSymbolWidthFeature = ScreenerSymbolWidthFeature;
  root.ScreenerSymbolWidthConstants = Object.freeze({
    FEATURE_ID,
    SETTINGS_KEY,
    STYLE_ID,
    MARKER,
    MODE_ATTRIBUTE,
    HEADER_SELECTOR,
    BODY_SELECTOR,
    STYLE_TEXT
  });
})();
