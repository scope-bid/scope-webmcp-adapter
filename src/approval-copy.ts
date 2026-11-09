// The sentences that say whether an award waits for a person at the firm.
//
// ONE SOURCE, TWO STATES. With pre-authorized spending switched off, every
// award a firm makes parks for a person, and the "off" text of each entry
// says so. With the switch on, a pre-authorization can approve a covered
// award with nobody parked, so "every award waits" stops being true and the
// "on" text says what is.
//
// The switch is passed in, never read here: this module is pure strings so
// a client component can import it, and every caller has to decide. Server
// code passes the server's own setting; a client component takes the value
// as a prop from the server page that renders it.
//
// Each entry below is labeled with the surface that shows it: the MCP and
// WebMCP tool descriptions, the partner API, and the firm's own pages.
//
// Turning the switch on changes the tool descriptions Scope's MCP server
// lists.
//
// Voice canon: ASCII hyphens only.

/**
 * What a pre-authorization is, in one clause, for copy written about "the
 * firm" (agents, the public page). Every condition named here is one the
 * gate enforces; the gate enforces more (no approval rule of the firm's
 * fires, no open dispute on the matter, the people who set and confirmed it
 * are still firm admins), and "covers" carries those. The percentage named
 * here is the same overage tolerance the completion check applies.
 */
const STANDING_EXCEPTION_FIRM =
  "unless a pre-authorization covers it (a firm admin sets one for one service category, never a records category; it covers nothing until that admin confirms it from a link Scope emails them, and applies from then; it covers only a professional the firm's roster listed as primary or backup for that category when it was confirmed, shown by name to the admin who confirmed it, whose roster entry has not changed since, who did not set up their Scope account after it was confirmed, and who passes every check a dispatch runs; the most the job can settle at without another approval, the price plus 15 percent, must fit its per-job and per-period limits; it never covers an award on a matter where a professional declined or timed out; and it never applies while the firm has a spend ceiling set anywhere, on any dispatch policy or any person's own limits)";

/** The same clause, written to the firm ("your firm"). */
const STANDING_EXCEPTION_YOURS =
  "unless a pre-authorization covers it (a firm admin sets one for one service category, never a records category; it covers nothing until that admin confirms it from a link Scope emails them, and applies from then; it covers only a professional your roster listed as primary or backup for that category when it was confirmed, shown by name to the admin who confirmed it, whose roster entry has not changed since, who did not set up their Scope account after it was confirmed, and who passes every check a dispatch runs; the most the job can settle at without another approval, the price plus 15 percent, must fit its per-job and per-period limits; it never covers an award on a matter where a professional declined or timed out; and it never applies while your firm has a spend ceiling set anywhere, on any dispatch policy or any person's own limits)";

type CopyEntry = { readonly off: string; readonly on: string };

