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
    } else if (mode === "summary-ranges") {
      var ranges = [], start = 0;
      frames.push(frame(-1, null, "Group a sorted array into consecutive ranges. Walk once; whenever the next value isn't exactly +1, close the current run.", "ranges: []"));
      for (var i = 0; i < a.length; i++) {
        var end = (i === a.length - 1 || a[i + 1] !== a[i] + 1);
        if (end) { var rng = a[start] === a[i] ? ("" + a[start]) : (a[start] + "→" + a[i]); ranges.push(rng); frames.push(frame(i, mark(i, "var(--c-success-bg)", "var(--c-success)"), `${a[start] === a[i] ? `Single value ${a[i]}` : `Run ${a[start]}…${a[i]}`} ends → emit <b>${rng}</b>.`, "ranges: [" + ranges.join(", ") + "]")); start = i + 1; }
        else frames.push(frame(i, null, `${a[i]} → ${a[i + 1]} continues (+1).`, "ranges: [" + ranges.join(", ") + "]"));
      }
      frames.push(frame(-1, null, `Result: [${ranges.join(", ")}].`, "done"));
    } else if (mode === "wiggle") {
      var up = null, count = 1;
      frames.push(frame(0, mark(0, "var(--brand-soft)", "var(--accent)"), "Longest wiggle subsequence: count every time the trend flips between rising and falling. Flat steps don't count.", "length = 1"));
      for (var i = 1; i < a.length; i++) { var d = a[i] - a[i - 1]; if (d > 0 && up !== true) { up = true; count++; frames.push(frame(i, null, `${a[i - 1]} → ${a[i]} is a <b>rise</b> after a fall (or the first) → +1. Length ${count}.`, "length = " + count)); } else if (d < 0 && up !== false) { up = false; count++; frames.push(frame(i, null, `${a[i - 1]} → ${a[i]} is a <b>fall</b> after a rise → +1. Length ${count}.`, "length = " + count)); } else frames.push(frame(i, null, `${a[i - 1]} → ${a[i]} keeps the same trend (or is flat) → skip.`, "length = " + count)); }
      frames.push(frame(-1, null, `Longest wiggle subsequence = <b>${count}</b>.`, "length = " + count));
    } else if (mode === "lemonade") {
      var five = 0, ten = 0, ok = true;
      frames.push(frame(-1, null, "Each customer pays $5/$10/$20 for a $5 item. Give change greedily, spending $10 bills before $5s (the $5 is the most flexible).", "$5:0 $10:0"));
      for (var i = 0; i < a.length && ok; i++) { var b = a[i]; if (b === 5) { five++; frames.push(frame(i, null, "Pays $5 — no change needed.", `$5:${five} $10:${ten}`)); } else if (b === 10) { if (five > 0) { five--; ten++; frames.push(frame(i, null, "Pays $10 → give back one $5.", `$5:${five} $10:${ten}`)); } else { ok = false; frames.push(frame(i, mark(i, "var(--c-warning-bg)", "var(--c-warning)"), "Need a $5 to change $10 but none left → <b>false</b>.", "stuck")); } } else { if (ten > 0 && five > 0) { ten--; five--; frames.push(frame(i, null, "Pays $20 → give $10 + $5.", `$5:${five} $10:${ten}`)); } else if (five >= 3) { five -= 3; frames.push(frame(i, null, "Pays $20 → give three $5s.", `$5:${five} $10:${ten}`)); } else { ok = false; frames.push(frame(i, mark(i, "var(--c-warning-bg)", "var(--c-warning)"), "Can't make $15 change → <b>false</b>.", "stuck")); } } }
      if (ok) frames.push(frame(-1, null, "Served everyone → <b>true</b>.", "done"));
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
    } else if (mode === "palindrome-ii") {
      function isPal(lo, hi) { while (lo < hi) { if (a[lo] !== a[hi]) return false; lo++; hi--; } return true; }
      frames.push(frame(left, right, null, "Almost-palindrome: deleting at most one character should leave a palindrome. Compare from both ends; on the first mismatch, test skipping the left OR the right character."));
      while (left < right) { var st = {}; if (a[left] === a[right]) { st[left] = hl("var(--accent)"); st[right] = hl("var(--accent)"); frames.push(frame(left, right, st, `'${a[left]}' = '${a[right]}' ✓ — move inward.`)); left++; right--; } else { var sL = isPal(left + 1, right), sR = isPal(left, right - 1); st[left] = hl("var(--c-warning)"); st[right] = hl("var(--c-warning)"); frames.push(frame(left, right, st, `'${a[left]}' ≠ '${a[right]}' → spend the one deletion: ${sL ? "skip the left '" + a[left] + "' ✓" : sR ? "skip the right '" + a[right] + "' ✓" : "neither side works"} → <b>${(sL || sR) ? "true" : "false"}</b>.`)); return frames; } }
      frames.push(frame(left, right, null, "Matched all the way without deleting anything → <b>true</b>."));
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
    } else if (mode === "3sum-closest") {
      var arrC = a.slice().sort(function (x, y) { return x - y; });
      grid = valueCells(arrC, { W: W, y: 44, h: 44 });
      var tgt = cfg.target, best = arrC[0] + arrC[1] + arrC[2];
      function fc(i, l, r, cap, panel) {
        var inner = grid.draw(function (k) { if (k === i) return { fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", sw: 2.2, lab: "var(--c-warning)" }; if (k === l || k === r) return hl("var(--accent)"); if (l >= 0 && (k < l || k > r) && k !== i) return { op: 0.3 }; return {}; }, true);
        inner += ptrMark(grid, i, "i", "var(--c-warning)", false); inner += ptrMark(grid, l, "L", "var(--accent)", true); inner += ptrMark(grid, r, "R", "var(--accent)", true);
        if (panel) inner += `<text x="${W / 2}" y="${H - 8}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${panel}</text>`;
        return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="3sum closest">${inner}</svg>`, caption: cap };
      }
      frames.push(fc(-1, -1, -1, `Find the triplet sum closest to <b>${tgt}</b>. Sort, fix i, and two-pointer the rest, tracking the smallest |sum − target|.`, `target = ${tgt} · closest = ${best}`));
      for (var i = 0; i < arrC.length - 2; i++) {
        var l = i + 1, r = arrC.length - 1;
        while (l < r) {
          var sum = arrC[i] + arrC[l] + arrC[r];
          if (Math.abs(sum - tgt) < Math.abs(best - tgt)) best = sum;
          if (sum === tgt) { frames.push(fc(i, l, r, `${arrC[i]}+${arrC[l]}+${arrC[r]} = ${tgt} exactly → closest possible.`, `closest = ${best}`)); return frames; }
          frames.push(fc(i, l, r, `${arrC[i]}+${arrC[l]}+${arrC[r]} = ${sum} (${sum < tgt ? "&lt; target, move L" : "&gt; target, move R"}). Closest so far ${best}.`, `closest = ${best}`));
          if (sum < tgt) l++; else r--;
        }
      }
      frames.push(fc(-1, -1, -1, `Closest achievable sum = <b>${best}</b>.`, `closest = ${best}`));
    } else if (mode === "4sum") {
      var arr4 = a.slice().sort(function (x, y) { return x - y; });
      grid = valueCells(arr4, { W: W, y: 44, h: 44 });
      var t4 = cfg.target, quads = [];
      function f4(i, j, l, r, style, cap, panel) {
        var inner = grid.draw(function (k) { if (style && style[k]) return style[k]; if (k === i) return { fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", sw: 2.2, lab: "var(--c-warning)" }; if (k === j) return { fill: "var(--c-info-bg)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" }; if (l >= 0 && (k < l || k > r) && k !== i && k !== j) return { op: 0.3 }; return {}; }, true);
        inner += ptrMark(grid, i, "i", "var(--c-warning)", false); inner += ptrMark(grid, j, "j", "var(--accent)", false); inner += ptrMark(grid, l, "L", "var(--accent)", true); inner += ptrMark(grid, r, "R", "var(--accent)", true);
        if (panel) inner += `<text x="${W / 2}" y="${H - 8}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${panel}</text>`;
        return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="4sum">${inner}</svg>`, caption: cap };
      }
      frames.push(f4(-1, -1, -1, -1, null, `4Sum: sort, then fix <b>i</b> and <b>j</b> and two-pointer the rest for sum = ${t4}. Two nested fixes + one linear scan → O(n³).`, `quads: 0`));
      for (var i = 0; i < arr4.length - 3; i++) {
        if (i > 0 && arr4[i] === arr4[i - 1]) continue;
        for (var j = i + 1; j < arr4.length - 2; j++) {
          if (j > i + 1 && arr4[j] === arr4[j - 1]) continue;
          var l = j + 1, r = arr4.length - 1;
          while (l < r) {
            var s4 = arr4[i] + arr4[j] + arr4[l] + arr4[r];
            if (s4 === t4) { quads.push([arr4[i], arr4[j], arr4[l], arr4[r]]); var st = {}; st[i] = hl("var(--c-success)"); st[j] = hl("var(--c-success)"); st[l] = hl("var(--c-success)"); st[r] = hl("var(--c-success)"); frames.push(f4(i, j, l, r, st, `${arr4[i]}+${arr4[j]}+${arr4[l]}+${arr4[r]} = ${t4} ✓ → quad <b>[${arr4[i]}, ${arr4[j]}, ${arr4[l]}, ${arr4[r]}]</b>.`, `quads: ${quads.length}`)); l++; r--; while (l < r && arr4[l] === arr4[l - 1]) l++; while (l < r && arr4[r] === arr4[r + 1]) r--; }
            else if (s4 < t4) { frames.push(f4(i, j, l, r, null, `sum ${s4} &lt; ${t4} → move L right.`, `quads: ${quads.length}`)); l++; }
            else { frames.push(f4(i, j, l, r, null, `sum ${s4} &gt; ${t4} → move R left.`, `quads: ${quads.length}`)); r--; }
          }
        }
      }
      frames.push(f4(-1, -1, -1, -1, null, `Found <b>${quads.length}</b> quadruplet(s): ${quads.map(function (q) { return "[" + q.join(",") + "]"; }).join("  ")}.`, `quads: ${quads.length}`));
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
    } else if (mode === "max-ones") {
      var kz = cfg.k, zeros = 0;
      frames.push(frame(0, -1, `Longest run of 1s if you may flip ≤ <b>${kz}</b> zeros. Keep a window with at most ${kz} zeros; when it has too many, shrink from the left.`, "zeros = 0 · best = 0"));
      for (var r4 = 0; r4 < vals.length; r4++) {
        if (vals[r4] === 0) zeros++;
        while (zeros > kz) { if (vals[left] === 0) zeros--; left++; }
        best = Math.max(best, r4 - left + 1);
        frames.push(frame(left, r4, `Include index ${r4} (${vals[r4]}). Window has ${zeros} zero(s) ≤ ${kz} → length ${r4 - left + 1}, best <b>${best}</b>.`, `zeros = ${zeros} · best = ${best}`));
      }
      frames.push(frame(left, vals.length - 1, `Longest window of 1s with ≤ ${kz} flips = <b>${best}</b>.`, `best = ${best}`));
    } else if (mode === "anagrams") {
      var p = cfg.p, need = {}, win = {}, pl = p.length, found = [];
      for (var pc = 0; pc < p.length; pc++) need[p[pc]] = (need[p[pc]] || 0) + 1;
      function matches() { for (var k in need) { if ((win[k] || 0) !== need[k]) return false; } return true; }
      frames.push(frame(0, -1, `Find windows of "${typeof a === "string" ? a : a.join("")}" that are anagrams of "${p}". Slide a fixed window of size ${pl}; a match is when its letter counts equal those of "${p}".`, `need = {${Object.keys(need).map(function (k) { return k + ":" + need[k]; }).join(", ")}}`));
      for (var ar = 0; ar < vals.length; ar++) {
        win[vals[ar]] = (win[vals[ar]] || 0) + 1;
        if (ar - left + 1 > pl) { win[vals[left]]--; if (win[vals[left]] === 0) delete win[vals[left]]; left++; }
        var okA = (ar - left + 1 === pl) && matches();
        if (okA) { found.push(left); frames.push(frame(left, ar, `Window "${vals.slice(left, ar + 1).join("")}" matches the counts → anagram at index <b>${left}</b>.`, cfg.findAll ? `matches: [${found.join(", ")}]` : "match found")); if (!cfg.findAll) return frames; }
        else frames.push(frame(left, ar, `Window "${vals.slice(left, ar + 1).join("")}"${ar - left + 1 < pl ? " (filling)" : " ≠ target counts"}.`, cfg.findAll ? `matches: [${found.join(", ")}]` : "scanning"));
      }
      frames.push(frame(-1, -1, cfg.findAll ? `Anagram start indices: <b>[${found.join(", ")}]</b>.` : `No permutation of "${p}" occurs → false.`, "done"));
    } else if (mode === "min-window") {
      var t = cfg.t, needM = {}, have = {}, formed = 0, bestLen = Infinity, bestL = 0;
      for (var tc = 0; tc < t.length; tc++) needM[t[tc]] = (needM[t[tc]] || 0) + 1;
      var required = Object.keys(needM).length;
      frames.push(frame(0, -1, `Smallest window of "${typeof a === "string" ? a : a.join("")}" containing all of "${t}". Expand right until the window has every needed char, then shrink left to minimise it.`, `formed 0/${required}`));
      for (var mr = 0; mr < vals.length; mr++) {
        var ch = vals[mr]; if (needM[ch] !== undefined) { have[ch] = (have[ch] || 0) + 1; if (have[ch] === needM[ch]) formed++; }
        frames.push(frame(left, mr, `Add '${ch}'. Have ${formed}/${required} required chars.`, `window "${vals.slice(left, mr + 1).join("")}"`));
        while (formed === required) {
          if (mr - left + 1 < bestLen) { bestLen = mr - left + 1; bestL = left; }
          var lc = vals[left]; if (needM[lc] !== undefined) { have[lc]--; if (have[lc] < needM[lc]) formed--; }
          frames.push(frame(left, mr, `Valid window (len ${mr - left + 1}); best so far ${bestLen === Infinity ? "∞" : bestLen}. Shrink: drop '${lc}'.`, `best = "${bestLen === Infinity ? "" : vals.slice(bestL, bestL + bestLen).join("")}"`));
          left++;
        }
      }
      frames.push(frame(bestLen === Infinity ? -1 : bestL, bestLen === Infinity ? -1 : bestL + bestLen - 1, bestLen === Infinity ? `No window contains all of "${t}".` : `Minimum window = <b>"${vals.slice(bestL, bestL + bestLen).join("")}"</b>.`, "done"));
    } else if (mode === "product-window") {
      var kp = cfg.target, prod = 1, count = 0;
      frames.push(frame(0, -1, `Count contiguous subarrays with product &lt; <b>${kp}</b>. Expand right (×= value); while the product ≥ ${kp}, shrink left. Each step adds (window length) new subarrays.`, "product = 1 · count = 0"));
      for (var pr = 0; pr < vals.length; pr++) { prod *= vals[pr]; while (prod >= kp && left <= pr) { prod /= vals[left]; left++; } count += pr - left + 1; frames.push(frame(left, pr, `× ${vals[pr]} → product ${prod}. Window length ${pr - left + 1} adds that many subarrays → total ${count}.`, `product = ${prod} · count = ${count}`)); }
      frames.push(frame(left, vals.length - 1, `Subarrays with product &lt; ${kp}: <b>${count}</b>.`, `count = ${count}`));
    } else if (mode === "k-distinct") {
      var kd = cfg.k, cnt2 = {}, distinct2 = 0;
      frames.push(frame(0, -1, `Longest substring with at most <b>${kd}</b> distinct characters. Grow right; if the distinct count exceeds ${kd}, shrink from the left.`, "distinct = 0 · best = 0"));
      for (var kr = 0; kr < vals.length; kr++) { cnt2[vals[kr]] = (cnt2[vals[kr]] || 0) + 1; if (cnt2[vals[kr]] === 1) distinct2++; while (distinct2 > kd) { cnt2[vals[left]]--; if (cnt2[vals[left]] === 0) distinct2--; left++; } best = Math.max(best, kr - left + 1); frames.push(frame(left, kr, `Add '${vals[kr]}'. Window "${vals.slice(left, kr + 1).join("")}" has ${distinct2} distinct ≤ ${kd} → length ${kr - left + 1}, best ${best}.`, `distinct = ${distinct2} · best = ${best}`)); }
      frames.push(frame(left, vals.length - 1, `Longest with ≤ ${kd} distinct = <b>${best}</b>.`, `best = ${best}`));
    } else { // fruit-into-baskets (≤ 2 distinct)
      var counts = {}, distinct = 0;
      frames.push(frame(0, -1, "Two baskets, each holding one fruit type → longest subarray with ≤ 2 distinct values. Grow right; if a third type appears, shrink left until two remain.", "distinct = 0 · best = 0"));
      for (var fr2 = 0; fr2 < vals.length; fr2++) {
        counts[vals[fr2]] = (counts[vals[fr2]] || 0) + 1; if (counts[vals[fr2]] === 1) distinct++;
        while (distinct > 2) { counts[vals[left]]--; if (counts[vals[left]] === 0) distinct--; left++; }
        best = Math.max(best, fr2 - left + 1);
        frames.push(frame(left, fr2, `Add ${vals[fr2]}. Window has ${distinct} type(s) → length ${fr2 - left + 1}, best <b>${best}</b>.`, `distinct = ${distinct} · best = ${best}`));
      }
      frames.push(frame(left, vals.length - 1, `Most fruit collected = <b>${best}</b>.`, `best = ${best}`));
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
    } else if (mode === "all-paths") {
      var paths = [];
      push("List every root-to-leaf path. DFS, extending the path at each node; at a leaf, record the whole path.");
      (function dfs(n, path) { if (!n) return; active = n; var p2 = path.concat(n.val); if (!n.left && !n.right) { paths.push(p2.join("→")); special[n.val] = "visited"; push(`Leaf <b>${n.val}</b> → record "${p2.join("→")}". Total: ${paths.length}.`); special[n.val] = null; visited.push(n); active = null; return; } push(`At ${n.val}, path so far: ${p2.join("→")}.`); visited.push(n); active = null; dfs(n.left, p2); dfs(n.right, p2); })(root, []);
      active = null; push(`All root-to-leaf paths: ${paths.map(function (p) { return '"' + p + '"'; }).join(", ")}.`);
    } else if (mode === "root-to-leaf-sum") {
      var total = 0;
      push("Each root-to-leaf path spells a number (digits top to bottom). Carry a running value = cur×10 + node, and sum the values at the leaves.");
      (function dfs(n, cur) { if (!n) return; active = n; var num = cur * 10 + n.val; if (!n.left && !n.right) { total += num; special[n.val] = "visited"; push(`Leaf <b>${n.val}</b> completes the number <b>${num}</b> → running total ${total}.`); special[n.val] = null; visited.push(n); active = null; return; } push(`At ${n.val}: number so far = ${num}.`); visited.push(n); active = null; dfs(n.left, num); dfs(n.right, num); })(root, 0);
      active = null; push(`Sum of all root-to-leaf numbers = <b>${total}</b>.`);
    } else if (mode === "path-sum-iii") {
      var target3 = cfg.target, count = 0, prefix = { 0: 1 };
      push(`Count downward paths summing to <b>${target3}</b> — they may start at any node. Carry a running prefix sum from the root; a qualifying path ends here whenever (prefix − target) was seen earlier.`);
      (function dfs(n, run) { if (!n) return; active = n; run += n.val; var add = prefix[run - target3] || 0; count += add; push(`At <b>${n.val}</b>: prefix ${run}. Paths ending here = times we've seen ${run - target3} → ${add}. Total: ${count}.`); prefix[run] = (prefix[run] || 0) + 1; visited.push(n); active = null; dfs(n.left, run); dfs(n.right, run); prefix[run]--; })(root, 0);
      active = null; push(`Number of paths summing to ${target3} = <b>${count}</b>.`);
    } else if (mode === "range-sum-bst") {
      var lo = cfg.low, hi = cfg.high, sum = 0;
      push(`Sum the BST values in [<b>${lo}, ${hi}</b>]. Exploit BST order to prune: a node &lt; low has nothing useful on its left; a node &gt; high, nothing on its right.`);
      (function dfs(n) { if (!n) return; active = n; var inR = n.val >= lo && n.val <= hi; if (inR) { sum += n.val; special[n.val] = "visited"; } push(`<b>${n.val}</b>: ${inR ? `in range → add it (sum ${sum})` : n.val < lo ? "&lt; low → only explore right" : "&gt; high → only explore left"}.`); if (!inR) visited.push(n); active = null; if (n.val > lo) dfs(n.left); if (n.val < hi) dfs(n.right); })(root);
      active = null; push(`Range sum = <b>${sum}</b>.`);
    } else if (mode === "level-average") {
      push("Average value at each depth. BFS level by level; sum each row and divide by its size.");
      var lv = bfsLevels(), avgs = [];
      for (var i = 0; i < lv.length; i++) { var s = 0; lv[i].forEach(function (n) { s += n.val; special[n.val] = "active"; }); var avg = Math.round(s / lv[i].length * 100) / 100; avgs.push(avg); push(`Level ${i}: [${lv[i].map(function (n) { return n.val; }).join(", ")}] → ${s}/${lv[i].length} = <b>${avg}</b>.`); lv[i].forEach(function (n) { special[n.val] = null; visited.push(n); }); }
      push(`Averages by level: [${avgs.join(", ")}].`);
    } else if (mode === "min-diff-bst") {
      var prev = null, bestD = Infinity;
      push("In-order traversal of a BST yields sorted values, so the minimum absolute difference is always between <b>adjacent</b> in-order neighbours.");
      (function ino(n) { if (!n) return; ino(n.left); active = n; var note = ""; if (prev !== null) { var d = Math.abs(n.val - prev); if (d < bestD) { bestD = d; note = ` |${n.val}−${prev}| = ${d} — new minimum!`; } else note = ` |${n.val}−${prev}| = ${d}.`; } push(`Visit <b>${n.val}</b> (in-order).${note}`); visited.push(n); active = null; prev = n.val; ino(n.right); })(root);
      active = null; push(`Minimum absolute difference = <b>${bestD}</b>.`);
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
    } else if (mode === "pacific-atlantic") {
      function reach(starts) { var seen = Array.from({ length: R }, function () { return new Array(C).fill(false); }); var st = []; starts.forEach(function (p) { seen[p[0]][p[1]] = true; st.push(p); }); while (st.length) { var p = st.pop(); dirs.forEach(function (d) { var nr = p[0] + d[0], nc = p[1] + d[1]; if (nr >= 0 && nc >= 0 && nr < R && nc < C && !seen[nr][nc] && g[nr][nc] >= g[p[0]][p[1]]) { seen[nr][nc] = true; st.push([nr, nc]); } }); } return seen; }
      var pacStarts = [], atlStarts = [];
      for (var c = 0; c < C; c++) { pacStarts.push([0, c]); atlStarts.push([R - 1, c]); }
      for (var r = 0; r < R; r++) { pacStarts.push([r, 0]); atlStarts.push([r, C - 1]); }
      var pac = reach(pacStarts), atl = reach(atlStarts);
      function pcell(rr, cc, show) { var base = { t: g[rr][cc], lab: "var(--text-faint)" }; if (show === "pac") return pac[rr][cc] ? { fill: "var(--c-info-bg)", stroke: "var(--accent)", t: g[rr][cc], lab: "var(--accent)" } : base; if (show === "atl") return atl[rr][cc] ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", t: g[rr][cc], lab: "var(--c-success)" } : base; return (pac[rr][cc] && atl[rr][cc]) ? { fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", t: g[rr][cc], lab: "var(--c-warning)", sw: 2.2 } : (pac[rr][cc] || atl[rr][cc]) ? { fill: "var(--surface-hover)", t: g[rr][cc], lab: "var(--text-muted)" } : base; }
      frames.push(draw(function (rr, cc) { return { t: g[rr][cc], lab: "var(--text-faint)" }; }, "Water flows from a cell to equal-or-lower neighbours. Find cells that reach <b>both</b> the Pacific (top &amp; left edges) and the Atlantic (bottom &amp; right)."));
      frames.push(draw(function (rr, cc) { return pcell(rr, cc, "pac"); }, "Reverse-flood from the <b>Pacific</b> border, climbing only to cells ≥ the current height."));
      frames.push(draw(function (rr, cc) { return pcell(rr, cc, "atl"); }, "Reverse-flood from the <b>Atlantic</b> border the same way."));
      var both = []; for (var rr = 0; rr < R; rr++) for (var cc = 0; cc < C; cc++) if (pac[rr][cc] && atl[rr][cc]) both.push("(" + rr + "," + cc + ")");
      frames.push(draw(function (rr, cc) { return pcell(rr, cc, "both"); }, `Cells reaching <b>both</b> oceans (gold): ${both.join(" ")}.`));
    } else if (mode === "swim") {
      var INF = 1e9, time = Array.from({ length: R }, function () { return new Array(C).fill(INF); }); time[0][0] = g[0][0];
      var settled = Array.from({ length: R }, function () { return new Array(C).fill(false); });
      function snapS(active, cap) { frames.push(draw(function (rr, cc) { if (active && active[0] === rr && active[1] === cc) return { fill: "var(--brand-soft)", stroke: "var(--accent)", t: g[rr][cc], lab: "var(--accent)", sw: 2.4 }; if (settled[rr][cc]) return { fill: "var(--c-info-bg)", stroke: "var(--accent)", t: time[rr][cc], lab: "var(--accent)" }; return { t: g[rr][cc], lab: "var(--text-faint)" }; }, cap)); }
      snapS(null, "Swim in rising water: minimise the <b>highest</b> elevation crossed from corner to corner. Dijkstra where a path's cost is the maximum cell on it.");
      var guardS = 0;
      while (guardS++ < R * C + 2) { var bu = null, bt = INF; for (var rr = 0; rr < R; rr++) for (var cc = 0; cc < C; cc++) if (!settled[rr][cc] && time[rr][cc] < bt) { bt = time[rr][cc]; bu = [rr, cc]; } if (!bu) break; settled[bu[0]][bu[1]] = true; if (bu[0] === R - 1 && bu[1] === C - 1) { snapS(bu, `Reached the far corner — least possible max-elevation = <b>${time[bu[0]][bu[1]]}</b> (the answer time).`); break; } dirs.forEach(function (d) { var nr = bu[0] + d[0], nc = bu[1] + d[1]; if (nr >= 0 && nc >= 0 && nr < R && nc < C && !settled[nr][nc]) { var nt = Math.max(time[bu[0]][bu[1]], g[nr][nc]); if (nt < time[nr][nc]) time[nr][nc] = nt; } }); snapS(bu, `Settle (${bu[0]},${bu[1]}) at time ${time[bu[0]][bu[1]]}; relax neighbours with cost = max(time, their elevation).`); }
    } else if (mode === "word-search") {
      var word = cfg.word, path = [], foundPath = null;
      var vis = Array.from({ length: R }, function () { return new Array(C).fill(false); });
      function snapW(cap, bad) { var sp = path.slice(); frames.push(draw(function (rr, cc) { if (foundPath && foundPath.some(function (p) { return p[0] === rr && p[1] === cc; })) return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", t: g[rr][cc], lab: "var(--c-success)", sw: 2.2 }; var pi = -1; for (var z = 0; z < sp.length; z++) if (sp[z][0] === rr && sp[z][1] === cc) pi = z; if (pi === sp.length - 1) return { fill: bad ? "var(--c-warning-bg)" : "var(--brand-soft)", stroke: bad ? "var(--c-warning)" : "var(--accent)", t: g[rr][cc], lab: bad ? "var(--c-warning)" : "var(--accent)", sw: 2.4 }; if (pi >= 0) return { fill: "var(--c-info-bg)", stroke: "var(--accent)", t: g[rr][cc], lab: "var(--accent)" }; return { t: g[rr][cc], lab: "var(--text-faint)" }; }, cap)); }
      frames.push(draw(function (rr, cc) { return { t: g[rr][cc], lab: "var(--text-faint)" }; }, `Search the grid for "<b>${word}</b>" with DFS: match letters along 4-directional paths, backtracking the moment one mismatches.`));
      function dfsW(r, c, k) { if (foundPath) return true; if (r < 0 || c < 0 || r >= R || c >= C || vis[r][c] || g[r][c] !== word[k]) return false; vis[r][c] = true; path.push([r, c]); if (k === word.length - 1) { foundPath = path.slice(); snapW(`Matched the last letter '${word[k]}' → <b>found "${word}"</b>!`); return true; } snapW(`'${g[r][c]}' = word[${k}] ✓ — extend the path.`); for (var di = 0; di < dirs.length; di++) { if (dfsW(r + dirs[di][0], c + dirs[di][1], k + 1)) return true; } vis[r][c] = false; path.pop(); return false; }
      for (var r = 0; r < R && !foundPath; r++) for (var c = 0; c < C && !foundPath; c++) if (g[r][c] === word[0]) dfsW(r, c, 0);
      if (!foundPath) frames.push(draw(function (rr, cc) { return { t: g[rr][cc], lab: "var(--text-faint)" }; }, `"${word}" is not in the grid.`));
    } else if (mode === "staircase") {
      var target = cfg.target, r = 0, c = C - 1, found = null;
      function snapSt(cap) { frames.push(draw(function (rr, cc) { if (found && found[0] === rr && found[1] === cc) return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", t: g[rr][cc], lab: "var(--c-success)", sw: 2.4 }; if (rr === r && cc === c) return { fill: "var(--brand-soft)", stroke: "var(--accent)", t: g[rr][cc], lab: "var(--accent)", sw: 2.4 }; return { t: g[rr][cc], lab: "var(--text-faint)" }; }, cap)); }
      snapSt(`Search a row- and column-sorted matrix for <b>${target}</b>. Start at the <b>top-right</b>: it's the largest in its row and smallest in its column, so each comparison rules out an entire row or column.`);
      while (r < R && c >= 0) { var v = g[r][c]; if (v === target) { found = [r, c]; snapSt(`g[${r}][${c}] = ${target} → <b>found</b>.`); break; } else if (v > target) { snapSt(`${v} &gt; ${target} → the rest of column ${c} is even bigger; move <b>left</b>.`); c--; } else { snapSt(`${v} &lt; ${target} → the rest of row ${r} is even smaller; move <b>down</b>.`); r++; } }
      if (!found) snapSt(`Walked off the matrix → ${target} isn't present.`);
    } else if (mode === "max-area") {
      var vis = Array.from({ length: R }, function () { return new Array(C).fill(false); }), best = 0, bestComp = [], land = function (v) { return v === 1 || v === "1"; };
      frames.push(draw(function (rr, cc) { return land(g[rr][cc]) ? { fill: "var(--surface-hover)", stroke: "var(--accent)", t: "1", lab: "var(--accent)" } : { t: "0", lab: "var(--text-faint)", fs: 11 }; }, "Find the largest connected blob of 1s. Flood-fill each island, count its cells, and keep the biggest area."));
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) { if (land(g[r][c]) && !vis[r][c]) { var comp = [], stack = [[r, c]]; while (stack.length) { var pp = stack.pop(); if (pp[0] < 0 || pp[1] < 0 || pp[0] >= R || pp[1] >= C || vis[pp[0]][pp[1]] || !land(g[pp[0]][pp[1]])) continue; vis[pp[0]][pp[1]] = true; comp.push(pp); dirs.forEach(function (d) { stack.push([pp[0] + d[0], pp[1] + d[1]]); }); } if (comp.length > best) { best = comp.length; bestComp = comp; } (function (cmp, area, rr0, cc0) { frames.push(draw(function (rr, cc) { var inC = cmp.some(function (pp) { return pp[0] === rr && pp[1] === cc; }); if (inC) return { fill: "var(--c-info-bg)", stroke: "var(--accent)", t: "1", lab: "var(--accent)" }; if (vis[rr][cc] && land(g[rr][cc])) return { fill: "var(--surface-2)", t: "1", lab: "var(--text-faint)" }; return land(g[rr][cc]) ? { fill: "var(--surface-hover)", stroke: "var(--accent)", t: "1", lab: "var(--accent)" } : { t: "0", lab: "var(--text-faint)", fs: 11 }; }, `Island at (${rr0},${cc0}) has area ${area}. Max so far: ${best}.`)); })(comp.slice(), comp.length, r, c); } }
      frames.push(draw(function (rr, cc) { var inB = bestComp.some(function (pp) { return pp[0] === rr && pp[1] === cc; }); if (inB) return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", t: "1", lab: "var(--c-success)" }; return land(g[rr][cc]) ? { fill: "var(--surface-2)", t: "1", lab: "var(--text-faint)" } : { t: "0", lab: "var(--text-faint)", fs: 11 }; }, `Largest island area = <b>${best}</b>.`));
    } else if (mode === "perimeter") {
      var land2 = function (v) { return v === 1 || v === "1"; }, perim = 0, processed = [];
      frames.push(draw(function (rr, cc) { return land2(g[rr][cc]) ? { fill: "var(--surface-hover)", stroke: "var(--accent)", t: "1", lab: "var(--accent)" } : { t: "~", lab: "var(--text-faint)", fs: 11 }; }, "Island perimeter: each land cell has 4 edges, minus 1 for every land neighbour (a shared edge isn't on the boundary)."));
      for (var r2 = 0; r2 < R; r2++) for (var c2 = 0; c2 < C; c2++) { if (!land2(g[r2][c2])) continue; var nb = 0; dirs.forEach(function (d) { var nr = r2 + d[0], nc = c2 + d[1]; if (nr >= 0 && nc >= 0 && nr < R && nc < C && land2(g[nr][nc])) nb++; }); perim += 4 - nb; processed.push(r2 + "," + c2); (function (cr, cc, add, nbn) { frames.push(draw(function (rr, c3) { if (rr === cr && c3 === cc) return { fill: "var(--brand-soft)", stroke: "var(--accent)", t: "+" + add, lab: "var(--accent)", sw: 2.4, fs: 13 }; if (processed.indexOf(rr + "," + c3) >= 0) return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", t: "1", lab: "var(--c-success)" }; return land2(g[rr][c3]) ? { fill: "var(--surface-hover)", stroke: "var(--accent)", t: "1", lab: "var(--accent)" } : { t: "~", lab: "var(--text-faint)", fs: 11 }; }, `Cell (${cr},${cc}) has ${nbn} land neighbour(s) → 4 − ${nbn} = ${add} edges. Perimeter so far: ${perim}.`)); })(r2, c2, 4 - nb, nb); }
      frames.push(draw(function (rr, cc) { return land2(g[rr][cc]) ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", t: "1", lab: "var(--c-success)" } : { t: "~", lab: "var(--text-faint)", fs: 11 }; }, `Total perimeter = <b>${perim}</b>.`));
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
    else if (mode === "min-path-sum" || mode === "maximal-square" || mode === "unique-paths-obstacles") { rows = grid.length; cols = grid[0].length; }
    else if (mode === "triangle") { rows = grid.length; cols = grid.length; }
    else if (mode === "cooldown") { rows = cfg.prices.length; cols = 3; }
    else if (mode === "falling-path" || mode === "count-squares") { rows = grid.length; cols = grid[0].length; }
    else if (mode === "paint-house") { rows = cfg.costs.length; cols = 3; }
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
    } else if (mode === "unique-paths-obstacles") {
      frames.push(draw(dp, null, null, "Count right/down paths avoiding obstacles. An obstacle cell has 0 ways; otherwise ways = above + left."));
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) { if (grid[r][c] === 1) { dp[r][c] = 0; frames.push(draw(dp, [r, c], null, `(${r},${c}) is an obstacle → 0 ways.`)); } else if (r === 0 && c === 0) { dp[r][c] = 1; frames.push(draw(dp, [0, 0], null, "Start cell = 1 way.")); } else { var up = r > 0 ? dp[r - 1][c] : 0, lf = c > 0 ? dp[r][c - 1] : 0; dp[r][c] = up + lf; frames.push(draw(dp, [r, c], [[r - 1, c], [r, c - 1]].filter(function (p) { return p[0] >= 0 && p[1] >= 0; }), `${up} (above) + ${lf} (left) = <b>${dp[r][c]}</b>.`)); } }
      frames.push(draw(dp, [rows - 1, cols - 1], null, `Paths to the goal = <b>${dp[rows - 1][cols - 1]}</b>.`));
    } else if (mode === "interleaving") {
      var s1 = A, s2 = B, s3 = cfg.s3, can = (s1.length + s2.length) === s3.length;
      frames.push(draw(dp, null, null, can ? `Can "${s3}" be formed by interleaving "${s1}" and "${s2}"? dp[i][j] = can the first i of s1 and j of s2 build the first i+j of s3.` : `Lengths don't add up → can't interleave.`));
      if (!can) return frames;
      dp[0][0] = "T"; frames.push(draw(dp, [0, 0], null, "Empty + empty builds the empty prefix → T."));
      for (var i = 0; i < rows; i++) for (var j = 0; j < cols; j++) { if (i === 0 && j === 0) continue; var con = [], ok = false; if (i > 0 && dp[i - 1][j] === "T" && s1[i - 1] === s3[i + j - 1]) { ok = true; con.push([i - 1, j]); } if (j > 0 && dp[i][j - 1] === "T" && s2[j - 1] === s3[i + j - 1]) { ok = true; con.push([i, j - 1]); } dp[i][j] = ok ? "T" : "F"; frames.push(draw(dp, [i, j], con.length ? con : null, ok ? `s3[${i + j - 1}]='${s3[i + j - 1]}' continues a valid prefix → <b>T</b>.` : `No matching predecessor → F.`)); }
      frames.push(draw(dp, [rows - 1, cols - 1], null, dp[rows - 1][cols - 1] === "T" ? `Bottom-right T → <b>yes</b>, it interleaves.` : `Bottom-right F → no.`));
    } else if (mode === "triangle") {
      frames.push(draw(dp, null, null, "Minimum path sum top→bottom, each step to an adjacent cell below. Fill <b>bottom-up</b>: every cell adds the cheaper of the two beneath it."));
      for (var r = rows - 1; r >= 0; r--) for (var c = 0; c <= r; c++) { if (r === rows - 1) { dp[r][c] = grid[r][c]; frames.push(draw(dp, [r, c], null, `Bottom row stays as-is: ${grid[r][c]}.`)); } else { dp[r][c] = grid[r][c] + Math.min(dp[r + 1][c], dp[r + 1][c + 1]); frames.push(draw(dp, [r, c], [[r + 1, c], [r + 1, c + 1]], `${grid[r][c]} + min(${dp[r + 1][c]}, ${dp[r + 1][c + 1]}) = <b>${dp[r][c]}</b>.`)); } }
      frames.push(draw(dp, [0, 0], null, `The apex holds the minimum total = <b>${dp[0][0]}</b>.`));
    } else if (mode === "cooldown") {
      var pr = cfg.prices;
      dp[0][0] = -pr[0]; dp[0][1] = 0; dp[0][2] = 0;
      frames.push(draw(dp, [0, 0], null, `Max profit with a 1-day cooldown after selling. Three states per day (columns): <b>hold</b> a share, <b>sold</b> today, <b>rest</b>. Day 0: hold = −${pr[0]}.`));
      for (var i = 1; i < rows; i++) {
        dp[i][0] = Math.max(dp[i - 1][0], dp[i - 1][2] - pr[i]); frames.push(draw(dp, [i, 0], [[i - 1, 0], [i - 1, 2]], `Day ${i} (price ${pr[i]}): hold = max(keep ${dp[i - 1][0]}, buy after rest ${dp[i - 1][2]}−${pr[i]}) = <b>${dp[i][0]}</b>.`));
        dp[i][1] = dp[i - 1][0] + pr[i]; frames.push(draw(dp, [i, 1], [[i - 1, 0]], `sold = previous hold ${dp[i - 1][0]} + ${pr[i]} = <b>${dp[i][1]}</b>.`));
        dp[i][2] = Math.max(dp[i - 1][2], dp[i - 1][1]); frames.push(draw(dp, [i, 2], [[i - 1, 1], [i - 1, 2]], `rest = max(prev rest ${dp[i - 1][2]}, prev sold ${dp[i - 1][1]}) = <b>${dp[i][2]}</b>.`));
      }
      frames.push(draw(dp, [rows - 1, 1], null, `Best profit = max(sold, rest) on the last day = <b>${Math.max(dp[rows - 1][1], dp[rows - 1][2])}</b>.`));
    } else if (mode === "falling-path") {
      frames.push(draw(dp, null, null, "Minimum falling path top→bottom, each step to the cell directly below or diagonally adjacent. dp[r][c] = grid[r][c] + min of the (up to 3) cells above."));
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) { if (r === 0) { dp[r][c] = grid[0][c]; frames.push(draw(dp, [0, c], null, `Top row: ${grid[0][c]}.`)); } else { var cand = [dp[r - 1][c]], con = [[r - 1, c]]; if (c > 0) { cand.push(dp[r - 1][c - 1]); con.push([r - 1, c - 1]); } if (c < cols - 1) { cand.push(dp[r - 1][c + 1]); con.push([r - 1, c + 1]); } var mn = Math.min.apply(null, cand); dp[r][c] = grid[r][c] + mn; frames.push(draw(dp, [r, c], con, `${grid[r][c]} + min(above) ${mn} = <b>${dp[r][c]}</b>.`)); } }
      frames.push(draw(dp, null, null, `Minimum falling path = <b>${Math.min.apply(null, dp[rows - 1])}</b> (smallest value in the bottom row).`));
    } else if (mode === "paint-house") {
      var costs = cfg.costs, COL = ["R", "G", "B"];
      frames.push(draw(dp, null, null, "Paint each house one of 3 colours, no two adjacent alike, at minimum cost. dp[i][colour] = cost + the cheaper of the previous house's other two colours."));
      for (var i = 0; i < rows; i++) for (var j = 0; j < 3; j++) { if (i === 0) { dp[i][j] = costs[0][j]; frames.push(draw(dp, [0, j], null, `House 0, ${COL[j]}: ${costs[0][j]}.`)); } else { var av = dp[i - 1][(j + 1) % 3], bv = dp[i - 1][(j + 2) % 3]; dp[i][j] = costs[i][j] + Math.min(av, bv); frames.push(draw(dp, [i, j], [[i - 1, (j + 1) % 3], [i - 1, (j + 2) % 3]], `House ${i}, ${COL[j]}: ${costs[i][j]} + min(${av}, ${bv}) = <b>${dp[i][j]}</b>.`)); } }
      frames.push(draw(dp, null, null, `Cheapest valid painting = <b>${Math.min.apply(null, dp[rows - 1])}</b>.`));
    } else if (mode === "count-squares") {
      var totalSq = 0;
      frames.push(draw(dp, null, null, "Count all all-1 square submatrices. Each 1-cell's dp = the side of the largest square ending there = 1 + min(top, left, top-left); summing every dp counts every square."));
      for (var r2 = 0; r2 < rows; r2++) for (var c2 = 0; c2 < cols; c2++) { if (grid[r2][c2] === 0) { dp[r2][c2] = 0; frames.push(draw(dp, [r2, c2], null, "0-cell → no squares.")); } else if (r2 === 0 || c2 === 0) { dp[r2][c2] = 1; totalSq += 1; frames.push(draw(dp, [r2, c2], null, `Edge 1 → 1 (a single 1×1). Total ${totalSq}.`)); } else { dp[r2][c2] = 1 + Math.min(dp[r2 - 1][c2], dp[r2][c2 - 1], dp[r2 - 1][c2 - 1]); totalSq += dp[r2][c2]; frames.push(draw(dp, [r2, c2], [[r2 - 1, c2], [r2, c2 - 1], [r2 - 1, c2 - 1]], `1 + min(${dp[r2 - 1][c2]}, ${dp[r2][c2 - 1]}, ${dp[r2 - 1][c2 - 1]}) = ${dp[r2][c2]} squares end here. Total ${totalSq}.`)); } }
      frames.push(draw(dp, null, null, `Total square submatrices = <b>${totalSq}</b>.`));
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
    if (mode === "coin-change") { n = cfg.amount + 1; } else if (mode === "perfect-squares" || mode === "catalan" || mode === "integer-break") { n = cfg.n + 1; } else { n = a.length; }
    var grid = valueCells(new Array(n).fill(0).map(function (_, i) { return i; }), { W: W, y: 70, h: 36, maxCw: 48 });
    function draw(dp, cur, contrib, caption) {
      var s = "";
      for (var i = 0; i < n; i++) {
        var x = grid.x(i), isCur = i === cur, isCon = contrib && contrib.indexOf(i) >= 0;
        s += rect(x, grid.y, grid.cw, grid.h, { fill: isCur ? "var(--brand-soft)" : isCon ? "var(--c-info-bg)" : dp[i] != null ? "var(--c-success-bg)" : "var(--surface-2)", stroke: isCur ? "var(--accent)" : isCon ? "var(--accent)" : dp[i] != null ? "var(--c-success)" : "var(--border)", sw: isCur ? 2.2 : 1.2, r: 6 });
        s += `<text x="${x + grid.cw / 2}" y="${grid.y + grid.h / 2 + 5}" text-anchor="middle" fill="var(--text)" style="font:700 14px var(--font-sans)">${dp[i] == null ? "?" : dp[i]}</text>`;
        var idxLabel = (mode === "coin-change" || mode === "perfect-squares" || mode === "catalan" || mode === "integer-break");
        var sub = idxLabel ? i : a[i];
        s += `<text x="${x + grid.cw / 2}" y="${grid.y - 10}" text-anchor="middle" fill="var(--text-faint)" style="font:500 10px var(--font-mono)">${sub}</text>`;
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
    } else if (mode === "house-robber-ii") {
      frames.push(draw(new Array(n).fill(null), -1, null, "Houses in a <b>circle</b> — the first and last are adjacent. Run linear House Robber twice: once skipping the last house, once skipping the first; take the better."));
      var dpA = new Array(n).fill(null);
      for (var i = 0; i < n - 1; i++) { var robA = a[i] + (i >= 2 ? dpA[i - 2] : 0), skipA = i >= 1 ? dpA[i - 1] : 0; dpA[i] = Math.max(robA, skipA); frames.push(draw(dpA.slice(), i, [i - 1, i - 2].filter(function (x) { return x >= 0 && x < n - 1; }), `Pass 1 (skip house ${n - 1}): dp[${i}] = max(skip ${skipA}, rob ${a[i]}+${i >= 2 ? dpA[i - 2] : 0}) = <b>${dpA[i]}</b>.`)); }
      var resA = dpA[n - 2];
      var dpB = new Array(n).fill(null);
      for (var j = 1; j < n; j++) { var robB = a[j] + (j >= 3 ? dpB[j - 2] : 0), skipB = j >= 2 ? dpB[j - 1] : 0; dpB[j] = Math.max(robB, skipB); frames.push(draw(dpB.slice(), j, [j - 1, j - 2].filter(function (x) { return x >= 1; }), `Pass 2 (skip house 0): dp[${j}] = max(skip ${skipB}, rob ${a[j]}+${j >= 3 ? dpB[j - 2] : 0}) = <b>${dpB[j]}</b>.`)); }
      var resB = dpB[n - 1];
      frames.push(draw(new Array(n).fill(null), -1, null, `max(pass 1 = ${resA}, pass 2 = ${resB}) = <b>${Math.max(resA, resB)}</b>.`));
    } else if (mode === "perfect-squares") {
      var target = cfg.n; dp = new Array(target + 1).fill(null); dp[0] = 0;
      frames.push(draw(dp.slice(), 0, null, `Fewest perfect squares summing to each value 0..${target}. dp[i] = 1 + min over squares k² ≤ i of dp[i−k²]. dp[0]=0.`));
      for (var v = 1; v <= target; v++) { var bestS = Infinity, fromS = []; for (var kk = 1; kk * kk <= v; kk++) { if (dp[v - kk * kk] + 1 < bestS) { bestS = dp[v - kk * kk] + 1; fromS = [v - kk * kk]; } } dp[v] = bestS; frames.push(draw(dp.slice(), v, fromS, `dp[${v}] = 1 + min over k²≤${v} of dp[${v}−k²] = <b>${dp[v]}</b>.`)); }
      frames.push(draw(dp.slice(), -1, null, `Fewest perfect squares for ${target} = <b>${dp[target]}</b>.`));
    } else if (mode === "catalan") {
      dp[0] = 1; frames.push(draw(dp.slice(), 0, null, `Count BST shapes with i nodes. Any value can be the root, splitting into left (j−1 nodes) and right (i−j) subtrees: dp[i] = Σ dp[left]·dp[right]. dp[0]=1.`));
      for (var v = 1; v < n; v++) { var sum = 0; for (var j = 1; j <= v; j++) sum += dp[j - 1] * dp[v - j]; dp[v] = sum; frames.push(draw(dp.slice(), v, null, `dp[${v}] = Σ over each root of dp[left]·dp[right] = <b>${sum}</b>.`)); }
      frames.push(draw(dp.slice(), -1, null, `Unique BSTs with ${cfg.n} nodes = <b>${dp[cfg.n]}</b> (the ${cfg.n}-th Catalan number).`));
    } else if (mode === "delete-earn") {
      var nums = cfg.data, maxV = Math.max.apply(null, nums), earn = new Array(maxV + 1).fill(0); nums.forEach(function (x) { earn[x] += x; });
      n = maxV + 1; a = earn; grid = valueCells(new Array(n).fill(0).map(function (_, i) { return i; }), { W: W, y: 70, h: 36, maxCw: 48 }); dp = new Array(n).fill(null);
      frames.push(draw(dp, -1, null, `Earning from [${nums.join(", ")}]: taking a value v earns v×count but deletes v−1 and v+1 — exactly House Robber on per-value earnings (shown below each cell).`));
      for (var v = 0; v < n; v++) { var take = earn[v] + (v >= 2 ? dp[v - 2] : 0), skip = v >= 1 ? dp[v - 1] : 0; dp[v] = Math.max(take, skip); frames.push(draw(dp.slice(), v, [v - 1, v - 2].filter(function (x) { return x >= 0; }), `value ${v}: max(skip ${skip}, take ${earn[v]}+${v >= 2 ? dp[v - 2] : 0}) = <b>${dp[v]}</b>.`)); }
      frames.push(draw(dp.slice(), -1, null, `Maximum points = <b>${dp[n - 1]}</b>.`));
    } else if (mode === "integer-break") {
      var N = cfg.n; dp = new Array(n).fill(null); dp[1] = 1;
      frames.push(draw(dp, 1, null, `Break ${N} into ≥ 2 positive integers to maximise their product. dp[i] = best product for i = max over a first part j of max(j·(i−j), j·dp[i−j]).`));
      for (var i = 2; i <= N; i++) { var bp = 0; for (var j = 1; j < i; j++) bp = Math.max(bp, j * (i - j), j * dp[i - j]); dp[i] = bp; frames.push(draw(dp.slice(), i, null, `dp[${i}] = best split product = <b>${dp[i]}</b>.`)); }
      frames.push(draw(dp.slice(), -1, null, `Maximum product for ${N} = <b>${dp[N]}</b>.`));
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

    if (mode === "odd-even" || mode === "rotate" || mode === "dedup" || mode === "reverse-k" || mode === "sort") {
      var H6 = 150;
      function frR(arr, hi, dim, cap) {
        var L = lay(arr, 60), inner = "";
        for (var i = 0; i < arr.length - 1; i++) inner += fwd(L.x(i) + L.nw + 3, L.x(i + 1) - 3, L.y + L.h / 2, "var(--border)");
        for (var j = 0; j < arr.length; j++) inner += node(L, j, (hi && hi.indexOf(j) >= 0) ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" } : (dim && dim.indexOf(j) >= 0) ? { op: 0.35 } : {});
        return svg(H6, inner, cap);
      }
      var v = cfg.data;
      if (mode === "odd-even") {
        frames.push(frR(v.slice(), [], null, "Group nodes at <b>odd</b> positions, then <b>even</b> positions — rewiring pointers, not copying values. Two pointers leap in steps of 2."));
        var odd = [], even = [];
        v.forEach(function (x, i) { (i % 2 === 0 ? odd : even).push(x); });
        frames.push(frR(odd.concat(even), odd.map(function (_, i) { return i; }), null, `Odd-position nodes collected: [${odd.join(", ")}].`));
        frames.push(frR(odd.concat(even), odd.map(function (_, i) { return odd.length + i; }), null, `Append the even-position nodes: [${even.join(", ")}].`));
        frames.push(frR(odd.concat(even), [], null, `Result: [${odd.concat(even).join(", ")}], O(1) extra space.`));
        return frames;
      }
      if (mode === "dedup") {
        var arr = v.slice();
        frames.push(frR(arr.slice(), [], null, "Sorted list — walk once; whenever a node equals the one before it, splice it out."));
        var kept = [arr[0]];
        for (var i = 1; i < arr.length; i++) { if (arr[i] === arr[i - 1]) frames.push(frR(arr.slice(), [i], null, `Node ${arr[i]} equals the previous → <b>remove</b> the duplicate.`)); else { kept.push(arr[i]); frames.push(frR(arr.slice(), [i], null, `Node ${arr[i]} is new → keep it.`)); } }
        frames.push(frR(kept.slice(), [], null, `Deduplicated: [${kept.join(", ")}].`));
        return frames;
      }
      if (mode === "rotate") {
        var kk = ((cfg.k % v.length) + v.length) % v.length, cut = v.length - kk;
        frames.push(frR(v.slice(), [], null, `Rotate right by ${cfg.k}. Find the length, join the tail to the head to form a ring, then break it so the new head is ${kk} step(s) from the end.`));
        frames.push(frR(v.slice(), [cut < v.length ? cut : 0], null, `Length ${v.length}, effective k = ${kk}. The new head is index ${cut % v.length} (node ${v[cut % v.length]}).`));
        var rotated = v.slice(cut).concat(v.slice(0, cut));
        frames.push(frR(rotated.slice(), rotated.map(function (_, i) { return i < kk ? i : -1; }).filter(function (x) { return x >= 0; }), null, `Move the last ${kk} node(s) to the front → [${rotated.join(", ")}].`));
        return frames;
      }
      if (mode === "sort") {
        var sv = v;
        frames.push(frR(sv.slice(), [], null, "Sort a linked list in O(n log n) with <b>merge sort</b>: split into halves (fast/slow finds the middle), sort each, then merge the two sorted lists."));
        var mid = sv.length >> 1, leftH = sv.slice(0, mid), rightH = sv.slice(mid);
        frames.push(frR(sv.slice(), sv.map(function (_, i) { return i; }).slice(0, mid), sv.map(function (_, i) { return i; }).slice(mid), `Split into [${leftH.join(", ")}] and [${rightH.join(", ")}].`));
        var sl = leftH.slice().sort(function (a, b) { return a - b; }), sr = rightH.slice().sort(function (a, b) { return a - b; });
        frames.push(frR(sl.concat(sr), [], null, `Recursively sort each half → [${sl.join(", ")}] and [${sr.join(", ")}].`));
        var merged = [], mi = 0, mj = 0; while (mi < sl.length && mj < sr.length) { if (sl[mi] <= sr[mj]) merged.push(sl[mi++]); else merged.push(sr[mj++]); } while (mi < sl.length) merged.push(sl[mi++]); while (mj < sr.length) merged.push(sr[mj++]);
        frames.push(frR(merged.slice(), [], null, `Merge the two sorted halves → [${merged.join(", ")}].`));
        return frames;
      }
      // reverse-k
      var kg = cfg.k, src = v.slice(), res = [];
      frames.push(frR(src.slice(), [], null, `Reverse the list in groups of <b>${kg}</b>. Reverse each full group; a trailing group shorter than ${kg} is left untouched.`));
      for (var g = 0; g < src.length; g += kg) {
        var grp = src.slice(g, g + kg), full = grp.length === kg; if (full) grp = grp.slice().reverse();
        res = res.concat(grp);
        var hiIdx = []; for (var h = res.length - grp.length; h < res.length; h++) hiIdx.push(h);
        frames.push(frR(res.concat(src.slice(res.length)), hiIdx, null, full ? `Reverse group [${src.slice(g, g + kg).join(", ")}] → [${grp.join(", ")}].` : `Trailing group [${grp.join(", ")}] (&lt; ${kg}) stays as-is.`));
      }
      frames.push(frR(res.slice(), [], null, `Result: [${res.join(", ")}].`));
      return frames;
    }

    if (mode === "duplicate") {
      var nums = cfg.data, dn = nums.length, H6 = 175;
      function cells(slow, fast, cap, panel) {
        var cw = Math.min(48, (W - 40 - 6 * (dn - 1)) / dn), gap = 6, total = cw * dn + gap * (dn - 1), sx = (W - total) / 2, y = 70, h = 44, s = "";
        for (var i = 0; i < dn; i++) { var isS = i === slow, isF = i === fast; var f = (isS && isF) ? "var(--c-success-bg)" : isS ? "var(--brand-soft)" : isF ? "var(--c-info-bg)" : "var(--surface-2)"; var stk = (isS || isF) ? (isS && isF ? "var(--c-success)" : "var(--accent)") : "var(--border)"; s += rect(sx + i * (cw + gap), y, cw, h, { fill: f, stroke: stk, sw: (isS || isF) ? 2.2 : 1.2, r: 6 }); s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${y + h / 2 + 5}" text-anchor="middle" fill="${(isS || isF) ? stk : "var(--text)"}" style="font:700 16px var(--font-sans)">${nums[i]}</text>`; s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${y + h + 14}" text-anchor="middle" fill="var(--text-faint)" style="font:500 10px var(--font-mono)">${i}</text>`; }
        if (slow >= 0) s += `<text x="${sx + slow * (cw + gap) + cw / 2}" y="${y - 9}" text-anchor="middle" fill="var(--accent)" style="font:700 11px var(--font-sans)">slow</text>`;
        if (fast >= 0 && fast !== slow) s += `<text x="${sx + fast * (cw + gap) + cw / 2}" y="${y - 9}" text-anchor="middle" fill="var(--accent)" style="font:700 11px var(--font-sans)">fast</text>`;
        if (panel) s += `<text x="${W / 2}" y="${H6 - 10}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${panel}</text>`;
        return { svg: `<svg viewBox="0 0 ${W} ${H6}" role="img" aria-label="find duplicate">${s}</svg>`, caption: cap };
      }
      frames.push(cells(0, 0, "Treat index i as a pointer to nums[i]. A repeated value makes two indices point to the same place → a <b>cycle</b>. Floyd's algorithm finds its entrance, which equals the duplicate.", "phase 1 · slow=fast at index 0"));
      var slow = 0, fast = 0, g = 0;
      do { slow = nums[slow]; fast = nums[nums[fast]]; frames.push(cells(slow, fast, `Phase 1: slow → index ${slow}, fast → index ${fast} (fast moves twice as far).`, "phase 1")); } while (slow !== fast && g++ < 40);
      frames.push(cells(slow, fast, `They meet at index ${slow} — somewhere inside the cycle.`, "cycle detected"));
      var slow2 = 0; frames.push(cells(slow2, fast, "Phase 2: reset one pointer to the start; advance both by <b>one</b> step until they meet — that's the cycle's entrance.", "phase 2"));
      g = 0; while (slow2 !== fast && g++ < 40) { slow2 = nums[slow2]; fast = nums[fast]; frames.push(cells(slow2, fast, `slow → ${slow2}, fast → ${fast}.`, "phase 2")); }
      frames.push(cells(slow2, fast, `They meet at index ${slow2} → the duplicate number is <b>${slow2}</b>.`, "duplicate = " + slow2));
      return frames;
    }

    if (mode === "copy-random") {
      var v = cfg.data, rnd = cfg.random, n = v.length, H6 = 190;
      function arc(i, j, y, color) { if (j < 0) return ""; var L = lay(v, 0); var x1 = L.cx(i), x2 = L.cx(j); var midY = y - 28 - Math.abs(i - j) * 4; return `<path d="M${x1} ${y} Q ${(x1 + x2) / 2} ${midY} ${x2} ${y}" fill="none" stroke="${color}" stroke-width="1.4" stroke-dasharray="4 3"/><path d="M${x2} ${y} l-4 -7 l8 0 z" fill="${color}"/>`; }
      function rowAt(arr, yTop, label) { var L = { n: arr.length, nw: 40, gap: Math.min((W - 70 - 40 * arr.length) / (arr.length > 1 ? arr.length - 1 : 1), 30) }; var total = L.nw * arr.length + L.gap * (arr.length - 1), sx = (W - total) / 2; var cx = function (i) { return sx + i * (L.nw + L.gap) + L.nw / 2; }; var s = `<text x="20" y="${yTop + 22}" fill="var(--text-faint)" style="font:600 10px var(--font-mono)">${label}</text>`; for (var i = 0; i < arr.length; i++) { var x = sx + i * (L.nw + L.gap); s += rect(x, yTop, L.nw, 32, { fill: ("" + arr[i]).indexOf("'") >= 0 ? "var(--c-success-bg)" : "var(--surface-2)", stroke: ("" + arr[i]).indexOf("'") >= 0 ? "var(--c-success)" : "var(--border)", sw: 1.3, r: 7 }); s += `<text x="${cx(i)}" y="${yTop + 21}" text-anchor="middle" fill="var(--text)" style="font:700 13px var(--font-sans)">${arr[i]}</text>`; if (i < arr.length - 1) s += fwd(x + L.nw + 3, x + L.nw + L.gap - 3, yTop + 16, "var(--border)"); } return { s: s, cx: cx, yTop: yTop }; }
      function frame(arr, label, randoms, cap) { var r = rowAt(arr, 70, label), inner = r.s; (randoms || []).forEach(function (pair) { inner += arc(pair[0], pair[1], 70, "var(--accent)"); }); return { svg: `<svg viewBox="0 0 ${W} ${H6}" role="img" aria-label="copy random list">${inner}</svg>`, caption: cap }; }
      var randoms = rnd.map(function (j, i) { return [i, j]; });
      frames.push(frame(v.slice(), "list", randoms, "Each node also has a <b>random</b> pointer (dashed). The O(1)-space trick weaves clones into the list so a clone's random is just original.random.next."));
      var inter = []; v.forEach(function (val) { inter.push(val); inter.push(val + "'"); });
      frames.push(frame(inter, "woven", null, "Step 1: insert a copy (a′) right after each original node."));
      frames.push(frame(inter, "woven", null, "Step 2: for each clone, set clone.random = original.random's clone (the node just after it)."));
      frames.push(frame(v.map(function (val) { return val + "'"; }), "clone", rnd.map(function (j, i) { return [i, j]; }), "Step 3: unweave the two lists — the clone is an exact, independent copy."));
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

    if (mode === "n-queens") {
      var N = cfg.n, cell = Math.min(56, (W - 60) / N), sx = (W - N * cell) / 2, sy = 18, Hq = sy + N * cell + 16, qf = [];
      function qdraw(placed, tryRC, conflict, cap) {
        var s = "";
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { var dark = (r + c) % 2 === 1; s += rect(sx + c * cell, sy + r * cell, cell, cell, { fill: dark ? "var(--surface-hover)" : "var(--surface-2)", stroke: "var(--border)", sw: 0.5, r: 0 }); }
        placed.forEach(function (col, r) { s += `<text x="${sx + col * cell + cell / 2}" y="${sy + r * cell + cell / 2 + 7}" text-anchor="middle" fill="var(--c-success)" style="font:700 ${Math.round(cell * 0.5)}px var(--font-sans)">♛</text>`; });
        if (tryRC) { var c2 = tryRC[1], r2 = tryRC[0]; s += rect(sx + c2 * cell, sy + r2 * cell, cell, cell, { fill: conflict ? "var(--c-warning-bg)" : "var(--brand-soft)", stroke: conflict ? "var(--c-warning)" : "var(--accent)", sw: 2.4, r: 0 }); s += `<text x="${sx + c2 * cell + cell / 2}" y="${sy + r2 * cell + cell / 2 + 7}" text-anchor="middle" fill="${conflict ? "var(--c-warning)" : "var(--accent)"}" style="font:700 ${Math.round(cell * 0.5)}px var(--font-sans)">♛</text>`; }
        return { svg: `<svg viewBox="0 0 ${W} ${Hq}" role="img" aria-label="n-queens board">${s}</svg>`, caption: cap };
      }
      function safe(placed, r, c) { for (var i = 0; i < r; i++) if (placed[i] === c || Math.abs(placed[i] - c) === Math.abs(i - r)) return false; return true; }
      var placed = [], done = false;
      qf.push(qdraw([], null, false, `Place ${N} queens so none attack each other. Backtracking: try a safe column in each row; a dead end means undo and try the next column.`));
      (function solve(r) { if (done) return; if (r === N) { done = true; qf.push(qdraw(placed.slice(), null, false, `All ${N} queens placed with no attacks — a valid solution!`)); return; } for (var c = 0; c < N && !done; c++) { var ok = safe(placed, r, c); qf.push(qdraw(placed.slice(), [r, c], !ok, ok ? `Row ${r}, column ${c}: safe → place a queen and recurse.` : `Row ${r}, column ${c}: attacked by an earlier queen → skip.`)); if (ok) { placed.push(c); solve(r + 1); if (!done) placed.pop(); } } if (!done) qf.push(qdraw(placed.slice(), null, false, `Row ${r}: no safe column remains → backtrack to the previous row.`)); })(0);
      return qf;
    }

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

    if (mode === "merge-k") {
      var lists = cfg.lists, Hm = 215, ptr = lists.map(function () { return 0; }), result = [];
      var mh = makeHeap(function (a, b) { return a.v - b.v; });
      function snapM(cap) { var inner = heapTree(mh.a.map(function (e) { return e.v; }), function (i) { return i === 0 ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.4, lab: "var(--accent)" } : {}; }); inner += `<text x="${W / 2}" y="${Hm - 26}" text-anchor="middle" fill="var(--text-muted)" style="font:600 11px var(--font-mono)">remaining: ${lists.map(function (l, li) { return "[" + l.slice(ptr[li]).join(",") + "]"; }).join(" ")}</text>`; inner += `<text x="${W / 2}" y="${Hm - 8}" text-anchor="middle" fill="var(--c-success)" style="font:600 12px var(--font-mono)">result: [${result.join(", ")}]</text>`; return { svg: `<svg viewBox="0 0 ${W} ${Hm}" role="img" aria-label="merge k lists">${inner}</svg>`, caption: cap }; }
      lists.forEach(function (l, li) { if (l.length) mh.push({ v: l[0], li: li }); });
      frames.push(snapM("Merge k sorted lists with a min-heap holding the current front of each list. Pop the smallest, append it, then push the next value from that same list."));
      while (mh.size()) { var m = mh.pop(); result.push(m.v); ptr[m.li]++; if (ptr[m.li] < lists[m.li].length) mh.push({ v: lists[m.li][ptr[m.li]], li: m.li }); frames.push(snapM(`Pop the smallest front <b>${m.v}</b> (list ${m.li}) → append it, then push its successor.`)); }
      frames.push(snapM(`Merged: [${result.join(", ")}].`));
      return frames;
    }

    if (mode === "meeting-rooms-ii") {
      var iv = cfg.data.slice().sort(function (a, b) { return a[0] - b[0]; }), nM = iv.length, Hr = 210;
      var minV = Math.min.apply(null, iv.map(function (p) { return p[0]; })), maxV = Math.max.apply(null, iv.map(function (p) { return p[1]; })), span = (maxV - minV) || 1, padL = 36, padR = 30, rowH = 24, topPad = 28;
      function Xr(v) { return padL + (v - minV) / span * (W - padL - padR); }
      var rh = makeHeap(function (a, b) { return a - b; }), rooms = 0, maxRooms = 0;
      function frameR(cur, cap) {
        var s = "";
        iv.forEach(function (m, i) { var y = topPad + i * rowH; var st = i === cur ? ["var(--brand-soft)", "var(--accent)"] : i < cur ? ["var(--surface-2)", "var(--border-soft)"] : ["var(--surface-2)", "var(--border)"]; s += rect(Xr(m[0]), y, Math.max(Xr(m[1]) - Xr(m[0]), 3), 15, { fill: st[0], stroke: st[1], sw: 1.3, r: 4 }); s += `<text x="${(Xr(m[0]) + Xr(m[1])) / 2}" y="${y + 11}" text-anchor="middle" fill="var(--text-muted)" style="font:600 10px var(--font-sans)">[${m[0]},${m[1]}]</text>`; });
        s += `<text x="${W / 2}" y="${Hr - 26}" text-anchor="middle" fill="var(--text-muted)" style="font:600 11px var(--font-mono)">end-times heap: [${rh.a.slice().sort(function (a, b) { return a - b; }).join(", ")}]</text>`;
        s += `<text x="${W / 2}" y="${Hr - 8}" text-anchor="middle" fill="var(--c-success)" style="font:700 12px var(--font-sans)">rooms in use: ${rooms} · max: ${maxRooms}</text>`;
        return { svg: `<svg viewBox="0 0 ${W} ${Hr}" role="img" aria-label="meeting rooms">${s}</svg>`, caption: cap };
      }
      frames.push(frameR(-1, "Sort meetings by start. A min-heap holds the end times of ongoing meetings. For each new meeting, free every room that ended by its start, then occupy one. The peak count is the answer."));
      for (var i = 0; i < nM; i++) { while (rh.size() && rh.peek() <= iv[i][0]) { rh.pop(); rooms--; } rh.push(iv[i][1]); rooms++; maxRooms = Math.max(maxRooms, rooms); frames.push(frameR(i, `Meeting [${iv[i][0]},${iv[i][1]}]: free rooms ending ≤ ${iv[i][0]}, then take one → ${rooms} in use (peak ${maxRooms}).`)); }
      frames.push(frameR(-1, `Minimum meeting rooms required = <b>${maxRooms}</b>.`));
      return frames;
    }

    if (mode === "reorganize") {
      var s = cfg.s, Hg = 215, freq = {}; for (var ci = 0; ci < s.length; ci++) freq[s[ci]] = (freq[s[ci]] || 0) + 1;
      var rh = makeHeap(function (a, b) { return b.n - a.n; });
      Object.keys(freq).forEach(function (k) { rh.push({ c: k, n: freq[k] }); });
      var result = "", prev = null;
      function snapR(cap) { var inner = heapTree(rh.a.map(function (e) { return e.c + ":" + e.n; }), function (i) { return i === 0 ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.4, lab: "var(--accent)" } : {}; }); if (prev) inner += `<text x="${W / 2}" y="${Hg - 26}" text-anchor="middle" fill="var(--text-muted)" style="font:600 11px var(--font-mono)">cooldown: ${prev.c}:${prev.n}</text>`; inner += `<text x="${W / 2}" y="${Hg - 8}" text-anchor="middle" fill="var(--c-success)" style="font:600 13px var(--font-mono)">result: "${result}"</text>`; return { svg: `<svg viewBox="0 0 ${W} ${Hg}" role="img" aria-label="reorganize">${inner}</svg>`, caption: cap }; }
      frames.push(snapR("Rearrange so no two neighbours match. Greedily take the <b>most frequent</b> available char (max-heap), holding the just-used one aside one step so it can't repeat."));
      var guardR = 0;
      while ((rh.size() || (prev && prev.n > 0)) && guardR++ < 60) {
        if (rh.size() === 0) { frames.push(snapR(`Only ${prev.c} remains but it's on cooldown → <b>impossible</b>.`)); return frames; }
        var top = rh.pop(); result += top.c; top.n--;
        if (prev && prev.n > 0) rh.push(prev);
        frames.push(snapR(`Append <b>${top.c}</b>${prev ? `; release ${prev.c} back to the heap` : ""}.`));
        prev = top.n > 0 ? top : null;
      }
      frames.push(snapR(`Done → "<b>${result}</b>" — no two adjacent characters equal.`));
      return frames;
    }

    if (mode === "twitter") {
      var feeds = cfg.feeds, Ht = 210, K = cfg.k;
      var th = makeHeap(function (a, b) { return b.t - a.t; }), ptr = feeds.map(function (f) { return f.length - 1; });
      feeds.forEach(function (f, fi) { if (f.length) th.push({ t: f[f.length - 1][0], id: f[f.length - 1][1], fi: fi }); });
      var feed = [];
      function snapTw(cap) { var inner = heapTree(th.a.map(function (e) { return "#" + e.id; }), function (i) { return i === 0 ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.4, lab: "var(--accent)" } : {}; }); inner += `<text x="${W / 2}" y="${Ht - 8}" text-anchor="middle" fill="var(--c-success)" style="font:600 12px var(--font-mono)">feed (newest first): ${feed.map(function (x) { return "#" + x; }).join(", ")}</text>`; return { svg: `<svg viewBox="0 0 ${W} ${Ht}" role="img" aria-label="twitter feed">${inner}</svg>`, caption: cap }; }
      frames.push(snapTw(`Build a news feed by merging each followee's tweets newest-first with a max-heap (keyed by time). Pop the latest, then push that user's next-newest. Take the top ${K}.`));
      while (th.size() && feed.length < K) { var m = th.pop(); feed.push(m.id); ptr[m.fi]--; if (ptr[m.fi] >= 0) th.push({ t: feeds[m.fi][ptr[m.fi]][0], id: feeds[m.fi][ptr[m.fi]][1], fi: m.fi }); frames.push(snapTw(`Newest unseen tweet is <b>#${m.id}</b> (time ${m.t}) → add to feed; push that user's previous tweet.`)); }
      frames.push(snapTw(`Top ${K} feed: ${feed.map(function (x) { return "#" + x; }).join(", ")}.`));
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

    function gout(inner, cap) { return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="graph">${inner}</svg>`, caption: cap }; }
    function panelLine(t) { return `<text x="${W / 2}" y="${H - 12}" text-anchor="middle" fill="var(--text-muted)" style="font:600 11px var(--font-mono)">${t}</text>`; }
    function lbl(i) { return cfg.labels ? cfg.labels[i] : i; }
    function wEdge(a, b, w, color, sw, directed) { var e = directed ? dirEdge(a, b, color, sw) : undirEdge(a, b, color, sw); var pa = pos(a), pb = pos(b); e += `<text x="${(pa.x + pb.x) / 2}" y="${(pa.y + pb.y) / 2 - 4}" text-anchor="middle" fill="var(--text-faint)" style="font:700 10px var(--font-mono)">${w}</text>`; return e; }

    if (mode === "bipartite") {
      var adjB = Array.from({ length: n }, function () { return []; }); cfg.edges.forEach(function (e) { adjB[e[0]].push(e[1]); adjB[e[1]].push(e[0]); });
      var color = new Array(n).fill(-1), COL = ["var(--accent)", "var(--c-warning)"], ok = true, badE = -1;
      function colorPanel() { return "colours: " + color.map(function (c, i) { return i + ":" + (c < 0 ? "·" : c === 0 ? "A" : "B"); }).join(" "); }
      function findEdge(u, v) { for (var i = 0; i < cfg.edges.length; i++) { if ((cfg.edges[i][0] === u && cfg.edges[i][1] === v) || (cfg.edges[i][0] === v && cfg.edges[i][1] === u)) return i; } return -1; }
      function snapB(active, cap) { var inner = ""; cfg.edges.forEach(function (e, ei) { inner += undirEdge(e[0], e[1], ei === badE ? "var(--c-warning)" : "var(--border)", ei === badE ? 3 : 1.6); }); for (var i = 0; i < n; i++) { var st = {}; if (color[i] >= 0) { st.stroke = COL[color[i]]; st.lab = COL[color[i]]; st.sw = 2.2; } if (i === active) { st.fill = "var(--brand-soft)"; st.sw = 2.6; } inner += nodeC(i, st); } inner += panelLine(cap.p); return gout(inner, cap.t); }
      frames.push(snapB(-1, { t: "Bipartite check: 2-colour the graph with BFS so adjacent nodes always differ. A neighbour already the same colour breaks it.", p: "colours: none" }));
      for (var s = 0; s < n && ok; s++) { if (color[s] >= 0) continue; color[s] = 0; var q = [s]; frames.push(snapB(s, { t: `Start node ${s} with colour <b>A</b>.`, p: colorPanel() })); while (q.length && ok) { var u = q.shift(); for (var vi = 0; vi < adjB[u].length; vi++) { var v = adjB[u][vi]; if (color[v] === -1) { color[v] = color[u] ^ 1; q.push(v); frames.push(snapB(v, { t: `Colour ${v} opposite to ${u} → <b>${color[v] === 0 ? "A" : "B"}</b>.`, p: colorPanel() })); } else if (color[v] === color[u]) { ok = false; badE = findEdge(u, v); frames.push(snapB(v, { t: `${u} and ${v} are adjacent but both ${color[v] === 0 ? "A" : "B"} → <b>not bipartite</b>.`, p: "conflict!" })); break; } } } }
      if (ok) frames.push(snapB(-1, { t: "Every edge joins different colours → <b>bipartite</b>.", p: colorPanel() }));
      return frames;
    }

    if (mode === "dijkstra") {
      var src = cfg.src, dist = new Array(n).fill(Infinity); dist[src] = 0; var settled = new Array(n).fill(false);
      var adjD = Array.from({ length: n }, function () { return []; }); cfg.edges.forEach(function (e) { adjD[e[0]].push([e[1], e[2]]); });
      function distArr() { return "[" + dist.map(function (d) { return d === Infinity ? "∞" : d; }).join(",") + "]"; }
      function snapD(active, cap) { var inner = ""; cfg.edges.forEach(function (e) { inner += wEdge(e[0], e[1], e[2], settled[e[0]] ? "var(--c-success)" : "var(--border)", 1.6, true); }); for (var i = 0; i < n; i++) { var st = { txt: i + ":" + (dist[i] === Infinity ? "∞" : dist[i]) }; if (settled[i]) { st.stroke = "var(--c-success)"; st.lab = "var(--c-success)"; } if (i === active) { st.fill = "var(--brand-soft)"; st.sw = 2.6; st.stroke = "var(--accent)"; st.lab = "var(--accent)"; } inner += nodeC(i, st); } inner += panelLine(cap.p); return gout(inner, cap.t); }
      frames.push(snapD(-1, { t: `Dijkstra from node ${src}: repeatedly settle the nearest unfinished node and relax its outgoing edges. Labels show the best distance so far.`, p: "dist = " + distArr() }));
      for (var it = 0; it < n; it++) { var bu = -1, bd = Infinity; for (var i = 0; i < n; i++) if (!settled[i] && dist[i] < bd) { bd = dist[i]; bu = i; } if (bu < 0) break; settled[bu] = true; var rel = []; adjD[bu].forEach(function (pr) { if (dist[bu] + pr[1] < dist[pr[0]]) { dist[pr[0]] = dist[bu] + pr[1]; rel.push(pr[0]); } }); frames.push(snapD(bu, { t: `Settle node <b>${bu}</b> (distance ${dist[bu]})${rel.length ? " → relax improves " + rel.join(", ") : " (no improvement)"}.`, p: "dist = " + distArr() })); }
      var mx = Math.max.apply(null, dist); frames.push(snapD(-1, { t: mx === Infinity ? "Some node stays ∞ — unreachable → -1." : `All settled. The slowest arrival (network delay) = <b>${mx}</b>.`, p: "dist = " + distArr() }));
      return frames;
    }

    if (mode === "bellman") {
      var bsrc = cfg.src, bdst = cfg.dst, K = cfg.k, bdist = new Array(n).fill(Infinity); bdist[bsrc] = 0;
      function bArr() { return "[" + bdist.map(function (d) { return d === Infinity ? "∞" : d; }).join(",") + "]"; }
      function snapBe(round, cap) { var inner = ""; cfg.edges.forEach(function (e) { inner += wEdge(e[0], e[1], e[2], "var(--border)", 1.6, true); }); for (var i = 0; i < n; i++) { var st = { txt: i + ":" + (bdist[i] === Infinity ? "∞" : bdist[i]) }; if (i === bsrc) { st.stroke = "var(--accent)"; st.lab = "var(--accent)"; } if (i === bdst) { st.stroke = "var(--c-success)"; st.lab = "var(--c-success)"; } inner += nodeC(i, st); } inner += panelLine(cap.p); return gout(inner, cap.t); }
      frames.push(snapBe(0, { t: `Bellman–Ford with ≤ ${K} stops: relax all edges ${K + 1} times, each round from a <b>snapshot</b> so a path grows by at most one edge per round.`, p: "dist = " + bArr() }));
      for (var r = 0; r <= K; r++) { var tmp = bdist.slice(); cfg.edges.forEach(function (e) { if (bdist[e[0]] + e[2] < tmp[e[1]]) tmp[e[1]] = bdist[e[0]] + e[2]; }); bdist = tmp; frames.push(snapBe(-1, { t: `Round ${r + 1}: paths may now use ${r + 1} edge(s).`, p: "dist = " + bArr() })); }
      frames.push(snapBe(-1, { t: bdist[bdst] === Infinity ? `No route within ${K} stops → -1.` : `Cheapest ${bsrc}→${bdst} with ≤ ${K} stops = <b>${bdist[bdst]}</b>.`, p: "answer = " + (bdist[bdst] === Infinity ? "-1" : bdist[bdst]) }));
      return frames;
    }

    if (mode === "mst") {
      var pts = cfg.points, np = pts.length;
      var mnX = Math.min.apply(null, pts.map(function (p) { return p[0]; })), mxX = Math.max.apply(null, pts.map(function (p) { return p[0]; }));
      var mnY = Math.min.apply(null, pts.map(function (p) { return p[1]; })), mxY = Math.max.apply(null, pts.map(function (p) { return p[1]; }));
      var sxp = function (x) { return 60 + (x - mnX) / ((mxX - mnX) || 1) * (W - 120); }, syp = function (y) { return 50 + (y - mnY) / ((mxY - mnY) || 1) * (H - 100); };
      function dman(i, j) { return Math.abs(pts[i][0] - pts[j][0]) + Math.abs(pts[i][1] - pts[j][1]); }
      var inTree = new Array(np).fill(false), treeEdges = [], total = 0;
      function snapM(active, cap) { var inner = ""; treeEdges.forEach(function (e) { inner += line(sxp(pts[e[0]][0]), syp(pts[e[0]][1]), sxp(pts[e[1]][0]), syp(pts[e[1]][1]), { stroke: "var(--c-success)", sw: 2.4 }); }); for (var i = 0; i < np; i++) { var x = sxp(pts[i][0]), y = syp(pts[i][1]); var f = inTree[i] ? "var(--c-success-bg)" : "var(--surface-2)", st = inTree[i] ? "var(--c-success)" : "var(--border)"; if (i === active) { f = "var(--brand-soft)"; st = "var(--accent)"; } inner += `<circle cx="${x}" cy="${y}" r="14" fill="${f}" stroke="${st}" stroke-width="2"/><text x="${x}" y="${y + 4}" text-anchor="middle" fill="var(--text)" style="font:700 11px var(--font-sans)">${i}</text>`; } inner += panelLine(cap.p); return gout(inner, cap.t); }
      inTree[0] = true; frames.push(snapM(0, { t: "Prim's MST: grow a tree from node 0, each step adding the cheapest edge (Manhattan distance) to a not-yet-connected point.", p: "cost = 0" }));
      for (var c = 1; c < np; c++) { var bu2 = -1, bv = -1, bw = Infinity; for (var i = 0; i < np; i++) { if (!inTree[i]) continue; for (var j = 0; j < np; j++) { if (inTree[j]) continue; var d = dman(i, j); if (d < bw) { bw = d; bu2 = i; bv = j; } } } inTree[bv] = true; treeEdges.push([bu2, bv]); total += bw; frames.push(snapM(bv, { t: `Cheapest link to a new point: ${bu2}–${bv} (cost ${bw}). Add it.`, p: "cost = " + total })); }
      frames.push(snapM(-1, { t: `All points connected — minimum total cost = <b>${total}</b>.`, p: "cost = " + total }));
      return frames;
    }

    if (mode === "alien-topo") {
      var words = cfg.words, idxA = {}; cfg.labels.forEach(function (ch, i) { idxA[ch] = i; });
      var edgesA = []; for (var w = 0; w < words.length - 1; w++) { var aw = words[w], bw2 = words[w + 1], LL = Math.min(aw.length, bw2.length); for (var cc = 0; cc < LL; cc++) { if (aw[cc] !== bw2[cc]) { edgesA.push([idxA[aw[cc]], idxA[bw2[cc]]]); break; } } }
      var indegA = new Array(n).fill(0), adjA = Array.from({ length: n }, function () { return []; }); edgesA.forEach(function (e) { adjA[e[0]].push(e[1]); indegA[e[1]]++; });
      var orderA = [], doneA = new Array(n).fill(false);
      function snapA(active, cap) { var inner = ""; edgesA.forEach(function (e) { inner += dirEdge(e[0], e[1], "var(--border)", 1.6); }); for (var i = 0; i < n; i++) { var st = { txt: lbl(i) + "(" + indegA[i] + ")" }; if (doneA[i]) { st.stroke = "var(--c-success)"; st.lab = "var(--c-success)"; } if (i === active) { st.fill = "var(--brand-soft)"; st.sw = 2.6; } inner += nodeC(i, st); } inner += panelLine("order: " + orderA.map(function (i) { return cfg.labels[i]; }).join("")); return gout(inner, cap); }
      var qA = []; for (var i = 0; i < n; i++) if (indegA[i] === 0) qA.push(i);
      frames.push(snapA(-1, "Derive letter-order rules from each pair of adjacent words (their first differing character), then topologically sort. Labels show in-degree."));
      while (qA.length) { var u = qA.shift(); doneA[u] = true; orderA.push(u); adjA[u].forEach(function (v) { indegA[v]--; if (indegA[v] === 0) qA.push(v); }); frames.push(snapA(u, `Letter <b>${cfg.labels[u]}</b> has no unmet predecessor → next in the alien alphabet.`)); }
      frames.push(snapA(-1, `Alien alphabet order: <b>${orderA.map(function (i) { return cfg.labels[i]; }).join("")}</b>.`));
      return frames;
    }

    if (mode === "euler") {
      var idxE = {}; cfg.labels.forEach(function (ch, i) { idxE[ch] = i; });
      var adjE = Array.from({ length: n }, function () { return []; }); cfg.tickets.forEach(function (t) { adjE[idxE[t[0]]].push(idxE[t[1]]); }); adjE.forEach(function (l) { l.sort(function (a, b) { return a - b; }); });
      function snapE(routeArr, active, cap) { var inner = ""; cfg.tickets.forEach(function (t) { inner += dirEdge(idxE[t[0]], idxE[t[1]], "var(--border)", 1.4); }); for (var i = 0; i < n; i++) { var st = { txt: lbl(i) }; if (i === active) { st.fill = "var(--brand-soft)"; st.sw = 2.6; st.stroke = "var(--accent)"; st.lab = "var(--accent)"; } inner += nodeC(i, st); } inner += panelLine("route: " + routeArr.map(function (i) { return cfg.labels[i]; }).join(" → ")); return gout(inner, cap); }
      var route = [], stack = [idxE[cfg.start]], usedE = adjE.map(function () { return 0; });
      frames.push(snapE([], idxE[cfg.start], "Reconstruct the itinerary as an <b>Eulerian path</b> (every ticket once). Hierholzer's: follow lexicographically-smallest edges until stuck, then peel onto the route and reverse."));
      while (stack.length) { var u = stack[stack.length - 1]; if (usedE[u] < adjE[u].length) { var v = adjE[u][usedE[u]++]; stack.push(v); frames.push(snapE(route.slice().reverse(), v, `Fly ${cfg.labels[u]} → ${cfg.labels[v]}.`)); } else { route.push(stack.pop()); frames.push(snapE(route.slice().reverse(), stack.length ? stack[stack.length - 1] : -1, `Dead end at ${cfg.labels[u]} → add to the route, backtrack.`)); } }
      route.reverse();
      frames.push(snapE(route.slice(), -1, `Final itinerary: <b>${route.map(function (i) { return cfg.labels[i]; }).join(" → ")}</b>.`));
      return frames;
    }

    if (mode === "evaluate-division") {
      var adjV = Array.from({ length: n }, function () { return []; }); cfg.edges.forEach(function (e) { adjV[e[0]].push([e[1], e[2]]); adjV[e[1]].push([e[0], 1 / e[2]]); });
      function rnd(x) { return Math.round(x * 1000) / 1000; }
      function snapV(pathNodes, active, cap) { var inner = ""; cfg.edges.forEach(function (e) { inner += wEdge(e[0], e[1], e[2], "var(--border)", 1.6, true); }); for (var i = 0; i < n; i++) { var st = { txt: lbl(i) }; if (pathNodes.indexOf(i) >= 0) { st.stroke = "var(--c-success)"; st.lab = "var(--c-success)"; } if (i === active) { st.fill = "var(--brand-soft)"; st.sw = 2.6; } inner += nodeC(i, st); } inner += panelLine(cap.p); return gout(inner, cap.t); }
      var ia = cfg.labels.indexOf(cfg.query[0]), ib = cfg.labels.indexOf(cfg.query[1]), qa = cfg.query[0], qb = cfg.query[1];
      frames.push(snapV([], ia, { t: `Evaluate ${qa}/${qb} as a path product: each edge a→b carries the ratio a/b (and b→a carries 1/that). DFS multiplying weights.`, p: `${qa}/${qb} = ?` }));
      var resVal = null, vis = new Array(n).fill(false), pathArr = [];
      (function dfs(u, acc) { if (resVal !== null) return; vis[u] = true; pathArr.push(u); if (u === ib) { resVal = acc; frames.push(snapV(pathArr.slice(), u, { t: `Reached ${qb}. Product of ratios = <b>${rnd(acc)}</b>.`, p: `${qa}/${qb} = ${rnd(acc)}` })); return; } frames.push(snapV(pathArr.slice(), u, { t: `At <b>${cfg.labels[u]}</b> (running product ${rnd(acc)}). Follow its ratios.`, p: `${qa}/${qb} = ?` })); for (var k = 0; k < adjV[u].length; k++) { if (!vis[adjV[u][k][0]]) { dfs(adjV[u][k][0], acc * adjV[u][k][1]); if (resVal !== null) return; } } pathArr.pop(); })(ia, 1);
      if (resVal === null) frames.push(snapV([], -1, { t: `No path connects ${qa} and ${qb} → -1.`, p: `${qa}/${qb} = -1` }));
      return frames;
    }

    if (mode === "accounts-merge") {
      var par = []; for (var i = 0; i < n; i++) par.push(i); function find(x) { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; }
      var PAL = ["var(--accent)", "var(--c-success)", "var(--c-warning)", "var(--c-info)"];
      function cmap() { var roots = [], m = {}; for (var i = 0; i < n; i++) { var rr = find(i); if (roots.indexOf(rr) < 0) roots.push(rr); } roots.forEach(function (rr, k) { m[rr] = PAL[k % PAL.length]; }); return m; }
      function snapAc(activeEdge, cap) { var cm = cmap(), inner = ""; cfg.edges.forEach(function (e, ei) { inner += undirEdge(e[0], e[1], ei === activeEdge ? "var(--accent)" : "var(--border-soft)", ei === activeEdge ? 3 : 1.6); }); for (var i = 0; i < n; i++) { var c = cm[find(i)]; inner += nodeC(i, { txt: lbl(i), stroke: c, lab: c, sw: 2 }); } inner += panelLine(cap.p); return gout(inner, cap.t); }
      frames.push(snapAc(-1, { t: "Accounts sharing any email belong to one person. Union-Find merges accounts joined by a shared email; each final colour group is one merged person.", p: "people = " + n }));
      var comps = n;
      for (var ei = 0; ei < cfg.edges.length; ei++) { var e = cfg.edges[ei], ra = find(e[0]), rb = find(e[1]); if (ra !== rb) { par[ra] = rb; comps--; frames.push(snapAc(ei, { t: `${cfg.labels[e[0]]} and ${cfg.labels[e[1]]} share an email → <b>merge</b>. People: ${comps}.`, p: "people = " + comps })); } else frames.push(snapAc(ei, { t: `${cfg.labels[e[0]]} and ${cfg.labels[e[1]]} are already the same person.`, p: "people = " + comps })); }
      frames.push(snapAc(-1, { t: `Merged into <b>${comps}</b> distinct people.`, p: "people = " + comps }));
      return frames;
    }

    if (mode === "lock-path") {
      var dead = {}; cfg.deadends.forEach(function (d) { dead[d] = true; }); var target = cfg.target, startS = "0000", H2 = 175;
      function nbrs(s) { var r = []; for (var i = 0; i < 4; i++) { var d = +s[i]; [(d + 1) % 10, (d + 9) % 10].forEach(function (nd) { r.push(s.slice(0, i) + nd + s.slice(i + 1)); }); } return r; }
      var prev = {}, dseen = {}, path = [];
      if (!dead[startS]) { var q = [startS]; dseen[startS] = 0; while (q.length) { var u = q.shift(); if (u === target) break; nbrs(u).forEach(function (v) { if (dseen[v] === undefined && !dead[v]) { dseen[v] = dseen[u] + 1; prev[v] = u; q.push(v); } }); } if (dseen[target] !== undefined) { var cur = target; while (cur !== undefined) { path.unshift(cur); cur = prev[cur]; } } }
      function lock(state, turned) { var s = "", x0 = (W - 4 * 44) / 2; for (var i = 0; i < 4; i++) { var hot = turned === i; s += rect(x0 + i * 44, 60, 38, 48, { fill: hot ? "var(--brand-soft)" : "var(--surface-2)", stroke: hot ? "var(--accent)" : "var(--border)", sw: hot ? 2.4 : 1.2, r: 7 }); s += `<text x="${x0 + i * 44 + 19}" y="${90}" text-anchor="middle" fill="${hot ? "var(--accent)" : "var(--text)"}" style="font:700 20px var(--font-mono)">${state[i]}</text>`; } return s; }
      function o2(inner, t, pt) { return { svg: `<svg viewBox="0 0 ${W} ${H2}" role="img" aria-label="lock"><text x="${W / 2}" y="${H2 - 12}" text-anchor="middle" fill="var(--text-muted)" style="font:600 11px var(--font-mono)">${pt}</text>${inner}</svg>`, caption: t }; }
      if (!path.length) { frames.push(o2(lock(startS, -1), `Target ${target} is unreachable (blocked by deadends) → -1.`, "unreachable")); return frames; }
      frames.push(o2(lock(startS, -1), `Open the lock: each move turns one wheel ±1, avoiding deadends. BFS finds the fewest moves from 0000 to ${target}.`, "BFS distance 0"));
      for (var i = 1; i < path.length; i++) { var turned = -1; for (var k = 0; k < 4; k++) if (path[i][k] !== path[i - 1][k]) turned = k; frames.push(o2(lock(path[i], turned), `Move ${i}: turn wheel ${turned} → <b>${path[i]}</b>.`, "BFS distance " + i)); }
      frames.push(o2(lock(target, -1), `Reached ${target} in <b>${path.length - 1}</b> moves — the BFS-optimal answer.`, "done"));
      return frames;
    }

    if (mode === "keys-rooms") {
      var adjK = Array.from({ length: n }, function () { return []; }); cfg.edges.forEach(function (e) { adjK[e[0]].push(e[1]); });
      var visited = new Array(n).fill(false);
      function vlist() { return visited.map(function (x, i) { return x ? i : null; }).filter(function (x) { return x !== null; }).join(", "); }
      function snapK(active, cap) { var inner = ""; cfg.edges.forEach(function (e) { inner += dirEdge(e[0], e[1], "var(--border)", 1.6); }); for (var i = 0; i < n; i++) { var st = {}; if (visited[i]) { st.stroke = "var(--c-success)"; st.lab = "var(--c-success)"; st.fill = "var(--c-success-bg)"; } if (i === active) { st.fill = "var(--brand-soft)"; st.sw = 2.6; st.stroke = "var(--accent)"; } inner += nodeC(i, st); } inner += panelLine(cap.p); return gout(inner, cap.t); }
      var stack = [0]; visited[0] = true;
      frames.push(snapK(0, { t: "Each room holds keys to other rooms (directed edges). Start in room 0 and DFS; if every room becomes reachable, you can open them all.", p: "visited: 0" }));
      while (stack.length) { var u = stack.pop(); var newly = []; adjK[u].forEach(function (v) { if (!visited[v]) { visited[v] = true; stack.push(v); newly.push(v); } }); frames.push(snapK(u, { t: `Room <b>${u}</b> has keys to ${adjK[u].length ? adjK[u].join(", ") : "nothing"}${newly.length ? " — newly opened: " + newly.join(", ") : ""}.`, p: "visited: " + vlist() })); }
      var all = visited.every(function (x) { return x; });
      frames.push(snapK(-1, { t: all ? "Every room was reachable → <b>true</b>." : "Some room stayed locked → <b>false</b>.", p: all ? "all rooms visited" : "unreachable rooms remain" }));
      return frames;
    }

    if (mode === "mht") {
      var adjM = Array.from({ length: n }, function () { return []; }), deg = new Array(n).fill(0); cfg.edges.forEach(function (e) { adjM[e[0]].push(e[1]); adjM[e[1]].push(e[0]); deg[e[0]]++; deg[e[1]]++; });
      var removed = new Array(n).fill(false), remaining = n;
      function snapM(leaves, cap) { var inner = ""; cfg.edges.forEach(function (e) { inner += undirEdge(e[0], e[1], (removed[e[0]] || removed[e[1]]) ? "var(--border-soft)" : "var(--border)", 1.6); }); for (var i = 0; i < n; i++) { var st = {}; if (removed[i]) { st.fill = "var(--surface-2)"; st.stroke = "var(--border-soft)"; st.lab = "var(--text-faint)"; } else if (leaves && leaves.indexOf(i) >= 0) { st.fill = "var(--c-warning-bg)"; st.stroke = "var(--c-warning)"; st.lab = "var(--c-warning)"; } else { st.stroke = "var(--c-success)"; st.lab = "var(--c-success)"; } inner += nodeC(i, st); } inner += panelLine(cap.p); return gout(inner, cap.t); }
      frames.push(snapM([], { t: "The roots giving minimum height are the tree's <b>centre(s)</b>. Repeatedly peel off all current leaves (degree ≤ 1); the last 1 or 2 nodes are the answer.", p: "remaining = " + n }));
      var guardM = 0;
      while (remaining > 2 && guardM++ < n) { var leaves = []; for (var i = 0; i < n; i++) if (!removed[i] && deg[i] <= 1) leaves.push(i); frames.push(snapM(leaves, { t: `Current leaves: ${leaves.join(", ")} — peel them off.`, p: "remaining = " + remaining })); leaves.forEach(function (l) { removed[l] = true; remaining--; adjM[l].forEach(function (v) { if (!removed[v]) deg[v]--; }); }); }
      var centers = []; for (var i = 0; i < n; i++) if (!removed[i]) centers.push(i);
      frames.push(snapM([], { t: `Minimum-height-tree root(s): <b>${centers.join(", ")}</b>.`, p: "centre(s) = " + centers.join(", ") }));
      return frames;
    }

    if (mode === "town-judge") {
      var indeg = new Array(n).fill(0), outdeg = new Array(n).fill(0); cfg.edges.forEach(function (e) { outdeg[e[0] - 1]++; indeg[e[1] - 1]++; });
      var judge = -1; for (var i = 0; i < n; i++) if (indeg[i] === n - 1 && outdeg[i] === 0) judge = i;
      function snapJ(active, cap) { var inner = ""; cfg.edges.forEach(function (e) { inner += dirEdge(e[0] - 1, e[1] - 1, "var(--border)", 1.6); }); for (var i = 0; i < n; i++) { var st = { txt: i + 1 }; if (i === judge) { st.fill = "var(--c-success-bg)"; st.stroke = "var(--c-success)"; st.lab = "var(--c-success)"; st.sw = 2.6; } if (i === active) { st.fill = "var(--brand-soft)"; st.sw = 2.4; st.stroke = "var(--accent)"; st.lab = "var(--accent)"; } inner += nodeC(i, st); } inner += panelLine(cap.p); return gout(inner, cap.t); }
      frames.push(snapJ(-1, { t: "Everyone trusts the town judge (edge a→b = a trusts b), but the judge trusts no one. So the judge has <b>in-degree n−1</b> and <b>out-degree 0</b>.", p: "looking for in=" + (n - 1) + ", out=0" }));
      for (var i = 0; i < n; i++) frames.push(snapJ(i, { t: `Person ${i + 1}: trusted by ${indeg[i]}, trusts ${outdeg[i]} → ${indeg[i] === n - 1 && outdeg[i] === 0 ? "matches the judge!" : "not the judge"}.`, p: "in=" + indeg[i] + " out=" + outdeg[i] }));
      frames.push(snapJ(judge, { t: judge >= 0 ? `The town judge is person <b>${judge + 1}</b>.` : "No one fits both conditions → return -1.", p: judge >= 0 ? "judge = " + (judge + 1) : "no judge" }));
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
    var lo, hi, feasible, intro, smallest, unit = "value";
    if (mode === "koko") {
      var piles = cfg.piles, hh = cfg.h; lo = 1; hi = Math.max.apply(null, piles); smallest = true; unit = "speed";
      feasible = function (k) { var t = 0; for (var i = 0; i < piles.length; i++) t += Math.ceil(piles[i] / k); return { ok: t <= hh, detail: "needs " + t + "h " + (t <= hh ? "≤ " + hh : "&gt; " + hh) }; };
      intro = `Binary-search the <b>eating speed</b> itself, not an array. Speeds 1..${hi}; the total hours must stay ≤ ${hh}. Find the smallest speed that works.`;
    } else if (mode === "capacity") {
      var weights = cfg.weights, days = cfg.days; lo = Math.max.apply(null, weights); hi = weights.reduce(function (a, b) { return a + b; }, 0); smallest = true; unit = "capacity";
      feasible = function (cap) { var d = 1, cur = 0; for (var i = 0; i < weights.length; i++) { if (cur + weights[i] > cap) { d++; cur = 0; } cur += weights[i]; } return { ok: d <= days, detail: "needs " + d + " days " + (d <= days ? "≤ " + days : "&gt; " + days) }; };
      intro = `Binary-search the ship's <b>capacity</b>. For each candidate, greedily pack packages into days; find the smallest capacity that ships within ${days} days.`;
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
      while (lo < hi && guard++ < 40) { var mid = lo + ((hi - lo) >> 1), r = feasible(mid); if (r.ok) { frames.push(frame(lo, hi, mid, r, `${unit} ${mid}: ${r.detail} → feasible, try <b>smaller</b>: hi=${mid}.`)); hi = mid; } else { frames.push(frame(lo, hi, mid, r, `${unit} ${mid}: ${r.detail} → not enough, go <b>bigger</b>: lo=${mid + 1}.`)); lo = mid + 1; } }
      frames.push(frame(lo, hi, null, null, `lo == hi → smallest workable ${unit} is <b>${lo}</b>.`));
    } else {
      while (lo < hi && guard++ < 40) { var mid2 = lo + ((hi - lo + 1) >> 1), r2 = feasible(mid2); if (r2.ok) { frames.push(frame(lo, hi, mid2, r2, `${r2.detail} → fits, try <b>bigger</b>: lo=${mid2}.`)); lo = mid2; } else { frames.push(frame(lo, hi, mid2, r2, `${r2.detail} → too big, go <b>smaller</b>: hi=${mid2 - 1}.`)); hi = mid2 - 1; } }
      frames.push(frame(lo, hi, null, null, `Converged → ⌊√${cfg.x}⌋ = <b>${lo}</b>.`));
    }
    return frames;
  }
  function bsearch(cfg) {
    var mode = cfg.mode, W = 600, H = 162;
    if (mode === "koko" || mode === "sqrtx" || mode === "capacity") return bsearchAnswer(cfg);
    if (mode === "median2") {
      var A = cfg.a, B = cfg.b; if (A.length > B.length) { var tt = A; A = B; B = tt; }
      var m = A.length, nn = B.length, half = (m + nn + 1) >> 1, Hm = 195, fr = [];
      function rowM(arr, y, part, label) { var nz = arr.length, cw = Math.min(46, (W - 80) / Math.max(nz, 1)), gap = 6, total = cw * nz + gap * (nz - 1), sx = (W - total) / 2, s = `<text x="20" y="${y + 24}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">${label}</text>`; for (var i = 0; i < nz; i++) { var left = i < part; s += rect(sx + i * (cw + gap), y, cw, 36, { fill: left ? "var(--c-info-bg)" : "var(--surface-2)", stroke: left ? "var(--accent)" : "var(--border)", sw: 1.3, r: 5 }); s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${y + 23}" text-anchor="middle" fill="var(--text)" style="font:700 13px var(--font-mono)">${arr[i]}</text>`; } if (part >= 0 && part <= nz) { var px = sx + part * (cw + gap) - gap / 2; s += line(px, y - 4, px, y + 40, { stroke: "var(--c-warning)", sw: 2.4 }); } return s; }
      function fm(pa, pb, cap) { return { svg: `<svg viewBox="0 0 ${W} ${Hm}" role="img" aria-label="median of two arrays">${rowM(A, 40, pa, "A")}${rowM(B, 110, pb, "B")}</svg>`, caption: cap }; }
      var lo = 0, hi = m, guard = 0;
      fr.push(fm(0, half, `Median of two sorted arrays in O(log min(m,n)). Binary-search a partition of the smaller array A; B's partition is then fixed so the left side holds half the values. Adjust until maxLeft ≤ minRight.`));
      while (lo <= hi && guard++ < 40) { var pa = (lo + hi) >> 1, pb = half - pa; var Al = pa > 0 ? A[pa - 1] : -Infinity, Ar = pa < m ? A[pa] : Infinity, Bl = pb > 0 ? B[pb - 1] : -Infinity, Br = pb < nn ? B[pb] : Infinity; if (Al <= Br && Bl <= Ar) { var med = (m + nn) % 2 ? Math.max(Al, Bl) : (Math.max(Al, Bl) + Math.min(Ar, Br)) / 2; fr.push(fm(pa, pb, `Balanced: maxLeft = ${Math.max(Al, Bl)} ≤ minRight = ${Math.min(Ar, Br)} → median = <b>${med}</b>.`)); break; } else if (Al > Br) { fr.push(fm(pa, pb, `A's left max ${Al} &gt; B's right ${Br} → move A's partition <b>left</b>.`)); hi = pa - 1; } else { fr.push(fm(pa, pb, `B's left max ${Bl} &gt; A's right ${Ar} → move A's partition <b>right</b>.`)); lo = pa + 1; } }
      return fr;
    }
    if (mode === "k-closest-elements") {
      var arrK = cfg.data, x = cfg.x, kk = cfg.k, nk = arrK.length, gk = valueCells(arrK, { W: W, y: 56, h: 44, maxCw: 52 }), fk = [];
      function fkf(left, right, cap) { var inner = gk.draw(function (i) { if (i >= left && i <= right) return { fill: "var(--c-info-bg)", stroke: "var(--accent)" }; return { op: 0.3 }; }, true); inner += ptrMark(gk, left, "L", "var(--accent)", true); inner += ptrMark(gk, right, "R", "var(--accent)", true); inner += `<text x="${W / 2}" y="22" text-anchor="middle" fill="var(--text)" style="font:700 13px var(--font-sans)">x = ${x}, keep ${kk} closest</text>`; return { svg: `<svg viewBox="0 0 ${W} 162" role="img" aria-label="k closest elements">${inner}</svg>`, caption: cap }; }
      var left = 0, right = nk - 1;
      fk.push(fkf(left, right, `Find the ${kk} elements closest to <b>${x}</b> in a sorted array. Shrink a window from both ends, dropping whichever end is <b>farther</b> from x, until ${kk} remain.`));
      while (right - left + 1 > kk) { if (x - arrK[left] > arrK[right] - x) { fk.push(fkf(left, right, `|${arrK[left]}−${x}| = ${Math.abs(arrK[left] - x)} &gt; |${arrK[right]}−${x}| = ${Math.abs(arrK[right] - x)} → drop the left end.`)); left++; } else { fk.push(fkf(left, right, `The right end is at least as far from ${x} → drop the right end.`)); right--; } }
      fk.push(fkf(left, right, `The ${kk} closest: [${arrK.slice(left, right + 1).join(", ")}].`));
      return fk;
    }
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
    } else if (mode === "single-element") {
      frames.push(frame(0, n - 1, -1, -1, null, "Every value appears twice except one. Binary-search on <b>pair boundaries</b>: snap mid to an even index — if a[mid]==a[mid+1] the pairs are intact to the left, so the single is on the right."));
      lo = 0; hi = n - 1;
      while (lo < hi && guard++ < 40) { var ms = lo + ((hi - lo) >> 1); if (ms % 2 === 1) ms--; if (a[ms] === a[ms + 1]) { frames.push(frame(lo, hi, ms, -1, null, `a[${ms}]==a[${ms + 1}] (${a[ms]}) → pairs intact here, single is to the <b>right</b>: lo=${ms + 2}.`)); lo = ms + 2; } else { frames.push(frame(lo, hi, ms, -1, null, `a[${ms}] (${a[ms]}) ≠ a[${ms + 1}] (${a[ms + 1]}) → the single is at mid or <b>left</b>: hi=${ms}.`)); hi = ms; } }
      frames.push(frame(lo, hi, -1, lo, null, `Converged → the single element is <b>${a[lo]}</b>.`));
    } else if (mode === "first-bad") {
      var bad = cfg.bad;
      frames.push(frame(0, n - 1, -1, -1, null, "Versions are good up to a point, then all bad. Binary-search for the <b>first bad</b> version (the boundary) using as few checks as possible."));
      lo = 0; hi = n - 1; var ans = -1;
      while (lo <= hi && guard++ < 40) { var mb = lo + ((hi - lo) >> 1); if (a[mb] >= bad) { ans = mb; var ex = {}; for (var z = mb; z < n; z++) ex[z] = { fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", lab: "var(--c-warning)" }; frames.push(frame(lo, hi, mb, -1, ex, `Version ${a[mb]} is <b>bad</b> → the first bad is here or to the <b>left</b>: hi=${mb - 1}.`)); hi = mb - 1; } else { frames.push(frame(lo, hi, mb, -1, null, `Version ${a[mb]} is good → the first bad is to the <b>right</b>: lo=${mb + 1}.`)); lo = mb + 1; } }
      var fa = {}; if (ans >= 0) fa[ans] = { fill: "var(--c-success-bg)", stroke: "var(--c-success)", sw: 2.2, lab: "var(--c-success)" };
      frames.push(frame(-1, -1, -1, -1, fa, `First bad version = <b>${a[ans]}</b>.`));
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

    if (mode === "sudoku") {
      function boxLines() { var s = ""; for (var b = 0; b <= 3; b++) { var lw = 2; s += line(cx(0) - gap / 2, sy + b * 3 * (cell + gap) - gap / 2, cx(C - 1) + cell + gap / 2, sy + b * 3 * (cell + gap) - gap / 2, { stroke: "var(--text-faint)", sw: lw }); s += line(cx(b * 3) - gap / 2, sy - gap / 2, cx(b * 3) - gap / 2, sy + R * (cell + gap) - gap / 2, { stroke: "var(--text-faint)", sw: lw }); } return s; }
      function sdraw(state, note) { var f = draw(g0, state, note); f.svg = f.svg.replace("</svg>", boxLines() + "</svg>"); return f; }
      frames.push((function () { var f = sdraw(function (rr, cc) { return { v: g0[rr][cc] === "." ? "" : g0[rr][cc], lab: "var(--text)", fs: 13 }; }, "scan filled cells"); f.caption = "A board is valid if no row, column, or 3×3 box repeats a digit. Scan every filled cell, recording it in three sets; a clash anywhere fails."; return f; })());
      var rowsSeen = {}, colsSeen = {}, boxSeen = {}, bad = false;
      for (var r = 0; r < 9 && !bad; r++) for (var c = 0; c < 9 && !bad; c++) {
        var ch = g0[r][c]; if (ch === ".") continue;
        var bi = Math.floor(r / 3) * 3 + Math.floor(c / 3);
        var clash = (rowsSeen["r" + r + ch] || colsSeen["c" + c + ch] || boxSeen["b" + bi + ch]);
        var rr2 = r, cc2 = c, bii = bi, chh = ch;
        if (clash) { bad = true; frames.push((function () { var f = sdraw(function (a, b) { var inRow = a === rr2, inCol = b === cc2, inBox = Math.floor(a / 3) * 3 + Math.floor(b / 3) === bii; if (a === rr2 && b === cc2) return { v: g0[a][b], fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", lab: "var(--c-warning)", sw: 2.4, fs: 13 }; if ((inRow || inCol || inBox) && g0[a][b] === chh) return { v: g0[a][b], fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", lab: "var(--c-warning)", fs: 13 }; return { v: g0[a][b] === "." ? "" : g0[a][b], lab: "var(--text-faint)", fs: 13 }; }, ""); f.caption = `Digit ${chh} at (${rr2},${cc2}) already appears in its ${rowsSeen["r" + rr2 + chh] ? "row" : colsSeen["c" + cc2 + chh] ? "column" : "3×3 box"} → <b>invalid</b>.`; return f; })()); }
        else { rowsSeen["r" + r + ch] = true; colsSeen["c" + c + ch] = true; boxSeen["b" + bi + ch] = true; frames.push((function () { var f = sdraw(function (a, b) { if (a === rr2 && b === cc2) return { v: g0[a][b], fill: "var(--brand-soft)", stroke: "var(--accent)", lab: "var(--accent)", sw: 2.2, fs: 13 }; return { v: g0[a][b] === "." ? "" : g0[a][b], lab: g0[a][b] === "." ? "var(--text-faint)" : "var(--text-muted)", fs: 13 }; }, ""); f.caption = `${chh} at (${rr2},${cc2}) is new to its row, column, and box ✓.`; return f; })()); }
      }
      if (!bad) frames.push((function () { var f = sdraw(function (a, b) { return { v: g0[a][b] === "." ? "" : g0[a][b], fill: g0[a][b] !== "." ? "var(--c-success-bg)" : "var(--surface-2)", stroke: g0[a][b] !== "." ? "var(--c-success)" : "var(--border)", lab: "var(--c-success)", fs: 13 }; }, ""); f.caption = "No clashes anywhere → the board is <b>valid</b>."; return f; })());
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

    if (mode === "partition-labels") {
      var s3 = cfg.s, H6 = 160, last = {};
      for (var i = 0; i < s3.length; i++) last[s3[i]] = i;
      var rowP = chars(s3, 56, { cw: Math.min(40, (W - 60) / s3.length), gap: 5 });
      var parts = [], cuts = [];
      function frame(i, end, cap) {
        var inner = "";
        for (var k = 0; k < s3.length; k++) { var done = cuts.some(function (c) { return k <= c; }) && (cuts.length === 0 || k <= cuts[cuts.length - 1]) === false; var inCut = cuts.length && k <= cuts[cuts.length - 1]; var st = inCut ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" } : k === i ? { fill: "var(--brand-soft)", stroke: "var(--accent)", lab: "var(--accent)", sw: 2.2 } : (end >= 0 && k > (cuts.length ? cuts[cuts.length - 1] : -1) && k <= end) ? { fill: "var(--c-info-bg)", stroke: "var(--accent)" } : {}; inner += rect(rowP.x(k), rowP.y, rowP.cw, 40, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: st.sw || 1.2, r: 5 }); inner += `<text x="${rowP.cx(k)}" y="${rowP.y + 26}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 14px var(--font-mono)">${s3[k]}</text>`; }
        inner += `<text x="${W / 2}" y="${H6 - 12}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">sizes = [${parts.join(", ")}]</text>`;
        return { svg: `<svg viewBox="0 0 ${W} ${H6}" role="img" aria-label="partition labels">${inner}</svg>`, caption: cap };
      }
      frames.push(frame(-1, -1, "Each letter must stay in one part, so a part can't end before the <b>last</b> occurrence of any letter inside it. Sweep, stretching the end to that furthest last-index; cut when you reach it."));
      var start = 0, end = 0;
      for (var i2 = 0; i2 < s3.length; i2++) {
        end = Math.max(end, last[s3[i2]]);
        if (i2 === end) { parts.push(end - start + 1); cuts.push(end); frames.push(frame(i2, end, `Reached i = end = ${end}: every letter so far finishes by here → <b>cut</b>. Part size ${end - start + 1}.`)); start = i2 + 1; }
        else frames.push(frame(i2, end, `'${s3[i2]}' last appears at ${last[s3[i2]]} → stretch the part's end to ${end}.`));
      }
      frames.push(frame(-1, -1, `Partition sizes: <b>[${parts.join(", ")}]</b>.`));
      return frames;
    }

    if (mode === "encode-decode") {
      var words = cfg.words, H6 = 180, enc = words.map(function (w) { return w.length + "#" + w; }).join("");
      var rowE = chars(enc, 96, { cw: Math.min(30, (W - 40) / enc.length), gap: 3 });
      function frame(hi, cap, joined) {
        var inner = `<text x="${W / 2}" y="36" text-anchor="middle" fill="var(--text-faint)" style="font:600 12px var(--font-mono)">words: ${words.map(function (w) { return '"' + w + '"'; }).join(", ")}</text>`;
        inner += `<text x="${W / 2}" y="62" text-anchor="middle" fill="var(--text-muted)" style="font:600 11px var(--font-sans)">encoded: length + '#' + word</text>`;
        for (var k = 0; k < enc.length; k++) { var st = hi && hi.indexOf(k) >= 0 ? { fill: "var(--brand-soft)", stroke: "var(--accent)", lab: "var(--accent)" } : {}; inner += rect(rowE.x(k), rowE.y, rowE.cw, 30, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: 1.2, r: 4 }); inner += `<text x="${rowE.cx(k)}" y="${rowE.y + 20}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 12px var(--font-mono)">${enc[k] === "#" ? "#" : enc[k]}</text>`; }
        if (joined != null) inner += `<text x="${W / 2}" y="${H6 - 10}" text-anchor="middle" fill="var(--c-success)" style="font:600 12px var(--font-mono)">decoded: ${joined}</text>`;
        return { svg: `<svg viewBox="0 0 ${W} ${H6}" role="img" aria-label="encode decode strings">${inner}</svg>`, caption: cap };
      }
      frames.push(frame(null, `Encode a list of strings unambiguously by prefixing each with its <b>length + '#'</b>. Any character (even '#') is then safe inside a word.`, "[]"));
      var p = 0, out = [];
      while (p < enc.length) {
        var h = p; while (enc[h] !== "#") h++;
        var len = +enc.slice(p, h), word = enc.slice(h + 1, h + 1 + len);
        var hi = []; for (var q = p; q <= h + len; q++) hi.push(q);
        out.push('"' + word + '"');
        frames.push(frame(hi, `Read digits "${enc.slice(p, h)}" → length ${len}; skip '#'; take the next ${len} chars → "<b>${word}</b>".`, "[" + out.join(", ") + "]"));
        p = h + 1 + len;
      }
      frames.push(frame(null, `Decoded back to ${out.length} strings.`, "[" + out.join(", ") + "]"));
      return frames;
    }

    if (mode === "atoi") {
      var s4 = cfg.s, H6 = 150, rowA = chars(s4.replace(/ /g, "␣"), 50, { cw: 40, gap: 6 });
      function frame(i, sign, res, cap) {
        var inner = "";
        for (var k = 0; k < s4.length; k++) { var st = k === i ? { fill: "var(--brand-soft)", stroke: "var(--accent)", lab: "var(--accent)", sw: 2.2 } : k < i ? { op: 0.5 } : {}; inner += rect(rowA.x(k), rowA.y, rowA.cw, 36, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: st.sw || 1.2, r: 5, op: st.op || 1 }); inner += `<text x="${rowA.cx(k)}" y="${rowA.y + 24}" text-anchor="middle" fill="${st.lab || "var(--text)"}" opacity="${st.op || 1}" style="font:700 14px var(--font-mono)">${s4[k] === " " ? "␣" : s4[k]}</text>`; }
        inner += `<text x="${W / 2}" y="${H6 - 12}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">sign = ${sign > 0 ? "+" : "−"} · value = ${res}</text>`;
        return { svg: `<svg viewBox="0 0 ${W} ${H6}" role="img" aria-label="atoi">${inner}</svg>`, caption: cap };
      }
      frames.push(frame(-1, 1, 0, "Parse an integer in four phases: skip leading spaces, read an optional sign, then digits — stopping at the first non-digit. (Clamp to 32-bit at the end.)"));
      var i3 = 0, sign = 1, res = 0;
      while (s4[i3] === " ") { frames.push(frame(i3, sign, res, "Skip leading space.")); i3++; }
      if (s4[i3] === "+" || s4[i3] === "-") { sign = s4[i3] === "-" ? -1 : 1; frames.push(frame(i3, sign, res, `Sign '${s4[i3]}' → ${sign < 0 ? "negative" : "positive"}.`)); i3++; }
      while (i3 < s4.length && s4[i3] >= "0" && s4[i3] <= "9") { res = res * 10 + (+s4[i3]); frames.push(frame(i3, sign, sign * res, `Digit '${s4[i3]}' → value = value×10 + ${s4[i3]} = ${res}.`)); i3++; }
      frames.push(frame(-1, sign, sign * res, `Stopped at a non-digit. Result = <b>${sign * res}</b>.`));
      return frames;
    }

    if (mode === "reverse-words") {
      var sw = cfg.s, words = sw.split(/\s+/).filter(Boolean), Hr = 160;
      function frameRW(arr, hi, cap) { var n = arr.length, cw = Math.min(110, (W - 60) / n), gap = 10, total = cw * n + gap * (n - 1), sx = (W - total) / 2, s = ""; for (var i = 0; i < n; i++) { var h = hi && hi.indexOf(i) >= 0; s += rect(sx + i * (cw + gap), 60, cw, 40, { fill: h ? "var(--brand-soft)" : "var(--surface-2)", stroke: h ? "var(--accent)" : "var(--border)", sw: h ? 2.2 : 1.3, r: 7 }); s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${85}" text-anchor="middle" fill="${h ? "var(--accent)" : "var(--text)"}" style="font:700 14px var(--font-sans)">${arr[i]}</text>`; } return { svg: `<svg viewBox="0 0 ${W} ${Hr}" role="img" aria-label="reverse words">${s}</svg>`, caption: cap }; }
      frames.push(frameRW(words.slice(), [], `Reverse the word order of "${sw}". Trim extra spaces, split into words, then reverse the list (or two-pointer swap the ends).`));
      var rev = words.slice().reverse();
      frames.push(frameRW(rev, rev.map(function (_, i) { return i; }), `Reversed → "<b>${rev.join(" ")}</b>".`));
      return frames;
    }

    if (mode === "isomorphic") {
      var s = cfg.s, t = cfg.t, Hi = 190, rs = chars(s, 40), rt = chars(t, 98), map = {}, usedT = {};
      function frameI(i, bad, cap) { var inner = `<text x="20" y="${rs.y + 22}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">s</text>`; for (var k = 0; k < s.length; k++) inner += box(rs, k, s[k], k === i ? { fill: bad ? "var(--c-warning-bg)" : "var(--brand-soft)", stroke: bad ? "var(--c-warning)" : "var(--accent)", sw: 2.2, lab: bad ? "var(--c-warning)" : "var(--accent)" } : k < i ? { op: 0.5 } : {}); inner += `<text x="20" y="${rt.y + 22}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">t</text>`; for (var j = 0; j < t.length; j++) inner += box(rt, j, t[j], j === i ? { fill: bad ? "var(--c-warning-bg)" : "var(--c-info-bg)", stroke: bad ? "var(--c-warning)" : "var(--accent)", sw: 2.2, lab: bad ? "var(--c-warning)" : "var(--accent)" } : j < i ? { op: 0.5 } : {}); inner += `<text x="${W / 2}" y="${Hi - 10}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">map: {${Object.keys(map).map(function (k) { return k + "→" + map[k]; }).join(", ")}}</text>`; return { svg: `<svg viewBox="0 0 ${W} ${Hi}" role="img" aria-label="isomorphic">${inner}</svg>`, caption: cap }; }
      if (s.length !== t.length) { frames.push(frameI(-1, true, "Different lengths → not isomorphic.")); return frames; }
      frames.push(frameI(-1, false, `Are "${s}" and "${t}" isomorphic? Build a consistent 1-to-1 mapping s→t: each letter must always map to the same letter, and no two letters map to the same target.`));
      for (var i = 0; i < s.length; i++) { var ca = s[i], cb = t[i]; if ((map[ca] !== undefined && map[ca] !== cb) || (map[ca] === undefined && usedT[cb])) { frames.push(frameI(i, true, `'${ca}' ${map[ca] !== undefined ? "already maps to '" + map[ca] + "', not '" + cb + "'" : "would clash — '" + cb + "' is already a target"} → <b>not isomorphic</b>.`)); return frames; } map[ca] = cb; usedT[cb] = true; frames.push(frameI(i, false, `Map '${ca}' → '${cb}'.`)); }
      frames.push(frameI(-1, false, "A consistent bijection exists → <b>isomorphic</b>."));
      return frames;
    }

    if (mode === "ransom") {
      var note = cfg.note, Hn = 180, freq = {}; for (var ci = 0; ci < cfg.magazine.length; ci++) freq[cfg.magazine[ci]] = (freq[cfg.magazine[ci]] || 0) + 1;
      var rn = chars(note, 96);
      function frameN(i, bad, cap) { var inner = `<text x="${W / 2}" y="46" text-anchor="middle" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">magazine: ${Object.keys(freq).map(function (k) { return k + ":" + freq[k]; }).join("  ")}</text>`; inner += `<text x="20" y="${rn.y + 22}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">note</text>`; for (var k = 0; k < note.length; k++) inner += box(rn, k, note[k], k === i ? { fill: bad ? "var(--c-warning-bg)" : "var(--brand-soft)", stroke: bad ? "var(--c-warning)" : "var(--accent)", sw: 2.2, lab: bad ? "var(--c-warning)" : "var(--accent)" } : k < i ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" } : {}); return { svg: `<svg viewBox="0 0 ${W} ${Hn}" role="img" aria-label="ransom note">${inner}</svg>`, caption: cap }; }
      frames.push(frameN(-1, false, `Can "${note}" be built from the magazine's letters (each used once)? Tally the magazine, then spend one letter per note character.`));
      for (var i = 0; i < note.length; i++) { var c = note[i]; if (!freq[c]) { frames.push(frameN(i, true, `Need '${c}' but the magazine has none left → <b>false</b>.`)); return frames; } freq[c]--; frames.push(frameN(i, false, `Use a '${c}' (remaining ${freq[c]}).`)); }
      frames.push(frameN(-1, false, "Every character is covered → <b>true</b>."));
      return frames;
    }

    if (mode === "first-unique") {
      var s = cfg.s, Hu = 160, freq = {}; for (var ci2 = 0; ci2 < s.length; ci2++) freq[s[ci2]] = (freq[s[ci2]] || 0) + 1;
      var rs = chars(s, 64);
      function frameU(i, found, cap) { var inner = ""; for (var k = 0; k < s.length; k++) { var st = k === found ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)", sw: 2.4 } : k === i ? { fill: "var(--brand-soft)", stroke: "var(--accent)", lab: "var(--accent)", sw: 2.2 } : k < i ? { op: 0.5 } : {}; inner += box(rs, k, s[k], st, 40); inner += `<text x="${rs.cx(k)}" y="${rs.y - 8}" text-anchor="middle" fill="var(--text-faint)" style="font:500 9px var(--font-mono)">${freq[s[k]]}</text>`; } return { svg: `<svg viewBox="0 0 ${W} ${Hu}" role="img" aria-label="first unique char">${inner}</svg>`, caption: cap }; }
      frames.push(frameU(-1, -1, `Find the first non-repeating character of "${s}". Count every character (small number above each), then scan left→right for the first whose count is 1.`));
      for (var i = 0; i < s.length; i++) { if (freq[s[i]] === 1) { frames.push(frameU(i, i, `'${s[i]}' has count 1 → first unique is index <b>${i}</b>.`)); return frames; } frames.push(frameU(i, -1, `'${s[i]}' appears ${freq[s[i]]}× → skip.`)); }
      frames.push(frameU(-1, -1, "No unique character exists → return -1."));
      return frames;
    }

    if (mode === "longest-palindrome-build") {
      var s = cfg.s, Hp = 170, freq = {}; for (var ci3 = 0; ci3 < s.length; ci3++) freq[s[ci3]] = (freq[s[ci3]] || 0) + 1;
      var keys = Object.keys(freq);
      function frameP(idx, len, hasOdd, cap) { var cw = 72, gap = 10, sx = (W - (keys.length * (cw + gap) - gap)) / 2, s2 = ""; for (var i = 0; i < keys.length; i++) { var pairs = Math.floor(freq[keys[i]] / 2); s2 += rect(sx + i * (cw + gap), 50, cw, 44, { fill: i === idx ? "var(--brand-soft)" : "var(--surface-2)", stroke: i === idx ? "var(--accent)" : "var(--border)", sw: i === idx ? 2.2 : 1.3, r: 7 }); s2 += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${70}" text-anchor="middle" fill="var(--text)" style="font:700 14px var(--font-mono)">${keys[i]}:${freq[keys[i]]}</text>`; s2 += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${88}" text-anchor="middle" fill="var(--c-success)" style="font:600 10px var(--font-sans)">${pairs} pair${pairs !== 1 ? "s" : ""}</text>`; } s2 += `<text x="${W / 2}" y="${Hp - 10}" text-anchor="middle" fill="var(--c-success)" style="font:700 13px var(--font-sans)">length = ${len}${hasOdd ? " (+1 center)" : ""}</text>`; return { svg: `<svg viewBox="0 0 ${W} ${Hp}" role="img" aria-label="longest palindrome">${s2}</svg>`, caption: cap }; }
      frames.push(frameP(-1, 0, false, `Build the longest palindrome from the letters of "${s}". Each character contributes its number of <b>pairs</b> ×2; one leftover odd character can sit in the center.`));
      var len = 0, hasOdd = false;
      for (var i = 0; i < keys.length; i++) { var f = freq[keys[i]]; len += Math.floor(f / 2) * 2; if (f % 2 === 1) hasOdd = true; frames.push(frameP(i, len, hasOdd, `'${keys[i]}' (${f}) → contributes ${Math.floor(f / 2) * 2}.${f % 2 ? " Has a spare for the center." : ""}`)); }
      if (hasOdd) len += 1;
      frames.push(frameP(-1, len, hasOdd, `Longest palindrome length = <b>${len}</b>.`));
      return frames;
    }

    if (mode === "subsequence") {
      var s = cfg.s, t = cfg.t, Hs = 180, rs = chars(s, 40, { cw: 36 }), rt = chars(t, 100, { cw: 36 });
      function frameSub(i, j, cap) { var inner = `<text x="20" y="${rs.y + 22}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">s</text>`; for (var k = 0; k < s.length; k++) inner += box(rs, k, s[k], k < i ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" } : k === i ? { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" } : {}, 34); inner += `<text x="20" y="${rt.y + 22}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">t</text>`; for (var m = 0; m < t.length; m++) inner += box(rt, m, t[m], m === j ? { fill: "var(--c-info-bg)", stroke: "var(--accent)", sw: 2.2, lab: "var(--accent)" } : m < j ? { op: 0.5 } : {}, 34); return { svg: `<svg viewBox="0 0 ${W} ${Hs}" role="img" aria-label="is subsequence">${inner}</svg>`, caption: cap }; }
      frames.push(frameSub(0, 0, `Is "${s}" a subsequence of "${t}"? Two pointers: advance through t, and whenever t's character matches s's current one, advance s too.`));
      var i = 0, j = 0;
      while (i < s.length && j < t.length) { if (s[i] === t[j]) { frames.push(frameSub(i, j, `'${t[j]}' matches s[${i}]='${s[i]}' → advance both.`)); i++; j++; } else { frames.push(frameSub(i, j, `'${t[j]}' ≠ s[${i}]='${s[i]}' → advance only t.`)); j++; } }
      frames.push(frameSub(i, Math.min(j, t.length - 1), i === s.length ? `Consumed all of "${s}" → <b>it is a subsequence</b>.` : `Ran out of t with "${s.slice(i)}" unmatched → <b>not a subsequence</b>.`));
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

    if (mode === "rotate-array") {
      var a7 = cfg.data.slice(), n7 = a7.length, k7 = cfg.k % n7;
      function rev(lo, hi) { while (lo < hi) { var t = a7[lo]; a7[lo] = a7[hi]; a7[hi] = t; lo++; hi--; } }
      function hiRange(lo, hi) { return function (i) { return i >= lo && i <= hi ? { fill: "var(--brand-soft)", stroke: "var(--accent)", lab: "var(--accent)", sw: 2 } : {}; }; }
      frames.push(draw(a7.slice(), function () { return {}; }, [], `Rotate right by ${cfg.k} using three reversals: reverse the whole array, then reverse the first ${k7}, then reverse the rest. O(1) space.`, "k = " + k7));
      rev(0, n7 - 1); frames.push(draw(a7.slice(), hiRange(0, n7 - 1), [], "Reverse the <b>entire</b> array.", "step 1"));
      rev(0, k7 - 1); frames.push(draw(a7.slice(), hiRange(0, k7 - 1), [], `Reverse the first ${k7} elements.`, "step 2"));
      rev(k7, n7 - 1); frames.push(draw(a7.slice(), hiRange(k7, n7 - 1), [], `Reverse the remaining ${n7 - k7}.`, "step 3"));
      frames.push(draw(a7.slice(), function () { return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" }; }, [], `Rotated: [${a7.join(", ")}].`, "done"));
      return frames;
    }

    if (mode === "first-missing") {
      var a8 = cfg.data.slice(), n8 = a8.length;
      function st8(i) { var v = a8[i]; if (v === i + 1) return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" }; return {}; }
      frames.push(draw(a8.slice(), st8, [], `Find the smallest missing positive. Treat the array as its own hash: cyclically place each value v (1..${n8}) at index v−1. Then the first index whose value ≠ index+1 reveals the answer.`, "placing…"));
      for (var i = 0; i < n8; i++) {
        var guard = 0;
        while (a8[i] >= 1 && a8[i] <= n8 && a8[a8[i] - 1] !== a8[i] && guard++ < n8) {
          var tgt = a8[i] - 1, tmp = a8[tgt]; a8[tgt] = a8[i]; a8[i] = tmp;
          frames.push((function (cur, dst) { return draw(a8.slice(), function (k) { if (k === cur || k === dst) return { fill: "var(--brand-soft)", stroke: "var(--accent)", lab: "var(--accent)", sw: 2.2 }; return st8(k); }, [{ i: cur, t: "i", c: "var(--accent)" }], `Send ${a8[dst]} to its home index ${dst} (swap).`, "placing…"); })(i, tgt));
        }
      }
      var ans = n8 + 1;
      for (var k8 = 0; k8 < n8; k8++) if (a8[k8] !== k8 + 1) { ans = k8 + 1; break; }
      frames.push(draw(a8.slice(), function (k) { return (k === ans - 1) ? { fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", lab: "var(--c-warning)", sw: 2.2 } : st8(k); }, [], `First index whose value ≠ index+1 is ${ans - 1} → smallest missing positive is <b>${ans}</b>.`, "answer = " + ans));
      return frames;
    }

    if (mode === "reverse-string") {
      var arr = cfg.data.slice(), l = 0, r = arr.length - 1;
      frames.push(draw(arr.slice(), function () { return {}; }, [{ i: l, t: "L" }, { i: r, t: "R" }], "Reverse a character array in place: swap the two ends, then step both pointers inward until they meet. O(1) space.", "L=0 R=" + r));
      while (l < r) { var t = arr[l]; arr[l] = arr[r]; arr[r] = t; (function (ll, rr) { frames.push(draw(arr.slice(), function (i) { return (i === ll || i === rr) ? { fill: "var(--brand-soft)", stroke: "var(--accent)", lab: "var(--accent)", sw: 2.2 } : {}; }, [{ i: ll, t: "L" }, { i: rr, t: "R" }], `Swap positions ${ll} and ${rr}.`, "L=" + ll + " R=" + rr)); })(l, r); l++; r--; }
      frames.push(draw(arr.slice(), function () { return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" }; }, [], `Reversed: [${arr.join(", ")}].`, "done"));
      return frames;
    }

    if (mode === "candy") {
      var rat = cfg.data, n = rat.length, candy = new Array(n).fill(1), H8 = 190;
      function rowC(arr, y, hi, label) { var cw = Math.min(48, (W - 60) / n), gap = 6, total = cw * n + gap * (n - 1), sx = (W - total) / 2, s = `<text x="20" y="${y + 24}" fill="var(--text-faint)" style="font:600 10px var(--font-mono)">${label}</text>`; for (var i = 0; i < n; i++) { var h = i === hi; s += rect(sx + i * (cw + gap), y, cw, 36, { fill: h ? "var(--brand-soft)" : "var(--surface-2)", stroke: h ? "var(--accent)" : "var(--border)", sw: h ? 2.2 : 1.2, r: 5 }); s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${y + 23}" text-anchor="middle" fill="${h ? "var(--accent)" : "var(--text)"}" style="font:700 14px var(--font-sans)">${arr[i]}</text>`; } return s; }
      function tot() { return candy.reduce(function (a, b) { return a + b; }, 0); }
      function frameC(hi, cap) { return { svg: `<svg viewBox="0 0 ${W} ${H8}" role="img" aria-label="candy">${rowC(rat, 40, hi, "ratings")}${rowC(candy, 110, hi, "candy")}<text x="${W / 2}" y="${H8 - 10}" text-anchor="middle" fill="var(--c-success)" style="font:600 12px var(--font-mono)">total = ${tot()}</text></svg>`, caption: cap }; }
      frames.push(frameC(-1, "Every child gets ≥ 1 candy, and a higher rating than a neighbour means more candy. Two greedy passes: left→right enforces the left rule, right→left the right rule."));
      for (var i = 1; i < n; i++) { if (rat[i] > rat[i - 1]) candy[i] = candy[i - 1] + 1; frames.push(frameC(i, rat[i] > rat[i - 1] ? `Left pass: ${rat[i]} &gt; ${rat[i - 1]} → candy = ${candy[i - 1]}+1 = ${candy[i]}.` : `Left pass: ${rat[i]} ≤ ${rat[i - 1]} → keep ${candy[i]}.`)); }
      for (var j = n - 2; j >= 0; j--) { if (rat[j] > rat[j + 1]) candy[j] = Math.max(candy[j], candy[j + 1] + 1); frames.push(frameC(j, rat[j] > rat[j + 1] ? `Right pass: ${rat[j]} &gt; ${rat[j + 1]} → candy = max(prev, ${candy[j + 1] + 1}) = ${candy[j]}.` : `Right pass: ${rat[j]} ≤ ${rat[j + 1]} → keep ${candy[j]}.`)); }
      frames.push(frameC(-1, `Minimum candies = <b>${tot()}</b>.`));
      return frames;
    }

    if (mode === "hand") {
      var hand = cfg.data.slice().sort(function (a, b) { return a - b; }), gs = cfg.groupSize, n = hand.length, H9 = 170, used = new Array(n).fill(false), groups = [];
      function frameH(hi, cap) { var cw = Math.min(46, (W - 40 - 6 * (n - 1)) / n), gap = 6, total = cw * n + gap * (n - 1), sx = (W - total) / 2, y = 58, s = ""; for (var i = 0; i < n; i++) { var h = hi && hi.indexOf(i) >= 0; s += rect(sx + i * (cw + gap), y, cw, 40, { fill: used[i] && !h ? "var(--c-success-bg)" : h ? "var(--brand-soft)" : "var(--surface-2)", stroke: used[i] && !h ? "var(--c-success)" : h ? "var(--accent)" : "var(--border)", sw: h ? 2.2 : 1.2, r: 6, op: used[i] && !h ? 0.6 : 1 }); s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${y + 25}" text-anchor="middle" fill="${h ? "var(--accent)" : used[i] ? "var(--c-success)" : "var(--text)"}" style="font:700 15px var(--font-sans)">${hand[i]}</text>`; } s += `<text x="${W / 2}" y="${H9 - 10}" text-anchor="middle" fill="var(--text-muted)" style="font:600 11px var(--font-mono)">groups: ${groups.map(function (g) { return "[" + g.join(",") + "]"; }).join(" ")}</text>`; return { svg: `<svg viewBox="0 0 ${W} ${H9}" role="img" aria-label="hand of straights">${s}</svg>`, caption: cap }; }
      frames.push(frameH(null, `Can the hand split into groups of ${gs} consecutive cards? Greedily start each run from the smallest unused card; if a needed card is missing, it's impossible.`));
      for (var start = 0; start < n; start++) { if (used[start]) continue; var grp = [], idxs = [], base = hand[start], okGrp = true; for (var d = 0; d < gs; d++) { var want = base + d, found = -1; for (var i = 0; i < n; i++) if (!used[i] && hand[i] === want) { found = i; break; } if (found < 0) { okGrp = false; break; } used[found] = true; grp.push(want); idxs.push(found); } if (!okGrp) { frames.push(frameH(idxs, `Run from ${base} needs ${base + grp.length} but it's gone → <b>impossible</b>.`)); return frames; } groups.push(grp); frames.push(frameH(idxs, `Form a consecutive run from ${base}: [${grp.join(", ")}].`)); }
      frames.push(frameH(null, `All cards used across ${groups.length} consecutive group(s) → <b>possible</b>.`));
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

    if (mode === "power-of-two") {
      var pn = cfg.n, Hpt = 160, sxp = (W - bits * 34) / 2, isPow = pn > 0 && (pn & (pn - 1)) === 0;
      function frameP(val, line2, capt) { var inner = bitRow(toBits(val, bits), 60, sxp, null); inner += `<text x="${W / 2}" y="34" text-anchor="middle" fill="var(--text)" style="font:700 13px var(--font-mono)">n = ${pn} = ${(pn >>> 0).toString(2)}</text>`; inner += `<text x="${W / 2}" y="${Hpt - 14}" text-anchor="middle" fill="${isPow ? "var(--c-success)" : "var(--c-warning)"}" style="font:700 13px var(--font-sans)">${line2}</text>`; return { svg: `<svg viewBox="0 0 ${W} ${Hpt}" role="img" aria-label="power of two">${inner}</svg>`, caption: capt }; }
      frames.push(frameP(pn, "set bits: " + pn.toString(2).split("").filter(function (c) { return c === "1"; }).length, `A power of two has exactly <b>one</b> set bit. Test it with the trick <b>n &amp; (n−1) == 0</b> — that operation clears the lowest set bit.`));
      frames.push(frameP(pn & (pn - 1), isPow ? "power of two ✓" : "not a power of two", `n &amp; (n−1) = ${pn} &amp; ${pn - 1} = ${pn & (pn - 1)}. ${isPow ? "It's 0 (and n &gt; 0) → <b>power of two</b>." : "Non-zero (or n ≤ 0) → <b>not a power of two</b>."}`));
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
    else if (mode === "target-sum") { items = cfg.data; cap = (cfg.data.reduce(function (a, b) { return a + b; }, 0) + cfg.target) / 2; }
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
    if (mode === "target-sum") {
      dp[0][0] = 1; for (var c0 = 1; c0 < cols; c0++) dp[0][c0] = 0;
      frames.push(draw(dp, null, null, `Target Sum reduces to counting subsets summing to P = (total + target)/2 = <b>${capInt}</b>. dp[i][c] = #subsets of the first i numbers totalling c.`));
      for (var i = 1; i < rows; i++) { var it = items[i - 1]; for (var cc = 0; cc < cols; cc++) { var skip = dp[i - 1][cc], take = (cc >= it) ? dp[i - 1][cc - it] : 0; dp[i][cc] = skip + take; frames.push(draw(dp, [i, cc], cc >= it ? [[i - 1, cc], [i - 1, cc - it]] : [[i - 1, cc]], cc === 0 ? `Sum 0 stays 1 way (take nothing).` : `${it}: skip (${skip})${cc >= it ? " + take (" + take + ")" : ""} = <b>${dp[i][cc]}</b>.`)); } }
      frames.push(draw(dp, [rows - 1, cols - 1], null, `#subsets summing to ${capInt} = <b>${dp[rows - 1][cols - 1]}</b> — the number of valid ± sign assignments.`));
      return frames;
    }
    for (var r2 = 0; r2 < rows; r2++) dp[r2][0] = 1; for (var c2 = 1; c2 < cols; c2++) dp[0][c2] = 0;
    frames.push(draw(dp, null, null, `Count the ways to make each amount. dp[i][a] = ways using the first i coin types. Amount 0 has exactly 1 way (use nothing).`));
    for (var i2 = 1; i2 < rows; i2++) { var coin = items[i2 - 1]; for (var a = 1; a < cols; a++) { var without = dp[i2 - 1][a], wth = a >= coin ? dp[i2][a - coin] : 0; dp[i2][a] = without + wth; var con = [[i2 - 1, a]]; if (a >= coin) con.push([i2, a - coin]); frames.push(draw(dp, [i2, a], con, `Coin ${coin}, amount ${a}: ways without it (${without}) + ways reusing it (dp[${i2}][${a - coin >= 0 ? a - coin : "—"}] = ${wth}) = <b>${dp[i2][a]}</b>.`)); } }
    frames.push(draw(dp, [rows - 1, cols - 1], null, `Total ways to make ${capInt} = <b>${dp[rows - 1][cols - 1]}</b>.`));
    return frames;
  }

  /* ============================================================
     RENDERER — stack operations (RPN, min-stack, decode-string,
     asteroids, remove-k-digits, simplify-path, calculator, valid-paren)
     ============================================================ */
  function stackOps(cfg) {
    var mode = cfg.mode, W = 600, H = 235;
    function inputRow(tokens, cur) {
      var n = tokens.length, cw = Math.min(50, (W - 60) / n), gap = 6, total = cw * n + gap * (n - 1), sx = (W - total) / 2, y = 22, h = 28, s = "";
      for (var i = 0; i < n; i++) { var hot = i === cur, gone = i < cur && cur >= 0; s += rect(sx + i * (cw + gap), y, cw, h, { fill: hot ? "var(--brand-soft)" : "var(--surface-2)", stroke: hot ? "var(--accent)" : "var(--border)", sw: hot ? 2.2 : 1.2, r: 5, op: gone ? 0.4 : 1 }); s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${y + 19}" text-anchor="middle" fill="${hot ? "var(--accent)" : "var(--text)"}" opacity="${gone ? 0.4 : 1}" style="font:700 12px var(--font-mono)">${tokens[i]}</text>`; }
      return s;
    }
    function stackCol(stack, labels, hi) {
      var bw = 78, bh = 24, gap = 3, baseY = H - 26, x = (W - bw) / 2;
      var s = line(x - 8, baseY, x + bw + 8, baseY, { stroke: "var(--border)", sw: 1.5 }) + `<text x="${x + bw / 2}" y="${baseY + 15}" text-anchor="middle" fill="var(--text-faint)" style="font:600 10px var(--font-sans)">stack ↑</text>`;
      for (var i = 0; i < stack.length; i++) { var yy = baseY - (i + 1) * (bh + gap); var isTop = i === stack.length - 1, hl = hi && hi.indexOf(i) >= 0; s += rect(x, yy, bw, bh, { fill: hl ? "var(--brand-soft)" : "var(--surface-2)", stroke: hl || isTop ? "var(--accent)" : "var(--border)", sw: hl || isTop ? 2 : 1.3, r: 5 }); s += `<text x="${x + bw / 2}" y="${yy + bh / 2 + 5}" text-anchor="middle" fill="var(--text)" style="font:700 12px var(--font-sans)">${stack[i]}</text>`; if (labels && labels[i] != null) s += `<text x="${x + bw + 12}" y="${yy + bh / 2 + 4}" fill="var(--text-faint)" style="font:600 10px var(--font-mono)">${labels[i]}</text>`; }
      return s;
    }
    function fr(inner, caption) { return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="stack">${inner}</svg>`, caption: caption }; }
    var frames = [];

    if (mode === "rpn") {
      var tokens = cfg.tokens, stack = [], OPS = { "+": 1, "-": 1, "*": 1, "/": 1 };
      frames.push(fr(inputRow(tokens, -1) + stackCol(stack), "Reverse Polish Notation: push every number; on an operator, pop the top two operands, apply it, and push the result."));
      for (var i = 0; i < tokens.length; i++) { var t = tokens[i]; if (OPS[t]) { var b = +stack.pop(), a = +stack.pop(); var r = t === "+" ? a + b : t === "-" ? a - b : t === "*" ? a * b : Math.trunc(a / b); stack.push("" + r); frames.push(fr(inputRow(tokens, i) + stackCol(stack, null, [stack.length - 1]), `Operator '${t}': pop ${a} and ${b} → ${a} ${t} ${b} = <b>${r}</b>, push it.`)); } else { stack.push(t); frames.push(fr(inputRow(tokens, i) + stackCol(stack, null, [stack.length - 1]), `Operand ${t} → push.`)); } }
      frames.push(fr(inputRow(tokens, -1) + stackCol(stack), `One value left — the answer is <b>${stack[0]}</b>.`));
      return frames;
    }

    if (mode === "min-stack") {
      var ops = cfg.ops, labels = ops.map(function (o) { return o[0] === "push" ? "push " + o[1] : o[0]; });
      var stack = [], mins = [];
      frames.push(fr(inputRow(labels, -1) + stackCol(stack, mins), "MinStack keeps O(1) getMin by storing, with each value, the minimum <i>at that depth</i> (shown to the right). Pushes/pops update both."));
      for (var i = 0; i < ops.length; i++) {
        var op = ops[i];
        if (op[0] === "push") { stack.push(op[1]); mins.push(stack.length === 1 ? op[1] : Math.min(op[1], mins[mins.length - 1])); frames.push(fr(inputRow(labels, i) + stackCol(stack, mins, [stack.length - 1]), `push ${op[1]} → stored min becomes ${mins[mins.length - 1]}.`)); }
        else if (op[0] === "pop") { stack.pop(); mins.pop(); frames.push(fr(inputRow(labels, i) + stackCol(stack, mins, [stack.length - 1]), `pop → discard the top value and its stored min.`)); }
        else if (op[0] === "getMin") { frames.push(fr(inputRow(labels, i) + stackCol(stack, mins, [stack.length - 1]), `getMin → read the top's stored min = <b>${mins[mins.length - 1]}</b>, O(1).`)); }
        else { frames.push(fr(inputRow(labels, i) + stackCol(stack, mins, [stack.length - 1]), `top → <b>${stack[stack.length - 1]}</b>.`)); }
      }
      return frames;
    }

    if (mode === "decode-string") {
      var s = cfg.s, numStack = [], strStack = [], curNum = 0, curStr = "";
      function snap(cur, cap) { var boxes = strStack.map(function (ps, i) { return numStack[i] + "×〈" + (ps || "ε") + "〉"; }); return fr(inputRow(s.split(""), cur) + stackCol(boxes) + `<text x="${W / 2}" y="${H - 44}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">cur = "${curStr}"  num = ${curNum}</text>`, cap); }
      frames.push(snap(-1, "Decode k[...] with two stacks. Build a number; on '[' push the (count, string-so-far) and reset; on ']' pop and repeat the inner string."));
      for (var i = 0; i < s.length; i++) { var c = s[i]; if (c >= "0" && c <= "9") { curNum = curNum * 10 + (+c); frames.push(snap(i, `Digit ${c} → building repeat count = ${curNum}.`)); } else if (c === "[") { numStack.push(curNum); strStack.push(curStr); frames.push(snap(i, `'[' → push (${curNum}, "${curStr}") and reset for the inner string.`)); curNum = 0; curStr = ""; } else if (c === "]") { var k = numStack.pop(), prev = strStack.pop(); curStr = prev + curStr.repeat(k); frames.push(snap(i, `']' → repeat the inner "${curStr.length ? curStr : ""}" ${k}× and prepend "${prev}".`)); } else { curStr += c; frames.push(snap(i, `Letter '${c}' → append to the current string.`)); } }
      frames.push(snap(-1, `Decoded string: <b>"${curStr}"</b>.`));
      return frames;
    }

    if (mode === "asteroids") {
      var arr = cfg.data, stack = [];
      function show(v) { return (v > 0 ? "+" : "") + v; }
      frames.push(fr(inputRow(arr.map(show), -1) + stackCol(stack.map(show)), "Asteroids move right (+) or left (−). A left-mover collides with right-movers on the stack; the smaller explodes. Same size, both die."));
      for (var i = 0; i < arr.length; i++) {
        var a = arr[i], alive = true;
        while (stack.length && a < 0 && stack[stack.length - 1] > 0) { var top = stack[stack.length - 1]; if (top < -a) { stack.pop(); continue; } else if (top === -a) { stack.pop(); alive = false; break; } else { alive = false; break; } }
        if (alive) { stack.push(a); frames.push(fr(inputRow(arr.map(show), i) + stackCol(stack.map(show), null, [stack.length - 1]), `${show(a)} survives → push.`)); }
        else frames.push(fr(inputRow(arr.map(show), i) + stackCol(stack.map(show)), `${show(a)} is destroyed (or destroys an equal) in a collision.`));
      }
      frames.push(fr(inputRow(arr.map(show), -1) + stackCol(stack.map(show)), `Survivors: [${stack.map(show).join(", ")}].`));
      return frames;
    }

    if (mode === "remove-k-digits") {
      var num = cfg.num, k = cfg.k, stack = [], removed = 0;
      frames.push(fr(inputRow(num.split(""), -1) + stackCol(stack), `Remove ${k} digits for the smallest number. Keep a non-decreasing stack: a digit smaller than the top means the top should go (it's a costly high digit early).`));
      for (var i = 0; i < num.length; i++) { var d = num[i]; while (stack.length && removed < k && stack[stack.length - 1] > d) { stack.pop(); removed++; frames.push(fr(inputRow(num.split(""), i) + stackCol(stack), `'${d}' &lt; top → pop the bigger digit. Removed ${removed}/${k}.`)); } stack.push(d); frames.push(fr(inputRow(num.split(""), i) + stackCol(stack, null, [stack.length - 1]), `Push '${d}'.`)); }
      while (removed < k) { stack.pop(); removed++; }
      var res = stack.join("").replace(/^0+/, "") || "0";
      frames.push(fr(inputRow(num.split(""), -1) + stackCol(stack), `Drop any leftover removals from the end, strip leading zeros → <b>${res}</b>.`));
      return frames;
    }

    if (mode === "simplify-path") {
      var parts = cfg.path.split("/"), stack = [], toks = cfg.path.split("/").filter(function (p) { return p.length; });
      frames.push(fr(inputRow(toks.length ? toks : ["/"], -1) + stackCol(stack), "Canonicalise a Unix path with a stack of directory names. '' and '.' are no-ops; '..' pops; anything else is pushed."));
      var ti = -1;
      for (var i = 0; i < parts.length; i++) { var p = parts[i]; if (p === "" || p === ".") continue; ti++; if (p === "..") { if (stack.length) stack.pop(); frames.push(fr(inputRow(toks, ti) + stackCol(stack), `'..' → pop one directory (go up).`)); } else { stack.push(p); frames.push(fr(inputRow(toks, ti) + stackCol(stack, null, [stack.length - 1]), `'${p}' → push the directory.`)); } }
      frames.push(fr(inputRow(toks, -1) + stackCol(stack), `Canonical path: <b>/${stack.join("/")}</b>.`));
      return frames;
    }

    if (mode === "calculator") {
      var str = cfg.s.replace(/\s/g, ""), stack = [], num = 0, opc = "+", toks = [];
      for (var c2 = 0; c2 < str.length; c2++) toks.push(str[c2]);
      frames.push(fr(inputRow(toks, -1) + stackCol(stack), "Evaluate +−×÷ without parentheses using a stack. Apply × and ÷ immediately to the top; push +/− values (− as a negative). Sum the stack at the end."));
      for (var i = 0; i <= str.length; i++) {
        var ch = str[i];
        if (ch >= "0" && ch <= "9") { num = num * 10 + (+ch); }
        if ((ch < "0" || ch > "9") || i === str.length) {
          if (opc === "+") stack.push(num);
          else if (opc === "-") stack.push(-num);
          else if (opc === "*") stack.push(stack.pop() * num);
          else stack.push(Math.trunc(stack.pop() / num));
          frames.push(fr(inputRow(toks, i < str.length ? i : -1) + stackCol(stack, null, [stack.length - 1]), `Apply '${opc}' with ${num}: ${opc === "+" || opc === "-" ? "push " + (opc === "-" ? -num : num) : "combine with the top → " + stack[stack.length - 1]}.`));
          opc = ch; num = 0;
        }
      }
      frames.push(fr(inputRow(toks, -1) + stackCol(stack), `Sum the stack → <b>${stack.reduce(function (a, b) { return a + b; }, 0)}</b>.`));
      return frames;
    }

    if (mode === "car-fleet") {
      var target = cfg.target, pos = cfg.positions, sp = cfg.speeds;
      var cars = pos.map(function (p, i) { return { p: p, t: Math.round((target - p) / sp[i] * 10) / 10 }; }).sort(function (a, b) { return b.p - a.p; });
      var tokens = cars.map(function (c) { return c.p + "·" + c.t + "h"; }), stack = [];
      frames.push(fr(inputRow(tokens, -1) + stackCol(stack), `Cars can't pass each other; a faster car behind merges into the one ahead. Sort by position (closest to target first); a car joins the fleet ahead when its arrival time ≤ that fleet's, else it starts a new fleet.`));
      for (var i = 0; i < cars.length; i++) { var t = cars[i].t; if (stack.length && cars[i].t <= stack[stack.length - 1]) frames.push(fr(inputRow(tokens, i) + stackCol(stack.map(String)), `Car at ${cars[i].p} arrives in ${t}h ≤ the fleet ahead (${stack[stack.length - 1]}h) → it <b>joins</b> that fleet.`)); else { stack.push(t); frames.push(fr(inputRow(tokens, i) + stackCol(stack.map(String), null, [stack.length - 1]), `Car at ${cars[i].p} arrives in ${t}h → can't catch the fleet ahead, starts a <b>new fleet</b>.`)); } }
      frames.push(fr(inputRow(tokens, -1) + stackCol(stack.map(String)), `Number of fleets = <b>${stack.length}</b>.`));
      return frames;
    }

    // valid-parenthesis-string ( '*' = '(' or ')' or '' ) — greedy low/high range
    var s2 = cfg.s, toks2 = s2.split(""), lo = 0, hi = 0;
    function vp(cur, cap, bad) { var inner = inputRow(toks2, cur) + `<text x="${W / 2}" y="${H / 2 + 10}" text-anchor="middle" fill="${bad ? "var(--c-warning)" : "var(--text)"}" style="font:700 15px var(--font-sans)">possible open count: ${lo} … ${hi}</text>`; return fr(inner, cap); }
    frames.push(vp(-1, "'*' can be '(', ')', or empty. Track the <b>range</b> of possible open-bracket counts: low (treat * as ')') and high (treat * as '('). Valid if high never goes negative and low can reach 0."));
    for (var i = 0; i < s2.length; i++) { var c = s2[i]; if (c === "(") { lo++; hi++; } else if (c === ")") { lo--; hi--; } else { lo--; hi++; } if (hi < 0) { frames.push(vp(i, `'${c}': high dropped below 0 — too many ')' even using every '*' as '(' → <b>invalid</b>.`, true)); return frames; } if (lo < 0) lo = 0; frames.push(vp(i, `'${c}' → open range is now ${lo}…${hi}.`)); }
    frames.push(vp(-1, lo === 0 ? "low reached 0 → a valid assignment of '*' exists → <b>valid</b>." : "low never returned to 0 → unmatched '(' → <b>invalid</b>.", lo !== 0));
    return frames;
  }

  /* ============================================================
     RENDERER — math step-throughs (reverse, happy, plus-one, multiply)
     ============================================================ */
  function mathSteps(cfg) {
    var mode = cfg.mode, W = 600, H = 160;
    function bigText(lines) { var s = "", y = 70; lines.forEach(function (ln) { s += `<text x="${W / 2}" y="${y}" text-anchor="middle" fill="${ln.c || "var(--text)"}" style="font:${ln.w || 700} ${ln.s || 18}px var(--font-mono)">${ln.t}</text>`; y += (ln.dy || 34); }); return s; }
    function fr(inner, cap) { return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="math">${inner}</svg>`, caption: cap }; }
    var frames = [];

    if (mode === "reverse-integer") {
      var x = cfg.x, neg = x < 0, n = Math.abs(x), rev = 0;
      frames.push(fr(bigText([{ t: "x = " + x }, { t: "reversed = 0", c: "var(--c-success)", s: 16 }]), "Reverse the digits by repeatedly popping the last digit (x % 10) and pushing it onto the reversed number (rev × 10 + digit)."));
      while (n > 0) { var d = n % 10; rev = rev * 10 + d; n = Math.floor(n / 10); frames.push(fr(bigText([{ t: "remaining = " + (neg ? "-" : "") + n }, { t: "reversed = " + (neg ? "-" : "") + rev, c: "var(--accent)", s: 16 }]), `Pop digit <b>${d}</b> → reversed = reversed×10 + ${d} = ${rev}. Remaining: ${n}.`)); }
      frames.push(fr(bigText([{ t: "result = " + (neg ? -rev : rev), c: "var(--c-success)" }, { t: "(overflow past 32-bit → return 0)", c: "var(--text-faint)", s: 12 }]), `Reversed value = <b>${neg ? -rev : rev}</b>. Always check it fits in a 32-bit int, else return 0.`));
      return frames;
    }

    if (mode === "happy-number") {
      var n0 = cfg.n, seen = {}, cur = n0, H2 = 170;
      function sq(v) { var s = 0; ("" + v).split("").forEach(function (d) { s += (+d) * (+d); }); return s; }
      function chain(history, cap, status) { var s = "", x = 40; history.forEach(function (v, i) { var last = i === history.length - 1; s += rect(x, 70, 46, 32, { fill: status === "happy" && v === 1 ? "var(--c-success-bg)" : status === "cycle" && i === history.length - 1 ? "var(--c-warning-bg)" : last ? "var(--brand-soft)" : "var(--surface-2)", stroke: v === 1 && status === "happy" ? "var(--c-success)" : last ? "var(--accent)" : "var(--border)", sw: last ? 2.2 : 1.2, r: 6 }); s += `<text x="${x + 23}" y="${91}" text-anchor="middle" fill="var(--text)" style="font:700 13px var(--font-mono)">${v}</text>`; if (i < history.length - 1) s += `<text x="${x + 56}" y="${91}" text-anchor="middle" fill="var(--text-faint)" style="font:700 14px var(--font-sans)">→</text>`; x += 70; }); return { svg: `<svg viewBox="0 0 ${W} ${H2}" role="img" aria-label="happy number">${s}</svg>`, caption: cap }; }
      var hist = [cur]; seen[cur] = true;
      frames.push(chain(hist.slice(), `Replace the number by the <b>sum of squares of its digits</b>, repeatedly. Happy if it reaches 1; otherwise it loops forever (a cycle).`));
      while (cur !== 1) { var nx = sq(cur); hist.push(nx); if (nx === 1) { frames.push(chain(hist.slice(), `${cur} → ${nx}. Reached <b>1</b> → it's a <b>happy number</b>.`, "happy")); break; } if (seen[nx]) { frames.push(chain(hist.slice(), `${cur} → ${nx}, already seen → <b>cycle</b>, never happy.`, "cycle")); break; } seen[nx] = true; frames.push(chain(hist.slice(), `${cur} → sum of squared digits = <b>${nx}</b>.`)); cur = nx; }
      return frames;
    }

    if (mode === "plus-one") {
      var digits = cfg.data.slice(), n = digits.length;
      function row(arr, cur, carry) { var cw = Math.min(48, (W - 60) / arr.length), gap = 6, total = cw * arr.length + gap * (arr.length - 1), sx = (W - total) / 2, s = ""; for (var i = 0; i < arr.length; i++) { var hot = i === cur; s += rect(sx + i * (cw + gap), 50, cw, 44, { fill: hot ? "var(--brand-soft)" : "var(--surface-2)", stroke: hot ? "var(--accent)" : "var(--border)", sw: hot ? 2.2 : 1.2, r: 6 }); s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${78}" text-anchor="middle" fill="${hot ? "var(--accent)" : "var(--text)"}" style="font:700 16px var(--font-sans)">${arr[i]}</text>`; } if (carry != null) s += `<text x="${W / 2}" y="${H - 12}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">carry = ${carry}</text>`; return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="plus one">${s}</svg>`, caption: "" }; }
      frames.push((function () { var f = row(digits.slice(), -1, 1); f.caption = "Add one to the number stored as digits. Start from the last digit with carry 1; a 9 becomes 0 and carries, otherwise just add and stop."; return f; })());
      var carry = 1, i = n - 1;
      for (; i >= 0 && carry; i--) { var sum = digits[i] + carry; digits[i] = sum % 10; carry = Math.floor(sum / 10); frames.push((function (idx, cy) { var f = row(digits.slice(), idx, cy); f.caption = `Digit ${idx}: ${(digits[idx] + cy * 10) || digits[idx]} → write ${digits[idx]}, carry ${cy}.`; return f; })(i, carry)); }
      if (carry) digits.unshift(1);
      frames.push((function () { var f = row(digits.slice(), carry ? 0 : -1, 0); f.caption = `Result: <b>[${digits.join(", ")}]</b>${carry ? " (a new leading 1 was prepended)" : ""}.`; return f; })());
      return frames;
    }

    if (mode === "pow") {
      var x = cfg.x, nexp = cfg.n, e = Math.abs(nexp), bits = e.toString(2);
      frames.push(fr(bigText([{ t: `${x}^${nexp}` }, { t: "exponent in binary: " + bits, c: "var(--text-faint)", s: 13 }]), "Fast power: square the base while halving the exponent, multiplying it into the result whenever the current low bit is 1. O(log n) multiplications."));
      var ee = e, base = x, res2 = 1, guardP = 0;
      while (ee > 0 && guardP++ < 40) { var setb = ee & 1; if (setb) res2 *= base; frames.push(fr(bigText([{ t: `result = ${res2}`, c: "var(--accent)" }, { t: `base = ${base}, exp = ${ee}`, s: 14, c: "var(--text-muted)" }]), `Low bit ${setb ? "1 → result ×= base" : "0 → skip"}; then square base (${base} → ${base * base}) and shift exp right.`)); base *= base; ee >>= 1; }
      var fin = nexp < 0 ? 1 / res2 : res2;
      frames.push(fr(bigText([{ t: `${x}^${nexp} = ${fin}`, c: "var(--c-success)" }]), `Result = <b>${fin}</b>${nexp < 0 ? " (negative exponent → take the reciprocal)" : ""}.`));
      return frames;
    }

    if (mode === "range-sum") {
      var data = cfg.data, n = data.length, ql = cfg.query[0], qr = cfg.query[1], H2 = 195;
      var prefix = [0]; for (var i = 0; i < n; i++) prefix.push(prefix[i] + data[i]);
      function rowRS(arr, y, hi, label, off) { var cw = Math.min(46, (W - 70) / arr.length), gap = 6, total = cw * arr.length + gap * (arr.length - 1), sx = (W - total) / 2, s = `<text x="20" y="${y + 24}" fill="var(--text-faint)" style="font:600 10px var(--font-mono)">${label}</text>`; for (var i = 0; i < arr.length; i++) { var h = hi && hi.indexOf(i) >= 0; s += rect(sx + i * (cw + gap), y, cw, 32, { fill: h ? "var(--brand-soft)" : "var(--surface-2)", stroke: h ? "var(--accent)" : "var(--border)", sw: h ? 2.2 : 1.2, r: 5 }); s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${y + 21}" text-anchor="middle" fill="${h ? "var(--accent)" : "var(--text)"}" style="font:700 13px var(--font-mono)">${arr[i]}</text>`; if (off) s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${y - 6}" text-anchor="middle" fill="var(--text-faint)" style="font:500 9px var(--font-mono)">${i}</text>`; } return s; }
      function frameRS(prefHi, dataHi, cap) { return { svg: `<svg viewBox="0 0 ${W} ${H2}" role="img" aria-label="prefix sum">${rowRS(data, 40, dataHi, "nums", false)}${rowRS(prefix, 110, prefHi, "prefix", true)}</svg>`, caption: cap }; }
      frames.push(frameRS(null, null, "Precompute <b>prefix sums</b> (prefix[k] = sum of the first k values). Then any range sum is a single subtraction — each query answered in O(1)."));
      for (var k = 1; k <= n; k++) frames.push(frameRS([k], [k - 1], `prefix[${k}] = prefix[${k - 1}] + nums[${k - 1}] = ${prefix[k]}.`));
      frames.push(frameRS([qr + 1, ql], null, `sumRange(${ql}, ${qr}) = prefix[${qr + 1}] − prefix[${ql}] = ${prefix[qr + 1]} − ${prefix[ql]} = <b>${prefix[qr + 1] - prefix[ql]}</b>.`));
      return frames;
    }

    if (mode === "add-strings") {
      var sa = cfg.a, sb = cfg.b, base = cfg.base || 10, Ha = 175, i = sa.length - 1, j = sb.length - 1, carry = 0, res = [];
      function rowA(arr, y, cur, label) { var n = arr.length, cw = Math.min(40, (W - 90) / Math.max(n, 1)), gap = 6, total = cw * n + gap * (n - 1), sx = (W - total) / 2, s = `<text x="20" y="${y + 21}" fill="var(--text-faint)" style="font:600 10px var(--font-mono)">${label}</text>`; for (var k = 0; k < n; k++) { var h = k === cur; s += rect(sx + k * (cw + gap), y, cw, 30, { fill: h ? "var(--brand-soft)" : "var(--surface-2)", stroke: h ? "var(--accent)" : "var(--border)", sw: h ? 2.2 : 1.2, r: 5 }); s += `<text x="${sx + k * (cw + gap) + cw / 2}" y="${y + 20}" text-anchor="middle" fill="${h ? "var(--accent)" : "var(--text)"}" style="font:700 13px var(--font-mono)">${arr[k]}</text>`; } return s; }
      function frameA(cap, cy) { var inner = rowA(sa.split(""), 28, i, "a") + rowA(sb.split(""), 68, j, "b") + rowA(res.slice().reverse(), 118, res.length ? 0 : -1, "sum"); inner += `<text x="${W - 20}" y="20" text-anchor="end" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">carry = ${cy}</text>`; return { svg: `<svg viewBox="0 0 ${W} ${Ha}" role="img" aria-label="add strings">${inner}</svg>`, caption: cap }; }
      frames.push(frameA(base === 2 ? `Add two binary strings digit by digit from the right, carrying whenever the column total reaches 2.` : `Add two number strings without converting to an int: sum digits right-to-left, carrying whenever the total reaches ${base}.`, 0));
      var guardA = 0;
      while ((i >= 0 || j >= 0 || carry) && guardA++ < 60) { var da = i >= 0 ? (+sa[i]) : 0, db = j >= 0 ? (+sb[j]) : 0, sum = da + db + carry; res.push(sum % base); carry = Math.floor(sum / base); frames.push(frameA(`${da} + ${db} + carry = ${sum} → write ${sum % base}, carry ${carry}.`, carry)); i--; j--; }
      frames.push(frameA(`Result: "<b>${res.slice().reverse().join("")}</b>".`, 0));
      return frames;
    }

    if (mode === "excel") {
      var s = cfg.s, He = 160, result = 0;
      function frameE(i, cap) { var cw = 50, gap = 8, sx = (W - (s.length * (cw + gap) - gap)) / 2, str = ""; for (var k = 0; k < s.length; k++) { var h = k === i; str += rect(sx + k * (cw + gap), 50, cw, 44, { fill: h ? "var(--brand-soft)" : k < i ? "var(--c-success-bg)" : "var(--surface-2)", stroke: h ? "var(--accent)" : k < i ? "var(--c-success)" : "var(--border)", sw: h ? 2.2 : 1.2, r: 6 }); str += `<text x="${sx + k * (cw + gap) + cw / 2}" y="${78}" text-anchor="middle" fill="${h ? "var(--accent)" : "var(--text)"}" style="font:700 18px var(--font-sans)">${s[k]}</text>`; str += `<text x="${sx + k * (cw + gap) + cw / 2}" y="${40}" text-anchor="middle" fill="var(--text-faint)" style="font:500 10px var(--font-mono)">${s.charCodeAt(k) - 64}</text>`; } str += `<text x="${W / 2}" y="${He - 12}" text-anchor="middle" fill="var(--c-success)" style="font:700 14px var(--font-sans)">result = ${result}</text>`; return { svg: `<svg viewBox="0 0 ${W} ${He}" role="img" aria-label="excel column">${str}</svg>`, caption: cap }; }
      frames.push(frameE(-1, `Excel columns are base-26 with digits A=1 … Z=26 (no zero). Read left→right: result = result×26 + value(letter).`));
      for (var k = 0; k < s.length; k++) { var v = s.charCodeAt(k) - 64; result = result * 26 + v; frames.push(frameE(k, `'${s[k]}' = ${v} → result = result×26 + ${v} = ${result}.`)); }
      frames.push(frameE(-1, `Column number = <b>${result}</b>.`));
      return frames;
    }

    if (mode === "sieve") {
      var n = cfg.n, isComp = new Array(n).fill(false), cols = Math.min(10, n), cell = Math.min(44, (W - 40) / cols), rows = Math.ceil(n / cols), sy = 24, Hsv = sy + rows * (cell + 4) + 30, sx = (W - cols * (cell + 4)) / 2;
      function drawS(active, cap, panel) { var s = ""; for (var v = 0; v < n; v++) { var r = Math.floor(v / cols), c = v % cols, x = sx + c * (cell + 4), y = sy + r * (cell + 4); var st; if (v < 2) st = { f: "var(--surface-2)", s: "var(--border-soft)", l: "var(--text-faint)" }; else if (isComp[v]) st = { f: "var(--surface-2)", s: "var(--border)", l: "var(--text-faint)" }; else st = { f: "var(--c-success-bg)", s: "var(--c-success)", l: "var(--c-success)" }; if (v === active) st = { f: "var(--brand-soft)", s: "var(--accent)", l: "var(--accent)" }; s += rect(x, y, cell, cell, { fill: st.f, stroke: st.s, sw: v === active ? 2.4 : 1.2, r: 5 }); s += `<text x="${x + cell / 2}" y="${y + cell / 2 + 5}" text-anchor="middle" fill="${st.l}" style="font:700 12px var(--font-mono)">${v}</text>`; } return { svg: `<svg viewBox="0 0 ${W} ${Hsv}" role="img" aria-label="sieve of eratosthenes">${s}<text x="${W / 2}" y="${Hsv - 10}" text-anchor="middle" fill="var(--text-muted)" style="font:600 11px var(--font-mono)">${panel}</text></svg>`, caption: cap }; }
      var primes = [];
      frames.push(drawS(-1, `Count primes below ${n} with the Sieve of Eratosthenes: each prime crosses out its own multiples; whatever survives is prime.`, "green = prime"));
      for (var p = 2; p * p < n; p++) { if (isComp[p]) continue; for (var mu = p * p; mu < n; mu += p) isComp[mu] = true; frames.push(drawS(p, `${p} is prime → cross out ${p}², ${p}²+${p}, … (its multiples).`, "sieving from " + p)); }
      for (var v = 2; v < n; v++) if (!isComp[v]) primes.push(v);
      frames.push(drawS(-1, `Primes below ${n}: ${primes.join(", ")} → count = <b>${primes.length}</b>.`, "count = " + primes.length));
      return frames;
    }

    // multiply-strings
    var a = cfg.a, b = cfg.b, m = a.length, p = b.length, res = new Array(m + p).fill(0), H3 = 175;
    function grid(cur, cap) {
      var cw = 34, sx = (W - (m + p) * cw) / 2, s = `<text x="${W / 2}" y="30" text-anchor="middle" fill="var(--text-faint)" style="font:600 12px var(--font-mono)">${a} × ${b}</text>`;
      for (var i = 0; i < res.length; i++) { var hot = cur && cur.indexOf(i) >= 0; s += rect(sx + i * cw, 60, cw - 3, 36, { fill: hot ? "var(--brand-soft)" : "var(--surface-2)", stroke: hot ? "var(--accent)" : "var(--border)", sw: hot ? 2.2 : 1.2, r: 5 }); s += `<text x="${sx + i * cw + (cw - 3) / 2}" y="${83}" text-anchor="middle" fill="${hot ? "var(--accent)" : "var(--text)"}" style="font:700 14px var(--font-mono)">${res[i]}</text>`; }
      return { svg: `<svg viewBox="0 0 ${W} ${H3}" role="img" aria-label="multiply strings">${s}</svg>`, caption: cap };
    }
    frames.push(grid(null, `Grade-school multiplication into a length-${m + p} array. Digit i of a and j of b add into positions i+j (carry) and i+j+1 (ones).`));
    for (var i = m - 1; i >= 0; i--) for (var j = p - 1; j >= 0; j--) {
      var mul = (a.charCodeAt(i) - 48) * (b.charCodeAt(j) - 48);
      var low = i + j + 1, high = i + j;
      var sum = mul + res[low]; res[low] = sum % 10; res[high] += Math.floor(sum / 10);
      frames.push(grid([low, high], `${a[i]} × ${b[j]} = ${mul} → add at positions ${high},${low} with carry. Running result: ${res.join("")}.`));
    }
    var out = res.join("").replace(/^0+/, "") || "0";
    frames.push(grid(null, `Strip leading zeros → <b>${out}</b>.`));
    return frames;
  }

  /* ============================================================
     RENDERER — two trees side by side (same, symmetric, subtree)
     ============================================================ */
  function twoTree(cfg) {
    var mode = cfg.mode, W = 600, levelH = 50, top = 34;
    function drawSub(root, x0, w, stateOf) { if (!root) return `<text x="${x0 + w / 2}" y="${top + 24}" text-anchor="middle" fill="var(--text-faint)" style="font:600 13px var(--font-sans)">∅</text>`; return `<g transform="translate(${x0},0)">${drawTree(root, w, levelH, top, stateOf)}</g>`; }
    var frames = [];

    if (mode === "subtree") {
      var big = treeFromHeap(cfg.a), sub = treeFromHeap(cfg.b);
      var H = top + Math.max(layoutTree(big).maxD, layoutTree(sub).maxD) * levelH + 34;
      var stBig = new Map();
      function eq(x, y) { if (!x && !y) return true; if (!x || !y || x.val !== y.val) return false; return eq(x.left, y.left) && eq(x.right, y.right); }
      function mark(n, st) { if (!n) return; stBig.set(n, st); mark(n.left, st); mark(n.right, st); }
      function push(cap) { var inner = `<text x="${W / 4}" y="20" text-anchor="middle" fill="var(--text-faint)" style="font:600 11px var(--font-sans)">tree</text><text x="${3 * W / 4}" y="20" text-anchor="middle" fill="var(--text-faint)" style="font:600 11px var(--font-sans)">subtree</text>` + line(W / 2, 28, W / 2, H - 20, { stroke: "var(--border-soft)", sw: 1, dash: "4 4" }) + drawSub(big, 0, W / 2 - 12, function (n) { return stBig.get(n) || "default"; }) + drawSub(sub, W / 2 + 12, W / 2 - 12, function () { return "active"; }); frames.push({ svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="subtree check">${inner}</svg>`, caption: cap }); }
      push(`Does the right tree appear as a <b>subtree</b> of the left? Try matching it at each node whose value equals the subtree's root (${sub.val}).`);
      var matched = false;
      (function walk(n) { if (!n || matched) return; stBig.set(n, "active"); if (n.val === sub.val) { var ok = eq(n, sub); if (ok) { mark(n, "visited"); matched = true; push(`At <b>${n.val}</b>: full structure matches → <b>found the subtree</b>.`); return; } push(`At <b>${n.val}</b>: root matches but the rest differs — keep searching.`); } stBig.set(n, "dim"); walk(n.left); walk(n.right); })(big);
      if (!matched) push("No node anchors a full match → it's not a subtree.");
      return frames;
    }

    if (mode === "symmetric") {
      var T = treeFromHeap(cfg.data), st = new Map();
      var H2 = top + layoutTree(T).maxD * levelH + 30, sym = true;
      function push(cap) { frames.push({ svg: `<svg viewBox="0 0 ${W} ${H2}" role="img" aria-label="symmetric tree">${drawSub(T, 0, W, function (n) { return st.get(n) || "default"; })}</svg>`, caption: cap }); }
      push("Is the tree a mirror of itself? Compare the left subtree against the right subtree <b>mirrored</b>: left.left vs right.right, left.right vs right.left.");
      (function mir(a, b) { if (!sym) return; if (!a && !b) return; if (a) st.set(a, "active"); if (b) st.set(b, "active"); if (!a || !b || a.val !== b.val) { sym = false; if (a) st.set(a, "warn"); if (b) st.set(b, "warn"); push(`Mismatch (${a ? a.val : "∅"} vs ${b ? b.val : "∅"}) → <b>not symmetric</b>.`); return; } push(`Mirror pair <b>${a.val}</b> = <b>${b.val}</b> ✓.`); st.set(a, "visited"); st.set(b, "visited"); mir(a.left, b.right); mir(a.right, b.left); })(T.left, T.right);
      if (sym) push("Every mirror pair matched → <b>symmetric</b>.");
      return frames;
    }

    // same-tree
    var A = treeFromHeap(cfg.a), B = treeFromHeap(cfg.b);
    var H3 = top + Math.max(layoutTree(A).maxD, layoutTree(B).maxD) * levelH + 30, same = true;
    var sa = new Map(), sb = new Map();
    function push3(cap) { var inner = `<text x="${W / 4}" y="20" text-anchor="middle" fill="var(--text-faint)" style="font:600 11px var(--font-sans)">tree A</text><text x="${3 * W / 4}" y="20" text-anchor="middle" fill="var(--text-faint)" style="font:600 11px var(--font-sans)">tree B</text>` + line(W / 2, 28, W / 2, H3 - 16, { stroke: "var(--border-soft)", sw: 1, dash: "4 4" }) + drawSub(A, 0, W / 2 - 12, function (n) { return sa.get(n) || "default"; }) + drawSub(B, W / 2 + 12, W / 2 - 12, function (n) { return sb.get(n) || "default"; }); frames.push({ svg: `<svg viewBox="0 0 ${W} ${H3}" role="img" aria-label="same tree">${inner}</svg>`, caption: cap }); }
    push3("Are two trees identical? Walk both in lockstep (preorder), comparing structure and values at every step.");
    (function cmp(x, y) { if (!same) return; if (!x && !y) return; if (x) sa.set(x, "active"); if (y) sb.set(y, "active"); if (!x || !y) { same = false; if (x) sa.set(x, "warn"); if (y) sb.set(y, "warn"); push3("One side has a node where the other is ∅ → <b>different</b>."); return; } if (x.val !== y.val) { same = false; sa.set(x, "warn"); sb.set(y, "warn"); push3(`${x.val} ≠ ${y.val} → trees differ here.`); return; } push3(`Compare <b>${x.val}</b> = <b>${y.val}</b> ✓.`); sa.set(x, "visited"); sb.set(y, "visited"); cmp(x.left, y.left); cmp(x.right, y.right); })(A, B);
    if (same) push3("Every node matched → the trees are <b>identical</b>.");
    return frames;
  }

  /* ============================================================
     RENDERER — 1-D DP over a string (word-break, decode-ways)
     ============================================================ */
  function dpString(cfg) {
    var mode = cfg.mode, s = cfg.s, n = s.length, W = 600, H = 190;
    var cw = Math.min(46, (W - 60) / n), gap = 6, total = cw * n + gap * (n - 1), sx = (W - total) / 2;
    var dcw = Math.min(40, (W - 60) / (n + 1)), dgap = 6, dtotal = dcw * (n + 1) + dgap * n, dsx = (W - dtotal) / 2;
    function chx(i) { return sx + i * (cw + gap); }
    function dx(i) { return dsx + i * (dcw + dgap); }
    function draw(dp, cur, win, cap) {
      var s2 = `<text x="20" y="50" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">s</text>`;
      for (var i = 0; i < n; i++) { var inWin = win && i >= win[0] && i < win[1]; s2 += rect(chx(i), 36, cw, 34, { fill: inWin ? "var(--c-info-bg)" : "var(--surface-2)", stroke: inWin ? "var(--accent)" : "var(--border)", sw: inWin ? 2 : 1.2, r: 5 }); s2 += `<text x="${chx(i) + cw / 2}" y="${58}" text-anchor="middle" fill="var(--text)" style="font:700 14px var(--font-mono)">${s[i]}</text>`; }
      s2 += `<text x="20" y="120" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">dp</text>`;
      for (var k = 0; k <= n; k++) { var isCur = k === cur, isCon = win && (k === win[0] || k === win[1]); s2 += rect(dx(k), 104, dcw, 32, { fill: isCur ? "var(--brand-soft)" : isCon ? "var(--c-info-bg)" : dp[k] != null ? "var(--c-success-bg)" : "var(--surface-2)", stroke: isCur ? "var(--accent)" : isCon ? "var(--accent)" : dp[k] != null ? "var(--c-success)" : "var(--border)", sw: isCur ? 2.2 : 1.2, r: 5 }); s2 += `<text x="${dx(k) + dcw / 2}" y="${124}" text-anchor="middle" fill="var(--text)" style="font:700 13px var(--font-sans)">${dp[k] == null ? "·" : (mode === "word-break" ? (dp[k] ? "T" : "F") : dp[k])}</text>`; s2 += `<text x="${dx(k) + dcw / 2}" y="${152}" text-anchor="middle" fill="var(--text-faint)" style="font:500 9px var(--font-mono)">${k}</text>`; }
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="dp over string">${s2}</svg>`, caption: cap };
    }
    var dp = new Array(n + 1).fill(null), frames = [];
    if (mode === "word-break") {
      var dict = {}; cfg.dict.forEach(function (w) { dict[w] = true; });
      dp[0] = true;
      frames.push(draw(dp.slice(), 0, null, `Can "${s}" split into dictionary words {${cfg.dict.join(", ")}}? dp[i] = is s[0:i] segmentable. dp[0] = true (empty prefix).`));
      for (var i = 1; i <= n; i++) { dp[i] = false; var hitJ = -1; for (var j = i - 1; j >= 0; j--) { if (dp[j] && dict[s.slice(j, i)]) { dp[i] = true; hitJ = j; break; } } frames.push(draw(dp.slice(), i, hitJ >= 0 ? [hitJ, i] : null, hitJ >= 0 ? `dp[${i}]: dp[${hitJ}] is true and "${s.slice(hitJ, i)}" is a word → dp[${i}] = <b>T</b>.` : `dp[${i}]: no split point works → <b>F</b>.`)); }
      frames.push(draw(dp.slice(), n, null, dp[n] ? `dp[${n}] = T → "${s}" <b>can</b> be segmented.` : `dp[${n}] = F → it cannot.`));
      return frames;
    }
    // decode-ways
    dp[0] = 1;
    frames.push(draw(dp.slice(), 0, null, `Count decodings of "${s}" (1→A … 26→Z). dp[i] = ways to decode the first i digits. dp[0] = 1 (one way to decode nothing).`));
    for (var i = 1; i <= n; i++) {
      dp[i] = 0;
      var one = s[i - 1] !== "0";
      if (one) dp[i] += dp[i - 1];
      var two = i >= 2 && (s[i - 2] === "1" || (s[i - 2] === "2" && s[i - 1] <= "6"));
      if (two) dp[i] += dp[i - 2];
      frames.push(draw(dp.slice(), i, i >= 2 ? [i - 2, i] : [i - 1, i], `dp[${i}]: ${one ? `'${s[i - 1]}' alone (+dp[${i - 1}]=${dp[i - 1]})` : `'0' can't stand alone`}${two ? ` and "${s.slice(i - 2, i)}" is 10–26 (+dp[${i - 2}]=${dp[i - 2]})` : ""} → <b>${dp[i]}</b>.`));
    }
    frames.push(draw(dp.slice(), n, null, `Total decodings = <b>${dp[n]}</b>.`));
    return frames;
  }

  /* ============================================================
     RENDERER — expand around center (palindromic substrings / longest)
     ============================================================ */
  function expandCenter(cfg) {
    var mode = cfg.mode, s = cfg.s, n = s.length, W = 600, H = 160;
    var cw = Math.min(48, (W - 60) / n), gap = 6, total = cw * n + gap * (n - 1), sx = (W - total) / 2;
    function cx(i) { return sx + i * (cw + gap); }
    function frame(l, r, style, cap, panel) {
      var sOut = "";
      for (var i = 0; i < n; i++) { var st = style(i) || {}; sOut += rect(cx(i), 46, cw, 44, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: st.sw || 1.2, r: 6 }); sOut += `<text x="${cx(i) + cw / 2}" y="${74}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 16px var(--font-mono)">${s[i]}</text>`; }
      if (panel) sOut += `<text x="${W / 2}" y="${H - 12}" text-anchor="middle" fill="var(--text-muted)" style="font:600 12px var(--font-mono)">${panel}</text>`;
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="expand around center">${sOut}</svg>`, caption: cap };
    }
    var frames = [], count = 0, best = [0, 0];
    var intro = mode === "count" ? "Every palindrome has a center. Try all 2n−1 centers (each char, and each gap between chars); expand outward while the two sides match, counting each palindrome." : "Every palindrome has a center. Expand from all 2n−1 centers; the widest matching expansion is the longest palindromic substring.";
    frames.push(frame(0, -1, function () { return {}; }, intro, mode === "count" ? "count = 0" : 'longest = ""'));
    for (var c = 0; c < 2 * n - 1; c++) {
      var l = Math.floor(c / 2), r = l + (c % 2);
      while (l >= 0 && r < n && s[l] === s[r]) {
        if (mode === "count") count++; else if (r - l > best[1] - best[0]) best = [l, r];
        var cl = l, cr = r;
        frames.push(frame(cl, cr, function (i) { if (i === cl || i === cr) return { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: 2.4, lab: "var(--accent)" }; if (i > cl && i < cr) return { fill: "var(--c-info-bg)", stroke: "var(--accent)" }; return {}; }, `Center ${c % 2 ? "between " + l + "," + r : "at " + l}: "${s.slice(cl, cr + 1)}" is a palindrome.`, mode === "count" ? `count = ${count}` : `longest = "${s.slice(best[0], best[1] + 1)}"`));
        l--; r++;
      }
    }
    frames.push(frame(0, -1, function (i) { return mode === "longest" && i >= best[0] && i <= best[1] ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)" } : {}; }, mode === "count" ? `Total palindromic substrings = <b>${count}</b>.` : `Longest palindromic substring = <b>"${s.slice(best[0], best[1] + 1)}"</b>.`, mode === "count" ? `count = ${count}` : `longest = "${s.slice(best[0], best[1] + 1)}"`));
    return frames;
  }

  /* ============================================================
     RENDERER — tree operations (delete-BST, tree-DP, connect-next,
     build-from-sorted, build-from-traversals, serialize, BST iterator)
     ============================================================ */
  function treeOps(cfg) {
    var mode = cfg.mode, W = 600, levelH = 54, top = 38;
    function geom(root) { var L = layoutTree(root), pad = 26, span = (W - 2 * pad) / Math.max(L.count, 1); return { X: function (n) { return pad + (n._ox + 0.5) * span; }, Y: function (n) { return top + n._d * levelH; }, all: L.all, maxD: L.maxD }; }
    function frame(root, stateOf, overlay, cap, hpad) { var L = layoutTree(root); var h = top + L.maxD * levelH + (hpad || 42); return { svg: `<svg viewBox="0 0 ${W} ${h}" role="img" aria-label="tree">${drawTree(root, W, levelH, top, stateOf)}${overlay || ""}</svg>`, caption: cap }; }
    var frames = [];

    if (mode === "delete-bst") {
      var root = treeFromHeap(cfg.data), key = cfg.key, st = new Map();
      function so(n) { return st.get(n) || "default"; }
      frames.push(frame(root, so, null, `Delete <b>${key}</b> from the BST: walk down in BST order to find it, then patch the tree.`));
      var cur = root, par = null;
      while (cur && cur.val !== key) { st.set(cur, "visited"); par = cur; cur = key < cur.val ? cur.left : cur.right; frames.push(frame(root, so, null, `${key} ${key < par.val ? "&lt;" : "&gt;"} ${par.val} → go ${key < par.val ? "left" : "right"}.`)); }
      if (!cur) { frames.push(frame(root, so, null, `${key} isn't in the tree.`)); return frames; }
      st.set(cur, "active");
      if (!cur.left || !cur.right) { var child = cur.left || cur.right; frames.push(frame(root, so, null, `${key} has ${child ? "one child" : "no children"} → splice it out${child ? ", linking its child to the parent" : ""}.`)); if (!par) root = child; else if (par.left === cur) par.left = child; else par.right = child; st.delete(cur); frames.push(frame(root, so, null, `Removed — still a valid BST.`)); }
      else { var sp = cur, succ = cur.right; while (succ.left) { sp = succ; succ = succ.left; } st.set(succ, "warn"); frames.push(frame(root, so, null, `${key} has two children → replace it with its in-order successor <b>${succ.val}</b> (smallest value in the right subtree).`)); cur.val = succ.val; st.delete(succ); st.set(cur, "visited"); if (sp.left === succ) sp.left = succ.right; else sp.right = succ.right; frames.push(frame(root, so, null, `Copy ${cur.val} up and delete the duplicate successor node.`)); }
      return frames;
    }

    if (mode === "rob-tree") {
      var root = treeFromHeap(cfg.data), st = new Map(), info = new Map();
      function so(n) { return st.get(n) || "default"; }
      function ov() { var g = geom(root), s = ""; g.all.forEach(function (n) { var inf = info.get(n); if (inf) s += `<text x="${g.X(n)}" y="${g.Y(n) + 30}" text-anchor="middle" fill="var(--text-faint)" style="font:600 9px var(--font-mono)">[${inf[0]},${inf[1]}]</text>`; }); return s; }
      frames.push(frame(root, so, ov(), "Rob a binary tree, no two directly-connected nodes. Post-order returns <b>[rob, skip]</b> per node: rob = value + children's skip; skip = sum of children's better option.", 50));
      (function dfs(n) { if (!n) return [0, 0]; var l = dfs(n.left), r = dfs(n.right); st.set(n, "active"); var rob = n.val + l[1] + r[1], skip = Math.max(l[0], l[1]) + Math.max(r[0], r[1]); info.set(n, [rob, skip]); frames.push(frame(root, so, ov(), `At <b>${n.val}</b>: rob = ${n.val}+${l[1]}+${r[1]} = ${rob}; skip = ${Math.max(l[0], l[1])}+${Math.max(r[0], r[1])} = ${skip}.`, 50)); st.set(n, "visited"); return [rob, skip]; })(root);
      var res = info.get(root); frames.push(frame(root, so, ov(), `Answer = max(rob, skip) at the root = <b>${Math.max(res[0], res[1])}</b>.`, 50));
      return frames;
    }

    if (mode === "connect-next") {
      var root = treeFromHeap(cfg.data), st = new Map();
      function so(n) { return st.get(n) || "default"; }
      function arrows(upto) { var g = geom(root), byL = {}; g.all.forEach(function (n) { (byL[n._d] = byL[n._d] || []).push(n); }); var s = ""; Object.keys(byL).forEach(function (d) { if (+d > upto) return; var row = byL[d].slice().sort(function (a, b) { return a._ox - b._ox; }); for (var i = 0; i < row.length - 1; i++) { var a = row[i], b = row[i + 1]; s += line(g.X(a) + 16, g.Y(a), g.X(b) - 18, g.Y(b), { stroke: "var(--c-success)", sw: 1.6, dash: "4 3" }) + `<path d="M${g.X(b) - 18} ${g.Y(b)} l-6 -3 l0 6 z" fill="var(--c-success)"/>`; } }); return s; }
      var g0 = geom(root), levels = []; g0.all.forEach(function (n) { if (levels.indexOf(n._d) < 0) levels.push(n._d); }); levels.sort(function (a, b) { return a - b; });
      frames.push(frame(root, so, "", "Populate each node's <b>next</b> pointer to its right neighbour on the same level (a BFS). Watch the horizontal links appear level by level.", 50));
      levels.forEach(function (d) { frames.push(frame(root, so, arrows(d), `Level ${d}: thread each node to the next one on its right.`, 50)); });
      frames.push(frame(root, so, arrows(99), "Every level is now linked left-to-right.", 50));
      return frames;
    }

    if (mode === "sorted-to-bst") {
      top = 74; var arr = cfg.data, order = [];
      function build(lo, hi) { if (lo > hi) return null; var mid = (lo + hi) >> 1, node = { val: arr[mid], left: null, right: null, _lo: lo, _hi: hi }; order.push(node); node.left = build(lo, mid - 1); node.right = build(mid + 1, hi); return node; }
      var root = build(0, arr.length - 1), revealed = new Set(), lastNode = null;
      function so(n) { if (!revealed.has(n)) return "dim"; return lastNode === n ? "active" : "visited"; }
      function arrRow(node) { var cw = Math.min(46, (W - 60) / arr.length), gap = 6, total = cw * arr.length + gap * (arr.length - 1), sx = (W - total) / 2, s = ""; for (var i = 0; i < arr.length; i++) { var hot = node && i >= node._lo && i <= node._hi, ismid = node && i === ((node._lo + node._hi) >> 1); s += rect(sx + i * (cw + gap), 8, cw, 28, { fill: ismid ? "var(--brand-soft)" : hot ? "var(--c-info-bg)" : "var(--surface-2)", stroke: ismid ? "var(--accent)" : hot ? "var(--accent)" : "var(--border)", sw: ismid ? 2.2 : 1.2, r: 5 }); s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${27}" text-anchor="middle" fill="${ismid ? "var(--accent)" : "var(--text)"}" style="font:700 13px var(--font-mono)">${arr[i]}</text>`; } return s; }
      frames.push(frame(root, so, arrRow(null), "Build a height-balanced BST from a sorted array: the <b>middle</b> element is the root, then recurse on the left and right halves.", 46));
      order.forEach(function (n) { revealed.add(n); lastNode = n; frames.push(frame(root, so, arrRow(n), `Range [${n._lo}..${n._hi}] → middle ${arr[(n._lo + n._hi) >> 1]} becomes a node.`, 46)); });
      lastNode = null; frames.push(frame(root, so, arrRow(null), "Balanced BST built in O(n), with minimal height.", 46));
      return frames;
    }

    if (mode === "construct") {
      top = 84; var pre = cfg.preorder, ino = cfg.inorder, order = [], preIdx = 0;
      function build(il, ir) { if (il > ir) return null; var v = pre[preIdx++], k = ino.indexOf(v), node = { val: v, left: null, right: null, _il: il, _ir: ir, _k: k }; order.push(node); node.left = build(il, k - 1); node.right = build(k + 1, ir); return node; }
      var root = build(0, ino.length - 1), revealed = new Set(), lastNode = null;
      function so(n) { if (!revealed.has(n)) return "dim"; return lastNode === n ? "active" : "visited"; }
      function arrays(node) { var n = pre.length, cw = Math.min(40, (W - 80) / n), gap = 5, total = cw * n + gap * (n - 1), sx = (W - total) / 2, s = ""; s += `<text x="${sx - 22}" y="${24}" text-anchor="end" fill="var(--text-faint)" style="font:600 10px var(--font-mono)">pre</text>`; s += `<text x="${sx - 22}" y="${56}" text-anchor="end" fill="var(--text-faint)" style="font:600 10px var(--font-mono)">in</text>`; for (var i = 0; i < n; i++) { var isRoot = node && pre[i] === node.val && i === (node._pi != null ? node._pi : -1); var hotPre = node && pre[i] === node.val; s += rect(sx + i * (cw + gap), 8, cw, 26, { fill: hotPre ? "var(--brand-soft)" : "var(--surface-2)", stroke: hotPre ? "var(--accent)" : "var(--border)", sw: hotPre ? 2.2 : 1.2, r: 4 }); s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${26}" text-anchor="middle" fill="${hotPre ? "var(--accent)" : "var(--text)"}" style="font:700 12px var(--font-mono)">${pre[i]}</text>`; var inRange = node && i >= node._il && i <= node._ir, isK = node && i === node._k; s += rect(sx + i * (cw + gap), 40, cw, 26, { fill: isK ? "var(--brand-soft)" : inRange ? "var(--c-info-bg)" : "var(--surface-2)", stroke: isK ? "var(--accent)" : inRange ? "var(--accent)" : "var(--border)", sw: isK ? 2.2 : 1.2, r: 4 }); s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${58}" text-anchor="middle" fill="${isK ? "var(--accent)" : "var(--text)"}" style="font:700 12px var(--font-mono)">${ino[i]}</text>`; } return s; }
      frames.push(frame(root, so, arrays(null), "Rebuild the tree from preorder + inorder: preorder's first value is the root; its position in inorder splits the left and right subtrees.", 46));
      order.forEach(function (n) { revealed.add(n); lastNode = n; frames.push(frame(root, so, arrays(n), `Root <b>${n.val}</b> splits inorder [${n._il}..${n._ir}] at index ${n._k} → left & right subtrees.`, 46)); });
      lastNode = null; frames.push(frame(root, so, arrays(null), "Tree fully reconstructed.", 46));
      return frames;
    }

    if (mode === "serialize") {
      var root = treeFromHeap(cfg.data), st = new Map(), out = [];
      function so(n) { return st.get(n) || "default"; }
      function ov() { return `<text x="${W / 2}" y="${top + geom(root).maxD * levelH + 36}" text-anchor="middle" fill="var(--c-success)" style="font:600 12px var(--font-mono)">"${out.join(",")}"</text>`; }
      frames.push(frame(root, so, ov(), "Serialize with level-order BFS: append each value, and a '#' for every missing child, so the exact shape can be rebuilt.", 56));
      var q = [root];
      while (q.length) { var n = q.shift(); st.set(n, "active"); out.push("" + n.val); var note = ""; if (n.left) q.push(n.left); else out.push("#"); if (n.right) q.push(n.right); else out.push("#"); frames.push(frame(root, so, ov(), `Visit <b>${n.val}</b> → append "${n.val}"${(!n.left || !n.right) ? " plus '#' for its missing child" + (!n.left && !n.right ? "ren" : "") : ""}.`, 56)); st.set(n, "visited"); }
      frames.push(frame(root, so, ov(), `Serialized string complete. Deserialize replays it level-by-level to rebuild the identical tree.`, 56));
      return frames;
    }

    // bst-iterator
    var root = treeFromHeap(cfg.data), stack = [], returned = new Set();
    function so(n) { if (returned.has(n)) return "visited"; if (stack.indexOf(n) >= 0) return "active"; return "default"; }
    function stackCol() { var s = `<text x="${W - 46}" y="${20}" text-anchor="middle" fill="var(--text-faint)" style="font:600 10px var(--font-sans)">stack</text>`, baseY = top + geom(root).maxD * levelH + 20, bw = 56, bh = 22, x = W - 80; for (var i = 0; i < stack.length; i++) { var yy = baseY - (i + 1) * (bh + 3); s += rect(x, yy, bw, bh, { fill: "var(--brand-soft)", stroke: "var(--accent)", sw: i === stack.length - 1 ? 2 : 1.3, r: 4 }); s += `<text x="${x + bw / 2}" y="${yy + bh / 2 + 4}" text-anchor="middle" fill="var(--accent)" style="font:700 12px var(--font-sans)">${stack[i].val}</text>`; } return s; }
    function pushLeft(n) { while (n) { stack.push(n); n = n.left; } }
    frames.push(frame(root, so, stackCol(), "A BST iterator yields values in sorted order using a stack holding the path to the next-smallest node. Start by pushing the whole left spine.", 56));
    pushLeft(root); frames.push(frame(root, so, stackCol(), "Push the leftmost spine — the top of the stack is the smallest value.", 56));
    var outv = [];
    for (var i = 0; i < cfg.calls && stack.length; i++) { var node = stack.pop(); returned.add(node); outv.push(node.val); frames.push(frame(root, so, stackCol(), `next() → pop &amp; return <b>${node.val}</b>; then push the left spine of its right child. So far: [${outv.join(", ")}].`, 56)); pushLeft(node.right); }
    frames.push(frame(root, so, stackCol(), `In-order output so far: <b>[${outv.join(", ")}]</b> — each next() is amortised O(1).`, 56));
    return frames;
  }

  /* ============================================================
     RENDERER — trie (insert + search, with optional '.' wildcard)
     ============================================================ */
  function trieViz(cfg) {
    var W = 600, levelH = 46, top = 30;
    var root = { ch: "•", children: {}, end: false, _kids: [] };
    function insert(word) { var node = root; for (var i = 0; i < word.length; i++) { var c = word[i]; if (!node.children[c]) { node.children[c] = { ch: c, children: {}, end: false, _kids: [] }; node._kids.push(node.children[c]); } node = node.children[c]; } node.end = true; }
    cfg.words.forEach(insert);
    var leaves = 0, maxD = 0, all = [];
    (function lay(n, d) { n._d = d; maxD = Math.max(maxD, d); all.push(n); if (!n._kids.length) n._x = leaves++; else { n._kids.forEach(function (c) { lay(c, d + 1); }); n._x = (n._kids[0]._x + n._kids[n._kids.length - 1]._x) / 2; } })(root, 0);
    var pad = 24, H = top + maxD * levelH + 34, span = (W - 2 * pad) / Math.max(leaves, 1);
    function X(n) { return pad + (n._x + 0.5) * span; } function Y(n) { return top + n._d * levelH; }
    function draw(stateOf, cap, panel) { var s = ""; all.forEach(function (n) { n._kids.forEach(function (c) { s += line(X(n), Y(n) + 11, X(c), Y(c) - 11, { stroke: "var(--border)", sw: 1.2 }); }); }); all.forEach(function (n) { var st = stateOf(n) || {}; s += `<circle cx="${X(n)}" cy="${Y(n)}" r="14" fill="${st.fill || "var(--surface-2)"}" stroke="${st.stroke || (n.end ? "var(--c-success)" : "var(--border)")}" stroke-width="${st.sw || (n.end ? 2 : 1.3)}"/>`; s += `<text x="${X(n)}" y="${Y(n) + 5}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 12px var(--font-mono)">${n.ch}</text>`; if (n.end) s += `<text x="${X(n)}" y="${Y(n) + 25}" text-anchor="middle" fill="var(--c-success)" style="font:600 8px var(--font-sans)">end</text>`; }); if (panel) s += `<text x="${W / 2}" y="${H - 10}" text-anchor="middle" fill="var(--text-muted)" style="font:600 11px var(--font-mono)">${panel}</text>`; return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="trie">${s}</svg>`, caption: cap }; }
    function findPath(node, word, k) { if (k === word.length) return node.end ? [node] : null; var c = word[k]; var tryK = (cfg.wild && c === ".") ? Object.keys(node.children) : (node.children[c] ? [c] : []); for (var i = 0; i < tryK.length; i++) { var sub = findPath(node.children[tryK[i]], word, k + 1); if (sub) return [node].concat(sub); } return null; }
    var frames = [draw(function () { return {}; }, `A trie stores words as shared character paths. Inserted: ${cfg.words.map(function (w) { return '"' + w + '"'; }).join(", ")}. A green ring marks where a word ends.`, "built")];
    cfg.queries.forEach(function (q) {
      var word = q[0], path = findPath(root, word, 0);
      if (path) { var inP = path; frames.push(draw(function (n) { return inP.indexOf(n) >= 0 ? { fill: "var(--c-success-bg)", stroke: "var(--c-success)", lab: "var(--c-success)", sw: 2.4 } : {}; }, `search("${word}")${cfg.wild ? " ('.' matches any child)" : ""} reaches an end node → <b>true</b>.`, "match")); }
      else { var node = root, pn = [root]; for (var i = 0; i < word.length; i++) { var c = word[i]; if (cfg.wild && c === ".") { var ks = Object.keys(node.children); if (!ks.length) break; node = node.children[ks[0]]; pn.push(node); } else if (node.children[c]) { node = node.children[c]; pn.push(node); } else break; } frames.push(draw(function (n) { return pn.indexOf(n) >= 0 ? { fill: "var(--c-warning-bg)", stroke: "var(--c-warning)", lab: "var(--c-warning)" } : {}; }, `search("${word}")${pn.length - 1 < word.length ? " hits a missing edge" : " ends on a non-terminal node"} → <b>false</b>.`, "no match")); }
    });
    return frames;
  }

  /* ============================================================
     RENDERER — monotonic deque (Sliding Window Maximum)
     ============================================================ */
  function dequeViz(cfg) {
    var a = cfg.data, k = cfg.k, W = 600, H = 200, grid = valueCells(a, { W: W, y: 50, h: 42 });
    var dq = [], out = [];
    function frame(i, cap) {
      var inner = grid.draw(function (j) { if (i >= 0 && j >= i - k + 1 && j <= i) { if (j === dq[0]) return { fill: "var(--c-success-bg)", stroke: "var(--c-success)", sw: 2.2, lab: "var(--c-success)" }; if (dq.indexOf(j) >= 0) return { fill: "var(--brand-soft)", stroke: "var(--accent)", lab: "var(--accent)" }; return { fill: "var(--c-info-bg)", stroke: "var(--accent)" }; } return { op: 0.3 }; }, true);
      inner += `<text x="20" y="${H - 30}" fill="var(--text-faint)" style="font:600 11px var(--font-mono)">deque (indices, values ↓): [${dq.join(", ")}]</text>`;
      inner += `<text x="20" y="${H - 10}" fill="var(--c-success)" style="font:600 11px var(--font-mono)">window maxes: [${out.join(", ")}]</text>`;
      return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="sliding window maximum">${inner}</svg>`, caption: cap };
    }
    var frames = [frame(-1, `Sliding-window maximum via a <b>monotonic deque</b> of indices (their values decreasing). The front index is always the current window's maximum, so each answer is O(1).`)];
    for (var i = 0; i < a.length; i++) {
      while (dq.length && dq[0] <= i - k) dq.shift();
      while (dq.length && a[dq[dq.length - 1]] < a[i]) dq.pop();
      dq.push(i);
      var note = `Index ${i} (value ${a[i]}): pop smaller tail values, drop a front that left the window, push ${i}.`;
      if (i >= k - 1) { out.push(a[dq[0]]); note += ` Window max = <b>${a[dq[0]]}</b>.`; }
      frames.push(frame(i, note));
    }
    frames.push(frame(a.length - 1, `All window maxima: [${out.join(", ")}].`));
    return frames;
  }

  /* ============================================================
     RENDERER — data-structure design (LRU, RandomizedSet, TimeMap)
     ============================================================ */
  function designViz(cfg) {
    var mode = cfg.mode, W = 600;
    function box(x, y, w, h, txt, st) { st = st || {}; return rect(x, y, w, h, { fill: st.fill || "var(--surface-2)", stroke: st.stroke || "var(--border)", sw: st.sw || 1.3, r: 6 }) + `<text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" fill="${st.lab || "var(--text)"}" style="font:700 13px var(--font-sans)">${txt}</text>`; }
    var frames = [];

    if (mode === "lru") {
      var cap = cfg.cap, cache = [], H = 170;
      function snap(opLabel, hi, cap2) { var bw = 64, gap = 10, sx = (W - (cap * (bw + gap) - gap)) / 2, s = `<text x="${W / 2}" y="30" text-anchor="middle" fill="var(--text)" style="font:700 13px var(--font-mono)">${opLabel}</text><text x="${sx}" y="60" fill="var(--text-faint)" style="font:600 10px var(--font-sans)">MRU →</text><text x="${sx + cap * (bw + gap) - gap}" y="60" text-anchor="end" fill="var(--text-faint)" style="font:600 10px var(--font-sans)">→ LRU</text>`; for (var i = 0; i < cap; i++) { var e = cache[i]; s += box(sx + i * (bw + gap), 70, bw, 44, e ? e[0] + ":" + e[1] : "—", { fill: i === hi ? "var(--brand-soft)" : e ? "var(--c-info-bg)" : "var(--surface-2)", stroke: i === hi ? "var(--accent)" : e ? "var(--accent)" : "var(--border)", lab: e ? "var(--text)" : "var(--text-faint)", sw: i === hi ? 2.2 : 1.3 }); } s += `<text x="${W / 2}" y="${H - 10}" text-anchor="middle" fill="var(--c-success)" style="font:600 12px var(--font-mono)">${cap2}</text>`; return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="lru cache">${s}</svg>`, caption: opLabel2 }; }
      var opLabel2 = "";
      function doSnap(label, hi, panel, cap3) { opLabel2 = cap3; frames.push(snap(label, hi, panel)); }
      doSnap("LRU cache", -1, "capacity " + cap, `An LRU cache keeps entries ordered most-recently-used → least. Every get/put moves a key to the front; a put over capacity evicts the back (LRU). A hash map + doubly-linked list makes both O(1).`);
      cfg.ops.forEach(function (op) {
        if (op[0] === "put") { var key = op[1], val = op[2], at = cache.findIndex(function (e) { return e[0] === key; }); if (at >= 0) cache.splice(at, 1); cache.unshift([key, val]); var evicted = ""; if (cache.length > cap) { var ev = cache.pop(); evicted = ` Evicted LRU key ${ev[0]}.`; } doSnap(`put(${key}, ${val})`, 0, "front = " + key, `Insert/refresh ${key} at the front.${evicted}`); }
        else { var key2 = op[1], at2 = cache.findIndex(function (e) { return e[0] === key2; }); if (at2 >= 0) { var e2 = cache.splice(at2, 1)[0]; cache.unshift(e2); doSnap(`get(${key2}) → ${e2[1]}`, 0, "front = " + key2, `Hit: return ${e2[1]} and move ${key2} to the front.`); } else doSnap(`get(${key2}) → -1`, -1, "miss", `${key2} isn't cached → -1.`); }
      });
      return frames;
    }

    if (mode === "randomized-set") {
      var H2 = 200, arr = [], idx = {};
      function snap(label, hi, cap2) { var n = Math.max(arr.length, 1), cw = Math.min(50, (W - 80) / n), gap = 6, sx = (W - (arr.length * (cw + gap) - gap)) / 2, s = `<text x="${W / 2}" y="30" text-anchor="middle" fill="var(--text)" style="font:700 13px var(--font-mono)">${label}</text><text x="30" y="60" fill="var(--text-faint)" style="font:600 10px var(--font-mono)">array</text>`; for (var i = 0; i < arr.length; i++) { s += box(sx + i * (cw + gap), 70, cw, 40, arr[i], { fill: i === hi ? "var(--brand-soft)" : "var(--c-info-bg)", stroke: i === hi ? "var(--accent)" : "var(--accent)", sw: i === hi ? 2.4 : 1.3 }); s += `<text x="${sx + i * (cw + gap) + cw / 2}" y="${124}" text-anchor="middle" fill="var(--text-faint)" style="font:500 9px var(--font-mono)">${i}</text>`; } s += `<text x="${W / 2}" y="${160}" text-anchor="middle" fill="var(--text-muted)" style="font:600 11px var(--font-mono)">map val→index: {${Object.keys(idx).map(function (k) { return k + ":" + idx[k]; }).join(", ")}}</text>`; s += `<text x="${W / 2}" y="${H2 - 10}" text-anchor="middle" fill="var(--c-success)" style="font:600 11px var(--font-mono)">${cap2}</text>`; return { svg: `<svg viewBox="0 0 ${W} ${H2}" role="img" aria-label="randomized set">${s}</svg>`, caption: label2 }; }
      var label2 = "";
      function doSnap(label, hi, cap3) { label2 = cap3; frames.push(snap(label, hi, "")); }
      doSnap("RandomizedSet", -1, "An array gives O(1) random access; a map of value→index gives O(1) insert/remove. Remove swaps the target with the last element, then pops — keeping the array gap-free.");
      cfg.ops.forEach(function (op) {
        if (op[0] === "insert") { var v = op[1]; if (idx[v] === undefined) { idx[v] = arr.length; arr.push(v); doSnap(`insert(${v})`, arr.length - 1, `Append ${v} at index ${idx[v]} and record it in the map.`); } else doSnap(`insert(${v}) → false`, -1, `${v} already present.`); }
        else if (op[0] === "remove") { var v2 = op[1], pos = idx[v2], last = arr[arr.length - 1]; arr[pos] = last; idx[last] = pos; arr.pop(); delete idx[v2]; doSnap(`remove(${v2})`, pos < arr.length ? pos : -1, `Move last value ${last} into slot ${pos}, pop the end, drop ${v2} from the map — all O(1).`); }
        else { var ri = Math.floor(arr.length / 2); doSnap(`getRandom() → ${arr[ri]}`, ri, `Pick a uniformly random index → ${arr[ri]}.`); }
      });
      return frames;
    }

    // time-based key-value store
    var entries = [], H3 = 190;
    function snap(label, hi, panel) { var n = Math.max(entries.length, 1), cw = Math.min(70, (W - 80) / n), gap = 8, sx = (W - (entries.length * (cw + gap) - gap)) / 2, s = `<text x="${W / 2}" y="30" text-anchor="middle" fill="var(--text)" style="font:700 13px var(--font-mono)">${label}</text>`; for (var i = 0; i < entries.length; i++) { s += box(sx + i * (cw + gap), 64, cw, 44, "t" + entries[i][0] + ":" + entries[i][1], { fill: hi && hi.indexOf(i) >= 0 ? "var(--brand-soft)" : "var(--c-info-bg)", stroke: hi && hi.indexOf(i) >= 0 ? "var(--accent)" : "var(--accent)", sw: hi && hi.indexOf(i) >= 0 ? 2.4 : 1.3 }); } if (panel) s += `<text x="${W / 2}" y="${H3 - 12}" text-anchor="middle" fill="var(--c-success)" style="font:600 12px var(--font-mono)">${panel}</text>`; return { svg: `<svg viewBox="0 0 ${W} ${H3}" role="img" aria-label="time map">${s}</svg>`, caption: tlabel }; }
    var tlabel = "";
    function dsnap(label, hi, panel, cap2) { tlabel = cap2; frames.push(snap(label, hi, panel)); }
    dsnap("TimeMap", null, "key \"" + cfg.query[0] + "\"", `A TimeMap stores each key's values as a list ordered by timestamp. set appends; get(key, t) <b>binary-searches</b> for the newest entry with timestamp ≤ t.`);
    cfg.sets.forEach(function (st) { entries.push([st[2], st[1]]); dsnap(`set("${st[0]}", "${st[1]}", ${st[2]})`, [entries.length - 1], "timestamps: " + entries.map(function (e) { return e[0]; }).join(", "), `Append (t=${st[2]}, "${st[1]}").`); });
    var qt = cfg.query[1], lo = 0, hi = entries.length - 1, ans = "";
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (entries[mid][0] <= qt) { ans = entries[mid][1]; dsnap(`get("${cfg.query[0]}", ${qt})`, [mid], "candidate \"" + ans + "\"", `t${entries[mid][0]} ≤ ${qt} → "${entries[mid][1]}" works; search right for something newer.`); lo = mid + 1; } else { dsnap(`get("${cfg.query[0]}", ${qt})`, [mid], "too new", `t${entries[mid][0]} &gt; ${qt} → too new, search left.`); hi = mid - 1; } }
    dsnap(`get("${cfg.query[0]}", ${qt}) → "${ans}"`, null, "answer \"" + ans + "\"", `Newest value at or before t=${qt} is <b>"${ans}"</b>.`);
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
    "knapsack": knapsack,
    "stack-ops": stackOps,
    "math-steps": mathSteps,
    "two-tree": twoTree,
    "dp-string": dpString,
    "expand-center": expandCenter,
    "tree-ops": treeOps,
    "trie": trieViz,
    "deque": dequeViz,
    "design": designViz
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
    "path-sum-ii": { title: "Watch every winning path light up", type: "tree", mode: "path-sum-ii", data: [5, 4, 8, 11, null, 13, 9, 7, 2], target: 22 },

    /* ===== batch J ===== */
    /* ----- stack operations ----- */
    "evaluate-reverse-polish-notation": { title: "Watch operators fold the stack", type: "stack-ops", mode: "rpn", tokens: ["2", "1", "+", "3", "*"] },
    "min-stack": { title: "Watch each level cache its min", type: "stack-ops", mode: "min-stack", ops: [["push", -2], ["push", 0], ["push", -3], ["getMin"], ["pop"], ["getMin"]] },
    "decode-string": { title: "Watch two stacks expand k[...]", type: "stack-ops", mode: "decode-string", s: "3[a]2[bc]" },
    "asteroid-collision": { title: "Watch collisions resolve on the stack", type: "stack-ops", mode: "asteroids", data: [5, 10, -5] },
    "remove-k-digits": { title: "Watch the monotonic stack drop big digits", type: "stack-ops", mode: "remove-k-digits", num: "1432219", k: 3 },
    "simplify-path": { title: "Watch directories push and pop", type: "stack-ops", mode: "simplify-path", path: "/home//foo/../bar" },
    "basic-calculator-ii": { title: "Watch × and ÷ apply on the stack", type: "stack-ops", mode: "calculator", s: "3+2*2" },
    "valid-parenthesis-string": { title: "Watch the open-count range track *", type: "stack-ops", mode: "valid-paren", s: "(*)" },

    /* ----- math step-throughs ----- */
    "reverse-integer": { title: "Watch digits pop and push", type: "math-steps", mode: "reverse-integer", x: 123 },
    "happy-number": { title: "Watch the squares chain to 1", type: "math-steps", mode: "happy-number", n: 19 },
    "plus-one": { title: "Watch the carry ripple left", type: "math-steps", mode: "plus-one", data: [1, 2, 9] },
    "multiply-strings": { title: "Watch grade-school multiplication", type: "math-steps", mode: "multiply", a: "12", b: "34" },

    /* ----- two trees ----- */
    "same-tree": { title: "Watch both trees compare in lockstep", type: "two-tree", mode: "same", a: [1, 2, 3], b: [1, 2, 3] },
    "symmetric-tree": { title: "Watch mirror pairs match", type: "two-tree", mode: "symmetric", data: [1, 2, 2, 3, 4, 4, 3] },
    "subtree-of-another-tree": { title: "Watch the subtree anchor a match", type: "two-tree", mode: "subtree", a: [3, 4, 5, 1, 2], b: [4, 1, 2] },

    /* ----- dp over strings ----- */
    "word-break": { title: "Watch dp split into dictionary words", type: "dp-string", mode: "word-break", s: "leetcode", dict: ["leet", "code"] },
    "decode-ways": { title: "Watch one- and two-digit decodings add", type: "dp-string", mode: "decode-ways", s: "226" },

    /* ----- expand around center ----- */
    "palindromic-substrings": { title: "Watch every center expand", type: "expand-center", mode: "count", s: "aaa" },
    "longest-palindromic-substring": { title: "Watch the widest expansion win", type: "expand-center", mode: "longest", s: "babad" },

    /* ----- string-ops extras ----- */
    "partition-labels": { title: "Watch the part stretch to last-seen", type: "string-ops", mode: "partition-labels", s: "abacdc" },
    "encode-and-decode-strings": { title: "Watch length prefixes delimit words", type: "string-ops", mode: "encode-decode", words: ["lc", "leetcode", "#hi"] },
    "string-to-integer-atoi": { title: "Watch the four parse phases", type: "string-ops", mode: "atoi", s: "   -42" },

    /* ----- sliding-window extras ----- */
    "find-all-anagrams-in-a-string": { title: "Watch the fixed window match counts", type: "sliding-window", mode: "anagrams", data: "cbaebabacd", p: "abc", findAll: true },
    "permutation-in-string": { title: "Watch for the first matching window", type: "sliding-window", mode: "anagrams", data: "eidbaooo", p: "ab", findAll: false },
    "minimum-window-substring": { title: "Watch expand then shrink to minimum", type: "sliding-window", mode: "min-window", data: "ADOBECODEBANC", t: "ABC" },
    "fruit-into-baskets": { title: "Watch ≤2 distinct stretch the window", type: "sliding-window", mode: "fruit", data: [1, 2, 1, 2, 3] },

    /* ----- linked-list extras ----- */
    "odd-even-linked-list": { title: "Watch odd then even positions group", type: "linked-list", mode: "odd-even", data: [1, 2, 3, 4, 5] },
    "rotate-list": { title: "Watch the tail swing to the front", type: "linked-list", mode: "rotate", data: [1, 2, 3, 4, 5], k: 2 },
    "remove-duplicates-from-sorted-list": { title: "Watch duplicates splice out", type: "linked-list", mode: "dedup", data: [1, 1, 2, 3, 3] },
    "reverse-nodes-in-k-group": { title: "Watch each k-group reverse", type: "linked-list", mode: "reverse-k", data: [1, 2, 3, 4, 5], k: 2 },

    /* ----- binary search extras ----- */
    "single-element-in-a-sorted-array": { title: "Watch pair boundaries guide the search", type: "bsearch", mode: "single-element", data: [1, 1, 2, 3, 3, 4, 4, 8, 8] },
    "capacity-to-ship-packages-within-d-days": { title: "Watch binary search on capacity", type: "bsearch", mode: "capacity", weights: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], days: 5 },

    /* ----- dp-linear extras ----- */
    "house-robber-ii": { title: "Watch two passes around the circle", type: "dp-linear", mode: "house-robber-ii", data: [2, 3, 2] },
    "perfect-squares": { title: "Watch fewest squares build up", type: "dp-linear", mode: "perfect-squares", n: 12 },

    /* ----- two-pointer extras ----- */
    "4sum": { title: "Watch two fixes plus two pointers", type: "two-pointer", mode: "4sum", data: [1, 0, -1, 0, -2, 2], target: 0 },
    "3sum-closest": { title: "Watch the sum chase the target", type: "two-pointer", mode: "3sum-closest", data: [-1, 2, 1, -4], target: 1 },

    /* ----- array-rewrite extras ----- */
    "rotate-array": { title: "Watch three reversals rotate", type: "array-rewrite", mode: "rotate-array", data: [1, 2, 3, 4, 5, 6, 7], k: 3 },
    "first-missing-positive": { title: "Watch values cycle into place", type: "array-rewrite", mode: "first-missing", data: [3, 4, -1, 1] },

    /* ----- heap extras ----- */
    "merge-k-sorted-lists": { title: "Watch the heap pick the next smallest", type: "heap", mode: "merge-k", lists: [[1, 4, 5], [1, 3, 4], [2, 6]] },
    "meeting-rooms-ii": { title: "Watch the end-time heap count rooms", type: "heap", mode: "meeting-rooms-ii", data: [[0, 30], [5, 10], [15, 20]] },

    /* ===== batch K (final) ===== */
    /* ----- graphs ----- */
    "is-graph-bipartite": { title: "Watch the 2-colouring BFS", type: "graph", mode: "bipartite", n: 4, edges: [[0, 1], [1, 2], [2, 3], [3, 0]] },
    "network-delay-time": { title: "Watch Dijkstra settle distances", type: "graph", mode: "dijkstra", n: 4, src: 0, edges: [[0, 1, 1], [0, 2, 4], [1, 2, 1], [2, 3, 1]] },
    "cheapest-flights-k-stops": { title: "Watch Bellman-Ford relax by rounds", type: "graph", mode: "bellman", n: 3, src: 0, dst: 2, k: 1, edges: [[0, 1, 100], [1, 2, 100], [0, 2, 500]] },
    "min-cost-connect-points": { title: "Watch Prim grow the MST", type: "graph", mode: "mst", points: [[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]] },
    "reconstruct-itinerary": { title: "Watch Hierholzer build the Euler path", type: "graph", mode: "euler", n: 3, labels: ["JFK", "ATL", "SFO"], start: "JFK", tickets: [["JFK", "SFO"], ["JFK", "ATL"], ["SFO", "ATL"], ["ATL", "JFK"], ["ATL", "SFO"]] },
    "alien-dictionary": { title: "Watch letter order emerge via topo sort", type: "graph", mode: "alien-topo", n: 5, labels: ["w", "e", "r", "t", "f"], words: ["wrt", "wrf", "er", "ett", "rftt"] },
    "evaluate-division": { title: "Watch ratios multiply along a path", type: "graph", mode: "evaluate-division", n: 3, labels: ["a", "b", "c"], edges: [[0, 1, 2], [1, 2, 3]], query: ["a", "c"] },
    "accounts-merge": { title: "Watch union-find merge accounts", type: "graph", mode: "accounts-merge", n: 4, labels: ["John", "John", "Mary", "John"], edges: [[0, 1], [2, 3]] },
    "open-the-lock": { title: "Watch BFS turn to the target", type: "graph", mode: "lock-path", deadends: ["0201", "0101", "0102", "1212", "2002"], target: "0202" },

    /* ----- grid / matrix ----- */
    "pacific-atlantic": { title: "Watch both oceans flood inward", type: "grid", mode: "pacific-atlantic", data: [[1, 2, 2, 3, 5], [3, 2, 3, 4, 4], [2, 4, 5, 3, 1], [6, 7, 1, 4, 5], [5, 1, 1, 2, 4]] },
    "swim-in-rising-water": { title: "Watch Dijkstra minimise the max", type: "grid", mode: "swim", data: [[0, 2], [1, 3]] },
    "word-search": { title: "Watch DFS trace the word", type: "grid", mode: "word-search", data: [["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]], word: "ABCCED" },
    "word-search-ii": { title: "Watch DFS find a word on the board", type: "grid", mode: "word-search", data: [["o", "a", "a", "n"], ["e", "t", "a", "e"], ["i", "h", "k", "r"], ["i", "f", "l", "v"]], word: "eat" },
    "valid-sudoku": { title: "Watch row/col/box sets catch a clash", type: "matrix", mode: "sudoku", data: [["5", "3", ".", ".", "7", ".", ".", ".", "."], ["6", ".", ".", "1", "9", "5", ".", ".", "."], [".", "9", "8", ".", ".", ".", ".", "6", "."], ["8", ".", ".", ".", "6", ".", ".", ".", "3"], ["4", ".", ".", "8", ".", "3", ".", ".", "1"], ["7", ".", ".", ".", "2", ".", ".", ".", "6"], [".", "6", ".", ".", ".", ".", "2", "8", "."], [".", ".", ".", "4", "1", "9", ".", ".", "5"], [".", ".", ".", ".", "8", ".", ".", "7", "5"]] },

    /* ----- tree operations ----- */
    "delete-node-in-a-bst": { title: "Watch the successor replace the node", type: "tree-ops", mode: "delete-bst", data: [5, 3, 6, 2, 4, null, 7], key: 3 },
    "house-robber-iii": { title: "Watch [rob, skip] bubble up", type: "tree-ops", mode: "rob-tree", data: [3, 2, 3, null, 3, null, 1] },
    "populating-next-right-pointers": { title: "Watch each level thread rightward", type: "tree-ops", mode: "connect-next", data: [1, 2, 3, 4, 5, 6, 7] },
    "convert-sorted-array-to-bst": { title: "Watch the middle become each root", type: "tree-ops", mode: "sorted-to-bst", data: [-10, -3, 0, 5, 9] },
    "construct-binary-tree-preorder-inorder": { title: "Watch preorder + inorder rebuild", type: "tree-ops", mode: "construct", preorder: [3, 9, 20, 15, 7], inorder: [9, 3, 15, 20, 7] },
    "serialize-and-deserialize-binary-tree": { title: "Watch BFS serialize to a string", type: "tree-ops", mode: "serialize", data: [1, 2, 3, null, null, 4, 5] },
    "binary-search-tree-iterator": { title: "Watch the stack drive in-order", type: "tree-ops", mode: "bst-iterator", data: [7, 3, 15, null, null, 9, 20], calls: 4 },

    /* ----- DP grids ----- */
    "unique-paths-ii": { title: "Watch obstacles zero out paths", type: "dp-grid", mode: "unique-paths-obstacles", grid: [[0, 0, 0], [0, 1, 0], [0, 0, 0]] },
    "interleaving-string": { title: "Watch two strings weave into one", type: "dp-grid", mode: "interleaving", a: "aab".split(""), b: "axy".split(""), s3: "aaxaby" },
    "longest-palindromic-subsequence": { title: "Watch LCS of s and its reverse", type: "dp-grid", mode: "lcs", a: "bbbab".split(""), b: "babbb".split("") },
    "triangle": { title: "Watch the minimum bubble to the apex", type: "dp-grid", mode: "triangle", grid: [[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]] },
    "best-time-to-buy-sell-cooldown": { title: "Watch hold/sold/rest each day", type: "dp-grid", mode: "cooldown", prices: [1, 2, 3, 0, 2] },

    /* ----- DP misc ----- */
    "target-sum": { title: "Watch subset counts accumulate", type: "knapsack", mode: "target-sum", data: [1, 1, 1, 1, 1], target: 3 },
    "unique-binary-search-trees": { title: "Watch the Catalan recurrence fill", type: "dp-linear", mode: "catalan", n: 4 },

    /* ----- linked list ----- */
    "sort-list": { title: "Watch merge sort split and merge", type: "linked-list", mode: "sort", data: [4, 2, 1, 3] },
    "find-the-duplicate-number": { title: "Watch Floyd find the cycle entrance", type: "linked-list", mode: "duplicate", data: [1, 3, 4, 2, 2] },
    "copy-list-with-random-pointer": { title: "Watch the weave-and-split clone", type: "linked-list", mode: "copy-random", data: [7, 13, 11, 10, 1], random: [-1, 0, 4, 2, 0] },

    /* ----- binary search ----- */
    "median-of-two-sorted-arrays": { title: "Watch the partition balance", type: "bsearch", mode: "median2", a: [1, 3], b: [2, 7] },
    "find-k-closest-elements": { title: "Watch the window drop the far end", type: "bsearch", mode: "k-closest-elements", data: [1, 2, 3, 4, 5], k: 4, x: 3 },

    /* ----- stack / mono ----- */
    "car-fleet": { title: "Watch fleets form on the stack", type: "stack-ops", mode: "car-fleet", target: 12, positions: [10, 8, 0, 5, 3], speeds: [2, 4, 1, 1, 3] },

    /* ----- math ----- */
    "pow-x-n": { title: "Watch fast exponentiation by squaring", type: "math-steps", mode: "pow", x: 2, n: 10 },
    "range-sum-query-immutable": { title: "Watch prefix sums answer in O(1)", type: "math-steps", mode: "range-sum", data: [-2, 0, 3, -5, 2, -1], query: [2, 5] },

    /* ----- greedy ----- */
    "candy": { title: "Watch the two greedy passes", type: "array-rewrite", mode: "candy", data: [1, 0, 2, 4, 3] },
    "hand-of-straights": { title: "Watch consecutive runs form", type: "array-rewrite", mode: "hand", data: [1, 2, 3, 6, 2, 3, 4, 7, 8], groupSize: 3 },

    /* ----- greedy / heap ----- */
    "reorganize-string": { title: "Watch the most-frequent char placed", type: "heap", mode: "reorganize", s: "aab" },
    "design-twitter": { title: "Watch the heap merge recent tweets", type: "heap", mode: "twitter", k: 4, feeds: [[[1, 101], [4, 104]], [[2, 102], [5, 105]], [[3, 103]]] },

    /* ----- backtracking ----- */
    "n-queens": { title: "Watch queens place and backtrack", type: "backtracking", mode: "n-queens", n: 4 },

    /* ----- trie ----- */
    "implement-trie": { title: "Watch words share character paths", type: "trie", words: ["apple", "app"], queries: [["app", true], ["ap", false]], wild: false },
    "design-add-and-search-words": { title: "Watch '.' branch to any child", type: "trie", words: ["bad", "dad", "mad"], queries: [[".ad", true], ["b..", true]], wild: true },

    /* ----- deque ----- */
    "sliding-window-maximum": { title: "Watch the monotonic deque front", type: "deque", data: [1, 3, -1, -3, 5, 3, 6, 7], k: 3 },

    /* ----- design ----- */
    "lru-cache": { title: "Watch MRU↔LRU ordering and eviction", type: "design", mode: "lru", cap: 2, ops: [["put", 1, 1], ["put", 2, 2], ["get", 1], ["put", 3, 3], ["get", 2], ["put", 4, 4], ["get", 3]] },
    "insert-delete-getrandom-o1": { title: "Watch swap-remove keep O(1)", type: "design", mode: "randomized-set", ops: [["insert", 1], ["insert", 2], ["remove", 1], ["insert", 3], ["getRandom"]] },
    "time-based-key-value-store": { title: "Watch binary search by timestamp", type: "design", mode: "timemap", sets: [["foo", "bar", 1], ["foo", "bar2", 4]], query: ["foo", 3] },

    /* ===== batch L ===== */
    /* ----- strings / hashing ----- */
    "reverse-string": { title: "Watch the ends swap inward", type: "array-rewrite", mode: "reverse-string", data: ["h", "e", "l", "l", "o"] },
    "reverse-words-in-a-string": { title: "Watch the word order flip", type: "string-ops", mode: "reverse-words", s: "the sky is blue" },
    "valid-palindrome-ii": { title: "Watch the one allowed deletion", type: "two-pointer", mode: "palindrome-ii", data: "abca".split("") },
    "is-subsequence": { title: "Watch two pointers walk t", type: "string-ops", mode: "subsequence", s: "abc", t: "ahbgdc" },
    "isomorphic-strings": { title: "Watch the 1-to-1 mapping build", type: "string-ops", mode: "isomorphic", s: "egg", t: "add" },
    "ransom-note": { title: "Watch magazine letters get spent", type: "string-ops", mode: "ransom", note: "aa", magazine: "aab" },
    "first-unique-character-in-a-string": { title: "Watch counts find the first unique", type: "string-ops", mode: "first-unique", s: "leetcode" },
    "add-strings": { title: "Watch digit-by-digit carry", type: "math-steps", mode: "add-strings", a: "456", b: "77" },
    "add-binary": { title: "Watch binary addition carry", type: "math-steps", mode: "add-strings", a: "1010", b: "1011", base: 2 },
    "longest-palindrome": { title: "Watch pairs and a center add up", type: "string-ops", mode: "longest-palindrome-build", s: "abccccdd" },

    /* ----- sliding window / arrays ----- */
    "subarray-product-less-than-k": { title: "Watch the window count subarrays", type: "sliding-window", mode: "product-window", data: [10, 5, 2, 6], target: 100 },
    "longest-substring-with-at-most-k-distinct-characters": { title: "Watch ≤ k distinct stretch the window", type: "sliding-window", mode: "k-distinct", data: "eceba", k: 2 },
    "max-consecutive-ones": { title: "Watch the run of 1s grow", type: "sliding-window", mode: "max-ones", data: [1, 1, 0, 1, 1, 1], k: 0 },
    "summary-ranges": { title: "Watch consecutive runs close", type: "array-scan", mode: "summary-ranges", data: [0, 1, 2, 4, 5, 7] },
    "wiggle-subsequence": { title: "Watch every trend flip count", type: "array-scan", mode: "wiggle", data: [1, 7, 4, 9, 2, 5] },
    "lemonade-change": { title: "Watch greedy change-making", type: "array-scan", mode: "lemonade", data: [5, 5, 5, 10, 20] },

    /* ----- binary search ----- */
    "first-bad-version": { title: "Watch the boundary search", type: "bsearch", mode: "first-bad", data: [1, 2, 3, 4, 5], bad: 4 },
    "valid-perfect-square": { title: "Watch binary search on √x", type: "bsearch", mode: "sqrtx", x: 16 },
    "guess-number-higher-or-lower": { title: "Watch the guess halve the range", type: "binary-search", data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], target: 6 },
    "search-a-2d-matrix-ii": { title: "Watch the staircase search", type: "grid", mode: "staircase", data: [[1, 4, 7, 11], [2, 5, 8, 12], [3, 6, 9, 16], [10, 13, 14, 17]], target: 5 },

    /* ----- trees ----- */
    "binary-tree-paths": { title: "Watch every root-to-leaf path", type: "tree", mode: "all-paths", data: [1, 2, 3, null, 5] },
    "sum-root-to-leaf-numbers": { title: "Watch path numbers add up", type: "tree", mode: "root-to-leaf-sum", data: [4, 9, 0, 5, 1] },
    "path-sum-iii": { title: "Watch prefix sums count paths", type: "tree", mode: "path-sum-iii", data: [10, 5, -3, 3, 2, null, 11, 3, -2, null, 1], target: 8 },
    "range-sum-of-bst": { title: "Watch BST bounds prune branches", type: "tree", mode: "range-sum-bst", data: [10, 5, 15, 3, 7, null, 18], low: 7, high: 15 },
    "average-of-levels-in-binary-tree": { title: "Watch each level's average", type: "tree", mode: "level-average", data: [3, 9, 20, null, null, 15, 7] },
    "minimum-absolute-difference-in-bst": { title: "Watch in-order neighbours compare", type: "tree", mode: "min-diff-bst", data: [4, 2, 6, 1, 3] },

    /* ----- grid / graph ----- */
    "max-area-of-island": { title: "Watch each island's area", type: "grid", mode: "max-area", data: [[1, 1, 0, 0], [1, 0, 0, 1], [0, 0, 1, 1], [0, 0, 1, 0]] },
    "island-perimeter": { title: "Watch edges count per cell", type: "grid", mode: "perimeter", data: [[0, 1, 0, 0], [1, 1, 1, 0], [0, 1, 0, 0], [1, 1, 0, 0]] },
    "keys-and-rooms": { title: "Watch DFS unlock every room", type: "graph", mode: "keys-rooms", n: 4, edges: [[0, 1], [0, 2], [2, 3]] },
    "minimum-height-trees": { title: "Watch leaves peel to the centre", type: "graph", mode: "mht", n: 6, edges: [[3, 0], [3, 1], [3, 2], [3, 4], [5, 4]] },
    "find-the-town-judge": { title: "Watch in/out-degrees reveal the judge", type: "graph", mode: "town-judge", n: 3, edges: [[1, 3], [2, 3]] },
    "find-if-path-exists-in-graph": { title: "Watch union-find connect components", type: "graph", mode: "components", n: 6, edges: [[0, 1], [1, 2], [2, 0], [3, 5]] },

    /* ----- DP ----- */
    "minimum-falling-path-sum": { title: "Watch each cell take the best above", type: "dp-grid", mode: "falling-path", grid: [[2, 1, 3], [6, 5, 4], [7, 8, 9]] },
    "paint-house": { title: "Watch colours avoid the neighbour", type: "dp-grid", mode: "paint-house", costs: [[17, 2, 17], [16, 16, 5], [14, 3, 19]] },
    "count-square-submatrices-with-all-ones": { title: "Watch every square get counted", type: "dp-grid", mode: "count-squares", grid: [[0, 1, 1, 1], [1, 1, 1, 1], [0, 1, 1, 1]] },
    "delete-and-earn": { title: "Watch House Robber on earnings", type: "dp-linear", mode: "delete-earn", data: [2, 2, 3, 3, 3, 4] },
    "integer-break": { title: "Watch the best split product fill", type: "dp-linear", mode: "integer-break", n: 10 },

    /* ----- math / bit ----- */
    "excel-sheet-column-number": { title: "Watch base-26 accumulate", type: "math-steps", mode: "excel", s: "ZY" },
    "count-primes": { title: "Watch the sieve cross out composites", type: "math-steps", mode: "sieve", n: 30 },
    "power-of-two": { title: "Watch n & (n−1) test the single bit", type: "bits", mode: "power-of-two", n: 16, bits: 8 }
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
