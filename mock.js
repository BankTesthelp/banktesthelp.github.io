/* ============================================================
   BankTest.pk — full mock test engine
   Drives mock.html.
   - Pick NBP or SBP, get 50 mixed-topic questions, 60 minutes.
   - Data files: data/{bank}-{topic}.json for the 6 topics.
   ============================================================ */
(function () {
  "use strict";

  var BANK_NAMES = { ubl: "United Bank Limited (UBL)", hbl: "Habib Bank Limited (HBL)", nbp: "National Bank of Pakistan (NBP)", sbp: "State Bank of Pakistan (SBP)", mcb: "MCB Bank (MCB)", meezan: "Meezan Bank", allied: "Allied Bank Limited (Allied)", bop: "The Bank of Punjab (BOP)" };
  var TOPICS = ["english", "math", "iq", "gk", "current-affairs", "banking"];
  var TOPIC_NAMES = {
    "english": "English",
    "math": "Mathematics",
    "iq": "IQ & Analytical Reasoning",
    "gk": "General Knowledge",
    "current-affairs": "Current Affairs",
    "banking": "Banking & Finance",
    "recent-pattern-2026": "UBL \u2014 OG-IV / BSO / RE \u2014 Recent Test Questions 2026",
    "pbo-recent-2026": "MEEZAN BANK LIMITED \u2014 Personal Banking Officer (PBO) \u2014 Written Test Preparation (60 Multiple Choice Questions)",
    "sbots-2026": "SBP \u2014 State Bank Officers Training Scheme (SBOTS) 29th Batch (OG-2) \u2014 Test Preparation 2026 (60 Questions)"
  };
  // Question count per topic and time limit per bank.
  // Default = standard 50-question / 60-minute full test.
  // BOP's current online assessment is 60 MCQs in about 75 minutes.
  var DEFAULT_MOCK = { minutes: 60, perTopic: { "english": 10, "math": 10, "iq": 8, "gk": 8, "current-affairs": 7, "banking": 7 } };
  var MOCK_CONFIGS = {
    bop: { minutes: 75, perTopic: { "english": 12, "math": 12, "iq": 12, "gk": 10, "current-affairs": 6, "banking": 8 } }
  };
  function mockConfig(bank) { return MOCK_CONFIGS[bank] || DEFAULT_MOCK; }

  var PASS = (typeof SITE_CONFIG !== "undefined" && SITE_CONFIG.quizPassPercent) || 60;

  var state = {
    bank: null,
    config: DEFAULT_MOCK,
    questions: [],   // {q, options, answer, explanation, topic}
    index: 0,
    chosen: [],      // chosen option index per question, null = unanswered
    marked: [],      // marked-for-review flag per question, false by default
    secondsLeft: DEFAULT_MOCK.minutes * 60,
    timerId: null,
    submitted: false,
    startTime: 0
  };

  function el(id) { return document.getElementById(id); }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function fmt(s) {
    var m = Math.floor(s / 60), sec = s % 60;
    return (m < 10 ? "0" + m : m) + ":" + (sec < 10 ? "0" + sec : sec);
  }

  /* ---------- Bank picker ---------- */
  function initPicker() {
    var box = el("bankPick");
    box.innerHTML = "";
    Object.keys(BANK_NAMES).forEach(function (key) {
      var cfg = mockConfig(key);
      var total = TOPICS.reduce(function (n, t) { return n + cfg.perTopic[t]; }, 0);
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-green bank-pick-btn";
      b.innerHTML = "";
      var nm = document.createElement("span");
      nm.className = "bank-pick-name";
      nm.textContent = BANK_NAMES[key];
      var pt = document.createElement("span");
      pt.className = "bank-pick-pattern";
      pt.textContent = total + " questions · " + cfg.minutes + " minutes";
      b.appendChild(nm);
      b.appendChild(pt);
      b.addEventListener("click", function () { loadMock(key); });
      box.appendChild(b);
    });
    el("mockInfo").textContent =
      state.questions.length ? "" :
      TOPICS.reduce(function (n, t) { return n + DEFAULT_MOCK.perTopic[t]; }, 0) +
      " mixed questions · " + DEFAULT_MOCK.minutes + " minutes · pass at " + PASS + "%" +
      " (BOP online-assessment mock: 60 questions · 75 minutes)";
  }

  /* ---------- Load all topics ---------- */
  function loadMock(bank) {
    state.bank = bank;
    state.config = mockConfig(bank);
    el("mockStart").innerHTML = '<p>Loading your mock test…</p>';
    var loads = TOPICS.map(function (t) {
      return fetch("" + bank + "-" + t + ".json")
        .then(function (r) { if (!r.ok) throw new Error(t); return r.json(); })
        .then(function (d) {
          var pool = shuffle((d.questions || []).slice());
          return pool.slice(0, state.config.perTopic[t]).map(function (q) {
            return { q: q.q, options: q.options, answer: q.answer, explanation: q.explanation, topic: t };
          });
        });
    });
    Promise.all(loads)
      .then(function (parts) {
        var all = [];
        parts.forEach(function (p) { all = all.concat(p); });
        state.questions = shuffle(all);
        state.chosen = state.questions.map(function () { return null; });
        state.marked = state.questions.map(function () { return false; });
        beginTest();
      })
      .catch(function () {
        el("mockStart").innerHTML =
          '<div class="note-box"><strong>Could not load the mock test.</strong><br>' +
          'Question files could not be fetched. If you opened this page directly from a file, ' +
          'serve the site over HTTP (e.g. python3 -m http.server).<br><br>' +
          '<a class="btn btn-green" href="mock.html">Try Again</a></div>';
      });
  }

  /* ---------- Pre-selected test (from homepage Bank -> Post -> Test flow) ---------- */
  function showSelected(bank, post) {
    var cfg = mockConfig(bank);
    var total = TOPICS.reduce(function (n, t) { return n + cfg.perTopic[t]; }, 0);
    el("mockIntro").classList.add("hidden");
    el("bankPick").classList.add("hidden");
    el("mockInfo").textContent = "";
    el("mockSelectedText").textContent = post + " — " + BANK_NAMES[bank];
    el("mockSelectedPattern").textContent =
      total + " questions · " + cfg.minutes + " minutes · pass at " + PASS + "%";
    el("mockSelected").classList.remove("hidden");
    el("mockSelectedStart").addEventListener("click", function () { loadMock(bank); }, { once: true });
  }

  /* ---------- Test UI ---------- */
  function beginTest() {
    el("mockStart").classList.add("hidden");
    el("mockTest").classList.remove("hidden");
    state.startTime = Date.now();
    state.secondsLeft = state.config.minutes * 60;
    updateTimer();
    state.timerId = setInterval(tick, 1000);
    buildNav();
    buildSectionTabs();
    renderQ(0);
  }

  function tick() {
    state.secondsLeft--;
    updateTimer();
    if (state.secondsLeft <= 0) {
      submit(true);
    }
  }

  function updateTimer() {
    var t = el("mockTimer");
    t.textContent = "Time left: " + fmt(Math.max(0, state.secondsLeft));
    if (state.secondsLeft <= 300) t.classList.add("timer-warning");
  }

  function buildNav() {
    var grid = el("navGrid");
    grid.innerHTML = "";
    state.questions.forEach(function (_, i) {
      var d = document.createElement("button");
      d.type = "button";
      d.className = "nav-dot";
      d.textContent = String(i + 1);
      d.id = "navdot-" + i;
      d.setAttribute("aria-label", "Go to question " + (i + 1));
      d.addEventListener("click", function () { renderQ(i); });
      grid.appendChild(d);
    });
    updateNavDots();
  }

  function updateNavDots() {
    state.questions.forEach(function (_, i) {
      var d = el("navdot-" + i);
      if (!d) return;
      d.classList.toggle("answered", state.chosen[i] !== null);
      d.classList.toggle("marked", !!state.marked[i]);
      d.classList.toggle("current", i === state.index);
    });
    var done = state.chosen.filter(function (c) { return c !== null; }).length;
    el("mockProgress").textContent = done + " of " + state.questions.length + " answered";
    var fill = el("mockProgressFill");
    if (fill) fill.style.width = Math.round((done / state.questions.length) * 100) + "%";
    updateSectionTabs();
  }

  /* ---------- Section tabs ---------- */
  function sectionFirstIndex(topic) {
    for (var i = 0; i < state.questions.length; i++) {
      if (state.questions[i].topic === topic) return i;
    }
    return -1;
  }

  function buildSectionTabs() {
    var row = el("mockSectionTabs");
    if (!row) return;
    row.innerHTML = "";
    TOPICS.forEach(function (t) {
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "x-tab";
      tab.id = "xtab-" + t;
      var nm = document.createElement("span");
      nm.className = "x-tab-name";
      nm.textContent = TOPIC_NAMES[t];
      var ct = document.createElement("span");
      ct.className = "x-tab-count";
      ct.id = "xtab-count-" + t;
      tab.appendChild(nm);
      tab.appendChild(ct);
      tab.addEventListener("click", function () {
        var first = sectionFirstIndex(t);
        if (first >= 0) renderQ(first);
      });
      row.appendChild(tab);
    });
    updateSectionTabs();
  }

  function updateSectionTabs() {
    if (!state.questions.length) return;
    var currentTopic = state.questions[state.index] ? state.questions[state.index].topic : null;
    TOPICS.forEach(function (t) {
      var tab = el("xtab-" + t);
      var ct = el("xtab-count-" + t);
      if (!tab) return;
      var total = 0, done = 0;
      state.questions.forEach(function (q, i) {
        if (q.topic !== t) return;
        total++;
        if (state.chosen[i] !== null) done++;
      });
      if (ct) ct.textContent = done + "/" + total;
      tab.classList.toggle("active", t === currentTopic);
    });
  }

  /* ---------- Mark for review ---------- */
  function updateMarkBtn() {
    var b = el("mockMark");
    if (!b) return;
    b.textContent = state.marked[state.index] ? "Marked — unmark" : "Mark for review";
  }

  function toggleMark() {
    if (!state.questions.length) return;
    state.marked[state.index] = !state.marked[state.index];
    updateMarkBtn();
    updateNavDots();
  }

  function renderQ(i) {
    state.index = i;
    var q = state.questions[i];
    el("mockQCounter").textContent = "Question " + (i + 1) + " of " + state.questions.length;
    el("mockQTopic").textContent = TOPIC_NAMES[q.topic];
    el("mockQText").textContent = q.q;

    var box = el("mockOptions");
    box.innerHTML = "";
    q.options.forEach(function (opt, oi) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn" + (state.chosen[i] === oi ? " correct" : "");
      var letter = document.createElement("span");
      letter.className = "x-opt-letter";
      letter.textContent = String.fromCharCode(65 + oi);
      btn.appendChild(letter);
      var txt = document.createElement("span");
      txt.className = "x-opt-text";
      txt.textContent = opt;
      btn.appendChild(txt);
      btn.addEventListener("click", function () {
        state.chosen[i] = oi;
        renderQ(i);
        updateNavDots();
      });
      box.appendChild(btn);
    });
    updateMarkBtn();
    updateNavDots();
  }

  /* ---------- Submit & results ---------- */
  function submit(auto) {
    if (state.submitted) return;
    if (!auto) {
      var un = state.chosen.filter(function (c) { return c === null; }).length;
      var msg = un > 0
        ? "You still have " + un + " unanswered question(s). Submit anyway?"
        : "Submit your mock test now?";
      if (!window.confirm(msg)) return;
    }
    state.submitted = true;
    clearInterval(state.timerId);
    showResults(auto);
  }

  function showResults(auto) {
    el("mockTest").classList.add("hidden");
    var res = el("mockResults");
    res.classList.remove("hidden");

    var total = state.questions.length;
    var score = 0;
    var byTopic = {};
    TOPICS.forEach(function (t) { byTopic[t] = { correct: 0, total: 0 }; });

    state.questions.forEach(function (q, i) {
      byTopic[q.topic].total++;
      if (state.chosen[i] === q.answer) {
        score++;
        byTopic[q.topic].correct++;
      }
    });

    var pct = Math.round((score / total) * 100);
    var passed = pct >= PASS;

    el("mockScoreBig").textContent = pct + "%";
    var taken = "00:00";
    if (state.startTime) taken = fmt(Math.floor((Date.now() - state.startTime) / 1000));
    var st = el("mockScoreTime");
    if (st) st.textContent = "Time taken: " + taken;
    var ring = el("mockScoreRing");
    if (ring) {
      var C = 2 * Math.PI * 52;
      ring.style.strokeDasharray = C.toFixed(1);
      ring.style.strokeDashoffset = (C * (1 - pct / 100)).toFixed(1);
      ring.style.stroke = passed ? "#4ADE80" : "#F87171";
    }
    el("mockScoreDetail").textContent =
      "You answered " + score + " out of " + total + " correctly" +
      (auto ? " (time expired)." : ".");
    var v = el("mockVerdict");
    v.className = passed ? "result-pass" : "result-fail";
    v.textContent = passed ? "Passed — great job!" : "Not passed — keep practicing!";

    // Stat tiles
    var tiles = el("mockStatTiles");
    if (tiles) {
      tiles.innerHTML = "";
      var wrong = total - score;
      [
        { num: score + " / " + total, label: "Correct" },
        { num: String(wrong), label: "Wrong" },
        { num: taken, label: "Time taken" },
        { num: PASS + "%", label: "Pass mark" }
      ].forEach(function (s) {
        var tile = document.createElement("div");
        tile.className = "x-stat-tile";
        var num = document.createElement("div");
        num.className = "x-stat-num";
        num.textContent = s.num;
        var lab = document.createElement("div");
        lab.className = "x-stat-label";
        lab.textContent = s.label;
        tile.appendChild(num);
        tile.appendChild(lab);
        tiles.appendChild(tile);
      });
    }

    // Section-wise breakdown bars
    var breakdown = el("sectionTable");
    breakdown.innerHTML = "";
    TOPICS.forEach(function (t) {
      var pctT = byTopic[t].total ? Math.round((byTopic[t].correct / byTopic[t].total) * 100) : 0;
      var row = document.createElement("div");
      row.className = "x-break-row";
      var nm = document.createElement("div");
      nm.className = "x-break-name";
      nm.textContent = TOPIC_NAMES[t];
      var bar = document.createElement("div");
      bar.className = "x-break-bar";
      var fill = document.createElement("div");
      fill.className = "x-break-fill";
      fill.style.width = pctT + "%";
      bar.appendChild(fill);
      var val = document.createElement("div");
      val.className = "x-break-val";
      val.textContent = byTopic[t].correct + " / " + byTopic[t].total + " · " + pctT + "%";
      row.appendChild(nm);
      row.appendChild(bar);
      row.appendChild(val);
      breakdown.appendChild(row);
    });

    // Review grouped by topic
    var list = el("mockReview");
    list.innerHTML = "";
    TOPICS.forEach(function (t) {
      var h = document.createElement("h3");
      h.textContent = TOPIC_NAMES[t];
      h.style.marginTop = "18px";
      list.appendChild(h);
      state.questions.forEach(function (q, i) {
        if (q.topic !== t) return;
        var item = document.createElement("div");
        item.className = "review-item";
        var rq = document.createElement("div");
        rq.className = "rq";
        rq.textContent = (i + 1) + ". " + q.q;
        var ra = document.createElement("div");
        var ok = state.chosen[i] === q.answer;
        ra.className = "ra " + (ok ? "ok" : "bad");
        ra.textContent = ok
          ? "Your answer: " + q.options[state.chosen[i]] + " ✓"
          : "Your answer: " + (state.chosen[i] === null ? "— (unanswered)" : q.options[state.chosen[i]]) +
            " ✗ · Correct: " + q.options[q.answer];
        var re = document.createElement("div");
        re.className = "re";
        re.textContent = q.explanation;
        item.appendChild(rq); item.appendChild(ra); item.appendChild(re);
        list.appendChild(item);
      });
    });

    el("mockRetake").onclick = function () { window.location.reload(); };
    window.scrollTo(0, 0);
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initPicker();
    el("mockSubmit").addEventListener("click", function () { submit(false); });
    el("mockMark").addEventListener("click", toggleMark);
    el("mockPrev").addEventListener("click", function () {
      if (state.index > 0) renderQ(state.index - 1);
    });
    el("mockNext").addEventListener("click", function () {
      if (state.index < state.questions.length - 1) renderQ(state.index + 1);
    });
    // Deep link: mock.html?bank=bop starts the BOP mock straight away.
    // With a post (mock.html?bank=nbp&post=MTO) show the selected test
    // on the start screen instead, so the post name is visible first.
    var params = new URLSearchParams(window.location.search);
    var bank = (params.get("bank") || "").toLowerCase();
    var post = (params.get("post") || "").trim();
    if (bank && BANK_NAMES[bank]) {
      if (post) showSelected(bank, post);
      else loadMock(bank);
    }
  });
})();
