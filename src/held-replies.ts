// What an agent is told when a dispatch or an award is HELD on a person
// rather than refused. Shared by both agent surfaces that carry the
// scope_dispatch_matter and scope_award_matter tools:
//   - the MCP transports (lib/mcp/legal-tools.ts), where api() throws on
//     any non-2xx and so sees a 409 as an exception string;
//   - WebMCP (app/components/webmcp/webmcp-register.tsx), where every
//     route answer comes back as a body, whatever its status.
// Same tool name, same routes, so the same reply on both. Pure functions
// with no imports: the WebMCP adapter is a client component.
//
// Voice canon: ASCII hyphens only.

// ----------------------------------------------------------------------------
// scope_dispatch_matter
//
// A PARKED DISPATCH IS AN ANSWER; A REFUSED ONE IS AN ERROR.
//
// The tool reaches the engine two ways and the human-approval gate parks
// on both, but the wire shapes differ:
//   - first call, POST /api/scopes: the matter is created, so a park
//     answers 200 with the engine's outcome under `dispatch`;
//   - re-dispatch with matter_id, POST /api/scopes/[id]/dispatch:
//     nothing is created, so a park answers 409 ("nothing sent is never
//     2xx") with error "approval_required" and the same outcome under
//     `dispatch`.
// The re-dispatch is the call the tool tells the model to make after
// incomplete_intake. On the MCP transports that park reached the agent
// as "Error: ... -> 409: {...}"; on WebMCP it arrived carrying an
// `error` key (gap found 2026-10-01). Both calls now give the model the
// same reply, built by heldDispatchReply.
//
// Two outcomes are holds, and only when the body says so: the engine's
// outcome under `dispatch`, plus on the 409 the route's matching error
// code (the 200 has none to check).
//   pending_approval     parked. An approval row exists, its approver is
//                        sent the release link, and the request waits
//                        in their queue. Requires that row's id.
//   no_approver_at_firm  NOT parked. No row, nobody notified.
// Every other 409 on the re-dispatch path is a REFUSAL (a break-glass
// ceiling, a records card that cannot be billed, a live work order, a
// matter that is not open) and stays what each surface already made of
// it: a thrown error on MCP, the route's body on WebMCP. The release
// link is token-bound and goes only to the approver: nothing here reads
// or forwards one.
// ----------------------------------------------------------------------------

export type DispatchHold =
  | { kind: "parked"; outcome: Record<string, unknown> }
  | { kind: "no_approver"; outcome: Record<string, unknown> };

const HOLD_ROUTE_ERROR = {
  pending_approval: "approval_required",
  no_approver_at_firm: "no_approver_at_firm",
} as const;

/**
 * The hold a dispatch route's body reports, or null when it reports
 * anything else. `routeError: "checked"` for the re-dispatch 409, whose
 * error code must agree with the outcome; "none" for the first call's
 * 200, which has no error code.
 */
export function dispatchHoldFrom(
  body: Record<string, unknown>,
  routeError: "checked" | "none",
): DispatchHold | null {
  const raw = body.dispatch;
  if (!raw || typeof raw !== "object") return null;
  const outcome = raw as Record<string, unknown>;
  if (
    outcome.status !== "pending_approval" &&
    outcome.status !== "no_approver_at_firm"
  ) {
    return null;
  }
  if (
    routeError === "checked" &&
    body.error !== HOLD_ROUTE_ERROR[outcome.status]
  ) {
    return null;
  }
  if (outcome.status === "no_approver_at_firm") {
    return { kind: "no_approver", outcome };
  }
  return typeof outcome.approval_id === "string" && outcome.approval_id
    ? { kind: "parked", outcome }
    : null;
}

/**
 * One reply for a held dispatch, whichever call produced it. `extra` is
 * what the route sent beside the outcome (the outcome itself and the
 * quote grid; on a first call also the created matter and its conflict
 * check). It never overrides a field set here.
 */
