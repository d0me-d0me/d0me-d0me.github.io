// 404 page: echo the path the visitor actually tried to open into the shell
// prompt, so the error reads like a real terminal ("open /the/bad/path" →
// "no such file or directory"). Progressive enhancement: without JS the
// markup shows the literal "$REQUEST_URI", which reads as an unexpanded shell
// variable and is fine. textContent (never innerHTML) keeps the untrusted
// URL inert — it is rendered as text, so a crafted path cannot inject markup.
(function () {
  "use strict";
  try {
    var el = document.getElementById("e404-path");
    if (!el) return;
    var p = location.pathname + location.search;
    if (p && p !== "/") el.textContent = p;
  } catch (_) {}
})();
