/* ============================================================
   BankTest.pk — full mock test engine
   Drives mock.html.
   - Pick NBP or SBP, get 50 mixed-topic questions, 60 minutes.
   - Data files: data/{bank}-{topic}.json for the 6 topics.
   ============================================================ */
(function () {
  "use strict";

  var BANK_NAMES = { nbp: "National Bank of Pakistan (NBP)", sbp: "State Bank of Pakistan (SBP)", hbl: "Habib Bank Limited (HBL)", mcb: "MCB Bank (MCB)", ubl: "United Bank Limited (UBL)", meezan: "Meezan Bank", allied: "Allied Bank Limited (Allied)", bop: "The Bank of Punjab (BOP)" };
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
  // How many questions to pull from each topic (sums to 50)
  var PER_TOPIC = { "english": 10, "math": 10, "iq": 8, "gk": 8, "current-affairs": 7, "banking": 7 };

  var PASS = (typeof SITE_CONFIG !== "undefined" && SITE_CONFIG.quizPassPercent) || 60;
  var MINUTES = (typeof SITE_CONFIG !== "undefined" && SITE_CONFIG.mockMinutes) || 60;

  var state = {
    bank: null,
    questions: [],   // {q, options, answer, explanation, topic}
    index: 0,
    chosen: [],      // chosen option index per question, null = unanswered
    secondsLeft: MINUTES * 60,
    timerId: null,
    submitted: false
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
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-green";
      b.textContent = BANK_NAMES[key];
      b.addEventListener("click", function () { loadMock(key); });
      box.appendChild(b);
    });
    el("mockInfo").textContent =
      state.questions.length ? "" :
      TOPICS.reduce(function (n, t) { return n + PER_TOPIC[t]; }, 0) +
      " mixed questions · " + MINUTES + " minutes · pass at " + PASS + "%";
  }

  /* ---------- Load all topics ---------- */
  function loadMock(bank) {
    state.bank = bank;
    el("mockStart").innerHTML = '<p>Loading your mock test…</p>';
    var loads = TOPICS.map(function (t) {
      return fetch("" + bank + "-" + t + ".json")
        .then(function (r) { if (!r.ok) throw new Error(t); return r.json(); })
        .then(function (d) {
          var pool = shuffle((d.questions || []).slice());
          return pool.slice(0, PER_TOPIC[t]).map(function (q) {
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

  /* ---------- Test UI ---------- */
  function beginTest() {
    el("mockStart").classList.add("hidden");
    el("mockTest").classList.remove("hidden");
    state.secondsLeft = MINUTES * 60;
    updateTimer();
    state.timerId = setInterval(tick, 1000);
    buildNav();
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
      d.classList.toggle("current", i === state.index);
    });
    var done = state.chosen.filter(function (c) { return c !== null; }).length;
    el("mockProgress").textContent = done + " of " + state.questions.length + " answered";
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
      btn.textContent = opt;
      btn.addEventListener("click", function () {
        state.chosen[i] = oi;
        renderQ(i);
        updateNavDots();
      });
      box.appendChild(btn);
    });
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
    el("mockScoreDetail").textContent =
      "You answered " + score + " out of " + total + " correctly" +
      (auto ? " (time expired)." : ".");
    var v = el("mockVerdict");
    v.className = passed ? "result-pass" : "result-fail";
    v.textContent = passed ? "Passed — great job!" : "Not passed — keep practicing!";

    // Section-wise table
    var tbl = el("sectionTable");
    tbl.innerHTML = "";
    var head = document.createElement("tr");
    ["Section", "Correct", "Score"].forEach(function (h) {
      var th = document.createElement("th"); th.textContent = h; head.appendChild(th);
    });
    tbl.appendChild(head);
    TOPICS.forEach(function (t) {
      var tr = document.createElement("tr");
      var td1 = document.createElement("td"); td1.textContent = TOPIC_NAMES[t];
      var td2 = document.createElement("td"); td2.textContent = byTopic[t].correct + " / " + byTopic[t].total;
      var td3 = document.createElement("td");
      td3.textContent = byTopic[t].total ? Math.round((byTopic[t].correct / byTopic[t].total) * 100) + "%" : "—";
      tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
      tbl.appendChild(tr);
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
    el("mockPrev").addEventListener("click", function () {
      if (state.index > 0) renderQ(state.index - 1);
    });
    el("mockNext").addEventListener("click", function () {
      if (state.index < state.questions.length - 1) renderQ(state.index + 1);
    });
  });
})();
