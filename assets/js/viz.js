/* ============================================================
   DevLens — viz.js
   Interactive, step-through visualizations for coding problems.
   Vanilla JS, no dependencies, theme-aware (uses CSS tokens).

   Usage on a page:
     <div class="viz" data-viz="minimum-arrows-to-burst-balloons"></div>
     <script src="../../assets/js/viz.js"></script>

   Each registered config has a `type` (renderer) + problem data.
   A renderer turns the data into an ordered list of FRAMES, each
   with { svg, caption }. The engine plays them with Prev/Play/Next/Reset.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- styles (injected once) ---------- */
  function injectStyles() {
    if (document.getElementById("dl-viz-styles")) return;
    var css = `
.dl-viz{border:1px solid var(--border);background:var(--bg-elevated);
  border-radius:var(--radius);margin:1.4rem 0;overflow:hidden}
.dl-viz-head{display:flex;align-items:center;gap:.5rem;padding:.6rem .9rem;
  border-bottom:1px solid var(--border-soft);font:600 .82rem var(--font-sans);
  color:var(--text-muted);letter-spacing:.02em}
.dl-viz-head .dl-dot{width:8px;height:8px;border-radius:50%;background:var(--accent)}
.dl-viz-stage{padding:.6rem .9rem;display:flex;justify-content:center}
.dl-viz-stage svg{width:100%;height:auto;max-width:640px}
.dl-viz-caption{min-height:2.4em;padding:0 .95rem .35rem;
  font:500 .9rem/1.45 var(--font-sans);color:var(--text)}
.dl-viz-caption b,.dl-viz-caption strong{color:var(--accent)}
.dl-viz-controls{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;
  padding:.55rem .9rem .8rem}
.dl-viz-controls button{display:inline-flex;align-items:center;gap:.3rem;
  font:600 .8rem var(--font-sans);color:var(--text);background:var(--surface-2);
  border:1px solid var(--border);border-radius:var(--radius-sm);
  padding:.36rem .62rem;cursor:pointer;transition:background .15s var(--ease),border-color .15s}
.dl-viz-controls button:hover{background:var(--surface-hover);border-color:var(--accent)}
.dl-viz-controls button:disabled{opacity:.4;cursor:default}
.dl-viz-controls .dl-play{background:var(--brand-soft);border-color:var(--accent);color:var(--accent)}
.dl-viz-controls .dl-step{margin-left:auto;font:600 .76rem var(--font-mono);
  color:var(--text-faint)}
.dl-viz svg text{font-family:var(--font-sans)}
.dl-viz-bar{transition:none}
@media (max-width:520px){.dl-viz-controls .dl-step{margin-left:0}}
`;
    var el = document.createElement("style");
    el.id = "dl-viz-styles";
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---------- small SVG helpers ---------- */
  function esc(s) { return String(s); }
  function rect(x, y, w, h, opts) {
    opts = opts || {};
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${opts.r || 4}" `
      + `fill="${opts.fill || "none"}" stroke="${opts.stroke || "none"}" `
      + `stroke-width="${opts.sw || 1}" ${opts.dash ? `stroke-dasharray="${opts.dash}"` : ""} `
      + `${opts.op != null ? `opacity="${opts.op}"` : ""}/>`;
  }
  function line(x1, y1, x2, y2, opts) {
    opts = opts || {};
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${opts.stroke || "var(--border)"}" `
      + `stroke-width="${opts.sw || 1}" ${opts.dash ? `stroke-dasharray="${opts.dash}"` : ""}/>`;
  }
  function text(x, y, s, opts) {
    opts = opts || {};
    return `<text x="${x}" y="${y}" fill="${opts.fill || "var(--text-muted)"}" `
      + `text-anchor="${opts.anchor || "start"}" `
      + `style="font:${opts.weight || 500} ${opts.size || 12}px var(--font-sans)">${esc(s)}</text>`;
  }

  /* ============================================================
     RENDERER 1 — intervals / arrows (Burst Balloons, scheduling)
     ============================================================ */
  function intervalsArrows(cfg) {
    var pts = cfg.data.map(function (p, i) { return { s: p[0], e: p[1], id: i }; });
    var sorted = pts.slice().sort(function (a, b) { return a.e - b.e; });
    var minV = Math.min.apply(null, pts.map(function (p) { return p.s; }));
    var maxV = Math.max.apply(null, pts.map(function (p) { return p.e; }));
    var span = (maxV - minV) || 1;
    var W = 600, padL = 46, padR = 28, rowH = 30, topPad = 30;
    var H = topPad + sorted.length * rowH + 34;
    var axisY = H - 20;
    var X = function (v) { return padL + (v - minV) / span * (W - padL - padR); };

    function frame(status, arrows, caption) {
      var s = "";
      // number line
      s += line(X(minV) - 6, axisY, X(maxV) + 6, axisY, { stroke: "var(--border)", sw: 1.5 });
      s += text(X(minV) - 6, axisY + 15, minV, { size: 11, fill: "var(--text-faint)" });
      s += text(X(maxV) + 6, axisY + 15, maxV, { size: 11, anchor: "end", fill: "var(--text-faint)" });
      // arrows (vertical dashed lines through all rows)
      arrows.forEach(function (a, k) {
        var x = X(a);
        s += line(x, topPad - 6, x, axisY, { stroke: "var(--c-warning)", sw: 2, dash: "4 3" });
        s += `<text x="${x}" y="${topPad - 10}" text-anchor="middle" fill="var(--c-warning)" `
          + `style="font:700 12px var(--font-sans)">🏹${k + 1}</text>`;
      });
      // balloon bars
      sorted.forEach(function (b, i) {
        var y = topPad + i * rowH + 4;
        var x1 = X(b.s), x2 = X(b.e);
        var st = status[i];
        var fill = "var(--surface-2)", stroke = "var(--border)", op = 1, lab = "var(--text-muted)";
        if (st === "current") { fill = "var(--brand-soft)"; stroke = "var(--accent)"; }
        else if (st === "burst") { fill = "var(--c-success-bg)"; stroke = "var(--c-success)"; op = 0.9; lab = "var(--c-success)"; }
        s += rect(x1, y, Math.max(x2 - x1, 3), 18, { fill: fill, stroke: stroke, sw: st === "current" ? 2 : 1.2, r: 5, op: op });
        s += `<text x="${(x1 + x2) / 2}" y="${y + 13}" text-anchor="middle" fill="${lab}" `
          + `style="font:600 11px var(--font-sans)">[${b.s},${b.e}]${st === "burst" ? " ✓" : ""}</text>`;
      });
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Burst balloons visualization">${s}</svg>`, caption: caption };
    }

    var frames = [];
    var status = sorted.map(function () { return "pending"; });
    frames.push(frame(status.slice(), [],
      "Each bar is a balloon <b>[start, end]</b> placed on the number line, <b>sorted by end</b> (smallest end on top). We sweep top to bottom."));
    var arrows = [], lastArrow = null;
    for (var i = 0; i < sorted.length; i++) {
      var b = sorted[i];
      var st = status.slice();
      if (lastArrow === null || b.s > lastArrow) {
        var why = lastArrow === null
          ? "It's the first balloon, so it needs an arrow."
          : `Its start ${b.s} &gt; the last arrow at ${lastArrow}, so no existing arrow reaches it.`;
        arrows.push(b.e); lastArrow = b.e;
        st[i] = "current";
        frames.push(frame(st, arrows.slice(),
          `Balloon <b>[${b.s},${b.e}]</b> isn't covered. ${why} `
          + `Shoot a <b>new arrow</b> at x = <b>${b.e}</b> — its end. Arrows so far: <b>${arrows.length}</b>.`));
      } else {
        st[i] = "current";
        frames.push(frame(st, arrows.slice(),
          `Balloon <b>[${b.s},${b.e}]</b> has start ${b.s} ≤ ${lastArrow}, so the current arrow at x = <b>${lastArrow}</b> already bursts it. <b>No new arrow.</b>`));
      }
      status[i] = "burst";
    }
    frames.push(frame(status.slice(), arrows.slice(),
      `Done — every balloon is burst with <b>${arrows.length} arrows</b>. Sorting by end and shooting at each earliest end is optimal because that arrow covers the most overlapping balloons.`));
    return frames;
  }

  /* ============================================================
     RENDERER 2 — binary search on a sorted array
     ============================================================ */
  function binarySearch(cfg) {
    var a = cfg.data, target = cfg.target;
    var n = a.length, W = 600, pad = 20, gap = 6;
    var cw = (W - pad * 2 - gap * (n - 1)) / n;
    var cw2 = Math.min(cw, 64);
    var totalW = cw2 * n + gap * (n - 1);
    var startX = (W - totalW) / 2;
    var y = 40, h = 46, H = 150;

    function cellX(i) { return startX + i * (cw2 + gap); }

    function frame(lo, hi, mid, found, caption) {
      var s = "";
      s += text(W / 2, 22, "target = " + target, { anchor: "middle", size: 13, weight: 700, fill: "var(--text)" });
      for (var i = 0; i < n; i++) {
        var inWin = i >= lo && i <= hi;
        var fill = "var(--surface-2)", stroke = "var(--border)", op = inWin ? 1 : 0.35, lab = "var(--text-muted)";
        if (found === i) { fill = "var(--c-success-bg)"; stroke = "var(--c-success)"; lab = "var(--c-success)"; }
        else if (mid === i) { fill = "var(--brand-soft)"; stroke = "var(--accent)"; lab = "var(--accent)"; }
        s += rect(cellX(i), y, cw2, h, { fill: fill, stroke: stroke, sw: (mid === i || found === i) ? 2.2 : 1.2, r: 6, op: op });
        s += `<text x="${cellX(i) + cw2 / 2}" y="${y + 29}" text-anchor="middle" fill="${lab}" opacity="${op}" `
          + `style="font:700 15px var(--font-sans)">${a[i]}</text>`;
        s += `<text x="${cellX(i) + cw2 / 2}" y="${y + h + 14}" text-anchor="middle" fill="var(--text-faint)" `
          + `style="font:500 10px var(--font-mono)">${i}</text>`;
      }
      // lo / hi / mid markers
      function marker(idx, label, color) {
        if (idx < 0 || idx >= n) return "";
        var x = cellX(idx) + cw2 / 2;
        return `<text x="${x}" y="${y - 8}" text-anchor="middle" fill="${color}" `
          + `style="font:700 11px var(--font-sans)">${label}</text>`;
      }
      if (found < 0) {
        s += marker(lo, "lo", "var(--text-muted)");
        s += marker(hi, "hi", "var(--text-muted)");
        if (mid >= 0) s += marker(mid, lo === hi ? "lo=hi" : "mid", "var(--accent)");
      }
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Binary search visualization">${s}</svg>`, caption: caption };
    }

    var frames = [];
    var lo = 0, hi = n - 1;
    frames.push(frame(lo, hi, -1, -1,
      `Search the whole sorted array for <b>${target}</b>. The window is <b>[lo, hi]</b>; we repeatedly check the middle.`));
    var guard = 0;
    while (lo <= hi && guard++ < 40) {
      var mid = lo + Math.floor((hi - lo) / 2);
      if (a[mid] === target) {
        frames.push(frame(lo, hi, mid, -1, `Midpoint index ${mid} holds <b>${a[mid]}</b> = target. <b>Found it!</b>`));
        frames.push(frame(lo, hi, -1, mid, `Return index <b>${mid}</b>. Each step halved the window, so this is <b>O(log n)</b>.`));
        return frames;
      } else if (a[mid] < target) {
        frames.push(frame(lo, hi, mid, -1,
          `Midpoint <b>${a[mid]}</b> &lt; ${target}, so the target must be to the <b>right</b>. Discard the left half: <b>lo = ${mid + 1}</b>.`));
        lo = mid + 1;
      } else {
        frames.push(frame(lo, hi, mid, -1,
          `Midpoint <b>${a[mid]}</b> &gt; ${target}, so the target must be to the <b>left</b>. Discard the right half: <b>hi = ${mid - 1}</b>.`));
        hi = mid - 1;
      }
    }
    frames.push(frame(0, -1, -1, -1, `The window is empty — <b>${target}</b> isn't in the array. Return <b>-1</b>.`));
    return frames;
  }

  /* ============================================================
     RENDERER 3 — two-pointer water (Container With Most Water)
     ============================================================ */
  function twoPointerWater(cfg) {
    var a = cfg.data, n = a.length;
    var W = 600, padX = 24, baseY = 150, topY = 24, H = 178;
    var maxH = Math.max.apply(null, a);
    var slot = (W - padX * 2) / n;
    var barW = Math.min(slot * 0.5, 26);
    function colX(i) { return padX + i * slot + slot / 2; }
    function barY(hgt) { return baseY - (hgt / maxH) * (baseY - topY); }

    function frame(left, right, best, bestPair, caption) {
      var s = "";
      // water between left & right
      if (left < right) {
        var wy = barY(Math.min(a[left], a[right]));
        s += rect(colX(left), wy, colX(right) - colX(left), baseY - wy,
          { fill: "var(--brand-soft)", stroke: "none", r: 0 });
      }
      // baseline
      s += line(padX, baseY, W - padX, baseY, { stroke: "var(--border)", sw: 1.5 });
      // bars
      for (var i = 0; i < n; i++) {
        var x = colX(i) - barW / 2;
        var isPtr = i === left || i === right;
        var fill = isPtr ? "var(--accent)" : "var(--surface-hover)";
        var stroke = isPtr ? "var(--accent)" : "var(--border)";
        s += rect(x, barY(a[i]), barW, baseY - barY(a[i]), { fill: fill, stroke: stroke, sw: 1.2, r: 3 });
        s += `<text x="${colX(i)}" y="${baseY + 14}" text-anchor="middle" fill="var(--text-faint)" `
          + `style="font:500 10px var(--font-mono)">${a[i]}</text>`;
      }
      if (left < right) {
        s += `<text x="${colX(left)}" y="${barY(a[left]) - 6}" text-anchor="middle" fill="var(--accent)" style="font:700 11px var(--font-sans)">L</text>`;
        s += `<text x="${colX(right)}" y="${barY(a[right]) - 6}" text-anchor="middle" fill="var(--accent)" style="font:700 11px var(--font-sans)">R</text>`;
      }
      s += text(W - padX, 16, "best area = " + best, { anchor: "end", size: 12, weight: 700, fill: "var(--c-success)" });
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Container with most water visualization">${s}</svg>`, caption: caption };
    }

    var frames = [];
    var left = 0, right = n - 1, best = 0, bestPair = null;
    frames.push(frame(left, right, best, bestPair,
      "Start with the <b>widest</b> container: one pointer at each end. Area is <b>min(L, R) × width</b>."));
    var guard = 0;
    while (left < right && guard++ < 60) {
      var area = Math.min(a[left], a[right]) * (right - left);
      var note = "";
      if (area > best) { best = area; bestPair = [left, right]; note = " — a new <b>best</b>!"; }
      frames.push(frame(left, right, best, bestPair,
        `Area = min(${a[left]}, ${a[right]}) × ${right - left} = <b>${area}</b>${note}. The width can only shrink, so move the <b>shorter</b> wall to hope for a taller one.`));
      if (a[left] < a[right]) left++; else right--;
    }
    frames.push(frame(0, 0, best, bestPair,
      `The pointers met. The maximum area is <b>${best}</b>. Moving the shorter wall each step is safe because a shorter wall caps the area no matter how wide.`));
    return frames;
  }

  /* ---------- renderer registry ---------- */
  var RENDERERS = {
    "intervals-arrows": intervalsArrows,
    "binary-search": binarySearch,
    "two-pointer-water": twoPointerWater
  };

  /* ---------- problem configs (keyed by data-viz) ---------- */
  var CONFIGS = {
    "minimum-arrows-to-burst-balloons": {
      title: "Watch the greedy sweep",
      type: "intervals-arrows",
      data: [[10, 16], [2, 8], [1, 6], [7, 12]]
    },
    "binary-search": {
      title: "Watch the window halve",
      type: "binary-search",
      data: [-1, 0, 3, 5, 9, 12], target: 9
    },
    "container-with-most-water": {
      title: "Watch the two pointers close in",
      type: "two-pointer-water",
      data: [1, 8, 6, 2, 5, 4, 8, 3, 7]
    }
  };

  /* ---------- engine ---------- */
  function mount(container) {
    var key = container.getAttribute("data-viz");
    var cfg = CONFIGS[key];
    if (!cfg) { return; }
    var renderer = RENDERERS[cfg.type];
    if (!renderer) { return; }

    var frames;
    try { frames = renderer(cfg); } catch (e) { return; }
    if (!frames || !frames.length) return;

    var title = container.getAttribute("data-viz-title") || cfg.title || "Visualize it";
    container.classList.add("dl-viz");
    container.innerHTML =
      `<div class="dl-viz-head"><span class="dl-dot"></span>${title}</div>`
      + `<div class="dl-viz-stage"></div>`
      + `<div class="dl-viz-caption"></div>`
      + `<div class="dl-viz-controls">`
      + `<button data-act="reset" aria-label="Reset">⤺ Reset</button>`
      + `<button data-act="prev" aria-label="Previous step">‹ Prev</button>`
      + `<button class="dl-play" data-act="play" aria-label="Play">▶ Play</button>`
      + `<button data-act="next" aria-label="Next step">Next ›</button>`
      + `<span class="dl-step"></span></div>`;

    var stage = container.querySelector(".dl-viz-stage");
    var caption = container.querySelector(".dl-viz-caption");
    var stepLabel = container.querySelector(".dl-step");
    var btn = {};
    container.querySelectorAll("button[data-act]").forEach(function (b) { btn[b.getAttribute("data-act")] = b; });

    var idx = 0, timer = null;

    function draw() {
      stage.innerHTML = frames[idx].svg;
      caption.innerHTML = frames[idx].caption;
      stepLabel.textContent = "Step " + (idx + 1) + " / " + frames.length;
      btn.prev.disabled = idx === 0;
      btn.next.disabled = idx === frames.length - 1;
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      btn.play.innerHTML = "▶ Play";
    }
    function play() {
      if (timer) { stop(); return; }
      if (idx === frames.length - 1) { idx = 0; draw(); }
      btn.play.innerHTML = "⏸ Pause";
      timer = setInterval(function () {
        if (idx >= frames.length - 1) { stop(); return; }
        idx++; draw();
      }, 1400);
    }

    btn.reset.addEventListener("click", function () { stop(); idx = 0; draw(); });
    btn.prev.addEventListener("click", function () { stop(); if (idx > 0) { idx--; draw(); } });
    btn.next.addEventListener("click", function () { stop(); if (idx < frames.length - 1) { idx++; draw(); } });
    btn.play.addEventListener("click", play);

    draw();
  }

  function init() {
    injectStyles();
    document.querySelectorAll(".viz[data-viz]").forEach(mount);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
