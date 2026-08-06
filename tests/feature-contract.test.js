const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");

const adapterSource = fs.readFileSync("src/core/screener-table-adapter.js", "utf8");
const themeSource = fs.readFileSync("src/features/interface-theme.js", "utf8");
const symbolSource = fs.readFileSync("src/features/screener-symbol-width.js", "utf8");
const densitySource = fs.readFileSync("src/features/screener-table-density.js", "utf8");
const gridLinesSource = fs.readFileSync("src/features/screener-grid-lines.js", "utf8");
const lifecycleSource = fs.readFileSync("src/core/lifecycle.js", "utf8");
const popupSource = fs.readFileSync("popup.js", "utf8");
const contentSource = fs.readFileSync("src/content.js", "utf8");
const popupHtml = fs.readFileSync("popup.html", "utf8");
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

test("uses the inspected semantic Screener contracts", () => {
  assert.match(adapterSource, /data-field="TickerUniversal"/);
  assert.match(adapterSource, /data-testid="selectable-rows-table-body"/);
  assert.match(adapterSource, /tr\[data-rowkey\]/);
});

test("does not encode TradingView hashed class names", () => {
  const observedGeneratedTokens = [
    "rf7xh3bD",
    "ixuo49jq",
    "l8ssHf_S",
    "SX4qDLXl",
    "HX5UXsDj",
    "bSkIwNFe",
    "inrzsqyc",
    "LasUBsXx"
  ];
  for (const token of observedGeneratedTokens) {
    assert.equal((adapterSource + themeSource + symbolSource + densitySource + gridLinesSource).includes(token), false, `unexpected generated class token: ${token}`);
  }
});

