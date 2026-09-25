# Real Azure implementation — Foundry IQ & Fabric IQ

Stages 1–3 proved the *shape* of grounding — data mapped to the right IQ product, normalized into citable records, access-controlled and audited — entirely with mock data and a hand-written keyword matcher. Stage 4 made one of those four IQ products real: an actual deployed agent, grounded on real Azure infrastructure, answering real questions with real citations. Stage 5 made a second one real: Fabric IQ, scoped to the Sales Performance domain, grounded on an actual Fabric semantic model. Work IQ and Web IQ, and the rest of Fabric IQ's domains (CRM, Telemetry, Support Cases, and the cross-domain composite), remain documented here architecturally but not built.

## Why Foundry IQ first, Fabric IQ second

| Data domain | Mapped IQ product | Status |
|---|---|---|
| Sales performance | **Fabric IQ** | **Built and deployed** |
| CRM, Telemetry, Support cases | **Fabric IQ** | Documented only (mock matcher) |
| M365 (calendar, inbox, Teams) | **Work IQ** | Documented only |
| Permits, Climate/disaster risk | **Web IQ** | Documented only |
| Product Docs | **Foundry IQ** | **Built and deployed** |

Foundry IQ (via Azure AI Search) was the cheapest real thing to stand up: no external tenant/consent flow, no Fabric workspace or semantic model, no Bing Grounding resource returning uncontrolled live results — just an Azure AI Search resource, an index, and documents. It also reuses this repo's own `src/data/raw/productDocs.js` directly as seed content, so there was no new data to invent.

Fabric IQ was scoped to Sales Performance only rather than all four of its mapped domains — building a real, multi-table semantic model with relationships is meaningfully more Fabric modeling work than one table, and mirrors the "prove the pattern with one domain first" precedent Foundry IQ set. CRM, Telemetry, Support Cases, and the cross-domain composite record stay on the Stage 2 mock matcher.

## What's built: Foundry IQ docs agent


