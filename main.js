/* BankTest.pk — shared UI behaviour: mobile nav, FAQ accordion, footer year, active nav link */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {

    // Mobile nav toggle
    var toggle = document.getElementById("navToggle");
    var nav = document.getElementById("siteNav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      // Close the menu when a link is tapped
      nav.addEventListener("click", function (e) {
        if (e.target.tagName === "A") {
          nav.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }

    // FAQ accordion
    var items = document.querySelectorAll(".faq-item");
    items.forEach(function (item) {
      var btn = item.querySelector(".faq-q");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var isOpen = item.classList.toggle("open");
        btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    });

    // Footer year
    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());


    // ---------- Homepage 3-step flow: Bank -> Post -> Test ----------
    // Posts are the real posts named on each bank's own guide page.
    var FLOW_BANKS = {
      ubl: "United Bank Limited (UBL)",
      hbl: "Habib Bank Limited (HBL)",
      nbp: "National Bank of Pakistan (NBP)",
      sbp: "State Bank of Pakistan (SBP)",
      mcb: "MCB Bank (MCB)",
      meezan: "Meezan Bank",
      allied: "Allied Bank Limited (Allied)",
      bop: "The Bank of Punjab (BOP)"
    };
    var FLOW_POSTS = {
      ubl: ["OG-IV", "BSO", "RE", "Recent Test 2026"],
      hbl: ["Management Trainee", "Officer", "Support Staff"],
      nbp: ["Management Trainee Officer (MTO)", "Officer Grade-II (OG-II)", "Cashier / Teller", "Customer Service Representative"],
      sbp: ["YPIP — Young Professionals Induction Program", "SBOTS — SBP Officers Training Scheme", "Officer / Specialist", "Recent Test 2026"],
      mcb: ["Management Trainee", "Officer", "Branch Staff"],
      meezan: ["Personal Banking Officer (PBO)", "Management Trainee", "Officer", "Recent Test 2026"],
      allied: ["Management Trainee", "Officer", "Frontline Staff"],
      bop: ["Personal Banking Officer (PBO)", "Customer Services Officer (CSO)", "Branch Banking Sales"]
    };
    var FLOW_PATTERN = {
      bop: "60 questions · 75 minutes",
      _default: "50 questions · 60 minutes"
    };
    // Dedicated recent tests (user's own sent questions, whole file, file order).
    // The "Recent Test 2026" post links straight to mock.html?bank=X&test=Y.
    var FLOW_RECENT = {
      ubl: { post: "Recent Test 2026", test: "recent", pattern: "15 questions · 20 minutes" },
      meezan: { post: "Recent Test 2026", test: "pbo-recent", pattern: "60 questions · 75 minutes" },
      sbp: { post: "Recent Test 2026", test: "sbots-2026", pattern: "60 questions · 75 minutes" }
    };

    var bankGrid = document.getElementById("bankGrid");
    if (bankGrid) {
      var flowBank = null, flowPost = null;
      var step2 = document.getElementById("flowStep2");
      var step3 = document.getElementById("flowStep3");
      var postGrid = document.getElementById("postGrid");

      function flowPattern(bank) { return FLOW_PATTERN[bank] || FLOW_PATTERN._default; }

      function selectBank(bank, btn) {
        flowBank = bank; flowPost = null;
        bankGrid.querySelectorAll(".flow-btn").forEach(function (b) { b.classList.remove("selected"); });
        if (btn) btn.classList.add("selected");
        document.getElementById("flowBankName").textContent = FLOW_BANKS[bank];
        postGrid.innerHTML = "";
        (FLOW_POSTS[bank] || []).forEach(function (post) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "flow-btn";
          var st = document.createElement("strong");
          st.textContent = post;
          b.appendChild(st);
          b.addEventListener("click", function () { selectPost(post, b); });
          postGrid.appendChild(b);
        });
        step2.classList.remove("hidden");
        step3.classList.add("hidden");
        step2.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      function selectPost(post, btn) {
        flowPost = post;
        postGrid.querySelectorAll(".flow-btn").forEach(function (b) { b.classList.remove("selected"); });
        if (btn) btn.classList.add("selected");
        document.getElementById("flowSummary").textContent = post + " — " + FLOW_BANKS[flowBank];
        var recent = FLOW_RECENT[flowBank];
        if (recent && post === recent.post) {
          document.getElementById("flowPattern").textContent = recent.pattern + " · pass at 60%";
          document.getElementById("flowStartBtn").href =
            "mock.html?bank=" + flowBank + "&test=" + recent.test;
        } else {
          document.getElementById("flowPattern").textContent = flowPattern(flowBank) + " · pass at 60%";
          document.getElementById("flowStartBtn").href =
            "mock.html?bank=" + flowBank + "&post=" + encodeURIComponent(post);
        }
        step3.classList.remove("hidden");
        step3.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      bankGrid.querySelectorAll(".flow-btn").forEach(function (btn) {
        btn.addEventListener("click", function () { selectBank(btn.getAttribute("data-bank"), btn); });
      });
      document.getElementById("changeBank").addEventListener("click", function () {
        flowBank = null; flowPost = null;
        bankGrid.querySelectorAll(".flow-btn").forEach(function (b) { b.classList.remove("selected"); });
        step2.classList.add("hidden");
        step3.classList.add("hidden");
      });
      document.getElementById("changePost").addEventListener("click", function () {
        flowPost = null;
        postGrid.querySelectorAll(".flow-btn").forEach(function (b) { b.classList.remove("selected"); });
        step3.classList.add("hidden");
      });
    }

    // Highlight current page in nav
    try {
      var page = window.location.pathname.split("/").pop() || "index.html";
      document.querySelectorAll(".site-nav a").forEach(function (a) {
        var href = a.getAttribute("href") || "";
        if (href.split("?")[0] === page) {
          a.style.fontWeight = "800";
        }
      });
    } catch (e) { /* non-critical */ }
  });
})();
