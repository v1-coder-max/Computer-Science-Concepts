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

  /* ---------- shared: a horizontal row of value cells ---------- */
  function valueCells(vals, opts) {
    opts = opts || {};
    var n = vals.length, W = opts.W || 600, pad = opts.pad || 18, gap = opts.gap || 6;
    var y = opts.y || 42, h = opts.h || 44;
    var cw = Math.min((W - pad * 2 - gap * (n - 1)) / n, opts.maxCw || 56);
    var total = cw * n + gap * (n - 1);
    var sx = (W - total) / 2;
    return {
      cw: cw, y: y, h: h, x: function (i) { return sx + i * (cw + gap); },
      draw: function (styleFn, showIdx) {
        var s = "";
        for (var i = 0; i < n; i++) {
          var st = styleFn(i) || {};
          var x = sx + i * (cw + gap);
          var op = st.op != null ? st.op : 1;
          s += rect(x, y, cw, h, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: st.sw || 1.2, r: 6, op: op });
          s += `<text x="${x + cw / 2}" y="${y + h / 2 + 5}" text-anchor="middle" fill="${st.lab || "var(--text)"}" opacity="${op}" style="font:700 15px var(--font-sans)">${vals[i]}</text>`;
          if (showIdx) s += `<text x="${x + cw / 2}" y="${y + h + 14}" text-anchor="middle" fill="var(--text-faint)" style="font:500 10px var(--font-mono)">${i}</text>`;
        }
        return s;
      }
    };
  }
  function ptrMark(grid, i, label, color, above) {
    if (i < 0) return "";
    var x = grid.x(i) + grid.cw / 2;
    var y = above ? grid.y - 8 : grid.y + grid.h + 26;
    return `<text x="${x}" y="${y}" text-anchor="middle" fill="${color}" style="font:700 11px var(--font-sans)">${label}</text>`;
  }
  function svgWrap(W, H, inner, label) {
    return { _w: W, _h: H, _i: inner, _l: label };
  }

  /* ============================================================
     RENDERER — array-scan (Two Sum, Contains Duplicate, Best Time, Kadane)
     ============================================================ */
  function arrayScan(cfg) {
    var a = cfg.data, mode = cfg.mode, W = 600, H = 150;
    var grid = valueCells(a, { W: W, y: 40, h: 44 });
    function frame(curr, marks, caption, panel) {
      var inner = grid.draw(function (i) {
        if (marks && marks[i]) return marks[i];
        if (i === curr) return { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" };
        if (i < curr) return { op: 0.5 };
        return {};
      }, true);
      inner += ptrMark(grid, curr, "i", "var(--accent)", true);
      if (panel) inner += `<text x="${W / 2}" y="${H - 8}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${panel}</text>`;
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="array scan">${inner}</svg>`, caption: caption };
    }
    var frames = [];
    if (mode === "two-sum") {
      var seen = {}, target = cfg.target;
      frames.push(frame(-1, null, `Find two numbers that sum to <b>${target}</b>. Scan once, remembering each value in a hash map so we can look up its complement in O(1).`, "seen = { }"));
      for (var i = 0; i < a.length; i++) {
        var comp = target - a[i];
        if (seen[comp] !== undefined) {
          var marks = {}; marks[i] = { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" };
          marks[seen[comp]] = { fill: "var(--c-success-bg)", stroke: "var(--c-success)", sw: 2.2, lab: "var(--c-success)" };
          frames.push(frame(i, marks, `Need complement <b>${comp}</b> — it's in the map at index <b>${seen[comp]}</b>! Answer = <b>[${seen[comp]}, ${i}]</b>.`, panelMap(seen)));
          return frames;
        }
        frames.push(frame(i, null, `At index ${i}, value <b>${a[i]}</b>. Complement = ${target} − ${a[i]} = <b>${comp}</b>, not in the map yet — store <b>${a[i]} → ${i}</b> and move on.`, panelMap(seen)));
        seen[a[i]] = i;
      }
    } else if (mode === "contains-duplicate") {
      var set = {};
      frames.push(frame(-1, null, "Scan once, adding each value to a hash set. A value already in the set is a duplicate.", "set = { }"));
      for (var j = 0; j < a.length; j++) {
        if (set[a[j]]) {
          var m = {}; m[j] = { fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", sw: 2.2, lab: "var(--c-warning)" };
          frames.push(frame(j, m, `<b>${a[j]}</b> is already in the set → <b>duplicate found</b>, return true.`, panelSet(set)));
          return frames;
        }
        frames.push(frame(j, null, `<b>${a[j]}</b> is new — add it to the set.`, panelSet(set)));
        set[a[j]] = true;
      }
      frames.push(frame(-1, null, "Reached the end with no repeats → return false.", panelSet(set)));
    } else if (mode === "best-time-stock") {
      var minP = Infinity, best = 0, minIdx = -1;
      frames.push(frame(-1, null, "Track the <b>lowest price so far</b> (best day to have bought) and the <b>best profit</b> if we sold today.", "minPrice = ∞ · maxProfit = 0"));
      for (var k = 0; k < a.length; k++) {
        if (a[k] < minP) {
          minP = a[k]; minIdx = k;
          frames.push(frame(k, mark(k, "var(--c-info-bg)", "var(--accent)"), `Price <b>${a[k]}</b> is a new low — the best day to buy is now index ${k}.`, `minPrice = ${minP} · maxProfit = ${best}`));
        } else {
          var profit = a[k] - minP;
          if (profit > best) { best = profit; frames.push(frame(k, null, `Sell at <b>${a[k]}</b>: profit = ${a[k]} − ${minP} = <b>${profit}</b> — a new best!`, `minPrice = ${minP} · maxProfit = ${best}`)); }
          else frames.push(frame(k, null, `Sell at ${a[k]}: profit = ${profit} ≤ current best ${best}. Keep scanning.`, `minPrice = ${minP} · maxProfit = ${best}`));
        }
      }
      frames.push(frame(-1, null, `Best profit found is <b>${best}</b> — one pass, buy low then sell high.`, `maxProfit = ${best}`));
    } else if (mode === "kadane") {
      var cur = a[0], bestK = a[0];
      frames.push(frame(0, mark(0, "var(--brand-soft)", "var(--accent)"), `Kadane's: at each element, either <b>extend</b> the running subarray or <b>restart</b> at this element — whichever is bigger.`, `cur = ${cur} · best = ${bestK}`));
      for (var p = 1; p < a.length; p++) {
        var ext = cur + a[p];
        cur = Math.max(a[p], ext);
        var restart = cur === a[p] && a[p] > ext;
        bestK = Math.max(bestK, cur);
        frames.push(frame(p, null, `cur = max(${a[p]}, ${cur === a[p] ? ext : ext}) = <b>${cur}</b> ${restart ? "(restart here)" : "(extend)"}; best = <b>${bestK}</b>.`, `cur = ${cur} · best = ${bestK}`));
      }
      frames.push(frame(-1, null, `Largest subarray sum is <b>${bestK}</b>. The running sum resets whenever it would drag the total down.`, `best = ${bestK}`));
    }
    function mark(i, fill, stroke) { var m = {}; m[i] = { fill: fill, stroke: stroke, sw: 2.2, lab: "var(--accent)" }; return m; }
    function panelMap(o) { var e = Object.keys(o).map(function (k) { return k + "→" + o[k]; }); return "seen = { " + e.join(", ") + " }"; }
    function panelSet(o) { return "set = { " + Object.keys(o).join(", ") + " }"; }
    return frames;
  }

  /* ============================================================
     RENDERER — two-pointer over an array (Valid Palindrome, Two Sum II)
     ============================================================ */
  function twoPointer(cfg) {
    var a = cfg.data, mode = cfg.mode, W = 600, H = 150;
    var grid = valueCells(a, { W: W, y: 44, h: 44 });
    function frame(left, right, style, caption, panel) {
      var inner = grid.draw(function (i) {
        if (style && style[i]) return style[i];
        if (i < left || i > right) return { op: 0.32 };
        return {};
      }, true);
      inner += ptrMark(grid, left, "L", "var(--accent)", true);
      inner += ptrMark(grid, right, "R", "var(--accent)", true);
      if (panel) inner += `<text x="${W / 2}" y="${H - 8}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${panel}</text>`;
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="two pointers">${inner}</svg>`, caption: caption };
    }
    var frames = [], left = 0, right = a.length - 1;
    if (mode === "palindrome") {
      frames.push(frame(left, right, null, "Compare characters from both ends moving inward. If every pair matches, it's a palindrome."));
      while (left < right) {
        var st = {}; st[left] = hl("var(--accent)"); st[right] = hl("var(--accent)");
        if (a[left] !== a[right]) {
          st[left] = hl("var(--c-warning)"); st[right] = hl("var(--c-warning)");
          frames.push(frame(left, right, st, `'<b>${a[left]}</b>' ≠ '<b>${a[right]}</b>' → <b>not a palindrome</b>.`));
          return frames;
        }
        frames.push(frame(left, right, st, `'<b>${a[left]}</b>' = '<b>${a[right]}</b>' ✓ — move both pointers inward.`));
        left++; right--;
      }
      frames.push(frame(left, right, null, "The pointers crossed with every pair matching → <b>it's a palindrome</b>."));
    } else if (mode === "two-sum-sorted") {
      var target = cfg.target;
      frames.push(frame(left, right, null, `Sorted array — find two values summing to <b>${target}</b>. Sum too big → move R left; too small → move L right.`, `target = ${target}`));
      while (left < right) {
        var sum = a[left] + a[right];
        var s2 = {}; s2[left] = hl("var(--accent)"); s2[right] = hl("var(--accent)");
        if (sum === target) {
          s2[left] = hl("var(--c-success)"); s2[right] = hl("var(--c-success)");
          frames.push(frame(left, right, s2, `${a[left]} + ${a[right]} = <b>${target}</b> ✓ — answer = indices [${left}, ${right}].`, `sum = ${sum}`));
          return frames;
        }
        var dir = sum < target ? "too small → L moves right" : "too big → R moves left";
        frames.push(frame(left, right, s2, `${a[left]} + ${a[right]} = <b>${sum}</b> — ${dir}.`, `sum = ${sum}, target = ${target}`));
        if (sum < target) left++; else right--;
      }
    }
    function hl(c) { return { fill: c === "var(--c-success)" ? "var(--c-success-bg)" : c === "var(--c-warning)" ? "var(--c-warning-bg)" : "var(--brand-soft)", stroke: c, sw: 2.2, lab: c }; }
    return frames;
  }

  /* ============================================================
     RENDERER — sliding window (Longest Substring Without Repeating)
     ============================================================ */
  function slidingWindow(cfg) {
    var a = cfg.data, W = 600, H = 156;
    var grid = valueCells(a, { W: W, y: 46, h: 44 });
    function frame(left, right, inSet, best, caption, status) {
      var inner = grid.draw(function (i) {
        if (i >= left && i <= right) {
          if (i === right) return { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" };
          return { fill: "var(--c-info-bg)", stroke: "var(--accent)" };
        }
        return { op: 0.32 };
      }, true);
      inner += ptrMark(grid, left, "L", "var(--accent)", true);
      inner += ptrMark(grid, right, "R", "var(--accent)", true);
      inner += `<text x="${W / 2}" y="${H - 8}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">window = "${a.slice(left, right + 1).join("")}" · longest = ${best}</text>`;
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="sliding window">${inner}</svg>`, caption: caption };
    }
    var frames = [], left = 0, best = 0, set = {};
    frames.push(frame(0, -1, set, 0, "Grow a window on the right; if a character repeats, shrink from the left until it's unique again. Track the longest window."));
    for (var right = 0; right < a.length; right++) {
      while (set[a[right]]) {
        delete set[a[left]];
        frames.push(frame(left + 1, right, set, best, `'<b>${a[right]}</b>' is already in the window → drop '<b>${a[left]}</b>' from the left to remove the repeat.`));
        left++;
      }
      set[a[right]] = true;
      best = Math.max(best, right - left + 1);
      frames.push(frame(left, right, set, best, `Add '<b>${a[right]}</b>'. Window is now unique, length <b>${right - left + 1}</b> — longest so far is <b>${best}</b>.`));
    }
    frames.push(frame(left, a.length - 1, set, best, `The longest substring without repeating characters has length <b>${best}</b>.`));
    return frames;
  }

  /* ============================================================
     RENDERER — stack (Valid Parentheses)
     ============================================================ */
  function stackViz(cfg) {
    var s = cfg.data, W = 600, H = 200;
    var pairs = { ")": "(", "]": "[", "}": "{" };
    var grid = valueCells(s.split(""), { W: W, y: 26, h: 36, maxCw: 40 });
    function frame(curr, stack, caption, bad) {
      var inner = grid.draw(function (i) {
        if (i === curr) return { fill: bad ? "var(--c-warning-bg)" : "var(--brand-soft)", stroke: bad ? "var(--c-warning)" : "var(--accent)", sw: 2.2, lab: bad ? "var(--c-warning)" : "var(--accent)" };
        if (i < curr) return { op: 0.5 };
        return {};
      }, false);
      // stack column
      var bx = W / 2 - 26, bw = 52, bh = 26, baseY = H - 18;
      inner += `<text x="${bx + bw / 2}" y="${grid.y + grid.h + 26}" text-anchor="middle" fill="var(--text-faint)" style="font:600 11px var(--font-sans)">stack</text>`;
      for (var k = 0; k < stack.length; k++) {
        var yy = baseY - (k + 1) * (bh + 4);
        inner += rect(bx, yy, bw, bh, { fill: "var(--surface-2)", stroke: "var(--accent)", sw: 1.4, r: 5 });
        inner += `<text x="${bx + bw / 2}" y="${yy + bh / 2 + 5}" text-anchor="middle" fill="var(--text)" style="font:700 14px var(--font-sans)">${stack[k]}</text>`;
      }
      inner += line(bx - 4, baseY, bx + bw + 4, baseY, { stroke: "var(--border)", sw: 1.5 });
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="stack">${inner}</svg>`, caption: caption };
    }
    var frames = [], stack = [];
    frames.push(frame(-1, [], "Push every opening bracket. On a closing bracket, the stack top must be its matching opener — pop it. Stack empty at the end ⇒ valid."));
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (pairs[c]) {
        if (stack.length === 0 || stack[stack.length - 1] !== pairs[c]) {
          frames.push(frame(i, stack.slice(), `Closing '<b>${c}</b>' but the top is ${stack.length ? "'" + stack[stack.length - 1] + "'" : "empty"} — mismatch → <b>invalid</b>.`, true));
          return frames;
        }
        stack.pop();
        frames.push(frame(i, stack.slice(), `Closing '<b>${c}</b>' matches the top opener — <b>pop</b> it.`));
      } else {
        stack.push(c);
        frames.push(frame(i, stack.slice(), `Opening '<b>${c}</b>' — <b>push</b> onto the stack.`));
      }
    }
    frames.push(frame(-1, stack.slice(), stack.length === 0 ? "Stack is empty at the end → <b>valid</b>." : "Brackets left on the stack → <b>invalid</b>.", stack.length !== 0));
    return frames;
  }

  /* ============================================================
     RENDERER — linked-list reversal (Reverse Linked List)
     ============================================================ */
  function linkedReverse(cfg) {
    var vals = cfg.data, n = vals.length, W = 600, H = 150;
    var nw = 46, gap = (W - 40 - nw * n) / (n - 1 > 0 ? n - 1 : 1);
    gap = Math.min(gap, 48);
    var total = nw * n + gap * (n - 1), sx = (W - total) / 2, y = 56, h = 40;
    function nx(i) { return sx + i * (nw + gap); }
    function arrow(x1, x2, yy, color) {
      var dir = x2 > x1 ? 1 : -1;
      return line(x1, yy, x2, yy, { stroke: color, sw: 1.8 })
        + `<path d="M${x2} ${yy} l${-7 * dir} -4 l0 8 z" fill="${color}"/>`;
    }
    function frame(k, caption) {
      // nodes 0..k-1 reversed (point left), k..n-1 forward
      var inner = "";
      for (var i = 0; i < n; i++) {
        var isCurr = i === k, isPrev = i === k - 1;
        var stroke = isCurr ? "var(--accent)" : isPrev ? "var(--c-success)" : "var(--border)";
        inner += rect(nx(i), y, nw, h, { fill: i < k ? "var(--c-success-bg)" : "var(--surface-2)", stroke: stroke, sw: isCurr || isPrev ? 2.2 : 1.2, r: 7 });
        inner += `<text x="${nx(i) + nw / 2}" y="${y + h / 2 + 5}" text-anchor="middle" fill="var(--text)" style="font:700 15px var(--font-sans)">${vals[i]}</text>`;
      }
      // arrows
      for (var j = 0; j < n; j++) {
        if (j < k) { if (j > 0) inner += arrow(nx(j) - 6, nx(j - 1) + nw + 6, y + h / 2, "var(--c-success)"); }
        else if (j < n - 1) inner += arrow(nx(j) + nw + 6, nx(j + 1) - 6, y + h / 2, "var(--border)");
      }
      // labels
      function lbl(i, t, c) { if (i < 0 || i >= n) { if (i === -1) return `<text x="${sx - 16}" y="${y - 12}" fill="${c}" style="font:700 11px var(--font-sans)">${t}=∅</text>`; return ""; } return `<text x="${nx(i) + nw / 2}" y="${y - 12}" text-anchor="middle" fill="${c}" style="font:700 11px var(--font-sans)">${t}</text>`; }
      inner += lbl(k - 1, "prev", "var(--c-success)");
      inner += lbl(k, "curr", "var(--accent)");
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="reverse linked list">${inner}</svg>`, caption: caption };
    }
    var frames = [];
    frames.push(frame(0, "Reverse the list by walking it with two pointers: <b>prev</b> (starts empty) and <b>curr</b>. Each step flips one arrow to point backward."));
    for (var k = 0; k < n; k++) {
      frames.push(frame(k + 1, `Point <b>${vals[k]}</b>'s arrow back to <b>prev</b> (${k === 0 ? "∅" : vals[k - 1]}), then advance prev and curr. Node <b>${vals[k]}</b> now points left.`));
    }
    frames.push(frame(n, `<b>curr</b> fell off the end. <b>prev</b> (node ${vals[n - 1]}) is the new head — the list is fully reversed.`));
    return frames;
  }

  /* ============================================================
     RENDERER — 1-D DP table fill (Climbing Stairs)
     ============================================================ */
  function dp1d(cfg) {
    var n = cfg.n, W = 600, H = 150;
    var vals = []; for (var t = 0; t <= n; t++) vals.push("");
    var grid = valueCells(vals.map(function (_, i) { return i; }), { W: W, y: 70, h: 38, maxCw: 50 });
    function frame(dp, filled, contrib, caption) {
      var labels = dp.map(function (v) { return v === null ? "?" : v; });
      var inner = "";
      for (var i = 0; i <= n; i++) {
        var st = {};
        var x = grid.x(i);
        var isF = i === filled, isC = contrib && contrib.indexOf(i) >= 0;
        inner += rect(x, grid.y, grid.cw, grid.h, { fill: isF ? "var(--brand-soft)" : isC ? "var(--c-info-bg)" : dp[i] !== null ? "var(--c-success-bg)" : "var(--surface-2)", stroke: isF ? "var(--accent)" : isC ? "var(--accent)" : dp[i] !== null ? "var(--c-success)" : "var(--border)", sw: isF ? 2.2 : 1.2, r: 6 });
        inner += `<text x="${x + grid.cw / 2}" y="${grid.y + grid.h / 2 + 5}" text-anchor="middle" fill="var(--text)" style="font:700 15px var(--font-sans)">${labels[i]}</text>`;
        inner += `<text x="${x + grid.cw / 2}" y="${grid.y - 10}" text-anchor="middle" fill="var(--text-faint)" style="font:500 10px var(--font-mono)">dp[${i}]</text>`;
      }
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="dp table">${inner}</svg>`, caption: caption };
    }
    var frames = [], dp = []; for (var i = 0; i <= n; i++) dp.push(null);
    dp[0] = 1; dp[1] = 1;
    frames.push(frame(dp.slice(), 1, null, "To reach step i you came from step i−1 (one step) or i−2 (two steps), so <b>dp[i] = dp[i−1] + dp[i−2]</b>. Base: dp[0]=dp[1]=1."));
    for (var s = 2; s <= n; s++) {
      dp[s] = dp[s - 1] + dp[s - 2];
      frames.push(frame(dp.slice(), s, [s - 1, s - 2], `dp[${s}] = dp[${s - 1}] + dp[${s - 2}] = ${dp[s - 1]} + ${dp[s - 2]} = <b>${dp[s]}</b>.`));
    }
    frames.push(frame(dp.slice(), -1, null, `There are <b>${dp[n]}</b> distinct ways to climb ${n} stairs — it's the Fibonacci sequence.`));
    return frames;
  }

  /* ---------- renderer registry ---------- */
  var RENDERERS = {
    "intervals-arrows": intervalsArrows,
    "binary-search": binarySearch,
    "two-pointer-water": twoPointerWater,
    "array-scan": arrayScan,
    "two-pointer": twoPointer,
    "sliding-window": slidingWindow,
    "stack": stackViz,
    "linked-reverse": linkedReverse,
    "dp-1d": dp1d
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
    },
    "two-sum": {
      title: "Watch the hash map find the complement",
      type: "array-scan", mode: "two-sum", data: [2, 7, 11, 15], target: 9
    },
    "contains-duplicate": {
      title: "Watch the set catch the repeat",
      type: "array-scan", mode: "contains-duplicate", data: [1, 2, 3, 1]
    },
    "best-time-to-buy-sell-stock": {
      title: "Watch buy-low, sell-high in one pass",
      type: "array-scan", mode: "best-time-stock", data: [7, 1, 5, 3, 6, 4]
    },
    "maximum-subarray": {
      title: "Watch Kadane extend or restart",
      type: "array-scan", mode: "kadane", data: [-2, 1, -3, 4, -1, 2, 1, -5, 4]
    },
    "valid-palindrome": {
      title: "Watch the two pointers meet",
      type: "two-pointer", mode: "palindrome", data: "racecar".split("")
    },
    "two-sum-ii": {
      title: "Watch the pointers chase the target",
      type: "two-pointer", mode: "two-sum-sorted", data: [2, 7, 11, 15], target: 18
    },
    "longest-substring-without-repeating": {
      title: "Watch the window grow and shrink",
      type: "sliding-window", data: "abcabcbb".split("")
    },
    "valid-parentheses": {
      title: "Watch the stack match brackets",
      type: "stack", data: "([{}])"
    },
    "reverse-linked-list": {
      title: "Watch the arrows flip backward",
      type: "linked-reverse", data: [1, 2, 3, 4]
    },
    "climbing-stairs": {
      title: "Watch the DP table fill",
      type: "dp-1d", n: 6
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
