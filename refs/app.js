/* ============================================================
   app.js — content.js を読んでホーム/全索引を描画。テーマ非依存。
   ・#index-list[data-preview="3"] : 大項目ごとに最新3件のプレビュー
   ・#index-all                     : 大項目ごとに全件（all.html）
   ・#search                        : title/jp/topics/slug を横断検索
   「最新」は volume.date（任意, YYYY-MM-DD）降順。無ければ記載順。
   ============================================================ */
(() => {
  "use strict";
  const C = window.CONTENT || {};
  const $  = (s, r = document) => r.querySelector(s);
  const all = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[m]));

  // --- scalar fields ---
  all("[data-handle]").forEach(e => e.textContent = C.handle || "d0me");
  all("[data-gh],[data-gh-url]").forEach(e => { if (C.githubUrl) e.setAttribute("href", C.githubUrl); });
  all("[data-blog]").forEach(e => { if (C.blogUrl) e.setAttribute("href", C.blogUrl); });
  all("[data-year]").forEach(e => e.textContent = new Date().getFullYear());
  all("[data-tagline-en]").forEach(e => e.textContent = C.taglineEn || "");
  all("[data-tagline-jp]").forEach(e => e.textContent = C.taglineJp || "");

  const motto = $("[data-motto]");
  if (motto && Array.isArray(C.motto)) motto.innerHTML = C.motto.map(esc).join('<span class="sep">・</span>');

  const vols    = Array.isArray(C.volumes) ? C.volumes : [];
  const certs   = Array.isArray(C.certs) ? C.certs : [];
  const domains = (Array.isArray(C.domains) && C.domains.length) ? C.domains
                  : [{ id: null, label: "Index", jp: "索引", glyph: "" }];
  const ready = vols.filter(v => v.status === "ready").length;
  all("[data-count-vol]").forEach(e => e.textContent = vols.length);
  all("[data-count-ready]").forEach(e => e.textContent = ready);
  all("[data-count-cert]").forEach(e => e.textContent = certs.length);
  all("[data-count-domain]").forEach(e => e.textContent = domains.length);

  // --- cert wall ---
  const wall = $("#cert-wall");
  if (wall) {
    wall.innerHTML = certs.map(c => `
      <figure class="badge">
        <img src="assets/badges/${esc(c.img)}" alt="${esc(c.code)} — ${esc(c.issuer)}" decoding="async"
             onerror="this.hidden=true;this.nextElementSibling.hidden=false">
        <figcaption class="fb" hidden><b>${esc(c.code)}</b><span>${esc(c.issuer)}</span></figcaption>
      </figure>`).join("");
  }

  // --- sort: date desc first, undated keep authored order ---
  const sortVols = (arr) => arr.map((v, i) => [v, i]).sort((a, b) => {
    const da = a[0].date, db = b[0].date;
    if (da && db) return da < db ? 1 : (da > db ? -1 : a[1] - b[1]);
    if (da) return -1;
    if (db) return 1;
    return a[1] - b[1];
  }).map(x => x[0]);

  // --- one volume row ---
  const volMarkup = (v) => {
    const isReady = v.status === "ready";
    const search = [v.title, v.jp, v.topics, v.slug].filter(Boolean).join(" ").toLowerCase();
    const inner = `
      <span class="vol-main">
        <span class="vol-title">${esc(v.title)}</span>
        <span class="vol-jp">${esc(v.jp || "")}</span>
        <span class="vol-topics">${esc(v.topics || "")}</span>
      </span>
      <span class="vol-go">${isReady ? "→" : "soon"}</span>`;
    const attrs = `data-search="${esc(search)}" data-domain="${esc(v.domain || "")}"`;
    return isReady
      ? `<a class="vol" data-status="ready" ${attrs} href="sheets/${esc(v.slug)}.html">${inner}</a>`
      : `<div class="vol" data-status="soon" ${attrs}>${inner}</div>`;
  };

  // --- render grouped index (home preview or full) ---
  const renderGroups = (container, { preview = 0, hrefBase = "" }) => {
    container.innerHTML = domains.map(dom => {
      const items = vols.filter(v => (v.domain || null) === dom.id);
      if (!items.length) return "";
      const total = items.length, r = items.filter(x => x.status === "ready").length;
      const sorted = sortVols(items);
      const shown = preview > 0 ? sorted.slice(0, preview) : sorted;
      const more = preview > 0 && total > preview
        ? `<a class="dh-more" href="${hrefBase}all.html#dom-${esc(dom.id)}">全${total} →</a>` : "";
      return `<section class="domain" id="dom-${esc(dom.id)}">
        <div class="domain-head">
          <span class="dh-hx">##</span>
          <span class="dh-label">${esc(dom.label)}</span>
          <span class="dh-jp">${esc(dom.jp || "")}</span>
          <span class="dh-glyph" aria-hidden="true">${esc(dom.glyph || "")}</span>
          <span class="dh-ln"></span>
          <span class="dh-ct">${r}/${total}</span>${more}
        </div>
        <div class="vol-list">${shown.map(volMarkup).join("")}</div>
      </section>`;
    }).join("");
  };

  const home = $("#index-list");
  if (home) renderGroups(home, { preview: parseInt(home.dataset.preview || "0", 10) });

  const full = $("#index-all");
  if (full) renderGroups(full, { preview: 0 });

  // --- domain quick-nav ---
  const dnav = $("#domain-nav");
  if (dnav) {
    dnav.innerHTML = domains
      .filter(d => vols.some(v => (v.domain || null) === d.id))
      .map(d => `<a href="#dom-${esc(d.id)}">${esc(d.label)} <span>${esc(d.jp || "")}</span></a>`).join("");
  }

  // --- keyword search (all.html) ---
  const box = $("#search");
  if (box) {
    const count = $("#search-count");
    const apply = () => {
      const q = box.value.trim().toLowerCase();
      let n = 0;
      all(".vol").forEach(el => {
        const hit = !q || (el.dataset.search || "").includes(q);
        el.hidden = !hit; if (hit) n++;
      });
      all(".domain").forEach(d => {
        d.hidden = ![...d.querySelectorAll(".vol")].some(v => !v.hidden);
      });
      if (count) count.textContent = q ? `${n} 件` : "";
    };
    box.addEventListener("input", apply);
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== box) { e.preventDefault(); box.focus(); }
      else if (e.key === "Escape" && document.activeElement === box) { box.value = ""; apply(); box.blur(); }
    });
  }
})();
