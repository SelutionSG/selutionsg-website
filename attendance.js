(function () {
  "use strict";

  /* Shared by checkin.html and checkout.html.
     Each page sets ATTENDANCE_KIND = "in" | "out" before including this. */
  var KIND = typeof ATTENDANCE_KIND !== "undefined" ? ATTENDANCE_KIND : "in";

  var form = document.getElementById("checkin-form");
  var statusEl = document.getElementById("status");
  var submitBtn = document.getElementById("submit-btn");
  var selfieBtn = document.getElementById("selfie-btn");
  var selfieInput = document.getElementById("selfie-input");
  var selfiePreview = document.getElementById("selfie-preview");
  var successEl = document.getElementById("success");

  var client = null;
  if (typeof SUPABASE_URL !== "undefined" && SUPABASE_URL.indexOf("http") === 0) {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  function setStatus(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.className = kind || "";
  }

  /* Selfie capture */
  var selfieFile = null;
  selfieBtn.addEventListener("click", function () { selfieInput.click(); });
  selfieInput.addEventListener("change", function () {
    if (selfieInput.files && selfieInput.files[0]) {
      selfieFile = selfieInput.files[0];
      selfiePreview.src = URL.createObjectURL(selfieFile);
      selfiePreview.style.display = "block";
      selfieBtn.textContent = "Retake selfie";
    }
  });

  /* Re-encode selfie to a bounded JPEG so uploads are small and
     always browser-readable (handles iPhone HEIC via canvas). */
  function toJpeg(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var maxSide = 1280;
        var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          URL.revokeObjectURL(url);
          resolve(blob || file); // fall back to original on encode failure
        }, "image/jpeg", 0.8);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        resolve(file); // canvas can't read it — upload original
      };
      img.src = url;
    });
  }

  function getPosition() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Error("This browser doesn't support location."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      });
    });
  }

  /* Turn coordinates into a readable address (OpenStreetMap Nominatim).
     Best-effort: check-in proceeds with coordinates only if this fails. */
  async function reverseGeocode(lat, lng) {
    try {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 6000);
      var res = await fetch(
        "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" +
          lat + "&lon=" + lng + "&zoom=18",
        { signal: ctrl.signal, headers: { Accept: "application/json" } }
      );
      clearTimeout(timer);
      if (!res.ok) return null;
      var j = await res.json();
      return j.display_name ? String(j.display_name).slice(0, 300) : null;
    } catch (e) {
      return null;
    }
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    var name = document.getElementById("f-name").value.trim();
    var phone = document.getElementById("f-phone").value.replace(/\D/g, "");
    var eventCode = document.getElementById("f-event").value.trim().toUpperCase();
    var consent = document.getElementById("f-consent").checked;

    if (!client) { setStatus("This page isn't configured yet. Contact the ops team.", "err"); return; }
    if (!name) { setStatus("Enter your full name.", "err"); return; }
    if (phone.length !== 8) { setStatus("Enter your 8-digit mobile number.", "err"); return; }
    if (!eventCode) { setStatus("Enter the event code from your briefing pack.", "err"); return; }
    if (!selfieFile) { setStatus("Take a selfie first.", "err"); return; }
    if (!consent) { setStatus("Tick the consent box to continue.", "err"); return; }

    submitBtn.disabled = true;

    try {
      setStatus("Getting your location…");
      var pos = await getPosition();
      var locationText = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);

      setStatus("Uploading selfie…");
      var jpeg = await toJpeg(selfieFile);
      var safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      var path = eventCode + "/" + KIND + "_" + Date.now() + "_" + safeName + ".jpg";
      var upload = await client.storage.from("selfies").upload(path, jpeg, {
        contentType: "image/jpeg"
      });
      if (upload.error) throw new Error("Selfie upload failed: " + upload.error.message);

      setStatus(KIND === "out" ? "Logging your check-out…" : "Logging your check-in…");
      var insert = await client.from("checkins").insert({
        record_type: KIND,
        full_name: name,
        phone: phone,
        event_code: eventCode,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy_m: pos.coords.accuracy,
        location_text: locationText,
        device_time: new Date().toISOString(),
        selfie_path: path,
        user_agent: navigator.userAgent.slice(0, 250)
      });
      if (insert.error) throw new Error((KIND === "out" ? "Check-out failed: " : "Check-in failed: ") + insert.error.message);

      var ref = "SLT-" + Date.now().toString(36).toUpperCase();
      document.getElementById("success-time").textContent =
        new Date().toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" });
      document.getElementById("success-ref").textContent = "Ref: " + ref;
      form.style.display = "none";
      successEl.style.display = "block";
      setStatus("");
    } catch (err) {
      var msg = err && err.message ? err.message : "Something went wrong. Try again.";
      if (err && err.code === 1) msg = "Location permission denied. Enable location and try again — it's required.";
      if (err && err.code === 3) msg = "Couldn't get your location in time. Move somewhere with better signal and retry.";
      setStatus(msg, "err");
      submitBtn.disabled = false;
    }
  });
})();
