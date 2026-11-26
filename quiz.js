/* ============================================================
   BankTest.pk — quiz engine
   Drives quiz.html via query params:
     ?bank=nbp&topic=english&count=15
   Data files: data/{bank}-{topic}.json
   ============================================================ */
(function () {
  "use strict";

  var BANK_NAMES = {
    ubl: "United Bank Limited (UBL)",
    hbl: "Habib Bank Limited (HBL)",
    nbp: "National Bank of Pakistan (NBP)",
    sbp: "State Bank of Pakistan (SBP)",
    mcb: "MCB Bank (MCB)",
    meezan: "Meezan Bank",
    allied: "Allied Bank Limited (Allied)",
    bop: "The Bank of Punjab (BOP)"
  };

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

  var params = new URLSearchParams(window.location.search);
  var bank = (params.get("bank") || "nbp").toLowerCase();
  var topic = (params.get("topic") || "english").toLowerCase();
  var count = parseInt(params.get("count") || "15", 10);

  if (!BANK_NAMES[bank]) bank = "nbp";
  if (!TOPIC_NAMES[topic]) topic = "english";
  if (isNaN(count) || count < 5) count = 15;
  if (count > 50) count = 50;

  var PASS = (typeof SITE_CONFIG !== "undefined" && SITE_CONFIG.quizPassPercent) || 60;

  var state = {
    questions: [],
    order: [],
    index: 0,
    score: 0,
    answers: [],   // {chosen: n|null, correct: bool}
    startTime: 0,
    timerId: null
  };

  function fmtTime(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
  }

  function updateLiveScore() {
    var done = state.answers.length;
    setText(el("qScore"), "Score: " + state.score + "/" + done);
  }

  function el(id) { return document.getElementById(id); }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function setText(node, text) { node.textContent = text; }

  /* ---------- Start screen ---------- */
  function showStart() {
    var start = el("quizStart");
    setText(el("quizBankName"), BANK_NAMES[bank]);
    setText(el("quizTopicName"), TOPIC_NAMES[topic]);
    setText(el("quizCountInfo"), state.questions.length + " questions · instant feedback with explanations · pass at " + PASS + "%");
    // Pickers default to the current URL params
    var bp = el("bankPick"), tp = el("topicPick"), cp = el("countPick");
    if (bp) bp.value = bank;
    if (tp) {
      if (!TOPIC_NAMES[topic] || !tp.querySelector('option[value="' + topic + '"]')) {
        var o = document.createElement("option");
        o.value = topic;
        o.textContent = TOPIC_NAMES[topic] || topic;
        tp.appendChild(o);
      }
      tp.value = topic;
    }
    if (cp) cp.value = String(Math.min(count, 50));
    start.classList.remove("hidden");
    el("quizQuestion").classList.add("hidden");
    el("quizResults").classList.add("hidden");
    el("quizStartBtn").addEventListener("click", startFromPicker, { once: true });
  }

  /* ---------- Question flow ---------- */
  function startFromPicker() {
    var bp = el("bankPick"), tp = el("topicPick"), cp = el("countPick");
    var nb = bp ? bp.value : bank;
    var nt = tp ? tp.value : topic;
    var nc = cp ? parseInt(cp.value, 10) : count;
    if (nb !== bank || nt !== topic || nc !== count) {
      window.location.href = "quiz.html?bank=" + nb + "&topic=" + nt + "&count=" + nc;
      return;
    }
    startQuiz();
  }

  function startQuiz() {
    state.index = 0;
    state.score = 0;
    state.answers = [];
    state.startTime = Date.now();
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = setInterval(function () {
      setText(el("qTimer"), "Time: " + fmtTime(Date.now() - state.startTime));
    }, 1000);
    setText(el("qTimer"), "Time: 00:00");
    updateLiveScore();
    el("quizStart").classList.add("hidden");
    el("quizResults").classList.add("hidden");
    el("quizQuestion").classList.remove("hidden");
    buildPalette();
    renderQuestion();
    window.scrollTo(0, 0);
  }

  /* ---------- Question palette (indicator dots, not clickable) ---------- */
  function buildPalette() {
    var pal = el("paletteBox");
    if (!pal) return;
    pal.innerHTML = "";
    state.questions.forEach(function (q, i) {
      var d = document.createElement("span");
      d.className = "x-pal-dot";
      d.textContent = String(i + 1);
      pal.appendChild(d);
    });
    updatePalette();
  }

  function updatePalette() {
    var pal = el("paletteBox");
    if (!pal) return;
    var dots = pal.querySelectorAll(".x-pal-dot");
    dots.forEach(function (d, i) {
      d.classList.toggle("current", i === state.index);
      d.classList.toggle("answered", i < state.answers.length);
    });
  }

  function renderQuestion() {
    var q = state.questions[state.index];
    var total = state.questions.length;

    el("progressFill").style.width = Math.round((state.index / total) * 100) + "%";
    setText(el("qCounter"), "Question " + (state.index + 1) + " of " + total);
    setText(el("qTopicTag"), TOPIC_NAMES[topic]);
    setText(el("qText"), q.q);

    var box = el("optionsBox");
    box.innerHTML = "";
    q.options.forEach(function (opt, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      var badge = document.createElement("span");
      badge.className = "x-opt-letter";
      badge.textContent = String.fromCharCode(65 + i); // A, B, C, D
      btn.appendChild(badge);
      btn.appendChild(document.createTextNode(opt));
      btn.addEventListener("click", function () { selectOption(i, btn); });
      box.appendChild(btn);
    });

    el("explanationBox").classList.add("hidden");
    var next = el("nextBtn");
    next.classList.add("hidden");
    setText(next, state.index === total - 1 ? "See Results" : "Next Question");
    next.onclick = nextStep;
    updatePalette();
  }

  function selectOption(i, btn) {
    var q = state.questions[state.index];
    var correct = (i === q.answer);

    var buttons = el("optionsBox").querySelectorAll(".option-btn");
    buttons.forEach(function (b) { b.disabled = true; });
    buttons[q.answer].classList.add("correct");
    if (!correct) btn.classList.add("wrong");

    state.answers.push({ chosen: i, correct: correct });
    if (correct) state.score++;

    var exp = el("explanationBox");
    exp.innerHTML = "";
    var strong = document.createElement("strong");
    strong.textContent = correct ? "Correct!" : "Incorrect.";
    var p = document.createElement("p");
    p.textContent = q.explanation;
    exp.appendChild(strong);
    exp.appendChild(p);
    exp.classList.remove("hidden");

    el("progressFill").style.width = Math.round(((state.index + 1) / state.questions.length) * 100) + "%";
    updateLiveScore();
    updatePalette();
    el("nextBtn").classList.remove("hidden");
  }

  function nextStep() {
    state.index++;
    if (state.index >= state.questions.length) {
      showResults();
    } else {
      renderQuestion();
      window.scrollTo(0, 0);
    }
  }

  /* ---------- Results ---------- */
  function showResults() {
    var total = state.questions.length;
    var pct = Math.round((state.score / total) * 100);
    var passed = pct >= PASS;

    if (state.timerId) clearInterval(state.timerId);
    var taken = state.startTime ? fmtTime(Date.now() - state.startTime) : "00:00";

    el("quizQuestion").classList.add("hidden");
    el("quizResults").classList.remove("hidden");

    setText(el("scoreBig"), pct + "%");
    setText(el("scoreTime"), "Time taken: " + taken);
    var ring = el("scoreRing");
    if (ring) {
      var C = 2 * Math.PI * 52;
      ring.style.strokeDasharray = C.toFixed(1);
      ring.style.strokeDashoffset = (C * (1 - pct / 100)).toFixed(1);
      ring.style.stroke = passed ? "#4ADE80" : "#F87171";
    }
    setText(el("scoreDetail"), "You answered " + state.score + " out of " + total + " questions correctly.");

    // Stat tiles
    setText(el("statCorrect"), state.score + "/" + total);
    setText(el("statWrong"), String(total - state.score));
    setText(el("statTime"), taken);
    setText(el("statPass"), PASS + "%");

    var verdict = el("scoreVerdict");
    verdict.className = passed ? "result-pass" : "result-fail";
    setText(verdict, passed ? "Passed — well done!" : "Not passed — keep practicing!");

    // Review list
    var list = el("reviewList");
    list.innerHTML = "";
    state.questions.forEach(function (q, i) {
      var a = state.answers[i] || { chosen: null, correct: false };
      var item = document.createElement("div");
      item.className = "review-item";

      var rq = document.createElement("div");
      rq.className = "rq";
      rq.textContent = (i + 1) + ". " + q.q;

      var ra = document.createElement("div");
      ra.className = "ra " + (a.correct ? "ok" : "bad");
      ra.textContent = a.correct
        ? "Your answer: " + q.options[a.chosen] + " ✓"
        : "Your answer: " + (a.chosen === null ? "—" : q.options[a.chosen]) + " ✗ · Correct: " + q.options[q.answer];

      var re = document.createElement("div");
      re.className = "re";
      re.textContent = q.explanation;

      item.appendChild(rq);
      item.appendChild(ra);
      item.appendChild(re);
      list.appendChild(item);
    });

    el("retakeBtn").onclick = function () {
      state.order = shuffle(state.order.slice());
      state.questions = state.order.map(function (qi) { return qi; });
      startQuiz();
    };

    window.scrollTo(0, 0);
  }

  /* ---------- Load data ---------- */
  function fail(msg) {
    el("quizStart").classList.remove("hidden");
    el("quizQuestion").classList.add("hidden");
    el("quizResults").classList.add("hidden");
    el("quizStart").innerHTML =
      '<div class="note-box"><strong>Could not load this quiz.</strong><br>' + msg +
      '<br><br><a class="btn btn-green" href="topics.html">Back to Topics</a></div>';
  }

  var url = "" + bank + "-" + topic + ".json";
  fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      if (!data.questions || !data.questions.length) throw new Error("empty question set");
      var pool = shuffle(data.questions.slice());
      state.questions = pool.slice(0, Math.min(count, pool.length));
      state.order = state.questions;
      showStart();
    })
    .catch(function (err) {
      fail("The question file (" + url + ") could not be loaded. " +
           "If you opened this page directly from a file, please serve the site over HTTP (e.g. python3 -m http.server) so the quiz data can load.");
    });
})();
