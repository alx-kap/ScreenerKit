(() => {
  "use strict";

  const root = globalThis.TVCustomizer;
  const FEATURE_ID = "screener-multi-sort";
  const SETTINGS_KEY = "screenerMultiSort";
  const STYLE_ID = "tvt-style-screener-multi-sort";
  const MARKER = "data-tvt-screener-multi-sort";
  const PIN_MARKER = "data-tvt-pin";
  const MENU_ITEM_MARKER = "data-tvt-pin-menu-item";
  const MENU_SELECTOR = '[data-qa-id="column-menu"]';
  const MENU_ITEM_SELECTOR = '[data-qa-id="column-menu-item"]';
  const SCAN_CHANNEL = "tvt-scan-capture";
  const FIELD_HEADER_SELECTOR = "thead th[data-field]";
  const { HEADER_SELECTOR, BODY_SELECTOR, ROW_SELECTOR } = root.ScreenerTableSelectors;

  const FIELD_MAP = Object.freeze({
    TickerUniversal: "ticker-view",
    Price: "close",
    "Change|TimeResolution1D": "change",
    "Volume|TimeResolution1D": "volume",
    "RelativeVolume|TimeResolution1D": "relative_volume_10d_calc",
    MarketCap: "market_cap_basic",
    PriceToEarnings: "price_earnings_ttm",
    "EpsDiluted|ttm": "earnings_per_share_diluted_ttm",
    "EpsDilutedGrowth|YoYTTM": "earnings_per_share_diluted_yoy_growth_ttm",
    "DividendsYield|ttm": "dividends_yield_current",
    Sector: "sector",
    AnalystRating: "AnalystRating"
  });

  const RATING_RAW_RANK = Object.freeze({
    StrongSell: 0,
    Sell: 1,
    Neutral: 2,
    Buy: 3,
    StrongBuy: 4
  });

  const RATING_TEXT_RANK = Object.freeze({
    "Strong sell": 0,
    Sell: 1,
    Neutral: 2,
    Buy: 3,
    "Strong buy": 4
  });

  const NUMERIC_FIELDS = Object.freeze([
    "Price",
    "Change|TimeResolution1D",
    "Volume|TimeResolution1D",
    "RelativeVolume|TimeResolution1D",
    "MarketCap",
    "PriceToEarnings",
    "EpsDiluted|ttm",
    "EpsDilutedGrowth|YoYTTM",
    "DividendsYield|ttm",
    "AnalystRating"
  ]);

  const NUMBER_RE = /^([-+]?\d+(?:\.\d+)?)([KMBT])?/;
  const SUFFIX_FACTOR = Object.freeze({ K: 1e3, M: 1e6, B: 1e9, T: 1e12 });

  const STYLE_TEXT = `
table[${MARKER}="active"] > thead th[data-field][${PIN_MARKER}] > div:first-child > div:first-child > div:first-child::after {
  content: " ▲";
  color: var(--color-brand, #2962ff);
  font-weight: 600;
}

table[${MARKER}="active"] > thead th[data-field][${PIN_MARKER}="desc"] > div:first-child > div:first-child > div:first-child::after {
  content: " ▼";
}

${MENU_SELECTOR} [${MENU_ITEM_MARKER}="true"] {
  cursor: pointer;
}

${MENU_SELECTOR} [${MENU_ITEM_MARKER}="true"]:hover {
  background: rgba(41, 98, 255, 0.08);
}

${MENU_SELECTOR} [${MENU_ITEM_MARKER}="true"] > div {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  font-size: 14px;
  color: var(--color-toolbar-button-text, #0f0f0f);
  white-space: nowrap;
}

${MENU_SELECTOR} [${MENU_ITEM_MARKER}="true"] > div:focus-visible {
  outline: 2px solid var(--color-brand, #2962ff);
  outline-offset: -2px;
}
`;

  function parseNumericText(text) {
    const cleaned = String(text || "")
      .replace(/[\u2212\u2013]/g, "-")
      .replace(/[USD\u20ac\u00a3\u00a5\s%]/g, "")
      .replace(/,/g, "");
    const match = cleaned.match(NUMBER_RE);
    if (!match) return null;
    const number = Number(match[1]);
    if (!Number.isFinite(number)) return null;
    return number * (SUFFIX_FACTOR[match[2]] || 1);
  }

  function headerLabelFor(th) {
    const clone = th.querySelector(":scope > div:first-child > div:first-child")?.cloneNode(true);
    clone?.querySelector("button")?.remove();
    const label = (clone?.innerText || th.innerText || "").trim();
    return label.split(/\s+/).join(" ");
  }

  class ScreenerMultiSortFeature {
    constructor({ document: doc = document, styleManager, adapter, persistPin = async () => {} }) {
      this.document = doc;
      this.styleManager = styleManager;
      this.adapter = adapter;
      this.persistPin = persistPin;
      this.settingsKey = SETTINGS_KEY;
      this.pinnedField = null;
      this.pinnedOrder = "asc";
      this.rawValues = {};
      this.rawHookActive = false;
      this.applying = false;
      this.lastSorts = new WeakMap();
      this.lastClickedField = null;
      this.lastClickedLabel = "";
      this.tableViews = new Map();
      this.bodyObserver = null;
      this.clickCapture = null;
      this.messageListener = null;
      this.frame = null;
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
      const normalized = root.Settings.normalizeMultiSort(settings);
      if (!normalized.enabled) {
        this.disable();
        return;
      }

      this.styleManager.set(STYLE_ID, STYLE_TEXT);
      this.attachListeners();

      const detection = this.adapter.detect();
      for (const table of detection.tables) {
        table.setAttribute(MARKER, "active");
        this.observeTable(table);
      }
      this.removeStaleTables(detection.tables);
      this.syncPinnedState(normalized);
      this.injectMenuIfNeeded();
      this.applyAllSorts();

      if (detection.tables.length > 0) {
        const pinDetail = this.pinnedField
          ? `; pinned ${this.pinnedField} (${this.pinnedOrder})`
          : "; no column pinned";
        const hookDetail = this.rawHookActive ? "raw values active" : "raw values inactive (text fallback)";
        this.lastDiagnostic = this.makeDiagnostic(
          "active",
          detection.tables.length,
          `Secondary sort ready on ${detection.tables.length} verified table${detection.tables.length === 1 ? "" : "s"}${pinDetail}; ${hookDetail}.`
        );
      } else if (detection.headerCount > 0) {
        this.lastDiagnostic = this.makeDiagnostic(
          "degraded",
          0,
          `Found ${detection.headerCount} Symbol header candidate${detection.headerCount === 1 ? "" : "s"}, but the expected row structure was absent. No multi-sort changes were applied.`
        );
      } else {
        this.lastDiagnostic = this.makeDiagnostic("waiting", 0, "Screener table not detected yet.");
      }
    }

    syncPinnedState(normalized) {
      this.pinnedField = normalized.pinnedField;
      this.pinnedOrder = normalized.pinnedOrder;
      const detection = this.adapter.detect();
      this.syncHeaderMarkers(detection.tables);
    }

    attachListeners() {
      if (!this.clickCapture) {
        this.clickCapture = event => {
          const th = event.target?.closest?.(FIELD_HEADER_SELECTOR);
          if (!th) return;
          this.lastClickedField = th.getAttribute("data-field");
          this.lastClickedLabel = headerLabelFor(th);
        };
        this.document.addEventListener("click", this.clickCapture, true);
      }
      if (!this.messageListener) {
        this.messageListener = event => {
          if (event.source !== window) return;
          const data = event.data;
          if (data?.source === SCAN_CHANNEL && data.payload) {
            this.ingestRawValues(data.payload);
            if (!this.rawHookActive) {
              this.rawHookActive = true;
              this.lastDiagnostic = this.makeDiagnostic(
                this.lastDiagnostic.status,
                this.lastDiagnostic.targetCount,
                this.lastDiagnostic.detail.replace("raw values inactive (text fallback)", "raw values active")
              );
            }
          }
        };
        window.addEventListener("message", this.messageListener);
      }
      if (!this.bodyObserver) {
        this.bodyObserver = new MutationObserver(() => this.scheduleInjection());
        this.bodyObserver.observe(this.document.body, { childList: true, subtree: true });
      }
    }

    observeTable(table) {
      if (this.tableViews.has(table)) return;
      const observer = new MutationObserver(() => this.scheduleApply(table));
      observer.observe(table, { childList: true, subtree: true });
      this.tableViews.set(table, observer);
    }

    removeStaleTables(activeTables) {
      for (const [table, observer] of this.tableViews) {
        if (!activeTables.includes(table)) {
          observer.disconnect();
          this.tableViews.delete(table);
          table.removeAttribute(MARKER);
        }
      }
    }

    syncHeaderMarkers(tables) {
      for (const table of tables) {
        for (const th of table.querySelectorAll(FIELD_HEADER_SELECTOR)) {
          const field = th.getAttribute("data-field");
          if (field && field === this.pinnedField) {
            th.setAttribute(PIN_MARKER, this.pinnedOrder);
          } else {
            th.removeAttribute(PIN_MARKER);
          }
        }
      }
    }

    scheduleInjection() {
      if (this.frame !== null) return;
      this.frame = this.document.defaultView.requestAnimationFrame(() => {
        this.frame = null;
        this.injectMenuIfNeeded();
      });
    }

    injectMenuIfNeeded() {
      const menu = this.document.querySelector(MENU_SELECTOR);
      if (!menu || menu.querySelector(`[${MENU_ITEM_MARKER}]`)) return;
      if (!this.lastClickedField) return;

      const items = Array.from(menu.querySelectorAll(MENU_ITEM_SELECTOR));
      const anchor = items[1];
      if (!anchor) return;

      const field = this.lastClickedField;
      const label = this.lastClickedLabel || field;
      const pinned = this.pinnedField === field;
      const order = this.pinnedOrder;

      const item = this.document.createElement("div");
      item.setAttribute(MENU_ITEM_MARKER, "true");
      item.setAttribute("data-qa-id", "column-menu-item");
      const inner = this.document.createElement("div");
      inner.setAttribute("data-qa-id", "column-menu-item");
      inner.tabIndex = 0;
      inner.textContent = pinned
        ? `Unpin "${label}" ${order === "asc" ? "▲" : "▼"}`
        : `Pin "${label}" (secondary sort)`;
      inner.setAttribute("aria-label", pinned
        ? `Unpin ${label} from secondary sort`
        : `Pin ${label} as secondary sort`);
      item.append(inner);
      item.addEventListener("click", () => this.togglePin(field));
      anchor.after(item);
    }

    closeMenu() {
      const menu = this.document.querySelector(MENU_SELECTOR);
      if (!menu) return;
      const manager = menu.closest('[data-qa-id="overlap-manager-root"]');
      if (manager) {
        manager.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        manager.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        if (!menu.isConnected) return;
        manager.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        if (!menu.isConnected) return;
        manager.remove();
      }
    }

    togglePin(field) {
      if (this.pinnedField !== field) {
        this.pinnedField = field;
        this.pinnedOrder = "asc";
      } else if (this.pinnedOrder === "asc") {
        this.pinnedOrder = "desc";
      } else {
        this.pinnedField = null;
      }
      this.persistPin({ pinnedField: this.pinnedField, pinnedOrder: this.pinnedOrder });
      this.syncHeaderMarkers(this.adapter.detect().tables);
      this.refreshMenuItem(field);
      this.applyAllSorts();
      this.closeMenu();
    }

    refreshMenuItem(field) {
      const item = this.document.querySelector(`${MENU_SELECTOR} [${MENU_ITEM_MARKER}="true"]`);
      if (!item) return;
      const inner = item.querySelector(MENU_ITEM_SELECTOR);
      if (!inner) return;
      const label = this.lastClickedLabel || field;
      const pinned = this.pinnedField === field;
      inner.textContent = pinned
        ? `Unpin "${label}" ${this.pinnedOrder === "asc" ? "▲" : "▼"}`
        : `Pin "${label}" (secondary sort)`;
      inner.setAttribute("aria-label", pinned
        ? `Unpin ${label} from secondary sort`
        : `Pin ${label} as secondary sort`);
    }

    columnIndexFor(table, field) {
      for (const th of table.querySelectorAll(FIELD_HEADER_SELECTOR)) {
        if (th.getAttribute("data-field") === field) return th.cellIndex;
      }
      return -1;
    }

    rawValueFor(field, rowkey) {
      const apiField = FIELD_MAP[field];
      if (!apiField) return null;
      return this.rawValues[apiField]?.[rowkey] ?? null;
    }

    cellValueFor(row, index, numeric) {
      const text = (row.cells[index]?.innerText || "").trim();
      if (!text || text === "—") return null;
      if (numeric) {
        if (Object.prototype.hasOwnProperty.call(RATING_TEXT_RANK, text)) return RATING_TEXT_RANK[text];
        return parseNumericText(text);
      }
      return text;
    }

    valueFor(row, table, field, numeric) {
      const raw = this.rawValueFor(field, row.getAttribute("data-rowkey"));
      if (raw !== null && raw !== undefined) return raw;
      return this.cellValueFor(row, this.columnIndexFor(table, field), numeric);
    }

    applyAllSorts() {
      for (const table of this.tableViews.keys()) this.applySort(table);
    }

    applySort(table) {
      if (!this.pinnedField || this.applying) return;
      const body = table.querySelector(`:scope > ${BODY_SELECTOR}`);
      if (!body) return;
      const rows = Array.from(body.querySelectorAll(`:scope > ${ROW_SELECTOR}`));
      if (rows.length < 2) return;

      const orderKey = rows.map(row => row.getAttribute("data-rowkey")).join("\u0001");
      const lastSort = this.lastSorts.get(table);
      if (lastSort && lastSort.field === this.pinnedField && lastSort.order === this.pinnedOrder && lastSort.orderKey === orderKey) return;

      const field = this.pinnedField;
      const direction = this.pinnedOrder === "desc" ? -1 : 1;
      const numeric = NUMERIC_FIELDS.includes(field);
      const values = new Map();
      for (const row of rows) values.set(row, this.valueFor(row, table, field, numeric));

      const sorted = rows.sort((first, second) => {
        const a = values.get(first);
        const b = values.get(second);
        if (a === null && b === null) return 0;
        if (a === null) return 1;
        if (b === null) return -1;
        const compared = typeof a === "number" && typeof b === "number"
          ? a - b
          : String(a).localeCompare(String(b));
        return compared * direction;
      });

      this.applying = true;
      try {
        for (const row of sorted) body.append(row);
        this.lastSorts.set(table, { field: this.pinnedField, order: this.pinnedOrder, orderKey });
      } finally {
        this.applying = false;
      }
    }

    scheduleApply(table) {
      this.document.defaultView.requestAnimationFrame(() => this.applySort(table));
    }

    ingestRawValues(payload) {
      const { columns, rows } = payload;
      for (const column of columns) {
        const store = this.rawValues[column] || (this.rawValues[column] = {});
        for (const [symbol, values] of Object.entries(rows)) {
          let value = values[column];
          if (value === null || value === undefined) {
            store[symbol] = null;
            continue;
          }
          if (column === "ticker-view") {
            store[symbol] = value?.name ?? null;
          } else if (column === "AnalystRating") {
            store[symbol] = RATING_RAW_RANK[value] ?? null;
          } else {
            store[symbol] = value;
          }
        }
      }
      this.applyAllSorts();
    }

    disable() {
      if (this.bodyObserver) {
        this.bodyObserver.disconnect();
        this.bodyObserver = null;
      }
      if (this.clickCapture) {
        this.document.removeEventListener("click", this.clickCapture, true);
        this.clickCapture = null;
      }
      if (this.messageListener) {
        window.removeEventListener("message", this.messageListener);
        this.messageListener = null;
      }
      for (const [table, observer] of this.tableViews) {
        observer.disconnect();
        table.removeAttribute(MARKER);
      }
      this.tableViews.clear();
      this.rawValues = {};
      this.lastClickedField = null;
      this.lastClickedLabel = "";
      this.styleManager.remove(STYLE_ID);
      this.lastDiagnostic = this.makeDiagnostic("disabled", 0, "Feature is disabled.");
    }

    diagnose() {
      return { ...this.lastDiagnostic };
    }
  }

  root.ScreenerMultiSortFeature = ScreenerMultiSortFeature;
  root.ScreenerMultiSortConstants = Object.freeze({
    FEATURE_ID,
    SETTINGS_KEY,
    STYLE_ID,
    MARKER,
    PIN_MARKER,
    MENU_ITEM_MARKER,
    MENU_SELECTOR,
    MENU_ITEM_SELECTOR,
    FIELD_MAP,
    RATING_RAW_RANK,
    RATING_TEXT_RANK,
    NUMERIC_FIELDS,
    FIELD_HEADER_SELECTOR,
    HEADER_SELECTOR,
    BODY_SELECTOR,
    STYLE_TEXT,
    parseNumericText
  });
})();
