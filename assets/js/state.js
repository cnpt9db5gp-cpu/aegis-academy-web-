/* ============================================================
   AEGIS :: STATE
   Raw actions are stored; XP, ranks, unlocks and commendations
   are all derived, so they can never drift out of sync.
   ============================================================ */
(function (global) {
  "use strict";

  var CATALOG = null, CONCEPTS = null, SEARCH = null;
  var LS_KEY = "aegis.progress.v1";

  var progress = blank();

  function blank() {
    return {
      version: 1,
      created: today(),
      lectures: {},   // id -> { done:bool, at:iso, score:0..1 }
      labs: {},       // id -> { done:bool, at:iso }
      ctf: [],        // { id, name, platform, difficulty, solved, date, writeup }
      notes: {},      // lectureId -> scratch text
      badges: {},     // badgeId -> iso
      streak: { current: 0, best: 0, last: null },
      history: []     // { d:'YYYY-MM-DD', lectures:int, labs:int, xp:int }
    };
  }

  function today() { return new Date().toISOString().slice(0, 10); }

  // ---------- lecture / lab lookup ----------
  var L = {};
  function indexLectures() {
    L = {};
    CATALOG.courses.forEach(function (c) {
      c.lectures.forEach(function (l) {
        L[l.id] = { lec: l, course: c };
      });
    });
  }

  // ---------- derived ----------
  function isDone(id) { return !!(progress.lectures[id] && progress.lectures[id].done); }
  function isLabDone(id) { return !!(progress.labs[id] && progress.labs[id].done); }

  function totalLectures() {
    return Object.keys(L).length;
  }
  function doneCount() {
    return Object.keys(progress.lectures).filter(function (k) { return progress.lectures[k].done; }).length;
  }

  function xpTotal() {
    var xp = 0;
    Object.keys(progress.lectures).forEach(function (id) {
      var e = progress.lectures[id];
      if (!e.done || !L[id]) return;
      xp += L[id].lec.xp || CATALOG.xp.lecture_complete;
      if (e.score === 1) xp += CATALOG.xp.quiz_perfect;
    });
    Object.keys(progress.labs).forEach(function (k) {
      if (progress.labs[k].done) xp += CATALOG.xp.lab_complete;
    });
    (progress.ctf || []).forEach(function (c) {
      if (!c.solved) return;
      var base = { easy: CATALOG.xp.ctf_easy, medium: CATALOG.xp.ctf_medium, hard: CATALOG.xp.ctf_hard }[c.difficulty];
      xp += base || CATALOG.xp.ctf_easy;
    });
    // tier bonuses
    CATALOG.tiers.forEach(function (t) {
      if (tierCleared(t.id)) xp += t.xp_bonus || CATALOG.xp.tier_bonus;
    });
    return xp;
  }

  function rank() {
    var xp = xpTotal(), cur = CATALOG.ranks[0];
    CATALOG.ranks.forEach(function (r) { if (xp >= r.min_xp) cur = r; });
    var next = null;
    CATALOG.ranks.forEach(function (r) { if (r.min_xp > xp) next = r; });
    return {
      current: cur, next: next, xp: xp,
      into: cur.min_xp,
      span: next ? next.min_xp - cur.min_xp : 1,
      progress: next ? Math.min(1, (xp - cur.min_xp) / (next.min_xp - cur.min_xp)) : 1
    };
  }

  function tierLectures(tierId) {
    var out = [];
    CATALOG.courses.forEach(function (c) {
      if (c.tier === tierId) c.lectures.forEach(function (l) { out.push(l.id); });
    });
    return out;
  }

  function tierStats(tierId) {
    var ids = tierLectures(tierId), done = 0, scored = [], perfect = 0;
    ids.forEach(function (id) {
      var e = progress.lectures[id];
      if (e && e.done) {
        done++;
        if (typeof e.score === "number") {
          scored.push(e.score);
          if (e.score === 1) perfect++;
        }
      }
    });
    var pct = ids.length ? done / ids.length : 0;
    var quiz = scored.length ? scored.reduce(function (a, b) { return a + b; }, 0) / scored.length : 0;
    var t = CATALOG.tiers.filter(function (x) { return x.id === tierId; })[0];
    var need = (t && t.unlock) || { completion: 0.7, quiz: 0.6 };
    return {
      total: ids.length, done: done, pct: pct, quiz: quiz, perfect: perfect,
      cleared: pct >= 1,
      meetsGate: pct >= need.completion && (ids.length === 0 || quiz >= need.quiz)
    };
  }

  function tierCleared(tierId) {
    var s = tierStats(tierId);
    return s.total > 0 && s.pct >= 1;
  }

  function tierUnlocked(tierId) {
    var t = CATALOG.tiers.filter(function (x) { return x.id === tierId; })[0];
    if (!t) return false;
    if (!t.unlock) return true;                       // tier 0 always open
    var prev = tierStats(t.unlock.tier);
    return prev.pct >= t.unlock.completion &&
           (prev.total === 0 ? true : prev.quiz >= t.unlock.quiz);
  }

  function currentTier() {
    for (var i = 0; i < CATALOG.tiers.length; i++) {
      var t = CATALOG.tiers[i];
      if (tierUnlocked(t.id) && !tierStats(t.id).cleared) return t;
    }
    return CATALOG.tiers[CATALOG.tiers.length - 1];
  }

  function courseStats(courseId) {
    var c = CATALOG.courses.filter(function (x) { return x.id === courseId; })[0];
    if (!c) return { total: 0, done: 0, pct: 0 };
    var done = c.lectures.filter(function (l) { return isDone(l.id); }).length;
    return { total: c.lectures.length, done: done, pct: c.lectures.length ? done / c.lectures.length : 0 };
  }

  // ---------- domain mastery ----------
  function domainMastery() {
    var out = {};
    CATALOG.domains.forEach(function (d) {
      var total = 0, done = 0;
      CATALOG.courses.forEach(function (c) {
        if (c.domains.indexOf(d.id) === -1) return;
        c.lectures.forEach(function (l) { total++; if (isDone(l.id)) done++; });
      });
      out[d.id] = { label: d.label, total: total, done: done, pct: total ? done / total : 0 };
    });
    return out;
  }

  // ---------- concepts ----------
  function conceptsSeen() {
    return Object.keys(progress.lectures).filter(function (id) {
      return progress.lectures[id].done && L[id];
    }).length;
  }

  // ---------- actions ----------
  function touchDay(what) {
    var d = today(), h = null;
    progress.history.forEach(function (e) { if (e.d === d) h = e; });
    if (!h) { h = { d: d, lectures: 0, labs: 0, xp: 0 }; progress.history.push(h); }
    h[what] = (h[what] || 0) + 1;
    if (progress.history.length > 400) progress.history = progress.history.slice(-400);
  }

  function updateStreak() {
    var d = today(), s = progress.streak;
    if (s.last === d) return;
    var y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    s.current = s.last === y ? s.current + 1 : 1;
    s.last = d;
    if (s.current > s.best) s.best = s.current;
  }

  function setLecture(id, done, score) {
    var e = progress.lectures[id] || (progress.lectures[id] = { done: false });
    var was = e.done;
    e.done = !!done;
    if (score !== undefined) e.score = score;
    if (e.done && !was) { e.at = new Date().toISOString(); touchDay("lectures"); updateStreak(); }
    if (!e.done && was) { delete e.at; }
    return e;
  }

  function setLab(id, done) {
    var e = progress.labs[id] || (progress.labs[id] = { done: false });
    var was = e.done;
    e.done = !!done;
    if (e.done && !was) { e.at = new Date().toISOString(); touchDay("labs"); updateStreak(); }
    if (!e.done && was) { delete e.at; }
    return e;
  }

  function setNote(id, text) { progress.notes[id] = text; }

  // ---------- commendations ----------
  function evaluateBadges() {
    var newly = [];
    CATALOG.badges.forEach(function (b) {
      if (progress.badges[b.id]) return;
      if (meets(b.rule)) {
        progress.badges[b.id] = new Date().toISOString();
        newly.push(b);
      }
    });
    return newly;
  }

  function meets(r) {
    var xp, i, m;
    switch (r.type) {
      case "lectures_done": return doneCount() >= r.n;
      case "labs_done":
        if (r.domain) {
          var n2 = 0;
          Object.keys(progress.labs).forEach(function (k) {
            if (!progress.labs[k].done || !L[k]) return;
            if (L[k].course.domains.indexOf(r.domain) !== -1) n2++;
          });
          return n2 >= r.n;
        }
        return Object.keys(progress.labs).filter(function (k) { return progress.labs[k].done; }).length >= r.n;
      case "tier_lectures":
        var n = 0;
        (r.tiers || []).forEach(function (t) {
          tierLectures(t).forEach(function (id) { if (isDone(id)) n++; });
        });
        return n >= r.n;
      case "tier_cleared": return tierCleared(r.tier);
      case "quiz_perfect": return Object.keys(progress.lectures).filter(function (k) {
        return progress.lectures[k].done && progress.lectures[k].score === 1;
      }).length >= r.n;
      case "streak": return progress.streak.best >= r.n;
      case "xp_reached": return xpTotal() >= r.n;
      case "rank_reached": {
        var target = CATALOG.ranks.filter(function (y) { return y.id === r.rank; })[0];
        return target ? rank().current.min_xp >= target.min_xp : false;
      }
      case "domain_mastery": return domainMastery()[r.domain].pct >= r.pct;
      case "domain_count": return Object.keys(domainMastery()).filter(function (k) {
        return domainMastery()[k].pct >= r.pct;
      }).length >= r.n;
      case "ctf_solved": return (progress.ctf || []).filter(function (c) { return c.solved; }).length >= r.n;
      case "concepts_seen": return conceptsSeen() >= r.n;
      case "flag_captured": return (progress.ctf || []).filter(function (c) {
        return c.solved && c.kind === r.kind;
      }).length >= 1;
      case "lab_done": return Object.keys(progress.labs).filter(function (k) {
        return progress.labs[k].done && k.indexOf(r.match) !== -1;
      }).length >= r.n;
    }
    return false;
  }

  function earnedBadges() { return Object.keys(progress.badges).length; }

  // ---------- persistence ----------
  function load() {
    try {
      var raw = global.localStorage.getItem(LS_KEY);
      if (raw) progress = Object.assign(blank(), JSON.parse(raw));
    } catch (e) { /* corrupted local state - start clean rather than crash */ }
    if (!CATALOG) return;
    indexLectures();
  }

  function saveLocal() {
    try { global.localStorage.setItem(LS_KEY, JSON.stringify(progress)); } catch (e) {}
  }

  function fetchRemote(ok, fail) {
    fetch("api/progress", { method: "GET" }).then(function (r) {
      if (!r.ok) throw 0;
      return r.json();
    }).then(function (d) {
      if (d && d.progress) {
        progress = Object.assign(blank(), d.progress);
        indexLectures(); saveLocal(); ok();
      } else ok();
    }).catch(function () { ok(); });
  }

  function pushRemote(cb) {
    saveLocal();
    fetch("api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: progress })
    }).then(function (r) {
      // 405 means the deployment is read-only - a shared or published
      // copy, where writing would mean pushing commits to whoever owns
      // the repo. That is expected there, not a failure to report, and
      // localStorage already has everything.
      if (r.status === 405) { READONLY_DEPLOY = true; cb(false); return; }
      cb(!!r.ok);
    }).catch(function () { cb(false); });
  }

  // Set once the server has told us it will not accept writes. Progress
  // still saves - to this browser. It just is not version-controlled.
  var READONLY_DEPLOY = false;

  global.State = {
    init: function (catalog, concepts, search) {
      // catalog.json stores courses keyed by id (YAML becomes a dict);
      // the views all expect an array, so normalise once, here.
      if (catalog.courses && !Array.isArray(catalog.courses)) {
        catalog.courses = Object.keys(catalog.courses)
          .map(function (k) { return catalog.courses[k]; })
          .sort(function (a, b) { return a.tier - b.tier || a.title.localeCompare(b.title); });
      }
      CATALOG = catalog; CONCEPTS = concepts; SEARCH = search;
      indexLectures(); load();
    },
    reload: function () { indexLectures(); },
    get catalog() { return CATALOG; },
    get concepts() { return CONCEPTS; },
    get search() { return SEARCH; },
    get progress() { return progress; },
    get readonly() { return READONLY_DEPLOY; },
    get lectureMap() { return L; },
    today: today,
    isDone: isDone, isLabDone: isLabDone,
    setLecture: setLecture, setLab: setLab, setNote: setNote,
    xpTotal: xpTotal, rank: rank, domainMastery: domainMastery,
    tierStats: tierStats, tierCleared: tierCleared, tierUnlocked: tierUnlocked,
    tierLectures: tierLectures, currentTier: currentTier, courseStats: courseStats,
    totalLectures: totalLectures, doneCount: doneCount, conceptsSeen: conceptsSeen,
    evaluateBadges: evaluateBadges, earnedBadges: earnedBadges,
    saveLocal: saveLocal, load: load, fetchRemote: fetchRemote, pushRemote: pushRemote,
    blank: blank
  };
})(window);