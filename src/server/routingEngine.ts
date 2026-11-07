import { Ticket, User, RoutingRule } from '../types/index.ts';

export interface RoutingDecision {
  assignedAgentId: string;
  assignedAgentName: string;
  routingReason: string;
  matchedRuleId?: string;
}

/**
 * Intelligent Multi-Signal Routing Engine
 * Evaluates:
 * 1. Region / Geography match
 * 2. Category / Skill specialization
 * 3. Priority and Travel Urgency (e.g. check-in < 24h)
 * 4. Agent Availability & Workload balancing
 */
export function evaluateTicketRouting(
  ticket: Partial<Ticket>,
  availableAgents: User[],
  routingRules: RoutingRule[]
): RoutingDecision {
  const checkInHours = ticket.bookingContext?.checkInDate
    ? Math.max(
        0,
        (new Date(ticket.bookingContext.checkInDate).getTime() - Date.now()) / (1000 * 60 * 60)
      )
    : 999;

  // 1. Evaluate configured custom routing rules first (sorted by priority)
  const activeRules = [...routingRules]
    .filter((r) => r.active)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of activeRules) {
    const { conditions } = rule;
    let matches = true;

    if (conditions.region && conditions.region.length > 0) {
      if (!ticket.region || !conditions.region.includes(ticket.region)) {
        matches = false;
      }
    }

    if (matches && conditions.category && conditions.category.length > 0) {
      if (!ticket.category || !conditions.category.includes(ticket.category)) {
        matches = false;
      }
    }

    if (matches && conditions.priority && conditions.priority.length > 0) {
      if (!ticket.priority || !conditions.priority.includes(ticket.priority)) {
        matches = false;
      }
    }

    if (matches && conditions.hoursToCheckInLessThan !== undefined) {
      if (checkInHours > conditions.hoursToCheckInLessThan) {
        matches = false;
      }
    }

    if (matches) {
      if (rule.targetAgentId) {
        const targetAgent = availableAgents.find((a) => a.id === rule.targetAgentId);
        if (targetAgent) {
          return {
            assignedAgentId: targetAgent.id,
            assignedAgentName: targetAgent.name,
            routingReason: `Assigned via Rule "${rule.name}": ${rule.ruleExplanation}`,
            matchedRuleId: rule.id,
          };
        }
      }
    }
  }

  // 2. Default Multi-Signal Fallback Routing:
  // Find agents in same region or global with matching specialization
  const scoredAgents = availableAgents.map((agent) => {
    let score = 0;
    const reasons: string[] = [];

    // Region match (+30 points)
    if (agent.region === ticket.region) {
      score += 30;
      reasons.push(`${ticket.region} regional alignment`);
    } else if (agent.region === 'Global') {
      score += 15;
      reasons.push('global queue coverage');
    }

    // Specialization match (+40 points)
    if (ticket.category && agent.specialization?.includes(ticket.category)) {
      score += 40;
      reasons.push(`specialized in ${ticket.category}`);
    } else if (
      ticket.bookingContext?.serviceType &&
      agent.specialization?.includes(ticket.bookingContext.serviceType)
    ) {
      score += 25;
      reasons.push(`expert in ${ticket.bookingContext.serviceType}`);
    }

    // Workload penalty (fewer active tickets = higher score)
    const activeLoad = agent.activeTicketsCount || 0;
    const loadPenalty = Math.min(30, activeLoad * 5);
    score -= loadPenalty;
    if (activeLoad < 3) {
      score += 20;
      reasons.push(`low queue load (${activeLoad} active)`);
    }

    // Urgent check-in boost for senior agents
    if (checkInHours < 24 && agent.specialization?.includes('Urgent Triage')) {
      score += 35;
      reasons.push('emergency check-in triage qualification');
    }

    return {
      agent,
      score,
      reasonsText: reasons.join(', '),
    };
  });

  // Sort descending by score
  scoredAgents.sort((a, b) => b.score - a.score);

  if (scoredAgents.length > 0 && scoredAgents[0].score > 0) {
    const best = scoredAgents[0];
    return {
      assignedAgentId: best.agent.id,
      assignedAgentName: best.agent.name,
      routingReason: `Multi-signal algorithm matched ${best.agent.name}: ${best.reasonsText}.`,
    };
  }

  // If no good match or no agents online, keep unassigned in Triage queue
  return {
    assignedAgentId: '',
    assignedAgentName: 'Unassigned',
    routingReason: 'Awaiting triage: No eligible regional agent available with matching specialization.',
  };
}
