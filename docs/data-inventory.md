# Data & system-of-record inventory

This is the bottom of the stack: before any normalization or UI work, know what data exists, where it actually lives, and which Microsoft "IQ" grounding product maps to it.

| Data domain | System of record | Why that's the system of record | Mapped IQ product | Grounding rationale |
|---|---|---|---|---|
| Internal business data | OneLake semantic model (`Sales.FactRevenue` × `Sales.DimRegion`) | Sales/target data already lives here, modeled with the org's real business hierarchy | **Fabric IQ** | Understands the semantic/business model directly — no reinvented joins or metric definitions |
| Microsoft 365 content | Microsoft Graph (Teams transcripts, Exchange mail) | Conversation/commitment history exists only in M365, not a database | **Work IQ** | Grounds directly in Graph data the org already has, instead of reconstructing it from memory |
| Public / real-world data | Municipal permit registry (e.g., Austin, TX) | Permit filings are public records held by the municipality, not internal systems | **Web IQ** | Citation-ready public retrieval, not a generic scrape with no provenance |
| Everything else | *(varies — no single system of record)* | Doesn't fit a purpose-built IQ product | **Foundry IQ** | General-purpose fallback grounding layer |

These three domains (Fabric IQ, Work IQ, Web IQ) are the ones carried through to Stage 2's normalized console — see `src/data/mockRecords.js`.
