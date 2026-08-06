(() => {
  "use strict";

  const root = globalThis.TVCustomizer;
  const FEATURE_ID = "screener-grid-lines";
  const SETTINGS_KEY = "screenerGridLines";
  const STYLE_ID = "tvt-style-screener-grid-lines";
  const MARKER = "data-tvt-screener-grid-lines";
  const COLOR_VARIABLE = "--tvt-screener-grid-line-color";
  const { BODY_SELECTOR } = root.ScreenerTableSelectors;

  const STYLE_TEXT = `
table[${MARKER}="active"] > thead > tr > th:not(:last-child),
table[${MARKER}="active"] > ${BODY_SELECTOR} > tr[data-rowkey] > td:not(:last-child) {
  box-sizing: border-box !important;
  border-right: 1px solid var(${COLOR_VARIABLE}) !important;
}

table[${MARKER}="active"] > ${BODY_SELECTOR} > tr[data-rowkey] > td {
  border-bottom-color: var(${COLOR_VARIABLE}) !important;
}
`;

  class ScreenerGridLinesFeature {
    constructor({ document: doc = document, styleManager, adapter }) {
      this.document = doc;
      this.styleManager = styleManager;
      this.adapter = adapter;
      this.settingsKey = SETTINGS_KEY;
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
      const normalized = root.Settings.normalizeGridLines(settings);
      if (!normalized.enabled) {
        this.disable();
        return;
      }

      this.styleManager.set(STYLE_ID, STYLE_TEXT);
      const detection = this.adapter.detect();

      for (const table of detection.tables) {
        table.setAttribute(MARKER, "active");
        table.style.setProperty(COLOR_VARIABLE, normalized.color);
      }

      this.removeStaleMarkers(detection.tables);

      if (detection.tables.length > 0) {
        this.lastDiagnostic = this.makeDiagnostic(
          "active",
          detection.tables.length,
          `Applied ${normalized.color} grid lines to ${detection.tables.length} verified Screener table${detection.tables.length === 1 ? "" : "s"}.`
        );
      } else if (detection.headerCount > 0) {
        this.lastDiagnostic = this.makeDiagnostic(
          "degraded",
          0,
          `Found ${detection.headerCount} Symbol header candidate${detection.headerCount === 1 ? "" : "s"}, but the expected row structure was absent. No grid-line changes were applied.`
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

    clearTable(table) {
      table.removeAttribute(MARKER);
      table.style.removeProperty(COLOR_VARIABLE);
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

  root.ScreenerGridLinesFeature = ScreenerGridLinesFeature;
  root.ScreenerGridLinesConstants = Object.freeze({
    FEATURE_ID,
    SETTINGS_KEY,
    STYLE_ID,
    MARKER,
    COLOR_VARIABLE,
    BODY_SELECTOR,
    STYLE_TEXT
  });
})();
