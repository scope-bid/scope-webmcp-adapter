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
//     (server-side human-approval gate, WebMCP Part A) and returns the
//     parked state; it cannot commit. The approval GRANT stays a human
//     action on /approvals and is deliberately NOT a tool.
//   - scope_dispatch_matter parks too, so it contacts NO professional
//     until a person at the firm releases the approval (the outbound
//     fan-out fires only on a released dispatch). The read tools return
//     only what the signed-in user can already see on their own screen.
//   - The two bullets above hold while SCOPE_STANDING_AUTH is off. With
//     it on, a pre-authorization (a standing authorization: set by a firm
//     admin and confirmed by that admin from an emailed link, in effect from
//     the confirmation) can
//     approve a covered award or dispatch within its limits at the same
//     server gate, so these tools then commit without parking
//     (lib/dispatch/standing-authorization.ts). The approval GRANT is
//     still not a tool, and creating or confirming one is not reachable
//     from any execute(). The two tool descriptions say which state the
//     server is in (`standingAuth` prop; lib/approvals/approval-copy.ts).
//   - A server-read kill switch (`enabled` prop) turns all registration
//     off in one config change if a firm reacts badly.
//
// Tools are document-scoped and die on hard navigation; app-router soft
// navigation preserves the document. Registration is a once-per-document
// singleton (lib/webmcp/lifecycle.ts) with NO teardown on unmount: the
// component mounts on the five DashboardShell layouts AND the matter
// page, the App Router transition between them has a real gap (the
// matter page's loading boundary plus its server render), and any
// unmount-time abort either drops the tools mid-path or forces a
// re-register a host may refuse as a duplicate (2026-08-28 falsifier).
// A registered tool on a page without a mount is exactly as safe as on
// one - every execute() is a session-authed same-origin fetch.
//
// EXPOSURE LIST (every route an execute() can reach; falsifier-walked
// 2026-08-28): GET /api/scopes, GET /api/scopes/[id], POST /api/scopes,
// POST /api/scopes/[id]/dispatch (ownership-gated: 404 unless the scope
// belongs to the session org), POST /api/scope/award. Adding a route to
// any execute() extends this list and needs its own adversarial pass.
//
// HELD IS DATA (2026-10-02). A dispatch or award that parks on a person,
// or finds nobody at the firm to park it with, comes back in the same
// reply the MCP tools of the same name give (lib/mcp/held-replies.ts),
// never with the route's error code on it. A refusal still comes back as
// the route's body. No route was added by this.
//
// 2026-08-28 falsifier round: the original 4-field dispatch schema could
// not complete intake for process serving / records / court reporting
// (no form_field_values, no matter_id to answer field_prompts), so every
// such dispatch stranded at incomplete_intake, and with no
// adverse_parties input the conflict gate had no parties to filter on.
// The schema below carries the same intake contract as the MCP tool for
// exactly that reason.
//
// Voice canon: ASCII hyphens only.

import { useEffect } from "react";
import { approvalCopy } from "@/lib/approvals/approval-copy";
import {
  acquireScopeTools,
  recordAsyncToolRejection,
} from "@/lib/webmcp/lifecycle";
import {
  dispatchHoldFrom,
  heldAwardReply,
  heldDispatchReply,
} from "@/lib/mcp/held-replies";

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
function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

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

// Whether the server rendering this document has SCOPE_STANDING_AUTH on,
// which picks the approval sentences in the two committing tools'
// descriptions. Set from the server-read prop before the one registration
// this document gets; both mounts pass the same server value.
let standingAuthCopy = false;

export function WebMcpRegister({
  enabled,
  standingAuth,
}: {
  enabled: boolean;
  standingAuth: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;
    standingAuthCopy = standingAuth === true;
    // Once-per-document singleton, no teardown (see lifecycle.ts for
    // the falsifier history). A zero-tool attempt does not latch -
    // whether the host API was absent, refused every tool
    // synchronously, or accepted and then rejected every returned
    // promise (each async rejection counts the latch back down) - so
    // the next mount retries from zero. Only a registration with at
    // least one live tool stays latched.
    acquireScopeTools(startRegistration);
  }, [enabled, standingAuth]);

  return null;
}

