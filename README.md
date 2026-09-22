# Grounded Agent Demo — Mapping Data to Microsoft IQ

A companion demo to [lead-agent-demo](https://github.com/olivierb123/lead-agent-demo), this time focused on **data grounding**: how an agent's answers get tied to real, trustworthy data sources rather than what the model already "knows."

Same build philosophy as the original — start cheap, prove it works, then operationalize — applied here to the question of *which grounding source an agent should use for which kind of data*.

---

## The problem this demo illustrates

Every agent needs to be grounded in data outside the model's own training. Microsoft offers several purpose-built grounding services under an "IQ" naming family, each suited to a different data domain:

| Data domain | Grounding source | Why |
|---|---|---|
| Internal structured business data (sales, inventory, finance) | **Fabric IQ** | Semantic/business-model layer over OneLake — understands your business model, not just raw tables |
| Native Microsoft 365 content (emails, docs, Teams, calendar) | **Work IQ** | Grounds directly in Microsoft Graph data the org already has |
| Public / real-world data (permits, filings, registries, news) | **Web IQ** | Citation-ready web retrieval built for LLM/agent consumption, not a search results page |
| Anything else custom / not native to the above | **Foundry IQ** | General-purpose agent knowledge/grounding layer |

Picking the wrong one — or reaching for a generic web scrape when a purpose-built IQ product already solves it — is the kind of mistake that's cheap to avoid early and expensive to unwind later. This demo walks through mapping one real data domain (municipal building permits, reused from the original lead-agent-demo) to the right IQ product, and building it up in stages.

---

## The three stages

1. **Mock / seeded dataset** — no real grounding call yet. Prove the agent's logic and UI against a small hand-written sample of permit data. Zero cost, zero external dependency.
2. **One real integration, narrow scope** — wire up a single real grounding call (Web IQ, for permit/registry-style public data) for one narrow use case. This is the "convincing" stage: proof that real grounded retrieval actually improves answer quality over the mock stage.
3. **Unified, governed multi-source grounding** — once one integration is proven, generalize to a system that can route across Fabric IQ / Work IQ / Web IQ / Foundry IQ depending on the data domain in question, with consistent citation and governance handling across all of them.

---

## Status

Early planning stage — repo just initialized. Nothing built yet.

## License

MIT
