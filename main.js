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
