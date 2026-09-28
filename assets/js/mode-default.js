// Theme initializer, shared by the Chirpy pages and the standalone /refs/
// terminal pages. Dark is the site's default; a stored choice (localStorage
// 'theme', written by the sidebar toggle) is honoured, and anything else
// (unset, or Chirpy's "system") resolves to dark rather than following the OS.
// Loaded synchronously in <head> before first paint, so there is no flash.
// On Chirpy pages it runs after the theme script and simply re-asserts the
// same value; on the standalone pages it is the only thing that applies the
// theme. Setting the attribute here does not disable Chirpy's toggle (its
// toggleability is decided earlier, from the absence of a static attribute).
(function () {
  var m = 'dark';
  try {
    var s = localStorage.getItem('theme');
    if (s === 'light' || s === 'dark') m = s;
  } catch (e) {}
  document.documentElement.setAttribute('data-bs-theme', m);
})();
