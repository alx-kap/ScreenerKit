(() => {
  "use strict";

  const root = globalThis.TVCustomizer;
  const FEATURE_ID = "interface-theme";
  const SETTINGS_KEY = "interfaceTheme";
  const STYLE_ID = "tvt-style-interface-theme";
  const MARKER = "data-tvt-interface-theme";

  const VARIABLE_GROUPS = Object.freeze({
    page: Object.freeze([
      "--color-body-secondary-bg",
      "--color-background-page-platform",
      "--color-background-page-promo",
      "--color-background-page-social"
    ]),
    surface: Object.freeze([
      "--color-header-bg",
      "--color-body-bg",
      "--color-bg-primary",
      "--color-pane-bg",
      "--color-widget-pages-bg",
      "--color-screener-header-bg",
      "--color-background-primary",
      "--color-background-special-primary",
      "--color-legacy-bg-widget",
      "--color-container-fill-tertiary-inverse"
    ]),
    elevated: Object.freeze([
      "--color-bg-secondary",
      "--color-bg-highlight",
      "--color-pane-secondary-bg",
      "--color-popup-background",
      "--color-input-bg",
      "--color-input-publish-bg",
      "--color-background-secondary",
      "--color-background-dark-primary",
      "--color-background-dark-secondary",
      "--color-background-disabled",
      "--color-background-dialog-simple",
      "--color-background-dialog-complicated",
      "--color-background-dialog-promo",
      "--color-background-dialog-fullscreen",
      "--color-container-fill-primary-neutral-extra-light",
      "--color-container-fill-tertiary-neutral-light",
      "--color-button-fill_border-primary-neutral-default",
      "--color-filter-select-fill_border-not-checked-default",
      "--color-filter-select-fill_border-not-checked-hover",
      "--color-filter-select-fill_border-not-checked-isOpened",
      "--color-container-fill-secondary-neutral-thin"
    ]),
    border: Object.freeze([
      "--color-chart-page-bg",
      "--color-background-tertiary",
      "--color-container-fill-primary-neutral-light",
      "--color-divider",
      "--color-divider-hover",
      "--color-divider-secondary",
      "--color-toolbar-divider-background",
      "--color-popup-menu-separator",
      "--color-border",
      "--color-border-chat-fields",
      "--color-border-hover",
      "--color-border-table",
      "--color-widget-border",
      "--color-section-separator-border",
      "--color-separator-table-chat",
      "--color-collapse-tabs-border",
      "--color-card-border",
      "--color-card-border-hover",
      "--color-scroll-border",
      "--color-boost-button-border-default",
      "--color-boost-button-border-hover",
      "--color-stroke-special-primary",
      "--color-border-primary-neutral-semi-bold"
    ]),
    text: Object.freeze([
      "--color-text-primary",
      "--color-text-regular",
      "--color-accent-content",
      "--color-toolbar-button-text",
      "--color-toolbar-button-text-hover",
      "--color-toolbar-interactive-element-text-normal",
      "--color-popup-element-text",
      "--color-popup-element-text-hover",
      "--color-list-item-text",
      "--color-content-icons-primary",
      "--color-content-primary-neutral-semi-bold",
      "--color-container-fill-primary-neutral-extra-bold"
    ]),
    muted: Object.freeze([
      "--color-text-secondary",
      "--color-text-tertiary",
      "--color-icons",
      "--color-popup-element-secondary-text",
      "--color-popup-element-hint-text",
      "--color-popup-element-toolbox-text",
      "--color-underlined-text",
      "--color-list-item",
      "--color-content-icons-secondary",
      "--color-content-icons-tertiary",
      "--color-content-secondary-neutral-semi-bold"
    ]),
    accent: Object.freeze([
      "--color-brand",
      "--color-link",
      "--color-toolbar-button-text-active",
      "--color-toolbar-toggle-button-background-active",
      "--color-popup-element-background-active",
      "--color-item-active-bg",
      "--color-list-item-active-bg",
      "--color-container-fill-primary-accent",
      "--color-focus-outline-color-blue"
    ])
  });

  function buildStyleText(selection, tokens) {
    const declarations = [];
    for (const [token, variables] of Object.entries(VARIABLE_GROUPS)) {
      for (const variable of variables) declarations.push(`  ${variable}: ${tokens[token]};`);
    }

    declarations.push(
      `  --color-bg-primary-hover: color-mix(in srgb, ${tokens.surface} 86%, ${tokens.text});`,
      `  --color-toolbar-button-background-hover: color-mix(in srgb, ${tokens.surface} 86%, ${tokens.text});`,
      `  --color-toolbar-opened-element-bg: color-mix(in srgb, ${tokens.elevated} 86%, ${tokens.text});`,
      `  --color-popup-element-background-hover: color-mix(in srgb, ${tokens.elevated} 86%, ${tokens.text});`,
      `  --color-row-hover-active-bg: color-mix(in srgb, ${tokens.surface} 90%, ${tokens.text});`,
      `  --color-screener-header-bg-hover: color-mix(in srgb, ${tokens.surface} 86%, ${tokens.text});`
    );

    const rootSelector = `html[${MARKER}="${selection}"]`;
    const layoutMenuSelector = `${rootSelector} [data-qa-id="popup-menu-container"]:has([data-qa-id="save-load-menu-item-save"])`;

    return `${rootSelector} {\n${declarations.join("\n")}\n}\n\n${layoutMenuSelector} {\n` +
      `  --ui-lib-in-listItem-backgroundColor: ${tokens.surface};\n` +
      `  --ui-lib-in-listItem-backgroundColorHover: color-mix(in srgb, ${tokens.surface} 86%, ${tokens.text});\n` +
      `  --ui-lib-in-listItem-backgroundColorActive: ${tokens.border};\n` +
      `  --ui-lib-in-listItem-backgroundColorSelected: ${tokens.text};\n` +
      `  --ui-lib-in-listItem-textColorSelected: ${tokens.page};\n` +
      `  --ui-lib-in-listItem-secondaryTextColorSelected: ${tokens.page};\n` +
      `  --ui-lib-in-listItem-dividerColor: ${tokens.border};\n` +
      `}\n`;
  }

  class InterfaceThemeFeature {
    constructor({ document: doc = document, styleManager }) {
      this.document = doc;
      this.styleManager = styleManager;
      this.settingsKey = SETTINGS_KEY;
      this.lastDiagnostic = this.makeDiagnostic("disabled", 0, "Using TradingView's default theme.");
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
      const normalized = root.Settings.normalizeInterfaceTheme(settings);
      const tokens = root.Settings.resolveThemeTokens(normalized);
      if (!tokens) {
        this.disable();
        return;
      }

      const documentElement = this.document.documentElement;
      if (!documentElement) {
        this.styleManager.remove(STYLE_ID);
        this.lastDiagnostic = this.makeDiagnostic("waiting", 0, "Waiting for the TradingView document root.");
        return;
      }

      documentElement.setAttribute(MARKER, normalized.selection);
      this.styleManager.set(STYLE_ID, buildStyleText(normalized.selection, tokens));
      const label = normalized.selection === "custom"
        ? "Custom"
        : root.Settings.THEME_PRESETS[normalized.selection].label;
      this.lastDiagnostic = this.makeDiagnostic("active", 1, `${label} interface theme is active.`);
    }

    disable() {
      this.document.documentElement?.removeAttribute(MARKER);
      this.styleManager.remove(STYLE_ID);
      this.lastDiagnostic = this.makeDiagnostic("disabled", 0, "Using TradingView's default theme.");
    }

    diagnose() {
      return { ...this.lastDiagnostic };
    }
  }

  root.InterfaceThemeFeature = InterfaceThemeFeature;
  root.InterfaceThemeConstants = Object.freeze({
    FEATURE_ID,
    SETTINGS_KEY,
    STYLE_ID,
    MARKER,
    VARIABLE_GROUPS,
    buildStyleText
  });
})();
