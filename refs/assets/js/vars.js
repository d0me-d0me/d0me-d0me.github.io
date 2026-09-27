/* vars.js — live variable substitution for cheat sheets.

   Placeholders are marked as <span class="v">&lt;NAME&gt;</span>. This builds a
   toolbar of the distinct <NAME> tokens on the page; typing a value replaces
   every matching placeholder in-place (prose and code), and because the copy
   buttons read the code's text, copied commands carry the substituted values.

   Values are stored in localStorage under one key, so they carry across every
   sheet in this browser. Nothing leaves the browser. */
(() => {
  "use strict";

  const STORE = "d0me:vars";
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { return {}; } };
  const save = (o) => { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch { /* ignore */ } };

  const isToken = (t) => /^<[^<>]+>$/.test(t.trim());
  const keyOf = (t) => t.trim().replace(/^<|>$/g, "");

  const spans = [...document.querySelectorAll(".v")].filter((s) => isToken(s.textContent));
  if (!spans.length) return;

  const keys = [];
  const byKey = new Map();
  spans.forEach((s) => {
    const ph = s.textContent.trim();
    const k = keyOf(ph);
    if (!s.dataset.ph) s.dataset.ph = ph;
    s.dataset.var = k;
    if (!byKey.has(k)) { byKey.set(k, []); keys.push(k); }
    byKey.get(k).push(s);
  });

  const values = load();

  const applyKey = (k) => {
    const v = values[k];
    byKey.get(k).forEach((s) => {
      if (v) { s.textContent = v; s.classList.add("set"); }
      else { s.textContent = s.dataset.ph; s.classList.remove("set"); }
    });
  };
  keys.forEach(applyKey);

  // --- toolbar ---
  const bar = document.createElement("div");
  bar.id = "var-bar";

  const head = document.createElement("div");
  head.className = "var-bar-head";
  head.innerHTML = '<span class="vb-hx">$</span> vars'
    + '<span class="vb-note">値を入れると全コマンドに反映 · この端末内のみ保存</span>';
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "vb-reset";
  reset.textContent = "reset";
  head.appendChild(reset);

  const fields = document.createElement("div");
  fields.className = "var-bar-fields";

  keys.forEach((k) => {
    const wrap = document.createElement("label");
    wrap.className = "vb-field";
    const name = document.createElement("span");
    name.textContent = k;
    const inp = document.createElement("input");
    inp.type = "text";
    inp.autocomplete = "off";
    inp.spellcheck = false;
    inp.placeholder = "<" + k + ">";
    inp.value = values[k] || "";
    inp.addEventListener("input", () => {
      const val = inp.value.trim();
      if (val) values[k] = val; else delete values[k];
      save(values);
      applyKey(k);
    });
    wrap.appendChild(name);
    wrap.appendChild(inp);
    fields.appendChild(wrap);
  });

  reset.addEventListener("click", () => {
    keys.forEach((k) => delete values[k]);
    save(values);
    fields.querySelectorAll("input").forEach((i) => { i.value = ""; });
    keys.forEach(applyKey);
  });

  bar.appendChild(head);
  bar.appendChild(fields);

  const layout = document.querySelector(".sheet-layout");
  if (layout && layout.parentNode) layout.parentNode.insertBefore(bar, layout);
  else (document.querySelector(".doc") || document.body).prepend(bar);
})();
