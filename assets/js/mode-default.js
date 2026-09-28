// Dark is the site's default. Chirpy's theme script follows the OS
// prefers-color-scheme when the visitor has not picked a theme; here we force
// dark instead, unless a choice is already stored. Loaded synchronously in
// <head> right after the theme script, so it runs before first paint (no
// flash), and it leaves any stored choice (localStorage 'theme') untouched so
// the sidebar toggle keeps working.
(function () {
  try {
    if (!localStorage.getItem('theme')) {
      document.documentElement.setAttribute('data-bs-theme', 'dark');
    }
  } catch (e) {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
  }
})();
