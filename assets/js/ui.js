/* ============================================================
   AEGIS :: UI HELPERS
   ============================================================ */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function el(html) {
    var d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }

  function tierClass(t) { return "tier-" + t; }

  function meter(pct, segs, cls) {
    segs = segs || 20;
    var on = Math.round(pct * segs), out = "";
    for (var i = 0; i < segs; i++) out += "<i class='" + (i < on ? "on" : "") + "'></i>";
    return "<div class='meter " + (cls || "") + "'>" + out + "</div>";
  }

  function pct(x) { return Math.round(x * 100) + "%"; }

  function hrs(min) {
    if (!min) return "self-paced";
    if (min >= 60) return (min / 60).toFixed(min % 60 ? 1 : 0) + "h";
    return min + "m";
  }

  function metaLine(c) {
    var bits = [c.provider];
    if (c.code) bits.push(c.code);
    bits.push("T" + String(c.tier).padStart(2, "0"));
    bits.push(c.kind.toUpperCase());
    bits.push(c.level);
    return bits.join("  ·  ");
  }

  function lockNote(tier, need) {
    var u = tier.unlock;
    return "<div class='locked-note'>" +
      "<b>CLEARANCE REQUIRED</b><br>" +
      (u ? "Tier " + String(u.tier).padStart(2, "0") + " must reach " + pct(u.completion) +
          " completion and " + pct(u.quiz) + " average self-test score.<br>" : "") +
      "<span style='opacity:.7'>Dossiers in this tier stay sealed until you qualify.</span></div>";
  }

  function redact(s) { return "<span class='redacted'>" + esc(s) + "</span>"; }

  // copy-to-clipboard buttons on every code block
  function wireCopy(root) {
    (root || document).querySelectorAll(".note pre").forEach(function (pre) {
      if (pre.querySelector(".copy-btn")) return;
      var b = document.createElement("button");
      b.className = "copy-btn";
      b.textContent = "COPY";
      b.onclick = function () {
        var code = pre.querySelector("code");
        navigator.clipboard.writeText(code ? code.innerText : pre.innerText).then(function () {
          b.textContent = "COPIED";
          setTimeout(function () { b.textContent = "COPY"; }, 1400);
        });
      };
      pre.appendChild(b);
    });
  }

  // ---- SVG ----
  function radar(domains, mastery, size, max) {
    size = size || 240; max = max || 4;
    var cx = size / 2, cy = size / 2, R = size * 0.36, n = domains.length;
    var rings = "", axes = "", labels = "", poly = [];
    for (var r = 1; r <= max; r++) {
      var pts = [];
      for (var i = 0; i < n; i++) {
        var a = (Math.PI * 2 * i) / n - Math.PI / 2;
        pts.push((cx + Math.cos(a) * R * (r / max)).toFixed(1) + "," + (cy + Math.sin(a) * R * (r / max)).toFixed(1));
      }
      rings += "<polygon points='" + pts.join(" ") + "' fill='none' stroke='rgba(201,212,224,.10)'/>";
    }
    for (var j = 0; j < n; j++) {
      var ang = (Math.PI * 2 * j) / n - Math.PI / 2;
      var ex = cx + Math.cos(ang) * R, ey = cy + Math.sin(ang) * R;
      axes += "<line x1='" + cx + "' y1='" + cy + "' x2='" + ex.toFixed(1) + "' y2='" + ey.toFixed(1) +
              "' stroke='rgba(201,212,224,.10)'/>";
      var lx = cx + Math.cos(ang) * (R + 16), ly = cy + Math.sin(ang) * (R + 13);
      var v = mastery[domains[j].id] ? mastery[domains[j].id].pct : 0;
      poly.push((cx + Math.cos(ang) * R * v).toFixed(1) + "," + (cy + Math.sin(ang) * R * v).toFixed(1));
      var anchor = Math.abs(Math.cos(ang)) < 0.3 ? "middle" : (Math.cos(ang) > 0 ? "start" : "end");
      labels += "<text x='" + lx.toFixed(1) + "' y='" + ly.toFixed(1) + "' text-anchor='" + anchor +
        "' fill='#7d8fa3' font-family='IBM Plex Mono, monospace' font-size='7.5' letter-spacing='.08em'>" +
        esc(domains[j].label) + "</text>";
    }
    var svg = "<svg viewBox='0 0 " + size + " " + size + "' width='100%' height='" + size + "'>" +
      rings + axes +
      "<polygon points='" + poly.join(" ") + "' fill='rgba(176,141,63,.20)' stroke='#b08d3f' stroke-width='1.2'/>" +
      poly.map(function (p) {
        var xy = p.split(",");
        return "<circle cx='" + xy[0] + "' cy='" + xy[1] + "' r='2' fill='#d4af5f'/>";
      }).join("") + labels + "</svg>";
    return "<div class='radar-wrap'>" + svg + "</div>";
  }

  function spark(history) {
    var days = history.slice(-28), max = 1;
    days.forEach(function (d) { max = Math.max(max, (d.lectures || 0) + (d.labs || 0)); });
    if (!days.length) return "<div class='spark'></div>";
    return "<div class='spark'>" + days.map(function (d) {
      var v = (d.lectures || 0) + (d.labs || 0);
      var h = Math.max(2, (v / max) * 42);
      return "<i style='height:" + h + "px' class='" + (v >= 3 ? "hot" : "") + "' title='" +
        d.d + ": " + v + "'></i>";
    }).join("") + "</div>";
  }

  global.UI = {
    esc: esc, el: el, tierClass: tierClass, meter: meter, pct: pct, hrs: hrs,
    metaLine: metaLine, lockNote: lockNote, redact: redact,
    wireCopy: wireCopy, radar: radar, spark: spark
  };
})(window);