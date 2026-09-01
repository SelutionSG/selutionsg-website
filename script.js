(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Mobile nav ───────────────────────────────────────────────────────── */
  var toggle = document.getElementById("nav-toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      links.classList.toggle("is-open", !open);
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        toggle.setAttribute("aria-expanded", "false");
        links.classList.remove("is-open");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && links.classList.contains("is-open")) {
        toggle.setAttribute("aria-expanded", "false");
        links.classList.remove("is-open");
        toggle.focus();
      }
    });
  }

  /* ── Hero: use assets/hero.mp4 when present, else cycle the photos ────── */
  var video = document.getElementById("hero-video");
  var montage = document.getElementById("hero-montage");

  if (video) {
    // Only commit to the video once the browser confirms it can actually play.
    // No explicit load() here — preload="metadata" already fetches it, and
    // calling load() as well made the page request the file twice.
    video.addEventListener("canplay", function () {
      video.classList.add("is-playing");
      video.play().catch(function () {
        video.classList.remove("is-playing");
      });
    });
    video.addEventListener("error", function () { video.classList.remove("is-playing"); });
  }

  if (montage && !reduced) {
    var shots = montage.querySelectorAll("img");
    if (shots.length > 1) {
      var i = 0;
      setInterval(function () {
        if (video && video.classList.contains("is-playing")) return;
        shots[i].classList.remove("is-on");
        i = (i + 1) % shots.length;
        // restart the ken-burns drift on the incoming frame
        shots[i].style.animation = "none";
        void shots[i].offsetWidth;
        shots[i].style.animation = "";
        shots[i].classList.add("is-on");
      }, 5200);
    }
  }

  /* ── Manifest: date + mobile row labels ───────────────────────────────── */
  var dateEl = document.getElementById("manifest-date");
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("en-SG", {
      weekday: "short", day: "2-digit", month: "short"
    });
  }

  var COLS = ["Call", "Venue", "Role", "Crew", "Status"];
  document.querySelectorAll(".manifest-row").forEach(function (row) {
    Array.prototype.forEach.call(row.children, function (cell, n) {
      if (COLS[n]) cell.setAttribute("data-label", COLS[n]);
    });
  });

  /* ── Scroll reveals ───────────────────────────────────────────────────── */
  var targets = document.querySelectorAll(
    ".band-head, .week-card, .channel, .svc, .person, .manifest, .quote, .logos, .perk, .join-cta, .hire-form, .contact-list"
  );

  if ("IntersectionObserver" in window && !reduced) {
    targets.forEach(function (el) { el.classList.add("reveal"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

    targets.forEach(function (el) {
      var group = el.closest(".week-grid, .channels, .svc-grid, .crew-grid, .quotes, .perks");
      if (group) {
        var n = Array.prototype.indexOf.call(group.children, el);
        if (n > 0) el.style.transitionDelay = Math.min(n * 70, 350) + "ms";
      }
      io.observe(el);
    });
  }

  /* ── Client logos: hide slots with no file yet ────────────────────────── */
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  document.querySelectorAll(".logo-slot").forEach(function (slot) {
    var img = slot.querySelector("img");
    if (!img) return;
    slot.setAttribute("data-file", img.getAttribute("src").split("/").pop());

    function markEmpty() {
      slot.classList.add("is-empty");
      if (local) slot.classList.add("show-slot");
    }
    img.addEventListener("error", markEmpty);
    // catch files that already failed before this script ran
    if (img.complete && img.naturalWidth === 0) markEmpty();
  });

  // Hide the whole block if no logos have been added yet.
  var logos = document.getElementById("logos");
  if (logos) {
    window.setTimeout(function () {
      var filled = logos.querySelectorAll(".logo-slot:not(.is-empty)").length;
      if (!filled && !local) logos.style.display = "none";
    }, 600);
  }

  /* ── YouTube facades: swap in the real player only when asked ─────────── */
  document.querySelectorAll(".yt-facade").forEach(function (facade) {
    facade.addEventListener("click", function () {
      var id = facade.getAttribute("data-video");
      if (!id) return;
      var frame = document.createElement("iframe");
      frame.className = "yt-frame";
      // nocookie host: no tracking cookies unless the video is actually played
      frame.src = "https://www.youtube-nocookie.com/embed/" + id +
                  "?autoplay=1&rel=0&modestbranding=1";
      frame.title = facade.getAttribute("data-title") || "Selution video";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture";
      frame.setAttribute("allowfullscreen", "");
      facade.replaceWith(frame);
      frame.focus();
    });
  });

  /* ── Hire form → mailto ───────────────────────────────────────────────── */
  var form = document.getElementById("hire-form");
  var status = document.getElementById("form-status");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        if (status) status.textContent = "Fill in the required fields and try again.";
        return;
      }

      var data = new FormData(form);
      var roles = data.getAll("roles").join(", ") || "Not specified";
      var body = [
        "Company: " + data.get("company"),
        "Event date: " + data.get("date"),
        "Venue: " + data.get("venue"),
        "Headcount: " + data.get("headcount"),
        "Roles: " + roles,
        "Contact email: " + data.get("email"),
        "",
        "Notes:",
        data.get("notes") || "(none)"
      ].join("\n");

      window.location.href =
        "mailto:sales@selutionsg.com" +
        "?subject=" + encodeURIComponent("Crew brief — " + (data.get("company") || "New enquiry")) +
        "&body=" + encodeURIComponent(body);

      if (status) {
        status.className = "ok";
        status.textContent = "Opening your email app with the brief filled in.";
      }
    });
  }
})();
