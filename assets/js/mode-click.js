// Chirpy pages: make the sidebar mode button a one-click light/dark toggle
// (no dropdown, no text labels), matching the /refs/ pages. The button's icon
// already reflects the current theme via the theme's CSS. The Light/Dark/System
// dropdown is hidden in CSS; here we drop its dropdown behaviour and flip the
// theme directly, writing the shared localStorage 'theme' key.
(function () {
  "use strict";
  function wire() {
    var btn = document.getElementById("mode-toggle");
    if (!btn) return;
    btn.removeAttribute("data-bs-toggle");
    btn.setAttribute("aria-label", "Toggle light/dark theme");
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var next = document.documentElement.getAttribute("data-bs-theme") === "light" ? "dark" : "light";
      try { localStorage.setItem("theme", next); } catch (_) {}
      document.documentElement.setAttribute("data-bs-theme", next);
    }, true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
