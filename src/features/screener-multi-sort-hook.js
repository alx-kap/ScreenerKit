(() => {
  "use strict";

  if (globalThis.__tvtScanHookInstalled) return;
  globalThis.__tvtScanHookInstalled = true;

  const CHANNEL = "tvt-scan-capture";
  const SCAN_URL_RE = /^https:\/\/scanner\.tradingview\.com\/[^/]+\/scan/;
  const originalFetch = globalThis.fetch;

  function relayScanResponse(columns, rows) {
    globalThis.postMessage({ source: CHANNEL, payload: { columns, rows } }, "*");
  }

  function extractScanPayload(bodyText) {
    const body = typeof bodyText === "string" ? JSON.parse(bodyText) : null;
    if (!body?.columns || !Array.isArray(body.columns) || !Array.isArray(body.range)) return null;
    return body.columns;
  }

  function mapScanData(columns, data) {
    const rows = {};
    for (const row of data) {
      const values = {};
      for (let index = 0; index < columns.length; index += 1) {
        values[columns[index]] = row.d[index] ?? null;
      }
      rows[row.s] = values;
    }
    return rows;
  }

  globalThis.fetch = function tvtWrappedFetch(input, init) {
    const request = originalFetch.apply(this, arguments);

    try {
      const url = typeof input === "string" ? input : input?.url;
      if (init?.method !== "POST" || !url || !SCAN_URL_RE.test(url)) return request;

      const columns = extractScanPayload(init.body);
      if (!columns) return request;

      request.then(response => {
        if (!response?.ok) return;
        const clone = response.clone();
        clone.json().then(json => {
          if (!json?.data?.length) return;
          relayScanResponse(columns, mapScanData(columns, json.data));
        }).catch(() => {});
      }).catch(() => {});
    } catch (error) {
      // The hook must never break TradingView network requests.
    }

    return request;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function tvtWrappedOpen(method, url) {
    this.__tvtScanUrl = url;
    this.__tvtScanMethod = method;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function tvtWrappedSend(body) {
    if (this.__tvtScanMethod === "POST" && SCAN_URL_RE.test(this.__tvtScanUrl || "")) {
      this.addEventListener("load", () => {
        try {
          if (this.status !== 200) return;
          const columns = extractScanPayload(body);
          if (!columns) return;
          const json = JSON.parse(this.responseText);
          if (!json?.data?.length) return;
          relayScanResponse(columns, mapScanData(columns, json.data));
        } catch (error) {
          // The hook must never break TradingView network requests.
        }
      });
    }
    return originalSend.apply(this, arguments);
  };
})();
