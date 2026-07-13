(function () {
  "use strict";

  /* Mobile nav toggle */
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
      });
    });
  }

  /* Manifest date + mobile row labels */
  var dateEl = document.getElementById("manifest-date");
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("en-SG", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  var colLabels = ["Call time", "Venue", "Role", "Crew", "Status"];
  document.querySelectorAll(".manifest-row").forEach(function (row) {
    Array.prototype.forEach.call(row.children, function (cell, i) {
      if (colLabels[i]) cell.setAttribute("data-label", colLabels[i]);
    });
  });

  /* Scroll reveals */
  var revealTargets = document.querySelectorAll(
    ".badge-card, .tl-item, .portfolio-item, .report-card, .faq-item, .services .section-title, .timeline .section-title, .coverage .section-title, .wrap-reports .section-title, .faq .section-title"
  );
  revealTargets.forEach(function (el) { el.classList.add("reveal"); });

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if ("IntersectionObserver" in window && !prefersReduced) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealTargets.forEach(function (el) {
      var group = el.closest(".badge-grid, .tl-list, .portfolio-grid, .report-grid");
      if (group) {
        var siblings = Array.prototype.indexOf.call(group.children, el.closest("li") || el);
        el.style.transitionDelay = Math.min(siblings * 60, 360) + "ms";
      }
      io.observe(el);
    });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Portfolio: flag empty slots, wire up lightbox */
  var portfolioItems = document.querySelectorAll(".portfolio-item");
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxCaption = document.getElementById("lightbox-caption");
  var lightboxClose = document.getElementById("lightbox-close");
  var lastFocused = null;

  function openLightbox(item) {
    var img = item.querySelector("img");
    var caption = item.querySelector("figcaption");
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = caption ? caption.textContent : "";
    lastFocused = document.activeElement;
    lightbox.hidden = false;
    lightboxClose.focus();
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = "";
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  portfolioItems.forEach(function (item) {
    var img = item.querySelector("img");
    var filename = img.getAttribute("src").split("/").pop();
    item.setAttribute("data-filename", "Add " + filename);

    img.addEventListener("error", function () {
      // Dashed "add photo" placeholders are an authoring aid — local only.
      if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
        item.classList.add("is-empty");
      } else {
        item.style.display = "none";
      }
    });

    item.addEventListener("click", function () {
      if (!item.classList.contains("is-empty")) openLightbox(item);
    });
  });

  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
    });
  }

  /* WhatsApp widget */
  var waButton = document.getElementById("wa-button");
  var waPopover = document.getElementById("wa-popover");
  var waClose = document.getElementById("wa-popover-close");

  function openWaPopover() {
    waPopover.hidden = false;
    requestAnimationFrame(function () { waPopover.classList.add("is-open"); });
    waButton.setAttribute("aria-expanded", "true");
  }
  function closeWaPopover() {
    waPopover.classList.remove("is-open");
    waButton.setAttribute("aria-expanded", "false");
    window.setTimeout(function () { waPopover.hidden = true; }, prefersReduced ? 0 : 180);
  }

  if (waButton && waPopover) {
    waButton.addEventListener("click", function () {
      if (waPopover.classList.contains("is-open")) {
        closeWaPopover();
      } else {
        openWaPopover();
      }
    });
    if (waClose) waClose.addEventListener("click", closeWaPopover);

    document.addEventListener("click", function (e) {
      if (
        waPopover.classList.contains("is-open") &&
        !waPopover.contains(e.target) &&
        !waButton.contains(e.target)
      ) {
        closeWaPopover();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && waPopover.classList.contains("is-open")) closeWaPopover();
    });
  }

  /* Request form -> mailto */
  var form = document.getElementById("request-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var data = new FormData(form);
      var roles = data.getAll("roles").join(", ") || "Not specified";
      var lines = [
        "Company: " + data.get("company"),
        "Event date: " + data.get("date"),
        "Venue: " + data.get("venue"),
        "Headcount: " + data.get("headcount"),
        "Roles needed: " + roles,
        "Contact email: " + data.get("email"),
        "",
        "Notes:",
        data.get("message") || "(none)"
      ];

      var subject = "Crew request — " + (data.get("company") || "New enquiry");
      var body = lines.join("\n");
      var mailto =
        "mailto:sales@selutionsg.com?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);

      window.location.href = mailto;
    });
  }
})();
