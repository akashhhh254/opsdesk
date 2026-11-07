import {
  User,
  Agency,
  Ticket,
  TicketLink,
  TicketEvent,
  SideConversation,
  Message,
  RoutingRule,
  SlaPolicy,
  AuditLog,
  OperationalMetrics,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  Region,
} from '../types/index.ts';

class ApiService {
  private currentUserId: string = 'usr_rahul'; // Default active user

  setCurrentUserId(id: string) {
    this.currentUserId = id;
  }

  getCurrentUserId(): string {
    return this.currentUserId;
  }

  private async fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      'x-user-id': this.currentUserId,
      ...(options.headers || {}),
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Request failed with status ${res.status}`);
    }
    return res.json();
  }

  // --- Auth & Users ---
  async getMe(): Promise<{ user: User }> {
    return this.fetchJson<{ user: User }>('/api/auth/me');
  }

  async getUsers(): Promise<{ users: User[] }> {
    return this.fetchJson<{ users: User[] }>('/api/auth/users');
  }

  async getAgencies(): Promise<{ agencies: Agency[] }> {
    return this.fetchJson<{ agencies: Agency[] }>('/api/agencies');
  }

  // --- Tickets ---
  async getTickets(params: {
    status?: TicketStatus;
    priority?: TicketPriority;
    region?: Region;
    category?: TicketCategory;
    agencyId?: string;
    assignedAgentId?: string;
    tboh?: string;
    search?: string;
    isEscalated?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{ tickets: Ticket[]; total: number; page: number; totalPages: number }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    return this.fetchJson(`/api/tickets?${query.toString()}`);
  }

  async getTicketById(id: string): Promise<{ ticket: Ticket }> {
    return this.fetchJson<{ ticket: Ticket }>(`/api/tickets/${id}`);
  }

  async createTicket(payload: {
    title: string;
    description: string;
    tboh: string;
    agencyId?: string;
    category?: TicketCategory;
    intent?: string;
    priority?: TicketPriority;
    region?: Region;
    bookingContext?: Ticket['bookingContext'];
  }): Promise<{ ticket: Ticket }> {
    return this.fetchJson<{ ticket: Ticket }>('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<{ ticket: Ticket }> {
    return this.fetchJson<{ ticket: Ticket }>(`/api/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // --- Linking & Escalation ---
  async linkTickets(
    sourceTicketId: string,
    targetTicketId: string,
    linkType: TicketLink['linkType'],
    notes: string
  ): Promise<{ link: TicketLink }> {
    return this.fetchJson<{ link: TicketLink }>(`/api/tickets/${sourceTicketId}/link`, {
      method: 'POST',
      body: JSON.stringify({ targetTicketId, linkType, notes }),
    });
  }

  async unlinkTickets(sourceTicketId: string, targetTicketId: string): Promise<{ success: boolean }> {
    return this.fetchJson<{ success: boolean }>(`/api/tickets/${sourceTicketId}/unlink`, {
      method: 'POST',
      body: JSON.stringify({ targetTicketId }),
    });
  }

  async escalateTicket(ticketId: string, reason: string): Promise<{ ticket: Ticket }> {
    return this.fetchJson<{ ticket: Ticket }>(`/api/tickets/${ticketId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // --- Conversations & Messages ---
  async getConversations(ticketId: string): Promise<{
    publicMessages: Message[];
    internalNotes: Message[];
    sideConversations: (SideConversation & { messages: Message[] })[];
  }> {
    return this.fetchJson(`/api/tickets/${ticketId}/conversations`);
  }

  async createSideConversation(
    ticketId: string,
    payload: {
      title: string;
      supplierName: string;
      recipients: SideConversation['recipients'];
      initialMessage: string;
    }
  ): Promise<{ conversation: SideConversation }> {
    return this.fetchJson(`/api/tickets/${ticketId}/conversations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async sendMessage(
    ticketId: string,
    payload: {
      conversationId: string;
      content: string;
      recipientType: Message['recipientType'];
    }
  ): Promise<{ message: Message }> {
    return this.fetchJson(`/api/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getTicketEvents(ticketId: string): Promise<{ events: TicketEvent[] }> {
    return this.fetchJson(`/api/tickets/${ticketId}/events`);
  }

  // --- SLA Queue ---
  async getSlaQueue(): Promise<{
    atRisk: Ticket[];
    breached: Ticket[];
    urgentCheckIn: Ticket[];
  }> {
    return this.fetchJson('/api/sla/queue');
  }

  // --- Insights ---
  async getInsights(): Promise<{ metrics: OperationalMetrics }> {
    return this.fetchJson('/api/insights/summary');
  }

  // --- Admin ---
  async getRoutingRules(): Promise<{ rules: RoutingRule[] }> {
    return this.fetchJson('/api/admin/routing-rules');
  }

  async saveRoutingRule(rule: RoutingRule): Promise<{ rule: RoutingRule }> {
    return this.fetchJson('/api/admin/routing-rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  }

  async deleteRoutingRule(id: string): Promise<{ success: boolean }> {
    return this.fetchJson(`/api/admin/routing-rules/${id}`, {
      method: 'DELETE',
    });
  }

  async getSlaPolicies(): Promise<{ policies: SlaPolicy[] }> {
    return this.fetchJson('/api/admin/sla-policies');
  }

  async saveSlaPolicy(policy: SlaPolicy): Promise<{ policy: SlaPolicy }> {
    return this.fetchJson('/api/admin/sla-policies', {
      method: 'POST',
      body: JSON.stringify(policy),
    });
  }

  async getAuditLogs(): Promise<{ logs: AuditLog[] }> {
    return this.fetchJson('/api/admin/audit-logs');
  }

  async resetDatabase(): Promise<{ success: boolean; message: string }> {
    return this.fetchJson('/api/admin/reset-db', { method: 'POST' });
  }

  // --- AI Operations ---
  async classifyIntent(
    title: string,
    description: string,
    checkInDate?: string
  ): Promise<{ classification: any }> {
    return this.fetchJson('/api/ai/classify-intent', {
      method: 'POST',
      body: JSON.stringify({ title, description, checkInDate }),
    });
  }

  async summarizeTicket(ticketId: string): Promise<{ summary: string }> {
    return this.fetchJson('/api/ai/summarize-ticket', {
      method: 'POST',
      body: JSON.stringify({ ticketId }),
    });
  }

  async suggestReply(
    ticketId: string,
    targetAudience: 'Agency' | 'Supplier'
  ): Promise<{ draft: string }> {
    return this.fetchJson('/api/ai/suggest-reply', {
      method: 'POST',
      body: JSON.stringify({ ticketId, targetAudience }),
    });
  }
}

export const api = new ApiService();
