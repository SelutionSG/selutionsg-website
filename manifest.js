(function () {
  "use strict";

  /* Live event-day manifest. Polls the manifest_today() function in
     Supabase (see manifest-setup.sql) and replaces the sample rows with
     real check-in counts whenever events exist for today's date. If the
     fetch fails or there are no events today, the sample manifest stays. */

  if (typeof SUPABASE_URL === "undefined" || SUPABASE_URL.indexOf("http") !== 0) return;

  var rowsEl = document.getElementById("manifest-rows");
  var totalEl = document.getElementById("manifest-total");
  var footRight = document.querySelector(".manifest-foot-ok");
  if (!rowsEl || !totalEl || !footRight) return;

  var COLS = ["Call time", "Venue", "Role", "Crew", "Status"];

  function span(cls, text) {
    var s = document.createElement("span");
    s.className = cls;
    s.textContent = text;
    return s;
  }

  function render(events) {
    var frag = document.createDocumentFragment();
    var called = 0;
    var checked = 0;

    events.forEach(function (ev) {
      var crewCalled = Number(ev.crew_called) || 0;
      var checkedIn = Number(ev.checked_in) || 0;

      var li = document.createElement("li");
      li.className = "manifest-row";
      li.appendChild(span("m-time", ev.call_time || "—"));
      li.appendChild(span("m-venue", ev.venue || ev.event_code));
      li.appendChild(span("m-role", ev.role || ""));
      li.appendChild(span("m-count", String(crewCalled)));

      var status = span("m-status", "");
      if (crewCalled > 0 && checkedIn >= crewCalled) {
        var tick = document.createElement("i");
        tick.className = "tick";
        tick.setAttribute("aria-hidden", "true");
        status.appendChild(tick);
        status.appendChild(document.createTextNode("Checked in"));
      } else {
        status.className = "m-status pending";
        status.textContent = checkedIn + "/" + crewCalled + " in";
      }
      li.appendChild(status);

      /* Mobile stacked-row labels (script.js only labels the initial rows) */
      Array.prototype.forEach.call(li.children, function (cell, i) {
        cell.setAttribute("data-label", COLS[i]);
      });

      called += crewCalled;
      checked += checkedIn;
      frag.appendChild(li);
    });

    rowsEl.innerHTML = "";
    rowsEl.appendChild(frag);

    var gaps = Math.max(0, called - checked);
    totalEl.textContent = String(called);
    footRight.textContent = checked + " checked in · " + gaps + (gaps === 1 ? " gap" : " gaps");
    footRight.classList.toggle("manifest-foot-warn", gaps > 0);
  }

  function refresh() {
    fetch(SUPABASE_URL + "/rest/v1/rpc/manifest_today", {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: "{}"
    })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (events) {
        if (Array.isArray(events) && events.length) render(events);
      })
      .catch(function () { /* offline or not set up yet — keep the sample */ });
  }

  refresh();
  setInterval(refresh, 60000);
})();
