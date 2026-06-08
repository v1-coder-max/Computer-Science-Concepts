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
    } else if (mode === "max-product") {
      var cMax = a[0], cMin = a[0], bp = a[0];
      frames.push(frame(0, mark(0, "var(--brand-soft)", "var(--accent)"), "Track BOTH the running max and min product — a negative number flips them. Candidates: n, cMax·n, cMin·n.", `max=${cMax} min=${cMin} best=${bp}`));
      for (var i = 1; i < a.length; i++) { var x = a[i], c1 = cMax * x, c2 = cMin * x; cMax = Math.max(x, c1, c2); cMin = Math.min(x, c1, c2); bp = Math.max(bp, cMax); frames.push(frame(i, null, `At <b>${x}</b>: max=${cMax}, min=${cMin} (a negative swaps them) → best = <b>${bp}</b>.`, `max=${cMax} min=${cMin} best=${bp}`)); }
      frames.push(frame(-1, null, `Largest product subarray = <b>${bp}</b>.`, `best=${bp}`));
    } else if (mode === "majority") {
      var cand = null, cnt = 0;
      frames.push(frame(-1, null, "Boyer–Moore voting: keep a candidate and a count. A match votes +1, a difference −1; when the count hits 0, adopt the current value.", "candidate = — · count = 0"));
      for (var j = 0; j < a.length; j++) { if (cnt === 0) { cand = a[j]; cnt = 1; frames.push(frame(j, mark(j, "var(--brand-soft)", "var(--accent)"), `Count was 0 → adopt <b>${a[j]}</b> as the candidate.`, `candidate = ${cand} · count = 1`)); } else { cnt += a[j] === cand ? 1 : -1; frames.push(frame(j, null, `<b>${a[j]}</b> ${a[j] === cand ? "matches → +1" : "differs → −1"}. Count = ${cnt}.`, `candidate = ${cand} · count = ${cnt}`)); } }
      frames.push(frame(-1, null, `The majority element is <b>${cand}</b> — it outlasts every cancellation.`, `candidate = ${cand}`));
    } else if (mode === "pivot") {
      var total = a.reduce(function (s, v) { return s + v; }, 0), leftSum = 0, ans = -1;
      frames.push(frame(-1, null, "Find the index where the left sum equals the right sum. With the total known, right = total − leftSum − nums[i].", `total = ${total}`));
      for (var k = 0; k < a.length; k++) { var right = total - leftSum - a[k]; if (leftSum === right) { ans = k; frames.push(frame(k, mark(k, "var(--c-success-bg)", "var(--c-success)"), `left ${leftSum} == right ${right} → <b>pivot at index ${k}</b>.`, `left=${leftSum} right=${right}`)); break; } frames.push(frame(k, null, `At ${k}: left=${leftSum}, right=${right} — not balanced.`, `left=${leftSum} right=${right}`)); leftSum += a[k]; }
      if (ans < 0) frames.push(frame(-1, null, "No index balances the two sides → <b>-1</b>.", `total=${total}`));
    } else if (mode === "subarray-sum") {
      var kk = cfg.k, prefix = 0, map = { 0: 1 }, count = 0;
      frames.push(frame(-1, null, `Count subarrays summing to <b>${kk}</b>. Track prefix sums; a subarray sums to k whenever a previous prefix equals (current − k).`, "prefix = 0 · count = 0 · map = {0:1}"));
      for (var m2 = 0; m2 < a.length; m2++) { prefix += a[m2]; var add = map[prefix - kk] || 0; count += add; frames.push(frame(m2, null, `prefix = ${prefix}. Have we seen prefix−k = ${prefix - kk}? ${add} time(s) → +${add}. Total: <b>${count}</b>.`, `prefix=${prefix} · count=${count}`)); map[prefix] = (map[prefix] || 0) + 1; }
      frames.push(frame(-1, null, `There are <b>${count}</b> subarrays summing to ${kk}.`, `count = ${count}`));
    } else if (mode === "single-number") {
      var xr = 0;
      frames.push(frame(-1, null, "XOR every element. Equal pairs cancel (a ^ a = 0), so the one unpaired value is left standing.", "xor = 0"));
      for (var s3 = 0; s3 < a.length; s3++) { xr ^= a[s3]; frames.push(frame(s3, null, `xor ^ ${a[s3]} = <b>${xr}</b>.`, `xor = ${xr}`)); }
      frames.push(frame(-1, null, `The single number is <b>${xr}</b>.`, `xor = ${xr}`));
    } else if (mode === "jump-game") {
      var reach = 0;
      frames.push(frame(-1, null, "Greedy: track <b>farthest</b>, the rightmost index reachable so far. The instant we'd stand past it, we're stuck.", "farthest = 0"));
      for (var jg = 0; jg < a.length; jg++) {
        if (jg > reach) { frames.push(frame(jg, mark(jg, "var(--c-warning-bg)", "var(--c-warning)"), `Index ${jg} &gt; farthest ${reach} — this cell is <b>unreachable</b>, return false.`, `farthest = ${reach}`)); return frames; }
        var nr = Math.max(reach, jg + a[jg]), grew = nr > reach; reach = nr;
        if (reach >= a.length - 1) { frames.push(frame(jg, null, `At ${jg} (jump ${a[jg]}): farthest = <b>${reach}</b> covers the last index → <b>true</b>.`, `farthest = ${reach}`)); return frames; }
        frames.push(frame(jg, null, `At ${jg} (jump ${a[jg]}): farthest = max(${reach}) = <b>${reach}</b>${grew ? "" : " (no gain)"}.`, `farthest = ${reach}`));
      }
    } else if (mode === "jump-game-ii") {
      var jumps = 0, curEnd = 0, far = 0;
      frames.push(frame(-1, null, "BFS-greedy: a 'level' is everything reachable with the current jump count. Crossing the level's end costs one more jump.", "jumps = 0"));
      for (var j2 = 0; j2 < a.length - 1; j2++) {
        far = Math.max(far, j2 + a[j2]);
        if (j2 === curEnd) { jumps++; curEnd = far; frames.push(frame(j2, mark(j2, "var(--c-info-bg)", "var(--accent)"), `Reached the edge of this range at ${j2} → take <b>jump #${jumps}</b>; the new range now reaches ${curEnd}.`, `jumps = ${jumps} · reach = ${far}`)); }
        else frames.push(frame(j2, null, `At ${j2}: the range's farthest extends to ${far}.`, `jumps = ${jumps} · reach = ${far}`));
      }
      frames.push(frame(-1, null, `Fewest jumps to the end = <b>${jumps}</b>.`, `jumps = ${jumps}`));
    } else if (mode === "gas-station") {
      var gtotal = 0, tank = 0, start = 0;
      frames.push(frame(-1, null, "Each cell is <b>net</b> gas (gas − cost) at a station. If the running tank ever goes negative, no earlier start works — restart just after.", "tank = 0 · start = 0"));
      for (var gs = 0; gs < a.length; gs++) {
        tank += a[gs]; gtotal += a[gs];
        if (tank < 0) { frames.push(frame(gs, mark(gs, "var(--c-warning-bg)", "var(--c-warning)"), `Tank fell to ${tank} at ${gs} → can't have started at ${start}. Set <b>start = ${gs + 1}</b> and reset the tank.`, `total = ${gtotal}`)); start = gs + 1; tank = 0; }
        else frames.push(frame(gs, null, `Net ${a[gs]} → tank = <b>${tank}</b> (still ≥ 0).`, `tank = ${tank} · start = ${start}`));
      }
      frames.push(frame(-1, gtotal >= 0 && start < a.length ? mark(start, "var(--c-success-bg)", "var(--c-success)") : null, gtotal >= 0 ? `Total net ${gtotal} ≥ 0 → a full loop works, starting at index <b>${start}</b>.` : `Total net ${gtotal} &lt; 0 → impossible, return -1.`, `total = ${gtotal}`));
    } else if (mode === "missing-number") {
      var mx = a.length;
      frames.push(frame(-1, null, `Values should be 0..${a.length}. XOR <b>n</b> with every index and value — each present number cancels its own index, leaving the gap.`, `xor = ${mx}`));
      for (var mnum = 0; mnum < a.length; mnum++) { mx ^= mnum ^ a[mnum]; frames.push(frame(mnum, null, `xor ^ ${mnum} ^ ${a[mnum]} = <b>${mx}</b>.`, `xor = ${mx}`)); }
      frames.push(frame(-1, null, `The missing number is <b>${mx}</b>.`, `xor = ${mx}`));
    } else if (mode === "contains-duplicate-ii") {
      var kk = cfg.k, win = {};
      frames.push(frame(-1, null, `Is there a duplicate within <b>k = ${kk}</b> indices? Slide a window of the last ${kk} values as a set; a hit inside it wins.`, "window = { }"));
      for (var ci = 0; ci < a.length; ci++) {
        if (win[a[ci]] !== undefined && ci - win[a[ci]] <= kk) { var mm = {}; mm[ci] = { fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", sw: 2.2, lab: "var(--c-warning)" }; mm[win[a[ci]]] = { fill: "var(--c-success-bg)", stroke: "var(--c-success)", sw: 2.2, lab: "var(--c-success)" }; frames.push(frame(ci, mm, `<b>${a[ci]}</b> seen at index ${win[a[ci]]}, distance ${ci - win[a[ci]]} ≤ ${kk} → <b>true</b>.`, `dup within ${kk}`)); return frames; }
        win[a[ci]] = ci;
        frames.push(frame(ci, null, `Record ${a[ci]} → index ${ci}. No prior copy within ${kk}.`, `last index of ${a[ci]} = ${ci}`));
      }
      frames.push(frame(-1, null, "No close duplicate found → false.", "no match"));
    } else if (mode === "majority-2") {
      var c1 = null, c2 = null, n1 = 0, n2 = 0;
      frames.push(frame(-1, null, "Elements appearing &gt; n/3 times — at most two exist. Extended Boyer–Moore tracks <b>two</b> candidates and counts.", "c1=— c2=—"));
      for (var mi = 0; mi < a.length; mi++) {
        var v = a[mi];
        if (c1 === v) { n1++; } else if (c2 === v) { n2++; } else if (n1 === 0) { c1 = v; n1 = 1; } else if (n2 === 0) { c2 = v; n2 = 1; } else { n1--; n2--; }
        frames.push(frame(mi, null, `See <b>${v}</b> → ${c1 === v || c2 === v ? "matches a candidate (+1)" : (n1 === 1 && c1 === v) || (n2 === 1 && c2 === v) ? "adopted as a candidate" : "both counts decremented"}.`, `c1=${c1}(${n1}) c2=${c2}(${n2})`));
      }
      n1 = 0; n2 = 0; a.forEach(function (v) { if (v === c1) n1++; else if (v === c2) n2++; });
      var thr = Math.floor(a.length / 3);
      var win2 = [c1, c2].filter(function (c, i) { return (i === 0 ? n1 : n2) > thr; });
      frames.push(frame(-1, null, `Verify counts in a 2nd pass: keep those &gt; ⌊n/3⌋ = ${thr}. Answer: <b>[${win2.join(", ")}]</b>.`, `c1=${n1} c2=${n2}`));
    }
    function mark(i, fill, stroke) { var m = {}; m[i] = { fill: fill, stroke: stroke, sw: 2.2, lab: stroke }; return m; }
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
    } else if (mode === "3sum") {
      var arr = a.slice().sort(function (x, y) { return x - y; });
      grid = valueCells(arr, { W: W, y: 44, h: 44 });
      var found = [];
      function frame3(i, l, r, style, caption, panel) {
        var inner = grid.draw(function (k) {
          if (style && style[k]) return style[k];
          if (k === i) return { fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", sw: 2.2, lab: "var(--c-warning)" };
          if (l >= 0 && (k < l || k > r)) return { op: 0.3 };
          return {};
        }, true);
        inner += ptrMark(grid, i, "i", "var(--c-warning)", false);
        inner += ptrMark(grid, l, "L", "var(--accent)", true);
        inner += ptrMark(grid, r, "R", "var(--accent)", true);
        if (panel) inner += `<text x="${W / 2}" y="${H - 8}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${panel}</text>`;
        return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="3sum two pointers">${inner}</svg>`, caption: caption };
      }
      frames.push(frame3(-1, -1, -1, null, "Sort first, then fix index <b>i</b> and two-pointer the rest for a pair summing to −nums[i]. Skipping duplicates keeps triplets unique.", "triplets: 0"));
      for (var i = 0; i < arr.length - 2; i++) {
        if (i > 0 && arr[i] === arr[i - 1]) continue;
        var l = i + 1, r = arr.length - 1;
        while (l < r) {
          var sum3 = arr[i] + arr[l] + arr[r];
          if (sum3 === 0) { found.push([arr[i], arr[l], arr[r]]); var st3 = {}; st3[i] = hl("var(--c-success)"); st3[l] = hl("var(--c-success)"); st3[r] = hl("var(--c-success)"); frames.push(frame3(i, l, r, st3, `${arr[i]} + ${arr[l]} + ${arr[r]} = 0 ✓ → triplet <b>[${arr[i]}, ${arr[l]}, ${arr[r]}]</b>.`, `triplets: ${found.length}`)); l++; r--; while (l < r && arr[l] === arr[l - 1]) l++; while (l < r && arr[r] === arr[r + 1]) r--; }
          else if (sum3 < 0) { frames.push(frame3(i, l, r, null, `sum ${sum3} &lt; 0 → too small, move L right.`, `triplets: ${found.length}`)); l++; }
          else { frames.push(frame3(i, l, r, null, `sum ${sum3} &gt; 0 → too big, move R left.`, `triplets: ${found.length}`)); r--; }
        }
      }
      frames.push(frame3(-1, -1, -1, null, `Found <b>${found.length}</b> unique triplet(s): ${found.map(function (t) { return "[" + t.join(",") + "]"; }).join("   ")}.`, `triplets: ${found.length}`));
    }
    function hl(c) { return { fill: c === "var(--c-success)" ? "var(--c-success-bg)" : c === "var(--c-warning)" ? "var(--c-warning-bg)" : "var(--brand-soft)", stroke: c, sw: 2.2, lab: c }; }
    return frames;
  }

  /* ============================================================
     RENDERER — sliding window (Longest Substring Without Repeating)
     ============================================================ */
  function slidingWindow(cfg) {
    var a = cfg.data, mode = cfg.mode || "longest-unique", W = 600, H = 160;
    var vals = (typeof a === "string") ? a.split("") : a;
    var grid = valueCells(vals, { W: W, y: 46, h: 44 });
    function frame(left, right, caption, panel) {
      var inner = grid.draw(function (i) {
        if (i >= left && i <= right) {
          if (i === right) return { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" };
          return { fill: "var(--c-info-bg)", stroke: "var(--accent)" };
        }
        return { op: 0.32 };
      }, true);
      inner += ptrMark(grid, left, "L", "var(--accent)", true);
      inner += ptrMark(grid, right, "R", "var(--accent)", true);
      if (panel) inner += `<text x="${W / 2}" y="${H - 8}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${panel}</text>`;
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="sliding window">${inner}</svg>`, caption: caption };
    }
    var frames = [], left = 0, best = 0;
    if (mode === "longest-unique") {
      var set = {};
      frames.push(frame(0, -1, "Grow a window on the right; if a character repeats, shrink from the left until it's unique again. Track the longest window.", "longest = 0"));
      for (var right = 0; right < vals.length; right++) {
        while (set[vals[right]]) { delete set[vals[left]]; frames.push(frame(left + 1, right, `'<b>${vals[right]}</b>' is already in the window → drop '<b>${vals[left]}</b>' from the left.`, `window = "${vals.slice(left + 1, right + 1).join("")}" · longest = ${best}`)); left++; }
        set[vals[right]] = true; best = Math.max(best, right - left + 1);
        frames.push(frame(left, right, `Add '<b>${vals[right]}</b>'. Window is unique, length <b>${right - left + 1}</b> — longest so far ${best}.`, `window = "${vals.slice(left, right + 1).join("")}" · longest = ${best}`));
      }
      frames.push(frame(left, vals.length - 1, `Longest substring without repeats has length <b>${best}</b>.`, `longest = ${best}`));
    } else if (mode === "min-subarray-sum") {
      var target = cfg.target, sum = 0; best = Infinity;
      frames.push(frame(0, -1, `Find the shortest subarray summing to ≥ <b>${target}</b>. Expand right to grow the sum; once it's big enough, shrink from the left to minimise length.`, "sum = 0 · best = ∞"));
      for (var r2 = 0; r2 < vals.length; r2++) {
        sum += vals[r2];
        frames.push(frame(left, r2, `Add ${vals[r2]} → sum = <b>${sum}</b>.`, `sum = ${sum} · best = ${best === Infinity ? "∞" : best}`));
        while (sum >= target) { best = Math.min(best, r2 - left + 1); frames.push(frame(left, r2, `sum ${sum} ≥ ${target} → window length ${r2 - left + 1}; record best = <b>${best}</b>, then drop ${vals[left]} from the left.`, `sum = ${sum} · best = ${best}`)); sum -= vals[left]; left++; }
      }
      frames.push(frame(-1, -1, best === Infinity ? `No subarray reaches ${target} → return 0.` : `Shortest length = <b>${best}</b>.`, best === Infinity ? "best = 0" : `best = ${best}`));
    } else if (mode === "longest-repeat") {
      var k = cfg.k, count = {}, maxC = 0;
      frames.push(frame(0, -1, `Longest substring of one repeated letter after ≤ <b>${k}</b> replacements. A window is valid when (length − count of its most frequent letter) ≤ ${k}.`, "best = 0"));
      for (var r3 = 0; r3 < vals.length; r3++) {
        count[vals[r3]] = (count[vals[r3]] || 0) + 1; maxC = Math.max(maxC, count[vals[r3]]);
        while ((r3 - left + 1) - maxC > k) { count[vals[left]]--; left++; }
        best = Math.max(best, r3 - left + 1);
        frames.push(frame(left, r3, `Add '${vals[r3]}'. Window "${vals.slice(left, r3 + 1).join("")}" needs ${(r3 - left + 1) - maxC} replacement(s) (≤ ${k}) → length ${r3 - left + 1}, best <b>${best}</b>.`, `maxFreq = ${maxC} · best = ${best}`));
      }
      frames.push(frame(left, vals.length - 1, `Longest achievable run = <b>${best}</b>.`, `best = ${best}`));
    } else { // max-ones (≤ k zeros)
      var kz = cfg.k, zeros = 0;
      frames.push(frame(0, -1, `Longest run of 1s if you may flip ≤ <b>${kz}</b> zeros. Keep a window with at most ${kz} zeros; when it has too many, shrink from the left.`, "zeros = 0 · best = 0"));
      for (var r4 = 0; r4 < vals.length; r4++) {
        if (vals[r4] === 0) zeros++;
        while (zeros > kz) { if (vals[left] === 0) zeros--; left++; }
        best = Math.max(best, r4 - left + 1);
        frames.push(frame(left, r4, `Include index ${r4} (${vals[r4]}). Window has ${zeros} zero(s) ≤ ${kz} → length ${r4 - left + 1}, best <b>${best}</b>.`, `zeros = ${zeros} · best = ${best}`));
      }
      frames.push(frame(left, vals.length - 1, `Longest window of 1s with ≤ ${kz} flips = <b>${best}</b>.`, `best = ${best}`));
    }
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

  /* ============================================================
     RENDERER — binary tree (traversals + DFS/BFS algorithms)
     ============================================================ */
  function treeFromHeap(arr) {
    if (!arr.length || arr[0] == null) return null;
    var o = arr.map(function (v) { return v == null ? null : { val: v, left: null, right: null }; });
    for (var i = 0; i < o.length; i++) {
      if (!o[i]) continue;
      if (2 * i + 1 < o.length) o[i].left = o[2 * i + 1];
      if (2 * i + 2 < o.length) o[i].right = o[2 * i + 2];
    }
    return o[0];
  }
  function layoutTree(root) {
    var order = 0, maxD = 0, all = [];
    (function ino(n, d) {
      if (!n) return;
      ino(n.left, d + 1);
      n._ox = order++; n._d = d; maxD = Math.max(maxD, d); all.push(n);
      ino(n.right, d + 1);
    })(root, 0);
    return { count: order, maxD: maxD, all: all };
  }
  function drawTree(root, W, levelH, top, stateOf) {
    var L = layoutTree(root), pad = 26, span = (W - 2 * pad) / Math.max(L.count, 1);
    function X(n) { return pad + (n._ox + 0.5) * span; }
    function Y(n) { return top + n._d * levelH; }
    var s = "";
    L.all.forEach(function (n) {
      [n.left, n.right].forEach(function (c) { if (c) s += line(X(n), Y(n), X(c), Y(c), { stroke: "var(--border)", sw: 1.5 }); });
    });
    L.all.forEach(function (n) {
      var st = stateOf(n) || "default";
      var fill = "var(--surface-2)", stroke = "var(--border)", lab = "var(--text)", op = 1, sw = 1.4;
      if (st === "active") { fill = "var(--brand-soft)"; stroke = "var(--accent)"; lab = "var(--accent)"; sw = 2.6; }
      else if (st === "visited") { fill = "var(--c-success-bg)"; stroke = "var(--c-success)"; lab = "var(--c-success)"; }
      else if (st === "dim") { op = 0.35; }
      else if (st === "warn") { fill = "var(--c-warning-bg)"; stroke = "var(--c-warning)"; lab = "var(--c-warning)"; sw = 2.6; }
      var x = X(n), y = Y(n);
      s += `<circle cx="${x}" cy="${y}" r="16" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}"/>`;
      s += `<text x="${x}" y="${y + 5}" text-anchor="middle" fill="${lab}" opacity="${op}" style="font:700 13px var(--font-sans)">${n.val}</text>`;
    });
    return s;
  }
  function treeViz(cfg) {
    var root = treeFromHeap(cfg.data), mode = cfg.mode, W = 600, levelH = 62, top = 30;
    var L0 = layoutTree(root), H = top + L0.maxD * levelH + 34;
    var frames = [], visited = [], active = null, special = {};
    function stateOf(n) {
      if (special[n.val] && active !== n) return special[n.val];
      if (n === active) return "active";
      if (visited.indexOf(n) >= 0) return "visited";
      return "default";
    }
    function push(caption) {
      frames.push({ svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="binary tree">${drawTree(root, W, levelH, top, stateOf)}</svg>`, caption: caption });
    }
    function bfsLevels() { var lv = [], q = [root]; while (q.length) { var nx = [], row = []; q.forEach(function (n) { row.push(n); if (n.left) nx.push(n.left); if (n.right) nx.push(n.right); }); lv.push(row); q = nx; } return lv; }

    if (mode === "invert") {
      push("Invert the tree: at every node, swap its left and right children. Watch it mirror.");
      (function pre(n) { if (!n) return; active = n; var t = n.left; n.left = n.right; n.right = t; push(`Swap the children of <b>${n.val}</b>.`); visited.push(n); active = null; pre(n.left); pre(n.right); })(root);
      active = null; push("Every node's children are swapped — the tree is fully mirrored.");
    } else if (mode === "max-depth") {
      var best = 0;
      push("Max depth = the longest root-to-leaf path. DFS down, counting depth, and keep the deepest.");
      (function dfs(n, d) { if (!n) return; active = n; best = Math.max(best, d); push(`At <b>${n.val}</b>, depth = <b>${d}</b>. Deepest so far: ${best}.`); visited.push(n); active = null; dfs(n.left, d + 1); dfs(n.right, d + 1); })(root, 1);
      active = null; push(`The maximum depth is <b>${best}</b>.`);
    } else if (mode === "min-depth") {
      push("Min depth = shallowest leaf. BFS level by level and stop at the <b>first leaf</b> we meet.");
      var lv = bfsLevels(), depth = 0, found = false;
      for (var i = 0; i < lv.length && !found; i++) {
        depth++; visited = visited.concat(lv[i].filter(function (n) { return !(!n.left && !n.right); }));
        for (var j = 0; j < lv[i].length; j++) { if (!lv[i][j].left && !lv[i][j].right) { active = lv[i][j]; found = true; break; } }
        push(found ? `First leaf <b>${active.val}</b> reached at depth <b>${depth}</b> — that's the minimum.` : `Level ${depth}: no leaf yet, go deeper.`);
      }
    } else if (mode === "diameter") {
      var dia = 0;
      push("Diameter = longest path between any two nodes. Post-order: each node returns its height; the path bending here is leftH + rightH.");
      (function h(n) { if (!n) return 0; var lh = h(n.left), rh = h(n.right); active = n; dia = Math.max(dia, lh + rh); push(`At <b>${n.val}</b>: leftH=${lh}, rightH=${rh} → bend = <b>${lh + rh}</b>. Best diameter: ${dia}.`); visited.push(n); active = null; return 1 + Math.max(lh, rh); })(root);
      active = null; push(`The diameter (in edges) is <b>${dia}</b>.`);
    } else if (mode === "balanced") {
      var bal = true;
      push("Balanced = every node's two subtree heights differ by ≤ 1. Post-order returns height, −1 signals imbalance.");
      (function h(n) { if (!n) return 0; var lh = h(n.left); if (lh < 0) return -1; var rh = h(n.right); if (rh < 0) return -1; active = n; var ok = Math.abs(lh - rh) <= 1; if (!ok) bal = false; special[n.val] = ok ? null : "warn"; push(`At <b>${n.val}</b>: |${lh} − ${rh}| = ${Math.abs(lh - rh)} ${ok ? "≤ 1 ✓" : "&gt; 1 ✗ (unbalanced)"}.`); visited.push(n); active = null; return ok ? 1 + Math.max(lh, rh) : -1; })(root);
      active = null; push(bal ? "Every node is balanced → <b>true</b>." : "A node broke the ±1 rule → <b>false</b>.");
    } else if (mode === "validate-bst") {
      var okAll = true;
      push("Valid BST: every node must lie inside the (low, high) range inherited from its ancestors — not just beat its direct children.");
      (function v(n, lo, hi) { if (!n) return; active = n; var good = (lo === null || n.val > lo) && (hi === null || n.val < hi); if (!good) { okAll = false; special[n.val] = "warn"; } push(`<b>${n.val}</b> must be in (${lo === null ? "−∞" : lo}, ${hi === null ? "+∞" : hi}) → ${good ? "ok ✓" : "violation ✗"}.`); visited.push(n); active = null; if (good) { v(n.left, lo, n.val); v(n.right, n.val, hi); } })(root, null, null);
      active = null; push(okAll ? "Every node respects its bounds → <b>valid BST</b>." : "A node violated its bounds → <b>not a BST</b>.");
    } else if (mode === "kth-smallest") {
      var k = cfg.k, cnt = 0, ans = null;
      push(`In-order traversal of a BST visits values in sorted order. Stop at the <b>${k}</b>th node.`);
      (function ino(n) { if (!n || ans !== null) return; ino(n.left); if (ans !== null) return; cnt++; active = n; push(`Visit <b>${n.val}</b> (count ${cnt}).${cnt === k ? " This is the answer!" : ""}`); if (cnt === k) { ans = n.val; special[n.val] = "visited"; } else { visited.push(n); } active = null; ino(n.right); })(root);
      active = null; push(`The ${k}th smallest value is <b>${ans}</b>.`);
    } else if (mode === "lca-bst") {
      var p = cfg.p, q = cfg.q;
      push(`Find the lowest common ancestor of <b>${p}</b> and <b>${q}</b>. In a BST, walk down: both smaller → left, both larger → right, else this is the split point.`);
      var n = root;
      while (n) {
        active = n;
        if (p < n.val && q < n.val) { push(`Both ${p},${q} &lt; ${n.val} → go left.`); visited.push(n); active = null; n = n.left; }
        else if (p > n.val && q > n.val) { push(`Both ${p},${q} &gt; ${n.val} → go right.`); visited.push(n); active = null; n = n.right; }
        else { special[n.val] = "visited"; push(`${p} and ${q} split at <b>${n.val}</b> — this is the LCA.`); break; }
      }
    } else if (mode === "path-sum") {
      var target = cfg.target, found = false;
      push(`Is there a root-to-leaf path summing to <b>${target}</b>? DFS, subtracting each value; a leaf hitting 0 wins.`);
      (function dfs(n, rem) { if (!n || found) return; active = n; rem -= n.val; var leaf = !n.left && !n.right; push(`At <b>${n.val}</b>, remaining = ${rem}.${leaf ? (rem === 0 ? " Leaf with 0 left — found!" : " Leaf but ≠ 0.") : ""}`); if (leaf && rem === 0) { found = true; special[n.val] = "visited"; return; } visited.push(n); active = null; dfs(n.left, rem); dfs(n.right, rem); })(root, target);
      active = null; push(found ? `A path sums to <b>${target}</b> → <b>true</b>.` : `No root-to-leaf path sums to ${target} → <b>false</b>.`);
    } else if (mode === "count-good-nodes") {
      var good = 0;
      push("A node is <b>good</b> if nothing on the path from the root is larger. Carry the running max down.");
      (function dfs(n, mx) { if (!n) return; active = n; var isGood = n.val >= mx; if (isGood) { good++; special[n.val] = "visited"; } push(`At <b>${n.val}</b>, path-max so far = ${mx} → ${isGood ? "good ✓" : "not good"}. Count: ${good}.`); if (!isGood) visited.push(n); active = null; var nm = Math.max(mx, n.val); dfs(n.left, nm); dfs(n.right, nm); })(root, -Infinity);
      active = null; push(`There are <b>${good}</b> good nodes.`);
    } else if (mode === "level-order") {
      push("Level-order (BFS): a queue processes one full level per pass, left to right.");
      var lv = bfsLevels();
      for (var i = 0; i < lv.length; i++) { visited = visited.concat(lv[i]); active = null; var saved = active; lv[i].forEach(function (n) { special[n.val] = "active"; }); push(`Level ${i}: [${lv[i].map(function (n) { return n.val; }).join(", ")}].`); lv[i].forEach(function (n) { special[n.val] = null; }); }
      push("Output is the list of levels, top to bottom.");
    } else if (mode === "right-side-view") {
      push("Right-side view = the <b>last</b> node of each BFS level (what you'd see from the right).");
      var lv = bfsLevels(), seen = [];
      for (var i = 0; i < lv.length; i++) { var last = lv[i][lv[i].length - 1]; visited = visited.concat(lv[i]); special[last.val] = "active"; seen.push(last.val); push(`Level ${i}: rightmost node is <b>${last.val}</b>.`); }
      push(`Right side view: [${seen.join(", ")}].`);
    } else if (mode === "zigzag") {
      push("Zigzag level-order: same BFS, but reverse the output direction on alternate levels.");
      var lv = bfsLevels();
      for (var i = 0; i < lv.length; i++) { var row = lv[i].map(function (n) { return n.val; }); if (i % 2 === 1) row = row.slice().reverse(); visited = visited.concat(lv[i]); lv[i].forEach(function (n) { special[n.val] = "active"; }); push(`Level ${i} ${i % 2 ? "(right→left)" : "(left→right)"}: [${row.join(", ")}].`); lv[i].forEach(function (n) { special[n.val] = null; }); }
      push("Each odd level is emitted in reverse — that's the zigzag.");
    } else if (mode === "max-path") {
      var best = -Infinity;
      push("Max path sum: post-order. Each node returns its best single-branch gain (clamped ≥ 0); the path bending here = node + leftGain + rightGain updates the global best.");
      (function gain(n) { if (!n) return 0; var lg = Math.max(0, gain(n.left)), rg = Math.max(0, gain(n.right)); active = n; best = Math.max(best, n.val + lg + rg); push(`At <b>${n.val}</b>: left gain ${lg}, right gain ${rg} → bend = ${n.val}+${lg}+${rg} = ${n.val + lg + rg}. Best: ${best}.`); visited.push(n); active = null; return n.val + Math.max(lg, rg); })(root);
      active = null; push(`Maximum path sum = <b>${best}</b>.`);
    } else if (mode === "flatten") {
      push("Flatten to a 'linked list' in <b>preorder</b> (root, left, right) where each node's right pointer goes to the next. The visit order below <i>is</i> the final list.");
      var seq = [];
      (function pre(n) { if (!n) return; active = n; seq.push(n.val); push(`Preorder visit <b>${n.val}</b> → next in the flattened list. So far: ${seq.join(" → ")}.`); visited.push(n); active = null; pre(n.left); pre(n.right); })(root);
      active = null; push(`Flattened: <b>${seq.join(" → ")}</b> — left pointers nulled, right pointers chained.`);
    } else if (mode === "lca-general") {
      var pp = cfg.p, qq = cfg.q, ans = null;
      push(`Lowest common ancestor of <b>${pp}</b> and <b>${qq}</b> in a plain binary tree. Post-order: a node with one target in each subtree (or itself a target with the other below) is the LCA.`);
      (function dfs(n) { if (!n) return null; active = n; var self = (n.val === pp || n.val === qq); push(`At <b>${n.val}</b>${self ? " — a target!" : ""}.`); visited.push(n); active = null; var l = dfs(n.left), r = dfs(n.right); var found = (l ? 1 : 0) + (r ? 1 : 0) + (self ? 1 : 0); if (found >= 2 && ans === null) { ans = n.val; special[n.val] = "visited"; push(`<b>${n.val}</b> sees ${pp} and ${qq} on different sides → it's the <b>LCA</b>.`); } return (self || l || r) ? n : null; })(root);
      active = null; push(`LCA(${pp}, ${qq}) = <b>${ans}</b>.`);
    } else if (mode === "path-sum-ii") {
      var target2 = cfg.target, foundPaths = [];
      push(`Find <b>all</b> root-to-leaf paths summing to <b>${target2}</b>. DFS while subtracting each value; a leaf that hits exactly 0 is a winning path.`);
      (function dfs(n, rem, path) { if (!n) return; active = n; rem -= n.val; var p2 = path.concat(n.val); var leaf = !n.left && !n.right; push(`At <b>${n.val}</b>, remaining ${rem}. Path: ${p2.join("→")}.${leaf ? (rem === 0 ? " Leaf with 0 left — match!" : " Leaf but ≠ 0.") : ""}`); if (leaf && rem === 0) { foundPaths.push(p2.slice()); p2.forEach(function (v) { special[v] = "visited"; }); push(`Recorded <b>[${p2.join(",")}]</b>. Found: ${foundPaths.length}.`); p2.forEach(function (v) { special[v] = null; }); } else { visited.push(n); } active = null; dfs(n.left, rem, p2); dfs(n.right, rem, p2); })(root, target2, []);
      active = null; push(foundPaths.length ? `Paths summing to ${target2}: ${foundPaths.map(function (p) { return "[" + p.join(",") + "]"; }).join("   ")}.` : `No path sums to ${target2}.`);
    }
    return frames;
  }

  /* ============================================================
     RENDERER — grid (DFS flood / multi-source BFS)
     ============================================================ */
  function gridViz(cfg) {
    var g = cfg.data.map(function (r) { return r.slice(); });
    var R = g.length, C = g[0].length, W = 600, cell = Math.min(40, (W - 40) / C), gap = 4;
    var gw = C * cell + (C - 1) * gap, sx = (W - gw) / 2, sy = 28, H = sy + R * cell + (R - 1) * gap + 16;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    function cx(c) { return sx + c * (cell + gap); }
    function cy(r) { return sy + r * (cell + gap); }
    function draw(stateAt, label) {
      var s = "";
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
        var st = stateAt(r, c) || {};
        s += rect(cx(c), cy(r), cell, cell, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: st.sw || 1.2, r: 5 });
        if (st.t != null) s += `<text x="${cx(c) + cell / 2}" y="${cy(r) + cell / 2 + 4}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 ${st.fs || 12}px var(--font-sans)">${st.t}</text>`;
      }
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="grid">${s}</svg>`, caption: label };
    }
    var frames = [], mode = cfg.mode;
    var land = function (v) { return v === 1 || v === "1"; };

    if (mode === "islands") {
      var vis = Array.from({ length: R }, function () { return new Array(C).fill(false); });
      var count = 0;
      frames.push(draw(function (r, c) { return land(g[r][c]) ? { fill: "var(--surface-hover)", stroke: "var(--accent)", t: "1", lab: "var(--accent)" } : { t: "0", lab: "var(--text-faint)", fs: 11 }; },
        "Count islands: scan cells; each unvisited land cell starts a new island, then flood-fill its whole connected blob."));
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
        if (land(g[r][c]) && !vis[r][c]) {
          count++; var comp = [], stack = [[r, c]];
          while (stack.length) { var p = stack.pop(); if (p[0] < 0 || p[1] < 0 || p[0] >= R || p[1] >= C || vis[p[0]][p[1]] || !land(g[p[0]][p[1]])) continue; vis[p[0]][p[1]] = true; comp.push(p); dirs.forEach(function (d) { stack.push([p[0] + d[0], p[1] + d[1]]); }); }
          frames.push(draw(function (rr, cc) { var inComp = comp.some(function (p) { return p[0] === rr && p[1] === cc; }); if (inComp) return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", t: "✓", lab: "var(--c-success)" }; if (vis[rr][cc]) return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", t: "✓", lab: "var(--c-success)" }; return land(g[rr][cc]) ? { fill: "var(--surface-hover)", stroke: "var(--accent)", t: "1", lab: "var(--accent)" } : { t: "0", lab: "var(--text-faint)", fs: 11 }; },
            `New island #${count} at (${r},${c}). Flood-fill its ${comp.length} connected land cells so they aren't counted again.`));
        }
      }
      frames.push(draw(function (rr, cc) { return vis[rr][cc] ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", t: "✓", lab: "var(--c-success)" } : { t: "0", lab: "var(--text-faint)", fs: 11 }; }, `Total islands: <b>${count}</b>.`));
    } else if (mode === "rotting") {
      var q = [], fresh = 0;
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) { if (g[r][c] === 2) q.push([r, c]); else if (g[r][c] === 1) fresh++; }
      function snap(label) { frames.push(draw(function (rr, cc) { var v = g[rr][cc]; if (v === 2) return { fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", t: "🦠", fs: 13 }; if (v === 1) return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", t: "🍊", fs: 13 }; return { t: "" }; }, label)); }
      snap("Multi-source BFS: every rotten orange 🦠 spreads to fresh neighbours 🍊 each minute. Seed the queue with all rotten cells.");
      var minute = 0;
      while (q.length && fresh > 0) {
        minute++; var nq = [];
        q.forEach(function (p) { dirs.forEach(function (d) { var nr = p[0] + d[0], nc = p[1] + d[1]; if (nr >= 0 && nc >= 0 && nr < R && nc < C && g[nr][nc] === 1) { g[nr][nc] = 2; fresh--; nq.push([nr, nc]); } }); });
        q = nq; snap(`Minute <b>${minute}</b>: the rot spreads one ring outward. Fresh left: ${fresh}.`);
      }
      snap(fresh === 0 ? `All oranges rot in <b>${minute}</b> minutes.` : `Some orange is unreachable → return <b>-1</b>.`);
    } else if (mode === "flood-fill") {
      var sr = cfg.sr, sc = cfg.scc, target = g[sr][sc], color = cfg.newColor;
      frames.push(draw(function (rr, cc) { return { t: g[rr][cc], lab: rr === sr && cc === sc ? "var(--accent)" : "var(--text-muted)", stroke: rr === sr && cc === sc ? "var(--accent)" : "var(--border)", sw: rr === sr && cc === sc ? 2.2 : 1.2 }; }, `Flood-fill from (${sr},${sc}). Recolor every 4-connected cell of the same colour (${target}) to ${color}.`));
      var st = [[sr, sc]], filled = [];
      while (st.length) { var p = st.pop(); if (p[0] < 0 || p[1] < 0 || p[0] >= R || p[1] >= C || g[p[0]][p[1]] !== target) continue; g[p[0]][p[1]] = color; filled.push(p); dirs.forEach(function (d) { st.push([p[0] + d[0], p[1] + d[1]]); }); }
      frames.push(draw(function (rr, cc) { var f = filled.some(function (p) { return p[0] === rr && p[1] === cc; }); return { t: g[rr][cc], fill: f ? "var(--c-success-bg)" : "var(--surface-2)", stroke: f ? "var(--c-success)" : "var(--border)", lab: f ? "var(--c-success)" : "var(--text-muted)" }; }, `Flooded ${filled.length} connected cells to <b>${color}</b>.`));
    } else if (mode === "shortest-path") {
      var q2 = [[0, 0]], dist = Array.from({ length: R }, function () { return new Array(C).fill(0); });
      if (g[0][0] === 0) dist[0][0] = 1;
      function snap2(label) { frames.push(draw(function (rr, cc) { if (g[rr][cc] === 1) return { fill: "var(--surface-hover)", t: "" }; if (dist[rr][cc] > 0) return { fill: "var(--c-info-bg)", stroke: "var(--accent)", t: dist[rr][cc], lab: "var(--accent)" }; return { t: "" }; }, label)); }
      snap2("Shortest clear path corner to corner (8 directions). BFS expands by distance — first arrival is shortest.");
      var d8 = dirs.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
      while (q2.length) { var p = q2.shift(); if (p[0] === R - 1 && p[1] === C - 1) break; d8.forEach(function (d) { var nr = p[0] + d[0], nc = p[1] + d[1]; if (nr >= 0 && nc >= 0 && nr < R && nc < C && g[nr][nc] === 0 && dist[nr][nc] === 0) { dist[nr][nc] = dist[p[0]][p[1]] + 1; q2.push([nr, nc]); } }); }
      snap2(dist[R - 1][C - 1] > 0 ? `Shortest path length is <b>${dist[R - 1][C - 1]}</b> cells.` : "No clear path → <b>-1</b>.");
    } else if (mode === "walls-and-gates") {
      var INF = 2147483647, q3 = [];
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) if (g[r][c] === 0) q3.push([r, c]);
      function snap3(label) { frames.push(draw(function (rr, cc) { var v = g[rr][cc]; if (v === -1) return { fill: "var(--surface-hover)", t: "▦", lab: "var(--text-faint)" }; if (v === 0) return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", t: "0", lab: "var(--c-success)" }; if (v === INF) return { t: "∞", lab: "var(--text-faint)" }; return { fill: "var(--c-info-bg)", stroke: "var(--accent)", t: v, lab: "var(--accent)" }; }, label)); }
      snap3("Fill each room with the distance to its nearest gate (0). Multi-source BFS from all gates at once — first arrival is shortest. ▦ = wall.");
      var d = 0;
      while (q3.length) { var nq = []; d++; q3.forEach(function (p) { dirs.forEach(function (dd) { var nr = p[0] + dd[0], nc = p[1] + dd[1]; if (nr >= 0 && nc >= 0 && nr < R && nc < C && g[nr][nc] === INF) { g[nr][nc] = d; nq.push([nr, nc]); } }); }); q3 = nq; if (nq.length) snap3(`Rooms ${d} step(s) from a gate are filled with <b>${d}</b>.`); }
      snap3("Every reachable room now holds its distance to the nearest gate.");
    } else if (mode === "surrounded") {
      function snap4(label) { frames.push(draw(function (rr, cc) { var v = g[rr][cc]; if (v === "#") return { fill: "var(--c-info-bg)", stroke: "var(--accent)", t: "O", lab: "var(--accent)" }; if (v === "O") return { fill: "var(--surface-2)", t: "O", lab: "var(--text-muted)" }; return { fill: "var(--surface-hover)", t: "X", lab: "var(--text-faint)" }; }, label)); }
      snap4("Capture O-regions fully surrounded by X. Trick: an O survives only if it connects to the border — flood those first.");
      function flood(r, c) { var st = [[r, c]]; while (st.length) { var p = st.pop(); if (p[0] < 0 || p[1] < 0 || p[0] >= R || p[1] >= C || g[p[0]][p[1]] !== "O") continue; g[p[0]][p[1]] = "#"; dirs.forEach(function (dd) { st.push([p[0] + dd[0], p[1] + dd[1]]); }); } }
      for (var r2 = 0; r2 < R; r2++) { if (g[r2][0] === "O") flood(r2, 0); if (g[r2][C - 1] === "O") flood(r2, C - 1); }
      for (var c2 = 0; c2 < C; c2++) { if (g[0][c2] === "O") flood(0, c2); if (g[R - 1][c2] === "O") flood(R - 1, c2); }
      snap4("Border-connected O's are marked safe (blue). Everything else is enclosed.");
      for (var r3 = 0; r3 < R; r3++) for (var c3 = 0; c3 < C; c3++) g[r3][c3] = g[r3][c3] === "#" ? "O" : "X";
      frames.push(draw(function (rr, cc) { return g[rr][cc] === "O" ? { fill: "var(--surface-2)", t: "O", lab: "var(--text-muted)" } : { fill: "var(--surface-hover)", t: "X", lab: "var(--text-faint)" }; }, "Enclosed O's flipped to X; safe ones restored to O."));
    }
    return frames;
  }

  /* ============================================================
     RENDERER — 2-D DP table fill
     ============================================================ */
  function dpGrid(cfg) {
    var mode = cfg.mode, W = 600;
    var rows, cols, label0, recur, rowHdr = null, colHdr = null, init;
    var A = cfg.a, B = cfg.b, grid = cfg.grid;
    if (mode === "unique-paths") { rows = cfg.m; cols = cfg.n; }
    else if (mode === "min-path-sum") { rows = grid.length; cols = grid[0].length; }
    else if (mode === "maximal-square") { rows = grid.length; cols = grid[0].length; }
    else { rows = A.length + 1; cols = B.length + 1; }
    var cw = Math.min(46, (W - 80) / cols), ch = 32, sx = 60, sy = (A ? 60 : 40);
    var H = sy + rows * (ch + 4) + 16;
    function cellXY(r, c) { return [sx + c * (cw + 4), sy + r * (ch + 4)]; }
    function draw(dp, cur, contrib, label) {
      var s = "";
      if (A) { for (var c = 0; c < B.length; c++) { var xy = cellXY(0, c + 1); s += `<text x="${xy[0] + cw / 2}" y="${sy - 12}" text-anchor="middle" fill="var(--text-faint)" style="font:700 12px var(--font-mono)">${B[c]}</text>`; } for (var r = 0; r < A.length; r++) { var xy2 = cellXY(r + 1, 0); s += `<text x="${sx - 14}" y="${xy2[1] + ch / 2 + 4}" text-anchor="middle" fill="var(--text-faint)" style="font:700 12px var(--font-mono)">${A[r]}</text>`; } }
      for (var rr = 0; rr < rows; rr++) for (var cc = 0; cc < cols; cc++) {
        var xy3 = cellXY(rr, cc), v = dp[rr][cc];
        var isCur = cur && cur[0] === rr && cur[1] === cc;
        var isCon = contrib && contrib.some(function (p) { return p[0] === rr && p[1] === cc; });
        var fill = isCur ? "var(--brand-soft)" : isCon ? "var(--c-info-bg)" : v != null ? "var(--c-success-bg)" : "var(--surface-2)";
        var stroke = isCur ? "var(--accent)" : isCon ? "var(--accent)" : v != null ? "var(--c-success)" : "var(--border)";
        s += rect(xy3[0], xy3[1], cw, ch, { fill: fill, stroke: stroke, sw: isCur ? 2.4 : 1.2, r: 5 });
        s += `<text x="${xy3[0] + cw / 2}" y="${xy3[1] + ch / 2 + 4}" text-anchor="middle" fill="var(--text)" style="font:600 12px var(--font-sans)">${v == null ? "" : v}</text>`;
      }
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="dp table">${s}</svg>`, caption: label };
    }
    var dp = Array.from({ length: rows }, function () { return new Array(cols).fill(null); });
    var frames = [];
    if (mode === "unique-paths") {
      frames.push(draw(dp, null, null, "Count paths moving only right/down. Each cell = paths from above + paths from the left."));
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) { if (r === 0 || c === 0) { dp[r][c] = 1; } else { dp[r][c] = dp[r - 1][c] + dp[r][c - 1]; } if (r === 0 || c === 0) frames.push(draw(dp, [r, c], null, `Edge cell (${r},${c}) — only one straight path here: 1.`)); else frames.push(draw(dp, [r, c], [[r - 1, c], [r, c - 1]], `dp[${r}][${c}] = ${dp[r - 1][c]} (above) + ${dp[r][c - 1]} (left) = <b>${dp[r][c]}</b>.`)); }
      frames.push(draw(dp, [rows - 1, cols - 1], null, `Bottom-right = <b>${dp[rows - 1][cols - 1]}</b> unique paths.`));
    } else if (mode === "min-path-sum") {
      frames.push(draw(dp, null, null, "Min-sum path (right/down). Each cell = its value + the cheaper of the cell above and left."));
      for (var r2 = 0; r2 < rows; r2++) for (var c2 = 0; c2 < cols; c2++) { var add; if (r2 === 0 && c2 === 0) { dp[r2][c2] = grid[0][0]; frames.push(draw(dp, [0, 0], null, `Start cell = ${grid[0][0]}.`)); } else if (r2 === 0) { dp[r2][c2] = dp[r2][c2 - 1] + grid[r2][c2]; frames.push(draw(dp, [r2, c2], [[r2, c2 - 1]], `Top row: ${dp[r2][c2 - 1]} + ${grid[r2][c2]} = <b>${dp[r2][c2]}</b>.`)); } else if (c2 === 0) { dp[r2][c2] = dp[r2 - 1][c2] + grid[r2][c2]; frames.push(draw(dp, [r2, c2], [[r2 - 1, c2]], `Left col: ${dp[r2 - 1][c2]} + ${grid[r2][c2]} = <b>${dp[r2][c2]}</b>.`)); } else { dp[r2][c2] = grid[r2][c2] + Math.min(dp[r2 - 1][c2], dp[r2][c2 - 1]); frames.push(draw(dp, [r2, c2], [[r2 - 1, c2], [r2, c2 - 1]], `${grid[r2][c2]} + min(${dp[r2 - 1][c2]}, ${dp[r2][c2 - 1]}) = <b>${dp[r2][c2]}</b>.`)); } }
      frames.push(draw(dp, [rows - 1, cols - 1], null, `Cheapest path sum = <b>${dp[rows - 1][cols - 1]}</b>.`));
    } else if (mode === "maximal-square") {
      var best = 0;
      frames.push(draw(dp, null, null, "Largest all-1 square. Each 1-cell stores the side of the biggest square ending there = 1 + min(top, left, top-left)."));
      for (var r3 = 0; r3 < rows; r3++) for (var c3 = 0; c3 < cols; c3++) { if (grid[r3][c3] === 0) { dp[r3][c3] = 0; frames.push(draw(dp, [r3, c3], null, `Cell is 0 → square side 0.`)); } else if (r3 === 0 || c3 === 0) { dp[r3][c3] = 1; best = Math.max(best, 1); frames.push(draw(dp, [r3, c3], null, `Edge 1-cell → side 1.`)); } else { dp[r3][c3] = 1 + Math.min(dp[r3 - 1][c3], dp[r3][c3 - 1], dp[r3 - 1][c3 - 1]); best = Math.max(best, dp[r3][c3]); frames.push(draw(dp, [r3, c3], [[r3 - 1, c3], [r3, c3 - 1], [r3 - 1, c3 - 1]], `1 + min(${dp[r3 - 1][c3]}, ${dp[r3][c3 - 1]}, ${dp[r3 - 1][c3 - 1]}) = <b>${dp[r3][c3]}</b>.`)); } }
      frames.push(draw(dp, null, null, `Largest side = ${best}, so area = <b>${best * best}</b>.`));
    } else { // lcs / edit-distance
      var isEdit = mode === "edit-distance";
      for (var i = 0; i < rows; i++) dp[i][0] = isEdit ? i : 0;
      for (var j = 0; j < cols; j++) dp[0][j] = isEdit ? j : 0;
      frames.push(draw(dp, null, null, isEdit ? "Edit distance: empty-prefix bases are 0..n (delete/insert all). Then fill by matching characters." : "LCS: empty-prefix row/col are 0. A character match extends the diagonal; else take the better neighbour."));
      for (var ii = 1; ii < rows; ii++) for (var jj = 1; jj < cols; jj++) { var match = A[ii - 1] === B[jj - 1]; if (isEdit) { dp[ii][jj] = match ? dp[ii - 1][jj - 1] : 1 + Math.min(dp[ii - 1][jj - 1], dp[ii - 1][jj], dp[ii][jj - 1]); frames.push(draw(dp, [ii, jj], match ? [[ii - 1, jj - 1]] : [[ii - 1, jj - 1], [ii - 1, jj], [ii, jj - 1]], match ? `'${A[ii - 1]}'='${B[jj - 1]}' → carry diagonal ${dp[ii - 1][jj - 1]}.` : `1 + min(diag ${dp[ii - 1][jj - 1]}, up ${dp[ii - 1][jj]}, left ${dp[ii][jj - 1]}) = <b>${dp[ii][jj]}</b>.`)); } else { dp[ii][jj] = match ? dp[ii - 1][jj - 1] + 1 : Math.max(dp[ii - 1][jj], dp[ii][jj - 1]); frames.push(draw(dp, [ii, jj], match ? [[ii - 1, jj - 1]] : [[ii - 1, jj], [ii, jj - 1]], match ? `'${A[ii - 1]}'='${B[jj - 1]}' → diagonal + 1 = <b>${dp[ii][jj]}</b>.` : `mismatch → max(up ${dp[ii - 1][jj]}, left ${dp[ii][jj - 1]}) = <b>${dp[ii][jj]}</b>.`)); } }
      frames.push(draw(dp, [rows - 1, cols - 1], null, `Answer (bottom-right) = <b>${dp[rows - 1][cols - 1]}</b>.`));
    }
    return frames;
  }

  /* ============================================================
     RENDERER — monotonic stack over bars (temps, next-greater, histogram, car-fleet)
     ============================================================ */
  function monoStack(cfg) {
    var a = cfg.data, mode = cfg.mode, n = a.length, W = 600, H = 200;
    var padX = 24, baseY = 132, topY = 26, maxV = Math.max.apply(null, a);
    var slot = (W - padX * 2) / n, barW = Math.min(slot * 0.6, 36);
    function bx(i) { return padX + i * slot + slot / 2; }
    function by(v) { return baseY - (v / maxV) * (baseY - topY); }
    function draw(curr, stack, ans, caption) {
      var s = line(padX, baseY, W - padX, baseY, { stroke: "var(--border)", sw: 1.5 });
      for (var i = 0; i < n; i++) {
        var onStack = stack.indexOf(i) >= 0, isCur = i === curr;
        var fill = isCur ? "var(--accent)" : onStack ? "var(--brand-soft)" : "var(--surface-hover)";
        var stroke = isCur ? "var(--accent)" : onStack ? "var(--accent)" : "var(--border)";
        s += rect(bx(i) - barW / 2, by(a[i]), barW, baseY - by(a[i]), { fill: fill, stroke: stroke, sw: 1.4, r: 3 });
        s += `<text x="${bx(i)}" y="${baseY + 14}" text-anchor="middle" fill="var(--text-faint)" style="font:500 10px var(--font-mono)">${a[i]}</text>`;
        if (ans && ans[i] != null) s += `<text x="${bx(i)}" y="${by(a[i]) - 5}" text-anchor="middle" fill="var(--c-success)" style="font:700 11px var(--font-sans)">${ans[i]}</text>`;
      }
      s += `<text x="${padX}" y="${H - 8}" fill="var(--text-muted)" style="font:600 11px var(--font-mono)">stack (indices): [${stack.join(", ")}]</text>`;
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="monotonic stack">${s}</svg>`, caption: caption };
    }
    var frames = [], stack = [];
    if (mode === "daily-temperatures" || mode === "next-greater") {
      var ans = new Array(n).fill(mode === "next-greater" ? -1 : 0);
      var label0 = mode === "next-greater" ? "Next greater element: keep a stack of indices waiting for a bigger value." : "Days until warmer: a monotonic stack of days waiting for a higher temperature.";
      frames.push(draw(-1, [], ans, label0));
      for (var i = 0; i < n; i++) {
        while (stack.length && a[stack[stack.length - 1]] < a[i]) { var j = stack.pop(); ans[j] = mode === "next-greater" ? a[i] : i - j; frames.push(draw(i, stack.slice(), ans, `${a[i]} &gt; ${a[j]} → it resolves index ${j} (${mode === "next-greater" ? "next greater = " + a[i] : "wait = " + (i - j) + " days"}). Pop it.`)); }
        stack.push(i);
        frames.push(draw(i, stack.slice(), ans, `Push index ${i} (value ${a[i]}) — it now waits for something bigger.`));
      }
      frames.push(draw(-1, stack.slice(), ans, `Anything left on the stack has no greater element ${mode === "next-greater" ? "(stays -1)" : "(stays 0)"}.`));
    } else if (mode === "histogram") {
      var best = 0, withSentinel = a.concat([0]);
      frames.push(draw(-1, [], null, "Largest rectangle: a stack of increasing bar indices. A shorter bar finalizes the rectangles of taller bars behind it."));
      for (var k = 0; k <= n; k++) {
        var h = k === n ? 0 : a[k];
        while (stack.length && a[stack[stack.length - 1]] > h) { var top = stack.pop(); var left = stack.length ? stack[stack.length - 1] : -1; var width = k - left - 1; var area = a[top] * width; best = Math.max(best, area); frames.push(draw(k === n ? -1 : k, stack.slice(), null, `Bar ${a[top]} can't extend past a shorter bar → rectangle height ${a[top]} × width ${width} = <b>${area}</b>. Best: ${best}.`)); }
        if (k < n) { stack.push(k); frames.push(draw(k, stack.slice(), null, `Push bar ${a[k]} (increasing).`)); }
      }
      frames.push(draw(-1, [], null, `Largest rectangle area = <b>${best}</b>.`));
    }
    return frames;
  }

  /* ============================================================
     RENDERER — linear DP (house robber, min-cost stairs, coin change)
     ============================================================ */
  function dpLinear(cfg) {
    var mode = cfg.mode, a = cfg.data, W = 600, H = 150;
    var labels, n;
    if (mode === "coin-change") { n = cfg.amount + 1; } else { n = a.length; }
    var grid = valueCells(new Array(n).fill(0).map(function (_, i) { return i; }), { W: W, y: 70, h: 36, maxCw: 48 });
    function draw(dp, cur, contrib, caption) {
      var s = "";
      for (var i = 0; i < n; i++) {
        var x = grid.x(i), isCur = i === cur, isCon = contrib && contrib.indexOf(i) >= 0;
        s += rect(x, grid.y, grid.cw, grid.h, { fill: isCur ? "var(--brand-soft)" : isCon ? "var(--c-info-bg)" : dp[i] != null ? "var(--c-success-bg)" : "var(--surface-2)", stroke: isCur ? "var(--accent)" : isCon ? "var(--accent)" : dp[i] != null ? "var(--c-success)" : "var(--border)", sw: isCur ? 2.2 : 1.2, r: 6 });
        s += `<text x="${x + grid.cw / 2}" y="${grid.y + grid.h / 2 + 5}" text-anchor="middle" fill="var(--text)" style="font:700 14px var(--font-sans)">${dp[i] == null ? "?" : dp[i]}</text>`;
        var sub = mode === "coin-change" ? i : a[i];
        s += `<text x="${x + grid.cw / 2}" y="${grid.y - 10}" text-anchor="middle" fill="var(--text-faint)" style="font:500 10px var(--font-mono)">${mode === "coin-change" ? i : sub}</text>`;
      }
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="linear dp">${s}</svg>`, caption: caption };
    }
    var dp = new Array(n).fill(null), frames = [];
    if (mode === "house-robber") {
      frames.push(draw(dp, -1, null, "Rob houses, no two adjacent. dp[i] = max(skip = dp[i-1], rob = nums[i] + dp[i-2])."));
      for (var i = 0; i < n; i++) { var rob = a[i] + (i >= 2 ? dp[i - 2] : 0); var skip = i >= 1 ? dp[i - 1] : 0; dp[i] = Math.max(rob, skip); frames.push(draw(dp.slice(), i, [i - 1, i - 2].filter(function (x) { return x >= 0; }), `House ${i} (${a[i]}): max(skip ${skip}, rob ${a[i]}+${i >= 2 ? dp[i - 2] : 0}) = <b>${dp[i]}</b>.`)); }
      frames.push(draw(dp.slice(), -1, null, `Max loot = <b>${dp[n - 1]}</b>.`));
    } else if (mode === "min-cost-stairs") {
      frames.push(draw(dp, -1, null, "dp[i] = min cost to reach step i = min(dp[i-1]+cost[i-1], dp[i-2]+cost[i-2]). Top is index n."));
      // here a is cost array, n = a.length, top handled separately
      var dp2 = new Array(n + 1).fill(null); dp2[0] = 0; dp2[1] = 0; n = a.length + 1;
      grid = valueCells(new Array(n).fill(0).map(function (_, i) { return i; }), { W: W, y: 70, h: 36, maxCw: 48 });
      frames = [draw0()];
      function draw0() { return draw2(dp2, -1, null, "dp[i] = min cost to reach step i. Start free on step 0 or 1; the 'top' is one past the last step."); }
      function draw2(d, cur, con, cap) { var s = ""; for (var i = 0; i < n; i++) { var x = grid.x(i); var isCur = i === cur, isCon = con && con.indexOf(i) >= 0; s += rect(x, grid.y, grid.cw, grid.h, { fill: isCur ? "var(--brand-soft)" : isCon ? "var(--c-info-bg)" : d[i] != null ? "var(--c-success-bg)" : "var(--surface-2)", stroke: isCur ? "var(--accent)" : isCon ? "var(--accent)" : d[i] != null ? "var(--c-success)" : "var(--border)", sw: isCur ? 2.2 : 1.2, r: 6 }); s += `<text x="${x + grid.cw / 2}" y="${grid.y + grid.h / 2 + 5}" text-anchor="middle" fill="var(--text)" style="font:700 14px var(--font-sans)">${d[i] == null ? "?" : d[i]}</text>`; s += `<text x="${x + grid.cw / 2}" y="${grid.y - 10}" text-anchor="middle" fill="var(--text-faint)" style="font:500 10px var(--font-mono)">dp${i}</text>`; } return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="linear dp">${s}</svg>`, caption: cap }; }
      for (var s2 = 2; s2 < n; s2++) { dp2[s2] = Math.min(dp2[s2 - 1] + a[s2 - 1], dp2[s2 - 2] + a[s2 - 2]); frames.push(draw2(dp2.slice(), s2, [s2 - 1, s2 - 2], `dp[${s2}] = min(${dp2[s2 - 1]}+${a[s2 - 1]}, ${dp2[s2 - 2]}+${a[s2 - 2]}) = <b>${dp2[s2]}</b>.`)); }
      frames.push(draw2(dp2.slice(), -1, null, `Min cost to the top = <b>${dp2[n - 1]}</b>.`));
    } else if (mode === "coin-change") {
      var coins = cfg.coins, amount = cfg.amount, INF = amount + 1;
      dp = new Array(amount + 1).fill(null); dp[0] = 0;
      frames.push(draw(dp.slice(), 0, null, `Fewest coins for each amount 0..${amount}. dp[a] = 1 + min over coins of dp[a−coin]. dp[0]=0.`));
      for (var amt = 1; amt <= amount; amt++) { var best = INF, from = []; coins.forEach(function (c) { if (c <= amt && dp[amt - c] != null && dp[amt - c] + 1 < best) { best = dp[amt - c] + 1; from = [amt - c]; } }); dp[amt] = best >= INF ? null : best; frames.push(draw(dp.slice(), amt, from, dp[amt] == null ? `Amount ${amt}: no coin combination yet.` : `dp[${amt}] = 1 + min(dp[${amt}−coin]) = <b>${dp[amt]}</b> coins.`)); }
      frames.push(draw(dp.slice(), -1, null, dp[amount] == null ? `Amount ${amount} is unreachable → <b>-1</b>.` : `Fewest coins for ${amount} = <b>${dp[amount]}</b>.`));
    } else if (mode === "lis") {
      frames.push(draw(dp, -1, null, "Longest increasing subsequence <i>ending at</i> each index: dp[i] = 1 + the best dp[j] among earlier j with nums[j] &lt; nums[i]."));
      var bestAll = 0;
      for (var li = 0; li < n; li++) {
        dp[li] = 1; var from2 = [];
        for (var lj = 0; lj < li; lj++) { if (a[lj] < a[li] && dp[lj] + 1 > dp[li]) { dp[li] = dp[lj] + 1; from2 = [lj]; } }
        bestAll = Math.max(bestAll, dp[li]);
        frames.push(draw(dp.slice(), li, from2, from2.length ? `nums[${li}]=${a[li]}: extend the best smaller-ending run (index ${from2[0]}, dp ${dp[from2[0]]}) → dp[${li}] = <b>${dp[li]}</b>. Best ${bestAll}.` : `nums[${li}]=${a[li]}: nothing smaller precedes it → dp[${li}] = <b>1</b>.`));
      }
      frames.push(draw(dp.slice(), -1, null, `Longest increasing subsequence = <b>${bestAll}</b> (the max over all dp[i]).`));
    }
    return frames;
  }

  /* ============================================================
     RENDERER — intervals on a number line (merge / overlap)
     ============================================================ */
  function intervalsMerge(cfg) {
    var pts = cfg.data.slice(), mode = cfg.mode;
    var sorted = pts.slice().sort(function (a, b) { return a[0] - b[0]; });
    var minV = Math.min.apply(null, pts.map(function (p) { return p[0]; }));
    var maxV = Math.max.apply(null, pts.map(function (p) { return p[1]; }));
    var span = (maxV - minV) || 1, W = 600, padL = 30, padR = 28, rowH = 26, topPad = 26;
    var H = topPad + (sorted.length + 2) * rowH + 24, axisY = H - 16;
    function X(v) { return padL + (v - minV) / span * (W - padL - padR); }
    function bar(y, s, e, fill, stroke, lab) { var x1 = X(s), x2 = X(e); return rect(x1, y, Math.max(x2 - x1, 3), 15, { fill: fill, stroke: stroke, sw: 1.3, r: 4 }) + `<text x="${(x1 + x2) / 2}" y="${y + 11}" text-anchor="middle" fill="${lab}" style="font:600 10px var(--font-sans)">[${s},${e}]</text>`; }
    function frame(curIdx, merged, caption, mergedStyle) {
      var s = line(X(minV) - 4, axisY, X(maxV) + 4, axisY, { stroke: "var(--border)", sw: 1.5 });
      sorted.forEach(function (iv, i) {
        var y = topPad + i * rowH;
        var st = i === curIdx ? ["var(--brand-soft)", "var(--accent)", "var(--accent)"] : i < curIdx ? ["var(--surface-2)", "var(--border-soft)", "var(--text-faint)"] : ["var(--surface-2)", "var(--border)", "var(--text-muted)"];
        s += bar(y, iv[0], iv[1], st[0], st[1], st[2]);
      });
      (merged || []).forEach(function (m, i) {
        var y = topPad + (sorted.length + 0.3) * rowH + i * rowH;
        s += bar(y, m[0], m[1], "var(--c-success-bg)", "var(--c-success)", "var(--c-success)");
      });
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="intervals">${s}</svg>`, caption: caption };
    }
    var frames = [];
    if (mode === "merge") {
      frames.push(frame(-1, [], "Sort intervals by start. Then sweep: if the next overlaps the last merged one, extend it; otherwise start a new merged interval."));
      var merged = [];
      sorted.forEach(function (iv, i) {
        if (!merged.length || iv[0] > merged[merged.length - 1][1]) { merged.push(iv.slice()); frames.push(frame(i, merged.map(function (m) { return m.slice(); }), `[${iv[0]},${iv[1]}] doesn't overlap the last merged interval → start a new one.`)); }
        else { var last = merged[merged.length - 1]; last[1] = Math.max(last[1], iv[1]); frames.push(frame(i, merged.map(function (m) { return m.slice(); }), `[${iv[0]},${iv[1]}] overlaps → extend the last merged interval to end ${last[1]}.`)); }
      });
      frames.push(frame(-1, merged.map(function (m) { return m.slice(); }), `Merged result: ${merged.map(function (m) { return "[" + m[0] + "," + m[1] + "]"; }).join(", ")}.`));
    } else if (mode === "meeting-rooms") {
      frames.push(frame(-1, [], "Can one person attend all meetings? Sort by start; if any meeting begins before the previous ends, they overlap → impossible."));
      var okAll = true;
      for (var i = 1; i < sorted.length; i++) { var conflict = sorted[i][0] < sorted[i - 1][1]; if (conflict) { okAll = false; frames.push(frame(i, [], `[${sorted[i][0]},${sorted[i][1]}] starts before the previous meeting ends (${sorted[i - 1][1]}) → <b>overlap</b>.`)); break; } frames.push(frame(i, [], `[${sorted[i][0]},${sorted[i][1]}] starts after ${sorted[i - 1][1]} → no conflict so far.`)); }
      if (okAll) frames.push(frame(-1, [], "No two meetings overlap → <b>true</b>, all can be attended."));
    } else if (mode === "non-overlapping") {
      var byEnd = pts.slice().sort(function (a, b) { return a[1] - b[1]; });
      sorted = byEnd;
      frames.push(frame(-1, [], "Remove the fewest intervals so none overlap. Sort by END; greedily keep each interval that starts at/after the last kept end."));
      var removed = 0, lastEnd = -Infinity, kept = [];
      byEnd.forEach(function (iv, i) { if (iv[0] >= lastEnd) { lastEnd = iv[1]; kept.push(iv); frames.push(frame(i, kept.map(function (m) { return m.slice(); }), `[${iv[0]},${iv[1]}] starts ≥ last kept end → <b>keep</b> it.`)); } else { removed++; frames.push(frame(i, kept.map(function (m) { return m.slice(); }), `[${iv[0]},${iv[1]}] overlaps the last kept → <b>remove</b> it. Removed: ${removed}.`)); } });
      frames.push(frame(-1, kept.map(function (m) { return m.slice(); }), `Minimum removals = <b>${removed}</b>.`));
    } else if (mode === "insert") {
      var nw = cfg.insert;
      frames.push(frame(-1, [], `Insert [${nw[0]},${nw[1]}] into a sorted list and merge. Emit intervals that end before it, fold overlaps into it, then emit the rest.`));
      var res = [], ni = nw.slice(), i2 = 0;
      while (i2 < sorted.length && sorted[i2][1] < ni[0]) { res.push(sorted[i2]); frames.push(frame(i2, res.map(function (m) { return m.slice(); }), `[${sorted[i2][0]},${sorted[i2][1]}] ends before the new interval → keep as-is.`)); i2++; }
      while (i2 < sorted.length && sorted[i2][0] <= ni[1]) { ni[0] = Math.min(ni[0], sorted[i2][0]); ni[1] = Math.max(ni[1], sorted[i2][1]); frames.push(frame(i2, res.concat([ni.slice()]).map(function (m) { return m.slice(); }), `[${sorted[i2][0]},${sorted[i2][1]}] overlaps → widen the new interval to [${ni[0]},${ni[1]}].`)); i2++; }
      res.push(ni);
      while (i2 < sorted.length) { res.push(sorted[i2]); i2++; }
      frames.push(frame(-1, res.map(function (m) { return m.slice(); }), `Result: ${res.map(function (m) { return "[" + m[0] + "," + m[1] + "]"; }).join(", ")}.`));
    }
    return frames;
  }

  /* ============================================================
     RENDERER — linked list (cycle, middle, merge, remove-nth,
     palindrome, reorder, add-two-numbers, swap-pairs, intersection)
     ============================================================ */
  function linkedList(cfg) {
    var mode = cfg.mode, W = 600;
    function lay(vals, y) {
      var n = vals.length, nw = 42, h = 32;
      var gap = Math.min((W - 70 - nw * n) / (n > 1 ? n - 1 : 1), 36);
      var total = nw * n + gap * (n - 1), sx = (W - total) / 2;
      return { n: n, y: y, h: h, nw: nw, gap: gap, sx: sx, vals: vals,
        x: function (i) { return sx + i * (nw + gap); },
        cx: function (i) { return sx + i * (nw + gap) + nw / 2; } };
    }
    function fwd(x1, x2, yy, color) {
      return line(x1, yy, x2 - 2, yy, { stroke: color, sw: 1.6 })
        + `<path d="M${x2} ${yy} l-7 -4 l0 8 z" fill="${color}"/>`;
    }
    function node(L, i, st) {
      st = st || {}; var op = st.op != null ? st.op : 1;
      return rect(L.x(i), L.y, L.nw, L.h, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: st.sw || 1.3, r: 8, op: op })
        + `<text x="${L.cx(i)}" y="${L.y + L.h / 2 + 5}" text-anchor="middle" fill="${st.lab || "var(--text)"}" opacity="${op}" style="font:700 14px var(--font-sans)">${L.vals[i]}</text>`;
    }
    function ptr(L, i, label, color, below) {
      if (i < 0 || i >= L.n) return "";
      var y = below ? L.y + L.h + 17 : L.y - 9;
      return `<text x="${L.cx(i)}" y="${y}" text-anchor="middle" fill="${color}" style="font:700 11px var(--font-sans)">${label}</text>`;
    }
    function svg(H, inner, cap) { return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="linked list">${inner}</svg>`, caption: cap }; }
    var frames = [];

    if (mode === "cycle" || mode === "middle") {
      var vals = cfg.data, n = vals.length, H = 178;
      var pos = mode === "cycle" ? cfg.pos : -1;
      var nxt = function (i) { return i < 0 ? -1 : (i === n - 1 ? pos : i + 1); };
      var L = lay(vals, 66);
      function base(slow, fast, cap) {
        var inner = "";
        for (var i = 0; i < n - 1; i++) inner += fwd(L.x(i) + L.nw + 3, L.x(i + 1) - 3, L.y + L.h / 2, "var(--border)");
        if (pos >= 0) {
          var x1 = L.cx(n - 1), x2 = L.cx(pos), yb = L.y + L.h;
          inner += `<path d="M${x1} ${yb} C ${x1} ${yb + 50}, ${x2} ${yb + 50}, ${x2} ${yb + 4}" fill="none" stroke="var(--c-warning)" stroke-width="1.6"/>`;
          inner += `<path d="M${x2} ${yb + 4} l-4 9 l8 0 z" fill="var(--c-warning)"/>`;
        } else {
          inner += fwd(L.x(n - 1) + L.nw + 3, L.x(n - 1) + L.nw + 22, L.y + L.h / 2, "var(--border)");
          inner += `<text x="${L.x(n - 1) + L.nw + 30}" y="${L.y + L.h / 2 + 4}" fill="var(--text-faint)" style="font:600 12px var(--font-mono)">∅</text>`;
        }
        for (var j = 0; j < n; j++) {
          var st = {};
          if (j === slow && j === fast) st = { fill: "var(--c-success-bg)", stroke: "var(--c-success)", sw: 2.6, lab: "var(--c-success)" };
          else if (j === slow) st = { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" };
          else if (j === fast) st = { fill: "var(--c-info-bg)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" };
          inner += node(L, j, st);
        }
        inner += ptr(L, slow, "slow", "var(--accent)", false);
        if (fast >= 0 && fast !== slow) inner += ptr(L, fast, "fast", "var(--accent)", true);
        return svg(H, inner, cap);
      }
      var slow = 0, fast = 0, guard = 0;
      if (mode === "cycle") {
        frames.push(base(0, 0, "Floyd's tortoise &amp; hare: <b>slow</b> moves 1 step, <b>fast</b> moves 2. If there's a loop, the fast pointer laps the slow one and they collide."));
        while (guard++ < 30) {
          slow = nxt(slow); fast = nxt(nxt(fast));
          if (fast < 0) { frames.push(base(slow, -1, "fast ran off the end into ∅ — <b>no cycle</b>.")); break; }
          if (slow === fast) { frames.push(base(slow, fast, `slow and fast both land on <b>${vals[slow]}</b> — they met, so a <b>cycle exists</b>.`)); break; }
          frames.push(base(slow, fast, `slow → <b>${vals[slow]}</b>, fast → <b>${vals[fast]}</b>. Not equal yet, keep stepping.`));
        }
      } else {
        frames.push(base(0, 0, "Find the middle in one pass: <b>fast</b> goes twice as quick as <b>slow</b>. When fast reaches the end, slow sits exactly halfway."));
        while (fast >= 0 && nxt(fast) >= 0 && guard++ < 30) {
          slow = nxt(slow); fast = nxt(nxt(fast));
          frames.push(base(slow, fast, `slow → <b>${vals[slow]}</b>, fast → <b>${fast < 0 ? "∅" : vals[fast]}</b>.`));
        }
        frames.push(base(slow, -1, `fast hit the end, so <b>slow</b> is at the middle node <b>${vals[slow]}</b>.`));
      }
      return frames;
    }

    if (mode === "merge" || mode === "add") {
      var A = cfg.a, B = cfg.b, H = 214;
      var LA = lay(A, 40), LB = lay(B, 96);
      function rowArrows(L) { var s = ""; for (var i = 0; i < L.n - 1; i++) s += fwd(L.x(i) + L.nw + 3, L.x(i + 1) - 3, L.y + L.h / 2, "var(--border)"); return s; }
      function frame(i, j, res, resHi, cap, carry) {
        var inner = "";
        inner += `<text x="20" y="${LA.y + LA.h / 2 + 4}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">L1</text>`;
        inner += `<text x="20" y="${LB.y + LB.h / 2 + 4}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">L2</text>`;
        inner += rowArrows(LA) + rowArrows(LB);
        for (var a = 0; a < LA.n; a++) inner += node(LA, a, a === i ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" } : a < i ? { op: 0.4 } : {});
        for (var b = 0; b < LB.n; b++) inner += node(LB, b, b === j ? { fill: "var(--c-info-bg)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" } : b < j ? { op: 0.4 } : {});
        if (res.length) {
          var LR = lay(res, 160);
          inner += `<text x="20" y="${LR.y + LR.h / 2 + 4}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">out</text>`;
          inner += rowArrows(LR);
          for (var r = 0; r < LR.n; r++) inner += node(LR, r, r === resHi ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", sw: 2.2, lab: "var(--c-success)" } : { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" });
        }
        if (carry != null) inner += `<text x="${W - 20}" y="18" text-anchor="end" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">carry = ${carry}</text>`;
        return svg(H, inner, cap);
      }
      if (mode === "merge") {
        frames.push(frame(0, 0, [], -1, "Two sorted lists. Compare the heads; splice the <b>smaller</b> one onto the result and advance only that pointer. Repeat."));
        var i = 0, j = 0, res = [];
        while (i < A.length && j < B.length) {
          if (A[i] <= B[j]) { res.push(A[i]); frames.push(frame(i, j, res.slice(), res.length - 1, `${A[i]} ≤ ${B[j]} → take <b>${A[i]}</b> from L1, advance its pointer.`)); i++; }
          else { res.push(B[j]); frames.push(frame(i, j, res.slice(), res.length - 1, `${B[j]} &lt; ${A[i]} → take <b>${B[j]}</b> from L2, advance its pointer.`)); j++; }
        }
        while (i < A.length) { res.push(A[i]); frames.push(frame(i, j, res.slice(), res.length - 1, `L2 is exhausted → append the rest of L1: <b>${A[i]}</b>.`)); i++; }
        while (j < B.length) { res.push(B[j]); frames.push(frame(i, j, res.slice(), res.length - 1, `L1 is exhausted → append the rest of L2: <b>${B[j]}</b>.`)); j++; }
        frames.push(frame(-1, -1, res.slice(), -1, `Merged, still sorted: [${res.join(", ")}].`));
      } else {
        frames.push(frame(-1, -1, [], -1, "Digits are stored least-significant first, so we add left to right like grade-school addition, carrying as we go.", 0));
        var carry = 0, res2 = [], k = 0;
        while (k < A.length || k < B.length || carry) {
          var da = k < A.length ? A[k] : 0, db = k < B.length ? B[k] : 0, sum = da + db + carry;
          res2.push(sum % 10); var nc = Math.floor(sum / 10);
          frames.push(frame(k < A.length ? k : -1, k < B.length ? k : -1, res2.slice(), res2.length - 1, `${da} + ${db} + carry ${carry} = ${sum} → write <b>${sum % 10}</b>, carry ${nc}.`, nc));
          carry = nc; k++;
        }
        frames.push(frame(-1, -1, res2.slice(), -1, `Result digits (still least-significant first): [${res2.join(", ")}].`, 0));
      }
      return frames;
    }

    if (mode === "remove-nth") {
      var vals2 = cfg.data, n2 = vals2.length, nth = cfg.nth, H2 = 150, L2 = lay(vals2, 60);
      function fr(slow, fast, removed, cap) {
        var inner = "";
        for (var i = 0; i < n2 - 1; i++) { if (removed >= 0 && (i === removed - 1)) { inner += fwd(L2.x(i) + L2.nw + 3, L2.x(i + 2 <= n2 - 1 ? i + 2 : n2 - 1) - 3, L2.y + L2.h / 2, "var(--c-success)"); } else if (i !== removed) inner += fwd(L2.x(i) + L2.nw + 3, L2.x(i + 1) - 3, L2.y + L2.h / 2, "var(--border)"); }
        for (var j = 0; j < n2; j++) {
          var st = {};
          if (j === removed) st = { fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", sw: 2.2, lab: "var(--c-warning)", op: 0.85 };
          else if (j === slow) st = { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" };
          else if (j === fast) st = { fill: "var(--c-info-bg)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" };
          inner += node(L2, j, st);
        }
        inner += ptr(L2, slow, "slow", "var(--accent)", false);
        inner += ptr(L2, fast, "fast", "var(--accent)", true);
        return svg(H2, inner, cap);
      }
      frames.push(fr(0, 0, -1, `Remove the <b>${nth}th node from the end</b> in one pass. First send <b>fast</b> ${nth} nodes ahead, then move both together.`));
      var slow2 = 0, fast2 = 0;
      for (var s = 0; s < nth; s++) { fast2++; frames.push(fr(slow2, fast2, -1, `Advance fast ${s + 1}/${nth} → now ${nth - (s + 1)} more to go.`)); }
      while (fast2 < n2 - 1) { fast2++; slow2++; frames.push(fr(slow2, fast2, -1, `Move both: fast at <b>${vals2[fast2]}</b>, slow at <b>${vals2[slow2]}</b>. The gap stays ${nth}.`)); }
      frames.push(fr(slow2, fast2, slow2 + 1, `fast is at the last node, so slow's next — <b>${vals2[slow2 + 1]}</b> — is the target. Relink slow past it to delete it.`));
      return frames;
    }

    if (mode === "palindrome") {
      var v = cfg.data, n3 = v.length, H3 = 140, L3 = lay(v, 56);
      function fp(l, r, st, cap) {
        var inner = "";
        for (var i = 0; i < n3 - 1; i++) inner += fwd(L3.x(i) + L3.nw + 3, L3.x(i + 1) - 3, L3.y + L3.h / 2, "var(--border)");
        for (var j = 0; j < n3; j++) inner += node(L3, j, (st && st[j]) ? st[j] : (j < l || j > r) ? { op: 0.35 } : {});
        inner += ptr(L3, l, "L", "var(--accent)", false); inner += ptr(L3, r, "R", "var(--accent)", true);
        return svg(H3, inner, cap);
      }
      frames.push(fp(0, n3 - 1, null, "Find the middle with fast/slow, reverse the second half, then walk one pointer from each end inward comparing values — O(1) extra space."));
      var l = 0, r = n3 - 1;
      while (l < r) {
        var st = {}; var ok = v[l] === v[r];
        st[l] = { fill: ok ? "var(--brand-soft)" : "var(--c-warning-bg)", stroke: ok ? "var(--accent)" : "var(--c-warning)", sw: 2.2, lab: ok ? "var(--accent)" : "var(--c-warning)" };
        st[r] = st[l];
        if (!ok) { frames.push(fp(l, r, st, `${v[l]} ≠ ${v[r]} → <b>not a palindrome</b>.`)); return frames; }
        frames.push(fp(l, r, st, `${v[l]} = ${v[r]} ✓ — move both inward.`)); l++; r--;
      }
      frames.push(fp(l, r, null, "Every mirrored pair matched → <b>it's a palindrome</b>."));
      return frames;
    }

    if (mode === "swap-pairs" || mode === "reorder") {
      var v2 = cfg.data, H4 = 150;
      function fr2(arr, hi, dim, cap) {
        var L4 = lay(arr, 60), inner = "";
        for (var i = 0; i < arr.length - 1; i++) inner += fwd(L4.x(i) + L4.nw + 3, L4.x(i + 1) - 3, L4.y + L4.h / 2, "var(--border)");
        for (var j = 0; j < arr.length; j++) inner += node(L4, j, (hi && hi.indexOf(j) >= 0) ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" } : (dim && dim.indexOf(j) >= 0) ? { op: 0.4 } : {});
        return svg(H4, inner, cap);
      }
      if (mode === "swap-pairs") {
        var arr = v2.slice();
        frames.push(fr2(arr.slice(), [], null, "Swap each adjacent pair by relinking pointers (not copying values). Walk two nodes at a time."));
        for (var i = 0; i + 1 < arr.length; i += 2) {
          frames.push(fr2(arr.slice(), [i, i + 1], null, `Pair (<b>${arr[i]}</b>, <b>${arr[i + 1]}</b>) — relink so ${arr[i + 1]} comes first.`));
          var t = arr[i]; arr[i] = arr[i + 1]; arr[i + 1] = t;
          frames.push(fr2(arr.slice(), [i, i + 1], null, `Swapped → ${arr[i]} now precedes ${arr[i + 1]}.`));
        }
        frames.push(fr2(arr.slice(), [], null, `All pairs swapped: [${arr.join(", ")}].`));
      } else {
        frames.push(fr2(v2.slice(), [], null, "Reorder L0→Ln→L1→Ln-1→… in three moves: find the middle, reverse the second half, then weave the two halves together."));
        var mid = Math.ceil(v2.length / 2);
        var front = v2.slice(0, mid), back = v2.slice(mid).reverse();
        frames.push(fr2(v2.slice(), v2.map(function (_, i) { return i; }).slice(mid), v2.map(function (_, i) { return i; }).slice(0, mid), `Split at the middle: front [${front.join(", ")}], and reverse the back half → [${back.join(", ")}].`));
        var res = [], fi = 0, bi = 0, take = "front";
        while (fi < front.length || bi < back.length) {
          if (take === "front" && fi < front.length) { res.push(front[fi++]); take = "back"; }
          else if (bi < back.length) { res.push(back[bi++]); take = "front"; }
          else if (fi < front.length) { res.push(front[fi++]); }
          frames.push(fr2(res.slice(), [res.length - 1], null, `Weave: append <b>${res[res.length - 1]}</b>, alternating front and reversed-back.`));
        }
        frames.push(fr2(res.slice(), [], null, `Reordered: [${res.join(", ")}].`));
      }
      return frames;
    }

    if (mode === "intersection") {
      var A2 = cfg.a, B2 = cfg.b, sh = cfg.shared, H5 = 220;
      var ay = 44, by2 = 156, shy = 100, nw = 40, gap = 16;
      var ax = function (i) { return 70 + i * (nw + gap); };
      var bx = function (i) { return 70 + i * (nw + gap); };
      var shx = function (i) { return 330 + i * (nw + gap); };
      function drawN(x, y, val, st) { st = st || {}; return rect(x, y, nw, 30, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: st.sw || 1.3, r: 8 }) + `<text x="${x + nw / 2}" y="${y + 20}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 13px var(--font-sans)">${val}</text>`; }
      function coord(tag, k) { if (tag === "a") return [ax(k) + nw / 2, ay + 15]; if (tag === "b") return [bx(k) + nw / 2, by2 + 15]; return [shx(k) + nw / 2, shy + 15]; }
      // build the two traversal paths as [tag, index]
      var pathA = []; A2.forEach(function (_, i) { pathA.push(["a", i]); }); sh.forEach(function (_, i) { pathA.push(["s", i]); }); B2.forEach(function (_, i) { pathA.push(["b", i]); }); sh.forEach(function (_, i) { pathA.push(["s", i]); });
      var pathB = []; B2.forEach(function (_, i) { pathB.push(["b", i]); }); sh.forEach(function (_, i) { pathB.push(["s", i]); }); A2.forEach(function (_, i) { pathB.push(["a", i]); }); sh.forEach(function (_, i) { pathB.push(["s", i]); });
      function frame(k, met, cap) {
        var inner = "";
        for (var i = 0; i < A2.length - 1; i++) inner += fwd(ax(i) + nw + 2, ax(i + 1) - 2, ay + 15, "var(--border)");
        for (var i2 = 0; i2 < B2.length - 1; i2++) inner += fwd(bx(i2) + nw + 2, bx(i2 + 1) - 2, by2 + 15, "var(--border)");
        for (var i3 = 0; i3 < sh.length - 1; i3++) inner += fwd(shx(i3) + nw + 2, shx(i3 + 1) - 2, shy + 15, "var(--border)");
        inner += fwd(ax(A2.length - 1) + nw + 2, shx(0) - 2, ay + 22, "var(--border)");
        inner += fwd(bx(B2.length - 1) + nw + 2, shx(0) - 2, by2 + 8, "var(--border)");
        var pa = k < pathA.length ? pathA[k] : null, pb = k < pathB.length ? pathB[k] : null;
        function stOf(tag, idx) {
          var isA = pa && pa[0] === tag && pa[1] === idx, isB = pb && pb[0] === tag && pb[1] === idx;
          if (met && tag === "s" && idx === 0) return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", sw: 2.6, lab: "var(--c-success)" };
          if (isA && isB) return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", sw: 2.6, lab: "var(--c-success)" };
          if (isA) return { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" };
          if (isB) return { fill: "var(--c-info-bg)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" };
          return {};
        }
        A2.forEach(function (val, i) { inner += drawN(ax(i), ay, val, stOf("a", i)); });
        B2.forEach(function (val, i) { inner += drawN(bx(i), by2, val, stOf("b", i)); });
        sh.forEach(function (val, i) { inner += drawN(shx(i), shy, val, stOf("s", i)); });
        if (pa) { var c = coord(pa[0], pa[1]); inner += `<text x="${c[0]}" y="${pa[0] === "b" ? c[1] + 30 : c[1] - 22}" text-anchor="middle" fill="var(--accent)" style="font:700 11px var(--font-sans)">pA</text>`; }
        if (pb) { var c2 = coord(pb[0], pb[1]); inner += `<text x="${c2[0]}" y="${pb[0] === "a" ? c2[1] - 22 : c2[1] + 30}" text-anchor="middle" fill="var(--accent)" style="font:700 11px var(--font-sans)">pB</text>`; }
        return svg(H5, inner, cap);
      }
      frames.push(frame(0, false, "Two lists that share a tail. Walk pA on A and pB on B; when one hits the end, redirect it to the <b>other</b> list's head. They travel equal total length and meet at the join."));
      var meet = -1;
      for (var k = 0; k < pathA.length; k++) {
        if (pathA[k][0] === pathB[k][0] && pathA[k][1] === pathB[k][1]) { meet = k; frames.push(frame(k, true, `pA and pB both reach node <b>${sh[0]}</b> — that's the <b>intersection</b>.`)); break; }
        frames.push(frame(k, false, `pA → ${pathA[k][0] === "s" ? sh[pathA[k][1]] : pathA[k][0] === "a" ? A2[pathA[k][1]] : B2[pathA[k][1]]}, pB → ${pathB[k][0] === "s" ? sh[pathB[k][1]] : pathB[k][0] === "a" ? A2[pathB[k][1]] : B2[pathB[k][1]]}. Keep walking.`));
      }
      return frames;
    }
    return frames;
  }

  /* ============================================================
     RENDERER — backtracking decision tree (subsets, permutations,
     combinations, combination-sum, parentheses, letters, partition)
     ============================================================ */
  function backtracking(cfg) {
    var mode = cfg.mode, W = 600, top = 26, levelH = 50;
    function isPal(s) { for (var i = 0, j = s.length - 1; i < j; i++, j--) if (s[i] !== s[j]) return false; return true; }
    var root;
    if (mode === "subsets" || mode === "subsets-ii") {
      var nums = cfg.data.slice(); if (mode === "subsets-ii") nums.sort(function (a, b) { return a - b; });
      root = { box: "∅", path: [], sol: true, children: [] };
      (function rec(node, start) {
        for (var i = start; i < nums.length; i++) {
          if (mode === "subsets-ii" && i > start && nums[i] === nums[i - 1]) { node.children.push({ box: "skip", pruned: true, children: [], edge: nums[i] }); continue; }
          var p = node.path.concat(nums[i]);
          var child = { box: "{" + p.join(",") + "}", path: p, sol: true, children: [], edge: "+" + nums[i] };
          node.children.push(child); rec(child, i + 1);
        }
      })(root, 0);
    } else if (mode === "permutations" || mode === "permutations-ii") {
      var nums2 = cfg.data.slice(); if (mode === "permutations-ii") nums2.sort(function (a, b) { return a - b; });
      root = { box: "∅", path: [], children: [] };
      (function rec(node, used) {
        if (node.path.length === nums2.length) { node.sol = true; node.box = node.path.join(""); return; }
        for (var i = 0; i < nums2.length; i++) {
          if (used[i]) continue;
          if (mode === "permutations-ii" && i > 0 && nums2[i] === nums2[i - 1] && !used[i - 1]) { node.children.push({ box: "skip", pruned: true, children: [], edge: nums2[i] }); continue; }
          var u = used.slice(); u[i] = true; var p = node.path.concat(nums2[i]);
          var child = { box: p.join(""), path: p, children: [], edge: "+" + nums2[i] };
          node.children.push(child); rec(child, u);
        }
      })(root, nums2.map(function () { return false; }));
    } else if (mode === "combinations") {
      var nn = cfg.n, kk = cfg.k;
      root = { box: "∅", path: [], children: [] };
      (function rec(node, start) {
        if (node.path.length === kk) { node.sol = true; node.box = "{" + node.path.join(",") + "}"; return; }
        for (var i = start; i <= nn; i++) { var p = node.path.concat(i); var child = { box: "{" + p.join(",") + "}", path: p, children: [], edge: "+" + i }; node.children.push(child); rec(child, i + 1); }
      })(root, 1);
    } else if (mode === "combination-sum" || mode === "combination-sum-ii") {
      var cands = cfg.data.slice().sort(function (a, b) { return a - b; }), target = cfg.target;
      root = { box: "0", path: [], sum: 0, children: [] };
      (function rec(node, start) {
        for (var i = start; i < cands.length; i++) {
          if (mode === "combination-sum-ii" && i > start && cands[i] === cands[i - 1]) { node.children.push({ box: "skip", pruned: true, children: [], edge: cands[i] }); continue; }
          var ns = node.sum + cands[i];
          if (ns > target) { node.children.push({ box: "✗", pruned: true, children: [], edge: "+" + cands[i] }); continue; }
          var p = node.path.concat(cands[i]);
          var child = { box: "" + ns, path: p, sum: ns, children: [], edge: "+" + cands[i], sol: ns === target };
          node.children.push(child);
          if (ns < target) rec(child, mode === "combination-sum-ii" ? i + 1 : i);
        }
      })(root, 0);
    } else if (mode === "gen-parens") {
      var gn = cfg.n;
      root = { box: "ε", s: "", open: 0, close: 0, children: [] };
      (function rec(node) {
        if (node.s.length === 2 * gn) { node.sol = true; node.box = node.s; return; }
        if (node.open < gn) { var c = { box: node.s + "(", s: node.s + "(", open: node.open + 1, close: node.close, children: [], edge: "(" }; node.children.push(c); rec(c); }
        if (node.close < node.open) { var c2 = { box: node.s + ")", s: node.s + ")", open: node.open, close: node.close + 1, children: [], edge: ")" }; node.children.push(c2); rec(c2); }
      })(root);
    } else if (mode === "letter-combos") {
      var MAP = { "2": "abc", "3": "def", "4": "ghi", "5": "jkl", "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz" };
      var digits = cfg.digits;
      root = { box: "ε", s: "", children: [] };
      (function rec(node, idx) {
        if (idx === digits.length) { node.sol = true; node.box = node.s; return; }
        var letters = MAP[digits[idx]];
        for (var c = 0; c < letters.length; c++) { var ch = letters[c]; var child = { box: node.s + ch, s: node.s + ch, children: [], edge: ch }; node.children.push(child); rec(child, idx + 1); }
      })(root, 0);
    } else { // palindrome-partition
      var str = cfg.s;
      root = { box: "ε", pieces: [], i: 0, children: [] };
      (function rec(node) {
        if (node.i === str.length) { node.sol = true; node.box = node.pieces.join("|"); return; }
        for (var end = node.i + 1; end <= str.length; end++) {
          var piece = str.slice(node.i, end);
          if (!isPal(piece)) { node.children.push({ box: "✗" + piece, pruned: true, children: [], edge: piece }); continue; }
          var pc = node.pieces.concat(piece);
          var child = { box: pc.join("|"), pieces: pc, i: end, children: [], edge: piece };
          node.children.push(child); rec(child);
        }
      })(root);
    }

    // layout (n-ary): x by leaf order, y by depth
    var leaves = 0, maxD = 0, all = [];
    (function assign(node, d, parent) {
      node._d = d; node._parent = parent; maxD = Math.max(maxD, d); all.push(node);
      if (!node.children.length) { node._x = leaves++; }
      else { node.children.forEach(function (c) { assign(c, d + 1, node); }); node._x = (node.children[0]._x + node.children[node.children.length - 1]._x) / 2; }
    })(root, 0, null);
    var H = top + maxD * levelH + 26;
    var pad = 26, span = (W - 2 * pad) / Math.max(leaves, 1);
    function X(n) { return pad + (n._x + 0.5) * span; }
    function Y(n) { return top + n._d * levelH; }

    function render(cur) {
      var path = []; var p = cur; while (p) { path.push(p); p = p._parent; }
      var s = "";
      all.forEach(function (n) { n.children.forEach(function (c) { s += line(X(n), Y(n) + 11, X(c), Y(c) - 11, { stroke: "var(--border)", sw: 1.1 }); if (c.edge) s += `<text x="${(X(n) + X(c)) / 2 + 5}" y="${(Y(n) + Y(c)) / 2 + 3}" fill="var(--text-faint)" style="font:600 9px var(--font-mono)">${c.edge}</text>`; }); });
      all.forEach(function (n) {
        var inPath = path.indexOf(n) >= 0;
        var fill = "var(--surface-2)", stroke = "var(--border)", lab = "var(--text-muted)", op = 1, sw = 1.2;
        if (n.pruned) { stroke = "var(--border-soft)"; lab = "var(--text-faint)"; op = 0.5; }
        else if (inPath) { fill = "var(--brand-soft)"; stroke = "var(--accent)"; lab = "var(--accent)"; sw = 2.2; }
        else if (n._solDone) { fill = "var(--c-success-bg)"; stroke = "var(--c-success)"; lab = "var(--c-success)"; }
        else if (n._visited) { op = 0.5; }
        var t = n.box, w = Math.max(20, t.length * 6.4 + 10);
        s += rect(X(n) - w / 2, Y(n) - 10, w, 20, { fill: fill, stroke: stroke, sw: sw, r: 6, op: op });
        s += `<text x="${X(n)}" y="${Y(n) + 4}" text-anchor="middle" fill="${lab}" opacity="${op}" style="font:700 9.5px var(--font-mono)">${t}</text>`;
      });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="backtracking tree">${s}</svg>`;
    }

    var frames = [], found = [];
    frames.push({ svg: render(root), caption: "Backtracking explores a <b>decision tree</b>: each level makes one choice, and we DFS down every branch, recording complete solutions and pruning dead ends." });
    (function dfs(node) {
      if (node.pruned) { frames.push({ svg: render(node), caption: node.box === "skip" ? `Skip the duplicate <b>${node.edge}</b> at this level — it would repeat a branch already taken.` : `Prune <b>${node.edge}</b>: it overshoots or isn't valid, so stop exploring here.` }); node._visited = true; return; }
      if (node.sol) { found.push(node.box); node._solDone = true; frames.push({ svg: render(node), caption: `Complete solution <b>${node.box}</b> — record it. Found so far: ${found.length}.` }); node._visited = true; return; }
      frames.push({ svg: render(node), caption: node._parent ? `Choose <b>${node.edge}</b> → partial <b>${node.box}</b>. Recurse on the remaining options.` : "Start from the empty choice and branch on each option." });
      node.children.forEach(dfs);
      node._visited = true;
    })(root);
    root._solDone = root.sol; root._visited = false;
    frames.push({ svg: render(null), caption: `Every branch explored. <b>${found.length}</b> result${found.length === 1 ? "" : "s"}: ${found.join("   ")}` });
    return frames;
  }

  /* ============================================================
     RENDERER — heap / priority queue (kth-largest, stream, last-stone,
     k-closest, top-k-frequent, median, task-scheduler)
     ============================================================ */
  function heapViz(cfg) {
    var mode = cfg.mode, W = 600;
    function makeHeap(cmp) {
      var a = [];
      function up(i) { while (i > 0) { var p = (i - 1) >> 1; if (cmp(a[i], a[p]) < 0) { var t = a[i]; a[i] = a[p]; a[p] = t; i = p; } else break; } }
      function down(i) { var n = a.length; while (true) { var l = 2 * i + 1, r = 2 * i + 2, b = i; if (l < n && cmp(a[l], a[b]) < 0) b = l; if (r < n && cmp(a[r], a[b]) < 0) b = r; if (b !== i) { var t = a[i]; a[i] = a[b]; a[b] = t; i = b; } else break; } }
      return { a: a, push: function (v) { a.push(v); up(a.length - 1); }, pop: function () { var top = a[0], last = a.pop(); if (a.length) { a[0] = last; down(0); } return top; }, peek: function () { return a[0]; }, size: function () { return a.length; } };
    }
    function heapTree(arr, color, x0, w, top) {
      top = top || 30; x0 = x0 || 0; w = w || W; var levelH = 48, s = "";
      function pos(i) { var Lv = Math.floor(Math.log(i + 1) / Math.LN2), off = i - (Math.pow(2, Lv) - 1), slots = Math.pow(2, Lv); return { x: x0 + (off + 0.5) / slots * w, y: top + Lv * levelH }; }
      for (var i = 0; i < arr.length; i++) { if (arr[i] == null) continue; var p = pos(i); if (i > 0) { var pp = pos((i - 1) >> 1); s += line(pp.x, pp.y, p.x, p.y, { stroke: "var(--border)", sw: 1.4 }); } }
      for (var j = 0; j < arr.length; j++) { if (arr[j] == null) continue; var p2 = pos(j), st = color(j) || {}; s += `<circle cx="${p2.x}" cy="${p2.y}" r="16" fill="${st.fill || "var(--surface-2)"}" stroke="${st.stroke || "var(--border)"}" stroke-width="${st.sw || 1.4}"/>`; s += `<text x="${p2.x}" y="${p2.y + 4}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 12px var(--font-sans)">${st.txt != null ? st.txt : arr[j]}</text>`; }
      return s;
    }
    var frames = [];

    if (mode === "kth-largest" || mode === "kth-stream" || mode === "k-closest") {
      var k = cfg.k, H = 200;
      var isClose = mode === "k-closest";
      var stream = isClose ? cfg.points : cfg.data;
      var heap = makeHeap(function (a, b) { return (isClose ? -1 : 1) * ((isClose ? a.d : a) - (isClose ? b.d : b)); });
      function dist(pt) { return pt[0] * pt[0] + pt[1] * pt[1]; }
      function snap(hiRoot, cap, panel) {
        var inner = heapTree(heap.a, function (i) {
          var st = i === 0 ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.4, lab: "var(--accent)" } : {};
          if (isClose) st.txt = heap.a[i].d;
          return st;
        });
        inner += `<text x="${W / 2}" y="${H - 8}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${panel}</text>`;
        return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="heap">${inner}</svg>`, caption: cap };
      }
      var heapWord = isClose ? "max-heap of distances" : "min-heap";
      var goal = isClose ? `the ${k} closest points` : `the ${k}th largest`;
      frames.push({ svg: `<svg viewBox="0 0 ${W} ${H}" role="img"><text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="var(--text-muted)" style="font:600 13px var(--font-sans)">empty ${heapWord}</text></svg>`, caption: `Keep a <b>size-${k} ${heapWord}</b>. Push each item; if it grows past ${k}, pop the ${isClose ? "farthest" : "smallest"}. What survives is ${goal}.` });
      for (var i = 0; i < stream.length; i++) {
        var raw = stream[i];
        if (isClose) heap.push({ pt: raw, d: dist(raw) }); else heap.push(raw);
        var label = isClose ? `(${raw[0]},${raw[1]}) dist²=${dist(raw)}` : raw;
        frames.push(snap(true, `Push <b>${label}</b>.`, panel()));
        if (heap.size() > k) { var popped = heap.pop(); frames.push(snap(true, `Size ${k + 1} &gt; ${k} → pop the ${isClose ? "farthest" : "smallest"}, <b>${isClose ? popped.d : popped}</b>. It can't be in the answer.`, panel())); }
        if (mode === "kth-stream") frames.push(snap(true, `After this add, the root <b>${heap.peek()}</b> is the ${k}th largest so far.`, panel()));
      }
      function panel() { return "heap = [" + heap.a.map(function (x) { return isClose ? x.d : x; }).join(", ") + "]"; }
      var ans = isClose ? heap.a.map(function (x) { return "(" + x.pt[0] + "," + x.pt[1] + ")"; }).join(" ") : heap.peek();
      frames.push(snap(true, isClose ? `The heap now holds the ${k} closest: <b>${ans}</b>.` : `The root of the size-${k} min-heap is the answer: <b>${ans}</b>.`, panel()));
      return frames;
    }

    if (mode === "last-stone") {
      var H2 = 210, heap2 = makeHeap(function (a, b) { return b - a; });
      cfg.data.forEach(function (v) { heap2.push(v); });
      function snap2(hi, cap) {
        var inner = heapTree(heap2.a, function (i) { return (hi && hi.indexOf(i) >= 0) ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.4, lab: "var(--accent)" } : {}; });
        inner += `<text x="${W / 2}" y="${H2 - 8}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">heap = [${heap2.a.join(", ")}]</text>`;
        return { svg: `<svg viewBox="0 0 ${W} ${H2}" role="img" aria-label="max heap">${inner}</svg>`, caption: cap };
      }
      frames.push(snap2([0], "Max-heap of stone weights. Each turn, smash the two heaviest together; push back their difference. The root is always the heaviest."));
      while (heap2.size() > 1) {
        var x = heap2.pop(), y = heap2.pop();
        if (x === y) { frames.push(snap2(null, `Smash ${x} and ${y} — equal, so both are destroyed.`)); }
        else { heap2.push(x - y); frames.push(snap2([heap2.a.indexOf(x - y)], `Smash ${x} and ${y} → push back the difference <b>${x - y}</b>.`)); }
      }
      frames.push(snap2(heap2.size() ? [0] : null, heap2.size() ? `One stone left, weight <b>${heap2.peek()}</b>.` : "No stones remain → <b>0</b>."));
      return frames;
    }

    if (mode === "median") {
      var H3 = 200, lo = makeHeap(function (a, b) { return b - a; }), hi = makeHeap(function (a, b) { return a - b; });
      function med() { if (lo.size() > hi.size()) return lo.peek(); if (hi.size() > lo.size()) return hi.peek(); return (lo.peek() + hi.peek()) / 2; }
      function snap3(cap) {
        var inner = "";
        inner += `<text x="${W / 4}" y="20" text-anchor="middle" fill="var(--text-faint)" style="font:600 11px var(--font-sans)">max-heap (low half)</text>`;
        inner += `<text x="${3 * W / 4}" y="20" text-anchor="middle" fill="var(--text-faint)" style="font:600 11px var(--font-sans)">min-heap (high half)</text>`;
        inner += line(W / 2, 30, W / 2, H3 - 30, { stroke: "var(--border-soft)", sw: 1, dash: "4 4" });
        inner += heapTree(lo.a, function (i) { return i === 0 ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" } : {}; }, 10, W / 2 - 30, 40);
        inner += heapTree(hi.a, function (i) { return i === 0 ? { fill: "var(--c-info-bg)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" } : {}; }, W / 2 + 20, W / 2 - 30, 40);
        inner += `<text x="${W / 2}" y="${H3 - 8}" text-anchor="middle" fill="var(--c-success)" style="font:700 13px var(--font-sans)">median = ${lo.size() + hi.size() ? med() : "—"}</text>`;
        return { svg: `<svg viewBox="0 0 ${W} ${H3}" role="img" aria-label="two heaps">${inner}</svg>`, caption: cap };
      }
      frames.push(snap3("Two heaps split the data: a <b>max-heap</b> for the lower half, a <b>min-heap</b> for the upper half. Their tops straddle the median."));
      cfg.data.forEach(function (v) {
        if (lo.size() === 0 || v <= lo.peek()) lo.push(v); else hi.push(v);
        if (lo.size() > hi.size() + 1) hi.push(lo.pop());
        else if (hi.size() > lo.size()) lo.push(hi.pop());
        frames.push(snap3(`Add <b>${v}</b>, then rebalance so the halves differ by ≤ 1. Median is now <b>${med()}</b>.`));
      });
      return frames;
    }

    if (mode === "top-k-frequent") {
      var H4 = 220, data = cfg.data, kf = cfg.k;
      var freq = {}; data.forEach(function (v) { freq[v] = (freq[v] || 0) + 1; });
      var vals = Object.keys(freq);
      var maxF = Math.max.apply(null, vals.map(function (v) { return freq[v]; }));
      function cellRow(items, y, label, hi, picked) {
        var s = `<text x="20" y="${y + 22}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">${label}</text>`;
        var x0 = 90, cw = 46;
        items.forEach(function (it, i) {
          var st = picked && picked.indexOf(it.key) >= 0 ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" } : hi === it.key ? { fill: "var(--brand-soft)", stroke: "var(--accent)", lab: "var(--accent)" } : {};
          s += rect(x0 + i * (cw + 10), y, cw, 34, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: 1.3, r: 6 });
          s += `<text x="${x0 + i * (cw + 10) + cw / 2}" y="${y + 22}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 13px var(--font-sans)">${it.txt}</text>`;
        });
        return s;
      }
      function snap4(buckIdx, picked, cap) {
        var inner = cellRow(vals.map(function (v) { return { key: v, txt: v + ":" + freq[v] }; }), 30, "freq", null, null);
        var buckets = [];
        for (var f = maxF; f >= 1; f--) { var here = vals.filter(function (v) { return freq[v] === f; }); if (here.length) buckets.push({ f: f, vals: here }); }
        var by = 100;
        buckets.forEach(function (bk, bi) {
          inner += `<text x="20" y="${by + bi * 44 + 22}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">×${bk.f}</text>`;
          bk.vals.forEach(function (v, vi) {
            var pick = picked && picked.indexOf(v) >= 0;
            inner += rect(90 + vi * 56, by + bi * 44, 46, 34, { fill: pick ? "var(--c-success-bg)" : "var(--surface-2)", stroke: pick ? "var(--c-success)" : "var(--border)", sw: 1.3, r: 6 });
            inner += `<text x="${90 + vi * 56 + 23}" y="${by + bi * 44 + 22}" text-anchor="middle" fill="${pick ? "var(--c-success)" : "var(--text)"}" style="font:700 13px var(--font-sans)">${v}</text>`;
          });
        });
        return { svg: `<svg viewBox="0 0 ${W} ${H4}" role="img" aria-label="top k frequent">${inner}</svg>`, caption: cap };
      }
      frames.push(snap4(-1, [], "Count each value's frequency (top row). Then place values into <b>buckets indexed by frequency</b> — bucket sort beats a heap at O(n)."));
      frames.push(snap4(0, [], `Buckets built, highest frequency first. To get the top ${kf}, read buckets from the top down.`));
      var picked = [], f2 = maxF;
      while (picked.length < kf && f2 >= 1) {
        var here = vals.filter(function (v) { return freq[v] === f2; });
        if (here.length) { here.forEach(function (v) { if (picked.length < kf) picked.push(v); }); frames.push(snap4(0, picked.slice(), `Take from the ×${f2} bucket → picked ${picked.join(", ")}.`)); }
        f2--;
      }
      frames.push(snap4(0, picked.slice(), `Top ${kf} frequent: <b>${picked.join(", ")}</b>.`));
      return frames;
    }

    // task-scheduler
    var tasks = cfg.tasks, cool = cfg.cooldown, H5 = 150;
    var cnt = {}; tasks.forEach(function (t) { cnt[t] = (cnt[t] || 0) + 1; });
    var schedule = [], lastUsed = {};
    var remaining = Object.assign({}, cnt), tcount = tasks.length;
    var tIdx = 0;
    while (Object.values(remaining).some(function (v) { return v > 0; })) {
      var best = null;
      Object.keys(remaining).forEach(function (t) { if (remaining[t] > 0 && (lastUsed[t] == null || tIdx - lastUsed[t] > cool)) { if (best == null || remaining[t] > remaining[best]) best = t; } });
      if (best == null) { schedule.push("·"); } else { schedule.push(best); remaining[best]--; lastUsed[best] = tIdx; }
      tIdx++;
      if (tIdx > 60) break;
    }
    function snap5(upto, cap) {
      var cw = Math.min(40, (W - 40) / schedule.length), x0 = (W - cw * schedule.length) / 2, y = 60;
      var s = "";
      for (var i = 0; i < schedule.length; i++) {
        var idle = schedule[i] === "·", on = i < upto;
        s += rect(x0 + i * cw, y, cw - 4, 40, { fill: !on ? "var(--surface-2)" : idle ? "var(--c-warning-bg)" : "var(--brand-soft)", stroke: !on ? "var(--border)" : idle ? "var(--c-warning)" : "var(--accent)", sw: i === upto - 1 ? 2.4 : 1.3, r: 6 });
        s += `<text x="${x0 + i * cw + (cw - 4) / 2}" y="${y + 26}" text-anchor="middle" fill="${idle ? "var(--c-warning)" : "var(--text)"}" style="font:700 14px var(--font-sans)">${on ? (idle ? "idle" : schedule[i]) : ""}</text>`;
        s += `<text x="${x0 + i * cw + (cw - 4) / 2}" y="${y + 56}" text-anchor="middle" fill="var(--text-faint)" style="font:500 9px var(--font-mono)">${i}</text>`;
      }
      return { svg: `<svg viewBox="0 0 ${W} ${H5}" role="img" aria-label="task scheduler">${s}</svg>`, caption: cap };
    }
    frames.push(snap5(0, `Tasks ${Object.keys(cnt).map(function (t) { return t + "×" + cnt[t]; }).join(", ")} with cooldown <b>${cool}</b>. Each tick, run the most-frequent task that's off cooldown; if none, idle.`));
    for (var i = 1; i <= schedule.length; i++) { var c = schedule[i - 1]; frames.push(snap5(i, c === "·" ? `Tick ${i - 1}: every remaining task is still cooling down → insert an <b>idle</b> slot.` : `Tick ${i - 1}: run <b>${c}</b> (most frequent available).`)); }
    frames.push(snap5(schedule.length, `Finished in <b>${schedule.length}</b> ticks — cooldown gaps are filled by other tasks or idles.`));
    return frames;
  }

  /* ============================================================
     RENDERER — graph (topo/Kahn, union-find, clone BFS, word-ladder)
     ============================================================ */
  function graphViz(cfg) {
    var mode = cfg.mode, W = 600, H = 300, cxc = W / 2, cyc = 150, R = 108;
    var n = cfg.n;
    function pos(i) { var ang = -Math.PI / 2 + i * 2 * Math.PI / n; return { x: cxc + R * Math.cos(ang), y: cyc + R * Math.sin(ang) }; }
    function nodeC(i, st) { st = st || {}; var p = pos(i); return `<circle cx="${p.x}" cy="${p.y}" r="18" fill="${st.fill || "var(--surface-2)"}" stroke="${st.stroke || "var(--border)"}" stroke-width="${st.sw || 1.6}"/>` + `<text x="${p.x}" y="${p.y + 5}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 13px var(--font-sans)">${st.txt != null ? st.txt : i}</text>`; }
    function undirEdge(a, b, color, sw) { var pa = pos(a), pb = pos(b); return line(pa.x, pa.y, pb.x, pb.y, { stroke: color || "var(--border)", sw: sw || 1.6 }); }
    function dirEdge(a, b, color, sw) { var pa = pos(a), pb = pos(b), dx = pb.x - pa.x, dy = pb.y - pa.y, L = Math.sqrt(dx * dx + dy * dy), ux = dx / L, uy = dy / L; var x1 = pa.x + ux * 18, y1 = pa.y + uy * 18, x2 = pb.x - ux * 20, y2 = pb.y - uy * 20; var ah = `<path d="M${x2} ${y2} l${-8 * ux + 4 * uy} ${-8 * uy - 4 * ux} l${4 * ux + 4 * uy} ${4 * uy - 4 * ux} z" fill="${color || "var(--text-muted)"}"/>`; return line(x1, y1, x2, y2, { stroke: color || "var(--text-muted)", sw: sw || 1.6 }) + ah; }
    var frames = [];

    if (mode === "can-finish" || mode === "topo-order") {
      var adj = Array.from({ length: n }, function () { return []; }), indeg = new Array(n).fill(0);
      cfg.edges.forEach(function (e) { adj[e[1]].push(e[0]); indeg[e[1] === e[0] ? e[0] : e[0]]++; });
      // recompute indeg cleanly: edge [course, prereq] => prereq -> course
      indeg = new Array(n).fill(0); cfg.edges.forEach(function (e) { indeg[e[0]]++; });
      function snap(done, active, order, cap) {
        var inner = "";
        cfg.edges.forEach(function (e) { inner += dirEdge(e[1], e[0], "var(--border)", 1.6); });
        for (var i = 0; i < n; i++) { var st = i === active ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.6, lab: "var(--accent)" } : done[i] ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", sw: 1.8, lab: "var(--c-success)" } : {}; st.txt = i + " (" + indeg[i] + ")"; inner += nodeC(i, st); }
        inner += `<text x="${W / 2}" y="${H - 10}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${cap.panel}</text>`;
        return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="directed graph">${inner}</svg>`, caption: cap.text };
      }
      var done = new Array(n).fill(false), order = [];
      var q = []; for (var i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
      frames.push(snap(done, -1, order, { text: "Kahn's topological sort. A node's number shows its <b>in-degree</b> (unmet prerequisites). Start the queue with every 0-in-degree node.", panel: "queue = [" + q.join(", ") + "]" }));
      var guard = 0;
      while (q.length && guard++ < 40) {
        var u = q.shift(); done[u] = true; order.push(u);
        var newly = [];
        adj[u].forEach(function (v) { indeg[v]--; if (indeg[v] === 0) { q.push(v); newly.push(v); } });
        frames.push(snap(done, u, order, { text: `Take <b>${u}</b> (in-degree 0) → add to order. Decrement its neighbours${newly.length ? "; " + newly.join(", ") + " now hit 0 and join the queue" : ""}.`, panel: "order = [" + order.join(", ") + "]  queue = [" + q.join(", ") + "]" }));
      }
      if (order.length === n) frames.push(snap(done, -1, order, { text: mode === "topo-order" ? `Valid order: <b>[${order.join(", ")}]</b> — every prerequisite precedes its course.` : `All ${n} nodes processed → no cycle, so the courses <b>can be finished</b>.`, panel: "order = [" + order.join(", ") + "]" }));
      else frames.push(snap(done, -1, order, { text: `Only ${order.length}/${n} could be ordered — the rest form a <b>cycle</b>, so it's impossible.`, panel: "stuck — cycle detected" }));
      return frames;
    }

    if (mode === "clone") {
      var adjc = Array.from({ length: n }, function () { return []; });
      cfg.edges.forEach(function (e) { adjc[e[0]].push(e[1]); adjc[e[1]].push(e[0]); });
      function snapc(cloned, active, cap) {
        var inner = "";
        cfg.edges.forEach(function (e) { inner += undirEdge(e[0], e[1], "var(--border)", 1.6); });
        for (var i = 0; i < n; i++) { var st = i === active ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.6, lab: "var(--accent)" } : cloned[i] ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", sw: 1.8, lab: "var(--c-success)" } : {}; inner += nodeC(i, st); }
        inner += `<text x="${W / 2}" y="${H - 10}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${cap.panel}</text>`;
        return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="graph clone">${inner}</svg>`, caption: cap.text };
      }
      var cloned = new Array(n).fill(false), q2 = [0]; cloned[0] = true;
      frames.push(snapc([false], -1, { text: "Clone a graph with BFS: copy each node the first time you see it (a visited-map prevents infinite loops on cycles), then wire up the copied edges.", panel: "cloned = {}" }));
      var made = [], guard2 = 0;
      cloned = new Array(n).fill(false);
      var seen = new Array(n).fill(false); seen[0] = true; q2 = [0];
      while (q2.length && guard2++ < 40) {
        var u2 = q2.shift(); cloned[u2] = true; made.push(u2);
        var added = [];
        adjc[u2].forEach(function (v) { if (!seen[v]) { seen[v] = true; q2.push(v); added.push(v); } });
        frames.push(snapc(cloned.slice(), u2, { text: `Visit <b>${u2}</b> → make its copy and copy its edges. Newly discovered neighbours: ${added.length ? added.join(", ") : "none"}.`, panel: "cloned = {" + made.join(", ") + "}" }));
      }
      frames.push(snapc(cloned.slice(), -1, { text: `Every node copied once — the clone is an independent, identical graph.`, panel: "cloned all " + n + " nodes" }));
      return frames;
    }

    if (mode === "word-ladder") {
      var begin = cfg.begin, end = cfg.end, words = cfg.words.slice();
      var all = [begin].concat(words.filter(function (w) { return w !== begin; }));
      function diff1(a, b) { if (a.length !== b.length) return false; var d = 0; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d === 1; }
      // BFS layers
      var layer = {}; layer[begin] = 0; var q3 = [begin], maxL = 0;
      while (q3.length) { var w = q3.shift(); all.forEach(function (x) { if (layer[x] == null && diff1(w, x)) { layer[x] = layer[w] + 1; maxL = Math.max(maxL, layer[x]); q3.push(x); } }); }
      var layers = []; for (var l = 0; l <= maxL; l++) layers.push(all.filter(function (x) { return layer[x] === l; }));
      var colW = (W - 60) / (maxL + 1);
      function wx(l) { return 50 + l * colW; }
      function wy(l, i, cnt) { return H / 2 + (i - (cnt - 1) / 2) * 56; }
      function loc(word) { var l = layer[word]; var arr = layers[l]; var i = arr.indexOf(word); return { x: wx(l), y: wy(l, i, arr.length) }; }
      function snapw(upto, cap) {
        var inner = "";
        all.forEach(function (a) { all.forEach(function (b) { if (a < b && diff1(a, b) && layer[a] != null && layer[b] != null) { var pa = loc(a), pb = loc(b); inner += line(pa.x, pa.y, pb.x, pb.y, { stroke: "var(--border-soft)", sw: 1 }); } }); });
        all.forEach(function (word) {
          if (layer[word] == null) return; var L = loc(word), shown = layer[word] <= upto;
          var isEnd = word === end, isBeg = word === begin;
          var fill = !shown ? "var(--surface-2)" : isEnd && upto >= layer[end] ? "var(--c-success-bg)" : isBeg ? "var(--brand-soft)" : "var(--c-info-bg)";
          var stroke = !shown ? "var(--border)" : isEnd && upto >= layer[end] ? "var(--c-success)" : "var(--accent)";
          inner += rect(L.x - 26, L.y - 14, 52, 28, { fill: fill, stroke: stroke, sw: 1.6, r: 7, op: shown ? 1 : 0.4 });
          inner += `<text x="${L.x}" y="${L.y + 5}" text-anchor="middle" fill="${shown ? "var(--text)" : "var(--text-faint)"}" style="font:700 12px var(--font-mono)">${word}</text>`;
        });
        return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="word ladder BFS">${inner}</svg>`, caption: cap };
      }
      frames.push(snapw(0, `Build a graph where words one letter apart are neighbours, then <b>BFS</b> from "${begin}". Each layer is one transformation step.`));
      for (var l2 = 1; l2 <= maxL; l2++) {
        var atEnd = layer[end] === l2;
        frames.push(snapw(l2, atEnd ? `Layer ${l2} reaches "<b>${end}</b>"! The shortest ladder is <b>${l2 + 1}</b> words long.` : `Layer ${l2}: all words one step from the previous layer light up.`));
        if (atEnd) break;
      }
      return frames;
    }

    // union-find family: provinces, components, valid-tree, redundant
    var par = []; for (var i = 0; i < n; i++) par.push(i);
    function find(x) { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; }
    var PAL = ["var(--accent)", "var(--c-success)", "var(--c-warning)", "var(--c-info)", "var(--brand)"];
    function rootColorMap() { var roots = [], map = {}; for (var i = 0; i < n; i++) { var r = find(i); if (roots.indexOf(r) < 0) roots.push(r); } roots.forEach(function (r, k) { map[r] = PAL[k % PAL.length]; }); return map; }
    function snapu(activeEdge, processed, redundant, cap) {
      var cmap = rootColorMap();
      var inner = "";
      cfg.edges.forEach(function (e, ei) { var col = ei === activeEdge ? (redundant ? "var(--c-warning)" : "var(--accent)") : ei < processed ? "var(--text-muted)" : "var(--border-soft)"; inner += undirEdge(e[0], e[1], col, ei === activeEdge ? 3 : 1.8); });
      for (var i = 0; i < n; i++) { var c = cmap[find(i)]; inner += nodeC(i, { stroke: c, lab: c, sw: 2 }); }
      inner += `<text x="${W / 2}" y="${H - 10}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${cap.panel}</text>`;
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="union find">${inner}</svg>`, caption: cap.text };
    }
    var comps = n, intro;
    if (mode === "provinces") intro = "Union-Find: every node starts as its own province. For each connection, merge the two groups. The number of distinct groups at the end is the answer.";
    else if (mode === "components") intro = "Union-Find counts connected components: start with " + n + " singletons and union the endpoints of each edge. Same-colour nodes share a component.";
    else if (mode === "valid-tree") intro = "A valid tree needs exactly n−1 edges, fully connected, with no cycle. Union each edge; if an edge joins two nodes already in the same group, that's a cycle → not a tree.";
    else intro = "Find the redundant edge: union endpoints one by one. The first edge whose endpoints are <b>already connected</b> is the one that creates the cycle.";
    frames.push(snapu(-1, 0, false, { text: intro, panel: "components = " + n }));
    var redundantEdge = null, cycle = false;
    for (var ei = 0; ei < cfg.edges.length; ei++) {
      var e = cfg.edges[ei], ra = find(e[0]), rb = find(e[1]);
      if (ra === rb) {
        cycle = true; if (!redundantEdge) redundantEdge = e;
        frames.push(snapu(ei, ei, true, { text: `Edge (${e[0]}, ${e[1]}): both are already in the same group → it forms a <b>cycle</b>.`, panel: mode === "redundant" ? "redundant = [" + e[0] + ", " + e[1] + "]" : "cycle found" }));
        if (mode === "redundant") return frames;
      } else {
        par[ra] = rb; comps--;
        frames.push(snapu(ei, ei + 1, false, { text: `Edge (${e[0]}, ${e[1]}): different groups → <b>union</b> them. Components now ${comps}.`, panel: "components = " + comps }));
      }
    }
    if (mode === "valid-tree") frames.push(snapu(-1, cfg.edges.length, false, { text: comps === 1 && !cycle ? "Connected and acyclic with n−1 edges → <b>valid tree</b>." : "Either disconnected or cyclic → <b>not a valid tree</b>.", panel: "components = " + comps }));
    else if (mode !== "redundant") frames.push(snapu(-1, cfg.edges.length, false, { text: `Final count: <b>${comps}</b> ${mode === "provinces" ? "provinces" : "connected components"}.`, panel: (mode === "provinces" ? "provinces = " : "components = ") + comps }));
    return frames;
  }

  /* ============================================================
     RENDERER — prefix/suffix products (Product of Array Except Self)
     ============================================================ */
  function prefixProduct(cfg) {
    var a = cfg.data, n = a.length, W = 600, H = 200;
    var nw = Math.min(54, (W - 80 - 6 * (n - 1)) / n), gap = 6, total = nw * n + gap * (n - 1), sx = (W - total) / 2;
    function cx(i) { return sx + i * (nw + gap) + nw / 2; }
    function cell(i, y, val, st) { st = st || {}; return rect(sx + i * (nw + gap), y, nw, 38, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: st.sw || 1.3, r: 6 }) + `<text x="${cx(i)}" y="${y + 24}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 14px var(--font-sans)">${val}</text>`; }
    function frame(out, cur, cap, running) {
      var s = `<text x="${sx}" y="26" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">input</text>`;
      for (var i = 0; i < n; i++) s += cell(i, 34, a[i], i === cur ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" } : {});
      s += `<text x="${sx}" y="110" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">output</text>`;
      for (var j = 0; j < n; j++) { var st = j === cur ? { fill: "var(--c-info-bg)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" } : out[j] != null ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" } : {}; s += cell(j, 118, out[j] == null ? "·" : out[j], st); }
      if (running != null) s += `<text x="${W / 2}" y="${H - 8}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${running}</text>`;
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="prefix product">${s}</svg>`, caption: cap };
    }
    var out = new Array(n).fill(null), frames = [];
    frames.push(frame(out.slice(), -1, "output[i] = product of everything <b>except</b> a[i], with no division. Two sweeps: left products, then multiply in the right products.", "prefix = 1"));
    var pre = 1;
    for (var i = 0; i < n; i++) { out[i] = pre; frames.push(frame(out.slice(), i, `Left pass: output[${i}] = product of all to its left = <b>${pre}</b>. Then prefix ×= ${a[i]} → ${pre * a[i]}.`, `prefix = ${pre} → ${pre * a[i]}`)); pre *= a[i]; }
    var suf = 1;
    for (var j = n - 1; j >= 0; j--) { out[j] = out[j] * suf; frames.push(frame(out.slice(), j, `Right pass: multiply output[${j}] by the running right product ${suf} → <b>${out[j]}</b>. Then suffix ×= ${a[j]} → ${suf * a[j]}.`, `suffix = ${suf} → ${suf * a[j]}`)); suf *= a[j]; }
    frames.push(frame(out.slice(), -1, `Done — output = [${out.join(", ")}], no division, O(n) time and O(1) extra space.`, null));
    return frames;
  }

  /* ============================================================
     RENDERER — trapping rain water (two pointers + running maxes)
     ============================================================ */
  function trapping(cfg) {
    var a = cfg.data, n = a.length, W = 600, H = 200, padX = 20, baseY = 150, topY = 26;
    var maxH = Math.max.apply(null, a) || 1;
    var slot = (W - padX * 2) / n, barW = Math.min(slot * 0.72, 30);
    function bx(i) { return padX + i * slot + slot / 2; }
    function by(v) { return baseY - (v / maxH) * (baseY - topY); }
    function frame(l, r, water, total, cap) {
      var s = line(padX, baseY, W - padX, baseY, { stroke: "var(--border)", sw: 1.5 });
      for (var i = 0; i < n; i++) {
        if (water[i] > 0) s += rect(bx(i) - barW / 2, by(a[i] + water[i]), barW, by(a[i]) - by(a[i] + water[i]), { fill: "var(--brand-soft)", stroke: "none", r: 0 });
        var isP = i === l || i === r;
        s += rect(bx(i) - barW / 2, by(a[i]), barW, baseY - by(a[i]), { fill: isP ? "var(--accent)" : "var(--surface-hover)", stroke: isP ? "var(--accent)" : "var(--border)", sw: 1.2, r: 2 });
        s += `<text x="${bx(i)}" y="${baseY + 13}" text-anchor="middle" fill="var(--text-faint)" style="font:500 9px var(--font-mono)">${a[i]}</text>`;
      }
      if (l >= 0) s += `<text x="${bx(l)}" y="${by(a[l]) - 5}" text-anchor="middle" fill="var(--accent)" style="font:700 10px var(--font-sans)">L</text>`;
      if (r >= 0) s += `<text x="${bx(r)}" y="${by(a[r]) - 5}" text-anchor="middle" fill="var(--accent)" style="font:700 10px var(--font-sans)">R</text>`;
      s += `<text x="${W - padX}" y="16" text-anchor="end" fill="var(--c-success)" style="font:700 12px var(--font-sans)">trapped = ${total}</text>`;
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="trapping rain water">${s}</svg>`, caption: cap };
    }
    var frames = [], water = new Array(n).fill(0), l = 0, r = n - 1, lmax = 0, rmax = 0, total = 0;
    frames.push(frame(l, r, water.slice(), 0, "Two pointers close in from both ends. Water over a bar is capped by the shorter of the tallest walls on each side, so always advance the side with the smaller running max."));
    var guard = 0;
    while (l < r && guard++ < 100) {
      if (a[l] <= a[r]) { lmax = Math.max(lmax, a[l]); var add = lmax - a[l]; water[l] = add; total += add; frames.push(frame(l, r, water.slice(), total, `a[L]=${a[l]} ≤ a[R]=${a[r]}. Left max = ${lmax}, so this cell holds <b>${add}</b>. Move L right.`)); l++; }
      else { rmax = Math.max(rmax, a[r]); var add2 = rmax - a[r]; water[r] = add2; total += add2; frames.push(frame(l, r, water.slice(), total, `a[R]=${a[r]} &lt; a[L]=${a[l]}. Right max = ${rmax}, so this cell holds <b>${add2}</b>. Move R left.`)); r--; }
    }
    frames.push(frame(-1, -1, water.slice(), total, `Total water trapped = <b>${total}</b>. Each step is safe because the shorter side's max bounds the water there.`));
    return frames;
  }

  /* ============================================================
     RENDERER — binary search variants + search-on-answer
     ============================================================ */
  function bsearchAnswer(cfg) {
    var mode = cfg.mode, W = 600, H = 150, padL = 44, padR = 44, axisY = 84;
    var lo, hi, feasible, intro, smallest;
    if (mode === "koko") {
      var piles = cfg.piles, hh = cfg.h; lo = 1; hi = Math.max.apply(null, piles); smallest = true;
      feasible = function (k) { var t = 0; for (var i = 0; i < piles.length; i++) t += Math.ceil(piles[i] / k); return { ok: t <= hh, detail: "needs " + t + "h " + (t <= hh ? "≤ " + hh : "&gt; " + hh) }; };
      intro = `Binary-search the <b>eating speed</b> itself, not an array. Speeds 1..${hi}; the total hours must stay ≤ ${hh}. Find the smallest speed that works.`;
    } else {
      var x = cfg.x; lo = 0; hi = x; smallest = false;
      feasible = function (m) { return { ok: m * m <= x, detail: m + "² = " + (m * m) + (m * m <= x ? " ≤ " + x : " &gt; " + x) }; };
      intro = `⌊√${x}⌋ by binary search on the answer space 0..${x}: the largest m with m² ≤ ${x}.`;
    }
    var lo0 = lo, hi0 = hi;
    function X(v) { return padL + (v - lo0) / ((hi0 - lo0) || 1) * (W - padL - padR); }
    function frame(lo, hi, mid, res, cap) {
      var s = line(padL, axisY, W - padR, axisY, { stroke: "var(--border)", sw: 1.5 });
      s += text(padL, axisY + 20, lo0, { size: 11, fill: "var(--text-faint)" });
      s += text(W - padR, axisY + 20, hi0, { size: 11, anchor: "end", fill: "var(--text-faint)" });
      s += rect(X(lo), axisY - 10, Math.max(X(hi) - X(lo), 2), 20, { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 1, r: 4, op: 0.45 });
      s += `<text x="${X(lo)}" y="${axisY - 14}" text-anchor="middle" fill="var(--text-muted)" style="font:700 11px var(--font-sans)">lo=${lo}</text>`;
      s += `<text x="${X(hi)}" y="${axisY - 14}" text-anchor="middle" fill="var(--text-muted)" style="font:700 11px var(--font-sans)">hi=${hi}</text>`;
      if (mid != null) { var col = res ? (res.ok ? "var(--c-success)" : "var(--c-warning)") : "var(--accent)"; s += line(X(mid), axisY - 26, X(mid), axisY + 26, { stroke: col, sw: 2, dash: "3 3" }); s += `<text x="${X(mid)}" y="${axisY + 40}" text-anchor="middle" fill="${col}" style="font:700 12px var(--font-sans)">mid=${mid}</text>`; }
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="binary search on answer">${s}</svg>`, caption: cap };
    }
    var frames = [frame(lo, hi, null, null, intro)], guard = 0;
    if (smallest) {
      while (lo < hi && guard++ < 40) { var mid = lo + ((hi - lo) >> 1), r = feasible(mid); if (r.ok) { frames.push(frame(lo, hi, mid, r, `Speed ${mid}: ${r.detail} → feasible, try <b>slower</b>: hi=${mid}.`)); hi = mid; } else { frames.push(frame(lo, hi, mid, r, `Speed ${mid}: ${r.detail} → too slow, go <b>faster</b>: lo=${mid + 1}.`)); lo = mid + 1; } }
      frames.push(frame(lo, hi, null, null, `lo == hi → smallest workable speed is <b>${lo}</b>.`));
    } else {
      while (lo < hi && guard++ < 40) { var mid2 = lo + ((hi - lo + 1) >> 1), r2 = feasible(mid2); if (r2.ok) { frames.push(frame(lo, hi, mid2, r2, `${r2.detail} → fits, try <b>bigger</b>: lo=${mid2}.`)); lo = mid2; } else { frames.push(frame(lo, hi, mid2, r2, `${r2.detail} → too big, go <b>smaller</b>: hi=${mid2 - 1}.`)); hi = mid2 - 1; } }
      frames.push(frame(lo, hi, null, null, `Converged → ⌊√${cfg.x}⌋ = <b>${lo}</b>.`));
    }
    return frames;
  }
  function bsearch(cfg) {
    var mode = cfg.mode, W = 600, H = 162;
    if (mode === "koko" || mode === "sqrtx") return bsearchAnswer(cfg);
    var a = mode === "search-2d" ? [].concat.apply([], cfg.grid) : cfg.data;
    var target = cfg.target, n = a.length;
    var grid = valueCells(a, { W: W, y: 56, h: 44, maxCw: 52 });
    function frame(lo, hi, mid, found, extra, cap) {
      var inner = grid.draw(function (i) {
        if (found === i) return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", sw: 2.2, lab: "var(--c-success)" };
        if (i === mid) return { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" };
        if (extra && extra[i]) return extra[i];
        if (i < lo || i > hi) return { op: 0.3 };
        return {};
      }, true);
      inner += ptrMark(grid, lo, "lo", "var(--text-muted)", true);
      inner += ptrMark(grid, hi, "hi", "var(--text-muted)", true);
      if (mid >= 0 && found < 0) inner += ptrMark(grid, mid, "mid", "var(--accent)", false);
      if (target != null) inner += `<text x="${W / 2}" y="22" text-anchor="middle" fill="var(--text)" style="font:700 13px var(--font-sans)">target = ${target}</text>`;
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="binary search">${inner}</svg>`, caption: cap };
    }
    function half(from, to, col) { var m = {}; for (var i = from; i <= to; i++) m[i] = { fill: "var(--c-info-bg)", stroke: col || "var(--accent)" }; return m; }
    var frames = [], lo = 0, hi = n - 1, guard = 0;
    if (mode === "rotated") {
      frames.push(frame(lo, hi, -1, -1, null, `Rotated sorted array — find <b>${target}</b>. At each midpoint, one half is still sorted; decide whether the target lies inside it.`));
      while (lo <= hi && guard++ < 40) {
        var mid = lo + ((hi - lo) >> 1);
        if (a[mid] === target) { frames.push(frame(lo, hi, mid, -1, null, `a[${mid}] = ${target} → <b>found</b> at index ${mid}.`)); frames.push(frame(lo, hi, -1, mid, null, `Return <b>${mid}</b>. Still O(log n) despite the rotation.`)); return frames; }
        if (a[lo] <= a[mid]) {
          if (a[lo] <= target && target < a[mid]) { frames.push(frame(lo, hi, mid, -1, half(lo, mid), `Left half [${a[lo]}..${a[mid]}] is sorted and holds ${target} → search left: hi=${mid - 1}.`)); hi = mid - 1; }
          else { frames.push(frame(lo, hi, mid, -1, half(lo, mid), `Left half is sorted but ${target} isn't in it → search right: lo=${mid + 1}.`)); lo = mid + 1; }
        } else {
          if (a[mid] < target && target <= a[hi]) { frames.push(frame(lo, hi, mid, -1, half(mid, hi), `Right half [${a[mid]}..${a[hi]}] is sorted and holds ${target} → search right: lo=${mid + 1}.`)); lo = mid + 1; }
          else { frames.push(frame(lo, hi, mid, -1, half(mid, hi), `Right half is sorted but ${target} isn't in it → search left: hi=${mid - 1}.`)); hi = mid - 1; }
        }
      }
      frames.push(frame(0, -1, -1, -1, null, `Window empty → ${target} isn't present, return -1.`));
    } else if (mode === "find-min") {
      frames.push(frame(lo, hi, -1, -1, null, "Find the minimum of a rotated sorted array. Compare the midpoint to the <b>right end</b> to learn which side holds the dip."));
      while (lo < hi && guard++ < 40) { var mm = lo + ((hi - lo) >> 1); if (a[mm] > a[hi]) { frames.push(frame(lo, hi, mm, -1, null, `a[mid]=${a[mm]} &gt; a[hi]=${a[hi]} → the min is to the <b>right</b>: lo=${mm + 1}.`)); lo = mm + 1; } else { frames.push(frame(lo, hi, mm, -1, null, `a[mid]=${a[mm]} ≤ a[hi]=${a[hi]} → the min is mid or <b>left</b>: hi=${mm}.`)); hi = mm; } }
      frames.push(frame(lo, hi, -1, lo, null, `lo == hi at index ${lo} → minimum is <b>${a[lo]}</b>.`));
    } else if (mode === "search-insert") {
      frames.push(frame(lo, hi, -1, -1, null, `Find ${target}, or the index where it should be inserted to keep order.`));
      while (lo <= hi && guard++ < 40) { var m3 = lo + ((hi - lo) >> 1); if (a[m3] === target) { frames.push(frame(lo, hi, -1, m3, null, `Found ${target} at index ${m3}.`)); return frames; } if (a[m3] < target) { frames.push(frame(lo, hi, m3, -1, null, `a[mid]=${a[m3]} &lt; ${target} → go right: lo=${m3 + 1}.`)); lo = m3 + 1; } else { frames.push(frame(lo, hi, m3, -1, null, `a[mid]=${a[m3]} &gt; ${target} → go left: hi=${m3 - 1}.`)); hi = m3 - 1; } }
      var ins = {}; if (lo < n) ins[lo] = { fill: "var(--c-success-bg)", stroke: "var(--c-success)", sw: 2.2, lab: "var(--c-success)" };
      frames.push(frame(-1, -1, -1, -1, ins, `Not found — lo stopped at index <b>${lo}</b>, so ${target} inserts there.`));
    } else if (mode === "find-peak") {
      frames.push(frame(lo, hi, -1, -1, null, "Find any peak (bigger than both neighbours). Walk uphill: compare mid to mid+1 and move toward the higher side."));
      while (lo < hi && guard++ < 40) { var m4 = lo + ((hi - lo) >> 1); if (a[m4] < a[m4 + 1]) { frames.push(frame(lo, hi, m4, -1, null, `a[mid]=${a[m4]} &lt; a[mid+1]=${a[m4 + 1]} → a peak is to the <b>right</b>: lo=${m4 + 1}.`)); lo = m4 + 1; } else { frames.push(frame(lo, hi, m4, -1, null, `a[mid]=${a[m4]} ≥ a[mid+1]=${a[m4 + 1]} → a peak is mid or <b>left</b>: hi=${m4}.`)); hi = m4; } }
      frames.push(frame(lo, hi, -1, lo, null, `Converged at index ${lo} → peak value <b>${a[lo]}</b>.`));
    } else if (mode === "search-2d") {
      var cols = cfg.grid[0].length;
      frames.push(frame(lo, hi, -1, -1, null, `Read row by row, the matrix is one sorted list. Binary-search it for <b>${target}</b>, mapping index → (row, col).`));
      while (lo <= hi && guard++ < 40) { var m5 = lo + ((hi - lo) >> 1), rc = `(r${Math.floor(m5 / cols)},c${m5 % cols})`; if (a[m5] === target) { frames.push(frame(lo, hi, -1, m5, null, `a[${m5}] ${rc} = ${target} → <b>found</b>.`)); return frames; } if (a[m5] < target) { frames.push(frame(lo, hi, m5, -1, null, `${a[m5]} at ${rc} &lt; ${target} → right: lo=${m5 + 1}.`)); lo = m5 + 1; } else { frames.push(frame(lo, hi, m5, -1, null, `${a[m5]} at ${rc} &gt; ${target} → left: hi=${m5 - 1}.`)); hi = m5 - 1; } }
      frames.push(frame(0, -1, -1, -1, null, `Not in the matrix → false.`));
    } else if (mode === "first-last") {
      frames.push(frame(0, n - 1, -1, -1, null, `Find the first and last index of <b>${target}</b> using two biased binary searches.`));
      var left = -1; lo = 0; hi = n - 1;
      while (lo <= hi && guard++ < 60) { var ml = lo + ((hi - lo) >> 1); var goLeft = a[ml] >= target; if (a[ml] === target) left = ml; frames.push(frame(0, n - 1, ml, -1, range(left, left), `Left edge: a[${ml}]=${a[ml]} ${goLeft ? "≥" : "&lt;"} ${target} → go ${goLeft ? "left" : "right"}. best-left=${left}.`)); if (goLeft) hi = ml - 1; else lo = ml + 1; }
      var right = -1; lo = 0; hi = n - 1;
      while (lo <= hi && guard++ < 120) { var mr = lo + ((hi - lo) >> 1); var goRight = a[mr] <= target; if (a[mr] === target) right = mr; frames.push(frame(0, n - 1, mr, -1, range(left, right), `Right edge: a[${mr}]=${a[mr]} ${goRight ? "≤" : "&gt;"} ${target} → go ${goRight ? "right" : "left"}. best-right=${right}.`)); if (goRight) lo = mr + 1; else hi = mr - 1; }
      frames.push(frame(0, n - 1, -1, -1, range(left, right), `Range of ${target} = <b>[${left}, ${right}]</b>.`));
    }
    function range(l, r) { var m = {}; if (l >= 0 && r >= l) for (var i = l; i <= r; i++) m[i] = { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" }; return m; }
    return frames;
  }

  /* ============================================================
     RENDERER — matrix (spiral traversal, rotate 90°, set zeroes)
     ============================================================ */
  function matrixViz(cfg) {
    var mode = cfg.mode, W = 600;
    var g0 = cfg.data, R = g0.length, C = g0[0].length;
    var cell = Math.min(48, (W - 60) / C), gap = 5, sx = (W - (C * cell + (C - 1) * gap)) / 2, sy = 28;
    var H = sy + R * (cell + gap) + 30;
    function cx(c) { return sx + c * (cell + gap); }
    function cy(r) { return sy + r * (cell + gap); }
    function draw(g, state, note) {
      var s = "";
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
        var st = state(r, c) || {};
        s += rect(cx(c), cy(r), cell, cell, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: st.sw || 1.2, r: 5 });
        var v = st.v != null ? st.v : g[r][c];
        s += `<text x="${cx(c) + cell / 2}" y="${cy(r) + cell / 2 + 5}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 14px var(--font-sans)">${v}</text>`;
      }
      if (note) s += `<text x="${W / 2}" y="${sy + R * (cell + gap) + 16}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${note}</text>`;
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="matrix">${s}</svg>`, caption: note ? arguments[2] && false : null };
    }
    function snap(g, state, caption, note) { var f = draw(g, state, note); f.caption = caption; return f; }
    var frames = [];

    if (mode === "spiral") {
      var order = [], top = 0, bot = R - 1, left = 0, right = C - 1;
      while (top <= bot && left <= right) {
        for (var c = left; c <= right; c++) order.push([top, c]); top++;
        for (var r = top; r <= bot; r++) order.push([r, right]); right--;
        if (top <= bot) { for (var c2 = right; c2 >= left; c2--) order.push([bot, c2]); bot--; }
        if (left <= right) { for (var r2 = bot; r2 >= top; r2--) order.push([r2, left]); left++; }
      }
      var seen = {}, out = [];
      frames.push(snap(g0, function () { return {}; }, "Spiral traversal: peel the matrix like an onion — top row →, right col ↓, bottom row ←, left col ↑ — shrinking the borders each loop.", "output = [ ]"));
      for (var i = 0; i < order.length; i++) {
        var p = order[i]; seen[p[0] + "," + p[1]] = true; out.push(g0[p[0]][p[1]]);
        frames.push(snap(g0, function (rr, cc) { if (rr === p[0] && cc === p[1]) return { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.4, lab: "var(--accent)" }; if (seen[rr + "," + cc]) return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" }; return {}; }, `Visit (${p[0]},${p[1]}) = <b>${g0[p[0]][p[1]]}</b>.`, "output = [" + out.join(", ") + "]"));
      }
      frames.push(snap(g0, function (rr, cc) { return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" }; }, `Full spiral: [${out.join(", ")}].`, "done"));
      return frames;
    }

    if (mode === "rotate") {
      var g = g0.map(function (row) { return row.slice(); });
      frames.push(snap(g, function () { return {}; }, "Rotate 90° clockwise in place with a two-step trick: <b>transpose</b> (mirror over the main diagonal), then <b>reverse each row</b>.", "original"));
      for (var i = 0; i < R; i++) for (var j = i + 1; j < C; j++) {
        var t = g[i][j]; g[i][j] = g[j][i]; g[j][i] = t;
        (function (ii, jj, snapG) { frames.push(snap(snapG, function (rr, cc) { if ((rr === ii && cc === jj) || (rr === jj && cc === ii)) return { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.4, lab: "var(--accent)" }; return {}; }, `Transpose: swap (${ii},${jj}) ↔ (${jj},${ii}).`, "transposing…")); })(i, j, g.map(function (row) { return row.slice(); }));
      }
      frames.push(snap(g.map(function (row) { return row.slice(); }), function () { return {}; }, "Transposed (rows and columns swapped). Now reverse each row left-to-right.", "transposed"));
      for (var r3 = 0; r3 < R; r3++) {
        g[r3].reverse();
        (function (rr, snapG) { frames.push(snap(snapG, function (a, b) { if (a === rr) return { fill: "var(--c-info-bg)", stroke: "var(--accent)" }; return {}; }, `Reverse row ${rr}.`, "reversing rows…")); })(r3, g.map(function (row) { return row.slice(); }));
      }
      frames.push(snap(g.map(function (row) { return row.slice(); }), function () { return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" }; }, "Done — the matrix is rotated 90° clockwise.", "rotated"));
      return frames;
    }

    // set-zeroes
    var g2 = g0.map(function (row) { return row.slice(); });
    var zeroRows = {}, zeroCols = {};
    frames.push(snap(g2, function () { return {}; }, "Set entire row and column to 0 wherever a 0 appears — but record which rows/cols first, otherwise the new zeroes cascade.", "scan for zeroes"));
    for (var r = 0; r < R; r++) for (var c4 = 0; c4 < C; c4++) {
      if (g2[r][c4] === 0) {
        zeroRows[r] = true; zeroCols[c4] = true;
        (function (rr, cc) { frames.push(snap(g2, function (a, b) { if (a === rr && b === cc) return { fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", sw: 2.4, lab: "var(--c-warning)" }; return {}; }, `Zero found at (${rr},${cc}) → mark row ${rr} and column ${cc}.`, "marked rows " + Object.keys(zeroRows).join(",") + " · cols " + Object.keys(zeroCols).join(","))); })(r, c4);
      }
    }
    frames.push(snap(g2, function (a, b) { return (zeroRows[a] || zeroCols[b]) ? { fill: "var(--c-info-bg)", stroke: "var(--accent)" } : {}; }, "These are all the cells that will be zeroed (marked rows ∪ columns).", "applying…"));
    for (var r5 = 0; r5 < R; r5++) for (var c5 = 0; c5 < C; c5++) if (zeroRows[r5] || zeroCols[c5]) g2[r5][c5] = 0;
    frames.push(snap(g2, function (a, b) { return (zeroRows[a] || zeroCols[b]) ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" } : {}; }, "Marked rows and columns set to 0 — done.", "complete"));
    return frames;
  }

  /* ============================================================
     RENDERER — string operations (anagram, group-anagrams,
     longest-consecutive, common-prefix, roman, substring search)
     ============================================================ */
  function stringOps(cfg) {
    var mode = cfg.mode, W = 600;
    function chars(str, y, opts) {
      opts = opts || {}; var n = str.length, cw = Math.min(opts.cw || 38, (W - 60) / Math.max(n, 1)), gap = opts.gap || 5;
      var total = cw * n + gap * (n - 1), sx = opts.sx != null ? opts.sx : (W - total) / 2;
      return { n: n, cw: cw, y: y, sx: sx, x: function (i) { return sx + i * (cw + gap); }, cx: function (i) { return sx + i * (cw + gap) + cw / 2; } };
    }
    function box(row, i, ch, st, h) { st = st || {}; h = h || 34; return rect(row.x(i), row.y, row.cw, h, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: st.sw || 1.3, r: 6, op: st.op != null ? st.op : 1 }) + `<text x="${row.cx(i)}" y="${row.y + h / 2 + 5}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 14px var(--font-sans)">${ch}</text>`; }
    var frames = [];

    if (mode === "valid-anagram") {
      var s = cfg.s, t = cfg.t, W2 = W, H = 200;
      var rs = chars(s, 36), rt = chars(t, 100);
      function panel(cnt) { var k = Object.keys(cnt).filter(function (x) { return cnt[x] !== 0; }); return "counts = {" + (k.length ? k.map(function (x) { return x + ":" + cnt[x]; }).join(", ") : "all 0") + "}"; }
      function fr(si, ti, cnt, cap, bad) {
        var inner = `<text x="20" y="${rs.y + 22}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">s</text>`;
        for (var i = 0; i < s.length; i++) inner += box(rs, i, s[i], i === si ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" } : i < si || si < 0 ? { op: 0.5 } : {});
        inner += `<text x="20" y="${rt.y + 22}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">t</text>`;
        for (var j = 0; j < t.length; j++) inner += box(rt, j, t[j], j === ti ? { fill: bad ? "var(--c-warning-bg)" : "var(--c-info-bg)", stroke: bad ? "var(--c-warning)" : "var(--accent)", sw: 2.2, lab: bad ? "var(--c-warning)" : "var(--accent)" } : j < ti ? { op: 0.5 } : {});
        inner += `<text x="${W2 / 2}" y="${H - 10}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${panel(cnt)}</text>`;
        return { svg: `<svg viewBox="0 0 ${W2} ${H}" role="img" aria-label="anagram">${inner}</svg>`, caption: cap };
      }
      if (s.length !== t.length) { frames.push(fr(-1, -1, {}, "Different lengths → can't be anagrams.")); return frames; }
      var cnt = {};
      frames.push(fr(-1, -1, cnt, "Anagram check: tally each letter of s as +1, then spend them on t as −1. If every count ends at 0, they're anagrams."));
      for (var i = 0; i < s.length; i++) { cnt[s[i]] = (cnt[s[i]] || 0) + 1; frames.push(fr(i, -1, Object.assign({}, cnt), `Count up s: '${s[i]}' → ${cnt[s[i]]}.`)); }
      for (var j = 0; j < t.length; j++) { cnt[t[j]] = (cnt[t[j]] || 0) - 1; var bad = cnt[t[j]] < 0; frames.push(fr(-1, j, Object.assign({}, cnt), bad ? `'${t[j]}' goes negative — t has a letter s doesn't → <b>not anagrams</b>.` : `Spend on t: '${t[j]}' → ${cnt[t[j]]}.`, bad)); if (bad) return frames; }
      frames.push(fr(-1, -1, cnt, "Every count is back to 0 → <b>they're anagrams</b>."));
      return frames;
    }

    if (mode === "group-anagrams") {
      var words = cfg.words, H2 = 220;
      function key(w) { return w.split("").sort().join(""); }
      var groups = {}, order = [];
      function frame(cur, cap) {
        var inner = "";
        var rw = chars(" ".repeat(words.length), 30, { cw: 60, gap: 12 });
        words.forEach(function (w, i) { var st = i === cur ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" } : i < cur ? { op: 0.5 } : {}; inner += rect(rw.x(i), rw.y, rw.cw, 30, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: st.sw || 1.3, r: 6, op: st.op != null ? st.op : 1 }); inner += `<text x="${rw.cx(i)}" y="${rw.y + 20}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 12px var(--font-mono)">${w}</text>`; });
        var gy = 90;
        order.forEach(function (k, gi) {
          inner += `<text x="30" y="${gy + gi * 40 + 20}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">${k}</text>`;
          groups[k].forEach(function (w, wi) { inner += rect(120 + wi * 70, gy + gi * 40, 58, 28, { fill: "var(--c-success-bg)", stroke: "var(--c-success)", sw: 1.3, r: 6 }); inner += `<text x="${120 + wi * 70 + 29}" y="${gy + gi * 40 + 19}" text-anchor="middle" fill="var(--c-success)" style="font:700 12px var(--font-mono)">${w}</text>`; });
        });
        return { svg: `<svg viewBox="0 0 ${W} ${H2}" role="img" aria-label="group anagrams">${inner}</svg>`, caption: cap };
      }
      frames.push(frame(-1, "Group anagrams by a <b>canonical key</b>: sort each word's letters. Words that share the sorted key go in the same bucket."));
      words.forEach(function (w, i) { var k = key(w); if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(w); frames.push(frame(i, `"${w}" → sorted key "<b>${k}</b>" → ${groups[k].length > 1 ? "joins existing group" : "starts a new group"}.`)); });
      frames.push(frame(-1, `Done — ${order.length} groups, each a set of anagrams.`));
      return frames;
    }

    if (mode === "longest-consecutive") {
      var nums = cfg.data, H3 = 160, sset = {}; nums.forEach(function (v) { sset[v] = true; });
      var row = chars(" ".repeat(nums.length), 56, { cw: 46, gap: 8 });
      function frame(streak, best, cap, panel) {
        var inner = "";
        nums.forEach(function (v, i) { var inStreak = streak && streak.indexOf(v) >= 0; var st = inStreak ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" } : {}; inner += rect(row.x(i), row.y, row.cw, 40, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: st.sw || 1.3, r: 6 }); inner += `<text x="${row.cx(i)}" y="${row.y + 26}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 14px var(--font-sans)">${v}</text>`; });
        inner += `<text x="${W / 2}" y="${H3 - 10}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${panel}</text>`;
        return { svg: `<svg viewBox="0 0 ${W} ${H3}" role="img" aria-label="longest consecutive">${inner}</svg>`, caption: cap };
      }
      frames.push(frame(null, 0, "Put all numbers in a hash set for O(1) lookups. Only start counting from a <b>sequence start</b> — a value whose predecessor is absent — so each run is walked once.", "longest = 0"));
      var best = 0;
      nums.forEach(function (v) {
        if (!sset[v - 1]) { var len = 1, cur = v, streak = [v]; while (sset[cur + 1]) { cur++; len++; streak.push(cur); } best = Math.max(best, len); frames.push(frame(streak.slice(), best, `${v} is a start (no ${v - 1}). Walk up: ${streak.join("→")} → run length <b>${len}</b>. longest = ${best}.`, `longest = ${best}`)); }
      });
      frames.push(frame(null, best, `Longest consecutive run = <b>${best}</b>, found in O(n).`, `longest = ${best}`));
      return frames;
    }

    if (mode === "common-prefix") {
      var words2 = cfg.words, H4 = 60 + words2.length * 40, rowH = 36;
      var maxLen = Math.max.apply(null, words2.map(function (w) { return w.length; }));
      var colW = Math.min(34, (W - 80) / maxLen), sx = 50;
      function frame(col, ok, cap) {
        var inner = "";
        words2.forEach(function (w, wi) {
          for (var c = 0; c < w.length; c++) { var st = c < col ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" } : c === col ? { fill: ok ? "var(--brand-soft)" : "var(--c-warning-bg)", stroke: ok ? "var(--accent)" : "var(--c-warning)", lab: ok ? "var(--accent)" : "var(--c-warning)" } : {}; inner += rect(sx + c * colW, 30 + wi * 40, colW - 3, rowH, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: 1.2, r: 4 }); inner += `<text x="${sx + c * colW + (colW - 3) / 2}" y="${30 + wi * 40 + rowH / 2 + 5}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 13px var(--font-mono)">${w[c]}</text>`; }
        });
        return { svg: `<svg viewBox="0 0 ${W} ${H4}" role="img" aria-label="common prefix">${inner}</svg>`, caption: cap };
      }
      frames.push(frame(0, true, "Vertical scanning: compare the same column across every word. The common prefix grows until one column disagrees or a word ends."));
      var col = 0;
      while (true) { var ch = words2[0][col], same = col < words2[0].length; for (var wi = 1; wi < words2.length && same; wi++) { if (col >= words2[wi].length || words2[wi][col] !== ch) same = false; } if (!same) { frames.push(frame(col, false, `Column ${col} disagrees (or a word ended) → stop. Common prefix is the first ${col} chars.`)); break; } frames.push(frame(col, true, `Column ${col}: every word has '${ch}' → extend the prefix.`)); col++; if (col > maxLen) break; }
      frames.push(frame(col, true, `Longest common prefix = "<b>${words2[0].slice(0, col)}</b>".`));
      return frames;
    }

    if (mode === "roman") {
      var s2 = cfg.s, VAL = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }, H5 = 150;
      var row2 = chars(s2, 50, { cw: 40, gap: 8 });
      function frame(i, total, sub, cap) {
        var inner = "";
        for (var k = 0; k < s2.length; k++) { var st = k === i ? { fill: sub ? "var(--c-warning-bg)" : "var(--brand-soft)", stroke: sub ? "var(--c-warning)" : "var(--accent)", sw: 2.2, lab: sub ? "var(--c-warning)" : "var(--accent)" } : k < i ? { op: 0.5 } : {}; inner += box(row2, k, s2[k], st, 40); inner += `<text x="${row2.cx(k)}" y="${row2.y - 8}" text-anchor="middle" fill="var(--text-faint)" style="font:500 10px var(--font-mono)">${VAL[s2[k]]}</text>`; }
        inner += `<text x="${W / 2}" y="${H5 - 12}" text-anchor="middle" fill="var(--c-success)" style="font:700 14px var(--font-sans)">total = ${total}</text>`;
        return { svg: `<svg viewBox="0 0 ${W} ${H5}" role="img" aria-label="roman to integer">${inner}</svg>`, caption: cap };
      }
      frames.push(frame(-1, 0, false, "Scan left to right. Add each numeral — but if a smaller value sits before a larger one (like IV), <b>subtract</b> it instead."));
      var total = 0;
      for (var i = 0; i < s2.length; i++) { var cur = VAL[s2[i]], next = i + 1 < s2.length ? VAL[s2[i + 1]] : 0; if (cur < next) { total -= cur; frames.push(frame(i, total, true, `${s2[i]}(${cur}) &lt; ${s2[i + 1]}(${next}) → <b>subtract</b>: total = ${total}.`)); } else { total += cur; frames.push(frame(i, total, false, `${s2[i]}(${cur}) → add: total = ${total}.`)); } }
      frames.push(frame(-1, total, false, `Final value = <b>${total}</b>.`));
      return frames;
    }

    // substring search (find first occurrence)
    var text = cfg.text, pat = cfg.pattern, H6 = 170;
    var rT = chars(text, 44, { cw: 40, gap: 6 });
    function frameS(shift, j, matchLen, found, cap) {
      var inner = `<text x="20" y="${rT.y + 22}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">text</text>`;
      for (var i = 0; i < text.length; i++) { var inWin = i >= shift && i < shift + pat.length; var isCmp = i === shift + j; var matched = found >= 0 && i >= found && i < found + pat.length; var st = matched ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", sw: 2.2, lab: "var(--c-success)" } : isCmp ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" } : inWin ? { fill: "var(--c-info-bg)", stroke: "var(--accent)" } : {}; inner += box(rT, i, text[i], st, 34); }
      var rP = chars(pat, 104, { cw: 40, gap: 6, sx: rT.x(shift) });
      for (var k = 0; k < pat.length; k++) { var st2 = (found >= 0) ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" } : k === j ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" } : k < j ? { fill: "var(--c-info-bg)", stroke: "var(--accent)" } : {}; inner += box(rP, k, pat[k], st2, 34); }
      inner += `<text x="20" y="${rP.y + 22}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">pat</text>`;
      return { svg: `<svg viewBox="0 0 ${W} ${H6}" role="img" aria-label="substring search">${inner}</svg>`, caption: cap };
    }
    frames.push(frameS(0, -1, 0, -1, `Find "<b>${pat}</b>" in "${text}". Slide the pattern across the text; at each shift, compare characters until a mismatch or a full match.`));
    for (var shift = 0; shift + pat.length <= text.length; shift++) {
      var j = 0;
      for (; j < pat.length; j++) { if (text[shift + j] !== pat[j]) { frames.push(frameS(shift, j, j, -1, `Shift ${shift}: '${text[shift + j]}' ≠ '${pat[j]}' at offset ${j} → mismatch, slide right.`)); break; } }
      if (j === pat.length) { frames.push(frameS(shift, j - 1, j, shift, `Shift ${shift}: all ${pat.length} characters match → <b>found at index ${shift}</b>.`)); return frames; }
    }
    frames.push(frameS(0, -1, 0, -1, `No shift matched → return -1.`));
    return frames;
  }

  /* ============================================================
     RENDERER — array rewrite in place (sort-colors, move-zeroes,
     squares, remove-dups, merge-sorted, remove-element, disappeared)
     ============================================================ */
  function arrayRewrite(cfg) {
    var mode = cfg.mode, W = 600, H = 165;
    function cells(arr) { var n = arr.length, cw = Math.min(48, (W - 40 - 6 * (n - 1)) / n), gap = 6, total = cw * n + gap * (n - 1), sx = (W - total) / 2, y = 54, h = 44; return { n: n, cw: cw, y: y, h: h, x: function (i) { return sx + i * (cw + gap); }, cx: function (i) { return sx + i * (cw + gap) + cw / 2; } }; }
    function draw(arr, styleFn, ptrs, cap, panel) {
      var g = cells(arr), s = "";
      for (var i = 0; i < arr.length; i++) { var st = styleFn(i) || {}; s += rect(g.x(i), g.y, g.cw, g.h, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: st.sw || 1.3, r: 6, op: st.op != null ? st.op : 1 }); s += `<text x="${g.cx(i)}" y="${g.y + g.h / 2 + 5}" text-anchor="middle" fill="${st.lab || "var(--text)"}" opacity="${st.op != null ? st.op : 1}" style="font:700 15px var(--font-sans)">${arr[i]}</text>`; s += `<text x="${g.cx(i)}" y="${g.y + g.h + 14}" text-anchor="middle" fill="var(--text-faint)" style="font:500 10px var(--font-mono)">${i}</text>`; }
      (ptrs || []).forEach(function (p) { if (p.i >= 0 && p.i < arr.length) s += `<text x="${g.cx(p.i)}" y="${g.y - 9}" text-anchor="middle" fill="${p.c || "var(--accent)"}" style="font:700 11px var(--font-sans)">${p.t}</text>`; });
      if (panel) s += `<text x="${W / 2}" y="${H - 8}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${panel}</text>`;
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="array">${s}</svg>`, caption: cap };
    }
    var frames = [];

    if (mode === "sort-colors") {
      var a = cfg.data.slice(), low = 0, mid = 0, high = a.length - 1;
      function colorOf(v) { return v === 0 ? { fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", lab: "var(--c-warning)" } : v === 2 ? { fill: "var(--c-info-bg)", stroke: "var(--accent)", lab: "var(--accent)" } : { fill: "var(--surface-2)", stroke: "var(--border)" }; }
      function st(i) { return colorOf(a[i]); }
      function ptrs() { return [{ i: low, t: "low", c: "var(--c-warning)" }, { i: mid, t: "mid", c: "var(--accent)" }, { i: high, t: "high", c: "var(--accent)" }]; }
      frames.push(draw(a.slice(), st, ptrs(), "Dutch national flag: three pointers sweep once. 0s go to the front (low), 2s to the back (high), 1s stay in the middle.", "low=0 mid=0 high=" + high));
      var guard = 0;
      while (mid <= high && guard++ < 40) {
        if (a[mid] === 0) { var t = a[low]; a[low] = a[mid]; a[mid] = t; frames.push(draw(a.slice(), st, ptrs(), `a[mid]=0 → swap into the low region; advance low and mid.`, "low=" + low + " mid=" + mid + " high=" + high)); low++; mid++; }
        else if (a[mid] === 1) { frames.push(draw(a.slice(), st, ptrs(), `a[mid]=1 → already in place; just advance mid.`, "low=" + low + " mid=" + mid + " high=" + high)); mid++; }
        else { var t2 = a[high]; a[high] = a[mid]; a[mid] = t2; frames.push(draw(a.slice(), st, ptrs(), `a[mid]=2 → swap to the high region; shrink high (don't advance mid — recheck the swapped-in value).`, "low=" + low + " mid=" + mid + " high=" + high)); high--; }
      }
      frames.push(draw(a.slice(), st, [], `Sorted in one pass: ${a.join(", ")}.`, "done"));
      return frames;
    }

    if (mode === "move-zeroes") {
      var a2 = cfg.data.slice(), w = 0;
      function st2(i) { if (a2[i] === 0) return { fill: "var(--surface-2)", stroke: "var(--border-soft)", op: 0.6 }; return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" }; }
      frames.push(draw(a2.slice(), st2, [{ i: w, t: "write" }], "Keep a <b>write</b> pointer for the next non-zero slot. Scan with a read pointer; every non-zero value is swapped forward, pushing zeroes to the end.", "write=0"));
      for (var r = 0; r < a2.length; r++) { if (a2[r] !== 0) { var t = a2[w]; a2[w] = a2[r]; a2[r] = t; frames.push(draw(a2.slice(), st2, [{ i: w, t: "write" }, { i: r, t: "read", c: "var(--accent)" }], `Non-zero ${a2[w]} at read ${r} → place at write ${w}, advance write.`, "write=" + (w + 1))); w++; } else { frames.push(draw(a2.slice(), st2, [{ i: w, t: "write" }, { i: r, t: "read", c: "var(--accent)" }], `Zero at read ${r} → skip, leave write where it is.`, "write=" + w)); } }
      frames.push(draw(a2.slice(), st2, [], `All zeroes pushed to the back, order of others preserved: ${a2.join(", ")}.`, "done"));
      return frames;
    }

    if (mode === "remove-duplicates") {
      var a3 = cfg.data.slice(), w3 = 1;
      function st3(i) { if (i < w3) return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" }; return { op: 0.5 }; }
      frames.push(draw(a3.slice(), st3, [{ i: 1, t: "write" }], "Sorted array — a <b>write</b> pointer keeps the unique prefix. Scan with read; copy a value forward only when it differs from the last kept one.", "k=1"));
      for (var r3 = 1; r3 < a3.length; r3++) { if (a3[r3] !== a3[w3 - 1]) { a3[w3] = a3[r3]; frames.push(draw(a3.slice(), st3, [{ i: w3, t: "write" }, { i: r3, t: "read", c: "var(--accent)" }], `${a3[r3]} ≠ ${a3[w3 - 1]} (last kept) → write at ${w3}, advance.`, "k=" + (w3 + 1))); w3++; } else { frames.push(draw(a3.slice(), st3, [{ i: w3, t: "write" }, { i: r3, t: "read", c: "var(--accent)" }], `${a3[r3]} == ${a3[w3 - 1]} → duplicate, skip.`, "k=" + w3)); } }
      frames.push(draw(a3.slice(), st3, [], `First <b>${w3}</b> elements are the unique values.`, "k=" + w3));
      return frames;
    }

    if (mode === "remove-element") {
      var a4 = cfg.data.slice(), val = cfg.val, w4 = 0;
      function st4(i) { if (i < w4) return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" }; if (a4[i] === val) return { fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", lab: "var(--c-warning)" }; return { op: 0.55 }; }
      frames.push(draw(a4.slice(), st4, [{ i: 0, t: "write" }], `Remove all ${val}s in place. A <b>write</b> pointer collects the keepers; skip any value equal to ${val}.`, "k=0"));
      for (var r4 = 0; r4 < a4.length; r4++) { if (a4[r4] !== val) { a4[w4] = a4[r4]; frames.push(draw(a4.slice(), st4, [{ i: w4, t: "write" }, { i: r4, t: "read", c: "var(--accent)" }], `${a4[r4]} ≠ ${val} → keep it at ${w4}.`, "k=" + (w4 + 1))); w4++; } else { frames.push(draw(a4.slice(), st4, [{ i: w4, t: "write" }, { i: r4, t: "read", c: "var(--accent)" }], `${a4[r4]} == ${val} → drop it.`, "k=" + w4)); } }
      frames.push(draw(a4.slice(), st4, [], `First <b>${w4}</b> elements have every ${val} removed.`, "k=" + w4));
      return frames;
    }

    if (mode === "disappeared") {
      var a5 = cfg.data.slice();
      frames.push(draw(a5.slice(), function () { return {}; }, [], "Trick: use the array itself as a hash. For each value v, flip the sign at index |v|−1 to mark 'v is present'.", "marking…"));
      for (var i5 = 0; i5 < a5.length; i5++) { var idx = Math.abs(a5[i5]) - 1; if (a5[idx] > 0) a5[idx] = -a5[idx]; frames.push((function (cur, ix) { return draw(a5.slice(), function (k) { if (k === ix) return { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" }; if (a5[k] < 0) return { fill: "var(--c-info-bg)", stroke: "var(--accent)" }; return {}; }, [{ i: cur, t: "read", c: "var(--text-muted)" }], `Value ${Math.abs(a5[cur])} → mark index ${ix} negative (present).`, "marking…"); })(i5, idx)); }
      var missing = [];
      for (var k5 = 0; k5 < a5.length; k5++) if (a5[k5] > 0) missing.push(k5 + 1);
      frames.push(draw(a5.slice(), function (k) { return a5[k] > 0 ? { fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", lab: "var(--c-warning)" } : {}; }, [], `Indices still <b>positive</b> were never marked → their numbers are missing: <b>[${missing.join(", ")}]</b>.`, "missing = [" + missing.join(", ") + "]"));
      return frames;
    }

    // squares  &  merge — two-row layouts (sorted output built from the back)
    if (mode === "squares") {
      var a6 = cfg.data, n6 = a6.length, out = new Array(n6).fill(null), l = 0, r = n6 - 1, pos = n6 - 1, H6 = 200;
      function row(arr, y, sel, lab) { var n = arr.length, cw = Math.min(46, (W - 60) / n), gap = 6, total = cw * n + gap * (n - 1), sx = (W - total) / 2; var s = `<text x="20" y="${y + 28}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">${lab}</text>`; for (var i = 0; i < n; i++) { var st = sel && sel[i] ? sel[i] : (arr[i] == null ? { op: 0.4 } : {}); s += rect(sx + i * (cw + gap), y, cw, 40, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: st.sw || 1.3, r: 6 }); s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${y + 26}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 14px var(--font-sans)">${arr[i] == null ? "·" : arr[i]}</text>`; } return s; }
      function frame(cap, panel) {
        var selIn = {}; selIn[l] = { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" }; selIn[r] = { fill: "var(--c-info-bg)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" };
        var selOut = {}; if (pos >= 0) selOut[pos] = { fill: "var(--c-success-bg)", stroke: "var(--c-success)", sw: 2.2, lab: "var(--c-success)" };
        var inner = row(a6, 36, selIn, "in") + row(out, 110, selOut, "out");
        inner += `<text x="${W / 2}" y="${H6 - 8}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${panel}</text>`;
        return { svg: `<svg viewBox="0 0 ${W} ${H6}" role="img" aria-label="squares of sorted">${inner}</svg>`, caption: cap };
      }
      frames.push(frame("The biggest square is always at one <b>end</b> (most negative or most positive). Compare ends, write the larger square to the back of the output, move inward.", "fill from the back"));
      var guard6 = 0;
      while (l <= r && guard6++ < 40) { var ls = a6[l] * a6[l], rs = a6[r] * a6[r]; if (ls > rs) { out[pos] = ls; frames.push(frame(`(${a6[l]})² = ${ls} &gt; (${a6[r]})² = ${rs} → write ${ls} at out[${pos}], move L right.`, "out[" + pos + "] = " + ls)); l++; } else { out[pos] = rs; frames.push(frame(`(${a6[r]})² = ${rs} ≥ (${a6[l]})² = ${ls} → write ${rs} at out[${pos}], move R left.`, "out[" + pos + "] = " + rs)); r--; } pos--; }
      frames.push(frame(`Output is sorted ascending: ${out.join(", ")}.`, "done"));
      return frames;
    }

    // merge-sorted-array (nums1 has m valid + n blanks; fill from the back)
    var m = cfg.m, nums2 = cfg.nums2, nn = nums2.length, H7 = 200;
    var nums1 = cfg.nums1.slice(0, m).concat(new Array(nn).fill(null));
    var i1 = m - 1, j2 = nn - 1, k = m + nn - 1;
    function rowM(arr, y, sel, lab) { var n = arr.length, cw = Math.min(46, (W - 60) / n), gap = 6, total = cw * n + gap * (n - 1), sx = (W - total) / 2; var s = `<text x="20" y="${y + 28}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">${lab}</text>`; for (var i = 0; i < n; i++) { var st = sel && sel[i] ? sel[i] : (arr[i] == null ? { op: 0.35 } : {}); s += rect(sx + i * (cw + gap), y, cw, 40, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: st.sw || 1.3, r: 6 }); s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${y + 26}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 14px var(--font-sans)">${arr[i] == null ? "·" : arr[i]}</text>`; } return s; }
    function frameM(cap, panel) {
      var s1 = {}; if (i1 >= 0) s1[i1] = { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" }; if (k >= 0) s1[k] = Object.assign(s1[k] || {}, { stroke: "var(--c-success)", sw: 2.4 });
      var s2 = {}; if (j2 >= 0) s2[j2] = { fill: "var(--c-info-bg)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" };
      var inner = rowM(nums1, 36, s1, "n1") + rowM(nums2, 110, s2, "n2");
      inner += `<text x="${W / 2}" y="${H7 - 8}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${panel}</text>`;
      return { svg: `<svg viewBox="0 0 ${W} ${H7}" role="img" aria-label="merge sorted array">${inner}</svg>`, caption: cap };
    }
    frames.push(frameM("Merge nums2 into nums1's trailing space. Filling from the <b>back</b> (largest first) avoids overwriting unmerged values.", "k = " + k));
    var guard7 = 0;
    while (j2 >= 0 && guard7++ < 40) {
      if (i1 >= 0 && nums1[i1] > nums2[j2]) { nums1[k] = nums1[i1]; frames.push(frameM(`nums1[${i1}]=${nums1[i1]} &gt; nums2[${j2}]=${nums2[j2]} → place ${nums1[i1]} at ${k}.`, "k = " + (k - 1))); i1--; }
      else { nums1[k] = nums2[j2]; frames.push(frameM(`nums2[${j2}]=${nums2[j2]} is the larger (or nums1 exhausted) → place it at ${k}.`, "k = " + (k - 1))); j2--; }
      k--;
    }
    frames.push(frameM(`Merged in place: ${nums1.join(", ")}.`, "done"));
    return frames;
  }

  /* ============================================================
     RENDERER — bit manipulation (1-bits, counting-bits, reverse, add)
     ============================================================ */
  function bitsViz(cfg) {
    var mode = cfg.mode, W = 600, bits = cfg.bits || 8;
    function toBits(v, n) { var a = []; for (var i = n - 1; i >= 0; i--) a.push((v >> i) & 1); return a; }
    function bitRow(arr, y, sx, hi, color) { var cw = 30, gap = 4, s = ""; for (var i = 0; i < arr.length; i++) { var on = arr[i] === 1, isHi = hi && hi.indexOf(i) >= 0; s += rect(sx + i * (cw + gap), y, cw, 30, { fill: isHi ? "var(--brand-soft)" : on ? "var(--c-info-bg)" : "var(--surface-2)", stroke: isHi ? "var(--accent)" : on ? "var(--accent)" : "var(--border)", sw: isHi ? 2.2 : 1.2, r: 4 }); s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${y + 20}" text-anchor="middle" fill="${on ? (color || "var(--accent)") : "var(--text-faint)"}" style="font:700 13px var(--font-mono)">${arr[i]}</text>`; } return s; }
    var frames = [];

    if (mode === "ones") {
      var n = cfg.n, H = 150, sx = (W - bits * 34) / 2;
      function frame(v, count, cap) { var inner = bitRow(toBits(v, bits), 50, sx, null); inner += `<text x="${W / 2}" y="30" text-anchor="middle" fill="var(--text)" style="font:700 13px var(--font-mono)">n = ${v} (${(v >>> 0).toString(2)})</text>`; inner += `<text x="${W / 2}" y="${H - 14}" text-anchor="middle" fill="var(--c-success)" style="font:700 13px var(--font-sans)">set bits = ${count}</text>`; return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="count bits">${inner}</svg>`, caption: cap }; }
      var count = 0;
      frames.push(frame(n, 0, `Count set bits with the <b>n &amp; (n−1)</b> trick: that operation clears the lowest set bit, so it loops exactly once per 1-bit.`));
      var v = n;
      while (v !== 0) { var v2 = v & (v - 1); count++; frames.push(frame(v2, count, `n &amp; (n−1): clears the lowest 1-bit → ${v} becomes ${v2}. Count = ${count}.`)); v = v2; }
      frames.push(frame(0, count, `n is 0 → done. Total set bits = <b>${count}</b>.`));
      return frames;
    }

    if (mode === "counting-bits") {
      var N = cfg.n, H2 = 70 + (N + 1) * 30, rowH = 26;
      function frame(upto, cur, cap) {
        var inner = "";
        for (var i = 0; i <= N; i++) {
          var y = 40 + i * 30, dp = i <= upto;
          inner += `<text x="40" y="${y + 18}" text-anchor="end" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">${i}</text>`;
          inner += bitRow(toBits(i, 4), y, 60, i === cur ? [0, 1, 2, 3] : null);
          if (dp) { inner += rect(230, y, 50, rowH, { fill: i === cur ? "var(--brand-soft)" : "var(--c-success-bg)", stroke: i === cur ? "var(--accent)" : "var(--c-success)", sw: i === cur ? 2.2 : 1.2, r: 5 }); inner += `<text x="255" y="${y + 18}" text-anchor="middle" fill="${i === cur ? "var(--accent)" : "var(--c-success)"}" style="font:700 13px var(--font-sans)">${countOnes(i)}</text>`; }
          if (i === cur && i > 0) inner += `<text x="300" y="${y + 18}" fill="var(--text-muted)" style="font:600 11px var(--font-mono)">= bits[${i >> 1}] + ${i & 1}</text>`;
        }
        return { svg: `<svg viewBox="0 0 ${W} ${H2}" role="img" aria-label="counting bits dp">${inner}</svg>`, caption: cap };
      }
      function countOnes(x) { var c = 0; while (x) { c += x & 1; x >>= 1; } return c; }
      frames.push(frame(0, -1, "Count bits for every number 0..n in one pass with DP: <b>bits[i] = bits[i &gt;&gt; 1] + (i &amp; 1)</b> — drop the last bit (a known sub-answer) and add it back."));
      for (var i = 1; i <= N; i++) frames.push(frame(i, i, `bits[${i}] = bits[${i >> 1}] (${countOnes(i >> 1)}) + last bit ${i & 1} = <b>${countOnes(i)}</b>.`));
      frames.push(frame(N, -1, `Filled all counts 0..${N} in O(n).`));
      return frames;
    }

    if (mode === "reverse-bits") {
      var n3 = cfg.n, H3 = 170, sx3 = (W - bits * 34) / 2;
      var inb = toBits(n3, bits), outb = inb.slice().reverse();
      function frame(k, cap) {
        var partialOut = outb.map(function (b, i) { return i < k ? b : "·"; });
        var inner = `<text x="20" y="58" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">in</text>` + bitRow(inb, 44, sx3, [bits - 1 - (k - 1 >= 0 ? k - 1 : -1)].filter(function (x) { return x >= 0; }));
        var s2 = `<text x="20" y="118" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">out</text>`;
        var cw = 30, gap = 4; for (var i = 0; i < partialOut.length; i++) { var done = partialOut[i] !== "·"; s2 += rect(sx3 + i * (cw + gap), 104, cw, 30, { fill: i === k - 1 ? "var(--brand-soft)" : done ? "var(--c-success-bg)" : "var(--surface-2)", stroke: i === k - 1 ? "var(--accent)" : done ? "var(--c-success)" : "var(--border)", sw: i === k - 1 ? 2.2 : 1.2, r: 4 }); s2 += `<text x="${sx3 + i * (cw + gap) + cw / 2}" y="124" text-anchor="middle" fill="${done ? "var(--c-success)" : "var(--text-faint)"}" style="font:700 13px var(--font-mono)">${partialOut[i]}</text>`; }
        return { svg: `<svg viewBox="0 0 ${W} ${H3}" role="img" aria-label="reverse bits">${inner + s2}</svg>`, caption: cap };
      }
      frames.push(frame(0, `Reverse the bit order: pull bits off the input's <b>least-significant</b> end and push them onto the output's most-significant end.`));
      for (var k = 1; k <= bits; k++) frames.push(frame(k, `Take input bit ${bits - k} (=${inb[bits - k]}) → it lands at output position ${k - 1}.`));
      frames.push(frame(bits, `Reversed: ${inb.join("")} → <b>${outb.join("")}</b>.`));
      return frames;
    }

    // sum-of-two-integers (add without +)
    var x = cfg.a, y = cfg.b, H4 = 200, sx4 = (W - bits * 34) / 2;
    function frame4(a, b, cap) {
      var inner = `<text x="20" y="44" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">a</text>` + bitRow(toBits(a, bits), 30, sx4, null);
      inner += `<text x="20" y="84" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">b(carry)</text>` + bitRow(toBits(b, bits), 70, sx4, null);
      inner += `<text x="${W / 2}" y="${H4 - 14}" text-anchor="middle" fill="var(--text)" style="font:700 13px var(--font-mono)">a = ${a}, carry = ${b}</text>`;
      return { svg: `<svg viewBox="0 0 ${W} ${H4}" role="img" aria-label="add without plus">${inner}</svg>`, caption: cap };
    }
    frames.push(frame4(x, y, `Add without <code>+</code>: <b>a ^ b</b> is the sum ignoring carries, and <b>(a &amp; b) &lt;&lt; 1</b> is the carry. Repeat until the carry is 0.`));
    var guard = 0;
    while (y !== 0 && guard++ < 34) { var sum = x ^ y, carry = (x & y) << 1; x = sum; y = carry; frames.push(frame4(x, y, `sum = a ^ b = ${x}; carry = (a &amp; b) &lt;&lt; 1 = ${y}. ${y === 0 ? "Carry is 0 — done." : "Feed the carry back in."}`)); }
    frames.push(frame4(x, 0, `No carry left → the sum is <b>${x}</b>.`));
    return frames;
  }

  /* ============================================================
     RENDERER — knapsack-style 2-D DP (subset-sum, coin-change ways)
     ============================================================ */
  function knapsack(cfg) {
    var mode = cfg.mode, W = 600, items, cap;
    if (mode === "subset-sum") { items = cfg.data; cap = items.reduce(function (a, b) { return a + b; }, 0) / 2; }
    else { items = cfg.coins; cap = cfg.amount; }
    var capInt = Math.floor(cap), rows = items.length + 1, cols = capInt + 1;
    var cw = Math.min(40, (W - 90) / cols), ch = 28, sx = 70, sy = 46, H = sy + rows * (ch + 4) + 16;
    function xy(r, c) { return [sx + c * (cw + 4), sy + r * (ch + 4)]; }
    function draw(dp, cur, contrib, cap2) {
      var s = "";
      for (var c = 0; c < cols; c++) { var p = xy(0, c); s += `<text x="${p[0] + cw / 2}" y="${sy - 12}" text-anchor="middle" fill="var(--text-faint)" style="font:700 11px var(--font-mono)">${c}</text>`; }
      for (var r = 1; r < rows; r++) { var p2 = xy(r, 0); s += `<text x="${sx - 16}" y="${p2[1] + ch / 2 + 4}" text-anchor="middle" fill="var(--text-faint)" style="font:700 11px var(--font-mono)">${items[r - 1]}</text>`; }
      for (var rr = 0; rr < rows; rr++) for (var cc = 0; cc < cols; cc++) {
        var pp = xy(rr, cc), v = dp[rr][cc];
        var isCur = cur && cur[0] === rr && cur[1] === cc;
        var isCon = contrib && contrib.some(function (p) { return p[0] === rr && p[1] === cc; });
        var fill = isCur ? "var(--brand-soft)" : isCon ? "var(--c-info-bg)" : v != null ? "var(--c-success-bg)" : "var(--surface-2)";
        var stroke = isCur ? "var(--accent)" : isCon ? "var(--accent)" : v != null ? "var(--c-success)" : "var(--border)";
        s += rect(pp[0], pp[1], cw, ch, { fill: fill, stroke: stroke, sw: isCur ? 2.4 : 1.1, r: 4 });
        s += `<text x="${pp[0] + cw / 2}" y="${pp[1] + ch / 2 + 4}" text-anchor="middle" fill="var(--text)" style="font:600 11px var(--font-sans)">${v == null ? "" : (mode === "subset-sum" ? (v ? "T" : "F") : v)}</text>`;
      }
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="dp table">${s}</svg>`, caption: cap2 };
    }
    var dp = Array.from({ length: rows }, function () { return new Array(cols).fill(null); }), frames = [];
    if (mode === "subset-sum") {
      var total = items.reduce(function (a, b) { return a + b; }, 0);
      if (total % 2 !== 0) { for (var c0 = 0; c0 < cols; c0++) dp[0][c0] = c0 === 0; frames.push(draw(dp, null, null, `Total ${total} is odd → it can't split into two equal halves. <b>false</b>.`)); return frames; }
      for (var r0 = 0; r0 < rows; r0++) dp[r0][0] = true; for (var c1 = 1; c1 < cols; c1++) dp[0][c1] = false;
      frames.push(draw(dp, null, null, `Can a subset sum to <b>${capInt}</b> (half of ${total})? dp[i][c] = can the first i numbers reach sum c. Column 0 is always T (the empty subset).`));
      for (var i = 1; i < rows; i++) { var it = items[i - 1]; for (var cc2 = 1; cc2 < cols; cc2++) { if (it > cc2) { dp[i][cc2] = dp[i - 1][cc2]; frames.push(draw(dp, [i, cc2], [[i - 1, cc2]], `${it} &gt; ${cc2} → can't use it; copy from above: ${dp[i][cc2] ? "T" : "F"}.`)); } else { dp[i][cc2] = dp[i - 1][cc2] || dp[i - 1][cc2 - it]; frames.push(draw(dp, [i, cc2], [[i - 1, cc2], [i - 1, cc2 - it]], `Skip (above ${dp[i - 1][cc2] ? "T" : "F"}) OR take ${it} (dp[${i - 1}][${cc2 - it}] = ${dp[i - 1][cc2 - it] ? "T" : "F"}) → <b>${dp[i][cc2] ? "T" : "F"}</b>.`)); } } }
      frames.push(draw(dp, [rows - 1, cols - 1], null, dp[rows - 1][cols - 1] ? `Bottom-right is T → the set splits into two equal halves. <b>true</b>.` : `Bottom-right is F → no equal split. <b>false</b>.`));
      return frames;
    }
    for (var r2 = 0; r2 < rows; r2++) dp[r2][0] = 1; for (var c2 = 1; c2 < cols; c2++) dp[0][c2] = 0;
    frames.push(draw(dp, null, null, `Count the ways to make each amount. dp[i][a] = ways using the first i coin types. Amount 0 has exactly 1 way (use nothing).`));
    for (var i2 = 1; i2 < rows; i2++) { var coin = items[i2 - 1]; for (var a = 1; a < cols; a++) { var without = dp[i2 - 1][a], wth = a >= coin ? dp[i2][a - coin] : 0; dp[i2][a] = without + wth; var con = [[i2 - 1, a]]; if (a >= coin) con.push([i2, a - coin]); frames.push(draw(dp, [i2, a], con, `Coin ${coin}, amount ${a}: ways without it (${without}) + ways reusing it (dp[${i2}][${a - coin >= 0 ? a - coin : "—"}] = ${wth}) = <b>${dp[i2][a]}</b>.`)); } }
    frames.push(draw(dp, [rows - 1, cols - 1], null, `Total ways to make ${capInt} = <b>${dp[rows - 1][cols - 1]}</b>.`));
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
    "dp-1d": dp1d,
    "tree": treeViz,
    "grid": gridViz,
    "dp-grid": dpGrid,
    "mono-stack": monoStack,
    "dp-linear": dpLinear,
    "intervals-merge": intervalsMerge,
    "linked-list": linkedList,
    "backtracking": backtracking,
    "heap": heapViz,
    "graph": graphViz,
    "prefix-product": prefixProduct,
    "trapping": trapping,
    "bsearch": bsearch,
    "matrix": matrixViz,
    "string-ops": stringOps,
    "array-rewrite": arrayRewrite,
    "bits": bitsViz,
    "knapsack": knapsack
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
    },

    /* ----- trees ----- */
    "invert-binary-tree": { title: "Watch the tree mirror", type: "tree", mode: "invert", data: [4, 2, 7, 1, 3, 6, 9] },
    "max-depth-binary-tree": { title: "Watch DFS measure the depth", type: "tree", mode: "max-depth", data: [3, 9, 20, null, null, 15, 7] },
    "minimum-depth-of-binary-tree": { title: "Watch BFS find the nearest leaf", type: "tree", mode: "min-depth", data: [3, 9, 20, null, null, 15, 7] },
    "diameter-of-binary-tree": { title: "Watch heights build the diameter", type: "tree", mode: "diameter", data: [1, 2, 3, 4, 5] },
    "balanced-binary-tree": { title: "Watch the balance check bubble up", type: "tree", mode: "balanced", data: [3, 9, 20, null, null, 15, 7] },
    "validate-bst": { title: "Watch the (low, high) bounds tighten", type: "tree", mode: "validate-bst", data: [5, 1, 4, null, null, 3, 6] },
    "kth-smallest-element-bst": { title: "Watch in-order reach the kth value", type: "tree", mode: "kth-smallest", data: [3, 1, 4, null, 2], k: 2 },
    "lowest-common-ancestor-bst": { title: "Watch the BST walk to the split", type: "tree", mode: "lca-bst", data: [6, 2, 8, 0, 4, 7, 9], p: 2, q: 8 },
    "path-sum": { title: "Watch the remaining sum shrink", type: "tree", mode: "path-sum", data: [5, 4, 8, 11, null, 13, 4], target: 26 },
    "count-good-nodes": { title: "Watch the path-max decide good nodes", type: "tree", mode: "count-good-nodes", data: [3, 1, 4, 3, null, 1, 5] },
    "level-order-traversal": { title: "Watch BFS sweep level by level", type: "tree", mode: "level-order", data: [3, 9, 20, null, null, 15, 7] },
    "binary-tree-right-side-view": { title: "Watch the rightmost nodes light up", type: "tree", mode: "right-side-view", data: [1, 2, 3, null, 5, null, 4] },
    "binary-tree-zigzag-level-order-traversal": { title: "Watch the levels alternate direction", type: "tree", mode: "zigzag", data: [3, 9, 20, null, null, 15, 7] },
    "binary-tree-maximum-path-sum": { title: "Watch each node's best bending path", type: "tree", mode: "max-path", data: [-10, 9, 20, null, null, 15, 7] },

    /* ----- grids ----- */
    "number-of-islands": { title: "Watch each island flood-fill", type: "grid", mode: "islands", data: [[1, 0, 1], [0, 0, 0], [1, 0, 1]] },
    "flood-fill": { title: "Watch the region recolor", type: "grid", mode: "flood-fill", data: [[1, 1, 1], [1, 1, 0], [1, 0, 1]], sr: 1, scc: 1, newColor: 2 },
    "rotting-oranges": { title: "Watch the rot spread per minute", type: "grid", mode: "rotting", data: [[2, 1, 1], [1, 1, 0], [0, 1, 1]] },
    "shortest-path-in-binary-matrix": { title: "Watch BFS reach the far corner", type: "grid", mode: "shortest-path", data: [[0, 0, 0], [1, 1, 0], [1, 1, 0]] },
    "walls-and-gates": { title: "Watch distances spread from the gates", type: "grid", mode: "walls-and-gates", data: [[2147483647, -1, 0, 2147483647], [2147483647, 2147483647, 2147483647, -1], [2147483647, -1, 2147483647, -1], [0, -1, 2147483647, 2147483647]] },
    "surrounded-regions": { title: "Watch border O's stay safe", type: "grid", mode: "surrounded", data: [["X", "X", "X", "X"], ["X", "O", "O", "X"], ["X", "X", "O", "X"], ["X", "O", "X", "X"]] },

    /* ----- 2-D DP ----- */
    "unique-paths": { title: "Watch the path counts add up", type: "dp-grid", mode: "unique-paths", m: 3, n: 4 },
    "minimum-path-sum": { title: "Watch each cell take the cheaper way in", type: "dp-grid", mode: "min-path-sum", grid: [[1, 3, 1], [1, 5, 1], [4, 2, 1]] },
    "maximal-square": { title: "Watch squares grow from the min neighbor", type: "dp-grid", mode: "maximal-square", grid: [[1, 0, 1, 0], [1, 1, 1, 1], [1, 1, 1, 1], [1, 0, 1, 1]] },
    "longest-common-subsequence": { title: "Watch matches extend the diagonal", type: "dp-grid", mode: "lcs", a: "abcde".split(""), b: "ace".split("") },
    "edit-distance": { title: "Watch each cell pick the cheapest edit", type: "dp-grid", mode: "edit-distance", a: "horse".split(""), b: "ros".split("") },

    /* ----- monotonic stack ----- */
    "daily-temperatures": { title: "Watch the stack resolve waiting days", type: "mono-stack", mode: "daily-temperatures", data: [73, 74, 75, 71, 69, 72, 76, 73] },
    "next-greater-element-ii": { title: "Watch the stack find next-greater", type: "mono-stack", mode: "next-greater", data: [2, 1, 2, 4, 3] },
    "largest-rectangle-in-histogram": { title: "Watch shorter bars finalize rectangles", type: "mono-stack", mode: "histogram", data: [2, 1, 5, 6, 2, 3] },

    /* ----- linear DP ----- */
    "house-robber": { title: "Watch take-or-skip fill the table", type: "dp-linear", mode: "house-robber", data: [2, 7, 9, 3, 1] },
    "min-cost-climbing-stairs": { title: "Watch the cheaper step win each cell", type: "dp-linear", mode: "min-cost-stairs", data: [10, 15, 20] },
    "coin-change": { title: "Watch fewest-coins build up", type: "dp-linear", mode: "coin-change", coins: [1, 2, 5], amount: 11 },

    /* ----- intervals ----- */
    "merge-intervals": { title: "Watch overlaps merge after sorting", type: "intervals-merge", mode: "merge", data: [[1, 3], [2, 6], [8, 10], [15, 18]] },
    "insert-interval": { title: "Watch the new interval fold in", type: "intervals-merge", mode: "insert", data: [[1, 3], [6, 9]], insert: [2, 5] },
    "non-overlapping-intervals": { title: "Watch the greedy keep earliest-ending", type: "intervals-merge", mode: "non-overlapping", data: [[1, 2], [2, 3], [3, 4], [1, 3]] },
    "meeting-rooms": { title: "Watch sorted starts reveal a clash", type: "intervals-merge", mode: "meeting-rooms", data: [[0, 30], [5, 10], [15, 20]] },

    /* ----- array-scan extras ----- */
    "maximum-product-subarray": { title: "Watch max and min flip on negatives", type: "array-scan", mode: "max-product", data: [2, 3, -2, 4] },
    "majority-element": { title: "Watch Boyer–Moore vote it out", type: "array-scan", mode: "majority", data: [2, 2, 1, 1, 1, 2, 2] },
    "find-pivot-index": { title: "Watch the left/right sums balance", type: "array-scan", mode: "pivot", data: [1, 7, 3, 6, 5, 6] },
    "subarray-sum-equals-k": { title: "Watch prefix sums count subarrays", type: "array-scan", mode: "subarray-sum", data: [1, 2, 3, -3, 1, 1, 1], k: 3 },
    "single-number": { title: "Watch XOR cancel the pairs", type: "array-scan", mode: "single-number", data: [4, 1, 2, 1, 2] },

    /* ----- array-scan extras (batch H) ----- */
    "jump-game": { title: "Watch the farthest reach grow", type: "array-scan", mode: "jump-game", data: [2, 3, 1, 1, 4] },
    "jump-game-ii": { title: "Watch each jump level expand", type: "array-scan", mode: "jump-game-ii", data: [2, 3, 1, 1, 4] },
    "gas-station": { title: "Watch the tank and restart point", type: "array-scan", mode: "gas-station", data: [-2, -2, -2, 3, 3] },
    "missing-number": { title: "Watch XOR reveal the gap", type: "array-scan", mode: "missing-number", data: [3, 0, 1] },

    /* ----- linked list ----- */
    "linked-list-cycle": { title: "Watch the tortoise and hare collide", type: "linked-list", mode: "cycle", data: [3, 2, 0, -4], pos: 1 },
    "middle-of-the-linked-list": { title: "Watch fast outrun slow to the middle", type: "linked-list", mode: "middle", data: [1, 2, 3, 4, 5] },
    "merge-two-sorted-lists": { title: "Watch the smaller head splice in", type: "linked-list", mode: "merge", a: [1, 2, 4], b: [1, 3, 4] },
    "remove-nth-node-from-end": { title: "Watch the n-gap pointers slide", type: "linked-list", mode: "remove-nth", data: [1, 2, 3, 4, 5], nth: 2 },
    "palindrome-linked-list": { title: "Watch both ends compare inward", type: "linked-list", mode: "palindrome", data: [1, 2, 2, 1] },
    "reorder-list": { title: "Watch split, reverse, and weave", type: "linked-list", mode: "reorder", data: [1, 2, 3, 4, 5] },
    "add-two-numbers": { title: "Watch digits add with carry", type: "linked-list", mode: "add", a: [2, 4, 3], b: [5, 6, 4] },
    "swap-nodes-in-pairs": { title: "Watch each adjacent pair flip", type: "linked-list", mode: "swap-pairs", data: [1, 2, 3, 4] },
    "intersection-of-two-linked-lists": { title: "Watch the pointers switch heads and meet", type: "linked-list", mode: "intersection", a: [4, 1], b: [5, 6, 1], shared: [8, 4, 5] },

    /* ----- backtracking ----- */
    "subsets": { title: "Watch the choice tree build the power set", type: "backtracking", mode: "subsets", data: [1, 2, 3] },
    "subsets-ii": { title: "Watch duplicate branches get pruned", type: "backtracking", mode: "subsets-ii", data: [1, 2, 2] },
    "permutations": { title: "Watch each position pick an unused value", type: "backtracking", mode: "permutations", data: [1, 2, 3] },
    "permutations-ii": { title: "Watch duplicate permutations get skipped", type: "backtracking", mode: "permutations-ii", data: [1, 1, 2] },
    "combinations": { title: "Watch k-of-n choices branch", type: "backtracking", mode: "combinations", n: 4, k: 2 },
    "combination-sum": { title: "Watch sums build toward the target", type: "backtracking", mode: "combination-sum", data: [2, 3, 6, 7], target: 7 },
    "combination-sum-ii": { title: "Watch each candidate used once", type: "backtracking", mode: "combination-sum-ii", data: [1, 2, 2, 3], target: 4 },
    "generate-parentheses": { title: "Watch valid bracket strings grow", type: "backtracking", mode: "gen-parens", n: 2 },
    "letter-combinations-of-a-phone-number": { title: "Watch each digit branch its letters", type: "backtracking", mode: "letter-combos", digits: "23" },
    "palindrome-partitioning": { title: "Watch only palindrome cuts survive", type: "backtracking", mode: "palindrome-partition", s: "aab" },

    /* ----- heap / priority queue ----- */
    "kth-largest-element": { title: "Watch a size-k min-heap hold the answer", type: "heap", mode: "kth-largest", data: [3, 2, 1, 5, 6, 4], k: 2 },
    "kth-largest-element-in-a-stream": { title: "Watch the kth largest update per add", type: "heap", mode: "kth-stream", data: [4, 5, 8, 2, 3, 10], k: 3 },
    "last-stone-weight": { title: "Watch the two heaviest smash", type: "heap", mode: "last-stone", data: [2, 7, 4, 1, 8, 1] },
    "k-closest-points-to-origin": { title: "Watch a max-heap drop the farthest", type: "heap", mode: "k-closest", points: [[1, 3], [-2, 2], [5, 8], [0, 1]], k: 2 },
    "top-k-frequent-elements": { title: "Watch bucket sort pick the top k", type: "heap", mode: "top-k-frequent", data: [1, 1, 1, 2, 2, 3], k: 2 },
    "find-median-from-data-stream": { title: "Watch two heaps straddle the median", type: "heap", mode: "median", data: [5, 2, 8, 1, 9] },
    "task-scheduler": { title: "Watch cooldown gaps fill the timeline", type: "heap", mode: "task-scheduler", tasks: ["A", "A", "A", "B", "B", "B"], cooldown: 2 },

    /* ----- graphs ----- */
    "course-schedule": { title: "Watch Kahn's sort clear prerequisites", type: "graph", mode: "can-finish", n: 4, edges: [[1, 0], [2, 0], [3, 1], [3, 2]] },
    "course-schedule-ii": { title: "Watch a valid course order emerge", type: "graph", mode: "topo-order", n: 4, edges: [[1, 0], [2, 0], [3, 1], [3, 2]] },
    "clone-graph": { title: "Watch BFS copy each node once", type: "graph", mode: "clone", n: 4, edges: [[0, 1], [0, 3], [1, 2], [2, 3]] },
    "number-of-provinces": { title: "Watch union-find merge provinces", type: "graph", mode: "provinces", n: 5, edges: [[0, 1], [1, 2], [3, 4]] },
    "number-of-connected-components": { title: "Watch components merge edge by edge", type: "graph", mode: "components", n: 5, edges: [[0, 1], [1, 2], [3, 4]] },
    "word-ladder": { title: "Watch BFS climb the word ladder", type: "graph", mode: "word-ladder", begin: "hit", end: "cog", words: ["hot", "dot", "dog", "lot", "log", "cog"] },
    "redundant-connection": { title: "Watch the cycle-closing edge get caught", type: "graph", mode: "redundant", n: 3, edges: [[0, 1], [1, 2], [0, 2]] },
    "graph-valid-tree": { title: "Watch union-find verify a tree", type: "graph", mode: "valid-tree", n: 5, edges: [[0, 1], [0, 2], [0, 3], [1, 4]] },

    /* ----- prefix products + trapping ----- */
    "product-of-array-except-self": { title: "Watch left then right products combine", type: "prefix-product", data: [1, 2, 3, 4] },
    "trapping-rain-water": { title: "Watch the bounded water fill", type: "trapping", data: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] },

    /* ===== batch I ===== */
    /* ----- binary search variants ----- */
    "search-rotated-sorted-array": { title: "Watch the sorted half guide the search", type: "bsearch", mode: "rotated", data: [4, 5, 6, 7, 0, 1, 2], target: 0 },
    "find-minimum-rotated-sorted-array": { title: "Watch mid vs. the right end find the dip", type: "bsearch", mode: "find-min", data: [4, 5, 6, 7, 0, 1, 2] },
    "search-insert-position": { title: "Watch lo land on the insert point", type: "bsearch", mode: "search-insert", data: [1, 3, 5, 6], target: 2 },
    "find-peak-element": { title: "Watch the search walk uphill", type: "bsearch", mode: "find-peak", data: [1, 2, 1, 3, 5, 6, 4] },
    "search-2d-matrix": { title: "Watch the matrix as one sorted list", type: "bsearch", mode: "search-2d", grid: [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], target: 16 },
    "koko-eating-bananas": { title: "Watch binary search on the speed", type: "bsearch", mode: "koko", piles: [3, 6, 7, 11], h: 8 },
    "find-first-and-last-position": { title: "Watch two biased searches find the edges", type: "bsearch", mode: "first-last", data: [5, 7, 7, 8, 8, 10], target: 8 },
    "sqrtx": { title: "Watch the answer space halve", type: "bsearch", mode: "sqrtx", x: 8 },

    /* ----- matrix ----- */
    "spiral-matrix": { title: "Watch the spiral peel inward", type: "matrix", mode: "spiral", data: [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]] },
    "rotate-image": { title: "Watch transpose then row-reverse", type: "matrix", mode: "rotate", data: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] },
    "set-matrix-zeroes": { title: "Watch zero rows and columns spread", type: "matrix", mode: "set-zeroes", data: [[1, 1, 1], [1, 0, 1], [1, 1, 1]] },

    /* ----- string operations ----- */
    "valid-anagram": { title: "Watch counts cancel to zero", type: "string-ops", mode: "valid-anagram", s: "anagram", t: "nagaram" },
    "group-anagrams": { title: "Watch sorted keys form groups", type: "string-ops", mode: "group-anagrams", words: ["eat", "tea", "tan", "ate", "nat", "bat"] },
    "longest-consecutive-sequence": { title: "Watch runs grow from their starts", type: "string-ops", mode: "longest-consecutive", data: [100, 4, 200, 1, 3, 2] },
    "longest-common-prefix": { title: "Watch the vertical column scan", type: "string-ops", mode: "common-prefix", words: ["flower", "flow", "flight"] },
    "roman-to-integer": { title: "Watch subtract-before-larger in action", type: "string-ops", mode: "roman", s: "MCMXCIV" },
    "find-index-of-first-occurrence": { title: "Watch the pattern slide and match", type: "string-ops", mode: "substring", text: "hello", pattern: "ll" },

    /* ----- array rewrite in place ----- */
    "sort-colors": { title: "Watch the Dutch-flag three-way split", type: "array-rewrite", mode: "sort-colors", data: [2, 0, 2, 1, 1, 0] },
    "move-zeroes": { title: "Watch non-zeros slide forward", type: "array-rewrite", mode: "move-zeroes", data: [0, 1, 0, 3, 12] },
    "squares-of-a-sorted-array": { title: "Watch the back fill with bigger squares", type: "array-rewrite", mode: "squares", data: [-4, -1, 0, 3, 10] },
    "remove-duplicates-from-sorted-array": { title: "Watch the write pointer keep uniques", type: "array-rewrite", mode: "remove-duplicates", data: [0, 0, 1, 1, 1, 2, 2, 3] },
    "merge-sorted-array": { title: "Watch the merge fill from the back", type: "array-rewrite", mode: "merge", nums1: [1, 2, 3], nums2: [2, 5, 6], m: 3 },
    "remove-element": { title: "Watch the keepers compact forward", type: "array-rewrite", mode: "remove-element", data: [3, 2, 2, 3], val: 3 },
    "find-all-numbers-disappeared-in-an-array": { title: "Watch the array mark itself", type: "array-rewrite", mode: "disappeared", data: [4, 3, 2, 7, 8, 2, 3, 1] },

    /* ----- bit manipulation ----- */
    "number-of-1-bits": { title: "Watch n & (n−1) clear bits", type: "bits", mode: "ones", n: 11 },
    "counting-bits": { title: "Watch the DP reuse n>>1", type: "bits", mode: "counting-bits", n: 8 },
    "reverse-bits": { title: "Watch bits flow end to end", type: "bits", mode: "reverse-bits", n: 43, bits: 8 },
    "sum-of-two-integers": { title: "Watch XOR and carry add numbers", type: "bits", mode: "add", a: 3, b: 5, bits: 6 },

    /* ----- knapsack-style DP ----- */
    "partition-equal-subset-sum": { title: "Watch the subset-sum table fill", type: "knapsack", mode: "subset-sum", data: [1, 5, 11, 5] },
    "coin-change-ii": { title: "Watch ways accumulate per coin", type: "knapsack", mode: "coin-ways", coins: [1, 2, 5], amount: 5 },

    /* ----- extended existing renderers ----- */
    "3sum": { title: "Watch fix-i then two-pointer", type: "two-pointer", mode: "3sum", data: [-1, 0, 1, 2, -1, -4] },
    "longest-increasing-subsequence": { title: "Watch each dp extend the best run", type: "dp-linear", mode: "lis", data: [10, 9, 2, 5, 3, 7, 101, 18] },
    "minimum-size-subarray-sum": { title: "Watch the window shrink to minimum", type: "sliding-window", mode: "min-subarray-sum", data: [2, 3, 1, 2, 4, 3], target: 7 },
    "longest-repeating-character-replacement": { title: "Watch replacements stretch the window", type: "sliding-window", mode: "longest-repeat", data: "AABABBA", k: 1 },
    "max-consecutive-ones-iii": { title: "Watch flipped zeros extend the run", type: "sliding-window", mode: "max-ones", data: [1, 1, 1, 0, 0, 1, 1, 1, 0, 1], k: 2 },
    "contains-duplicate-ii": { title: "Watch the k-window catch a repeat", type: "array-scan", mode: "contains-duplicate-ii", data: [1, 2, 3, 1], k: 3 },
    "majority-element-ii": { title: "Watch two candidates survive voting", type: "array-scan", mode: "majority-2", data: [1, 1, 1, 3, 3, 2, 2, 2] },
    "flatten-binary-tree-to-linked-list": { title: "Watch preorder become the list", type: "tree", mode: "flatten", data: [1, 2, 5, 3, 4, null, 6] },
    "lowest-common-ancestor-binary-tree": { title: "Watch both sides meet at the LCA", type: "tree", mode: "lca-general", data: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 5, q: 1 },
    "path-sum-ii": { title: "Watch every winning path light up", type: "tree", mode: "path-sum-ii", data: [5, 4, 8, 11, null, 13, 9, 7, 2], target: 22 }
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

  if (typeof window !== "undefined") window.__DEVLENS_VIZ__ = { RENDERERS: RENDERERS, CONFIGS: CONFIGS };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
