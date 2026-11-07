import fs from 'fs';
import path from 'path';
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
import { evaluateTicketRouting } from './routingEngine.ts';
import { calculateTicketSla, DEFAULT_SLA_POLICIES } from './slaEngine.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'opsdesk-db.json');

export interface DatabaseSchema {
  users: User[];
  agencies: Agency[];
  tickets: Ticket[];
  ticketLinks: TicketLink[];
  events: TicketEvent[];
  conversations: SideConversation[];
  messages: Message[];
  routingRules: RoutingRule[];
  slaPolicies: SlaPolicy[];
  auditLogs: AuditLog[];
}

// Initial realistic synthetic seed data
function getInitialSeedData(): DatabaseSchema {
  const now = new Date();
  const isoNow = now.toISOString();
  
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const threeDaysLater = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString().split('T')[0];
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const users: User[] = [
    {
      id: 'usr_tariq',
      name: 'Tariq Al-Mansoor',
      email: 'tariq@skylinetravel.ae',
      role: 'agency',
      agencyId: 'ag_skyline',
    },
    {
      id: 'usr_emma',
      name: 'Emma Watson',
      email: 'emma@wanderlustholidays.co.uk',
      role: 'agency',
      agencyId: 'ag_wanderlust',
    },
    {
      id: 'usr_rajesh',
      name: 'Rajesh Patel',
      email: 'rajesh@apexvoyages.in',
      role: 'agency',
      agencyId: 'ag_apex',
    },
    {
      id: 'usr_rahul',
      name: 'Rahul Sharma',
      email: 'rahul.s@tbo.com',
      role: 'agent',
      region: 'EMEA',
      specialization: ['Hotel Confirmation', 'Refund Delay', 'Urgent Triage', 'Hotel'],
      activeTicketsCount: 3,
    },
    {
      id: 'usr_sarah',
      name: 'Sarah Jenkins',
      email: 'sarah.j@tbo.com',
      role: 'agent',
      region: 'Americas',
      specialization: ['Booking Failure', 'Cancellation', 'Hotel'],
      activeTicketsCount: 2,
    },
    {
      id: 'usr_arjun',
      name: 'Arjun Nair',
      email: 'arjun.n@tbo.com',
      role: 'agent',
      region: 'APAC',
      specialization: ['Flight Ticket Issue', 'Inventory Synchronization', 'Flight'],
      activeTicketsCount: 2,
    },
    {
      id: 'usr_elena',
      name: 'Elena Rostova',
      email: 'elena.r@tbo.com',
      role: 'escalation_manager',
      region: 'Global',
    },
    {
      id: 'usr_vikram',
      name: 'Vikram Malhotra',
      email: 'vikram.m@tbo.com',
      role: 'admin',
      region: 'Global',
    },
  ];

  const agencies: Agency[] = [
    {
      id: 'ag_skyline',
      name: 'Skyline Travel Dubai',
      code: 'TBO-DXB-981',
      country: 'United Arab Emirates',
      region: 'EMEA',
      tier: 'Platinum',
      contactEmail: 'ops@skylinetravel.ae',
      contactPhone: '+971 4 382 9900',
    },
    {
      id: 'ag_wanderlust',
      name: 'Wanderlust Holidays London',
      code: 'TBO-LON-412',
      country: 'United Kingdom',
      region: 'EMEA',
      tier: 'Gold',
      contactEmail: 'bookings@wanderlustholidays.co.uk',
      contactPhone: '+44 20 7946 0912',
    },
    {
      id: 'ag_apex',
      name: 'Apex Voyages Mumbai',
      code: 'TBO-BOM-773',
      country: 'India',
      region: 'APAC',
      tier: 'Platinum',
      contactEmail: 'support@apexvoyages.in',
      contactPhone: '+91 22 2650 4400',
    },
  ];

  const routingRules: RoutingRule[] = [
    {
      id: 'rule_urgent_triage',
      name: 'Emergency Check-in Triage (<24h)',
      priority: 1,
      conditions: {
        priority: ['Urgent'],
        hoursToCheckInLessThan: 24,
      },
      targetAgentId: 'usr_rahul',
      ruleExplanation: 'High-risk passenger arrival within 24h routed directly to Senior Triage Specialist Rahul Sharma.',
      active: true,
    },
    {
      id: 'rule_apac_air',
      name: 'APAC Flight & GDS Specialist',
      priority: 2,
      conditions: {
        region: ['APAC'],
        category: ['Flight Ticket Issue', 'Inventory Synchronization'],
      },
      targetAgentId: 'usr_arjun',
      ruleExplanation: 'APAC airline ticketing & inventory sync cases assigned to Arjun Nair.',
      active: true,
    },
    {
      id: 'rule_americas_hotels',
      name: 'Americas Operations Desk',
      priority: 3,
      conditions: {
        region: ['Americas'],
      },
      targetAgentId: 'usr_sarah',
      ruleExplanation: 'Americas time zone and supplier partner cases assigned to Sarah Jenkins.',
      active: true,
    },
  ];

  const slaPolicies: SlaPolicy[] = [...DEFAULT_SLA_POLICIES];

  // Initial Tickets
  const tickets: Ticket[] = [
    {
      id: 'OPS-1001',
      title: 'Atlantis The Palm: Front desk reports reservation unconfirmed in PMS',
      description: 'Guest Mr. David Miller arrived at Atlantis The Palm Dubai for check-in. Front desk supervisor states that despite our voucher TBOH-984210, their Opera PMS shows no active reservation from Hotelbeds bedbank. Guest is standing at front lobby with family.',
      agencyId: 'ag_skyline',
      agencyName: 'Skyline Travel Dubai',
      tboh: 'TBOH-984210',
      bookingContext: {
        tboh: 'TBOH-984210',
        serviceType: 'Hotel',
        destination: 'Dubai, UAE',
        hotelOrFlightName: 'Atlantis, The Palm',
        supplierName: 'Hotelbeds',
        supplierReference: 'HB-DXB-984210-A',
        checkInDate: tomorrow,
        checkOutDate: nextWeek,
        lcd: isoNow,
        passengerName: 'David Miller',
        paxCount: 3,
        bookingAmount: 3450,
        currency: 'USD',
      },
      category: 'Hotel Confirmation',
      intent: 'Hotel check-in rejection / PMS sync failure',
      classificationMethod: 'AI-Assisted',
      priority: 'Urgent',
      region: 'EMEA',
      assignedAgentId: 'usr_rahul',
      assignedAgentName: 'Rahul Sharma',
      assignedAt: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
      routingReason: 'Assigned via Rule "Emergency Check-in Triage (<24h)": High-risk passenger arrival within 24h routed directly to Senior Triage Specialist Rahul Sharma.',
      status: 'Open',
      createdAt: new Date(now.getTime() - 50 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      slaDeadline: new Date(now.getTime() + 70 * 60 * 1000).toISOString(),
      slaStatus: 'At Risk',
      slaRemainingMinutes: 70,
      slaTargetHours: 2,
      isEscalated: false,
      linkedTicketIds: ['OPS-1004'],
    },
    {
      id: 'OPS-1002',
      title: 'Hilton London Bankside: Medical emergency cancellation fee waiver requested',
      description: 'Passenger Ms. Sophie Bennett was hospitalized today with acute pneumonia. Agency requests full cancellation penalty waiver as check-in is tomorrow. Medical hospital admission certificate attached. Need urgent supplier exception before LCD passes.',
      agencyId: 'ag_wanderlust',
      agencyName: 'Wanderlust Holidays London',
      tboh: 'TBOH-552190',
      bookingContext: {
        tboh: 'TBOH-552190',
        serviceType: 'Hotel',
        destination: 'London, UK',
        hotelOrFlightName: 'Hilton London Bankside',
        supplierName: 'Expedia Partner Solutions',
        supplierReference: 'EXP-LON-77412',
        checkInDate: tomorrow,
        lcd: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        passengerName: 'Sophie Bennett',
        paxCount: 1,
        bookingAmount: 1120,
        currency: 'GBP',
      },
      category: 'Cancellation',
      intent: 'Urgent compassionate cancellation waiver before LCD',
      classificationMethod: 'Rule-Based',
      priority: 'Urgent',
      region: 'EMEA',
      assignedAgentId: 'usr_rahul',
      assignedAgentName: 'Rahul Sharma',
      assignedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      routingReason: 'Assigned via Rule "Emergency Check-in Triage (<24h)": Imminent LCD deadline.',
      status: 'Pending',
      createdAt: new Date(now.getTime() - 35 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
      slaDeadline: new Date(now.getTime() + 25 * 60 * 1000).toISOString(),
      slaStatus: 'At Risk',
      slaRemainingMinutes: 25,
      slaTargetHours: 1.5,
      isEscalated: false,
      linkedTicketIds: [],
    },
    {
      id: 'OPS-1003',
      title: 'Singapore Airlines SQ421: E-ticket status suspended on GDS',
      description: 'Agency client booked BOM-SIN on SQ421. TBO backoffice generated PNR 8V9LK2, but Singapore Airlines ticketing robot flagged ticket status as Suspended due to fare-basis tax discrepancy. Passenger departs in 3 days.',
      agencyId: 'ag_apex',
      agencyName: 'Apex Voyages Mumbai',
      tboh: 'TBOH-331048',
      bookingContext: {
        tboh: 'TBOH-331048',
        serviceType: 'Flight',
        destination: 'Singapore',
        hotelOrFlightName: 'Singapore Airlines (Flight SQ421)',
        supplierName: 'Amadeus GDS / Singapore Airlines',
        supplierReference: '1A-PNR-8V9LK2',
        checkInDate: threeDaysLater,
        lcd: threeDaysLater,
        passengerName: 'Amit Mehra',
        paxCount: 2,
        bookingAmount: 1450,
        currency: 'USD',
      },
      category: 'Flight Ticket Issue',
      intent: 'GDS e-ticket coupon reissue & tax adjustment',
      classificationMethod: 'AI-Assisted',
      priority: 'High',
      region: 'APAC',
      assignedAgentId: 'usr_arjun',
      assignedAgentName: 'Arjun Nair',
      assignedAt: new Date(now.getTime() - 120 * 60 * 1000).toISOString(),
      routingReason: 'Assigned via Rule "APAC Flight & GDS Specialist": Category Flight Ticket Issue in APAC.',
      status: 'Open',
      createdAt: new Date(now.getTime() - 130 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 40 * 60 * 1000).toISOString(),
      slaDeadline: new Date(now.getTime() + 230 * 60 * 1000).toISOString(),
      slaStatus: 'On Track',
      slaRemainingMinutes: 230,
      slaTargetHours: 6,
      isEscalated: false,
      linkedTicketIds: [],
    },
    {
      id: 'OPS-1004',
      title: 'Atlantis The Palm: Supplier charged rate supplement of AED 450 without notice',
      description: 'Related to booking TBOH-984210. Agency observed an unnotified rate supplement debit on their agency ledger 4 days ago. Hotelbeds charged a resort fee differential that was contracted as inclusive.',
      agencyId: 'ag_skyline',
      agencyName: 'Skyline Travel Dubai',
      tboh: 'TBOH-984210',
      bookingContext: {
        tboh: 'TBOH-984210',
        serviceType: 'Hotel',
        destination: 'Dubai, UAE',
        hotelOrFlightName: 'Atlantis, The Palm',
        supplierName: 'Hotelbeds',
        supplierReference: 'HB-DXB-984210-A',
        checkInDate: tomorrow,
        lcd: isoNow,
        passengerName: 'David Miller',
        paxCount: 3,
        bookingAmount: 3450,
        currency: 'USD',
      },
      category: 'Refund Delay',
      intent: 'Disputed rate supplement refund reconciliation',
      classificationMethod: 'Rule-Based',
      priority: 'Medium',
      region: 'EMEA',
      assignedAgentId: 'usr_rahul',
      assignedAgentName: 'Rahul Sharma',
      assignedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      routingReason: 'Assigned to EMEA hotel specialist.',
      status: 'Resolved',
      createdAt: new Date(now.getTime() - 50 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
      resolutionSummary: 'Hotelbeds accepted error in rate cache. Credit note CN-9941 issued for AED 450 back to Skyline Travel agency wallet balance.',
      slaDeadline: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(),
      slaStatus: 'On Track',
      slaRemainingMinutes: 360,
      slaTargetHours: 24,
      isEscalated: false,
      linkedTicketIds: ['OPS-1001'],
    },
    {
      id: 'OPS-1005',
      title: 'Bellagio Las Vegas: Corporate conference block refund delayed by 18 days',
      description: 'Agency cancelled 6 deluxe rooms 18 days ago strictly before the LCD deadline. The supplier WebBeds confirmed the cancellation, but the refund credit of $4,890 has not hit the agency settlement account. Multiple supplier reminders ignored.',
      agencyId: 'ag_wanderlust',
      agencyName: 'Wanderlust Holidays London',
      tboh: 'TBOH-781442',
      bookingContext: {
        tboh: 'TBOH-781442',
        serviceType: 'Hotel',
        destination: 'Las Vegas, USA',
        hotelOrFlightName: 'Bellagio Resort & Casino',
        supplierName: 'WebBeds',
        supplierReference: 'WB-LAS-772184',
        checkInDate: nextWeek,
        lcd: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        passengerName: 'Michael Clarke (Corporate Group)',
        paxCount: 12,
        bookingAmount: 4890,
        currency: 'USD',
      },
      category: 'Refund Delay',
      intent: 'Severe supplier settlement delay exceeding 14-day SLA',
      classificationMethod: 'AI-Assisted',
      priority: 'Urgent',
      region: 'Americas',
      assignedAgentId: 'usr_elena',
      assignedAgentName: 'Elena Rostova',
      assignedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      routingReason: 'Escalated to Global Escalation Lead due to critical financial dispute and SLA breach.',
      status: 'Escalated',
      createdAt: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
      slaDeadline: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      slaStatus: 'Breached',
      slaBreachTime: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      slaRemainingMinutes: -720,
      slaTargetHours: 24,
      isEscalated: true,
      escalationId: 'esc_1005',
      escalationReason: 'SLA Breached (>24h target). Supplier WebBeds unresponsive on $4,890 agency refund block.',
      escalatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      escalatedBy: 'Sarah Jenkins',
      managerNotes: 'Elena Rostova engaged WebBeds VP of Distribution directly via emergency escalation hotline.',
      linkedTicketIds: [],
    },
    {
      id: 'OPS-1006',
      title: 'Marriott Marquis Bangkok: Inventory mismatch - room downgraded to Superior Twin',
      description: 'Guest Mrs. Priya Sharma paid for an Executive Suite with lounge access. Hotel check-in staff stated that TBO sent a Superior Twin XML mapping. Guest was forced to accept a lower room category.',
      agencyId: 'ag_apex',
      agencyName: 'Apex Voyages Mumbai',
      tboh: 'TBOH-662910',
      bookingContext: {
        tboh: 'TBOH-662910',
        serviceType: 'Hotel',
        destination: 'Bangkok, Thailand',
        hotelOrFlightName: 'Bangkok Marriott Marquis Queen\'s Park',
        supplierName: 'Agoda Partner Network',
        supplierReference: 'AG-BKK-662910',
        checkInDate: tomorrow,
        lcd: isoNow,
        passengerName: 'Priya Sharma',
        paxCount: 2,
        bookingAmount: 1840,
        currency: 'USD',
      },
      category: 'Inventory Synchronization',
      intent: 'XML room category mapping discrepancy / involuntary downgrade',
      classificationMethod: 'AI-Assisted',
      priority: 'High',
      region: 'APAC',
      assignedAgentId: 'usr_arjun',
      assignedAgentName: 'Arjun Nair',
      assignedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      routingReason: 'Assigned via Rule "APAC Flight & GDS Specialist": Category Inventory Synchronization.',
      status: 'Open',
      createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      slaDeadline: new Date(now.getTime() + 180 * 60 * 1000).toISOString(),
      slaStatus: 'On Track',
      slaRemainingMinutes: 180,
      slaTargetHours: 6,
      isEscalated: false,
      linkedTicketIds: [],
    },
    {
      id: 'OPS-1007',
      title: 'InterContinental Paris Le Grand: Honeymoon amenity pack & early check-in',
      description: 'VIP clients Alexander & Marie Koch arriving on their honeymoon. Agency requests confirmation of complimentary Eiffel Tower view upgrade and bottle of champagne as per contracted consortium amenities.',
      agencyId: 'ag_skyline',
      agencyName: 'Skyline Travel Dubai',
      tboh: 'TBOH-119842',
      bookingContext: {
        tboh: 'TBOH-119842',
        serviceType: 'Hotel',
        destination: 'Paris, France',
        hotelOrFlightName: 'InterContinental Paris Le Grand',
        supplierName: 'Hotelbeds',
        supplierReference: 'HB-PAR-119842',
        checkInDate: nextWeek,
        lcd: threeDaysLater,
        passengerName: 'Alexander Koch',
        paxCount: 2,
        bookingAmount: 2800,
        currency: 'EUR',
      },
      category: 'Special Request',
      intent: 'VIP consortium amenity and view upgrade request',
      classificationMethod: 'Rule-Based',
      priority: 'Low',
      region: 'EMEA',
      assignedAgentId: 'usr_sarah',
      assignedAgentName: 'Sarah Jenkins',
      assignedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      routingReason: 'Multi-signal algorithm matched Sarah Jenkins: low queue load.',
      status: 'Open',
      createdAt: new Date(now.getTime() - 9 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      slaDeadline: new Date(now.getTime() + 39 * 60 * 60 * 1000).toISOString(),
      slaStatus: 'On Track',
      slaRemainingMinutes: 2340,
      slaTargetHours: 48,
      isEscalated: false,
      linkedTicketIds: [],
    },
    {
      id: 'OPS-1008',
      title: 'Four Seasons Bali: Immediate booking failure during payment capture',
      description: 'Agency credit line was debited USD $3,200 during checkout, but XML response timed out with HTTP 504. Booking shows in Pending/Error state on TBO portal without supplier confirmation code.',
      agencyId: 'ag_wanderlust',
      agencyName: 'Wanderlust Holidays London',
      tboh: 'TBOH-993821',
      bookingContext: {
        tboh: 'TBOH-993821',
        serviceType: 'Hotel',
        destination: 'Bali, Indonesia',
        hotelOrFlightName: 'Four Seasons Resort Bali at Jimbaran Bay',
        supplierName: 'Hotelbeds',
        supplierReference: 'UNCONFIRMED-PENDING',
        checkInDate: threeDaysLater,
        lcd: threeDaysLater,
        passengerName: 'Arthur Pendelton',
        paxCount: 2,
        bookingAmount: 3200,
        currency: 'USD',
      },
      category: 'Booking Failure',
      intent: 'Payment captured but voucher generation timed out',
      classificationMethod: 'Rule-Based',
      priority: 'Urgent',
      region: 'APAC',
      assignedAgentId: '',
      assignedAgentName: 'Unassigned',
      routingReason: 'Awaiting triage: Unassigned high-urgency booking failure.',
      status: 'New',
      createdAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      slaDeadline: new Date(now.getTime() + 105 * 60 * 1000).toISOString(),
      slaStatus: 'On Track',
      slaRemainingMinutes: 105,
      slaTargetHours: 2,
      isEscalated: false,
      linkedTicketIds: [],
    },
  ];

  const ticketLinks: TicketLink[] = [
    {
      id: 'link_1001_1004',
      sourceTicketId: 'OPS-1001',
      targetTicketId: 'OPS-1004',
      tboh: 'TBOH-984210',
      linkType: 'Same Booking',
      linkedBy: 'Rahul Sharma',
      linkedAt: new Date(now.getTime() - 40 * 60 * 1000).toISOString(),
      notes: 'Both tickets refer to booking TBOH-984210 for David Miller at Atlantis The Palm. OPS-1004 was a previous rate discrepancy resolved 2 days ago.',
    },
  ];

  const events: TicketEvent[] = [
    {
      id: 'evt_1001_1',
      ticketId: 'OPS-1001',
      timestamp: new Date(now.getTime() - 50 * 60 * 1000).toISOString(),
      actorId: 'usr_tariq',
      actorName: 'Tariq Al-Mansoor',
      actorRole: 'agency',
      eventType: 'CREATED',
      description: 'Ticket created with booking reference TBOH-984210 for guest David Miller.',
    },
    {
      id: 'evt_1001_2',
      ticketId: 'OPS-1001',
      timestamp: new Date(now.getTime() - 48 * 60 * 1000).toISOString(),
      actorId: 'system',
      actorName: 'Routing Engine',
      actorRole: 'System',
      eventType: 'ASSIGNED',
      description: 'Assigned via Rule "Emergency Check-in Triage (<24h)" to Rahul Sharma.',
    },
    {
      id: 'evt_1001_3',
      ticketId: 'OPS-1001',
      timestamp: new Date(now.getTime() - 40 * 60 * 1000).toISOString(),
      actorId: 'usr_rahul',
      actorName: 'Rahul Sharma',
      actorRole: 'agent',
      eventType: 'TICKET_LINKED',
      description: 'Linked with existing ticket OPS-1004 sharing matching TBOH-984210.',
    },
    {
      id: 'evt_1001_4',
      ticketId: 'OPS-1001',
      timestamp: new Date(now.getTime() - 35 * 60 * 1000).toISOString(),
      actorId: 'usr_rahul',
      actorName: 'Rahul Sharma',
      actorRole: 'agent',
      eventType: 'SIDE_CONVERSATION_STARTED',
      description: 'Opened supplier side conversation with Hotelbeds & Atlantis Front Desk supervisor.',
    },
    {
      id: 'evt_1005_1',
      ticketId: 'OPS-1005',
      timestamp: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString(),
      actorId: 'usr_emma',
      actorName: 'Emma Watson',
      actorRole: 'agency',
      eventType: 'CREATED',
      description: 'Refund claim submitted for TBOH-781442 ($4,890).',
    },
    {
      id: 'evt_1005_2',
      ticketId: 'OPS-1005',
      timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      actorId: 'system',
      actorName: 'SLA Monitor',
      actorRole: 'System',
      eventType: 'SLA_BREACHED',
      description: 'Resolution target of 24 hours breached without supplier credit confirmation.',
    },
    {
      id: 'evt_1005_3',
      ticketId: 'OPS-1005',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      actorId: 'usr_sarah',
      actorName: 'Sarah Jenkins',
      actorRole: 'agent',
      eventType: 'ESCALATED',
      description: 'Ticket escalated to Escalation Manager Elena Rostova due to supplier WebBeds unresponsive.',
    },
  ];

  const conversations: SideConversation[] = [
    {
      id: 'conv_1001_hb',
      ticketId: 'OPS-1001',
      title: 'Urgent Voucher Re-Verification: Atlantis The Palm (HB-DXB-984210-A)',
      supplierName: 'Hotelbeds & Atlantis Front Desk',
      recipients: [
        { name: 'Hotelbeds Urgent Ops', email: 'urgent-ops@hotelbeds.com', type: 'supplier' },
        { name: 'Atlantis Reservations', email: 'reservations@atlantisthepalm.com', type: 'supplier' },
        { name: 'Rahul Sharma (TBO)', email: 'rahul.s@tbo.com', type: 'internal' },
      ],
      status: 'Waiting on Supplier',
      createdAt: new Date(now.getTime() - 35 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
      createdBy: 'Rahul Sharma',
      messages: [],
    },
  ];

  const messages: Message[] = [
    {
      id: 'msg_1001_1',
      conversationId: 'conv_1001_hb',
      ticketId: 'OPS-1001',
      senderId: 'usr_rahul',
      senderName: 'Rahul Sharma (TBO)',
      senderRole: 'agent',
      recipientType: 'supplier_side',
      content: 'URGENT: Guest David Miller (Booking HB-DXB-984210-A) is currently at your front desk and was advised the booking is missing from Opera. Please immediately send an emergency push to the property reservation terminal or provide the direct hotel confirmation number. Guest has 2 young children in lobby.',
      timestamp: new Date(now.getTime() - 34 * 60 * 1000).toISOString(),
      externalReference: 'TH-HB-98124',
    },
    {
      id: 'msg_1001_2',
      conversationId: 'conv_1001_hb',
      ticketId: 'OPS-1001',
      senderId: 'supplier_hb',
      senderName: 'Hotelbeds Dispatcher (Carlos M.)',
      senderRole: 'Supplier',
      recipientType: 'supplier_side',
      content: 'Hello TBO Team, we have located the reservation under Atlantis Internal Locator #ATL-99214. The front desk supervisor is being contacted via phone right now to manually pull the reservation into the active room assignment queue.',
      timestamp: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
      externalReference: 'TH-HB-98124',
    },
    // Public message on OPS-1001 to Agency
    {
      id: 'msg_1001_pub1',
      conversationId: 'main_1001',
      ticketId: 'OPS-1001',
      senderId: 'usr_rahul',
      senderName: 'Rahul Sharma',
      senderRole: 'agent',
      recipientType: 'agency_public',
      content: 'Dear Tariq, we are actively liaising with Hotelbeds and Atlantis duty management. Hotelbeds has identified the internal locator and is contacting the reception desk directly to expedite key handover.',
      timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
    },
    // Internal Agent Note on OPS-1001 (Must NEVER be visible to agency!)
    {
      id: 'msg_1001_note1',
      conversationId: 'main_1001',
      ticketId: 'OPS-1001',
      senderId: 'usr_rahul',
      senderName: 'Rahul Sharma',
      senderRole: 'agent',
      recipientType: 'internal_agent_only',
      content: 'INTERNAL NOTE: Hotelbeds XML batch job dropped the guest title field which caused the Opera auto-import to reject. Carlos from HB confirmed locator ATL-99214. If reception delays past 20 minutes, authorize hotel manager lounge pass.',
      timestamp: new Date(now.getTime() - 14 * 60 * 1000).toISOString(),
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud_1',
      timestamp: new Date(now.getTime() - 50 * 60 * 1000).toISOString(),
      userId: 'usr_tariq',
      userName: 'Tariq Al-Mansoor',
      userRole: 'agency',
      action: 'TICKET_CREATE',
      resource: 'Ticket',
      resourceId: 'OPS-1001',
      details: 'Created urgent voucher verification ticket for booking TBOH-984210.',
    },
    {
      id: 'aud_2',
      timestamp: new Date(now.getTime() - 48 * 60 * 1000).toISOString(),
      userId: 'system',
      userName: 'Routing Engine',
      userRole: 'agent',
      action: 'AUTO_ASSIGN',
      resource: 'Ticket',
      resourceId: 'OPS-1001',
      details: 'Evaluated routing rules; matched Rule "Emergency Check-in Triage (<24h)" -> Assigned to Rahul Sharma.',
    },
    {
      id: 'aud_3',
      timestamp: new Date(now.getTime() - 40 * 60 * 1000).toISOString(),
      userId: 'usr_rahul',
      userName: 'Rahul Sharma',
      userRole: 'agent',
      action: 'TICKET_LINK',
      resource: 'TicketLink',
      resourceId: 'link_1001_1004',
      details: 'Linked OPS-1001 with historical ticket OPS-1004 (matching TBOH-984210).',
    },
    {
      id: 'aud_4',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      userId: 'usr_sarah',
      userName: 'Sarah Jenkins',
      userRole: 'agent',
      action: 'ESCALATE',
      resource: 'Ticket',
      resourceId: 'OPS-1005',
      details: 'Escalated ticket OPS-1005 to Escalation Manager Elena Rostova due to SLA breach and unresolved supplier refund.',
    },
  ];

  return {
    users,
    agencies,
    tickets,
    ticketLinks,
    events,
    conversations,
    messages,
    routingRules,
    slaPolicies,
    auditLogs,
  };
}

class DatabaseRepository {
  private data: DatabaseSchema;
  private initialized = false;

  constructor() {
    this.data = getInitialSeedData();
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        if (fileContent.trim()) {
          this.data = JSON.parse(fileContent);
          // Recalculate SLA timers based on current time
          this.recalculateAllSlas();
          this.initialized = true;
          return;
        }
      }
      // If no file exists, save initial seed data
      this.recalculateAllSlas();
      this.saveToDisk();
      this.initialized = true;
    } catch (err) {
      console.error('Error loading DB from disk, resetting to seed data:', err);
      this.data = getInitialSeedData();
      this.recalculateAllSlas();
      this.saveToDisk();
      this.initialized = true;
    }
  }

  private saveToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database to disk:', err);
    }
  }

  private recalculateAllSlas() {
    for (const ticket of this.data.tickets) {
      const sla = calculateTicketSla(ticket, this.data.slaPolicies);
      ticket.slaDeadline = sla.slaDeadline;
      ticket.slaStatus = sla.slaStatus;
      ticket.slaRemainingMinutes = sla.slaRemainingMinutes;
      ticket.slaTargetHours = sla.slaTargetHours;
      if (sla.slaBreachTime && !ticket.slaBreachTime) {
        ticket.slaBreachTime = sla.slaBreachTime;
      }
    }
  }

  // --- Users & Agencies ---
  getUsers(): User[] {
    // Recount active tickets
    const counts: Record<string, number> = {};
    for (const t of this.data.tickets) {
      if (t.assignedAgentId && t.status !== 'Resolved' && t.status !== 'Closed') {
        counts[t.assignedAgentId] = (counts[t.assignedAgentId] || 0) + 1;
      }
    }
    return this.data.users.map((u) => ({
      ...u,
      activeTicketsCount: counts[u.id] || 0,
    }));
  }

  getUser(id: string): User | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  getAgencies(): Agency[] {
    return this.data.agencies;
  }

  getAgency(id: string): Agency | undefined {
    return this.data.agencies.find((a) => a.id === id);
  }

  // --- Tickets ---
  getTickets(filters: {
    requestingUser: User;
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
  }): { tickets: Ticket[]; total: number; page: number; totalPages: number } {
    this.recalculateAllSlas();
    const { requestingUser } = filters;

    let list = [...this.data.tickets];

    // CRITICAL: Tenant Isolation for Agency role
    if (requestingUser.role === 'agency') {
      if (!requestingUser.agencyId) {
        return { tickets: [], total: 0, page: 1, totalPages: 1 };
      }
      list = list.filter((t) => t.agencyId === requestingUser.agencyId);
    } else if (filters.agencyId) {
      list = list.filter((t) => t.agencyId === filters.agencyId);
    }

    if (filters.status) {
      list = list.filter((t) => t.status === filters.status);
    }
    if (filters.priority) {
      list = list.filter((t) => t.priority === filters.priority);
    }
    if (filters.region) {
      list = list.filter((t) => t.region === filters.region);
    }
    if (filters.category) {
      list = list.filter((t) => t.category === filters.category);
    }
    if (filters.assignedAgentId) {
      list = list.filter((t) => t.assignedAgentId === filters.assignedAgentId);
    }
    if (filters.tboh) {
      list = list.filter((t) => t.tboh.toLowerCase() === filters.tboh?.toLowerCase());
    }
    if (filters.isEscalated !== undefined) {
      list = list.filter((t) => t.isEscalated === filters.isEscalated);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.tboh.toLowerCase().includes(q) ||
          t.agencyName.toLowerCase().includes(q) ||
          t.bookingContext.passengerName.toLowerCase().includes(q) ||
          t.bookingContext.hotelOrFlightName.toLowerCase().includes(q) ||
          t.intent.toLowerCase().includes(q)
      );
    }

    // Sort: Escalated & Urgent first, then by createdAt desc
    list.sort((a, b) => {
      if (a.isEscalated !== b.isEscalated) return a.isEscalated ? -1 : 1;
      if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
      if (b.priority === 'Urgent' && a.priority !== 'Urgent') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      tickets: paginated,
      total: list.length,
      page,
      totalPages: Math.ceil(list.length / limit) || 1,
    };
  }

  getTicketById(id: string, requestingUser: User): Ticket | null {
    this.recalculateAllSlas();
    const ticket = this.data.tickets.find((t) => t.id === id);
    if (!ticket) return null;

    // Strict Tenant Isolation check: Agency can only see their own tickets!
    if (requestingUser.role === 'agency' && ticket.agencyId !== requestingUser.agencyId) {
      return null; // Forbidden
    }

    return ticket;
  }

  createTicket(
    data: {
      title: string;
      description: string;
      tboh: string;
      agencyId: string;
      category: TicketCategory;
      intent: string;
      priority: TicketPriority;
      region: Region;
      classificationMethod?: 'Rule-Based' | 'AI-Assisted' | 'Agent-Assigned';
      bookingContext: Ticket['bookingContext'];
    },
    actor: User
  ): Ticket {
    const nextNum = 1000 + this.data.tickets.length + 1;
    const id = `OPS-${nextNum}`;
    const now = new Date().toISOString();

    const agency = this.data.agencies.find((a) => a.id === data.agencyId);
    const agencyName = agency ? agency.name : 'Unknown Agency';

    // 1. Evaluate Smart Routing Engine
    const availableAgents = this.data.users.filter((u) => u.role === 'agent');
    const partialTicket: Partial<Ticket> = {
      ...data,
      id,
      createdAt: now,
    };
    const routingDecision = evaluateTicketRouting(
      partialTicket,
      availableAgents,
      this.data.routingRules
    );

    // 2. Evaluate Travel-Aware SLA
    const sla = calculateTicketSla(partialTicket, this.data.slaPolicies);

    // 3. Find related tickets with matching TBOH for automatic context link suggestions
    const matchingTickets = this.data.tickets.filter(
      (t) => t.tboh.toUpperCase() === data.tboh.toUpperCase()
    );
    const linkedTicketIds = matchingTickets.map((t) => t.id);

    const newTicket: Ticket = {
      id,
      title: data.title,
      description: data.description,
      agencyId: data.agencyId,
      agencyName,
      tboh: data.tboh.toUpperCase(),
      bookingContext: data.bookingContext,
      category: data.category,
      intent: data.intent,
      classificationMethod: data.classificationMethod || 'Rule-Based',
      priority: data.priority,
      region: data.region,
      assignedAgentId: routingDecision.assignedAgentId,
      assignedAgentName: routingDecision.assignedAgentName,
      assignedAt: routingDecision.assignedAgentId ? now : undefined,
      routingReason: routingDecision.routingReason,
      status: routingDecision.assignedAgentId ? 'Open' : 'New',
      createdAt: now,
      updatedAt: now,
      slaDeadline: sla.slaDeadline,
      slaStatus: sla.slaStatus,
      slaRemainingMinutes: sla.slaRemainingMinutes,
      slaTargetHours: sla.slaTargetHours,
      isEscalated: false,
      linkedTicketIds,
    };

    this.data.tickets.unshift(newTicket);

    // If matching tickets existed, create bidirectional links
    for (const match of matchingTickets) {
      if (!match.linkedTicketIds.includes(newTicket.id)) {
        match.linkedTicketIds.push(newTicket.id);
      }
      this.data.ticketLinks.push({
        id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        sourceTicketId: newTicket.id,
        targetTicketId: match.id,
        tboh: newTicket.tboh,
        linkType: 'Same Booking',
        linkedBy: 'Context Linking Engine',
        linkedAt: now,
        notes: `Identified matching booking reference ${newTicket.tboh}.`,
      });
    }

    // Timeline Event
    this.addEvent({
      ticketId: id,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      eventType: 'CREATED',
      description: `Ticket created for booking ${newTicket.tboh} by ${actor.name} (${agencyName}).`,
    });

    if (routingDecision.assignedAgentId) {
      this.addEvent({
        ticketId: id,
        actorId: 'system',
        actorName: 'Routing Engine',
        actorRole: 'System',
        eventType: 'ASSIGNED',
        description: `Automated assignment: ${routingDecision.routingReason}`,
      });
    }

    // Audit log
    this.addAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'TICKET_CREATE',
      resource: 'Ticket',
      resourceId: id,
      details: `Created ticket ${id} (${data.category}) with booking ${data.tboh}`,
    });

    this.saveToDisk();
    return newTicket;
  }

  updateTicket(
    id: string,
    updates: Partial<Ticket>,
    actor: User
  ): Ticket | null {
    const ticket = this.data.tickets.find((t) => t.id === id);
    if (!ticket) return null;

    const now = new Date().toISOString();
    const oldStatus = ticket.status;
    const oldAgent = ticket.assignedAgentName;
    const oldPriority = ticket.priority;

    // Apply updates
    Object.assign(ticket, updates);
    ticket.updatedAt = now;

    // Recompute SLA if priority changed or status changed to resolved
    if (updates.priority || updates.status) {
      const sla = calculateTicketSla(ticket, this.data.slaPolicies);
      ticket.slaDeadline = sla.slaDeadline;
      ticket.slaStatus = sla.slaStatus;
      ticket.slaRemainingMinutes = sla.slaRemainingMinutes;
      ticket.slaTargetHours = sla.slaTargetHours;
      if (sla.slaBreachTime) {
        ticket.slaBreachTime = sla.slaBreachTime;
      }
    }

    if (updates.status && updates.status !== oldStatus) {
      this.addEvent({
        ticketId: id,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        eventType: 'STATUS_CHANGED',
        description: `Status changed from ${oldStatus} to ${updates.status}.`,
      });
    }

    if (updates.assignedAgentId && updates.assignedAgentName !== oldAgent) {
      this.addEvent({
        ticketId: id,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        eventType: 'REASSIGNED',
        description: `Ticket reassigned from ${oldAgent || 'Unassigned'} to ${updates.assignedAgentName}. Reason: ${updates.routingReason || 'Manual agent assignment'}`,
      });
    }

    if (updates.priority && updates.priority !== oldPriority) {
      this.addEvent({
        ticketId: id,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        eventType: 'PRIORITY_CHANGED',
        description: `Priority adjusted from ${oldPriority} to ${updates.priority}.`,
      });
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'TICKET_UPDATE',
      resource: 'Ticket',
      resourceId: id,
      details: `Updated fields: ${Object.keys(updates).join(', ')}`,
    });

    this.saveToDisk();
    return ticket;
  }

  // --- Ticket Linking ---
  linkTickets(
    sourceTicketId: string,
    targetTicketId: string,
    linkType: TicketLink['linkType'],
    notes: string,
    actor: User
  ): TicketLink | null {
    const source = this.data.tickets.find((t) => t.id === sourceTicketId);
    const target = this.data.tickets.find((t) => t.id === targetTicketId);
    if (!source || !target) return null;

    if (!source.linkedTicketIds.includes(targetTicketId)) {
      source.linkedTicketIds.push(targetTicketId);
    }
    if (!target.linkedTicketIds.includes(sourceTicketId)) {
      target.linkedTicketIds.push(sourceTicketId);
    }

    const now = new Date().toISOString();
    const link: TicketLink = {
      id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      sourceTicketId,
      targetTicketId,
      tboh: source.tboh,
      linkType,
      linkedBy: actor.name,
      linkedAt: now,
      notes,
    };

    this.data.ticketLinks.push(link);

    this.addEvent({
      ticketId: sourceTicketId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      eventType: 'TICKET_LINKED',
      description: `Manually linked case with ${targetTicketId} (${linkType}). ${notes}`,
    });

    this.addEvent({
      ticketId: targetTicketId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      eventType: 'TICKET_LINKED',
      description: `Manually linked case with ${sourceTicketId} (${linkType}). ${notes}`,
    });

    this.saveToDisk();
    return link;
  }

  unlinkTickets(
    sourceTicketId: string,
    targetTicketId: string,
    actor: User
  ): boolean {
    const source = this.data.tickets.find((t) => t.id === sourceTicketId);
    const target = this.data.tickets.find((t) => t.id === targetTicketId);
    if (!source || !target) return false;

    source.linkedTicketIds = source.linkedTicketIds.filter((id) => id !== targetTicketId);
    target.linkedTicketIds = target.linkedTicketIds.filter((id) => id !== sourceTicketId);

    this.data.ticketLinks = this.data.ticketLinks.filter(
      (l) =>
        !(
          (l.sourceTicketId === sourceTicketId && l.targetTicketId === targetTicketId) ||
          (l.sourceTicketId === targetTicketId && l.targetTicketId === sourceTicketId)
        )
    );

    this.addEvent({
      ticketId: sourceTicketId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      eventType: 'TICKET_UNLINKED',
      description: `Unlinked case from ${targetTicketId}.`,
    });

    this.saveToDisk();
    return true;
  }

  // --- Escalation ---
  escalateTicket(
    ticketId: string,
    reason: string,
    actor: User
  ): Ticket | null {
    const ticket = this.data.tickets.find((t) => t.id === ticketId);
    if (!ticket) return null;

    const now = new Date().toISOString();
    const escalationManager = this.data.users.find((u) => u.role === 'escalation_manager');

    ticket.isEscalated = true;
    ticket.escalationId = `esc_${Date.now()}`;
    ticket.escalationReason = reason;
    ticket.escalatedAt = now;
    ticket.escalatedBy = actor.name;
    ticket.status = 'Escalated';
    ticket.priority = 'Urgent';

    // Transfer ownership to Escalation Manager
    if (escalationManager) {
      ticket.assignedAgentId = escalationManager.id;
      ticket.assignedAgentName = escalationManager.name;
    }

    this.addEvent({
      ticketId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      eventType: 'ESCALATED',
      description: `Ticket escalated to Escalation Manager queue by ${actor.name}. Reason: ${reason}`,
    });

    this.addAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'ESCALATE_TICKET',
      resource: 'Ticket',
      resourceId: ticketId,
      details: `Escalated: ${reason}`,
    });

    this.saveToDisk();
    return ticket;
  }

  // --- Conversations & Messages ---
  getTicketConversations(
    ticketId: string,
    requestingUser: User
  ): {
    publicMessages: Message[];
    internalNotes: Message[];
    sideConversations: (SideConversation & { messages: Message[] })[];
  } {
    // Check permission to view ticket
    const ticket = this.getTicketById(ticketId, requestingUser);
    if (!ticket) {
      return { publicMessages: [], internalNotes: [], sideConversations: [] };
    }

    const allTicketMessages = this.data.messages.filter((m) => m.ticketId === ticketId);

    // Public messages are visible to both Agency and Internal users
    const publicMessages = allTicketMessages.filter(
      (m) => m.recipientType === 'agency_public'
    );

    // CRITICAL SECURITY ENFORCEMENT:
    // If requesting user is Agency, return EMPTY for internal notes and supplier side conversations!
    if (requestingUser.role === 'agency') {
      return {
        publicMessages,
        internalNotes: [],
        sideConversations: [],
      };
    }

    // Support Agent, Manager, Admin can view internal notes and supplier side conversations
    const internalNotes = allTicketMessages.filter(
      (m) => m.recipientType === 'internal_agent_only'
    );

    const ticketConversations = this.data.conversations
      .filter((c) => c.ticketId === ticketId)
      .map((c) => ({
        ...c,
        messages: allTicketMessages.filter((m) => m.conversationId === c.id),
      }));

    return {
      publicMessages,
      internalNotes,
      sideConversations: ticketConversations,
    };
  }

  createSideConversation(
    ticketId: string,
    title: string,
    supplierName: string,
    recipients: SideConversation['recipients'],
    initialMessage: string,
    actor: User
  ): SideConversation {
    const id = `conv_${Date.now()}`;
    const now = new Date().toISOString();

    const conversation: SideConversation = {
      id,
      ticketId,
      title,
      supplierName,
      recipients,
      status: 'Waiting on Supplier',
      createdAt: now,
      updatedAt: now,
      createdBy: actor.name,
      messages: [],
    };

    this.data.conversations.push(conversation);

    // Add initial message
    const msgId = `msg_${Date.now()}`;
    const msg: Message = {
      id: msgId,
      conversationId: id,
      ticketId,
      senderId: actor.id,
      senderName: actor.name,
      senderRole: actor.role,
      recipientType: 'supplier_side',
      content: initialMessage,
      timestamp: now,
    };
    this.data.messages.push(msg);
    conversation.messages.push(msg);

    this.addEvent({
      ticketId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      eventType: 'SIDE_CONVERSATION_STARTED',
      description: `Opened supplier side conversation "${title}" with ${recipients.map((r) => r.email).join(', ')}.`,
    });

    this.saveToDisk();
    return conversation;
  }

  addMessage(
    ticketId: string,
    conversationId: string,
    content: string,
    recipientType: Message['recipientType'],
    actor: User
  ): Message {
    const now = new Date().toISOString();
    const msg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      conversationId,
      ticketId,
      senderId: actor.id,
      senderName: actor.name,
      senderRole: actor.role,
      recipientType,
      content,
      timestamp: now,
    };

    this.data.messages.push(msg);

    if (recipientType === 'agency_public') {
      this.addEvent({
        ticketId,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        eventType: 'REPLY_SENT',
        description: `External reply sent to agency by ${actor.name}.`,
      });
    } else if (recipientType === 'internal_agent_only') {
      this.addEvent({
        ticketId,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        eventType: 'NOTE_ADDED',
        description: `Internal note added by ${actor.name}.`,
      });
    }

    this.saveToDisk();
    return msg;
  }

  // --- Events Timeline ---
  getTicketEvents(ticketId: string, requestingUser: User): TicketEvent[] {
    const ticket = this.getTicketById(ticketId, requestingUser);
    if (!ticket) return [];

    let events = this.data.events.filter((e) => e.ticketId === ticketId);

    // If Agency, filter out internal confidential events
    if (requestingUser.role === 'agency') {
      events = events.filter(
        (e) =>
          e.eventType !== 'NOTE_ADDED' &&
          e.eventType !== 'SIDE_CONVERSATION_STARTED'
      );
    }

    return events.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private addEvent(event: Omit<TicketEvent, 'id' | 'timestamp'>) {
    this.data.events.unshift({
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
    });
  }

  // --- Routing Rules & SLA Policies ---
  getRoutingRules(): RoutingRule[] {
    return this.data.routingRules;
  }

  saveRoutingRule(rule: RoutingRule): RoutingRule {
    const idx = this.data.routingRules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      this.data.routingRules[idx] = rule;
    } else {
      rule.id = `rule_${Date.now()}`;
      this.data.routingRules.push(rule);
    }
    this.saveToDisk();
    return rule;
  }

  deleteRoutingRule(id: string): boolean {
    this.data.routingRules = this.data.routingRules.filter((r) => r.id !== id);
    this.saveToDisk();
    return true;
  }

  getSlaPolicies(): SlaPolicy[] {
    return this.data.slaPolicies;
  }

  saveSlaPolicy(policy: SlaPolicy): SlaPolicy {
    const idx = this.data.slaPolicies.findIndex((p) => p.id === policy.id);
    if (idx >= 0) {
      this.data.slaPolicies[idx] = policy;
    } else {
      policy.id = `sla_${Date.now()}`;
      this.data.slaPolicies.push(policy);
    }
    this.recalculateAllSlas();
    this.saveToDisk();
    return policy;
  }

  // --- Audit Logs ---
  getAuditLogs(limit = 100): AuditLog[] {
    return this.data.auditLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    this.data.auditLogs.unshift({
      ...log,
      id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
    });
  }

  // --- Operational Metrics & Insights ---
  getOperationalMetrics(): OperationalMetrics {
    this.recalculateAllSlas();
    const tickets = this.data.tickets;
    const total = tickets.length;
    const open = tickets.filter((t) => t.status !== 'Resolved' && t.status !== 'Closed').length;
    const resolved = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;
    const atRisk = tickets.filter((t) => t.slaStatus === 'At Risk').length;
    const breached = tickets.filter((t) => t.slaStatus === 'Breached').length;
    const escalated = tickets.filter((t) => t.isEscalated).length;

    // Region distribution
    const regionMap: Record<string, number> = {};
    for (const t of tickets) {
      regionMap[t.region] = (regionMap[t.region] || 0) + 1;
    }
    const ticketsByRegion = Object.entries(regionMap).map(([region, count]) => ({
      region,
      count,
    }));

    // Category distribution
    const catMap: Record<string, number> = {};
    for (const t of tickets) {
      catMap[t.category] = (catMap[t.category] || 0) + 1;
    }
    const ticketsByCategory = Object.entries(catMap).map(([category, count]) => ({
      category,
      count,
    }));

    // Intent distribution
    const intentMap: Record<string, number> = {};
    for (const t of tickets) {
      const intentKey = t.intent.length > 28 ? t.intent.slice(0, 28) + '...' : t.intent;
      intentMap[intentKey] = (intentMap[intentKey] || 0) + 1;
    }
    const ticketsByIntent = Object.entries(intentMap).map(([intent, count]) => ({
      intent,
      count,
    }));

    // Agent workload
    const agents = this.data.users.filter((u) => u.role === 'agent' || u.role === 'escalation_manager');
    const agentWorkloads = agents.map((agent) => {
      const active = tickets.filter(
        (t) => t.assignedAgentId === agent.id && t.status !== 'Resolved' && t.status !== 'Closed'
      ).length;
      const resolvedToday = tickets.filter(
        (t) => t.assignedAgentId === agent.id && (t.status === 'Resolved' || t.status === 'Closed')
      ).length;
      return {
        agentId: agent.id,
        agentName: agent.name,
        activeTickets: active,
        resolvedToday,
      };
    });

    // Top Recurring Complaint Themes based on real counts
    const topRecurringThemes = [
      {
        theme: 'Hotel Front Desk Voucher Mismatch / PMS Rejection',
        count: tickets.filter((t) => t.category === 'Hotel Confirmation').length,
        impact: 'High' as const,
        trend: '+24% this week (Atlantis / Hilton properties)',
      },
      {
        theme: 'Late Supplier Refund Settlements (>14 Days)',
        count: tickets.filter((t) => t.category === 'Refund Delay').length,
        impact: 'High' as const,
        trend: '+12% (WebBeds & Hotelbeds blocks)',
      },
      {
        theme: 'GDS PNR Coupon Suspensions & Tax Re-quotes',
        count: tickets.filter((t) => t.category === 'Flight Ticket Issue').length,
        impact: 'Medium' as const,
        trend: 'Stable across APAC carriers',
      },
      {
        theme: 'XML Cache Inventory Out-of-Sync (Room Downgrades)',
        count: tickets.filter((t) => t.category === 'Inventory Synchronization').length,
        impact: 'Medium' as const,
        trend: '+8% on Southeast Asia beach inventory',
      },
      {
        theme: 'Payment Capture Timeout (Missing Voucher)',
        count: tickets.filter((t) => t.category === 'Booking Failure').length,
        impact: 'High' as const,
        trend: 'Critical incident alert active',
      },
    ];

    return {
      totalTickets: total,
      openTickets: open,
      resolvedTickets: resolved,
      atRiskTickets: atRisk,
      breachedTickets: breached,
      escalatedTickets: escalated,
      averageResolutionTimeHours: 4.2,
      firstResponseTimeMinutes: 14,
      ticketsByRegion,
      ticketsByIntent,
      ticketsByCategory,
      agentWorkloads,
      topRecurringThemes,
    };
  }

  // Reset database back to default seed state
  resetToSeed() {
    this.data = getInitialSeedData();
    this.recalculateAllSlas();
    this.saveToDisk();
  }
}

export const db = new DatabaseRepository();
