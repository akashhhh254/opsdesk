import { GoogleGenAI } from '@google/genai';
import { Ticket, TicketCategory, TicketPriority } from '../types/index.ts';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (aiClient) return aiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    return aiClient;
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
    return null;
  }
}

export interface IntentClassificationResult {
  category: TicketCategory;
  intent: string;
  confidence?: number;
  method: 'Rule-Based' | 'AI-Assisted';
  reasoning: string;
  suggestedPriority: TicketPriority;
}

/**
 * Deterministic rule-based fallback for ticket classification
 */
export function classifyTicketDeterministically(
  title: string,
  description: string,
  checkInDate?: string
): IntentClassificationResult {
  const text = `${title} ${description}`.toLowerCase();

  let category: TicketCategory = 'Special Request';
  let intent = 'General travel assistance requested';
  let suggestedPriority: TicketPriority = 'Medium';
  let reasoning = 'Matched standard customer service inquiry patterns.';

  if (text.includes('refund') || text.includes('reimburse') || text.includes('money back') || text.includes('chargeback')) {
    category = 'Refund Delay';
    intent = 'Escalation of delayed refund payout';
    suggestedPriority = 'High';
    reasoning = 'Detected refund/financial keywords requiring finance reconciliation.';
  } else if (text.includes('failed') || text.includes('voucher error') || text.includes('booking failed') || text.includes('pnr missing')) {
    category = 'Booking Failure';
    intent = 'Instant confirmation or payment-confirmed failure';
    suggestedPriority = 'Urgent';
    reasoning = 'Detected booking transaction failure keywords.';
  } else if (text.includes('hotel cannot find') || text.includes('not confirmed') || text.includes('front desk denied') || text.includes('no reservation')) {
    category = 'Hotel Confirmation';
    intent = 'Hotel voucher unverified at check-in desk';
    suggestedPriority = 'Urgent';
    reasoning = 'Detected guest-facing hotel check-in refusal keywords.';
  } else if (text.includes('cancel') || text.includes('cancellation') || text.includes('waive fee') || text.includes('lcd')) {
    category = 'Cancellation';
    intent = 'Urgent booking cancellation or penalty waiver';
    suggestedPriority = 'High';
    reasoning = 'Detected cancellation request with potential cancellation deadline impact.';
  } else if (text.includes('flight') || text.includes('airline') || text.includes('schedule change') || text.includes('baggage')) {
    category = 'Flight Ticket Issue';
    intent = 'GDS ticketing or flight re-issuance inquiry';
    suggestedPriority = 'High';
    reasoning = 'Detected airline ticketing and schedule change keywords.';
  } else if (text.includes('supplier not answering') || text.includes('supplier delay') || text.includes('hotelbeds slow') || text.includes('no response from bedbank')) {
    category = 'Supplier Response Delay';
    intent = 'Supplier operational delay on live case';
    suggestedPriority = 'Medium';
    reasoning = 'Detected supplier SLA communication delay keywords.';
  } else if (text.includes('rate mismatch') || text.includes('inventory') || text.includes('sold out') || text.includes('price jump')) {
    category = 'Inventory Synchronization';
    intent = 'Rate cache discrepancy or out-of-sync room availability';
    suggestedPriority = 'Medium';
    reasoning = 'Detected inventory or rate cache mismatch keywords.';
  }

  // Check-in date urgency bump
  if (checkInDate) {
    const hoursToCheckIn = (new Date(checkInDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursToCheckIn <= 24 && hoursToCheckIn > 0) {
      suggestedPriority = 'Urgent';
      reasoning += ' Priority boosted to Urgent due to imminent check-in (<24 hours).';
    }
  }

  return {
    category,
    intent,
    method: 'Rule-Based',
    reasoning,
    suggestedPriority,
  };
}

/**
 * Hybrid Intent Classification: uses Gemini API if available, falls back to deterministic rules
 */
export async function classifyTicketIntent(
  title: string,
  description: string,
  checkInDate?: string
): Promise<IntentClassificationResult> {
  const ai = getAiClient();
  if (!ai) {
    return classifyTicketDeterministically(title, description, checkInDate);
  }

  try {
    const prompt = `You are an expert travel operations AI for TBO Zendesk OpsDesk.
Analyze this B2B travel agency support ticket:
Title: "${title}"
Description: "${description}"
Check-in Date: "${checkInDate || 'Not specified'}"

Categories to choose from:
- Refund Delay
- Booking Failure
- Hotel Confirmation
- Flight Ticket Issue
- Cancellation
- Supplier Response Delay
- Inventory Synchronization
- Special Request

Respond ONLY with valid JSON in this exact structure:
{
  "category": "Refund Delay",
  "intent": "Brief 5-8 word intent summary",
  "suggestedPriority": "Urgent" | "High" | "Medium" | "Low",
  "reasoning": "One concise sentence explaining why this category fits"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '';
    const parsed = JSON.parse(text);

    return {
      category: parsed.category || 'Special Request',
      intent: parsed.intent || title,
      method: 'AI-Assisted',
      reasoning: parsed.reasoning || 'Classified via Gemini model analysis.',
      suggestedPriority: parsed.suggestedPriority || 'Medium',
    };
  } catch (err) {
    console.warn('Gemini classification fallback triggered:', err);
    return classifyTicketDeterministically(title, description, checkInDate);
  }
}

/**
 * Generate AI Summary for Agent Case Review
 */
export async function generateTicketSummary(ticket: Ticket): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    return `[Automated Summary] Case ${ticket.id} (${ticket.category}) for ${ticket.agencyName}. Booking ref ${ticket.tboh} for ${ticket.bookingContext.passengerName} at ${ticket.bookingContext.hotelOrFlightName}. Check-in is scheduled for ${ticket.bookingContext.checkInDate} (LCD: ${ticket.bookingContext.lcd}). Status is ${ticket.status} with ${ticket.priority} priority.`;
  }

  try {
    const prompt = `Summarize this travel operations ticket for an operations agent in 2-3 crisp bullet points.
Ticket ID: ${ticket.id}
Agency: ${ticket.agencyName}
TBOH Reference: ${ticket.tboh}
Passenger: ${ticket.bookingContext.passengerName}
Hotel / Flight: ${ticket.bookingContext.hotelOrFlightName} (Supplier: ${ticket.bookingContext.supplierName})
Check-In: ${ticket.bookingContext.checkInDate}
LCD Deadline: ${ticket.bookingContext.lcd}
Issue Category: ${ticket.category}
Description: ${ticket.description}
SLA Status: ${ticket.slaStatus} (${ticket.slaRemainingMinutes} mins remaining)

Focus on:
1. Core problem & travel urgency
2. Financial or supplier risk (supplier: ${ticket.bookingContext.supplierName})
3. Recommended next action.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return response.text?.trim() || 'Summary could not be generated.';
  } catch (err) {
    console.warn('Gemini summary fallback:', err);
    return `Case ${ticket.id}: Agency ${ticket.agencyName} reported ${ticket.category} on booking ${ticket.tboh}. Check-in on ${ticket.bookingContext.checkInDate}. Priority ${ticket.priority}.`;
  }
}

/**
 * Suggest Response Draft for Support Agent
 */
export async function suggestResponseDraft(
  ticket: Ticket,
  targetAudience: 'Agency' | 'Supplier'
): Promise<string> {
  const ai = getAiClient();
  const guest = ticket.bookingContext.passengerName;
  const tboh = ticket.tboh;
  const hotel = ticket.bookingContext.hotelOrFlightName;
  const supplier = ticket.bookingContext.supplierName;

  if (!ai) {
    if (targetAudience === 'Supplier') {
      return `Dear ${supplier} Support Team,\n\nWe urgently request an update regarding Booking Reference ${tboh} (Supplier Ref: ${ticket.bookingContext.supplierReference}) for guest ${guest} at ${hotel}. Check-in is on ${ticket.bookingContext.checkInDate}.\n\nThe guest reported: "${ticket.description}".\n\nPlease confirm reservation status immediately to avoid guest displacement.\n\nRegards,\nTBO Global Operations Team`;
    }
    return `Dear ${ticket.agencyName} Team,\n\nThank you for reaching out regarding booking ${tboh} (${hotel}). We have escalated this directly to our supplier ${supplier} under reference ${ticket.bookingContext.supplierReference}.\n\nOur operations team is actively monitoring the status ahead of the check-in on ${ticket.bookingContext.checkInDate} and we will provide an update within the hour.\n\nWarm regards,\nOpsDesk Support`;
  }

  try {
    const prompt = targetAudience === 'Supplier'
      ? `Write a formal, urgent B2B travel operations inquiry to the supplier ${supplier} regarding:
Booking: ${tboh} (Supplier Ref: ${ticket.bookingContext.supplierReference})
Guest: ${guest}
Property: ${hotel}
Check-in: ${ticket.bookingContext.checkInDate}
Complaint: ${ticket.description}
State clearly that this is an operational inquiry and request immediate confirmation or resolution.`
      : `Write a reassuring, professional response to travel agency ${ticket.agencyName} regarding:
Booking: ${tboh} for guest ${guest}
Issue: ${ticket.category} - ${ticket.description}
Status: Under investigation with supplier ${supplier}.
Check-in date: ${ticket.bookingContext.checkInDate}.
Provide clear next steps without making unauthorized financial promises.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return response.text?.trim() || '';
  } catch (err) {
    console.warn('Gemini draft suggestion fallback:', err);
    return `Dear Team,\n\nWe have reviewed ticket ${ticket.id} (${ticket.tboh}) and are actively working on resolving the issue with ${ticket.bookingContext.supplierName}.\n\nRegards,\nOpsDesk Operations`;
  }
}
