const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadThemeFeature() {
  const context = vm.createContext({ globalThis: {} });
  for (const file of [
    "src/core/namespace.js",
    "src/core/settings.js",
    "src/features/interface-theme.js"
  ]) {
    const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    vm.runInContext(source, context, { filename: file });
  }
  return context.globalThis.TVCustomizer;
}

function makeHarness(root) {
  const attributes = new Map();
  const documentElement = {
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); }
  };
  const styles = new Map();
  const styleManager = {
    set(id, cssText) { styles.set(id, cssText); },
    remove(id) { styles.delete(id); }
  };
  const feature = new root.InterfaceThemeFeature({ document: { documentElement }, styleManager });
  return { attributes, feature, styles };
}

test("applies a preset through semantic variables on the document root", () => {
  const root = loadThemeFeature();
  const harness = makeHarness(root);
  harness.feature.update({ selection: "oled" });

  assert.equal(harness.attributes.get("data-tvt-interface-theme"), "oled");
  const css = harness.styles.get("tvt-style-interface-theme");
  assert.match(css, /--color-header-bg: #000000/);
  assert.match(css, /--color-chart-page-bg: #2a2a2e/);
  assert.match(css, /--color-background-tertiary: #2a2a2e/);
  assert.match(css, /--color-popup-background: #000000/);
  assert.match(css, /--color-container-fill-tertiary-inverse: #000000/);
  assert.match(css, /--color-background-dialog-promo: #000000/);
  assert.match(css, /--color-container-fill-primary-neutral-extra-light: #000000/);
  assert.match(css, /--color-container-fill-primary-neutral-light: #2a2a2e/);
  assert.match(css, /--color-container-fill-primary-neutral-extra-bold: #f5f5f7/);
  assert.match(css, /--color-container-fill-primary-accent: #3b82f6/);
  assert.match(css, /--color-toolbar-toggle-button-background-active: #3b82f6/);
  assert.match(css, /\[data-qa-id="popup-menu-container"\]:has\(\[data-qa-id="save-load-menu-item-save"\]\)/);
  assert.match(css, /--ui-lib-in-listItem-backgroundColor: #000000/);
  assert.match(css, /--ui-lib-in-listItem-backgroundColorActive: #2a2a2e/);
  assert.match(css, /--ui-lib-in-listItem-backgroundColorSelected: #f5f5f7/);
  assert.match(css, /--ui-lib-in-listItem-textColorSelected: #000000/);
  assert.match(css, /--ui-lib-in-listItem-dividerColor: #2a2a2e/);
  assert.equal(harness.feature.diagnose().status, "active");
});

test("custom themes use normalized stored colors", () => {
  const root = loadThemeFeature();
  const harness = makeHarness(root);
  harness.feature.update({
    selection: "custom",
    custom: { surface: "#112233", text: "#fefefe" }
  });

  const css = harness.styles.get("tvt-style-interface-theme");
  assert.match(css, /--color-header-bg: #112233/);
  assert.match(css, /--color-text-primary: #fefefe/);
  assert.match(css, new RegExp(`--color-chart-page-bg: ${root.Settings.CUSTOM_THEME_DEFAULT.border}`));
});

test("native selection and disable remove all owned state", () => {
  const root = loadThemeFeature();
  const harness = makeHarness(root);
  harness.feature.update({ selection: "oled" });
  harness.feature.update({ selection: "native" });

  assert.equal(harness.attributes.has("data-tvt-interface-theme"), false);
  assert.equal(harness.styles.has("tvt-style-interface-theme"), false);
  assert.equal(harness.feature.diagnose().status, "disabled");
});
