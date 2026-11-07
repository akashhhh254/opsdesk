# OpsDesk – AI-Powered Travel Operations Ticketing Platform

OpsDesk is an enterprise B2B travel operations management platform built for the **TBO Zendesk Problem Statement**. It solves the six core operational failures of legacy ticketing systems by turning isolated support tickets into context-rich, travel-aware cases.

---

## 🌟 The 6 Core Challenge Areas Solved

| Problem Statement | OpsDesk Architectural Solution |
|---|---|
| **1. Tickets without Context** | Every case encapsulates booking reference (TBOH), passenger breakdown, property/flight details, supplier locator, check-in date, and LCD. |
| **2. Inefficient Routing & Ownership** | Multi-signal routing engine scoring Region, Category Specialization, Check-in Urgency (<24h), and Workload Balancing with human-readable rationale. |
| **3. Fragile Supplier Side Conversations** | Dedicated supplier side-conversation engine with preserved recipient lists and strict role-based isolation (clients never see internal/supplier notes). |
| **4. Generic SLA & Difficult Escalation** | Travel-aware SLA engine compressing response targets for imminent arrivals (<24h) and LCD cutoffs. First-class escalation workflow to manager queues. |
| **5. Broken Insights & Feedback Loop** | NLP complaint theme extraction clustering recurring bedbank/PMS issues (e.g. rate mismatches, delayed refunds, unconfirmed vouchers). |
| **6. Limited Data Access & Expensive Archival** | Persistent storage with sub-second multi-parameter filtering, server-side pagination, and 1-click full CSV export without artificial 3,000-row limits. |

---

---

## 🔒 Authentication & Role-Based Access Control (RBAC)

OpsDesk implements **genuine Firebase Authentication** with persistent sessions, email verification, password reset, and Google Sign-in:

- **Authentication Required:** Protected dashboard pages require real Firebase authentication. Unauthenticated users cannot access dashboard records.
- **Bootstrapped Admin:** `akashthakare157@gmail.com` is automatically provisioned as Admin / Operations Lead.
- **Public Registration:** New users register with Email/Password or Google and are securely initialized with default role `agency` and agency association. Privilege escalation during registration is blocked.
- **Roles Implemented:**
  1. `agency` (Agency / Requester)
  2. `agent` (Ops Agent)
  3. `escalation_manager` (Escalation Manager)
  4. `admin` (Admin / Operations Lead)

---

## 🧭 Streamlined 7-Module Navigation

The interface follows the core product philosophy of simplicity and usability:

1. **Overview:** Executive operations dashboard with live KPIs, urgency alerts, and status distributions.
2. **Tickets:** Full ticket queue with contextual linking, travel filters, and comprehensive detail views.
3. **My Queue:** Agent-specific queue with workload tracking.
4. **Conversations:** Dedicated supplier side-communication hub with preserved recipient lists.
5. **Escalations:** First-class escalation command centre for SLA breaches and manager actions.
6. **Insights:** AI theme clustering, category trends, and CSV data export.
7. **Settings:** Routing rule builder, travel SLA policies, staff role management, and audit logs.

---

## 🛠 Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts
- **Backend:** Node.js, Express.js, TypeScript (`tsx server.ts`), REST API Architecture
- **Database:** ACID JSON-persisted repository (`data/opsdesk-db.json`) with auto-recalculation of SLA timers
- **AI Integration:** Google Gemini 3.8 Flash (`@google/genai`) with automatic deterministic rule-based fallback
- **Design:** High-density enterprise SaaS dashboard adhering to WCAG AA, tabular numerals, and zero-pill discipline

---

## 🚀 Running OpsDesk

### Development Server
```bash
npm run dev
```
Starts the full-stack Express + Vite server at `http://localhost:3000`.

### Building for Production
```bash
npm run build
npm run start
```

---

## 🧪 Quick Hackathon Demo Steps

Click the **"Judge Demo Guide"** button in the top navigation bar for a 1-click interactive walkthrough:
1. **Agency View:** Log in as Tariq (`usr_tariq`), view booking `TBOH-984210` warning on ticket creation.
2. **Agent View:** Switch to Rahul (`usr_rahul`), open `OPS-1001`, observe linked case `OPS-1004` (same TBOH) and routing reason.
3. **Supplier Thread:** Check the Supplier Side Conversation tab on `OPS-1001` with `urgent-ops@hotelbeds.com`.
4. **Escalation View:** Switch to Elena (`usr_elena`), inspect breached case `OPS-1005` in the Escalation Command Centre.
5. **Insights & Export:** Switch to Vikram (`usr_vikram`), inspect Recharts theme trends and export the CSV report.

---

## 📁 Project Structure

```
├── server.ts                    # Full-stack Express server with Vite middleware & REST endpoints
├── package.json
├── metadata.json
├── docs/
│   ├── architecture.md          # Architecture & data flow specification
│   ├── api.md                   # REST API reference documentation
│   └── demo-script.md           # 3-5 minute demonstration script for judges
├── data/
│   └── opsdesk-db.json          # Persistent ACID database file (auto-generated)
└── src/
    ├── types/index.ts           # Domain entities (Ticket, Agency, User, SlaPolicy, RoutingRule)
    ├── context/AuthContext.tsx  # Role-based auth & persona switcher
    ├── services/api.ts          # Typed client API service
    ├── server/
    │   ├── db.ts                # Database repository with realistic synthetic seed data
    │   ├── routingEngine.ts     # Multi-signal routing algorithm
    │   ├── slaEngine.ts         # Travel-aware SLA calculator
    │   └── aiService.ts         # Gemini 3.8 Flash + deterministic fallback
    ├── components/
    │   ├── layout/              # Navbar and Sidebar
    │   ├── tickets/             # TicketList, TicketDetail, CreateTicketModal, EscalateModal, LinkModal, ResolveModal
    │   ├── agent/               # AgentWorkspace with queue tabs
    │   ├── agency/              # AgencyPortal with tenant isolation
    │   ├── escalation/          # EscalationCenter
    │   ├── admin/               # AdminOperations with routing & SLA config
    │   ├── insights/            # InsightsAnalytics with Recharts & CSV export
    │   └── demo/                # DemoGuideModal for hackathon judges
    └── App.tsx                  # Main application orchestrator
```
