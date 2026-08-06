(() => {
  "use strict";

  class StyleManager {
    constructor(doc = document) {
      this.document = doc;
    }

    set(id, cssText) {
      let style = this.document.getElementById(id);
      if (!style) {
        style = this.document.createElement("style");
        style.id = id;
        style.dataset.tvCustomizer = "true";
        (this.document.head || this.document.documentElement).append(style);
      }
      if (style.textContent !== cssText) style.textContent = cssText;
      return style;
    }

    remove(id) {
      this.document.getElementById(id)?.remove();
    }
  }

  globalThis.TVCustomizer.StyleManager = StyleManager;
})();
