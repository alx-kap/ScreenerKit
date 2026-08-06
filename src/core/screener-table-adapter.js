(() => {
  "use strict";

  const HEADER_SELECTOR = 'th[data-field="TickerUniversal"]';
  const BODY_SELECTOR = 'tbody[data-testid="selectable-rows-table-body"]';
  const ROW_SELECTOR = 'tr[data-rowkey]';
  const WIDGET_SELECTOR = '[data-qa-id="screener-widget"]';
  const PANEL_SELECTOR = '[data-query-type="container"]';

  class ScreenerTableAdapter {
    constructor(doc = document) {
      this.document = doc;
    }

    detect(context = this.document) {
      const headers = Array.from(context.querySelectorAll(HEADER_SELECTOR));
      const tables = [];
      let rejected = 0;

      for (const header of headers) {
        const table = header.closest("table");
        const body = table?.querySelector(`:scope > ${BODY_SELECTOR}`);
        const firstRow = body?.querySelector(`:scope > ${ROW_SELECTOR}`);
        const firstCell = firstRow?.querySelector(":scope > td:first-child");
        const valid = Boolean(
          table &&
          body &&
          firstCell &&
          header.cellIndex === 0 &&
          firstCell.cellIndex === 0
        );

        if (!valid) {
          rejected += 1;
          continue;
        }

        if (!tables.includes(table)) tables.push(table);
      }

      return { tables, headerCount: headers.length, rejected };
    }

    panelForTable(table) {
      const widget = table?.closest(WIDGET_SELECTOR);
      const panel = widget?.querySelector(`:scope > ${PANEL_SELECTOR}`);
      return panel?.contains(table) ? panel : null;
    }
  }

  globalThis.TVCustomizer.ScreenerTableAdapter = ScreenerTableAdapter;
  globalThis.TVCustomizer.ScreenerTableSelectors = Object.freeze({
    HEADER_SELECTOR,
    BODY_SELECTOR,
    ROW_SELECTOR,
    WIDGET_SELECTOR,
    PANEL_SELECTOR
  });
})();
