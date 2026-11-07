# OpsDesk REST API Reference

All requests accept and return JSON. The calling persona is determined via the `x-user-id` HTTP header.

---

## Authentication & Users

### `GET /api/auth/me`
Returns current authenticated user and role.

### `GET /api/auth/users`
Lists all active system users (Agencies, Agents, Escalation Managers, Admins).

### `GET /api/agencies`
Returns registered travel agencies.

---

## Tickets

### `GET /api/tickets`
Query Parameters:
- `status`: New | Open | Pending | Escalated | Resolved | Closed
- `priority`: Urgent | High | Medium | Low
- `region`: EMEA | APAC | Americas | Global
- `category`: TicketCategory
- `agencyId`: Filter by tenant
- `assignedAgentId`: Filter by assigned owner
- `tboh`: Search exact booking reference
- `search`: Full text search on ID, title, passenger, hotel, TBOH
- `isEscalated`: boolean
- `page`, `limit`: Pagination parameters

*Note: If the requesting user has role `agency`, results are strictly filtered to their `agencyId`.*

### `POST /api/tickets`
Creates a context-rich travel ticket. Auto-evaluates Smart Routing Rules, Travel-Aware SLA targets, and detects matching TBOH for bidirectional context linking.

### `GET /api/tickets/:id`
Retrieves ticket detail. Returns 404 if agency attempts to access another tenant's ticket.

### `PATCH /api/tickets/:id`
Updates ticket status, priority, assignment, or resolution summary. Emits timeline event.

---

## Context Linking

### `POST /api/tickets/:id/link`
Body: `{ "targetTicketId": string, "linkType": string, "notes": string }`
Creates bidirectional context link between tickets sharing booking references.

### `POST /api/tickets/:id/unlink`
Body: `{ "targetTicketId": string }`
Removes context link with audit log event.

---

## Escalation

### `POST /api/tickets/:id/escalate`
Body: `{ "reason": string }`
Escalates ticket to the Escalation Manager queue, marks status as `Escalated`, priority as `Urgent`, and transfers ownership.

---

## Communications

### `GET /api/tickets/:id/conversations`
Returns:
- `publicMessages`: Visible to agency and agents.
- `internalNotes`: Strictly hidden from agency users.
- `sideConversations`: Supplier email threads with preserved recipients. Strictly hidden from agency users.

### `POST /api/tickets/:id/conversations`
Body: `{ "title": string, "supplierName": string, "recipients": array, "initialMessage": string }`
Initiates a new supplier side conversation.

### `POST /api/tickets/:id/messages`
Body: `{ "conversationId": string, "content": string, "recipientType": "agency_public" | "internal_agent_only" | "supplier_side" }`
Sends message on public, internal, or supplier thread.

---

## Operational Intelligence & AI

### `GET /api/insights/summary`
Returns operational KPIs, category distributions, agent workloads, and recurring complaint themes.

### `POST /api/ai/classify-intent`
Uses Gemini 3.8 Flash (with deterministic fallback) to classify category and intent.

### `POST /api/ai/summarize-ticket`
Generates an executive case summary.

### `POST /api/ai/suggest-reply`
Suggests contextual response draft for agency or supplier.

### `GET /api/export/tickets`
Downloads full CSV export of tickets and booking context.