A second, independent Foundry Hosted Agent — separate from [`lead-agent-demo`](https://github.com/olivierb123/lead-agent-demo)'s already-deployed agent, with its own Foundry project, model deployment, and Azure AI Search resource. It follows the same deployment pattern `lead-agent-demo` proved out (`agent_framework.Agent` + `FoundryChatClient`, `agent_framework_foundry_hosting.ResponsesHostServer`, `azd ai agent init/provision/deploy`), so it exposes the same Responses-protocol `/responses` SSE endpoint the frontend already knows how to consume.

**Retrieval**: `agent/agent.py` wires an `AzureAISearchContextProvider` (from `agent-framework-azure-ai-search`) directly into the agent as a `context_providers` entry — Agent Framework already exposes Azure AI Search as a first-class hosted retrieval hook, so no custom function-tool fallback was needed. It queries the `product-docs` index in `semantic` mode (top 3 results) against a semantic configuration seeded by `scripts/seed_search_index.py`, and the agent's instructions require it to answer only from that retrieved context and always cite the source doc's title and `docId` inline.

**Indexing**: `scripts/seed_search_index.py` is a one-off script, run manually after provisioning, that creates the `product-docs` index (`id`, `docId`, `title`, `content`, `type`, `audience`, `lastUpdated` fields, plus a semantic configuration) and uploads the 4 docs from `productDocs.js` (hand-ported into the script — not worth a build step for 4 documents).

**Frontend**: `vite.config.js` runs a dev-only middleware proxy (`foundryIQProxyPlugin`) in front of `/api/foundry-iq/responses` — it mints an AAD bearer token via `DefaultAzureCredential` (backed by the developer's own `az login` session) and forwards the request to the deployed agent, so the browser never handles Azure credentials directly. `src/agentClient.js` streams the SSE response back to the UI. On the "Stage 2: Grounded Console" tab, a **"Live: Foundry IQ"** toggle routes Product-Docs-domain questions to this real agent instead of the mock matcher, rendering the real streamed answer and real citations (extracted from `DOC-\d+` mentions in the response text and resolved against `productDocs.js` metadata) in the same `RecordCard` shape — all other domains keep using the Stage 2 mock matcher, clearly labeled. This project has no public hosting yet, so a local dev-server proxy is sufficient — unlike `lead-agent-demo`'s publicly-hosted Static Web App, which needed an Azure Function proxy with its own service-principal auth.

## Gotchas hit during provisioning

- **Two distinct identities per hosted agent.** A deployed Foundry Hosted Agent has both the parent Cognitive Services account's identity and its own separate Instance Identity Principal ID. Role assignments (e.g. granting the agent read access to the Azure AI Search index) need to target the *agent's* instance identity, not the parent account — granting the wrong one silently doesn't work rather than erroring clearly.
- **Env var injection isn't automatic.** `azd ai agent init` doesn't auto-populate an `env:` block for a hosted agent's deployment — it has to be added explicitly to `azure.yaml` (see `agent/azure.yaml`'s `env:` block under the `foundryiq-docs-agent` service) or the container never receives `AZURE_SEARCH_ENDPOINT`, `AZURE_SEARCH_INDEX_NAME`, etc. at runtime, even though they're present in the local `.env`. This isn't quite enough on its own, either — `azure.yaml`'s `${VAR}` substitution reads from **azd's own environment store**, not the local `.env` file, so new env vars also need `azd env set KEY value` before a deploy will inject them.

## What's built: Fabric IQ sales agent

A third Foundry Hosted Agent, `fabriciq-sales-agent`, sharing the same Foundry project and model deployment as the docs agent but with its own entry point, instructions, and tool (`agent/fabric_agent.py`, `agent/fabric_server.py`). It answers Sales Performance questions grounded on a real Fabric/Power BI semantic model — not the Stage 2 mock matcher.

**Retrieval**: unlike Foundry IQ's native `AzureAISearchContextProvider`, Agent Framework has no hosted tool for Fabric/Power BI, so `agent/fabric_tools.py`'s `query_sales_performance(territory, month)` is a custom function tool that builds a DAX query (`EVALUATE sales_performance` or a `FILTER(...)`-wrapped variant when args are given) and calls it against the Power BI **Execute Queries** REST API (`POST .../datasets/{id}/executeQueries`). The agent's instructions mandate a fixed inline citation ("Source: Fabric IQ semantic model — sales_performance table, live query") since there's only one source table here, unlike Foundry IQ's per-doc citation parsing.

**The semantic model**: a Power BI **Import-mode** semantic model built directly from a CSV export of `src/data/raw/salesPerformance.js` (via `scripts/export_sales_performance_csv.py`), uploaded through the Fabric portal's "+ New item → Semantic model" flow — not a Fabric Lakehouse-backed Direct Lake model. See the Direct Lake gotcha below for why.

**Auth**: `DefaultAzureCredential`, resolving to the deployed agent's own Instance Identity Principal ID — granted Contributor on the workspace via its Entra *object ID* (not its app/client ID, for `principalType=App` role assignments). No separate service principal or client secret. Locally this rides the developer's own `az login` session for testing.

## Gotchas hit building Fabric IQ

- **Direct Lake semantic models were unreliable for app-only auth (both the Agent Identity and a classic service principal), and eventually the whole model.** Against the Lakehouse's auto-generated default semantic model (Direct Lake mode), delegated (interactive user) auth worked fine, but every app-only identity — Foundry's Agent Identity, and a dedicated classic Entra app registration tried as a fallback — got a flat 401 despite identical, fully-verified RBAC at every layer: workspace role, dataset permission, Lakehouse direct-access ACL, and OneLake Security role membership. The dataset later broke entirely, failing with `"Failed to open the MSOLAP connection"` even for the previously-working dev account, traced to the workspace's Fabric capacity going inactive/detached. Rather than keep fighting Direct Lake's platform quirks, the fix was to sidestep it: delete the Lakehouse-backed default semantic model and the Lakehouse itself, and build a plain **Import-mode** semantic model directly from a CSV upload. Import mode only needs classic workspace role + dataset permission — no Lakehouse-specific ACL layer.
- **The Agent Identity 401 turned out to be a Direct Lake artifact, not a categorical rejection.** The original assumption — that Power BI simply doesn't recognize Foundry's Agent Identity as an authorizable principal — was wrong. Once the dataset was rebuilt as Import-mode, re-testing `DefaultAzureCredential` (the agent's own Instance Identity, already granted Contributor on the workspace from the earlier attempt) against it succeeded immediately, with no code change beyond swapping the credential class. The classic service principal (`ClientSecretCredential` + `AZURE_POWERBI_SP_*` vars) was removed once this was confirmed — one less secret to manage and rotate.
- **Deleting a Fabric item doesn't auto-regenerate it.** Deleting a Lakehouse's default semantic model via the Fabric REST API, then reopening the Lakehouse in the portal, does not cause Fabric to recreate it — a new semantic model has to be created explicitly.

## What's documented but not built

### Fabric IQ — CRM, telemetry, support cases
The same Fabric Data Agent pattern proven out for Sales Performance, extended to the other three tabular domains (Dynamics 365 Sales, an internal telemetry warehouse, a support system of record) as one shared semantic model with proper relationships across tables — meaningfully more Fabric modeling work than a single flat table, and out of scope for this pass.


### Work IQ — M365 (calendar, inbox, Teams)
A connector grounded directly in Microsoft Graph data the org already has. Making this real requires an actual M365 tenant, Entra app registration with delegated Graph consent (`Calendars.Read`, `Mail.Read`, `Chat.Read`, etc.), and a real user's mailbox/calendar/Teams history to query against — meaningfully more setup than the other three IQ products, and the reason it wasn't picked for the first real integration.

### Web IQ — permits, climate/disaster risk
Grounding with Bing Search, built for citation-ready web retrieval rather than a search-results page. This is the natural second real integration — it's cheap to provision (a Bing Grounding resource, no external tenant needed) but was deprioritized behind Foundry IQ because its results are live and uncontrolled, making it a noisier first proof than a fixed, indexed document set.

## Verification

The deployed Foundry IQ docs agent was smoke-tested directly (curl, through the deployed `/responses` endpoint) with the canonical "How do we position FieldForge against Procore?" question and returned a real answer citing `DOC-2` (the competitive battlecard), and the same question was verified end-to-end through the browser via the "Live: Foundry IQ" toggle.

The deployed Fabric IQ sales agent was smoke-tested the same way (`azd ai agent invoke fabriciq-sales-agent`) with "Which territories are behind quota this quarter, and by how much?" and returned a real, correctly-computed answer (West and South territories, with accurate variance percentages) grounded in the live semantic model, with the fixed citation. Also verified end-to-end through the browser via the "Live: Fabric IQ" toggle on the Sales Performance record.
