// Light/dark toggle for the standalone /refs/ terminal pages (sheets and
// all.html). The Chirpy pages have their own sidebar toggle; this injects a
// small fixed button that flips document.documentElement's data-bs-theme and
// stores the choice under the same localStorage 'theme' key, so a switch made
// here carries over to the Chirpy pages and vice versa. Dark is the default
// (applied by assets/js/mode-default.js before paint).
(function () {
  "use strict";
  function cur() {
    return document.documentElement.getAttribute("data-bs-theme") === "light" ? "light" : "dark";
  }
  var btn = document.createElement("button");
  btn.type = "button";
  btn.id = "mode-switch";
  function sync() {
    var light = cur() === "light";
    btn.textContent = light ? "☀" : "☾";
    var label = light ? "Switch to dark theme" : "Switch to light theme";
    btn.setAttribute("aria-label", label);
    btn.title = label;
    // keep the mobile address-bar colour in step with the toggle
    try {
      var tc = document.querySelector('meta[name="theme-color"]:not([media])');
      if (tc) tc.setAttribute("content", light ? "#FAF9F5" : "#0B0B0C");
    } catch (e) {}
  }
  btn.addEventListener("click", function () {
    var next = cur() === "light" ? "dark" : "light";
    try { localStorage.setItem("theme", next); } catch (e) {}
    document.documentElement.setAttribute("data-bs-theme", next);
    sync();
  });
  function mount() { document.body.appendChild(btn); sync(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
