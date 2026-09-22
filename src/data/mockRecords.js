export const mockRecords = [
  {
    id: 'fabric-iq-1',
    domain: 'Internal business data',
    groundingSource: 'Fabric IQ',
    query: 'Which regions missed their Q3 revenue target, and by how much?',
    reasoning:
      "This lives entirely inside the org's own structured business data — sales facts, targets, and region hierarchies already modeled in Fabric/OneLake. Fabric IQ's semantic layer understands that business model directly, so the agent doesn't need to guess table joins or reinvent a metric definition.",
    citation: 'OneLake: Sales.FactRevenue × Sales.DimRegion (semantic model refreshed 2h ago)',
    answerPreview:
      'West and Central both missed target: West by $410K (-6.2%), Central by $180K (-3.1%). East and South were both ahead of plan.',
  },
  {
    id: 'work-iq-1',
    domain: 'Microsoft 365 content',
    groundingSource: 'Work IQ',
    query: 'What did the Contoso renewal team last commit to on the pricing call?',
    reasoning:
      "The answer lives in the org's own M365 content — a Teams call transcript and a follow-up email — not in a structured database or on the public web. Work IQ grounds directly in that Graph data (mail, calendar, Teams) instead of the agent trying to reconstruct it from memory.",
    citation: 'Teams transcript: "Contoso Renewal — Pricing Sync" (Tue 2:00pm) + follow-up email thread',
    answerPreview:
      'Sales committed to a 10% renewal discount contingent on a 2-year term, to be confirmed in writing by Friday.',
  },
  {
    id: 'web-iq-1',
    domain: 'Public / real-world data',
    groundingSource: 'Web IQ',
    query: "Has Apex Design & Build pulled any new commercial permits recently?",
    reasoning:
      "Municipal permit filings are public real-world data, not something in the org's own systems. Web IQ is built for exactly this — citation-ready retrieval over public/registry data — rather than a generic web scrape with no provenance.",
    citation: 'Austin, TX municipal permit registry — filing #CP-24-11892 (3 days ago)',
    answerPreview:
      'Yes — Apex Design & Build (Austin, TX) pulled a commercial permit for a 4th St remodel 3 days ago. Owner of record: Marcus Vance, Managing Principal.',
  },
]
