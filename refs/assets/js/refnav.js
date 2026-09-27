/* refnav.js — left site sidebar behaviour for the refs pages.
   The sidebar markup and its active state are static in each page; this only
   wires the mobile off-canvas toggle (backdrop / Esc / link-close). The
   GitHub link (data-gh-url) and handle (data-handle) are filled by
   app.js / sheet.js from window.CONTENT. */
(() => {
  "use strict";
  const body = document.body;
  const toggle = document.getElementById("rsb-toggle");
  const backdrop = document.querySelector(".rsb-backdrop");
  if (!toggle) return;
  const set = (open) => {
    body.classList.toggle("rsb-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };
  toggle.addEventListener("click", (e) => { e.stopPropagation(); set(!body.classList.contains("rsb-open")); });
  if (backdrop) backdrop.addEventListener("click", () => set(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
  document.querySelectorAll(".rsb-nav a").forEach((a) => a.addEventListener("click", () => set(false)));
})();
