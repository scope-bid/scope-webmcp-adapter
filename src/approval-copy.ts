// The sentences that say whether an award waits for a person at the firm.
//
// ONE SOURCE, TWO STATES. With SCOPE_STANDING_AUTH off, every award a firm
// makes parks for a person, and these sentences say so in the exact words
// they have always used (the "off" text of each entry is byte-identical to
// what each site said before this file existed; tests/approvals/
// approval-copy.test.ts pins that). With the switch on, a pre-authorization
// (the firm-facing name of a standing authorization,
// lib/dispatch/standing-authorization.ts) can approve a covered award with
// nobody parked, so "every award waits" stops being true and the "on" text
// says what is.
//
// The switch is passed in, never read here: this module is pure strings so
// a client component can import it, and every caller has to decide. Server
// code passes standingAuthorizationEnabled(); a client component takes the
// value as a prop from the server page that renders it.
//
// THE SITES (each one is enumerated by the test):
//   lib/mcp/legal-tool-defs.ts       scope_dispatch_matter and scope_award_matter
//   app/components/webmcp/webmcp-register.tsx  the same two tools in the browser
//   lib/api/openapi.ts               the partner API's award endpoint
//   app/approvals/page.tsx and approvals-client.tsx
//   app/admin/policies/page.tsx, autonomy/page.tsx, autonomy/editor.tsx
//   app/components/alive/agent-reel.tsx
//   app/mcp/legal/page.tsx
//   lib/dispatch/approval-rule-labels.ts   the "why it needs approval" label
//                                          (approval emails, /approvals,
//                                          /approve/[token], the matter
//                                          banner and the park's trail row)
//   lib/dispatch/autonomy-check.ts   the autonomy summaries scope_get_dispatch_routing_state
//                                    and GET /api/v1/autonomy-policy return
//   lib/mcp/governance/routing-state.ts    the routing-state fallback
//   lib/mcp/legal-tool-defs.ts       three input fields of scope_dispatch_matter
//                                    (budget_max_cents,
//                                    matter_specific_approval_required,
//                                    dispatch_mode), from main after the branch
//                                    point (falsifier round 3)
//   app/post/post-form.tsx           the spend cap hint and the matter
//                                    approval note on the post form (same)
//   app/components/alive/live-ask-demo.tsx   the parked award's recap on /firms
//   app/components/marketing/governance-strip.tsx  the approval card (found
//                                    by the scan; not mounted anywhere today)
//   app/admin/policies/autonomy/editor.tsx  the auto-select hint and its
//                                    "No auto-select" option (falsifier round 4)
//
// Every other sentence in app/ and lib/ in this family ("approves every
// dispatch", "waits for a person", ...) is either routed through here or
// listed, with the reason it stays true with the switch on, in the scan in
// tests/approvals/approval-copy.test.tsx.
//
// Turning the switch on changes the tool descriptions Scope's MCP server
// lists (what the MCP Directory shows). That is Jack's decision, and it may
// need a Directory re-review.
//
// Voice canon: ASCII hyphens only.

/**
 * What a pre-authorization is, in one clause, for copy written about "the
 * firm" (agents, the public page). Every condition named here is one the
 * gate enforces; the gate enforces more (no approval rule of the firm's
 * fires, no open dispute on the matter, the people who set and confirmed it
 * are still firm admins), and "covers" carries those. "15 percent" is
 * FINAL_COST_TOLERANCE_PCT (lib/dispatch/final-cost.ts); the test pins it.
 */
const STANDING_EXCEPTION_FIRM =
  "unless a pre-authorization covers it (a firm admin sets one for one service category, never a records category; it covers nothing until that admin confirms it from a link Scope emails them, and applies from then; it covers only a professional the firm's roster listed as primary or backup for that category when it was confirmed, shown by name to the admin who confirmed it, whose roster entry has not changed since, who did not set up their Scope account after it was confirmed, and who passes every check a dispatch runs; the most the job can settle at without another approval, the price plus 15 percent, must fit its per-job and per-period limits; it never covers an award on a matter where a professional declined or timed out; and it never applies while the firm has a spend ceiling set anywhere, on any dispatch policy or any person's own limits)";

