/* vars.js — live variable substitution for cheat sheets.

   Placeholders are marked as <span class="v">&lt;NAME&gt;</span>. This builds a
   toolbar of the distinct <NAME> tokens on the page; typing a value replaces
   every matching placeholder in-place (prose and code), and because the copy
   buttons read the code's text, copied commands carry the substituted values.

   The typed value is written with textContent, so it is emitted verbatim as a
   literal string — special characters in a password (e.g. < > & " ' $ ` | ; and
   spaces) are preserved exactly and are never parsed as HTML. Only a
   whitespace-only entry is treated as empty; the value itself is never trimmed.

   Values are stored in localStorage under one key, so they carry across every
   sheet in this browser. Nothing leaves the browser. */
(() => {
  "use strict";

  const STORE = "d0me:vars";
  const COLLAPSE = "d0me:vars:collapsed";
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { return {}; } };
  const save = (o) => { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch { /* ignore */ } };
  const loadCollapsed = () => { try { return localStorage.getItem(COLLAPSE) === "1"; } catch { return false; } };
  const saveCollapsed = (v) => { try { localStorage.setItem(COLLAPSE, v ? "1" : "0"); } catch { /* ignore */ } };

  // Example values shown as the field's placeholder (guidance only, not applied).
  const EXAMPLES = {
    LHOST: "10.10.14.9", LPORT: "4444", RHOST: "10.10.10.10", RPORT: "445",
    TARGET: "10.10.10.10", TARGET_B: "10.10.10.20", HOST_IP: "10.10.10.10",
    INTERNAL_TARGET: "172.16.1.5", PIVOT: "10.10.14.9", CRAWLER_IP: "10.10.14.9",
    DC_IP: "10.10.10.5", DC: "dc01", MACHINE: "WS01", HOSTNAME: "dc01",
    CIDR: "10.10.10.0/24", INTERNAL_CIDR: "172.16.1.0/24", "TARGET_SUBNET/24": "10.10.10.0/24",
    USER: "alice", USERNAME: "alice", LOCAL_USER: "admin", DOMAIN_USER: "alice",
    DA_USER: "administrator", ID: "alice", SID: "S-1-5-21-…-1103",
    PASSWORD: "P@ssw0rd!", PASS: "P@ssw0rd!", PW: "P@ssw0rd!",
    DOMAIN: "corp.local", DOMAIN_SID: "S-1-5-21-1004336348-1177238915-682003330",
    TARGET_FQDN: "dc01.corp.local", URL: "http://10.10.10.10/",
    NT: "aad3b435b51404eeaad3b435b51404ee", NTLM: "31d6cfe0d16ae931b73c59d7e0c089c0",
    NTLM_HASH: "aad3b435…:31d6cfe0…", B64: "<base64>",
    TOOL_DIR: "/opt/tools", OUT: "/tmp/out", OUT_DIR: "/tmp/loot", PATH: "/tmp/x",
    PAYLOAD_PATH: "/tmp/shell.exe", PID: "1337", SERVICE_NAME: "MyService",
    SVC_TITLE: "MyService", SVC_DESC: "desc"
  };
  const exampleFor = (k, def) => {
    if (def && !/^<[^<>]+>$/.test(def)) return def; // a real default value is the truest example
    return EXAMPLES[k] || EXAMPLES[k.toUpperCase()] || ("<" + k + ">");
  };

  const isToken = (t) => /^<[^<>]+>$/.test(t.trim());
  const keyOf = (t) => t.trim().replace(/^<|>$/g, "");

  // A .v is a variable when its text is a <NAME> token, or when it carries an
  // explicit data-var (whose current text is a real default value, e.g.
  // <span class="v" data-var="TARGET">10.10.10.10</span>).
  const spans = [...document.querySelectorAll(".v")].filter((s) => s.dataset.var || isToken(s.textContent));
  if (!spans.length) return;

  const keys = [];
  const byKey = new Map();
  const defaults = new Map(); // key -> default display when unset
  spans.forEach((s) => {
    const explicit = s.dataset.var && !isToken(s.textContent);
    const k = explicit ? s.dataset.var : keyOf(s.textContent.trim());
    const ph = explicit ? s.textContent : s.textContent.trim();
    if (!s.dataset.ph) s.dataset.ph = ph;   // what to show when the value is empty
    s.dataset.var = k;
    if (!byKey.has(k)) { byKey.set(k, []); keys.push(k); defaults.set(k, s.dataset.ph); }
    byKey.get(k).push(s);
  });

  const values = load();

  const applyKey = (k) => {
    const v = values[k];
    const hasVal = typeof v === "string" && v.length > 0;
    byKey.get(k).forEach((s) => {
      if (hasVal) { s.textContent = v; s.classList.add("set"); }
      else { s.textContent = s.dataset.ph; s.classList.remove("set"); }
    });
  };
  keys.forEach(applyKey);

  // --- toolbar ---
  const bar = document.createElement("div");
  bar.id = "var-bar";

  const head = document.createElement("div");
  head.className = "var-bar-head";
  head.innerHTML = '<span class="vb-caret">▾</span><span class="vb-hx">$</span> vars'
    + '<span class="vb-note">値を入れると全コマンドに反映 · この端末内のみ保存</span>'
    + '<span class="vb-count"></span>';
  const count = head.querySelector(".vb-count");
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "vb-reset";
  reset.textContent = "reset";
  head.appendChild(reset);

  // Count of currently-set variables, shown on the collapsed strip so the
  // bar still signals state when the fields are hidden.
  const refreshCount = () => {
    const n = keys.filter((k) => typeof values[k] === "string" && values[k].length > 0).length;
    count.textContent = n ? "· " + n + " set" : "· none set";
  };

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
    inp.placeholder = exampleFor(k, defaults.get(k));
    inp.value = (typeof values[k] === "string") ? values[k] : "";
    inp.addEventListener("input", () => {
      const raw = inp.value;             // preserve exactly, including symbols/spaces
      if (raw.trim()) values[k] = raw;   // whitespace-only counts as empty
      else delete values[k];
      save(values);
      applyKey(k);
      refreshCount();
    });
    wrap.appendChild(name);
    wrap.appendChild(inp);
    fields.appendChild(wrap);
  });

  reset.addEventListener("click", (e) => {
    e.stopPropagation();               // don't also toggle the collapse
    keys.forEach((k) => delete values[k]);
    save(values);
    fields.querySelectorAll("input").forEach((i) => { i.value = ""; });
    keys.forEach(applyKey);
    refreshCount();
  });

  // Header toggles the fields panel; the bar stays sticky either way, so the
  // vars are one click from anywhere on the page. State persists per browser.
  const setCollapsed = (v) => { bar.classList.toggle("collapsed", v); saveCollapsed(v); };
  head.addEventListener("click", () => setCollapsed(!bar.classList.contains("collapsed")));
  if (loadCollapsed()) bar.classList.add("collapsed");
  refreshCount();

  bar.appendChild(head);
  bar.appendChild(fields);

  const layout = document.querySelector(".sheet-layout");
  if (layout && layout.parentNode) layout.parentNode.insertBefore(bar, layout);
  else (document.querySelector(".doc") || document.body).prepend(bar);

  // The bar is sticky below the topbar, so a TOC jump must clear both. Expose
  // the bar's live height as --vbar-h; the sheet CSS adds it to section
  // scroll-margin so anchored headings land below the bar, collapsed or not.
  const syncOffset = () => document.documentElement.style.setProperty("--vbar-h", bar.offsetHeight + "px");
  syncOffset();
  if (window.ResizeObserver) new ResizeObserver(syncOffset).observe(bar);
  else window.addEventListener("resize", syncOffset);
})();
