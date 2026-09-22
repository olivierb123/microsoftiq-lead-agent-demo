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

## The three stages — bottom-up

Grounding is fundamentally a data-architecture problem before it's a UI problem, so this demo builds bottom-up rather than starting from a clickable prototype:

1. **Data & system-of-record inventory** — catalog the real systems of record behind each data domain and which IQ product grounds each one, with rationale. A reviewable artifact, not code.
2. **Data normalization & agent access** — show what that raw source data looks like once it's normalized into a consistent, citable shape an agent can actually query.
3. **Data governance & guardrails** — access control, citation enforcement, and audit: the layer that makes multi-source grounding safe to operationalize.

---

## Stage 1 (built): data & system-of-record inventory

A markdown catalog — [`docs/data-inventory.md`](./docs/data-inventory.md) — mapping each data domain to its concrete system of record and the IQ product that should ground it, with the reasoning for each mapping. This is the foundation the Stage 2 console is built from.

## Stage 2 (built): normalized, agent-grounded console

A static React console (Vite + Tailwind CSS v4, matching lead-agent-demo's toolchain) showing what the Stage 1 inventory looks like once normalized: one example each for Fabric IQ, Work IQ, and Web IQ, reshaped into a consistent, citable record an agent can query and answer from. No real API calls yet; the dataset is hand-written in `src/data/mockRecords.js`.

Run it locally:

```bash
npm install
npm run dev
```

Next: Stage 3 adds governance and guardrails — access control, citation enforcement, and audit — across all three sources.

## Status

Stage 1 and Stage 2 complete.

## License

MIT
