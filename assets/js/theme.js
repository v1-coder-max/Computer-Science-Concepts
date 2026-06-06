/* ============================================================
   DevLens — theme.js
   Dark/light mode toggle, persisted in localStorage.
   The initial theme is applied by a tiny inline <head> script
   (see pages) to avoid a flash of the wrong theme (FOUC).
   This file wires up the toggle button + system-preference sync.
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "devlens-theme";
  var root = document.documentElement;

  function stored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function systemPrefersLight() {
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches;
  }

  function current() {
    return root.getAttribute("data-theme") ||
      (systemPrefersLight() ? "light" : "dark");
  }

  function apply(theme, persist) {
    root.setAttribute("data-theme", theme);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    }
    syncButtons(theme);
  }

  function syncButtons(theme) {
    var isDark = theme === "dark";
    var icon = isDark ? "🌙" : "☀️";
    var label = isDark ? "Switch to light mode" : "Switch to dark mode";
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.textContent = icon;
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
    });
  }

  function toggle() {
    apply(current() === "dark" ? "light" : "dark", true);
  }

  // Expose for other scripts / inline handlers.
  window.DevLensTheme = { toggle: toggle, apply: apply, current: current };

  function init() {
    // Ensure an explicit attribute is present so toggling is deterministic.
    if (!root.getAttribute("data-theme")) {
      apply(stored() || (systemPrefersLight() ? "light" : "dark"), false);
    } else {
      syncButtons(current());
    }

    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", toggle);
    });

    // Follow OS changes only while the user hasn't set an explicit choice.
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: light)");
      var listener = function (e) {
        if (!stored()) apply(e.matches ? "light" : "dark", false);
      };
      if (mq.addEventListener) mq.addEventListener("change", listener);
      else if (mq.addListener) mq.addListener(listener);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
