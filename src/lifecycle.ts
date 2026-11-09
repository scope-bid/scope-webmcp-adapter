// Document-wide singleton lifecycle for the WebMCP tool registration.
//
// The register component mounts in more than one place - the firm
// dashboard layouts and the matter page - and the App Router transition
// between them UNMOUNTS one before the other's effect runs, with the
// matter page's server render (a loading boundary plus its reads) in
// between. Refcounting mounts and aborting the registration after a
// short grace window does not work: the gap on a dashboard -> matter
// navigation can exceed any such window, so the tools would vanish and
// re-register mid-path - and a host that rejects duplicate names would
// be left with zero tools and no retry.
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
 * would latch at a full count with zero tools registered and no recovery
 * short of a hard reload.
 */
export function recordAsyncToolRejection(): void {
  if (registeredCount > 0) registeredCount -= 1;
}

/** Test-only: module state otherwise persists per document. */
export function resetWebMcpLifecycleForTests(): void {
  registeredCount = 0;
}
