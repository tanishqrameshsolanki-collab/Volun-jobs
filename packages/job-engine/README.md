# Job engine

Phase 4 provides public job discovery adapters for Greenhouse, Lever, and career pages that expose schema.org `JobPosting` JSON-LD. Adapters use public HTTP endpoints only, inject `fetch` for testing, enforce a request timeout, validate source payloads, and return source metadata plus raw source payloads.

Use `discoverAll(adapters)` to run configured adapters concurrently. Each source is isolated: a timeout or malformed response becomes a source error while healthy sources continue, and normalized jobs plus duplicate aliases are returned for the next persistence step.

Normalization, deduplication, eligibility, and scoring are deliberately separate phases.