// One registration attempt against the live document.modelContext.
// Returns how many tools the host accepted synchronously; 0 when the
// surface does not expose the API (the lifecycle retries on the next
// mount in that case). Exported so a test can drive each execute()
// through the real routes; the component is the only production caller.
// `standingAuth` picks the approval sentences (lib/approvals/approval-copy.ts);
// the lifecycle calls this with no argument, so it is the value the
// component set from the server.
export function startRegistration(standingAuth: boolean = standingAuthCopy): number {
  const mc = getModelContext();
  if (!mc) {
    // Browser does not expose document.modelContext; nothing to do.
    // Logged so QA can tell "surface has no WebMCP" apart from "the
    // adapter failed": if this line prints, the adapter ran and the
    // surface is the reason no tools appear.
    console.info(
      "[webmcp] document.modelContext not present; no Scope tools registered",
    );
    return 0;
  }
  {

    const tools: Array<Omit<ToolDef, "options">> = [
      {
        name: "scope_briefing",
        description:
          "Give a status briefing on this firm's Scope matters. Returns every active (non-archived) matter with its current status, newest first - the same list scope_list_matters returns. Build the briefing from the status field: pending_approval is awaiting a decision by a person at the firm, open or quoted is awaiting an award, awarded means a professional holds the work order and the matter is not closed: either it has not been invoiced yet (the work may be in flight or already done), or it was reopened after a refund or a payment dispute, closed means the work was accepted and invoiced, cancelled means the matter was stopped, no_coverage means no professional was available. An older matter can still read quoted after its award. Where the work itself stands is recorded on the work order: before calling anything finished or still in flight, read scope_get_matter and use dashboard.data.metadata.work_order_status, work_completed (the professional has performed the work) and work_accepted (the firm accepted it). When the user asks for a subset, filter by status yourself.",
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
          "Read one matter by its id or display id (like SC-1234): its status, the quote grid, the work order's status (dashboard.data.metadata.work_order_status, work_completed, work_accepted), unread professional messages, and the dispatch timeline events.",
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
          "Create and dispatch a new matter. Returns named professionals with prices computed from each one's own rate card. " +
          approvalCopy("webmcpDispatch", standingAuth) +
          " Include adverse_parties so the dispatch-time conflict gate has parties to filter professionals against. Quotes compute from category and jurisdiction alone. Complete the work order BEFORE awarding - the professional must never have to call the firm to learn who, where, or what: pass the per-category fields in form_field_values (process serving: party_to_serve, service_address, deadline, deadline_semantics 'on' or 'by', rush 'yes'/'no', affidavit_filing 'yes'/'no'; records retrieval: subject_name, provider_name, provider_location, record_types, date_range; depositions: proceeding_date, location, case_caption). If the response is status='incomplete_intake', ask the user each question in field_prompts, then call this tool again with matter_id set to the returned scope_id and the collected form_field_values - do NOT create a new matter. If the user wants to see the quotes first, or has not chosen a professional, set award to 'quote_only' (nothing is chosen or sent) and award the user's pick with scope_award_matter.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short title for the matter." },
            service_category: {
              type: "string",
              description:
                "The service needed, e.g. Process Serving, Court Reporting.",
            },
            description: {
              type: "string",
              description: "What needs to happen, in plain language.",
            },
            jurisdiction: {
              type: "string",
              description:
                "Where the work happens, e.g. 'Dallas County, TX'. Improves quote accuracy.",
            },
            timeline_deadline: {
              type: "string",
              description:
                "Hard deadline for the work as an ISO date (YYYY-MM-DD). Omit if none.",
            },
            adverse_parties: {
              type: "array",
              description:
                "Parties adverse to the matter; professionals with declared relationships to them are filtered out at dispatch. Set at creation - the completion call (matter_id) cannot add parties later.",
              items: {
                type: "object",
                properties: {
                  party_name: { type: "string" },
                  party_role: {
                    type: "string",
                    enum: ["defendant", "plaintiff", "third_party", "related"],
                  },
                },
                required: ["party_name", "party_role"],
                additionalProperties: false,
              },
            },
            form_field_values: {
              type: "object",
              description:
                "Per-category work-order fields (see the tool description). String values; booleans as 'yes'/'no'.",
              additionalProperties: { type: "string" },
            },
            documents: {
              type: "array",
              description:
                "Text of documents to serve or file (paste the content). Omit to get a secure upload link after award.",
              items: { type: "string" },
            },
            matter_id: {
              type: "string",
              description:
                "ONLY when completing an earlier dispatch that returned incomplete_intake: the scope_id it returned. Re-dispatches that matter with the added form_field_values instead of creating a new one.",
            },
            award: {
              type: "string",
              enum: ["auto", "quote_only"],
              description:
                "'auto' (default): Scope chooses the professional and sends it for approval. 'quote_only': save the answers and return the quotes and any fields still missing, choosing nobody, asking nobody to approve anything and contacting no professional. Use 'quote_only' when the user wants to see the quotes first or when filling in missing answers before the user has picked a professional, then award the user's pick with scope_award_matter. Leave documents out of a quote_only call.",
            },
          },
          required: ["title", "service_category", "description"],
          additionalProperties: false,
        },
        execute: async (input) => {
          const ffv =
            input.form_field_values &&
            typeof input.form_field_values === "object" &&
            !Array.isArray(input.form_field_values)
              ? (input.form_field_values as Record<string, unknown>)
              : undefined;
          const matterId =
            typeof input.matter_id === "string" && input.matter_id.trim()
              ? input.matter_id.trim()
              : null;
          // Passed through as given; the routes refuse any value other
          // than 'auto' or 'quote_only' before anything is saved.
          const awardMode = input.award === undefined ? {} : { award: input.award };
          if (matterId) {
            // Completing an incomplete_intake matter: re-dispatch it with
            // the collected fields. The route 404s unless the matter
            // belongs to the session's org.
            const r = await scopeFetch(
              `/api/scopes/${encodeURIComponent(matterId)}/dispatch`,
              {
                method: "POST",
                body: JSON.stringify({ form_field_values: ffv ?? {}, ...awardMode }),
              },
            );
            // A park answers 409 on this route. It is the ordinary
            // outcome, so it goes back as the same reply the first call
            // and the MCP tool give, without the route's error code
            // (lib/mcp/held-replies.ts). Any other 409 is a refusal and
            // goes back as the route sent it.
            const body = isRecord(r.body) ? r.body : null;
            const hold =
              r.status === 409 && body ? dispatchHoldFrom(body, "checked") : null;
            if (body && hold) {
              return heldDispatchReply(matterId, hold, {
                dispatch: body.dispatch,
                dashboard: body.dashboard ?? null,
              });
            }
            return r.body;
          }
          const body: Record<string, unknown> = {
            title: input.title,
            service_category: input.service_category,
            description: input.description,
            ...awardMode,
          };
          if (
            typeof input.jurisdiction === "string" &&
            input.jurisdiction.trim()
          ) {
            body.jurisdiction = input.jurisdiction.trim();
          }
          // Date columns refuse empty strings and reject non-ISO text with
          // a raw Postgres error that would fail the whole creation. Check
          // the shape here and hand the agent a fixable message instead of
          // making the round trip.
          if (
            typeof input.timeline_deadline === "string" &&
            input.timeline_deadline.trim()
          ) {
            const d = input.timeline_deadline.trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
              return {
                error: `timeline_deadline must be an ISO date (YYYY-MM-DD); got "${d}". Fix the date and call the tool again - nothing was created.`,
              };
            }
            body.timeline_deadline = d;
          }
          if (ffv && Object.keys(ffv).length > 0) {
            body.form_field_values = ffv;
          }
          let sentAdverseParties = false;
          if (
            Array.isArray(input.adverse_parties) &&
            input.adverse_parties.length > 0
          ) {
            // The route and the DB check constraint accept exactly these
            // four roles (migration 0071); anything else is silently
            // DROPPED server-side, which would no-op the conflict gate
            // while the response still reports it ran. Normalize common
            // variants (bare strings, name-key objects, hyphen/case role
            // spellings) and default unknown roles to third_party so a
            // supplied party always reaches scope_adverse_parties - and
            // REFUSE rather than create the matter if none survive, so
            // parties can never vanish silently.
            const VALID_ROLES = new Set([
              "defendant",
              "plaintiff",
              "third_party",
              "related",
            ]);
            const parties = (input.adverse_parties as unknown[])
              .map((p) => {
                if (typeof p === "string") {
                  return { party_name: p, party_role: "" };
                }
                if (p && typeof p === "object" && !Array.isArray(p)) {
                  const rec = p as Record<string, unknown>;
                  const name =
                    typeof rec.party_name === "string"
                      ? rec.party_name
                      : typeof rec.name === "string"
                        ? rec.name
                        : "";
                  const role =
                    typeof rec.party_role === "string"
                      ? rec.party_role
                      : typeof rec.role === "string"
                        ? rec.role
                        : "";
                  return { party_name: name, party_role: role };
                }
                return { party_name: "", party_role: "" };
              })
              .filter((p) => p.party_name.trim().length > 0)
              .map((p) => {
                const raw = p.party_role
                  .trim()
                  .toLowerCase()
                  .replace(/[\s-]+/g, "_");
                return {
                  party_name: p.party_name.trim(),
                  party_role: VALID_ROLES.has(raw) ? raw : "third_party",
                };
              });
            if (parties.length === 0) {
              return {
                error:
                  "adverse_parties could not be parsed - expected an array of {party_name, party_role} objects (party_role one of defendant, plaintiff, third_party, related). Nothing was created; fix the shape and call the tool again.",
              };
            }
            body.adverse_parties = parties;
            sentAdverseParties = true;
          }
          if (Array.isArray(input.documents)) {
            const docs = (input.documents as unknown[]).filter(
              (d) => typeof d === "string" && d.trim().length > 0,
            );
            if (docs.length > 0) body.documents = docs;
          }
          const r = await scopeFetch("/api/scopes", {
            method: "POST",
            body: JSON.stringify(body),
          });
          // The server no longer stamps conflict_check.ran on a
          // zero-party no-op (fixed 2026-08-28), so this override is
          // belt-and-braces for any deploy skew: when this surface sent
          // no parties, never relay a "ran" block as a completed check.
          if (
            !sentAdverseParties &&
            r.body &&
            typeof r.body === "object" &&
            (r.body as Record<string, unknown>).conflict_check
          ) {
            (r.body as Record<string, unknown>).conflict_check = {
              ran: false,
              note: "No adverse parties were provided, so there was nothing to check. Provide adverse_parties to run the conflict gate. Do not report this as a completed conflict check.",
            };
          }
          // Created and parked (or nobody to park it with): the same
          // reply as a parked re-dispatch, with the created matter beside
          // it. Anything else goes back as sent.
          const created = r.ok && isRecord(r.body) ? r.body : null;
          const hold = created ? dispatchHoldFrom(created, "none") : null;
          if (created && hold) {
            const scope = isRecord(created.scope) ? created.scope : null;
            const createdId = String(
              scope?.display_id ?? scope?.id ?? hold.outcome.scope_id ?? "",
            ).trim();
            return heldDispatchReply(createdId, hold, created);
          }
          return r.body;
        },
      },
      {
        name: "scope_award_matter",
        description:
          "Award a dispatched matter to a named professional. " +
          approvalCopy("webmcpAward", standingAuth) +
          " The response identifies the approval, not the approver by name - do not invent a person's name when reporting the park.",
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
          // A 409 with approval_required is the EXPECTED, healthy result -
          // the award parked for a human to release. Return it as a normal
          // result so the agent can report the park, not as an error: the
          // same reply the MCP tool gives (lib/mcp/held-replies.ts), with
          // no route error code on it. The payload carries the approval id
          // and an opaque approver user id, never a person's name. Any
          // other 409 is a refusal and goes back as the route sent it.
          if (r.status === 409 && isRecord(r.body)) {
            const held = heldAwardReply(
              r.body,
              String(input.matter_id ?? ""),
              String(input.vendor_name ?? ""),
            );
            if (held) return held;
          }
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
    // does not strand the rest. No AbortSignal: the registration lives
    // for the document (see the header). The count below is what the
    // host accepted SYNCHRONOUSLY; a host may still reject a returned
    // promise later, and each such rejection is logged and counted
    // back down in the lifecycle so an all-async-refusing host does
    // not latch a dead registration.
    let registered = 0;
    for (const t of tools) {
      try {
        Promise.resolve(mc.registerTool(t)).catch(() => {
          console.info(
            `[webmcp] host rejected tool ${t.name} after registration was offered`,
          );
          recordAsyncToolRejection();
        });
        registered += 1;
      } catch {
        /* browser rejected this tool; leave the others registered */
      }
    }
    console.info(
      `[webmcp] registered ${registered}/${tools.length} Scope tools on document.modelContext (synchronous acceptance)`,
    );

    return registered;
  }
}