/** The same clause, written to the firm ("your firm"). */
const STANDING_EXCEPTION_YOURS =
  "unless a pre-authorization covers it (a firm admin sets one for one service category, never a records category; it covers nothing until that admin confirms it from a link Scope emails them, and applies from then; it covers only a professional your roster listed as primary or backup for that category when it was confirmed, shown by name to the admin who confirmed it, whose roster entry has not changed since, who did not set up their Scope account after it was confirmed, and who passes every check a dispatch runs; the most the job can settle at without another approval, the price plus 15 percent, must fit its per-job and per-period limits; it never covers an award on a matter where a professional declined or timed out; and it never applies while your firm has a spend ceiling set anywhere, on any dispatch policy or any person's own limits)";

type CopyEntry = { readonly off: string; readonly on: string };

export const APPROVAL_COPY = {
  // lib/mcp/legal-tool-defs.ts, scope_dispatch_matter: the second gate.
  mcpDispatchGate: {
    off: "(2) an unconditional human-approval gate.",
    on: "(2) a human-approval gate that parks every dispatch a pre-authorization does not cover (see APPROVAL).",
  },
  // lib/mcp/legal-tool-defs.ts, scope_dispatch_matter: APPROVAL.
  mcpDispatchApproval: {
    off: "APPROVAL: a dispatch requested by an agent does NOT commit the firm. It parks as a pending approval and a person at the firm must approve it before any money is committed; there is no firm setting, threshold or policy that turns this off. The tool returns status='pending_approval' with the approval id and the approver's role (on the first call and on a re-dispatch with matter_id alike), not a dispatch.",
    on: `APPROVAL: a dispatch requested by an agent does NOT commit the firm ${STANDING_EXCEPTION_FIRM}. A dispatch a pre-authorization covers commits within its limits instead of parking, and the reply is the dispatch, not a pending approval. Every other dispatch parks as a pending approval and a person at the firm must approve it before any money is committed: the tool returns status='pending_approval' with the approval id and the approver's role (on the first call and on a re-dispatch with matter_id alike), not a dispatch.`,
  },
  // lib/mcp/legal-tool-defs.ts, scope_dispatch_matter: the added rules.
  mcpDispatchRules: {
    off: "none of them removes the floor.",
    on: "none of them removes the floor, and a pre-authorization never covers a dispatch one of them flags.",
  },
  // lib/mcp/legal-tool-defs.ts, scope_award_matter: APPROVAL.
  mcpAwardApproval: {
    off: "APPROVAL: an award requested by an agent does NOT commit the firm. It is parked as a pending approval and a person at the firm must approve it before any money is committed; this tool returns status='pending_approval' with the approval id and the approver's user id, not an award.",
    on: `APPROVAL: an award requested by an agent does NOT commit the firm ${STANDING_EXCEPTION_FIRM}. An award a pre-authorization covers commits within its limits instead of parking, and the reply is the award, not a pending approval. Every other award is parked as a pending approval and a person at the firm must approve it before any money is committed; this tool returns status='pending_approval' with the approval id and the approver's user id, not an award.`,
  },
  // app/components/webmcp/webmcp-register.tsx, scope_dispatch_matter.
  webmcpDispatch: {
    off: "Nothing is committed and no professional is contacted until a person at the firm approves an award.",
    on: `Nothing is committed and no professional is contacted until a person at the firm approves an award, ${STANDING_EXCEPTION_FIRM}; a covered award commits within its limits.`,
  },
  // app/components/webmcp/webmcp-register.tsx, scope_award_matter.
  webmcpAward: {
    off: "This does NOT commit the firm's money: it sends the award for approval by a person at the firm and returns the parked state. The work proceeds only after that person releases it from the /approvals page.",
    on: `This does NOT commit the firm's money ${STANDING_EXCEPTION_FIRM}. A covered award commits within its limits and the reply is the award, not the parked state. Every other award goes for approval by a person at the firm and returns the parked state, and the work proceeds only after that person releases it from the /approvals page.`,
  },
  // lib/api/openapi.ts, POST /api/v1/dispatches/{dispatch_id}/award. Never
  // covered (a partner token and the firm's own /api/v1 call alike), so the
  // sentence stays true; the switch adds that it holds regardless.
  openapiV1Award: {
    off: "An award requested through this endpoint does NOT commit the firm: it parks as a pending approval and returns 409, and the award commits when a person at the firm releases it from the approvals queue.",
    on: "An award requested through this endpoint does NOT commit the firm: it parks as a pending approval and returns 409, and the award commits when a person at the firm releases it from the approvals queue. A pre-authorization never covers a request made through this endpoint, so this holds whatever pre-authorized spending the firm has set.",
  },
  // app/approvals/page.tsx, the intro paragraph.
  approvalsPageIntro: {
    off: "Every award at your firm waits for a person at the firm to approve it, and that includes awards your AI or a teammate makes.",
    on: `Every award at your firm waits for a person at the firm to approve it, and that includes awards your AI or a teammate makes, ${STANDING_EXCEPTION_YOURS}.`,
  },
  // app/approvals/approvals-client.tsx, the empty queue.
  approvalsEmpty: {
    off: "Every award at your firm waits for a person at the firm to approve it.",
    on: `Every award at your firm waits for a person at the firm to approve it ${STANDING_EXCEPTION_YOURS}.`,
  },
  // app/admin/policies/page.tsx, the Autonomy card (the whole card text).
  adminPoliciesAutonomyCard: {
    off: "How far the firm's AI runs on its own. Every award still waits for a firm approval.",
    on: "How far the firm's AI runs on its own. Every award still waits for a firm approval unless a pre-authorization covers it.",
  },
  // app/admin/policies/autonomy/page.tsx, the intro paragraph.
  autonomyPageSelection: {
    off: "Selection only: every award waits for a person at your firm to approve it, no matter what is set here.",
    on: `Selection only: nothing set here approves an award. Every award waits for a person at your firm to approve it ${STANDING_EXCEPTION_YOURS}.`,
  },
  // app/admin/policies/autonomy/editor.tsx, the Status toggle (the whole hint).
  autonomyEditorHint: {
    off: "When off, nothing is pre-selected and every approval request arrives with the choice open - identical to having no policy. Every award waits for a firm approval either way.",
    on: "When off, nothing is pre-selected and every approval request arrives with the choice open - identical to having no policy. Either way, every award waits for a firm approval unless a pre-authorization covers it.",
  },
  // app/components/alive/agent-reel.tsx, the Authority callout.
  agentReelAuthority: {
    off: "Policy shapes the routing. The award itself always waits for a person at the firm.",
    on: "Policy shapes the routing. The award itself waits for a person at the firm unless a pre-authorization covers it.",
  },
  // app/components/alive/agent-reel.tsx, the Parked callout (this award parks
  // in the reel, so no pre-authorization covered it).
  agentReelParked: {
    off: "The award parks. No money moves until a person at the firm approves it.",
    on: "No pre-authorization covers this award, so it parks. No money moves until a person at the firm approves it.",
  },
  // app/mcp/legal/page.tsx, the scope_dispatch_matter card (the whole card text).
  mcpLegalDispatchCard: {
    off: "Post a matter. Quotes return in seconds from standing rate cards; an award parks as a pending approval until a person at the firm releases it. Requires a token.",
    on: `Post a matter. Quotes return in seconds from standing rate cards; an award parks as a pending approval until a person at the firm releases it, ${STANDING_EXCEPTION_FIRM}. Requires a token.`,
  },
  // lib/dispatch/approval-rule-labels.ts, the label for the gate's own rule
  // (human_approval_required). Written into the park's trail row when the
  // ask is made, so the on text is true at that moment: the ask exists
  // because nothing covered it.
  ruleLabelHumanApproval: {
    off: "A person at the firm approves every job before it is committed",
    on: "No pre-authorization covered this job, so a person at the firm approves it before it is committed",
  },
  // lib/dispatch/autonomy-check.ts summarizeAutonomyEnvelope: no policy, or
  // the dial set to select nothing.
  autonomyNoneActive: {
    off: "No standing authority is active. Every dispatch is presented for a person to approve.",
    on: "Auto-selection is off, so nothing is pre-selected. Every dispatch waits for a person at the firm to approve it unless the firm's pre-authorized spending covers it.",
  },
  // lib/dispatch/autonomy-check.ts summarizeAutonomyEnvelope: a policy with no
  // categories or no dollar ceiling.
  autonomyIncomplete: {
    off: "Standing authority is configured but incomplete (no allowed categories or no dollar ceiling), so every dispatch still routes to a person.",
    on: "Auto-selection is configured but incomplete (no allowed categories or no dollar ceiling), so nothing is pre-selected. Every dispatch waits for a person at the firm to approve it unless the firm's pre-authorized spending covers it.",
  },
  // lib/dispatch/autonomy-check.ts summarizeAutonomyEnvelope: the verb in the
  // active envelope's sentence. The envelope selects; it books nothing.
  autonomyEnvelopeVerb: {
    off: "auto-book",
    on: "auto-select",
  },
  // lib/dispatch/autonomy-check.ts summarizeAutonomyEnvelope: the active
  // envelope's last sentence. Outside the envelope the dispatcher parks
  // before the gate, so that half stays true either way.
  autonomyEnvelopeTail: {
    off: "Anything outside this envelope is presented for a person to approve.",
    on: "A selection is booked without a person only when the firm's pre-authorized spending covers it; otherwise a person at the firm approves it. Anything outside this envelope is presented for a person to approve.",
  },
  // lib/dispatch/autonomy-check.ts previewAutonomyForCategory: inside the
  // envelope.
  autonomyPreviewInEnvelope: {
    off: "This will auto-book under your standing rules if every gate passes.",
    on: "This will be auto-selected under your standing rules if every gate passes. It is booked without a person only if your firm's pre-authorized spending covers it; otherwise a person approves it.",
  },
  // lib/mcp/governance/routing-state.ts, the autonomy summary when the
  // matter has no category to preview.
  routingStateNoAuthority: {
    off: "No standing authority is active for this category.",
    on: "Auto-selection is not active for this category. An award here waits for a person at the firm unless the firm's pre-authorized spending covers it.",
  },
  // lib/mcp/legal-tool-defs.ts, scope_dispatch_matter's budget_max_cents
  // field. A dispatch over the cap fires budget_cap_exceeded, an approval
  // rule, so pre-authorized spending never covers it.
  mcpBudgetCapBlocksNothing: {
    off: "It blocks nothing: every dispatch already waits for a person at the firm to approve it.",
    on: "It blocks nothing: every dispatch waits for a person at the firm to approve it unless the firm's pre-authorized spending covers it, and pre-authorized spending never covers a dispatch that would go past this cap.",
  },
  // lib/mcp/legal-tool-defs.ts, scope_dispatch_matter's
  // matter_specific_approval_required field. When true the matter_override
  // rule fires on every dispatch, so pre-authorized spending never covers
  // one.
  mcpMatterApprovalEveryDispatch: {
    off: "Every dispatch already waits for a person at the firm to approve it.",
    on: "Every dispatch waits for a person at the firm to approve it unless the firm's pre-authorized spending covers it; when this is true, pre-authorized spending never covers a dispatch on this matter.",
  },
  // lib/mcp/legal-tool-defs.ts, scope_dispatch_matter's dispatch_mode field.
  mcpDispatchModePersonApproves: {
    off: "A person at the firm approves every dispatch before it is sent.",
    on: "A person at the firm approves every dispatch before it is sent unless the firm's pre-authorized spending covers it.",
  },
  // app/post/post-form.tsx, the spend cap's hint (without the multi-service
  // suffix the form adds).
  postFormCapHint: {
    off: "Optional. A person at your firm approves every dispatch either way. If a professional's price would take the work awarded on this matter past this amount, the approval request is marked over the cap and follows your firm's approval policy.",
    on: "Optional. A person at your firm approves every dispatch unless your firm's pre-authorized spending covers it, and it never covers one that would take the work awarded on this matter past this amount. If a professional's price would take the work awarded on this matter past this amount, the approval request is marked over the cap and follows your firm's approval policy.",
  },
  // app/post/post-form.tsx, the note under "Send every approval request on
  // this matter to your approval policy's approver" (the whole note). With
  // it on, the matter_override rule fires on every dispatch, so
  // pre-authorized spending never covers one; with no policy the request
  // goes to the same person either way.
  postFormMatterApprovalNote: {
    off: "A person at your firm approves every dispatch either way. With this on, each approval request on this matter goes to the approver your firm's approval policy names, and the spend cap above and your policy's other approval rules are skipped. Your firm's spend ceilings still apply, and a hard ceiling can still stop the dispatch after it is approved. If your firm has no approval policy, the same person approves either way.",
    on: "While this is on, a person at your firm approves every dispatch on this matter: your firm's pre-authorized spending never covers one here. Each approval request on this matter goes to the approver your firm's approval policy names, and the spend cap above and your policy's other approval rules are skipped. Your firm's spend ceilings still apply, and a hard ceiling can still stop the dispatch after it is approved. If your firm has no approval policy, an approval request goes to the same person either way.",
  },
  // app/components/alive/live-ask-demo.tsx, the recap after an award parks
  // (rendered only when the reply says pending_approval).
  liveAskDemoStopped: {
    off: "Scope stopped it: a person at the firm approves before any money moves.",
    on: "Scope stopped it: no pre-authorization covered this award, so a person at the firm approves it before any money moves.",
  },
  // app/components/marketing/governance-strip.tsx, the first control's title.
  governanceStripTitle: {
    off: "A person releases every award",
    on: "A person releases every award a pre-authorization does not cover",
  },
  // app/components/marketing/governance-strip.tsx, the first control's body.
  governanceStripBody: {
    off: "Your AI can source professionals, price the job, and prepare the booking. Money moves only after someone at your firm approves it. No setting turns this off.",
    on: "Your AI can source professionals, price the job, and prepare the booking. Money moves only after someone at your firm approves it, or when a pre-authorization covers it: a firm admin sets one and confirms it from an emailed link, every firm admin is told and can turn it off, and it covers only professionals on your roster, within its limits.",
  },
  // app/admin/policies/autonomy/editor.tsx, the Auto-select rule's hint. With
  // no auto-select the dispatcher still asks the gate about the top-ranked
  // quote, which pre-authorized spending can cover.
  autonomyEditorAutoSelectHint: {
    off: "How the agent chooses when multiple quotes clear the gates. 'No auto-select' keeps a human in the loop on every dispatch.",
    on: "How the agent chooses when multiple quotes clear the gates. 'No auto-select' leaves the choice to a person at your firm, unless your firm's pre-authorized spending covers the top-ranked quote, which then goes out without a person.",
  },
  // app/admin/policies/autonomy/editor.tsx, the "none" option's label.
  autonomyEditorNoAutoSelectOption: {
    off: "No auto-select (human always picks)",
    on: "No auto-select (a person picks, unless pre-authorized spending covers it)",
  },
  // app/post/post-form.tsx, the Budget max note (the one-service drawer,
  // the multi-service Service step, and Review when a budget max goes out).
  // Added by PR #251 (Jack's decision, 2026-10-05: state what the code does;
  // making reroute ask the firm instead is a separate money-path branch).
  // tests/dispatch/budget-max-copy.test.ts pins each clause to its line:
  //   - the reroute clauses, both states: a replacement is never covered
  //     (COVERABLE_COMMIT_KINDS), so the switch does not change them.
  //     lib/dispatch/reroute.ts:789 reads budget_max; reroute.ts:1031
  //     returns price_exceeds_ceiling above it before the approval gate;
  //     lib/dispatch/transitions.ts:1103 lands the matter no_coverage
  //     (re-dispatchable) unless a work order is live;
  //     lib/dispatch/approval-resume.ts:730 re-prices an approved
  //     replacement and meets reroute.ts:1031 again, and the refused
  //     approve lands the matter open.
  //   - off, "never when you dispatch": the engine selects budget_max and
  //     never reads it (lib/dispatch/rate-card-dispatch.ts:279), and with
  //     the switch off no pre-authorization is consulted.
  //   - on, the first two sentences: standing-authorization.ts:547
  //     (lib/dispatch) refuses to cover an award above scopes.budget_max
  //     (zero included), so a person approves it. The off text's "only when it
  //     replaces a professional, never when you dispatch" is false then,
  //     so the on text drops it.
  postFormBudgetMaxNote: {
    off: "Scope checks budget max only when it replaces a professional, never when you dispatch. If the professional declines or does not accept in time and the replacement's price is above the budget max, Scope does not send the replacement and nothing is committed. The matter comes back to you to dispatch again, unless another work order is already live on it. A replacement you approve is priced again before it is sent, and is not sent if that price is above the budget max; the matter comes back to you the same way.",
    on: "Scope checks budget max when it replaces a professional. When you dispatch, pre-authorized spending never covers a price above the budget max; a person at your firm approves it. If the professional declines or does not accept in time and the replacement's price is above the budget max, Scope does not send the replacement and nothing is committed. The matter comes back to you to dispatch again, unless another work order is already live on it. A replacement you approve is priced again before it is sent, and is not sent if that price is above the budget max; the matter comes back to you the same way.",
  },
} as const satisfies Record<string, CopyEntry>;

export type ApprovalCopyKey = keyof typeof APPROVAL_COPY;

/**
 * The sentence for one site. `standingAuthOn` is whether SCOPE_STANDING_AUTH
 * is on for the server that renders it; only `true` selects the "on" text.
 */
export function approvalCopy(key: ApprovalCopyKey, standingAuthOn: boolean): string {
  const entry: CopyEntry = APPROVAL_COPY[key];
  return standingAuthOn === true ? entry.on : entry.off;
}