export const APPROVAL_COPY = {
  // MCP tool scope_dispatch_matter: the second gate.
  mcpDispatchGate: {
    off: "(2) an unconditional human-approval gate.",
    on: "(2) a human-approval gate that parks every dispatch a pre-authorization does not cover (see APPROVAL).",
  },
  // MCP tool scope_dispatch_matter: APPROVAL.
  mcpDispatchApproval: {
    off: "APPROVAL: a dispatch requested by an agent does NOT commit the firm. It parks as a pending approval and a person at the firm must approve it before any money is committed; there is no firm setting, threshold or policy that turns this off. The tool returns status='pending_approval' with the approval id and the approver's role (on the first call and on a re-dispatch with matter_id alike), not a dispatch.",
    on: `APPROVAL: a dispatch requested by an agent does NOT commit the firm ${STANDING_EXCEPTION_FIRM}. A dispatch a pre-authorization covers commits within its limits instead of parking, and the reply is the dispatch, not a pending approval. Every other dispatch parks as a pending approval and a person at the firm must approve it before any money is committed: the tool returns status='pending_approval' with the approval id and the approver's role (on the first call and on a re-dispatch with matter_id alike), not a dispatch.`,
  },
  // MCP tool scope_dispatch_matter: the added rules.
  mcpDispatchRules: {
    off: "none of them removes the floor.",
    on: "none of them removes the floor, and a pre-authorization never covers a dispatch one of them flags.",
  },
  // MCP tool scope_award_matter: APPROVAL.
  mcpAwardApproval: {
    off: "APPROVAL: an award requested by an agent does NOT commit the firm. It is parked as a pending approval and a person at the firm must approve it before any money is committed; this tool returns status='pending_approval' with the approval id and the approver's user id, not an award.",
    on: `APPROVAL: an award requested by an agent does NOT commit the firm ${STANDING_EXCEPTION_FIRM}. An award a pre-authorization covers commits within its limits instead of parking, and the reply is the award, not a pending approval. Every other award is parked as a pending approval and a person at the firm must approve it before any money is committed; this tool returns status='pending_approval' with the approval id and the approver's user id, not an award.`,
  },
  // WebMCP tool scope_dispatch_matter (webmcp-register.tsx).
  webmcpDispatch: {
    off: "Nothing is committed and no professional is contacted until a person at the firm approves an award.",
    on: `Nothing is committed and no professional is contacted until a person at the firm approves an award, ${STANDING_EXCEPTION_FIRM}; a covered award commits within its limits.`,
  },
  // WebMCP tool scope_award_matter (webmcp-register.tsx).
  webmcpAward: {
    off: "This does NOT commit the firm's money: it sends the award for approval by a person at the firm and returns the parked state. The work proceeds only after that person releases it from the /approvals page.",
    on: `This does NOT commit the firm's money ${STANDING_EXCEPTION_FIRM}. A covered award commits within its limits and the reply is the award, not the parked state. Every other award goes for approval by a person at the firm and returns the parked state, and the work proceeds only after that person releases it from the /approvals page.`,
  },
  // Partner API, POST /api/v1/dispatches/{dispatch_id}/award. Never
  // covered (a partner token and the firm's own /api/v1 call alike), so the
  // sentence stays true; the switch adds that it holds regardless.
  openapiV1Award: {
    off: "An award requested through this endpoint does NOT commit the firm: it parks as a pending approval and returns 409, and the award commits when a person at the firm releases it from the approvals queue.",
    on: "An award requested through this endpoint does NOT commit the firm: it parks as a pending approval and returns 409, and the award commits when a person at the firm releases it from the approvals queue. A pre-authorization never covers a request made through this endpoint, so this holds whatever pre-authorized spending the firm has set.",
  },
  // The /approvals page, the intro paragraph.
  approvalsPageIntro: {
    off: "Every award at your firm waits for a person at the firm to approve it, and that includes awards your AI or a teammate makes.",
    on: `Every award at your firm waits for a person at the firm to approve it, and that includes awards your AI or a teammate makes, ${STANDING_EXCEPTION_YOURS}.`,
  },
  // The /approvals page, the empty queue.
  approvalsEmpty: {
    off: "Every award at your firm waits for a person at the firm to approve it.",
    on: `Every award at your firm waits for a person at the firm to approve it ${STANDING_EXCEPTION_YOURS}.`,
  },
  // The firm's policies page, the Autonomy card (the whole card text).
  adminPoliciesAutonomyCard: {
    off: "How far the firm's AI runs on its own. Every award still waits for a firm approval.",
    on: "How far the firm's AI runs on its own. Every award still waits for a firm approval unless a pre-authorization covers it.",
  },
  // The firm's autonomy policy page, the intro paragraph.
  autonomyPageSelection: {
    off: "Selection only: every award waits for a person at your firm to approve it, no matter what is set here.",
    on: `Selection only: nothing set here approves an award. Every award waits for a person at your firm to approve it ${STANDING_EXCEPTION_YOURS}.`,
  },
  // The autonomy policy editor, the Status toggle (the whole hint).
  autonomyEditorHint: {
    off: "When off, nothing is pre-selected and every approval request arrives with the choice open - identical to having no policy. Every award waits for a firm approval either way.",
    on: "When off, nothing is pre-selected and every approval request arrives with the choice open - identical to having no policy. Either way, every award waits for a firm approval unless a pre-authorization covers it.",
  },
  // The agent walkthrough on the site, the Authority callout.
  agentReelAuthority: {
    off: "Policy shapes the routing. The award itself always waits for a person at the firm.",
    on: "Policy shapes the routing. The award itself waits for a person at the firm unless a pre-authorization covers it.",
  },
  // The agent walkthrough on the site, the Parked callout (this award parks
  // in the walkthrough, so no pre-authorization covered it).
  agentReelParked: {
    off: "The award parks. No money moves until a person at the firm approves it.",
    on: "No pre-authorization covers this award, so it parks. No money moves until a person at the firm approves it.",
  },
  // The /mcp/legal page, the scope_dispatch_matter card (the whole card text).
  mcpLegalDispatchCard: {
    off: "Post a matter. Quotes return in seconds from standing rate cards; an award parks as a pending approval until a person at the firm releases it. Requires a token.",
    on: `Post a matter. Quotes return in seconds from standing rate cards; an award parks as a pending approval until a person at the firm releases it, ${STANDING_EXCEPTION_FIRM}. Requires a token.`,
  },
  // The label for the gate's own rule (human_approval_required), shown
  // wherever the reason for an approval appears. Written into the matter's
  // activity trail when the ask is made, so the on text is true at that
  // moment: the ask exists because nothing covered it.
  ruleLabelHumanApproval: {
    off: "A person at the firm approves every job before it is committed",
    on: "No pre-authorization covered this job, so a person at the firm approves it before it is committed",
  },
  // The autonomy summary (the routing-state tool and the partner API): no
  // policy, or the dial set to select nothing.
  autonomyNoneActive: {
    off: "No standing authority is active. Every dispatch is presented for a person to approve.",
    on: "Auto-selection is off, so nothing is pre-selected. Every dispatch waits for a person at the firm to approve it unless the firm's pre-authorized spending covers it.",
  },
  // The autonomy summary: a policy with no categories or no dollar
  // ceiling.
  autonomyIncomplete: {
    off: "Standing authority is configured but incomplete (no allowed categories or no dollar ceiling), so every dispatch still routes to a person.",
    on: "Auto-selection is configured but incomplete (no allowed categories or no dollar ceiling), so nothing is pre-selected. Every dispatch waits for a person at the firm to approve it unless the firm's pre-authorized spending covers it.",
  },
  // The autonomy summary: the verb in the active envelope's sentence. The
  // envelope selects; it books nothing.
  autonomyEnvelopeVerb: {
    off: "auto-book",
    on: "auto-select",
  },
  // The autonomy summary: the active envelope's last sentence. Outside the
  // envelope the dispatcher parks before the gate, so that half stays true
  // either way.
  autonomyEnvelopeTail: {
    off: "Anything outside this envelope is presented for a person to approve.",
    on: "A selection is booked without a person only when the firm's pre-authorized spending covers it; otherwise a person at the firm approves it. Anything outside this envelope is presented for a person to approve.",
  },
  // The autonomy preview for one category: inside the envelope.
  autonomyPreviewInEnvelope: {
    off: "This will auto-book under your standing rules if every gate passes.",
    on: "This will be auto-selected under your standing rules if every gate passes. It is booked without a person only if your firm's pre-authorized spending covers it; otherwise a person approves it.",
  },
  // The routing-state tool's autonomy summary when the matter has no
  // category to preview.
  routingStateNoAuthority: {
    off: "No standing authority is active for this category.",
    on: "Auto-selection is not active for this category. An award here waits for a person at the firm unless the firm's pre-authorized spending covers it.",
  },
  // MCP tool scope_dispatch_matter, the budget_max_cents field. A dispatch
  // over the cap fires budget_cap_exceeded, an approval rule, so
  // pre-authorized spending never covers it.
  mcpBudgetCapBlocksNothing: {
    off: "It blocks nothing: every dispatch already waits for a person at the firm to approve it.",
    on: "It blocks nothing: every dispatch waits for a person at the firm to approve it unless the firm's pre-authorized spending covers it, and pre-authorized spending never covers a dispatch that would go past this cap.",
  },
  // MCP tool scope_dispatch_matter, the matter_specific_approval_required
  // field. When true the matter_override rule fires on every dispatch, so
  // pre-authorized spending never covers one.
  mcpMatterApprovalEveryDispatch: {
    off: "Every dispatch already waits for a person at the firm to approve it.",
    on: "Every dispatch waits for a person at the firm to approve it unless the firm's pre-authorized spending covers it; when this is true, pre-authorized spending never covers a dispatch on this matter.",
  },
  // MCP tool scope_dispatch_matter, the dispatch_mode field.
  mcpDispatchModePersonApproves: {
    off: "A person at the firm approves every dispatch before it is sent.",
    on: "A person at the firm approves every dispatch before it is sent unless the firm's pre-authorized spending covers it.",
  },
  // The matter post form, the spend cap's hint (without the multi-service
  // suffix the form adds).
  postFormCapHint: {
    off: "Optional. A person at your firm approves every dispatch either way. If a professional's price would take the work awarded on this matter past this amount, the approval request is marked over the cap and follows your firm's approval policy.",
    on: "Optional. A person at your firm approves every dispatch unless your firm's pre-authorized spending covers it, and it never covers one that would take the work awarded on this matter past this amount. If a professional's price would take the work awarded on this matter past this amount, the approval request is marked over the cap and follows your firm's approval policy.",
  },
  // The matter post form, the note under "Send every approval request on
  // this matter to your approval policy's approver" (the whole note). With
  // it on, the matter_override rule fires on every dispatch, so
  // pre-authorized spending never covers one; with no policy the request
  // goes to the same person either way.
  postFormMatterApprovalNote: {
    off: "A person at your firm approves every dispatch either way. With this on, each approval request on this matter goes to the approver your firm's approval policy names, and the spend cap above and your policy's other approval rules are skipped. Your firm's spend ceilings still apply, and a hard ceiling can still stop the dispatch after it is approved. If your firm has no approval policy, the same person approves either way.",
    on: "While this is on, a person at your firm approves every dispatch on this matter: your firm's pre-authorized spending never covers one here. Each approval request on this matter goes to the approver your firm's approval policy names, and the spend cap above and your policy's other approval rules are skipped. Your firm's spend ceilings still apply, and a hard ceiling can still stop the dispatch after it is approved. If your firm has no approval policy, an approval request goes to the same person either way.",
  },
  // The live demo on the /firms page, the recap after an award parks
  // (rendered only when the reply says pending_approval).
  liveAskDemoStopped: {
    off: "Scope stopped it: a person at the firm approves before any money moves.",
    on: "Scope stopped it: no pre-authorization covered this award, so a person at the firm approves it before any money moves.",
  },
  // The site's governance strip, the first control's title.
  governanceStripTitle: {
    off: "A person releases every award",
    on: "A person releases every award a pre-authorization does not cover",
  },
  // The site's governance strip, the first control's body.
  governanceStripBody: {
    off: "Your AI can source professionals, price the job, and prepare the booking. Money moves only after someone at your firm approves it. No setting turns this off.",
    on: "Your AI can source professionals, price the job, and prepare the booking. Money moves only after someone at your firm approves it, or when a pre-authorization covers it: a firm admin sets one and confirms it from an emailed link, every firm admin is told and can turn it off, and it covers only professionals on your roster, within its limits.",
  },
  // The autonomy policy editor, the Auto-select rule's hint. With
  // no auto-select the dispatcher still asks the gate about the top-ranked
  // quote, which pre-authorized spending can cover.
  autonomyEditorAutoSelectHint: {
    off: "How the agent chooses when multiple quotes clear the gates. 'No auto-select' keeps a human in the loop on every dispatch.",
    on: "How the agent chooses when multiple quotes clear the gates. 'No auto-select' leaves the choice to a person at your firm, unless your firm's pre-authorized spending covers the top-ranked quote, which then goes out without a person.",
  },
  // The autonomy policy editor, the "none" option's label.
  autonomyEditorNoAutoSelectOption: {
    off: "No auto-select (human always picks)",
    on: "No auto-select (a person picks, unless pre-authorized spending covers it)",
  },
  // The matter post form, the Budget max note (the one-service drawer,
  // the multi-service Service step, and Review when a budget max goes out).
  // What each clause describes:
  //   - the replacement clauses, both states: a pre-authorization never
  //     covers a replacement, so the switch does not change them. A
  //     replacement priced above the budget max is refused before the
  //     approval gate, and the matter comes back to the firm to dispatch
  //     again unless a work order is live; an approved replacement is
  //     priced again and refused the same way.
  //   - off, "never when you dispatch": a dispatch does not check the
  //     budget max, and with the switch off no pre-authorization is
  //     consulted.
  //   - on, the first two sentences: a pre-authorization refuses to cover
  //     an award above the budget max (zero included), so a person
  //     approves it. The off text's "only when it replaces a professional,
  //     never when you dispatch" is false then, so the on text drops it.
  postFormBudgetMaxNote: {
    off: "Scope checks budget max only when it replaces a professional, never when you dispatch. If the professional declines or does not accept in time and the replacement's price is above the budget max, Scope does not send the replacement and nothing is committed. The matter comes back to you to dispatch again, unless another work order is already live on it. A replacement you approve is priced again before it is sent, and is not sent if that price is above the budget max; the matter comes back to you the same way.",
    on: "Scope checks budget max when it replaces a professional. When you dispatch, pre-authorized spending never covers a price above the budget max; a person at your firm approves it. If the professional declines or does not accept in time and the replacement's price is above the budget max, Scope does not send the replacement and nothing is committed. The matter comes back to you to dispatch again, unless another work order is already live on it. A replacement you approve is priced again before it is sent, and is not sent if that price is above the budget max; the matter comes back to you the same way.",
  },
} as const satisfies Record<string, CopyEntry>;

export type ApprovalCopyKey = keyof typeof APPROVAL_COPY;

/**
 * The sentence for one site. `standingAuthOn` is whether pre-authorized
 * spending is switched on for the server that renders it; only `true`
 * selects the "on" text.
 */
export function approvalCopy(key: ApprovalCopyKey, standingAuthOn: boolean): string {
  const entry: CopyEntry = APPROVAL_COPY[key];
  return standingAuthOn === true ? entry.on : entry.off;
}
