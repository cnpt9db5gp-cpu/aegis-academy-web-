/* ============================================================
   AEGIS :: VIEWS A - dashboard, ladder, courses
   ============================================================ */
(function (global) {
  "use strict";
  var S = global.State, U = global.UI, esc = U.esc;
  var meter = U.meter, pct = U.pct, hrs = U.hrs, tierClass = U.tierClass;
  var V = {};

  /* ---------------- DASHBOARD ---------------- */
  V.dashboard = function () {
    var C = S.catalog, r = S.rank(), st = S.tierStats, cur = S.currentTier();
    var curStats = st(cur.id), mastery = S.domainMastery();
    var done = S.doneCount(), total = S.totalLectures();
    var p = S.progress;

    var locked = C.tiers.filter(function (t) { return !S.tierUnlocked(t.id); });
    var recentLectures = C.courses.reduce(function (acc, c) {
      c.lectures.forEach(function (l) {
        var e = p.lectures[l.id];
        if (e && e.at) acc.push({ l: l, c: c, at: e.at });
      });
      return acc;
    }, []).sort(function (a, b) { return b.at.localeCompare(a.at); }).slice(0, 6);

    var earned = C.badges.filter(function (b) { return p.badges[b.id]; });

    var html = `
      <div class='phead'>
        <div class='phead__text'>
          <div class='phead__docket'>DOSSIER AEGIS-000 // OPERATIONAL OVERVIEW</div>
          <h1 class='phead__title'>Training Dashboard</h1>
          <p class='phead__sub'>Current posting: <b style='color:var(--brass-lo)'>T${String(cur.id).padStart(2,"0")} ${esc(cur.name)}</b>
          ${curStats.total ? " - " + curStats.done + "/" + curStats.total + " lectures complete, " + U.pct(curStats.pct) : ""}</p>
        </div>
        <div class='phead__aside'>
          <div class='stamp'>${esc(r.current.name)}</div>
        </div>
      </div>

      <div class='stat-row'>
        <div class='stat stat--brass'>
          <div class='stat__label'>Merit Points</div>
          <div class='stat__value'>${r.xp.toLocaleString()}</div>
          <div class='stat__note'>${r.next ? U.pct(r.progress) + " to " + esc(r.next.name) : "MAXIMUM RANK"}</div>
          ${meter(r.progress, 14)}
        </div>
        <div class='stat'>
          <div class='stat__label'>Lectures Cleared</div>
          <div class='stat__value'>${done}<small>/${total}</small></div>
          <div class='stat__note'>${U.pct(total ? done / total : 0)} of catalogue</div>
        </div>
        <div class='stat'>
          <div class='stat__label'>Active Duty Streak</div>
          <div class='stat__value'>${p.streak.current}<small>d</small></div>
          <div class='stat__note'>Best: ${p.streak.best} days</div>
        </div>
        <div class='stat'>
          <div class='stat__label'>Commendations</div>
          <div class='stat__value'>${earned.length}<small>/${C.badges.length}</small></div>
          <div class='stat__note'>${C.badges.length - earned.length} remaining</div>
        </div>
        <div class='stat'>
          <div class='stat__label'>Tiers Cleared</div>
          <div class='stat__value'>${C.tiers.filter(function (t) { return S.tierCleared(t.id); }).length}<small>/${C.tiers.length}</small></div>
          <div class='stat__note'>${locked.length} sealed</div>
        </div>
        <div class='stat'>
          <div class='stat__label'>CTF Solved</div>
          <div class='stat__value'>${(p.ctf || []).filter(function (c) { return c.solved; }).length}</div>
          <div class='stat__note'>of ${(p.ctf || []).length} logged</div>
        </div>
      </div>

      <div class='sect'>
        <div class='sect__head'><h3>Domain Mastery</h3><div class='rule'></div>
          <span class='hint'>COMPLETION BY DISCIPLINE</span></div>
        <div class='grid grid--wide'>
          <div class='card card--pad'>${U.radar(C.domains, mastery)}</div>
          <div class='card'>
            <div class='card__strip'><span>DISCIPLINE LEDGER</span><div class='spacer'></div><span>${Object.keys(mastery).length} DOMAINS</span></div>
            <div class='card__body'>
              <table class='tbl'>
                <thead><tr><th>DOMAIN</th><th class='num'>DONE</th><th style='width:44%'>STATUS</th></tr></thead>
                <tbody>${C.domains.map(function (d) {
                  var m = mastery[d.id];
                  return `<tr><td>${esc(d.label)}</td><td class='num muted'>${m.done}/${m.total}</td>
                    <td>${U.meter(m.pct, 12)}</td></tr>`;
                }).join("")}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class='sect'>
        <div class='sect__head'><h3>Operational Tempo</h3><div class='rule'></div>
          <span class='hint'>LAST 28 DAYS</span></div>
        <div class='card card--pad'>${U.spark(p.history)}
          <div class='meter__label'><span>${p.history.length} DAYS ON RECORD</span>
            <span>${p.history.reduce(function (a, d) { return a + (d.lectures || 0) + (d.labs || 0); }, 0)} ACTIVITIES</span></div>
        </div>
      </div>

      <div class='sect'>
        <div class='sect__head'><h3>Progression Ladder</h3><div class='rule'></div>
          <span class='hint'>CLICK A TIER TO INSPECT</span></div>
        <div class='ladder'>${C.tiers.map(function (t) {
          var s = st(t.id), unlocked = S.tierUnlocked(t.id), isCur = t.id === cur.id;
          return `<div class='rung ${U.tierClass(t.id)} ${unlocked ? "" : "is-locked"} ${isCur ? "is-current" : ""}' data-go='tier/${t.id}'>
            <div class='rung__no'>${String(t.id).padStart(2, "0")}</div>
            <div><div class='rung__name'>${esc(t.name)}</div>
              <div class='rung__desc'>${unlocked ? esc(t.summary.slice(0, 92)) + "&hellip;" : "<span class='rung__lock'>SEALED</span>"}</div></div>
            <div class='rung__right'>
              <div class='rung__pct'>${s.done}/${s.total}</div>
              ${U.meter(s.pct, 8, 'meter--sm')}
            </div></div>`;
        }).join("")}</div>
      </div>

      <div class='sect'>
        <div class='sect__head'><h3>Recent Activity</h3><div class='rule'></div></div>
        ${recentLectures.length ? `<table class='tbl'><tbody>${recentLectures.map(function (x) {
          return `<tr data-go='lecture/${x.l.id}' style='cursor:pointer'>
            <td class='muted'>${x.at.slice(0, 10)}</td>
            <td>${esc(x.l.title)}</td>
            <td class='muted'>${esc(x.c.title)}</td>
            <td class='num' style='color:var(--brass)'>+${x.l.xp} XP</td></tr>`;
        }).join("")}</tbody></table>`
        : "<p class='tagline'>NO ACTIVITY RECORDED. OPEN YOUR FIRST DOSSIER TO BEGIN.</p>"}
      </div>

      <div class='sect'>
        <div class='sect__head'><h3>Commendations</h3><div class='rule'></div>
          <span class='hint'>${earned.length} / ${C.badges.length} EARNED</span></div>
        <div class='medal-grid'>${C.badges.slice(0, 12).map(function (b) {
          var on = !!p.badges[b.id];
          return `<div class='medal ${on ? "is-earned" : "is-locked"}'>
            <div class='medal__icon'>${esc(b.icon)}</div>
            <div class='medal__name'>${esc(b.name)}</div>
            <div class='medal__desc'>${esc(b.desc)}</div></div>`;
        }).join("")}</div>
      </div>`;

    return { html: html, mount: afterMount };
  };

  function afterMount(root) {
    root.querySelectorAll("[data-go]").forEach(function (el) {
      el.onclick = function () { global.App.go(el.getAttribute("data-go")); };
    });
  }

  /* ---------------- TIER ---------------- */
  V.tier = function (id) {
    var C = S.catalog, t = C.tiers.filter(function (x) { return x.id === id; })[0];
    if (!t) return notFound();
    var s = S.tierStats(id), unlocked = S.tierUnlocked(id);
    var courses = C.courses.filter(function (c) { return c.tier === id; });

    var html = `
      <div class='phead ${U.tierClass(id)}'>
        <div class='phead__text'>
          <div class='phead__docket'>DOSSIER T${String(id).padStart(2, "0")} // ${esc(t.rank)} CLEARANCE</div>
          <h1 class='phead__title'>${esc(t.name)}</h1>
          <p class='phead__sub'>${esc(t.summary)}</p>
        </div>
        <div class='phead__aside'>${s.cleared
          ? "<div class='stamp stamp--green'>CLEARED</div>"
          : unlocked ? "<div class='stamp'>ACTIVE</div>"
          : "<div class='stamp stamp--red'>SEALED</div>"}</div>
      </div>

      ${!unlocked ? U.lockNote(t) : `
      <div class='stat-row'>
        <div class='stat'><div class='stat__label'>Lectures</div>
          <div class='stat__value'>${s.done}<small>/${s.total}</small></div></div>
        <div class='stat'><div class='stat__label'>Completion</div>
          <div class='stat__value'>${U.pct(s.pct)}</div>${U.meter(s.pct, 14)}</div>
        <div class='stat'><div class='stat__label'>Avg Self-Test</div>
          <div class='stat__value'>${U.pct(s.quiz)}</div></div>
        <div class='stat'><div class='stat__label'>Perfect Scores</div>
          <div class='stat__value'>${s.perfect}</div></div>
        <div class='stat'><div class='stat__label'>Tier Bonus</div>
          <div class='stat__value'>${t.xp_bonus}<small>XP</small></div></div>
      </div>

      <div class='sect'><div class='sect__head'><h3>Doctrine Focus</h3><div class='rule'></div></div>
        <div class='card card--pad'><ul style='margin:0;padding-left:20px;color:var(--ink-muted)'>
        ${t.focus.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("")}</ul></div></div>

      <div class='sect'><div class='sect__head'><h3>Courses in This Tier</h3><div class='rule'></div>
        <span class='hint'>${courses.length} DOSSIERS</span></div>
        <div class='grid grid--cards'>${courses.map(courseCard).join("")}</div></div>`}
    `;

    return { html: html, mount: afterMount };
  };

  /* ---------------- COURSE CARD ---------------- */
  function courseCard(c) {
    var s = S.courseStats(c.id), locked = !S.tierUnlocked(c.tier);
    return `<div class='card is-link ${U.tierClass(c.tier)} ${locked ? "is-locked" : ""}' data-go='course/${c.id}'>
      <div class='card__strip'>
        <span class='tdot'></span><span>T${String(c.tier).padStart(2, "0")}</span>
        <div class='spacer'></div><span>${esc(c.kind.toUpperCase())}</span>
      </div>
      <div class='card__body'>
        <div class='card__title'>${esc(c.title)}</div>
        <div class='card__meta'>${esc(c.provider)}${c.code ? " &middot; " + esc(c.code) : ""}</div>
        <p style='color:var(--ink-muted);font-size:12.5px;margin:10px 0 12px'>
          ${locked ? U.redact(c.blurb.slice(0, 96)) + "&hellip;" : esc(c.blurb.slice(0, 150)) + (c.blurb.length > 150 ? "&hellip;" : "")}</p>
        ${U.meter(s.pct, 16)}
        <div class='meter__label'><span>${s.done}/${s.total} LECTURES</span>
          <span>${locked ? "SEALED" : U.pct(s.pct)}</span></div>
      </div></div>`;
  }

  /* ---------------- COURSE ---------------- */
  V.course = function (id) {
    var c = S.catalog.courses.filter(function (x) { return x.id === id; })[0];
    if (!c) return notFound();
    var s = S.courseStats(id), unlocked = S.tierUnlocked(c.tier);

    var lec = c.lectures.map(function (l, i) {
      var done = S.isDone(l.id), e = S.progress.lectures[l.id];
      return `<div class='card is-link' data-go='lecture/${l.id}'>
        <div class='card__strip'>
          <span>${String(i + 1).padStart(2, "0")}</span>
          <div class='spacer'></div>
          ${e && e.score === 1 ? "<span style='color:var(--cleared)'>PERFECT</span>" : ""}
          ${l.video ? "<span>HAS VIDEO</span>" : "<span>READING</span>"}
          <span style='color:${done ? "var(--brass)" : "var(--ink-faint)"}'>${done ? "CLEARED" : "PENDING"}</span>
        </div>
        <div class='card__body' style='padding-top:11px'>
          <div class='card__title' style='font-size:18px;margin-top:0'>${esc(l.title)}</div>
          <div class='card__meta'>
            ${U.hrs(l.duration)} &nbsp;·&nbsp; ${l.concepts.length} CONCEPTS &nbsp;·&nbsp;
            <span style='color:var(--brass)'>${l.xp} XP</span>
          </div>
        </div></div>`;
    }).join("");

    var html = `
      <div class='phead ${U.tierClass(c.tier)}'>
        <div class='phead__text'>
          <div class='phead__docket'>${U.metaLine(c)}</div>
          <h1 class='phead__title'>${esc(c.title)}</h1>
          ${c.why ? `<p class='phead__sub'><b style='color:var(--brass-lo)'>WHY THIS COURSE:</b> ${esc(c.why)}</p>` : ""}
        </div>
        <div class='phead__aside'>${unlocked ? "<div class='stamp'>OPEN</div>" : "<div class='stamp stamp--red'>SEALED</div>"}</div>
      </div>

      <div class='grid grid--wide'>
        <div class='card card--pad'>
          <div class='card__meta' style='letter-spacing:.14em;text-transform:uppercase;margin-bottom:10px'>BRIEFING</div>
          <p style='color:var(--ink);margin:0 0 16px'>${esc(c.blurb)}</p>
          ${U.meter(s.pct, 20)}
          <div class='meter__label'><span>${s.done} OF ${s.total} CLEARED</span><span>${U.pct(s.pct)}</span></div>
        </div>
        <div class='card'>
          <div class='card__strip'><span>SOURCE DOSSIER</span><div class='spacer'></div>
            <span style='color:${c.verification === "verified" ? "var(--cleared)" : "var(--alert)"}'>${esc(String(c.verification).toUpperCase())}</span></div>
          <div class='card__body'><dl class='kv'>
            <dt>Provider</dt><dd>${esc(c.provider)}</dd>
            <dt>Institution</dt><dd>${esc(c.institution)}</dd>
            <dt>Format</dt><dd>${esc(c.kind)}</dd>
            <dt>Level</dt><dd>${esc(c.level)}</dd>
            <dt>Tier</dt><dd>T${String(c.tier).padStart(2, "0")}</dd>
            ${c.url ? `<dt>Source</dt><dd><a href='${esc(c.url)}' target='_blank' rel='noopener'>${esc(c.url)}</a></dd>` : ""}
            ${c.playlist ? `<dt>Playlist</dt><dd><a href='https://www.youtube.com/playlist?list=${esc(c.playlist)}' target='_blank' rel='noopener'>YouTube playlist</a></dd>` : ""}
          </dl></div>
        </div>
      </div>

      <div class='sect'><div class='sect__head'><h3>Lecture Roster</h3><div class='rule'></div>
        <span class='hint'>${c.lectures.length} ENTRIES</span></div>
        ${unlocked ? `<div class='grid grid--cards'>${lec}</div>`
          : U.lockNote(S.catalog.tiers.filter(function (x) { return x.id === c.tier; })[0])}`;

    return { html: html, mount: afterMount };
  };

  /* ---------------- COURSES INDEX ---------------- */
  V.courses = function () {
    var C = S.catalog;
    var byTier = C.tiers.map(function (t) {
      var cs = C.courses.filter(function (c) { return c.tier === t.id; });
      if (!cs.length) return "";
      return `<div class='sect ${U.tierClass(t.id)}'>
        <div class='sect__head'><h3>T${String(t.id).padStart(2, "0")} &middot; ${esc(t.name)}</h3>
          <div class='rule'></div><span class='hint'>${cs.length} DOSSIERS</span></div>
        <div class='grid grid--cards'>${cs.map(courseCard).join("")}</div></div>`;
    }).join("");

    return {
      html: `<div class='phead'><div class='phead__text'>
        <div class='phead__docket'>DOSSIER INDEX // FULL CATALOGUE</div>
        <h1 class='phead__title'>Course Catalog</h1>
        <p class='phead__sub'>${C.courses.length} courses &middot;
          ${C.courses.reduce(function (a, c) { return a + c.lectures.length; }, 0)} lectures &middot;
          every source free and public.</p></div></div>${byTier}`,
      mount: afterMount
    };
  };

  function notFound() {
    return { html: "<div class='phead'><div class='phead__text'><div class='phead__docket'>ERROR 404</div>" +
      "<h1 class='phead__title'>Record Not Found</h1><p class='phead__sub'>That dossier is not in the index.</p></div></div>" };
  }

  global.ViewsA = V;
})(window);