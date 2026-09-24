# Real Azure implementation — Foundry IQ

Stages 1–3 proved the *shape* of grounding — data mapped to the right IQ product, normalized into citable records, access-controlled and audited — entirely with mock data and a hand-written keyword matcher. Stage 4 makes one of those four IQ products real: an actual deployed agent, grounded on real Azure infrastructure, answering real questions with real citations. The other three are documented here architecturally but not built, per the "stage it, one real integration first" scoping decision.

## Why Foundry IQ first

| Data domain | Mapped IQ product | Status |
|---|---|---|
| CRM, Sales performance, Telemetry, Support cases | **Fabric IQ** | Documented only |
| M365 (calendar, inbox, Teams) | **Work IQ** | Documented only |
| Permits, Climate/disaster risk | **Web IQ** | Documented only |
| Product Docs | **Foundry IQ** | **Built and deployed** |

Foundry IQ (via Azure AI Search) was the cheapest real thing to stand up: no external tenant/consent flow, no Fabric workspace or semantic model, no Bing Grounding resource returning uncontrolled live results — just an Azure AI Search resource, an index, and documents. It also reuses this repo's own `src/data/raw/productDocs.js` directly as seed content, so there was no new data to invent.

## What's built: Foundry IQ docs agent

A second, independent Foundry Hosted Agent — separate from [`lead-agent-demo`](https://github.com/olivierb123/lead-agent-demo)'s already-deployed agent, with its own Foundry project, model deployment, and Azure AI Search resource. It follows the same deployment pattern `lead-agent-demo` proved out (`agent_framework.Agent` + `FoundryChatClient`, `agent_framework_foundry_hosting.ResponsesHostServer`, `azd ai agent init/provision/deploy`), so it exposes the same Responses-protocol `/responses` SSE endpoint the frontend already knows how to consume.

**Retrieval**: `agent/agent.py` wires an `AzureAISearchContextProvider` (from `agent-framework-azure-ai-search`) directly into the agent as a `context_providers` entry — Agent Framework already exposes Azure AI Search as a first-class hosted retrieval hook, so no custom function-tool fallback was needed. It queries the `product-docs` index in `semantic` mode (top 3 results) against a semantic configuration seeded by `scripts/seed_search_index.py`, and the agent's instructions require it to answer only from that retrieved context and always cite the source doc's title and `docId` inline.

**Indexing**: `scripts/seed_search_index.py` is a one-off script, run manually after provisioning, that creates the `product-docs` index (`id`, `docId`, `title`, `content`, `type`, `audience`, `lastUpdated` fields, plus a semantic configuration) and uploads the 4 docs from `productDocs.js` (hand-ported into the script — not worth a build step for 4 documents).

**Frontend**: `vite.config.js` runs a dev-only middleware proxy (`foundryIQProxyPlugin`) in front of `/api/foundry-iq/responses` — it mints an AAD bearer token via `DefaultAzureCredential` (backed by the developer's own `az login` session) and forwards the request to the deployed agent, so the browser never handles Azure credentials directly. `src/agentClient.js` streams the SSE response back to the UI. On the "Stage 2: Grounded Console" tab, a **"Live: Foundry IQ"** toggle routes Product-Docs-domain questions to this real agent instead of the mock matcher, rendering the real streamed answer and real citations (extracted from `DOC-\d+` mentions in the response text and resolved against `productDocs.js` metadata) in the same `RecordCard` shape — all other domains keep using the Stage 2 mock matcher, clearly labeled. This project has no public hosting yet, so a local dev-server proxy is sufficient — unlike `lead-agent-demo`'s publicly-hosted Static Web App, which needed an Azure Function proxy with its own service-principal auth.

## Gotchas hit during provisioning

- **Two distinct identities per hosted agent.** A deployed Foundry Hosted Agent has both the parent Cognitive Services account's identity and its own separate Instance Identity Principal ID. Role assignments (e.g. granting the agent read access to the Azure AI Search index) need to target the *agent's* instance identity, not the parent account — granting the wrong one silently doesn't work rather than erroring clearly.
- **Env var injection isn't automatic.** `azd ai agent init` doesn't auto-populate an `env:` block for a hosted agent's deployment — it has to be added explicitly to `azure.yaml` (see `agent/azure.yaml`'s `env:` block under the `foundryiq-docs-agent` service) or the container never receives `AZURE_SEARCH_ENDPOINT`, `AZURE_SEARCH_INDEX_NAME`, etc. at runtime, even though they're present in the local `.env`.

## What's documented but not built

### Fabric IQ — CRM, sales performance, telemetry, support cases
A Fabric Data Agent grounded over a Lakehouse/semantic model in Microsoft Fabric/OneLake. These four domains are already structured/tabular (Dynamics 365 Sales, a Power BI semantic model, an internal telemetry warehouse, a support system of record) — Fabric IQ's value is a business-model-aware semantic layer over that data, not raw table access. Building this for real would mean provisioning a Fabric workspace, publishing a semantic model over mock-equivalent tables, and connecting a Fabric Data Agent — out of scope for this pass.

### Work IQ — M365 (calendar, inbox, Teams)
A connector grounded directly in Microsoft Graph data the org already has. Making this real requires an actual M365 tenant, Entra app registration with delegated Graph consent (`Calendars.Read`, `Mail.Read`, `Chat.Read`, etc.), and a real user's mailbox/calendar/Teams history to query against — meaningfully more setup than the other three IQ products, and the reason it wasn't picked for the first real integration.

### Web IQ — permits, climate/disaster risk
Grounding with Bing Search, built for citation-ready web retrieval rather than a search-results page. This is the natural second real integration — it's cheap to provision (a Bing Grounding resource, no external tenant needed) but was deprioritized behind Foundry IQ because its results are live and uncontrolled, making it a noisier first proof than a fixed, indexed document set.

## Verification

The deployed Foundry IQ docs agent was smoke-tested directly (curl, through the deployed `/responses` endpoint) with the canonical "How do we position FieldForge against Procore?" question and returned a real answer citing `DOC-2` (the competitive battlecard), and the same question was verified end-to-end through the browser via the "Live: Foundry IQ" toggle.
