# IT Command Center — IT Management for the AI Agent Era

A portfolio project site presenting an IT Manager's operating model for the AI agent era:
**executive-summary-first**, KPI-driven, and mapped to ITIL 4 practices.

**Live site:** deployed on Vercel · **Stack:** static HTML/CSS/JS (zero build step, zero dependencies)

## What it covers

| Domain | Pitch | KPI moved |
|---|---|---|
| **IT Governance & Asset Management** | Git as the system of record — audit-ready by default (Terraform → PR approval → policy-as-code → GitOps → live CMDB) | Audit evidence: 3 weeks → 2 days; 100% traceable changes |
| **Incident Response & Resilient Operations** | Supervised agents do the first 30 minutes: triage, diagnostics, ticket, RCA draft | MTTR ↓ 72% |
| **FinOps & Cost Optimization** | Cost as a control loop: idle reaping, off-hours scheduling, anomaly paging, weekly savings ledger | Cloud spend ↓ 38% |

Plus:

- **AI Agent Operating Model** — graduated autonomy, audit-trailed agent actions, MCP-based tool governance, kill switches, agent KPIs, human-in-the-loop gates
- **ITIL 4 practice mapping** — every automation traced to the practice it implements
- **12-month adoption roadmap** — from spreadsheets to supervised autonomy

## Run locally

```bash
# any static server works
npx serve .
# or just open index.html
```

## Structure

```
index.html   # all content, semantic sections
styles.css   # dark theme, design tokens, responsive layout
app.js       # KPI counters, scroll reveal, simulated agent incident console
```

> KPI figures are targets from lab/reference implementations, representative of published industry benchmarks.
