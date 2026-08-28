"use client";

// WebMCP adapter: registers a small set of Scope tools with the browser's
// document.modelContext so an in-page agent (ChatGPT desktop's built-in
// browser, "Site tools") can call them directly instead of clicking
// through the UI. This is an ADDITIONAL distribution surface over Scope's
// existing backend, not a new architecture and not Scope's MCP connection.
//
// WHY THIS IS SAFE TO EXPOSE TO A SIGNED-IN FIRM:
//   - Every execute() is a same-origin fetch to a route that ALREADY
//     exists and is already gated. No new execution path, no parallel
//     business logic. Org and tenancy come from the session cookie on the
//     server, never from a tool argument.
//   - Nothing settlement-shaped is registered. The award tool PARKS
//     (server-side human-approval gate) and returns the parked state; it
//     cannot commit. The approval GRANT stays a human action on
//     /approvals and is deliberately NOT a tool.
//   - scope_dispatch_matter parks too, so it contacts NO professional
//     until a person at the firm releases the approval (the outbound
//     fan-out fires only on a released dispatch). The read tools return
//     only what the signed-in user can already see on their own screen.
//   - A server-read kill switch (`enabled` prop) turns all registration
//     off in one config change if a firm reacts badly.
//
// Tools are document-scoped and die on hard navigation; app-router soft
// navigation preserves the document, so registering once in the
// dashboard shell covers the signed-in surface. The AbortSignal
// unregisters them on unmount.
//
// Voice canon: ASCII hyphens only.

import { useEffect } from "react";

// Minimal shape of the WebMCP API we depend on (document.modelContext).
// Declared locally so the adapter is self-contained; the browser provides
// the real implementation.
type ToolExecute = (input: Record<string, unknown>) => Promise<unknown>;
type ToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: ToolExecute;
  options?: { signal?: AbortSignal };
};
type ModelContext = {
  registerTool: (
    tool: Omit<ToolDef, "options">,
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

function getModelContext(): ModelContext | null {
  if (typeof document === "undefined") return null;
  const mc = (document as unknown as { modelContext?: ModelContext })
    .modelContext;
  return mc && typeof mc.registerTool === "function" ? mc : null;
}

// Same-origin fetch to a session-authed Scope route. Cookies attach
// automatically for same-origin; org/tenancy is resolved server-side from
// the session, never from these arguments.
async function scopeFetch(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

export function WebMcpRegister({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const mc = getModelContext();
    if (!mc) return; // Browser does not support WebMCP; nothing to do.
    const ctl = new AbortController();
    const opts = { signal: ctl.signal };

    const tools: Array<Omit<ToolDef, "options">> = [
      {
        name: "scope_briefing",
        description:
          "Give a status briefing on this firm's Scope matters: what is awaiting a decision, awaiting a professional, scheduled, or recently completed.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: async () => {
          const r = await scopeFetch("/api/scopes");
          return r.body;
        },
      },
      {
        name: "scope_list_matters",
        description: "List this firm's matters.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: async () => {
          const r = await scopeFetch("/api/scopes");
          return r.body;
        },
      },
      {
        name: "scope_get_matter",
        description:
          "Read one matter by its id or display id (like SC-1234), including its current status and activity.",
        inputSchema: {
          type: "object",
          properties: {
            matter_id: {
              type: "string",
              description: "The matter's UUID or display id, e.g. SC-1234.",
            },
          },
          required: ["matter_id"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: async (input) => {
          const id = encodeURIComponent(String(input.matter_id ?? ""));
          const r = await scopeFetch(`/api/scopes/${id}`);
          return r.body;
        },
      },
      {
        name: "scope_dispatch_matter",
        description:
          "Create and dispatch a new matter. Returns named professionals with prices computed from each one's own rate card. Nothing is committed and no professional is contacted until a person at the firm approves an award.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short title for the matter." },
            matter_type: {
              type: "string",
              description: "The matter type, e.g. Civil Litigation.",
            },
            service_category: {
              type: "string",
              description:
                "The service needed, e.g. Process Serving, Court Reporting.",
            },
            description: {
              type: "string",
              description: "What needs to happen, in plain language.",
            },
          },
          required: ["title", "service_category", "description"],
          additionalProperties: false,
        },
        execute: async (input) => {
          const r = await scopeFetch("/api/scopes", {
            method: "POST",
            body: JSON.stringify({
              title: input.title,
              matter_type: input.matter_type,
              service_category: input.service_category,
              description: input.description,
            }),
          });
          return r.body;
        },
      },
      {
        name: "scope_award_matter",
        description:
          "Award a dispatched matter to a named professional. This does NOT commit the firm's money: it sends the award for approval by a person at the firm, and returns the parked state with the named approver. The work proceeds only after that person releases it.",
        inputSchema: {
          type: "object",
          properties: {
            matter_id: {
              type: "string",
              description: "The matter's id or display id, e.g. SC-1234.",
            },
            vendor_name: {
              type: "string",
              description: "The professional to award to, by name.",
            },
          },
          required: ["matter_id", "vendor_name"],
          additionalProperties: false,
        },
        execute: async (input) => {
          const r = await scopeFetch("/api/scope/award", {
            method: "POST",
            body: JSON.stringify({
              matter_id: input.matter_id,
              vendor_name: input.vendor_name,
            }),
          });
          // A 409 with approval_pending is the EXPECTED, healthy result -
          // the award parked for a human to release. Return it as a normal
          // result so the agent can report the park and the named approver,
          // not as an error.
          return r.body;
        },
      },
      {
        name: "scope_award_status",
        description:
          "Read whether a matter's award is still parked for approval, released, or proceeding. Use after an award to see if a person at the firm has released it.",
        inputSchema: {
          type: "object",
          properties: {
            matter_id: {
              type: "string",
              description: "The matter's id or display id.",
            },
          },
          required: ["matter_id"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: async (input) => {
          const id = encodeURIComponent(String(input.matter_id ?? ""));
          const r = await scopeFetch(`/api/scopes/${id}`);
          return r.body;
        },
      },
    ];

    // Register all; ignore individual failures so one bad registration
    // does not strand the rest.
    for (const t of tools) {
      try {
        void mc.registerTool(t, opts);
      } catch {
        /* browser rejected this tool; leave the others registered */
      }
    }

    return () => ctl.abort();
  }, [enabled]);

  return null;
}
