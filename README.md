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

A markdown catalog — [`docs/data-inventory.md`](./docs/data-inventory.md) — mapping each of 8 data domains to its concrete system of record and the IQ product that should ground it, with the reasoning for each mapping, plus [`docs/data-relationships.md`](./docs/data-relationships.md) documenting how those domains actually join to each other. The "Stage 1: Raw Data" tab in the console renders each domain's raw, source-shaped mock data so the inventory can be validated visually, not just read as a table.

## Stage 2 (built): normalized, agent-grounded console

A static React console (Vite + Tailwind CSS v4, matching lead-agent-demo's toolchain) showing what the Stage 1 inventory looks like once normalized: all 8 domains reshaped into consistent, citable records an agent can query and answer from, plus 2 composite records that join across domains (e.g. renewal risk assembled from CRM + telemetry + support cases on `accountId`) to show why grounding across sources — not just within one — is where the real value is. A query input on the "Stage 2: Grounded Console" tab keyword-matches a typed question against the records to simulate what an agent's retrieval step would surface. No real API calls or retrieval yet; the dataset and matcher are hand-written in `src/data/mockRecords.js` and `src/lib/matchRecords.js`.

Run it locally:

```bash
npm install
npm run dev
```

## Stage 3 (built): data governance & guardrails

The layer that makes multi-source grounding safe to operationalize, documented in [`docs/data-governance.md`](./docs/data-governance.md):

- **Access control** — an interactive persona switcher (Sales Rep, Customer Success, Executive) in the console header. Each role is granted a subset of the 8 domains, and any record that draws on a domain outside the active persona's access is fully blocked on the "Stage 2: Grounded Console" tab — including the 2 composite records, which flip between blocked and visible depending on the persona.
- **Citation / confidence enforcement** — every record is flagged `Verified` or `Needs verification`, derived directly from the hard-vs-fuzzy join classification in `data-relationships.md`. Only the permit-to-CRM composite (a fuzzy name match) is flagged `Needs verification`.
- **Audit log** — the "Stage 3: Governance" tab records every query submitted on Stage 2 (press Enter), live, in-session: persona, question, and how many results were matched vs. blocked. No backend, so it resets on refresh — same "simulate honestly" approach as Stage 2's matcher.

## Stage 4/5 (in progress): real Azure grounding

The first three stages are entirely mock data and a hand-written matcher. Stages 4 and 5 make two of the four IQ products real, documented in [`docs/azure-implementation.md`](./docs/azure-implementation.md):

- **Foundry IQ (built and deployed)** — a second, independent Foundry Hosted Agent, grounded on a real Azure AI Search index (`product-docs`, seeded from `src/data/raw/productDocs.js` via `scripts/seed_search_index.py`) through Agent Framework's native `AzureAISearchContextProvider`. A **"Live: Foundry IQ"** toggle on the "Stage 2: Grounded Console" tab routes Product-Docs-domain questions to this real agent — streamed answer, real citations — while every other domain keeps using the Stage 2 mock matcher.
- **Fabric IQ, Sales Performance domain (built and deployed)** — a third Foundry Hosted Agent, grounded on a real Power BI/Fabric semantic model built from `src/data/raw/salesPerformance.js` and queried live via the Power BI Execute Queries REST API. Same **"Live"** toggle pattern on the Sales Performance record; CRM, Telemetry, Support Cases, and the cross-domain composite record stay on the Stage 2 mock matcher.
- **Work IQ, Web IQ, and the rest of Fabric IQ** — documented architecturally (what real service, what it would take to stand up) but not built in this pass.

Running it locally requires the agents to be deployed and a `.env` pointing at them (see `.env.example`); `npm run dev` then proxies live requests through a dev-only auth layer in `vite.config.js`.

## Status

Stage 1, Stage 2, and Stage 3 complete. Stage 4/5 in progress (Foundry IQ and Fabric IQ's Sales Performance domain built and deployed; the rest of Fabric IQ plus Work IQ and Web IQ documented only).

## License

MIT
