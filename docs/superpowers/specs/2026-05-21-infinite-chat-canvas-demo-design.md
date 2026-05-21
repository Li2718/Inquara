# Infinite Chat Canvas Demo Design

## Goal

Build a learning-oriented demo in `demo/` that proves the core interaction: an infinite canvas where each node is an AI chat bot, and users can branch a new follow-up chat from a selected passage in an AI response. The first version should be easy to read, run, and modify.

## Scope

- Static single-page demo with no build step.
- One initial main chat node on an infinite-canvas-style workspace.
- Chat nodes support user messages, AI replies, and local conversation history.
- AI reply text can be selected. A floating follow-up action appears near the selection.
- Creating a follow-up adds a child chat node connected to the source node and seeded with the selected passage.
- Child nodes can continue chatting independently.
- Nodes can be collapsed and expanded.
- Canvas can be panned, zoomed, and nodes can be dragged.
- AI integration is optional at runtime. If no endpoint/key is configured, mock replies are used.

## Non-Goals

- No authentication, persistence, backend server, or database.
- No production-grade collaborative editing.
- No full graph editor or complex layout engine.
- No streaming response requirement in the first demo.

## Files

- `demo/index.html`: App shell.
- `demo/styles.css`: Layout, canvas, node, toolbar, and responsive styling.
- `demo/app.js`: State, rendering, canvas interactions, chat flow, text-selection branching, and API adapter.
- `demo/config.example.js`: Documented OpenAI-compatible provider configuration.
- `demo/config.js`: Local editable runtime config that defaults to mock mode.
- `demo/README.md`: Run instructions, configuration notes, and interaction guide.

## AI Provider

The demo will treat configured providers as OpenAI-compatible chat-completions endpoints.

Runtime configuration:

- `endpoint`: URL such as `https://api.example.com/v1/chat/completions`.
- `apiKey`: Bearer token.
- `model`: Model identifier.
- `headers`: Optional extra headers.
- `temperature`: Optional numeric setting.
- `useMock`: Force mock replies when true.

When `endpoint` or `apiKey` is missing, the app uses deterministic mock replies so the demo remains usable without credentials.

## Interaction Model

The app stores an in-memory graph:

- Node: id, title, position, collapsed flag, messages, parent id, and source quote.
- Message: role, content, timestamp.
- Edge: source node id, target node id, and quote label.

When the user selects text inside an assistant message, the app records the selected text and source node. Clicking the follow-up action creates a new node to the right of the source node, adds an initial system-style context note with the quote, and connects it with an edge.

## Visual Direction

This is a product demo, not a landing page. The interface should feel like a quiet thinking workspace: muted background grid, clear node surfaces, restrained accent color, compact controls, readable message typography, and obvious affordances for branching and folding.

## Testing And Verification

- Add lightweight browser-level checks or simple JavaScript tests where practical for pure logic.
- Manually verify: page loads, mock chat works, selection creates a child node, nodes drag, canvas pans/zooms, and collapse/expand preserves state.
- Verify the static demo can run from a local file or a minimal static server.
