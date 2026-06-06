/* ============================================================
   DevLens — search.js
   Client-side fuzzy search powered by Fuse.js (loaded via CDN).
   • Source of truth: /data/search-index.json
   • Ctrl/Cmd + K  → open   •  Esc → close  •  ↑/↓ → navigate  •  ↵ → go
   • Injects the search modal markup once, so every page only needs
     a trigger element with [data-search-open].
   ============================================================ */
(function () {
  "use strict";

  /* Root detection (same technique as nav.js). */
  var ROOT = (function () {
    var s = document.currentScript;
    var src = (s && s.src) || "";
    var i = src.indexOf("assets/js/");
    return i >= 0 ? src.slice(0, i) : "";
  })();

  var fuse = null;          // built lazily once data + Fuse.js are ready
  var docs = [];
  var loadPromise = null;
  var activeIndex = -1;
  var modal, input, resultsBox;

  /* ---- Modal markup (injected once) ----------------------------------- */
  function ensureModal() {
    if (document.getElementById("searchModal")) {
      modal = document.getElementById("searchModal");
      input = modal.querySelector("input");
      resultsBox = modal.querySelector(".search-results");
      return;
    }
    modal = document.createElement("div");
    modal.className = "search-modal";
    modal.id = "searchModal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Search concepts");
    modal.innerHTML =
      '<div class="search-panel">' +
        '<div class="search-box">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
          '<input type="text" placeholder="Search concepts, patterns, problems…" ' +
            'autocomplete="off" spellcheck="false" aria-label="Search" />' +
          '<span class="kbd">Esc</span>' +
        '</div>' +
        '<div class="search-results" role="listbox"></div>' +
        '<div class="search-foot">' +
          '<span><span class="kbd">↑</span><span class="kbd">↓</span> navigate</span>' +
          '<span><span class="kbd">↵</span> open</span>' +
          '<span><span class="kbd">Esc</span> close</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    input = modal.querySelector("input");
    resultsBox = modal.querySelector(".search-results");

    modal.addEventListener("click", function (e) {
      if (e.target === modal) close();
    });
    input.addEventListener("input", function () { runSearch(input.value); });
    input.addEventListener("keydown", onKeyNav);
  }

  /* ---- Data + Fuse loading -------------------------------------------- */
  function loadData() {
    if (loadPromise) return loadPromise;
    loadPromise = fetch(ROOT + "data/search-index.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (data) {
        docs = Array.isArray(data) ? data : (data.concepts || []);
        buildFuse();
        return docs;
      })
      .catch(function () { docs = []; return docs; });
    return loadPromise;
  }

  function buildFuse() {
    if (typeof window.Fuse === "undefined" || !docs.length) return;
    fuse = new window.Fuse(docs, {
      includeScore: true,
      includeMatches: true,
      threshold: 0.38,
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: [
        { name: "title", weight: 0.5 },
        { name: "tags", weight: 0.25 },
        { name: "category", weight: 0.12 },
        { name: "description", weight: 0.13 }
      ]
    });
  }

  /* ---- Rendering ------------------------------------------------------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function resolveUrl(doc) {
    if (!doc.url) return "#";
    if (/^https?:/.test(doc.url)) return doc.url;
    return ROOT + doc.url.replace(/^\//, "");
  }

  function render(items, query) {
    activeIndex = items.length ? 0 : -1;
    if (!query) {
      resultsBox.innerHTML =
        '<div class="search-empty">Type to search ' +
        '<b>' + docs.length + '</b> concept' + (docs.length === 1 ? "" : "s") +
        '.</div>';
      return;
    }
    if (!items.length) {
      resultsBox.innerHTML =
        '<div class="search-empty">No matches for “' + escapeHtml(query) + '”.</div>';
      return;
    }
    resultsBox.innerHTML = items.map(function (it, idx) {
      var d = it.item || it;
      return '<a class="result' + (idx === 0 ? " active" : "") + '" role="option" ' +
        'href="' + resolveUrl(d) + '" data-idx="' + idx + '">' +
          '<span class="r-top">' +
            '<span class="r-title">' + escapeHtml(d.title || "Untitled") + '</span>' +
            (d.category ? '<span class="r-cat">' + escapeHtml(prettyCat(d.category)) + '</span>' : "") +
          '</span>' +
          (d.description ? '<span class="r-desc">' + escapeHtml(d.description) + '</span>' : "") +
        '</a>';
    }).join("");

    Array.prototype.forEach.call(resultsBox.querySelectorAll(".result"), function (a) {
      a.addEventListener("mousemove", function () {
        setActive(parseInt(a.getAttribute("data-idx"), 10));
      });
    });
  }

  function prettyCat(slug) {
    var map = {
      "dotnet": ".NET", "csharp": "C#", "database": "Database", "oop": "OOP",
      "microservices": "Microservices", "system-design": "System Design",
      "coding-problems": "Coding", "web-fundamentals": "Web"
    };
    return map[slug] || slug;
  }

  function runSearch(query) {
    query = (query || "").trim();
    if (!fuse) { buildFuse(); }
    if (!query) { render([], ""); return; }
    var results = fuse ? fuse.search(query, { limit: 12 }) : [];
    render(results, query);
  }

  /* ---- Keyboard navigation -------------------------------------------- */
  function rows() { return resultsBox.querySelectorAll(".result"); }
  function setActive(idx) {
    var r = rows();
    if (!r.length) return;
    activeIndex = Math.max(0, Math.min(idx, r.length - 1));
    r.forEach(function (a, i) { a.classList.toggle("active", i === activeIndex); });
    r[activeIndex].scrollIntoView({ block: "nearest" });
  }
  function onKeyNav(e) {
    var r = rows();
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(activeIndex + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(activeIndex - 1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (r[activeIndex]) window.location.href = r[activeIndex].getAttribute("href");
    } else if (e.key === "Escape") { close(); }
  }

  /* ---- Open / close ---------------------------------------------------- */
  function open() {
    ensureModal();
    loadData().then(function () { runSearch(input.value); });
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(function () { input.focus(); input.select(); }, 20);
    if (!input.value) render([], "");
  }
  function close() {
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
  function isOpen() { return modal && modal.classList.contains("open"); }

  /* ---- Global wiring --------------------------------------------------- */
  function init() {
    // Preload so the first keystroke is instant.
    ensureModal();
    loadData();

    document.querySelectorAll("[data-search-open]").forEach(function (btn) {
      btn.addEventListener("click", open);
    });

    document.addEventListener("keydown", function (e) {
      var k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "k") {
        e.preventDefault();
        isOpen() ? close() : open();
      } else if (k === "/" && !isOpen() && !/^(input|textarea|select)$/i.test(
        (document.activeElement && document.activeElement.tagName) || "")) {
        e.preventDefault();
        open();
      }
    });
  }

  window.DevLensSearch = { open: open, close: close, reload: function () {
    loadPromise = null; fuse = null; return loadData();
  } };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
