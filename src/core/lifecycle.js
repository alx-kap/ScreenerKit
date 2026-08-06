(() => {
  "use strict";

  class LifecycleController {
    constructor({ document: doc = document, window: win = window, features = [] }) {
      this.document = doc;
      this.window = win;
      this.features = features;
      this.settings = null;
      this.frame = null;
      this.started = false;
      this.observer = new MutationObserver(() => this.schedule());
      this.onPageSignal = () => this.schedule();
    }

    start(settings) {
      this.settings = settings;
      if (!this.started) {
        this.started = true;
        this.observer.observe(this.document.documentElement, {
          childList: true,
          subtree: true
        });
        this.window.addEventListener("pageshow", this.onPageSignal);
        this.window.addEventListener("popstate", this.onPageSignal);
        this.window.addEventListener("hashchange", this.onPageSignal);
        this.document.addEventListener("visibilitychange", this.onPageSignal);
      }
      this.run();
    }

    setSettings(settings) {
      this.settings = settings;
      this.run();
    }

    schedule() {
      if (this.frame !== null) return;
      this.frame = this.window.requestAnimationFrame(() => {
        this.frame = null;
        this.run();
      });
    }

    run() {
      if (!this.settings?.enabled) {
        for (const feature of this.features) feature.disable();
        return;
      }

      for (const feature of this.features) {
        const featureSettings = this.settings.features?.[feature.settingsKey];
        feature.update(featureSettings);
      }
    }

    diagnostics() {
      const result = {
        enabled: this.settings?.enabled === true,
        diagnosticsEnabled: this.settings?.diagnostics === true,
        features: this.features.map(feature => feature.diagnose())
      };

      if (result.diagnosticsEnabled) {
        result.context = {
          origin: this.window.location.origin,
          path: this.window.location.pathname,
          documentType: this.document.contentType,
          visibility: this.document.visibilityState
        };
      }

      return result;
    }

    stop() {
      if (this.frame !== null) this.window.cancelAnimationFrame(this.frame);
      this.frame = null;
      this.observer.disconnect();
      this.window.removeEventListener("pageshow", this.onPageSignal);
      this.window.removeEventListener("popstate", this.onPageSignal);
      this.window.removeEventListener("hashchange", this.onPageSignal);
      this.document.removeEventListener("visibilitychange", this.onPageSignal);
      for (const feature of this.features) feature.disable();
      this.started = false;
    }
  }

  globalThis.TVCustomizer.LifecycleController = LifecycleController;
})();
