(() => {
  "use strict";

  const root = globalThis.TVCustomizer;
  const FEATURE_ID = "screener-table-density";
  const SETTINGS_KEY = "screenerTableDensity";
  const STYLE_ID = "tvt-style-screener-table-density";
  const MARKER = "data-tvt-screener-table-density";
  const PANEL_MARKER = "data-tvt-screener-panel-inset";
  const PANEL_VARIABLE = "--tvt-screener-left-inset";
  const { HEADER_SELECTOR, BODY_SELECTOR, WIDGET_SELECTOR, PANEL_SELECTOR } = root.ScreenerTableSelectors;

  const VARIABLES = Object.freeze({
    bodyFontPx: "--tvt-table-body-font-size",
    headerFontPx: "--tvt-table-header-font-size",
    rowHeightPx: "--tvt-table-row-height",
    headerHeightPx: "--tvt-table-header-height",
    cellPaddingXPx: "--tvt-table-cell-padding-x"
  });

  const STYLE_TEXT = `
${WIDGET_SELECTOR} > ${PANEL_SELECTOR}[${PANEL_MARKER}="active"] {
  box-sizing: border-box !important;
  padding-left: var(${PANEL_VARIABLE}) !important;
}

table[${MARKER}="active"] > thead > tr {
  height: var(--tvt-table-header-height) !important;
}

table[${MARKER}="active"] > thead > tr > th {
  box-sizing: border-box !important;
  height: var(--tvt-table-header-height) !important;
  padding-inline: var(--tvt-table-cell-padding-x) !important;
  font-size: var(--tvt-table-header-font-size) !important;
}

table[${MARKER}="active"] > thead > tr > th > * {
  box-sizing: border-box !important;
  height: calc(var(--tvt-table-header-height) - 2px) !important;
  min-height: 0 !important;
  padding-inline: 0 !important;
  font-size: inherit !important;
}

table[${MARKER}="active"] > thead > tr > th * {
  font-size: inherit !important;
}

table[${MARKER}="active"] > ${BODY_SELECTOR} > tr {
  height: var(--tvt-table-row-height) !important;
}

table[${MARKER}="active"] > ${BODY_SELECTOR} > tr[data-rowkey]::after {
  box-sizing: border-box !important;
  height: calc(var(--tvt-table-row-height) - 1px) !important;
  min-height: 0 !important;
  max-height: calc(var(--tvt-table-row-height) - 1px) !important;
  border-radius: min(10px, calc(var(--tvt-table-row-height) / 4)) !important;
}

table[${MARKER}="active"] > ${BODY_SELECTOR} > tr > td {
  box-sizing: border-box !important;
  height: var(--tvt-table-row-height) !important;
  padding-inline: var(--tvt-table-cell-padding-x) !important;
  font-size: var(--tvt-table-body-font-size) !important;
}

table[${MARKER}="active"] > ${BODY_SELECTOR} > tr > td * {
  font-size: inherit !important;
}

table[${MARKER}="active"] > ${BODY_SELECTOR} > tr[data-rowkey] > td:first-child > span > span:first-child {
  flex: 0 0 0 !important;
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
}

table[${MARKER}="active"] > ${BODY_SELECTOR} > tr[data-rowkey] > td:first-child > span > span:first-child > div:has(> svg) {
  position: absolute !important;
  left: 0 !important;
  top: 50% !important;
  margin: 0 !important;
  transform: translateY(-50%) !important;
  z-index: 2 !important;
  pointer-events: none !important;
}

table[${MARKER}="active"] > ${BODY_SELECTOR} > tr[data-rowkey] > td:first-child > span > span:first-child > div:has(> svg) > svg {
  width: 6px !important;
  min-width: 6px !important;
  max-width: 6px !important;
}
`;

  class ScreenerTableDensityFeature {
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
      const normalized = root.Settings.normalizeDensity(settings);
      if (!normalized.enabled) {
        this.disable();
        return;
      }

      this.styleManager.set(STYLE_ID, STYLE_TEXT);
      const detection = this.adapter.detect();
      const activePanels = [];

      for (const table of detection.tables) {
        table.setAttribute(MARKER, "active");
        for (const [settingKey, variable] of Object.entries(VARIABLES)) {
          table.style.setProperty(variable, `${normalized[settingKey]}px`);
        }

        const panel = this.adapter.panelForTable(table);
        if (panel && !activePanels.includes(panel)) {
          panel.setAttribute(PANEL_MARKER, "active");
          panel.style.setProperty(PANEL_VARIABLE, `${normalized.leftInsetPx}px`);
          activePanels.push(panel);
        }
      }

      this.removeStaleMarkers(detection.tables);
      this.removeStalePanels(activePanels);

      if (detection.tables.length > 0) {
        this.lastDiagnostic = this.makeDiagnostic(
          "active",
          detection.tables.length,
          `Applied ${normalized.preset} density to ${detection.tables.length} verified Screener table${detection.tables.length === 1 ? "" : "s"}; adjusted ${activePanels.length} panel inset${activePanels.length === 1 ? "" : "s"}.`
        );
      } else if (detection.headerCount > 0) {
        this.lastDiagnostic = this.makeDiagnostic(
          "degraded",
          0,
          `Found ${detection.headerCount} Symbol header candidate${detection.headerCount === 1 ? "" : "s"}, but the expected row structure was absent. No density changes were applied.`
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
      for (const variable of Object.values(VARIABLES)) table.style.removeProperty(variable);
    }

    removeStalePanels(activePanels) {
      for (const panel of this.document.querySelectorAll(`[${PANEL_MARKER}]`)) {
        if (!activePanels.includes(panel)) this.clearPanel(panel);
      }
    }

    clearPanel(panel) {
      panel.removeAttribute(PANEL_MARKER);
      panel.style.removeProperty(PANEL_VARIABLE);
    }

    disable() {
      for (const table of this.document.querySelectorAll(`table[${MARKER}]`)) this.clearTable(table);
      for (const panel of this.document.querySelectorAll(`[${PANEL_MARKER}]`)) this.clearPanel(panel);
      this.styleManager.remove(STYLE_ID);
      this.lastDiagnostic = this.makeDiagnostic("disabled", 0, "Feature is disabled.");
    }

    diagnose() {
      return { ...this.lastDiagnostic };
    }
  }

  root.ScreenerTableDensityFeature = ScreenerTableDensityFeature;
  root.ScreenerTableDensityConstants = Object.freeze({
    FEATURE_ID,
    SETTINGS_KEY,
    STYLE_ID,
    MARKER,
    PANEL_MARKER,
    PANEL_VARIABLE,
    VARIABLES,
    HEADER_SELECTOR,
    BODY_SELECTOR,
    STYLE_TEXT
  });
})();
