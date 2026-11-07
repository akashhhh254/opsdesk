# OpsDesk Architecture Specification

## 1. System Overview

OpsDesk is an AI-powered, context-rich B2B travel operations management platform designed for the TBO Zendesk challenge. It replaces isolated, text-only support tickets with travel-aware operational cases connected to:
- Booking Reference (TBOH)
- Guest Identity & Pax Breakdown
- Property / Airline GDS Locator
- Upstream Bedbank / Supplier (Hotelbeds, Expedia, WebBeds, Agoda)
- Check-in Date & Last Cancellation Date (LCD) Urgency Windows

---

## 2. Six Core Problem Formulations & Solutions

| Challenge Problem | OpsDesk Solution & Interface |
|---|---|
| **1. Tickets without Context** | Every ticket enforces structured booking parameters (TBOH, guest name, property, supplier reference, check-in date, LCD). Context linking engine automatically detects existing tickets on the same TBOH. |
| **2. Inefficient Ticket Routing & Ownership** | Deterministic multi-signal routing engine scoring Region, Category/Specialization, Check-in Proximity (<24h), and Agent Workload. Stored human-readable routing reason. Unassigned Triage queue. |
| **3. Fragile Supplier & Agency Side Threads** | Separate side conversation engine with persistent explicit recipient lists. Strict role-based isolation: Agency users can never view internal notes or supplier threads. |
| **4. Generic SLA Management & Difficult Escalation** | Travel-aware SLA engine compressing deadlines when check-in is <24h away or near LCD. First-class Escalation workflow with reason, transfer to Escalation Manager, and audit trail. |
| **5. Broken Customer Feedback & Insights Loop** | NLP complaint theme clustering (Hotel PMS Rejections, Delayed Supplier Refunds, GDS E-ticket Suspensions, Inventory Mismatches). Real Recharts visualizations. |
| **6. Limited Real-Time Data Access & Archival** | Persistent JSON/DB storage, sub-second searching and multi-attribute filtering, server-side pagination, and 1-click full CSV export. |

---

## 3. Data & Tenant Isolation Model

```
+-------------------------------------------------------------+
|                      OpsDesk Platform                       |
+-------------------------------------------------------------+
         |                                           |
  Agency Persona (Tenant)                  Operations Staff (Internal)
         |                                           |
+--------------------------+               +--------------------------+
| - Own Agency Tickets     |               | - Support Agent          |
| - Public External Replies|               | - Escalation Manager     |
| - Booking History Search |               | - Operations Lead (Admin)|
| [NO Internal Notes]      |               | - Internal Notes & Timelines
| [NO Supplier Side Chats] |               | - Supplier Side Threads  |
+--------------------------+               +--------------------------+
```

Data isolation is enforced at the REST API controller layer (`server.ts`) and repository layer (`src/server/db.ts`):
```typescript
if (requestingUser.role === 'agency') {
  list = list.filter((t) => t.agencyId === requestingUser.agencyId);
}
```

---

## 4. Multi-Signal Routing Algorithm

1. **Configured Custom Rules**: Priority-ordered matching on Region, Category, Priority, and Hours to Check-In.
2. **Multi-Signal Heuristic**:
   - `+30 points`: Agent region matches ticket region.
   - `+40 points`: Agent specialization matches category.
   - `+35 points`: Emergency check-in triage (<24h).
   - `-5 points per active case`: Workload balancing.
3. If no agent meets the score threshold, ticket routes safely to **Triage / Unassigned Queue**.
