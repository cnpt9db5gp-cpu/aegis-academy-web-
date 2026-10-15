/* ============================================================
   AEGIS :: APP SHELL + ROUTER + COMMAND PALETTE
   ============================================================ */
(function (global) {
  "use strict";
  var S = global.State, U = global.UI;

  var NAV = [
    { id: "", label: "Case Board", docket: "AEGIS-000", route: "" },
    { id: "tiers", label: "Tiers", docket: "T-000", route: "ladder" },
    { id: "courses", label: "Courses", docket: "C-100", route: "courses" },
    { id: "graph", label: "Graph", docket: "K-900", route: "graph" },
    { id: "ctf", label: "CTF Log", docket: "X-400", route: "ctf" },
    { id: "doctrine", label: "Doctrine", docket: "D-800", route: "doctrine" }
  ];

  var route = "";

  function boot() {
    Promise.all([
      fetch("build/catalog.json").then(function (r) { return r.json(); }),
      fetch("build/concepts.json").then(function (r) { return r.json(); }),
      fetch("build/search-index.json").then(function (r) { return r.json(); })
    ]).then(function (res) {
      S.init(res[0], res[1], res[2]);
      S.fetchRemote(function () {
        renderShell();
        parseHash();
        wireGlobal();
        tickClock();
      });
    }).catch(function (e) {
      document.getElementById("main").innerHTML =
        "<div class='phead'><div class='phead__text'><div class='phead__docket'>BOOT FAILURE</div>" +
        "<h1 class='phead__title'>Startup Error</h1>" +
        "<p class='phead__sub'>" + (e && e.message ? e.message : e) + "</p>" +
        "<p class='phead__sub'>If the build data is missing, run " +
        "<code>python3 tools/build.py</code>. See the browser console for detail.</p></div></div>";
      console.error(e);
    });
  }

  /* ---------------- shell ---------------- */
  function renderShell() {
    var r = S.rank(), p = S.progress;
    document.getElementById("rank-name").textContent = r.current.name;
    document.getElementById("rank-insignia").textContent = r.current.insignia;
    document.getElementById("rank-xp").textContent = r.xp.toLocaleString() + " MERIT PTS";
    document.getElementById("nav").innerHTML = NAV.map(function (n) {
      return `<div class='navitem' data-route='${n.route}'>
        <span class='navitem__docket'>${n.docket}</span>
        <span>${U.esc(n.label)}</span>
        <span class='navitem__count' data-count='${n.id}'></span></div>`;
    }).join("");
    document.querySelectorAll("[data-route]").forEach(function (el) {
      el.onclick = function () { go(el.getAttribute("data-route")); };
    });
  }

  function tickClock() {
    function t() {
      var el = document.getElementById("clock");
      if (el) el.textContent = new Date().toLocaleString("en-GB", {
        weekday: "short", day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      }) + " LOCAL";
    }
    t(); setInterval(t, 30000);
  }

  function setActive(route) {
    document.querySelectorAll(".navitem").forEach(function (el) {
      var r = el.getAttribute("data-route");
      var active = (r === route) || (r !== "" && route.indexOf(r) === 0);
      el.classList.toggle("is-active", active);
    });
    document.querySelectorAll("[data-count]").forEach(function (el) {
      var id = el.getAttribute("data-count");
      if (id === "") el.textContent = U.pct(S.totalLectures() ? S.doneCount() / S.totalLectures() : 0);
      if (id === "courses") el.textContent = S.catalog.courses.length;
      if (id === "graph") el.textContent = Object.keys(S.concepts).length;
      if (id === "ctf") el.textContent = (S.progress.ctf || []).length;
      if (id === "tiers") el.textContent = S.catalog.tiers.length;
    });
  }

  /* ---------------- router ---------------- */
  function parseHash() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    route = h;
    draw();
  }

  function go(r) {
    location.hash = "#/" + r;
  }

  function draw() {
    try {
      drawInner();
    } catch (e) {
      // A view that throws used to leave the page exactly as it was,
      // which reads as "I clicked and nothing happened". Silent failure
      // is the worst possible outcome for a learner: they retry, they
      // conclude the site is broken, and they never find out why.
      // Say what happened, where, and what they were trying to open.
      var main = document.getElementById("main");
      if (main) {
        main.innerHTML =
          "<div class='wrap'><div class='phead'><div class='phead__text'>" +
          "<div class='phead__docket'>RENDER FAULT</div>" +
          "<h1 class='phead__title'>This view could not be drawn</h1>" +
          "<p class='phead__sub'>You asked for <code>" +
          escText(location.hash || "/") + "</code>.</p>" +
          "<p class='phead__sub'><b>" + escText(String(e && e.message || e)) +
          "</b></p>" +
          "<p class='phead__sub'>Press F12 and send the console line " +
          "beginning <code>app.js</code> - that is the whole diagnosis. " +
          "Your progress is safe and saved.</p>" +
          "<p class='phead__sub'><a href='#/'>Return to the case board" +
          "</a></p></div></div></div>";
      }
      if (global.console) console.error("AEGIS draw failed:", e);
    }
  }

  function escText(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function drawInner() {
    var parts = route.split("/").filter(Boolean);
    var view;
    var head = parts[0];
    if (!head) view = global.ViewsA.dashboard();
    else if (head === "tier") view = global.ViewsA.tier(parseInt(parts[1], 10));
    else if (head === "courses") view = global.ViewsA.courses();
    else if (head === "course") view = global.ViewsA.course(parts[1]);
    else if (head === "lecture") view = global.ViewsB.lecture(parts[1]);
    else if (head === "concept") view = global.ViewsB.concept(parts[1]);
    else if (head === "graph") view = global.ViewsB.graph();
    else if (head === "ctf") view = global.ViewsB.ctf();
    else if (head === "doctrine") view = global.ViewsB.doctrine();
    else if (head === "doc") view = global.ViewsB.doc(parts[1]);
    else view = global.ViewsA.dashboard();

    var main = document.getElementById("main");
    main.innerHTML = '<div class="wrap">' + view.html + "</div>";
    main.scrollTop = 0;
    global.scrollTo(0, 0);
    if (view.mount) view.mount(main);
    U.wireCopy(main);
    setActive(head || "");
    document.title = "AEGIS // " + (head || "Case Board").toUpperCase();
  }

  /* ---------------- after any state change ---------------- */
  function afterChange() {
    var newly = S.evaluateBadges();
    var pn = document.getElementById("persist-note");
    if (pn && S.readonly) {
      pn.textContent = "PROGRESS SAVED IN THIS BROWSER ONLY";
    }
    S.saveLocal();
    S.pushRemote(function () {});
    var r = S.rank();
    document.getElementById("rank-name").textContent = r.current.name;
    document.getElementById("rank-insignia").textContent = r.current.insignia;
    document.getElementById("rank-xp").textContent = r.xp.toLocaleString() + " MERIT PTS";
    if (newly.length) {
      newly.forEach(function (b, i) {
        setTimeout(function () { toast("COMMENDATION: " + b.name); }, i * 1600);
      });
    }
  }

  var toastT = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove("is-on"); }, 3200);
  }

  /* ---------------- command palette ---------------- */
  var paletteSel = -1, paletteRows = [];

  function openPalette() {
    document.getElementById("palette").classList.add("is-open");
    var i = document.getElementById("p-input");
    i.value = ""; runPalette("");
    setTimeout(function () { i.focus(); }, 10);
  }
  function closePalette() {
    document.getElementById("palette").classList.remove("is-open");
  }

  function runPalette(q) {
    q = q.trim().toLowerCase();
    var idx = S.search;
    paletteRows = idx.filter(function (r) {
      if (!q) return r.k === "concept" ? false : true;
      return (r.t + " " + r.s + " " + (r.b || "")).toLowerCase().indexOf(q) !== -1;
    }).slice(0, 40);
    paletteSel = paletteRows.length ? 0 : -1;
    paintPalette();
  }

  function paintPalette() {
    document.getElementById("p-results").innerHTML = paletteRows.map(function (r, i) {
      return `<div class='palette__item ${i === paletteSel ? "is-sel" : ""}' data-i='${i}'>
        <span class='kind'>${U.esc(r.k)}</span><span>${U.esc(r.t)}</span>
        <span class='sub'>${U.esc(r.s)}</span></div>`;
    }).join("") || "<div class='palette__item'><span class='kind'>NONE</span><span>No matches</span></div>";
    document.querySelectorAll("#p-results [data-i]").forEach(function (el) {
      el.onclick = function () { pick(parseInt(el.getAttribute("data-i"), 10)); };
      el.onmouseenter = function () { paletteSel = parseInt(el.getAttribute("data-i"), 10); paintPalette(); };
    });
  }

  function pick(i) {
    var r = paletteRows[i];
    if (!r) return;
    closePalette();
    go(r.u.replace(/^#\//, ""));
  }

  function wireGlobal() {
    global.addEventListener("hashchange", parseHash);
    document.addEventListener("keydown", function (ev) {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") { ev.preventDefault(); openPalette(); return; }
      if (ev.key === "Escape") { closePalette(); return; }
      if (document.getElementById("palette").classList.contains("is-open")) {
        if (ev.key === "ArrowDown") { ev.preventDefault(); paletteSel = Math.min(paletteSel + 1, paletteRows.length - 1); paintPalette(); }
        if (ev.key === "ArrowUp") { ev.preventDefault(); paletteSel = Math.max(paletteSel - 1, 0); paintPalette(); }
        if (ev.key === "Enter") { ev.preventDefault(); pick(paletteSel); }
      }
    });
    document.getElementById("p-input").oninput = function (e) { runPalette(e.target.value); };
    document.getElementById("palette").onclick = function (e) { if (e.target.id === "palette") closePalette(); };
    document.getElementById("p-close").onclick = closePalette;
    var tg = document.getElementById("rail-toggle");
    if (tg) tg.onclick = function () { document.getElementById("rail").classList.toggle("is-open"); };
    window.addEventListener("beforeunload", function () { S.saveLocal(); });
  }

  global.App = { boot: boot, go: go, draw: draw, afterChange: afterChange, toast: toast };
  document.addEventListener("DOMContentLoaded", boot);
})(window);