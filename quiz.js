/* ============================================================
   BankTest.pk — quiz engine
   Drives quiz.html via query params:
     ?bank=nbp&topic=english&count=15
   Data files: data/{bank}-{topic}.json
   ============================================================ */
(function () {
  "use strict";

  var BANK_NAMES = {
    nbp: "National Bank of Pakistan (NBP)",
    sbp: "State Bank of Pakistan (SBP)",
    hbl: "Habib Bank Limited (HBL)",
    mcb: "MCB Bank (MCB)",
    ubl: "United Bank Limited (UBL)",
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
    answers: []   // {chosen: n|null, correct: bool}
  };

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
    start.classList.remove("hidden");
    el("quizQuestion").classList.add("hidden");
    el("quizResults").classList.add("hidden");
    el("quizStartBtn").addEventListener("click", startQuiz, { once: true });
  }

  /* ---------- Question flow ---------- */
  function startQuiz() {
    state.index = 0;
    state.score = 0;
    state.answers = [];
    el("quizStart").classList.add("hidden");
    el("quizResults").classList.add("hidden");
    el("quizQuestion").classList.remove("hidden");
    renderQuestion();
    window.scrollTo(0, 0);
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
      btn.textContent = opt;
      btn.addEventListener("click", function () { selectOption(i, btn); });
      box.appendChild(btn);
    });

    el("explanationBox").classList.add("hidden");
    var next = el("nextBtn");
    next.classList.add("hidden");
    setText(next, state.index === total - 1 ? "See Results" : "Next Question");
    next.onclick = nextStep;
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

    el("quizQuestion").classList.add("hidden");
    el("quizResults").classList.remove("hidden");

    setText(el("scoreBig"), pct + "%");
    setText(el("scoreDetail"), "You answered " + state.score + " out of " + total + " questions correctly.");

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