export function heldDispatchReply(
  matterId: string,
  hold: DispatchHold,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  const o = hold.outcome;
  let reply: Record<string, unknown>;
  if (hold.kind === "parked") {
    reply = {
      status: "pending_approval",
      committed: false,
      matter_id: matterId,
      approval_id: o.approval_id,
      approver_role: o.approver_role ?? null,
      vendor_name: o.vendor_name ?? null,
      total_cents: o.total_cents ?? null,
      message:
        "Nothing was dispatched and nothing is committed. A person at this firm has to approve this professional at this price before it goes out.",
      next_steps: [
        "Nothing was dispatched and nothing is committed.",
        "The approver is emailed a release link; the request waits in the approver's queue at /approvals.",
        // Nothing about what approving produces: every promise of that
        // kind was false somewhere. "Approving it sends the dispatch":
        // a work order needing papers it lacks is awarded and held.
        // "Approving it makes the award": a pool that changed while the
        // ask waited is re-asked instead. "Held until the documents are
        // attached": a matter holding another professional's documents
        // is released without any the new one can open (2026-10-02
        // falsifier, rounds 1 to 3). This holds on every park path.
        "Nothing goes to a professional before it is approved.",
      ],
    };
  } else {
    // Not a park: the notified-by-email sentence would be false here,
    // and an agent believing it would wait on a release that cannot
    // come. "cause" separates a firm with no user (add one) from a
    // matter that could not be resolved (adding a user cannot fix it).
    const matterUnresolved = o.cause === "matter_unresolved";
    reply = {
      status: "no_approver_at_firm",
      committed: false,
      matter_id: matterId,
      approval_id: null,
      cause: matterUnresolved ? "matter_unresolved" : "no_user",
      vendor_name: o.vendor_name ?? null,
      total_cents: o.total_cents ?? null,
      message: o.message ?? null,
      next_steps: [
        "Nothing was dispatched and nothing is committed.",
        matterUnresolved
          ? "Nobody was notified and no approval request exists: the matter could not be resolved while routing the approval. Verify the matter id and retry the dispatch."
          : "Nobody was notified and no approval request exists: this firm has no user on Scope to route the approval to.",
        ...(matterUnresolved
          ? []
          : [
              `Somebody at the firm has to join or claim the firm's Scope workspace, then call this tool again with matter_id ${matterId}.`,
            ]),
      ],
    };
  }
  for (const [k, v] of Object.entries(extra)) {
    if (!(k in reply)) reply[k] = v;
  }
  return reply;
}

// ----------------------------------------------------------------------------
// scope_award_matter
//
// AN AGENT-INITIATED AWARD PARKS. That is not an error, it is the answer,
// and it has to reach the model as a structured envelope it can read out
// to the user: what is waiting, on whom, and that nothing was committed.
// POST /api/scope/award answers every park 409, so on the MCP transports
// the model saw "Error: Scope API POST /api/scope/award -> 409: {...}"
// and had to guess. A parked award is the ORDINARY outcome of this tool
// now, so the ordinary outcome cannot be an exception. (Moved here from
// lib/mcp/legal-tools.ts unchanged, 2026-10-02, so WebMCP answers the
// same way.)
// ----------------------------------------------------------------------------

/**
 * The reply for a 409 body from POST /api/scope/award that reports a
 * hold, or null when the 409 is a refusal.
 */
export function heldAwardReply(
  body: Record<string, unknown>,
  matterId: string,
  vendorName: string,
): Record<string, unknown> | null {
  if (body.error === "approval_required") {
    return {
      status: "pending_approval",
      committed: false,
      matter_id: matterId,
      vendor_name: vendorName,
      approval_id: body.approval_id ?? null,
      approver_user_id: body.approver_user_id ?? null,
      message: body.message ?? null,
      next_steps: [
        "Nothing was sent and nothing is committed.",
        "A person at the firm approves this award before it goes out. They have been notified by email and can also release it from the approvals queue in Scope.",
      ],
    };
  }
  if (body.error === "no_approver_at_firm") {
    // NOT a parked approval. No approval row exists and nobody was
    // emailed - the notified-by-email sentence above would be false
    // here, and an agent believing it would wait forever on a release
    // that cannot come. "cause" separates a firm with no user (add one)
    // from a matter that could not be resolved (adding a user cannot fix
    // that).
    const matterUnresolved = body.cause === "matter_unresolved";
    return {
      status: "no_approver_at_firm",
      committed: false,
      matter_id: matterId,
      vendor_name: vendorName,
      approval_id: null,
      cause: matterUnresolved ? "matter_unresolved" : "no_user",
      message: body.message ?? null,
      next_steps: [
        "Nothing was sent and nothing is committed.",
        matterUnresolved
          ? "Nobody was notified and no approval request exists: the matter could not be resolved while routing the approval. Verify the matter id and retry the award."
          : "Nobody was notified and no approval request exists: this firm has no user on Scope to route the approval to.",
        ...(matterUnresolved
          ? []
          : [
              "Somebody at the firm has to join or claim the firm's Scope workspace, then re-run the award.",
            ]),
      ],
    };
  }
  return null;
}
