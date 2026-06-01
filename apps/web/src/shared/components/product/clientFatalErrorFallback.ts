export function getClientFatalErrorFallbackScript() {
  return `
(function () {
  var fatal = false;

  function renderFallback() {
    if (!document.body) {
      return false;
    }

    if (document.querySelector("[data-client-fatal-error-page]")) {
      return true;
    }

    document.documentElement.setAttribute("data-client-fatal-error", "true");
    document.body.innerHTML = '<main class="error-page" data-client-fatal-error-page="true"><section class="error-content" aria-labelledby="error-title"><p class="eyebrow">Inquara</p><p class="error-code">Hold on</p><h1 id="error-title">The workspace hit a snag.</h1><p class="muted">The page could not finish loading. Reload the page, or return to the canvas from a fresh tab.</p><div class="error-actions"><button type="button" data-client-fatal-reload="true">Reload</button><a class="secondary-button error-home-link" href="/">Back to canvas</a></div></section><div class="error-map" aria-hidden="true"><span class="error-line error-line-a"></span><span class="error-line error-line-b"></span><span class="error-line error-line-c"></span><span class="error-node error-node-a"></span><span class="error-node error-node-b"></span><span class="error-node error-node-c"></span><span class="error-node error-node-d"></span></div></main>';

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
