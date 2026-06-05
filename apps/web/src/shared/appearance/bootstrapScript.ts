export function getAppearanceBootstrapScript() {
  return `
(function () {
  var APPEARANCE_STORAGE_KEY = "inquara.appearance";
  var APPEARANCE_COOKIE_NAME = "inquara_appearance";

  function isPreference(value) {
    return value === "system" || value === "light" || value === "dark";
  }

  function readCookie(name) {
    var prefix = name + "=";
    return document.cookie.split(";").map(function (part) {
      return part.trim();
    }).filter(function (part) {
      return part.indexOf(prefix) === 0;
    }).map(function (part) {
      return decodeURIComponent(part.slice(prefix.length));
    })[0] || null;
  }

  function readStoredPreference() {
    try {
      return window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function readSystemMode() {
    if (!window.matchMedia) return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  var cookiePreference = readCookie(APPEARANCE_COOKIE_NAME);
  var storedPreference = readStoredPreference();
  var preference = isPreference(cookiePreference) ? cookiePreference : isPreference(storedPreference) ? storedPreference : "system";
  var mode = preference === "system" ? readSystemMode() : preference;
  document.documentElement.dataset.appearance = mode;
  document.documentElement.style.colorScheme = mode;
})();
`;
}
