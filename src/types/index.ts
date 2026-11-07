export type UserRole = 'agency' | 'agent' | 'escalation_manager' | 'admin';

export type TicketStatus = 'New' | 'Open' | 'In Progress' | 'Pending' | 'Escalated' | 'Resolved' | 'Closed';

export type TicketPriority = 'Urgent' | 'High' | 'Medium' | 'Low';

export type TicketCategory =
  | 'Refund Delay'
  | 'Booking Failure'
  | 'Hotel Confirmation'
  | 'Flight Ticket Issue'
  | 'Cancellation'
  | 'Supplier Response Delay'
  | 'Inventory Synchronization'
  | 'Special Request';

export type Region = 'APAC' | 'EMEA' | 'Americas' | 'Global';

export type SlaStatus = 'On Track' | 'At Risk' | 'Breached';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  agencyId?: string; // Set if role === 'agency'
  region?: Region;
  specialization?: string[];
  activeTicketsCount?: number;
  avatarUrl?: string;
}

export interface Agency {
  id: string;
  name: string;
  code: string; // e.g. TBO-AG-9821
  country: string;
  region: Region;
  tier: 'Platinum' | 'Gold' | 'Silver';
  contactEmail: string;
  contactPhone: string;
}

export interface BookingContext {
  tboh: string; // TBO Hotel/Booking reference e.g. TBOH-984210
  serviceType: 'Hotel' | 'Flight' | 'Package' | 'Transfer';
  destination: string;
  hotelOrFlightName: string;
  supplierName: string; // e.g. Hotelbeds, Expedia Partner, British Airways
  supplierReference: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate?: string; // YYYY-MM-DD
  lcd: string; // Last Cancellation Date YYYY-MM-DD HH:mm
  passengerName: string;
  paxCount: number;
  bookingAmount: number;
  currency: string;
}

export interface Ticket {
  id: string; // e.g. OPS-1042
  title: string;
  description: string;
  agencyId: string;
  agencyName: string;
  tboh: string;
  bookingContext: BookingContext;
  category: TicketCategory;
  intent: string;
  intentConfidence?: number;
  classificationMethod: 'Rule-Based' | 'AI-Assisted' | 'Agent-Assigned';
  priority: TicketPriority;
  region: Region;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedAt?: string;
  routingReason?: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolutionSummary?: string;
  
  // SLA metrics
  slaDeadline: string; // ISO string
  slaStatus: SlaStatus;
  slaBreachTime?: string;
  slaRemainingMinutes: number;
  slaTargetHours: number;
  
  // Escalation
  isEscalated: boolean;
  escalationId?: string;
  escalationReason?: string;
  escalatedAt?: string;
  escalatedBy?: string;
  managerNotes?: string;

  // Metadata
  linkedTicketIds: string[];
}

export interface TicketLink {
  id: string;
  sourceTicketId: string;
  targetTicketId: string;
  tboh: string;
  linkType: 'Same Booking' | 'Repeat Complaint' | 'Related Passenger' | 'Manual Link';
  linkedBy: string;
  linkedAt: string;
  notes?: string;
}

export interface TicketEvent {
  id: string;
  ticketId: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole | 'System';
  eventType:
    | 'CREATED'
    | 'STATUS_CHANGED'
    | 'ASSIGNED'
    | 'REASSIGNED'
    | 'PRIORITY_CHANGED'
    | 'ESCALATED'
    | 'RESOLVED'
    | 'NOTE_ADDED'
    | 'REPLY_SENT'
    | 'SIDE_CONVERSATION_STARTED'
    | 'TICKET_LINKED'
    | 'TICKET_UNLINKED'
    | 'SLA_BREACHED';
  description: string;
  details?: Record<string, any>;
}

export interface ConversationRecipient {
  email: string;
  name: string;
  type: 'supplier' | 'agency' | 'internal' | 'third_party';
}

export interface Message {
  id: string;
  conversationId: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole | 'Supplier' | 'System';
  recipientType: 'agency_public' | 'internal_agent_only' | 'supplier_side';
  content: string;
  timestamp: string;
  attachments?: string[];
  externalReference?: string; // Supplier email thread id
}

export interface SideConversation {
  id: string;
  ticketId: string;
  title: string;
  supplierName: string;
  recipients: ConversationRecipient[];
  status: 'Open' | 'Waiting on Supplier' | 'Replied' | 'Closed';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  messages: Message[];
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: {
    region?: Region[];
    category?: TicketCategory[];
    priority?: TicketPriority[];
    hoursToCheckInLessThan?: number;
  };
  targetAgentId?: string;
  targetRole?: UserRole;
  ruleExplanation: string;
  active: boolean;
}

export interface SlaPolicy {
  id: string;
  name: string;
  priority: TicketPriority;
  targetResolutionHours: number;
  warningThresholdMinutes: number; // When it shifts to 'At Risk'
  checkInProximityMultiplier: number; // E.g., <24h cuts SLA time by half
  active: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
}

export interface OperationalMetrics {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  atRiskTickets: number;
  breachedTickets: number;
  escalatedTickets: number;
  averageResolutionTimeHours: number;
  firstResponseTimeMinutes: number;
  ticketsByRegion: { region: string; count: number }[];
  ticketsByIntent: { intent: string; count: number }[];
  ticketsByCategory: { category: string; count: number }[];
  agentWorkloads: { agentId: string; agentName: string; activeTickets: number; resolvedToday: number }[];
  topRecurringThemes: { theme: string; count: number; impact: 'High' | 'Medium' | 'Low'; trend: string }[];
}
