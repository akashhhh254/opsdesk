import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db.ts';
import {
  classifyTicketIntent,
  generateTicketSummary,
  suggestResponseDraft,
} from './src/server/aiService.ts';
import { User, UserRole, TicketCategory, TicketPriority, Region } from './src/types/index.ts';

dotenv.config();

const app = express();
app.use(express.json());

// Helper to authenticate user from header or fallback to demo user
function getAuthenticatedUser(req: Request): User {
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    const user = db.getUser(userId);
    if (user) return user;
  }
  // Fallback default: Tariq (Agency) or Rahul (Agent)
  return db.getUsers()[0];
}

// ----------------- AUTH & USERS -----------------
app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  res.json({ user });
});

app.get('/api/auth/users', (_req: Request, res: Response) => {
  const users = db.getUsers();
  res.json({ users });
});

app.get('/api/agencies', (_req: Request, res: Response) => {
  const agencies = db.getAgencies();
  res.json({ agencies });
});

// ----------------- TICKETS -----------------
app.get('/api/tickets', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const {
    status,
    priority,
    region,
    category,
    agencyId,
    assignedAgentId,
    tboh,
    search,
    isEscalated,
    page,
    limit,
  } = req.query;

  const result = db.getTickets({
    requestingUser: user,
    status: status as any,
    priority: priority as any,
    region: region as any,
    category: category as any,
    agencyId: agencyId as string,
    assignedAgentId: assignedAgentId as string,
    tboh: tboh as string,
    search: search as string,
    isEscalated: isEscalated !== undefined ? isEscalated === 'true' : undefined,
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 25,
  });

  res.json(result);
});

app.get('/api/tickets/:id', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const ticket = db.getTicketById(req.params.id, user);

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found or unauthorized access' });
    return;
  }

  res.json({ ticket });
});

app.post('/api/tickets', async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const {
    title,
    description,
    tboh,
    agencyId,
    category,
    intent,
    priority,
    region,
    classificationMethod,
    bookingContext,
  } = req.body;

  if (!title || !description || !tboh) {
    res.status(400).json({ error: 'Title, description, and TBOH are required.' });
    return;
  }

  // If agency user, force agencyId to match their own agency
  const effectiveAgencyId = user.role === 'agency' && user.agencyId ? user.agencyId : (agencyId || 'ag_skyline');

  // If intent or category not specified, run intent classification
  let finalCategory = category as TicketCategory;
  let finalIntent = intent;
  let finalMethod = classificationMethod || 'Rule-Based';

  if (!finalCategory || !finalIntent) {
    const aiResult = await classifyTicketIntent(
      title,
      description,
      bookingContext?.checkInDate
    );
    finalCategory = finalCategory || aiResult.category;
    finalIntent = finalIntent || aiResult.intent;
    finalMethod = aiResult.method;
  }

  const effectiveBookingContext = bookingContext || {
    tboh: tboh.toUpperCase(),
    serviceType: 'Hotel',
    destination: 'Dubai, UAE',
    hotelOrFlightName: 'Standard Property',
    supplierName: 'Hotelbeds',
    supplierReference: `HB-${Date.now().toString().slice(-6)}`,
    checkInDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
    lcd: new Date().toISOString(),
    passengerName: 'Valued Guest',
    paxCount: 2,
    bookingAmount: 1200,
    currency: 'USD',
  };

  const newTicket = db.createTicket(
    {
      title,
      description,
      tboh,
      agencyId: effectiveAgencyId,
      category: finalCategory,
      intent: finalIntent,
      priority: priority || 'Medium',
      region: (region as Region) || 'EMEA',
      classificationMethod: finalMethod,
      bookingContext: effectiveBookingContext,
    },
    user
  );

  res.status(201).json({ ticket: newTicket });
});

app.patch('/api/tickets/:id', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const updated = db.updateTicket(req.params.id, req.body, user);

  if (!updated) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  res.json({ ticket: updated });
});

// ----------------- TICKET LINKING -----------------
app.post('/api/tickets/:id/link', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { targetTicketId, linkType, notes } = req.body;

  if (!targetTicketId) {
    res.status(400).json({ error: 'targetTicketId is required' });
    return;
  }

  const link = db.linkTickets(
    req.params.id,
    targetTicketId,
    linkType || 'Same Booking',
    notes || 'Context linking',
    user
  );

  if (!link) {
    res.status(404).json({ error: 'Could not link tickets. Check IDs.' });
    return;
  }

  res.json({ link });
});

app.post('/api/tickets/:id/unlink', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { targetTicketId } = req.body;

  const success = db.unlinkTickets(req.params.id, targetTicketId, user);
  if (!success) {
    res.status(404).json({ error: 'Could not unlink tickets.' });
    return;
  }

  res.json({ success: true });
});

// ----------------- ESCALATION -----------------
app.post('/api/tickets/:id/escalate', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { reason } = req.body;

  if (!reason) {
    res.status(400).json({ error: 'Escalation reason is required' });
    return;
  }

  const escalated = db.escalateTicket(req.params.id, reason, user);
  if (!escalated) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  res.json({ ticket: escalated });
});

// ----------------- CONVERSATIONS & MESSAGES -----------------
app.get('/api/tickets/:id/conversations', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const convs = db.getTicketConversations(req.params.id, user);
  res.json(convs);
});

