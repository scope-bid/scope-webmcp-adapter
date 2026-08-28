# scope-webmcp-adapter

A WebMCP adapter that exposes an existing MCP backend to an in-page agent.

Scope ([scope.bid](https://scope.bid)) is a dispatch rail for law firms. It
already ships a Model Context Protocol server: a firm's AI assistant can brief
the firm's matters, dispatch new work, and award a matter to a professional
over MCP. This adapter takes those same tools and registers them with the
browser's `document.modelContext`, so an agent working *inside the page* (for
example ChatGPT desktop's built-in browser, under "Site tools") can call them
directly instead of driving the UI by clicking.

Built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com).

## The one idea

**Every tool's `execute()` is a thin `fetch` to a route the product already
has.** There is no second copy of the business logic. The WebMCP layer is a
distribution surface over the existing backend, not a new backend. A tool the
agent calls in the browser hits the exact same handler, the exact same
auth, and the exact same gates as the same action taken by hand or over the
MCP server. Nothing can drift, because there is only one implementation.

```
 agent in the page                    the product's own backend
 ------------------                    -------------------------
 document.modelContext
   .registerTool({                     POST /api/scopes        (dispatch)
     name, description,   ── fetch ──▶  POST /api/scope/award   (award -> PARK)
     inputSchema,                       GET  /api/scopes        (list / brief)
     execute                            GET  /api/scopes/:id    (read one)
   })                                   (session cookie carries org + identity)
```

## Why an *award* tool is safe to hand an agent

The interesting tool is `scope_award_matter`. Awarding a matter commits a
firm's money to a professional. You do not want an agent doing that
autonomously.

It is safe here because of one server-side rule, decided before this adapter
existed: **every award parks behind a human-approval gate.** When the award
route is called by a session (which is what an in-page agent holds), it does
not commit. It records a pending approval addressed to a person at the firm
and returns the parked state, naming who has to release it. The money commits
only after that person grants the approval on their own screen.

So the agent can do the whole useful arc - brief, dispatch, award - and the
award lands as *a request a human still has to sign*. The agent is stopped at
exactly the step that should belong to a person, and it is stopped by the
server, not by the honor system of a prompt.

The rule that follows from this, and the one line worth taking from this repo:

> **Never register a tool that clears the gate the agent is being stopped by.**

The approval *grant* is deliberately **not** a registered tool. Neither is
completion, final-cost entry, messaging, deliverables, roster changes, or
anything else settlement-shaped. The agent can propose; it cannot settle.

## The tools

Read-only tools carry `annotations.readOnlyHint: true`.

| Tool | Calls | What it does |
| --- | --- | --- |
| `scope_briefing` | `GET /api/scopes` | Status briefing on the firm's matters. |
| `scope_list_matters` | `GET /api/scopes` | List the firm's matters. |
| `scope_get_matter` | `GET /api/scopes/:id` | Read one matter + its activity. |
| `scope_dispatch_matter` | `POST /api/scopes` | Create + dispatch a matter. Returns named professionals with prices. Parks; contacts no professional until a human releases. |
| `scope_award_matter` | `POST /api/scope/award` | Award to a named professional. **Parks for human approval**; returns the parked state and the named approver. Cannot commit. |
| `scope_award_status` | `GET /api/scopes/:id` | Whether the award is still parked, released, or proceeding. |

### The do-not-expose list

These exist in the backend and are **intentionally not registered**, because
each one either settles money or clears the very gate that makes the award
tool safe:

- approval **grant** / response
- mark-complete, final-cost entry
- declarations, messaging, deliverables
- roster mutations
- spend-ceiling / autonomy-policy changes

## Four rules this adapter follows

If you adapt this to your own product, these are the load-bearing parts:

1. **One execution path.** `execute()` fetches an existing route. No parallel
   logic, no client-side price math, nothing that can diverge from the server.
2. **Tenancy comes from the session, never from a tool argument.** No tool's
   input schema carries an org id. The server resolves the caller's
   organization from the session cookie and scopes every read and write to it.
   An argument cannot point the tool at another tenant.
3. **Reads return only what the signed-in user can already see.** The read
   tools hit the same row-level-security-scoped client the user's own screen
   uses. The agent gets a machine-readable version of the user's view, nothing
   more.
4. **A kill switch that needs no deploy.** Registration is gated by one
   environment variable (`WEBMCP_ADAPTER_ENABLED`). Default on; set it to `0`
   and the whole surface is gone on the next env redeploy - no branch, no code
   change. See [`src/config.ts`](src/config.ts).

## Files

- [`src/webmcp-register.tsx`](src/webmcp-register.tsx) - the React client
  component. Registers the tools on mount, unregisters on unmount via an
  `AbortSignal`. Renders nothing.
- [`src/config.ts`](src/config.ts) - the kill switch.

The component is written against Next.js / React, but the pattern is
framework-agnostic: anywhere you can run `document.modelContext.registerTool`
after the page loads and reach your own authenticated endpoints with `fetch`,
this shape works.

## Notes on the WebMCP surface

- Tools registered on `document.modelContext` are **document-scoped**. They
  die on a hard navigation and survive a soft (client-side) navigation, so
  registering once in a persistent shell covers a single-page app.
- The browser owns consent and presentation. This adapter only *offers* tools;
  whether and how an agent may call them is the browser's decision.
- Registration is a no-op in browsers without WebMCP - the component checks for
  `document.modelContext` and quietly does nothing if it is absent, so it is
  safe to ship to all users.

## License

MIT. See [LICENSE](LICENSE).
