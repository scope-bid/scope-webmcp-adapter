// WebMCP adapter kill switch.
//
// Read on the server at render time. Registration of the browser-side
// Scope tools (app/components/webmcp/webmcp-register.tsx) is ON by default
// and turns OFF the moment WEBMCP_ADAPTER_ENABLED is set to "0" / "false"
// / "off" in the environment. Changing a Vercel environment variable and
// redeploying the env is a config change, not a code change - no branch,
// no code review, no source edit - which is the point: if a firm reacts
// badly to agent-registered tools appearing in their browser, one person
// can pull the whole surface in a minute.
//
// The switch gates REGISTRATION only. The underlying routes each tool
// calls are unchanged and stay gated on their own (session auth, the
// human-approval park). Flipping this off removes the browser tools; it
// does not touch anyone's ability to use the app by hand.
//
// Voice canon: ASCII hyphens only.

export function isWebMcpAdapterEnabled(): boolean {
  const raw = (process.env.WEBMCP_ADAPTER_ENABLED ?? "").trim().toLowerCase();
  // Default ON: only an explicit off-value disables it.
  return !(raw === "0" || raw === "false" || raw === "off" || raw === "no");
}
