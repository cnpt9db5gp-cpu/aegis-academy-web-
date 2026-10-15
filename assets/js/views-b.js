/* ============================================================
   AEGIS :: VIEWS B - lecture, concept, graph, ctf
   ============================================================ */
(function (global) {
  "use strict";
  var S = global.State, U = global.UI, esc = U.esc;
  var meter = U.meter, pct = U.pct, hrs = U.hrs, tierClass = U.tierClass;
  var V = {};

  /* ---------------- LECTURE ---------------- */
  V.lecture = function (id) {
    var entry = S.lectureMap[id];
    if (!entry) {
      return { html: "<div class='phead'><div class='phead__text'><div class='phead__docket'>ERROR 404</div>" +
        "<h1 class='phead__title'>Lecture Not Found</h1></div></div>" };
    }
    var l = entry.lec, c = entry.course;
    var unlocked = S.tierUnlocked(c.tier);
    var e = S.progress.lectures[id] || {};
    // S.concepts[id] is an index record: { concept: {...}, lectures: [...] }
    var concepts = l.concepts.map(function (cid) {
      var rec = S.concepts[cid];
      var term = rec && rec.concept ? rec.concept.term : cid;
      return `<span class='chip' data-go='concept/${cid}'>${esc(term)}</span>`;
    }).join(" ");

    var related = [];
    l.concepts.forEach(function (cid) {
      var rec = S.concepts[cid];
      if (!rec || !rec.concept) return;
      (rec.concept.related || []).forEach(function (r) {
        if (related.indexOf(r) === -1) related.push(r);
      });
    });
    related = related.slice(0, 10).map(function (rid) {
      var rec = S.concepts[rid];
      var term = rec && rec.concept ? rec.concept.term : rid;
      var n = rec ? rec.lectures.length : 0;
      return `<span class='chip' data-go='concept/${rid}'>${esc(term)} <b style='opacity:.6'>${n}</b></span>`;
    }).join(" ");

    var video = l.video
      ? `<div class='vidbox'><iframe src='https://www.youtube-nocookie.com/embed/${esc(l.video)}'
           allow='accelerometer; clipboard-write; encrypted-media; picture-in-picture'
           allowfullscreen loading='lazy' referrerpolicy='strict-origin-when-cross-origin'></iframe></div>`
      : `<div class='vidbox'><div class='vidbox__fallback'>
           NO DIRECT VIDEO EMBED &middot; READ THE NOTES BELOW<br>
           ${c.url ? `<a href='${esc(c.url)}' target='_blank' rel='noopener'>OPEN OFFICIAL SOURCE →</a>`
                   : "SOURCE: INTERNAL AEGIS DOCTRINE"}
         </div></div>`;

    var noteUrl = "build/notes/" + id + ".html";
    var hasNote = S.catalog.notesRendered.indexOf(id) !== -1;

    var html = `
      <div class='phead ${U.tierClass(c.tier)}'>
        <div class='phead__text'>
          <div class='phead__docket'>${esc(c.code || c.provider)} &middot; ${esc(c.title).toUpperCase()} &middot; T${String(c.tier).padStart(2,"0")}</div>
          <h1 class='phead__title'>${esc(l.title)}</h1>
          <div class='tagline' style='margin-top:8px'>
            ${U.hrs(l.duration)} &nbsp;·&nbsp; ${l.xp} MERIT POINTS &nbsp;·&nbsp; ${l.concepts.length} CONCEPTS
            ${e.at ? " &nbsp;·&nbsp; <span style='color:var(--brass)'>CLEARED " + e.at.slice(0, 10) + "</span>" : ""}
          </div>
        </div>
        <div class='phead__aside'>
          <div class='stamp ${e.done ? "stamp--green" : ""}'>${e.done ? "CLEARED" : "PENDING"}</div>
        </div>
      </div>

      ${!unlocked ? U.lockNote(S.catalog.tiers.filter(function (x) { return x.id === c.tier; })[0]) : `
      <div class='lecture'>
        <div>
          ${video}
          <div class='sect' style='margin-top:18px'>
            <div class='sect__head'><h3>Study Notes</h3><div class='rule'></div>
              <span class='hint'>${hasNote ? "READY" : "PENDING"}</span></div>
            <div class='card card--pad'>
              ${hasNote ? `<div class='note' id='note-body'></div>`
                       : "<p class='tagline'>NOTES FOR THIS LECTURE ARE PENDING. WORK THE CONCEPT LINKS BELOW UNTIL THEY LAND.</p>"}
            </div>
          </div>
          ${(l.quiz || []).length ? `
          <div class='sect'><div class='sect__head'><h3>Self-Test</h3><div class='rule'></div>
            <span class='hint'>${l.quiz.length} QUESTIONS</span></div>
            <div id='quiz'>${l.quiz.map(function (q, qi) {
              return `<div class='quiz__q' data-q='${qi}'>
                <div class='quiz__qtitle'>${qi + 1}. ${esc(q.q)}</div>
                ${q.options.map(function (o, oi) {
                  return `<label class='quiz__opt' data-opt='${oi}'>
                    <input type='radio' name='q${qi}' value='${oi}'><span>${esc(o)}</span></label>`;
                }).join("")}
                <div class='quiz__explain' style='display:none'>${esc(q.why || "")}</div>
              </div>`;
            }).join("")}
            <button class='btn btn--primary' id='quiz-submit'>SUBMIT SELF-TEST</button>
            <span id='quiz-result' class='tagline' style='margin-left:12px'></span>
          </div></div>` : ""}
        </div>

        <div class='lecture__aside'>
          <div class='card'>
            <div class='card__strip'><span>CONNECTED KNOWLEDGE</span></div>
            <div class='card__body'><div style='display:flex;flex-wrap:wrap;gap:6px'>${concepts}</div></div>
          </div>
          ${related ? `<div class='card'>
            <div class='card__strip'><span>ADJACENT TOPICS</span></div>
            <div class='card__body'><div style='display:flex;flex-wrap:wrap;gap:6px'>${related}</div></div>
          </div>` : ""}
          <div class='card'>
            <div class='card__strip'><span>YOUR NOTES</span><div class='spacer'></div><span id='note-saved'></span></div>
            <div class='card__body'>
              <textarea class='scratch' id='scratch' placeholder='Scratchpad. Auto-saves.'>${esc(S.progress.notes[id] || "")}</textarea>
              <div class='scratch__status' id='scratch-status'>PRESSED</div>
            </div>
          </div>
        </div>
      </div>

      <div class='done-bar ${e.done ? "is-done" : ""}'>
        <button class='btn btn--primary' id='mark-done'>${e.done ? "MARKED CLEARED" : "MARK LECTURE CLEARED"}</button>
        <button class='btn' id='mark-lab'>${S.isLabDone(id) ? "FIELD LAB DONE" : "MARK FIELD LAB DONE"}</button>
        <div class='done-bar__xp'>${l.xp} XP${(l.quiz||[]).length ? " + " + S.catalog.xp.quiz_perfect + " XP PERFECT" : ""}</div>
        <div style='flex:1'></div>
        <button class='btn btn--ghost' data-go='course/${c.id}'>← COURSE INDEX</button>
      </div>`}`;

    return {
      html: html,
      mount: function (root) {
        root.querySelectorAll("[data-go]").forEach(function (el) {
          el.onclick = function () { global.App.go(el.getAttribute("data-go")); };
        });

        if (hasNote) {
          fetch(noteUrl).then(function (r) {
            return r.ok ? r.text() : "<p>Notes unavailable.</p>";
          }).then(function (t) {
            var nb = root.querySelector("#note-body");
            if (nb) { nb.innerHTML = t; U.wireCopy(nb); }
          });
        }

        // scratchpad autosave
        var sc = root.querySelector("#scratch"), tmr = null;
        if (sc) sc.oninput = function () {
          S.setNote(id, sc.value);
          clearTimeout(tmr);
          tmr = setTimeout(function () {
            S.saveLocal(); S.pushRemote(function () {});
            var st = root.querySelector("#scratch-status");
            if (st) st.textContent = "SAVED " + new Date().toLocaleTimeString();
          }, 900);
        };

        // quiz
        var sub = root.querySelector("#quiz-submit");
        if (sub) sub.onclick = function () {
          var qs = root.querySelectorAll(".quiz__q"), right = 0, answered = 0;
          qs.forEach(function (qel) {
            var qi = qel.getAttribute("data-q"), q = l.quiz[qi];
            var checked = qel.querySelector("input:checked");
            qel.querySelectorAll(".quiz__opt").forEach(function (o) {
              o.classList.remove("is-right", "is-wrong");
            });
            if (!checked) return;
            answered++;
            var chosen = parseInt(checked.value, 10);
            if (chosen === q.answer) { right++; qel.querySelector("[data-opt='" + chosen + "']").classList.add("is-right"); }
            else {
              qel.querySelector("[data-opt='" + chosen + "']").classList.add("is-wrong");
              qel.querySelector("[data-opt='" + q.answer + "']").classList.add("is-right");
            }
            var ex = qel.querySelector(".quiz__explain");
            if (ex) ex.style.display = "block";
          });
          var res = root.querySelector("#quiz-result");
          if (!answered) { res.textContent = "ANSWER EVERY QUESTION"; return; }
          var score = right / qs.length;
          res.innerHTML = "<span style='color:var(--brass-lo)'>SCORE " + right + "/" + qs.length +
            " (" + Math.round(score * 100) + "%)</span>";
          S.setLecture(id, S.progress.lectures[id] ? S.progress.lectures[id].done : true, score);
          global.App.afterChange();
        };

        // mark done / lab
        var md = root.querySelector("#mark-done");
        if (md) md.onclick = function () {
          var cur = S.isDone(id);
          S.setLecture(id, !cur);
          global.App.afterChange();
          global.App.go("lecture/" + id);
        };
        var ml = root.querySelector("#mark-lab");
        if (ml) ml.onclick = function () {
          S.setLab(id, !S.isLabDone(id));
          global.App.afterChange();
          global.App.go("lecture/" + id);
        };
      }
    };
  };

  /* ---------------- CONCEPT ---------------- */
  V.concept = function (id) {
    var rec = S.concepts[id];
    if (!rec) {
      return { html: "<div class='phead'><div class='phead__text'><h1 class='phead__title'>Concept Not Found</h1></div></div>" };
    }
    var c = rec.concept, les = rec.lectures;
    var byTier = {};
    les.forEach(function (l) { (byTier[l.tier] = byTier[l.tier] || []).push(l); });

    var html = `
      <div class='phead'>
        <div class='phead__text'>
          <div class='phead__docket'>CONCEPT INDEX // ${esc(c.domain.toUpperCase())}</div>
          <h1 class='phead__title'>${esc(c.term)}</h1>
          <p class='phead__sub'>${esc(c.def)}</p>
        </div>
        <div class='phead__aside'><div class='stamp'>${les.length} LINKED</div></div>
      </div>

      <div class='sect'><div class='sect__head'><h3>Where This Appears</h3><div class='rule'></div>
        <span class='hint'>CROSS-COURSE TRAVERSAL</span></div>
        ${Object.keys(byTier).sort().map(function (t) {
          return `<div class='sect ${U.tierClass(t)}' style='margin-top:14px'>
            <div class='sect__head'><h3 style='font-size:14px'>T${String(t).padStart(2,"0")}</h3><div class='rule'></div></div>
            <table class='tbl'><tbody>${byTier[t].map(function (l) {
              return `<tr data-go='lecture/${l.id}' style='cursor:pointer'>
                <td>${esc(l.title)}</td>
                <td class='muted'>${esc(l.courseTitle)}</td>
                <td class='num' style='color:${S.isDone(l.id) ? "var(--cleared)" : "var(--ink-faint)"}'>
                  ${S.isDone(l.id) ? "CLEARED" : "PENDING"}</td></tr>`;
            }).join("")}</tbody></table></div>`;
        }).join("")}
      </div>

      ${c.related && c.related.length ? `
      <div class='sect'><div class='sect__head'><h3>Adjacent Concepts</h3><div class='rule'></div></div>
        <div style='display:flex;flex-wrap:wrap;gap:6px'>
        ${c.related.map(function (r) {
          var rc = S.concepts[r];
          return `<span class='chip' data-go='concept/${r}'>${esc(rc ? rc.term : r)}</span>`;
        }).join("")}</div></div>` : ""}`;

    return {
      html: html,
      mount: function (root) {
        root.querySelectorAll("[data-go]").forEach(function (el) {
          el.onclick = function () { global.App.go(el.getAttribute("data-go")); };
        });
      }
    };
  };

  /* ---------------- GRAPH ---------------- */
  V.graph = function () {
    var domains = S.catalog.domains;
    var counts = {};
    domains.forEach(function (d) {
      var recs = Object.keys(S.concepts).filter(function (k) { return S.concepts[k].concept.domain === d.id; });
      var links = 0;
      recs.forEach(function (k) { links += S.concepts[k].lectures.length; });
      counts[d.id] = { n: recs.length, links: links, recs: recs };
    });
    var max = Math.max.apply(null, domains.map(function (d) { return counts[d.id].n; }));
    var concepts = Object.keys(S.concepts);
    var orphan = concepts.filter(function (k) { return S.concepts[k].lectures.length === 0; }).length;
    var edges = concepts.reduce(function (a, k) { return a + (S.concepts[k].concept.related || []).length; }, 0);

    return {
      html: `<div class='phead'><div class='phead__text'>
        <div class='phead__docket'>KNOWLEDGE GRAPH // ${concepts.length} NODES</div>
        <h1 class='phead__title'>Concept Graph</h1>
        <p class='phead__sub'>Every lecture tags the concepts it teaches. Click any concept to see every lecture
        across every course and tier that touches it - this is how topics connect.</p></div></div>

        <div class='stat-row'>
          <div class='stat'><div class='stat__label'>Concept Nodes</div><div class='stat__value'>${concepts.length}</div></div>
          <div class='stat'><div class='stat__label'>Concept Links</div><div class='stat__value'>${edges}</div></div>
          <div class='stat'><div class='stat__label'>Lecture Cross-Refs</div>
            <div class='stat__value'>${concepts.reduce(function (a, k) { return a + S.concepts[k].lectures.length; }, 0)}</div></div>
          <div class='stat'><div class='stat__label'>Orphan Nodes</div><div class='stat__value'>${orphan}</div></div>
        </div>

        <div class='sect'><div class='sect__head'><h3>By Discipline</h3><div class='rule'></div></div>
          <div class='grid grid--cards'>${domains.map(function (d) {
            var c = counts[d.id];
            return `<div class='card'><div class='card__strip'><span>${esc(d.label)}</span>
              <div class='spacer'></div><span>${c.n} CONCEPTS</span></div>
              <div class='card__body'>
                ${U.meter(c.n / max, 16)}
                <div class='meter__label'><span>${c.links} LECTURE LINKS</span><span>${U.pct(c.n / max)}</span></div>
                <div style='margin-top:10px;display:flex;flex-wrap:wrap;gap:4px'>
                ${c.recs.slice(0, 12).map(function (k) {
                  return `<span class='chip chip--static' data-go='concept/${k}'>${esc(S.concepts[k].concept.term)}</span>`;
                }).join("")}${c.recs.length > 12 ? `<span class='chip chip--static'>+${c.recs.length - 12}</span>` : ""}
                </div></div></div>`;
          }).join("")}</div></div>`,
      mount: function (root) {
        root.querySelectorAll("[data-go]").forEach(function (el) {
          el.onclick = function () { global.App.go(el.getAttribute("data-go")); };
        });
      }
    };
  };

  /* ---------------- CTF TRACKER ---------------- */
  V.ctf = function () {
    var p = S.progress;
    var rows = p.ctf.map(function (c, i) {
      return `<tr>
        <td>${esc(c.name || "(unnamed)")}</td>
        <td class='muted'>${esc(c.platform || "")}</td>
        <td style='color:${c.difficulty === "hard" ? "var(--classified-lo)" : c.difficulty === "medium" ? "var(--brass-lo)" : "var(--cleared)"}'>
          ${esc(String(c.difficulty || "").toUpperCase())}</td>
        <td><label class='quiz__opt' style='padding:0'>
          <input type='checkbox' ${c.solved ? "checked" : ""} data-ctf='${i}'>
          <span>${c.solved ? "SOLVED" : "OPEN"}</span></label></td>
        <td class='muted'>${esc(c.date || "")}</td>
        <td><button class='btn btn--ghost' data-del='${i}'>REMOVE</button></td>
      </tr>`;
    }).join("");

    return {
      html: `<div class='phead'><div class='phead__text'>
        <div class='phead__docket'>FIELD LOGBOOK // CTF TRACKER</div>
        <h1 class='phead__title'>Challenge Log</h1>
        <p class='phead__sub'>OverTheWire, picoCTF, TryHackMe, Hack The Box, CyberDefenders. Write the write-up -
        a solve you cannot explain is a solve you did not learn.</p></div></div>

        <div class='card card--pad'>
          <div class='sect__head'><h3>Log New Challenge</h3><div class='rule'></div></div>
          <div style='display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:8px'>
            <input class='input' id='c-name' placeholder='challenge name' style='font-family:var(--font-mono)'>
            <input class='input' id='c-plat' placeholder='platform' style='font-family:var(--font-mono)'>
            <select class='input' id='c-diff' style='font-family:var(--font-mono)'>
              <option value='easy'>EASY</option><option value='medium'>MEDIUM</option><option value='hard'>HARD</option></select>
            <input class='input' id='c-date' type='date' value='${S.today()}' style='font-family:var(--font-mono)'>
            <button class='btn btn--primary' id='c-add'>LOG</button>
          </div>
        </div>

        <div class='sect'><div class='sect__head'><h3>Logged</h3><div class='rule'></div>
          <span class='hint'>${p.ctf.length} ENTRIES</span></div>
          ${p.ctf.length ? `<table class='tbl'>
            <thead><tr><th>CHALLENGE</th><th>PLATFORM</th><th>DIFFICULTY</th><th>STATUS</th><th>DATE</th><th></th></tr></thead>
            <tbody>${rows}</tbody></table>`
          : "<p class='tagline'>NO CHALLENGES LOGGED YET.</p>"}</div>`,
      mount: function (root) {
        root.querySelector("#c-add").onclick = function () {
          var name = root.querySelector("#c-name").value.trim();
          if (!name) return;
          S.progress.ctf.push({
            name: name,
            platform: root.querySelector("#c-plat").value.trim(),
            difficulty: root.querySelector("#c-diff").value,
            date: root.querySelector("#c-date").value,
            solved: false
          });
          S.saveLocal(); S.pushRemote(function () {});
          global.App.afterChange();
          global.App.go("ctf");
        };
        root.querySelectorAll("[data-ctf]").forEach(function (el) {
          el.onchange = function () {
            S.progress.ctf[parseInt(el.getAttribute("data-ctf"), 10)].solved = el.checked;
            S.saveLocal(); S.pushRemote(function () {});
            global.App.afterChange();
            global.App.go("ctf");
          };
        });
        root.querySelectorAll("[data-del]").forEach(function (el) {
          el.onclick = function () {
            S.progress.ctf.splice(parseInt(el.getAttribute("data-del"), 10), 1);
            S.saveLocal(); S.pushRemote(function () {});
            global.App.go("ctf");
          };
        });
      }
    };
  };

  /* ---------------- DOCTRINE / REFERENCE ---------------- */
  V.doctrine = function () {
    var docs = [
      ["RULES OF ENGAGEMENT", "docs/RULES-OF-ENGAGEMENT.md", "Authorisation, scope and the legal floor. Read this before any exercise outside this machine."],
      ["LAB RANGE SETUP", "docs/LAB-SETUP.md", "Build an isolated practice range on your own hardware so every exercise stays legal."],
      ["PROJECT README", "README.md", "Architecture, build commands and how the progress file is versioned."]
    ];
    return {
      html: `<div class='phead'><div class='phead__text'>
        <div class='phead__docket'>DOCTRINE LIBRARY // INTERNAL</div>
        <h1 class='phead__title'>Doctrine</h1>
        <p class='phead__sub'>Operating doctrine and standing orders. These are not courses - they are the
        constraints that make the rest of the curriculum safe and reproducible.</p></div></div>
        <div class='grid grid--cards'>${docs.map(function (d) {
          return `<div class='card is-link' data-doc='${d[1]}'>
            <div class='card__strip'><span>DOCUMENT</span><div class='spacer'></div><span>MD</span></div>
            <div class='card__body'><div class='card__title'>${esc(d[0])}</div>
            <p style='color:var(--ink-muted);font-size:12.5px;margin:8px 0 0'>${esc(d[2])}</p></div></div>`;
        }).join("")}</div>`,
      mount: function (root) {
        root.querySelectorAll("[data-doc]").forEach(function (el) {
          el.onclick = function () { global.App.go("doc/" + el.getAttribute("data-doc").replace(/^docs\//, "").replace(/\.md$/, "")); };
        });
      }
    };
  };

  V.doc = function (slug) {
    var file = "build/docs/" + slug + ".html";
    return {
      html: `<div class='phead'><div class='phead__text'>
        <div class='phead__docket'>DOCTRINE LIBRARY // ${esc(slug)}</div>
        <h1 class='phead__title'>${esc(slug.replace(/-/g, " "))}</h1></div>
        <button class='btn btn--ghost' data-back='1'>← BACK</button></div>
        <div class='card card--pad'><div class='note' id='doc-body'><p class='tagline'>LOADING…</p></div></div>`,
      mount: function (root) {
        root.querySelector("[data-back]").onclick = function () { global.App.go("doctrine"); };
        fetch(file).then(function (r) { return r.ok ? r.text() : "<p>Document not built. Run <code>python3 tools/build.py</code>.</p>"; })
          .then(function (t) {
            var nb = root.querySelector("#doc-body");
            nb.innerHTML = t; U.wireCopy(nb);
          });
      }
    };
  };

  global.ViewsB = V;
})(window);