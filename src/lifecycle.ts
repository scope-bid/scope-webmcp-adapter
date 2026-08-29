// Document-wide singleton lifecycle for the WebMCP tool registration
// (2026-08-28, falsifier round 2 of the matter-page mount).
//
// The register component mounts in TWO places - DashboardShell (five
// firm layouts) and the matter page - and the App Router transition
// between them UNMOUNTS one before the other's effect runs, with the
// matter page's server render (a loading.tsx boundary plus a dozen
// sequential reads) in between. The first design refcounted mounts and
// aborted the registration after a 150ms grace window; the falsifier
// proved the real gap on the dashboard -> matter hop exceeds the
// window, so the tools vanished and re-registered on the exact path
// the judges walk - and a host that rejects duplicate names would have
// been left with zero tools and no retry.
//
// So: NO teardown. The first mount that finds the host API registers
// once, and the registration lives as long as the document. Every
// execute() is a session-authed same-origin fetch, so a registered
// tool on a page without a mount is exactly as safe as on one; a
// signed-out or killed session answers 401 server-side; and a hard
// navigation resets the document (and this module's state) anyway.
// The kill switch gates at server render: flipping it stops new page
// loads, and the already-documented open-tab caveat is unchanged.
//
// A zero-tool attempt (host API absent, or every registerTool call
// refused synchronously) does NOT latch: the next mount retries, so a
// host that injects document.modelContext late still gets the tools.
//
// Voice canon: ASCII hyphens only.

let registeredCount = 0;

/**
 * Idempotent per document: runs `start` (which attempts the actual
 * registration and returns how many tools the host accepted
 * synchronously) only while nothing is registered yet. Never
 * unregisters.
 */
export function acquireScopeTools(start: () => number): void {
  if (registeredCount > 0) return;
  registeredCount = start();
}

/**
 * A host may accept registerTool synchronously and refuse it later by
 * rejecting the returned promise. Counting that refusal DOWN keeps the
 * latch honest: a host that asynchronously refused every tool drops
 * back to zero and the next mount retries, while a partial refusal
 * (some tools live) stays latched so the live tools are never
 * re-offered as duplicates. Without this, an all-async-refusing host
 * latched at a full count with zero tools registered and no recovery
 * short of a hard reload (2026-08-28 falsifier).
 */
export function recordAsyncToolRejection(): void {
  if (registeredCount > 0) registeredCount -= 1;
}

/** Test-only: module state otherwise persists per document. */
export function resetWebMcpLifecycleForTests(): void {
  registeredCount = 0;
}
