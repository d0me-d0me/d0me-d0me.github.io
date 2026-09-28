/* refnav.js — left site sidebar behaviour for the refs pages (sheets + all).
   Handles the mobile off-canvas toggle and the desktop collapse/hide:
   - mobile (<1000px): #rsb-toggle opens/closes the off-canvas sidebar.
   - desktop (>=1000px): #rsb-collapse hides the sidebar (full-width content);
     #rsb-toggle then re-shows it. The collapsed state persists per browser.
   The GitHub link and handle in the sidebar are static in the include. */
(() => {
  "use strict";
  const body = document.body;
  const toggle = document.getElementById("rsb-toggle");
  const collapse = document.getElementById("rsb-collapse");
  const backdrop = document.querySelector(".rsb-backdrop");
  const KEY = "d0me:refs:sb-collapsed";
  const isDesktop = () => window.matchMedia("(min-width:1000px)").matches;

  // Restore the persisted desktop collapse state (harmless on mobile, where
  // the class has no styling effect).
  try { if (localStorage.getItem(KEY) === "1") body.classList.add("rsb-collapsed"); } catch { /* ignore */ }

  const setOpen = (open) => {
    body.classList.toggle("rsb-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", String(open));
  };
  const setCollapsed = (v) => {
    body.classList.toggle("rsb-collapsed", v);
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ }
  };

  if (toggle) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isDesktop()) setCollapsed(false);                       // desktop: re-show a hidden sidebar
      else setOpen(!body.classList.contains("rsb-open"));         // mobile: off-canvas open/close
    });
  }
  if (collapse) {
    collapse.addEventListener("click", (e) => { e.stopPropagation(); setCollapsed(true); });
  }
  if (backdrop) backdrop.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  document.querySelectorAll(".rsb-nav a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
})();
