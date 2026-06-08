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
    "intervals-merge": intervalsMerge
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
    "single-number": { title: "Watch XOR cancel the pairs", type: "array-scan", mode: "single-number", data: [4, 1, 2, 1, 2] }
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
