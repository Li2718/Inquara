export function getClientFatalErrorFallbackScript() {
  return `
(function () {
  var fatal = false;
  var LOCALE_STORAGE_KEY = "inquara.locale";
  var LOCALE_SOURCE_STORAGE_KEY = "inquara.locale.source";
  var LOCALE_COOKIE_NAME = "inquara_locale";
  var LOCALE_SOURCE_COOKIE_NAME = "inquara_locale_source";
  var MANUAL_LOCALE_SOURCE = "manual";
  var copy = {
    en: {
      heading: "The canvas hit a snag.",
      holdOn: "Hold on",
      message: "The page could not finish loading. Please reload the page.",
      reload: "Reload"
    },
    "zh-CN": {
      heading: "画布遇到问题。",
      holdOn: "请稍候",
      message: "页面未能完成加载。请刷新页面。",
      reload: "刷新"
    }
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[character];
    });
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

  function matchLocale(value) {
    if (!value) return null;
    var normalized = String(value).trim().replace("_", "-").toLowerCase();
    if (normalized === "en" || normalized.indexOf("en-") === 0) return "en";
    if (normalized === "zh" || normalized.indexOf("zh-") === 0) return "zh-CN";
    return null;
  }

  function resolveLocale() {
    try {
      var storedSource = window.localStorage.getItem(LOCALE_SOURCE_STORAGE_KEY) || readCookie(LOCALE_SOURCE_COOKIE_NAME);
      var storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY) || readCookie(LOCALE_COOKIE_NAME);
      var manualLocale = storedSource === MANUAL_LOCALE_SOURCE ? matchLocale(storedLocale) : null;
      if (manualLocale) return manualLocale;
    } catch {}

    var navigatorValue = window.navigator || {};
    var languages = Array.isArray(navigatorValue.languages) ? navigatorValue.languages : [];
    for (var index = 0; index < languages.length; index += 1) {
      var matched = matchLocale(languages[index]);
      if (matched) return matched;
    }
    return matchLocale(navigatorValue.language) || "en";
  }

  function renderFallback() {
    if (!document.body) {
      return false;
    }

    if (document.querySelector("[data-client-fatal-error-page]")) {
      return true;
    }

    var locale = resolveLocale();
    var text = copy[locale] || copy.en;
    document.documentElement.lang = locale;
    document.documentElement.setAttribute("data-client-fatal-error", "true");
    document.body.innerHTML = '<main class="error-page" data-client-fatal-error-page="true"><section class="error-content" aria-labelledby="error-title"><p class="eyebrow">Inquara</p><p class="error-code">' + escapeHtml(text.holdOn) + '</p><h1 id="error-title">' + escapeHtml(text.heading) + '</h1><p class="muted">' + escapeHtml(text.message) + '</p><div class="error-actions"><button type="button" data-client-fatal-reload="true">' + escapeHtml(text.reload) + '</button></div></section><div class="error-map" aria-hidden="true"><span class="error-line error-line-a"></span><span class="error-line error-line-b"></span><span class="error-line error-line-c"></span><span class="error-node error-node-a"></span><span class="error-node error-node-b"></span><span class="error-node error-node-c"></span><span class="error-node error-node-d"></span></div></main>';

    var reloadButton = document.querySelector("[data-client-fatal-reload]");
    if (reloadButton) {
      reloadButton.addEventListener("click", function () {
        window.location.reload();
      });
    }

    return true;
  }

  function showFallback() {
    fatal = true;

    if (!renderFallback()) {
      window.addEventListener("DOMContentLoaded", renderFallback, { once: true });
      return;
    }

    [0, 50, 250].forEach(function (delay) {
      window.setTimeout(function () {
        if (fatal) {
          renderFallback();
        }
      }, delay);
    });
  }

  window.addEventListener("error", showFallback);
  window.addEventListener("unhandledrejection", showFallback);
})();
`;
}
