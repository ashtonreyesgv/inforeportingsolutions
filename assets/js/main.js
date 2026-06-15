/* InfoReporting Solutions — site behaviour
   Kept intentionally small: mobile nav, gentle scroll reveal, mailto form.
   No frameworks, no heavy animation. */
(function () {
  "use strict";

  /* ---- Mobile navigation -------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("primary-nav");
  var backdrop = document.querySelector(".nav-backdrop");

  function setNav(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle("is-open", open);
    if (backdrop) backdrop.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(nav.classList.contains("is-open") === false);
    });
    if (backdrop) backdrop.addEventListener("click", function () { setNav(false); });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setNav(false);
    });
    // Reset on resize back to desktop
    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) setNav(false);
    });
  }

  /* ---- Gentle scroll reveal ----------------------------------------- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealables = document.querySelectorAll("[data-reveal]");

  if (reduce || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ---- Current year in footer --------------------------------------- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  /* ---- Contact form (no backend → opens a pre-filled email) ---------- */
  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var email = (data.get("email") || "").toString().trim();
      var company = (data.get("company") || "").toString().trim();
      var topic = (data.get("topic") || "").toString().trim();
      var message = (data.get("message") || "").toString().trim();

      var to = form.getAttribute("data-mailto") || "colin.brien@inforeportingsolutions.com";
      var subject = "Website enquiry" + (topic ? " — " + topic : "");
      var bodyLines = [
        "Name: " + name,
        "Email: " + email,
        company ? "Company: " + company : "",
        topic ? "Area of interest: " + topic : "",
        "",
        message
      ].filter(Boolean);

      var href = "mailto:" + to +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(bodyLines.join("\n"));

      var status = document.getElementById("form-status");
      if (status) {
        status.hidden = false;
        status.textContent = "Opening your email app… if nothing happens, email " + to + " directly.";
      }
      window.location.href = href;
    });
  }
})();