app.post('/api/tickets/:id/conversations', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (user.role === 'agency') {
    res.status(403).json({ error: 'Agency users cannot initiate supplier side conversations.' });
    return;
  }

  const { title, supplierName, recipients, initialMessage } = req.body;
  if (!title || !supplierName || !recipients || !initialMessage) {
    res.status(400).json({ error: 'Missing side conversation required fields.' });
    return;
  }

  const conversation = db.createSideConversation(
    req.params.id,
    title,
    supplierName,
    recipients,
    initialMessage,
    user
  );

  res.status(201).json({ conversation });
});

app.post('/api/tickets/:id/messages', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { conversationId, content, recipientType } = req.body;

  if (!content) {
    res.status(400).json({ error: 'Message content is required.' });
    return;
  }

  // Agency users can ONLY send 'agency_public' messages
  let effRecipientType = recipientType || 'agency_public';
  if (user.role === 'agency') {
    effRecipientType = 'agency_public';
  }

  const message = db.addMessage(
    req.params.id,
    conversationId || 'main',
    content,
    effRecipientType,
    user
  );

  res.status(201).json({ message });
});

// ----------------- TIMELINE EVENTS -----------------
app.get('/api/tickets/:id/events', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const events = db.getTicketEvents(req.params.id, user);
  res.json({ events });
});

// ----------------- SLA & ESCALATION QUEUES -----------------
app.get('/api/sla/queue', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const allTickets = db.getTickets({ requestingUser: user, limit: 100 }).tickets;

  const atRisk = allTickets.filter((t) => t.slaStatus === 'At Risk');
  const breached = allTickets.filter((t) => t.slaStatus === 'Breached');
  const urgentCheckIn = allTickets.filter((t) => {
    if (!t.bookingContext?.checkInDate) return false;
    const hours = (new Date(t.bookingContext.checkInDate).getTime() - Date.now()) / (1000 * 60 * 60);
    return hours <= 24 && hours > 0;
  });

  res.json({ atRisk, breached, urgentCheckIn });
});

// ----------------- OPERATIONAL METRICS & INSIGHTS -----------------
app.get('/api/insights/summary', (_req: Request, res: Response) => {
  const metrics = db.getOperationalMetrics();
  res.json({ metrics });
});

// ----------------- ADMIN -----------------
app.get('/api/admin/routing-rules', (_req: Request, res: Response) => {
  const rules = db.getRoutingRules();
  res.json({ rules });
});

app.post('/api/admin/routing-rules', (req: Request, res: Response) => {
  const rule = db.saveRoutingRule(req.body);
  res.json({ rule });
});

app.delete('/api/admin/routing-rules/:id', (req: Request, res: Response) => {
  db.deleteRoutingRule(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/sla-policies', (_req: Request, res: Response) => {
  const policies = db.getSlaPolicies();
  res.json({ policies });
});

app.post('/api/admin/sla-policies', (req: Request, res: Response) => {
  const policy = db.saveSlaPolicy(req.body);
  res.json({ policy });
});

app.get('/api/admin/audit-logs', (_req: Request, res: Response) => {
  const logs = db.getAuditLogs();
  res.json({ logs });
});

app.post('/api/admin/reset-db', (_req: Request, res: Response) => {
  db.resetToSeed();
  res.json({ success: true, message: 'Database reset to seed data.' });
});

// ----------------- AI CAPABILITIES -----------------
app.post('/api/ai/classify-intent', async (req: Request, res: Response) => {
  const { title, description, checkInDate } = req.body;
  if (!title) {
    res.status(400).json({ error: 'Title is required for intent classification.' });
    return;
  }
  const result = await classifyTicketIntent(title, description || '', checkInDate);
  res.json({ classification: result });
});

app.post('/api/ai/summarize-ticket', async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { ticketId } = req.body;
  const ticket = db.getTicketById(ticketId, user);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found.' });
    return;
  }
  const summary = await generateTicketSummary(ticket);
  res.json({ summary });
});

app.post('/api/ai/suggest-reply', async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { ticketId, targetAudience } = req.body;
  const ticket = db.getTicketById(ticketId, user);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found.' });
    return;
  }
  const draft = await suggestResponseDraft(ticket, targetAudience || 'Agency');
  res.json({ draft });
});

// ----------------- CSV EXPORT -----------------
app.get('/api/export/tickets', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { tickets } = db.getTickets({ requestingUser: user, limit: 1000 });

  const headers = [
    'Ticket ID',
    'Title',
    'TBOH Ref',
    'Agency',
    'Passenger',
    'Hotel / Flight',
    'Supplier',
    'Category',
    'Priority',
    'Region',
    'Assigned Agent',
    'Status',
    'SLA Status',
    'SLA Remaining (min)',
    'Created At',
  ];

  const rows = tickets.map((t) => [
    t.id,
    `"${t.title.replace(/"/g, '""')}"`,
    t.tboh,
    `"${t.agencyName}"`,
    `"${t.bookingContext.passengerName}"`,
    `"${t.bookingContext.hotelOrFlightName}"`,
    `"${t.bookingContext.supplierName}"`,
    t.category,
    t.priority,
    t.region,
    `"${t.assignedAgentName || 'Unassigned'}"`,
    t.status,
    t.slaStatus,
    t.slaRemainingMinutes,
    t.createdAt,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="opsdesk-tickets.csv"');
  res.send(csv);
});

// ----------------- VITE MIDDLEWARE / STATIC FILES -----------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OpsDesk server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start OpsDesk server:', err);
  process.exit(1);
});
