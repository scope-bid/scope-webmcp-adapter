// WebMCP adapter kill switch.
//
// Read on the server at render time. Registration of the browser-side
// Scope tools (the register component, webmcp-register.tsx) is ON by
// default and turns OFF when WEBMCP_ADAPTER_ENABLED is set to "0" /
// "false" / "off" / "no" in the environment. Turning it off is a
// configuration change, not a code change: no source edit is needed to
// remove the browser tools.
//
// The switch gates REGISTRATION only. The underlying routes each tool
// calls are unchanged and stay gated on their own (session auth, the
// human-approval park). Flipping this off removes the browser tools; it
// does not touch anyone's ability to use the app by hand.
//
// LATENCY HONESTY: the switch is a server render decision. Flipping it
// stops every NEW page load immediately; a tab that was already open
// keeps its registered tools until the next full page load. The server
// routes those tools call remain fully gated either way.
//
// Voice canon: ASCII hyphens only.

export function isWebMcpAdapterEnabled(): boolean {
  const raw = (process.env.WEBMCP_ADAPTER_ENABLED ?? "").trim().toLowerCase();
  // Default ON: only an explicit off-value disables it.
  return !(raw === "0" || raw === "false" || raw === "off" || raw === "no");
}
