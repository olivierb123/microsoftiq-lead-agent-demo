# Real Azure implementation — Foundry IQ, Fabric IQ & Web IQ

Stages 1–3 proved the *shape* of grounding — data mapped to the right IQ product, normalized into citable records, access-controlled and audited — entirely with mock data and a hand-written keyword matcher. Stage 4 made one of those four IQ products real: an actual deployed agent, grounded on real Azure infrastructure, answering real questions with real citations. Stage 5 made a second one real: Fabric IQ, scoped to the Sales Performance domain, grounded on an actual Fabric semantic model. Stage 6 made a third real: Web IQ, scoped to the Climate/Disaster Risk domain, grounded on Microsoft's real, live Web IQ web-search API. Work IQ, the rest of Fabric IQ's domains (CRM, Telemetry, Support Cases, and the cross-domain composite), and Web IQ's Permits domain remain documented here architecturally but not built.

## Why Foundry IQ first, Fabric IQ second, Web IQ third

| Data domain | Mapped IQ product | Status |
|---|---|---|
| Sales performance | **Fabric IQ** | **Built and deployed** |
| CRM, Telemetry, Support cases | **Fabric IQ** | Documented only (mock matcher) |
| M365 (calendar, inbox, Teams) | **Work IQ** | Documented only |
| Climate/disaster risk | **Web IQ** | **Built and deployed** |
| Permits | **Web IQ** | Documented only (mock matcher) |
| Product Docs | **Foundry IQ** | **Built and deployed** |

Foundry IQ (via Azure AI Search) was the cheapest real thing to stand up: no external tenant/consent flow, no Fabric workspace or semantic model, no Bing Grounding resource returning uncontrolled live results — just an Azure AI Search resource, an index, and documents. It also reuses this repo's own `src/data/raw/productDocs.js` directly as seed content, so there was no new data to invent.

Fabric IQ was scoped to Sales Performance only rather than all four of its mapped domains — building a real, multi-table semantic model with relationships is meaningfully more Fabric modeling work than one table, and mirrors the "prove the pattern with one domain first" precedent Foundry IQ set. CRM, Telemetry, Support Cases, and the cross-domain composite record stay on the Stage 2 mock matcher.

Web IQ was scoped to Climate/Disaster Risk only, not Permits, matching the same "one domain first" precedent, and became available once real API access was confirmed (Microsoft's Web IQ product — a live web-grounding API for LLMs/agents — happens to share its exact name with this demo's own IQ-product taxonomy). Unlike Fabric IQ's Azure AD/RBAC saga, this integration's auth is a plain API key header — no tenant, no workspace, no role assignment to arrange.

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

## What's built: Web IQ climate agent

A fourth Foundry Hosted Agent, `webiq-climate-agent`, sharing the same Foundry project and model deployment as the other two but with its own entry point, instructions, and tool (`agent/webiq_agent.py`, `agent/webiq_server.py`). It answers Climate/Disaster Risk questions grounded on Microsoft's real, live **Web IQ** product (`webiq.microsoft.ai`) — not the Stage 2 mock matcher.

**Retrieval**: like Fabric IQ, there's no native Agent Framework hosted tool for this service, so `agent/webiq_tools.py`'s `search_climate_risk(query, max_results=5)` is a custom function tool that calls Web IQ's `POST /search/web` endpoint (`https://api.microsoft.ai/v3/search/web`) directly with `requests`, appending a fixed `site:noaa.gov OR site:fema.gov OR site:weather.gov` scope onto the model's query so results stay anchored to authoritative hazard sources rather than an arbitrary web page. It returns each result's `title`, `url`, `domain` (falling back to the URL's host if the API omits it), `content`, `lastUpdatedAt` (falling back to `crawledAt`), and `sourceQuality`. The agent's instructions mandate a fixed inline citation format — `Source: <domain> — "<title>" (updated <lastUpdatedAt>)` — parsed out of the streamed response text by `extractWebCitations` in `src/App.jsx`, giving genuine per-query citations from live search results rather than a single fixed string.

**Auth**: a plain API key in the `x-apikey` request header (`WEBIQ_API_KEY`) — Web IQ also supports an Entra bearer-token option, but the API key is simpler and needs no app registration, RBAC grant, or workspace access of any kind. Meaningfully less setup than Fabric IQ's Azure AD saga.

## Gotchas hit building Web IQ

- **The product's own documentation pages were unreliable; the OpenAPI spec was the only authoritative source.** Web IQ's human-readable API-reference and Authentication doc pages returned marketing/FAQ content instead of technical detail when fetched (the product is in limited enterprise access). The real, structured contract — endpoints, auth schemes, request/response field names — only came from the OpenAPI JSON spec at `https://webiq.microsoft.ai/documentation/openapi.json`, linked from `https://webiq.microsoft.ai/llms.txt`.
- **Some documented response fields (`domain`, `lastUpdatedAt`) aren't always present.** A raw test call against the live API returned results with `title`/`url`/`content`/`crawledAt` but no `domain` or `lastUpdatedAt` on every result, despite both being in the OpenAPI schema. `webiq_tools.py` derives `domain` from the URL's host as a fallback and falls back to `crawledAt` for the date, so citations stay populated either way.

## What's documented but not built

### Fabric IQ — CRM, telemetry, support cases
The same Fabric Data Agent pattern proven out for Sales Performance, extended to the other three tabular domains (Dynamics 365 Sales, an internal telemetry warehouse, a support system of record) as one shared semantic model with proper relationships across tables — meaningfully more Fabric modeling work than a single flat table, and out of scope for this pass.


### Work IQ — M365 (calendar, inbox, Teams)
A connector grounded directly in Microsoft Graph data the org already has. Making this real requires an actual M365 tenant, Entra app registration with delegated Graph consent (`Calendars.Read`, `Mail.Read`, `Chat.Read`, etc.), and a real user's mailbox/calendar/Teams history to query against — meaningfully more setup than the other three IQ products, and the reason it wasn't picked for the first real integration.

### Web IQ — permits
The same Web IQ web-search pattern proven out for Climate/Disaster Risk, scoped instead toward municipal permit registries and filings — out of scope for this pass, matching the "prove the pattern with one domain first" precedent.

## Verification

The deployed Foundry IQ docs agent was smoke-tested directly (curl, through the deployed `/responses` endpoint) with the canonical "How do we position FieldForge against Procore?" question and returned a real answer citing `DOC-2` (the competitive battlecard), and the same question was verified end-to-end through the browser via the "Live: Foundry IQ" toggle.

The deployed Fabric IQ sales agent was smoke-tested the same way (`azd ai agent invoke fabriciq-sales-agent`) with "Which territories are behind quota this quarter, and by how much?" and returned a real, correctly-computed answer (West and South territories, with accurate variance percentages) grounded in the live semantic model, with the fixed citation. Also verified end-to-end through the browser via the "Live: Fabric IQ" toggle on the Sales Performance record.

The Web IQ climate agent's underlying tool was smoke-tested with a raw `curl` call against the live `/search/web` endpoint before any agent code was written, confirming the key and contract both work (real NOAA hurricane-advisory results for a Miami-Dade storm-risk query). The deployed agent itself was then smoke-tested via `azd ai agent invoke webiq-climate-agent` with "What's the storm risk outlook for our Miami-Dade project?" and verified end-to-end through the browser via the "Live: Web IQ" toggle on the Climate/Disaster Risk record.
