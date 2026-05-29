import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { createSetupAccount } from "@inquara/db";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pageShell({ title, body, head = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${head}
  <title>${escapeHtml(title)} - Inquara</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f5f2;
      --panel: #ffffff;
      --text: #1f2528;
      --muted: #687076;
      --border: #dad6cf;
      --accent: #263d42;
      --accent-strong: #17272b;
      --danger: #b42318;
      --success: #067647;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 32px 16px;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      width: min(100%, 440px);
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel);
      padding: 28px;
      box-shadow: 0 18px 50px rgba(31, 37, 40, 0.12);
    }
    .brand {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 760;
      letter-spacing: 0;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      line-height: 1.2;
      letter-spacing: 0;
    }
    .lead {
      margin: 10px 0 24px;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
    }
    label {
      display: block;
      margin: 16px 0 6px;
      font-size: 13px;
      font-weight: 650;
    }
    input {
      width: 100%;
      min-height: 42px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: transparent;
      color: var(--text);
      padding: 10px 12px;
      font: inherit;
    }
    button {
      width: 100%;
      min-height: 44px;
      margin-top: 22px;
      border: 0;
      border-radius: 999px;
      background: var(--accent);
      color: white;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    button:hover { background: var(--accent-strong); }
    .message {
      margin: 0 0 18px;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 14px;
      line-height: 1.5;
    }
    .message.error {
      color: var(--danger);
      border: 1px solid #f0b5ae;
      background: #fff4f2;
    }
    .message.success {
      color: var(--success);
      border: 1px solid #a6d8bd;
      background: #f0f9f4;
    }
  </style>
</head>
<body>
  <main>${body}</main>
</body>
</html>`;
}

export function buildSetupPageHtml({ error = "", values = {} } = {}) {
  const email = escapeHtml(values.email ?? "");
  const displayName = escapeHtml(values.display_name ?? values.displayName ?? "");

  return pageShell({
    title: "Setup",
    body: `
      <p class="brand">Inquara</p>
      <h1>Setup</h1>
      <p class="lead">Create the first account for this deployment. More setup steps can be added here later.</p>
      ${error ? `<p class="message error">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="/setup">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" autocomplete="email" required value="${email}">
        <label for="display_name">Display name</label>
        <input id="display_name" name="display_name" autocomplete="name" value="${displayName}">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="new-password" minlength="6" required>
        <label for="confirm_password">Confirm password</label>
        <input id="confirm_password" name="confirm_password" type="password" autocomplete="new-password" minlength="6" required>
        <button type="submit">Complete setup and start Inquara</button>
      </form>
    `
  });
}

function buildSuccessPageHtml() {
  return pageShell({
    title: "Setup finished",
    body: `
      <p class="brand">Inquara</p>
      <h1>Setup finished</h1>
      <p class="message success">Setup is complete.</p>
      <p class="lead" data-setup-status>The web service is switching to normal mode. This page will continue automatically.</p>
      <script>
        const status = document.querySelector("[data-setup-status]");
        function retrySoon() {
          if (status) status.textContent = "Still switching to normal mode...";
          setTimeout(waitForNormalMode, 1000);
        }
        async function waitForNormalMode() {
          try {
            const response = await fetch("/", { cache: "no-store", redirect: "manual" });
            const text = await response.text();
            if (!text.includes("data-setup-status")) {
              window.location.replace("/");
              return;
            }
          } catch {
            retrySoon();
            return;
          }
          retrySoon();
        }
        setTimeout(waitForNormalMode, 1000);
      </script>
    `
  });
}

export function parseFormBody(body) {
  return Object.fromEntries(new URLSearchParams(body));
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8"
    }
  });
}

async function readRequestBody(request) {
  return await request.text();
}

export function createSetupServerHandler({
  createSetupAccount: createAccount,
  scheduleExit,
  logger = console
}) {
  return async function handleSetupRequest(request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return Response.json({
        data: {
          status: "ok",
          app: "setup"
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/") {
      return new Response(null, {
        status: 302,
        headers: { location: "/setup" }
      });
    }

    if (request.method === "GET" && url.pathname === "/setup") {
      return htmlResponse(buildSetupPageHtml());
    }

    if (request.method === "POST" && url.pathname === "/setup") {
      const form = parseFormBody(await readRequestBody(request));
      const password = form.password ?? "";
      const confirmPassword = form.confirm_password ?? "";

      if (password !== confirmPassword) {
        return htmlResponse(buildSetupPageHtml({
          error: "Passwords do not match",
          values: form
        }), 400);
      }

      try {
        await createAccount({
          email: form.email ?? "",
          displayName: form.display_name ?? "",
          password
        });
      } catch (error) {
        logger.error("Setup failed", error);
        return htmlResponse(buildSetupPageHtml({
          error: "Setup failed",
          values: form
        }), 400);
      }

      scheduleExit();
      return htmlResponse(buildSuccessPageHtml());
    }

    return new Response(null, {
      status: 302,
      headers: { location: "/setup" }
    });
  };
}

export function startSetupServer({
  port = Number(process.env.SERVER_PORT ?? process.env.PORT ?? 3000),
  host = process.env.SERVER_HOST ?? process.env.HOSTNAME ?? "0.0.0.0",
  createSetupAccount: createAccount = createSetupAccount,
  scheduleExit = () => setTimeout(() => process.exit(0), 750)
} = {}) {
  const handler = createSetupServerHandler({
    createSetupAccount: createAccount,
    scheduleExit,
    logger: console
  });
  const server = createServer(async (req, res) => {
    const request = new Request(`http://${req.headers.host ?? `${host}:${port}`}${req.url ?? "/"}`, {
      method: req.method,
      headers: req.headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
      duplex: "half"
    });
    const response = await handler(request);

    res.writeHead(response.status, Object.fromEntries(response.headers));

    if (response.body) {
      const body = Buffer.from(await response.arrayBuffer());
      res.end(body);
      return;
    }

    res.end();
  });

  server.listen(port, host, () => {
    console.log(`Inquara setup app listening on ${host}:${port}`);
  });

  return server;
}

export function isMainModule(importMetaUrl, argvPath = process.argv[1]) {
  return Boolean(argvPath) && importMetaUrl === pathToFileURL(argvPath).href;
}

if (isMainModule(import.meta.url)) {
  startSetupServer();
}
