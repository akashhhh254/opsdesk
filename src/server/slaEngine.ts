import { Ticket, TicketPriority, SlaStatus, SlaPolicy } from '../types/index.ts';

export interface SlaCalculationResult {
  slaDeadline: string;
  slaStatus: SlaStatus;
  slaBreachTime?: string;
  slaRemainingMinutes: number;
  slaTargetHours: number;
}

export const DEFAULT_SLA_POLICIES: SlaPolicy[] = [
  {
    id: 'sla-urgent',
    name: 'Urgent Travel Operations Policy',
    priority: 'Urgent',
    targetResolutionHours: 2,
    warningThresholdMinutes: 45,
    checkInProximityMultiplier: 0.5,
    active: true,
  },
  {
    id: 'sla-high',
    name: 'High Priority Operations Policy',
    priority: 'High',
    targetResolutionHours: 6,
    warningThresholdMinutes: 90,
    checkInProximityMultiplier: 0.6,
    active: true,
  },
  {
    id: 'sla-medium',
    name: 'Standard Medium Policy',
    priority: 'Medium',
    targetResolutionHours: 24,
    warningThresholdMinutes: 180,
    checkInProximityMultiplier: 0.75,
    active: true,
  },
  {
    id: 'sla-low',
    name: 'Low Priority / Post-Travel Policy',
    priority: 'Low',
    targetResolutionHours: 48,
    warningThresholdMinutes: 360,
    checkInProximityMultiplier: 1.0,
    active: true,
  },
];

/**
 * Calculates travel-aware SLA metrics based on:
 * 1. Base Priority target hours
 * 2. Check-in proximity (<24h reduces SLA deadline drastically)
 * 3. Last Cancellation Date (LCD) proximity
 * 4. Created timestamp vs now
 */
export function calculateTicketSla(
  ticket: Partial<Ticket>,
  policies: SlaPolicy[] = DEFAULT_SLA_POLICIES
): SlaCalculationResult {
  const priority = ticket.priority || 'Medium';
  const policy =
    policies.find((p) => p.priority === priority && p.active) ||
    DEFAULT_SLA_POLICIES.find((p) => p.priority === priority) ||
    DEFAULT_SLA_POLICIES[2];

  let targetHours = policy.targetResolutionHours;

  // Travel Urgency Factor 1: Proximity to Check-In Date
  if (ticket.bookingContext?.checkInDate) {
    const checkInTime = new Date(ticket.bookingContext.checkInDate).getTime();
    const now = Date.now();
    const hoursToCheckIn = (checkInTime - now) / (1000 * 60 * 60);

    if (hoursToCheckIn <= 12 && hoursToCheckIn > 0) {
      // Passenger checking in within 12 hours: compress SLA by 60%
      targetHours = Math.max(1, targetHours * 0.4);
    } else if (hoursToCheckIn <= 24 && hoursToCheckIn > 0) {
      // Passenger checking in within 24 hours: compress SLA by multiplier
      targetHours = Math.max(1.5, targetHours * policy.checkInProximityMultiplier);
    } else if (hoursToCheckIn <= 48 && hoursToCheckIn > 0) {
      targetHours = Math.max(2, targetHours * 0.8);
    }
  }

  // Travel Urgency Factor 2: Proximity to LCD (Last Cancellation Date)
  if (ticket.bookingContext?.lcd) {
    const lcdTime = new Date(ticket.bookingContext.lcd).getTime();
    const now = Date.now();
    const hoursToLcd = (lcdTime - now) / (1000 * 60 * 60);

    if (hoursToLcd <= 6 && hoursToLcd > 0 && ticket.category === 'Cancellation') {
      // Imminent supplier cancellation cutoff!
      targetHours = Math.min(targetHours, 1);
    }
  }

  const createdAt = ticket.createdAt ? new Date(ticket.createdAt).getTime() : Date.now();
  const deadlineTime = createdAt + targetHours * 60 * 60 * 1000;
  const deadlineIso = new Date(deadlineTime).toISOString();

  // If already resolved or closed, SLA status is frozen at resolution time or current
  if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
    const resolvedTime = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : Date.now();
    const breached = resolvedTime > deadlineTime;
    return {
      slaDeadline: deadlineIso,
      slaStatus: breached ? 'Breached' : 'On Track',
      slaRemainingMinutes: Math.round((deadlineTime - resolvedTime) / (1000 * 60)),
      slaTargetHours: Number(targetHours.toFixed(1)),
      slaBreachTime: breached ? deadlineIso : undefined,
    };
  }

  const now = Date.now();
  const remainingMillis = deadlineTime - now;
  const remainingMinutes = Math.round(remainingMillis / (1000 * 60));

  let slaStatus: SlaStatus = 'On Track';
  let breachTime: string | undefined = undefined;

  if (remainingMinutes <= 0) {
    slaStatus = 'Breached';
    breachTime = deadlineIso;
  } else if (remainingMinutes <= policy.warningThresholdMinutes) {
    slaStatus = 'At Risk';
  }

  return {
    slaDeadline: deadlineIso,
    slaStatus,
    slaBreachTime: breachTime,
    slaRemainingMinutes: remainingMinutes,
    slaTargetHours: Number(targetHours.toFixed(1)),
  };
}