test("feature CSS is scoped to positively marked tables", () => {
  assert.match(symbolSource, /data-tvt-screener-symbol-width/);
  assert.match(densitySource, /data-tvt-screener-table-density/);
  assert.match(symbolSource, /table\[\$\{MARKER\}=\"active\"\]/);
  assert.match(densitySource, /table\[\$\{MARKER\}=\"active\"\]/);
  assert.match(gridLinesSource, /data-tvt-screener-grid-lines/);
  assert.match(gridLinesSource, /table\[\$\{MARKER\}=\"active\"\]/);
  assert.match(symbolSource, /:not\(\[data-tvt-screener-table-density=\"active\"\]\)/);
});

test("popup bootstraps a missing content script and content startup is idempotent", () => {
  assert.match(popupSource, /chrome\.scripting\.executeScript/);
  assert.match(popupSource, /Receiving end does not exist/);
  assert.match(popupSource, /src\/core\/screener-table-adapter\.js/);
  assert.match(popupSource, /src\/features\/screener-table-density\.js/);
  assert.match(popupSource, /src\/features\/screener-grid-lines\.js/);
  assert.match(popupSource, /src\/features\/interface-theme\.js/);
  assert.match(contentSource, /if \(root\.runtimeStarted\) return/);
});

test("lifecycle routes settings by each feature settings key", () => {
  assert.match(lifecycleSource, /this\.settings\.features\?\.\[feature\.settingsKey\]/);
  assert.doesNotMatch(lifecycleSource, /features\?\.screenerSymbolWidth/);
});

test("density and Symbol teardown own separate markers and variables", () => {
  assert.match(symbolSource, /table\[\$\{MARKER\}\]/);
  assert.match(symbolSource, /--tvt-symbol-column-width/);
  assert.match(densitySource, /Object\.values\(VARIABLES\)/);
  assert.doesNotMatch(densitySource, /--tvt-symbol-column-width/);
});

test("grid lines use an independent marker, variable, and teardown", () => {
  assert.match(gridLinesSource, /data-tvt-screener-grid-lines/);
  assert.match(gridLinesSource, /--tvt-screener-grid-line-color/);
  assert.match(gridLinesSource, /table\[\$\{MARKER\}\]/);
  assert.match(gridLinesSource, /removeProperty\(COLOR_VARIABLE\)/);
  assert.doesNotMatch(gridLinesSource, /--tvt-symbol-column-width/);
  assert.doesNotMatch(gridLinesSource, /--tvt-table-row-height/);
});

test("grid lines add only internal vertical borders and recolor body row borders", () => {
  assert.match(gridLinesSource, /th:not\(:last-child\)/);
  assert.match(gridLinesSource, /td:not\(:last-child\)/);
  assert.match(gridLinesSource, /border-right: 1px solid var\(\$\{COLOR_VARIABLE\}\)/);
  assert.match(gridLinesSource, /border-bottom-color: var\(\$\{COLOR_VARIABLE\}\)/);
});

test("grid-line diagnostics and runtime registration are exposed", () => {
  assert.match(gridLinesSource, /screener-grid-lines/);
  assert.match(gridLinesSource, /status,/);
  assert.match(gridLinesSource, /targetCount,/);
  assert.match(contentSource, /new root\.ScreenerGridLinesFeature/);
  assert.match(contentSource, /features: \[interfaceThemeFeature, symbolWidthFeature, tableDensityFeature, gridLinesFeature\]/);
  assert.match(popupSource, /"screener-grid-lines": "Grid lines"/);
});

test("interface theme owns a root marker, semantic variables, and teardown", () => {
  assert.match(themeSource, /data-tvt-interface-theme/);
  assert.match(themeSource, /html\[\$\{MARKER\}=/);
  assert.match(themeSource, /--color-header-bg/);
  assert.match(themeSource, /--color-pane-bg/);
  assert.match(themeSource, /--color-popup-background/);
  assert.match(themeSource, /--color-toolbar-button-text/);
  assert.match(themeSource, /documentElement\?\.removeAttribute\(MARKER\)/);
  assert.match(themeSource, /styleManager\.remove\(STYLE_ID\)/);
  assert.doesNotMatch(themeSource, /--color-(buy|sell|growing|falling|warning)/);
});

test("interface theme is registered before the table features", () => {
  assert.match(contentSource, /new root\.InterfaceThemeFeature/);
  assert.match(contentSource, /features: \[interfaceThemeFeature, symbolWidthFeature, tableDensityFeature, gridLinesFeature\]/);
  assert.match(popupSource, /"interface-theme": "Interface theme"/);
});

test("popup exposes every theme preset and custom token control", () => {
  for (const selection of ["native", "oled", "custom"]) {
    assert.match(popupHtml, new RegExp(`data-theme-selection="${selection}"`));
  }
  for (const removed of ["midnight", "nord", "sepia"]) {
    assert.doesNotMatch(popupHtml, new RegExp(`data-theme-selection="${removed}"`));
  }
  for (const token of ["page", "surface", "elevated", "border", "text", "muted", "accent"]) {
    assert.match(popupHtml, new RegExp(`data-theme-token="${token}"`));
  }
  assert.match(popupHtml, /id="theme-contrast"/);
  assert.match(popupHtml, /id="reset-custom-theme"/);
});

test("manifest loads interface themes at document start", () => {
  assert.equal(manifest.version, "0.5.7");
  assert.equal(manifest.content_scripts[0].run_at, "document_start");
  assert.ok(manifest.content_scripts[0].js.includes("src/features/interface-theme.js"));
});

test("Symbol header uses responsive modes without generated selectors", () => {
  assert.match(symbolSource, /data-tvt-symbol-width-mode/);
  assert.match(symbolSource, /width >= 140/);
  assert.match(symbolSource, /width >= 110/);
  assert.match(symbolSource, /width >= 90/);
  assert.match(symbolSource, /span\[data-matches\]/);
  assert.match(symbolSource, /span\[data-matches\][\s\S]*display: block !important/);
  assert.doesNotMatch(symbolSource, /span\[data-matches\][^{}]*\{[^}]*display: none/);
  assert.match(symbolSource, /button\[data-qa-id="sort-button-direction"\]/);
  assert.match(symbolSource, /text-overflow: ellipsis !important/);
  assert.match(symbolSource, /grid-template-rows: minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(symbolSource, /button:first-child/);
});

test("Symbol width preserves native row markers that extend past the first cell content", () => {
  assert.doesNotMatch(
    symbolSource,
    /> \$\{BODY_SELECTOR\} > tr > td:first-child \{\s*overflow: hidden !important;\s*\}/
  );
});

test("compact table features re-anchor and narrow native Screener flags", () => {
  for (const source of [symbolSource, densitySource]) {
    assert.match(source, /tr\[data-rowkey\] > td:first-child > span > span:first-child > div:has\(> svg\)/);
    assert.match(source, /position: absolute !important/);
    assert.match(source, /left: 0 !important/);
    assert.match(source, /transform: translateY\(-50%\) !important/);
    assert.match(source, /pointer-events: none !important/);
    assert.match(source, /span:first-child \{[\s\S]*flex: 0 0 0 !important/);
    assert.match(source, /> svg \{[\s\S]*width: 6px !important/);
  }
});

test("density binds TradingView's selection highlight to the configured row height", () => {
  assert.match(densitySource, /tr\[data-rowkey\]::after/);
  assert.match(densitySource, /height: calc\(var\(--tvt-table-row-height\) - 1px\)/);
  assert.match(densitySource, /border-radius: min\(10px, calc\(var\(--tvt-table-row-height\) \/ 4\)\)/);
});

test("density controls the semantic Screener panel inset", () => {
  assert.match(adapterSource, /data-qa-id="screener-widget"/);
  assert.match(adapterSource, /data-query-type="container"/);
  assert.match(densitySource, /data-tvt-screener-panel-inset/);
  assert.match(densitySource, /--tvt-screener-left-inset/);
  assert.match(densitySource, /padding-left: var\(\$\{PANEL_VARIABLE\}\)/);
});
