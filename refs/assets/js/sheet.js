/* sheet.js — cheat-sheet page behaviour. Reads window.CONTENT for handle/links. */
(() => {
  "use strict";
  const C = window.CONTENT || {};
  const all = (s, r = document) => [...r.querySelectorAll(s)];

  all("[data-handle]").forEach(e => e.textContent = C.handle || "d0me");
  all("[data-gh-url],[data-gh]").forEach(e => { if (C.githubUrl) e.setAttribute("href", C.githubUrl); });
  all("[data-blog]").forEach(e => { if (C.blogUrl) e.setAttribute("href", C.blogUrl); });
  all("[data-year]").forEach(e => e.textContent = new Date().getFullYear());

  // copy buttons
  all(".code").forEach(block => {
    const btn = block.querySelector(".copy"), pre = block.querySelector("pre code");
    if (!btn || !pre) return;
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.innerText.trim());
        const p = btn.textContent; btn.textContent = "copied"; btn.classList.add("done");
        setTimeout(() => { btn.textContent = p; btn.classList.remove("done"); }, 1400);
      } catch { btn.textContent = "err"; }
    });
  });

  // mobile nav
  const toggle = document.querySelector(".nav-toggle"), nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => nav.classList.toggle("open"));
    nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));
  }

  // reveal on scroll
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const io = ("IntersectionObserver" in window && !reduce)
    ? new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 })
    : null;
  all(".reveal").forEach(el => io ? io.observe(el) : el.classList.add("in"));

  // TOC scroll-spy
  const links = all(".toc a");
  if (links.length) {
    const map = new Map();
    links.forEach(a => { const t = document.getElementById(a.getAttribute("href").slice(1)); if (t) map.set(t, a); });
    const spy = new IntersectionObserver((es) => es.forEach(e => {
      if (e.isIntersecting) { links.forEach(l => l.classList.remove("active")); map.get(e.target)?.classList.add("active"); }
    }), { rootMargin: "-20% 0px -70% 0px" });
    map.forEach((_, t) => spy.observe(t));
  }

  // TOC overlay. A fixed, icon-only button (mirroring back-to-top) opens the
  // TOC as a panel on top of the page over a dimmed backdrop, on every screen
  // size. It closes on a backdrop click, a TOC link, or Escape.
  const layout = document.querySelector(".sheet-layout");
  if (layout && document.querySelector(".toc")) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "toc-toggle";
    btn.textContent = "☰"; // ☰
    btn.setAttribute("aria-label", "Toggle table of contents");
    const sync = () => {
      const open = layout.classList.contains("toc-open");
      btn.classList.toggle("off", !open);
      btn.setAttribute("aria-expanded", String(open));
      btn.title = open ? "Hide contents" : "Show contents";
    };
    const close = () => { if (layout.classList.contains("toc-open")) { layout.classList.remove("toc-open"); sync(); } };
    btn.addEventListener("click", (e) => { e.stopPropagation(); layout.classList.toggle("toc-open"); sync(); });
    document.addEventListener("click", (e) => {
      if (!layout.classList.contains("toc-open")) return;
      if (e.target === btn || e.target.closest(".toc")) return;
      close();
    });
    layout.querySelector(".toc").addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    document.body.appendChild(btn);
    sync();
  }
})();

/* ===== back to top (全 sheet 共通、ボタンを動的生成) ===== */
(function(){
  var btn = document.createElement('button');
  btn.className = 'to-top';
  btn.id = 'toTop';
  btn.type = 'button';
  btn.setAttribute('aria-label', '上部へ戻る');
  btn.setAttribute('title', '上部へ戻る');
  btn.textContent = '↑';
  document.body.appendChild(btn);

  var threshold = 420;
  function onScroll(){
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    btn.classList.toggle('show', y > threshold);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  btn.addEventListener('click', function(){
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  onScroll();
})();
