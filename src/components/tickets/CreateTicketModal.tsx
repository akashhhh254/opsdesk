import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Ticket, TicketCategory, TicketPriority, Region, Agency } from '../../types/index.ts';
import {
  X,
  Sparkles,
  AlertCircle,
  Link as LinkIcon,
  Building2,
  Calendar,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (ticket: Ticket) => void;
  existingTickets?: Ticket[];
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  existingTickets = [],
}) => {
  const { currentUser, isAgency } = useAuth();

  const [tboh, setTboh] = useState('TBOH-984210');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('Hotel Confirmation');
  const [priority, setPriority] = useState<TicketPriority>('High');
  const [region, setRegion] = useState<Region>('EMEA');
  const [passengerName, setPassengerName] = useState('John Doe');
  const [hotelOrFlightName, setHotelOrFlightName] = useState('Atlantis, The Palm Dubai');
  const [supplierName, setSupplierName] = useState('Hotelbeds');
  const [destination, setDestination] = useState('Dubai, UAE');
  const [checkInDate, setCheckInDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [lcd, setLcd] = useState(
    new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [selectedAgencyId, setSelectedAgencyId] = useState('ag_skyline');
  const [agencies, setAgencies] = useState<Agency[]>([]);

  // AI Classification state
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    category: TicketCategory;
    intent: string;
    suggestedPriority: TicketPriority;
    reasoning: string;
    method: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load agencies list
  useEffect(() => {
    if (isOpen) {
      api.getAgencies().then(({ agencies }) => {
        setAgencies(agencies);
        if (currentUser?.agencyId) {
          setSelectedAgencyId(currentUser.agencyId);
        } else if (agencies.length > 0) {
          setSelectedAgencyId(agencies[0].id);
        }
      }).catch(console.error);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Check matching TBOH tickets for Context-Rich Linking warning
  const matchingTickets = existingTickets.filter(
    (t) => tboh && t.tboh.toUpperCase() === tboh.trim().toUpperCase()
  );

  const handleAiClassify = async () => {
    if (!title && !description) {
      setError('Please provide at least a title or description to analyze intent.');
      return;
    }
    setError(null);
    setIsAnalyzingAi(true);
    try {
      const res = await api.classifyIntent(title, description, checkInDate);
      if (res.classification) {
        setAiAnalysis(res.classification);
        setCategory(res.classification.category);
        if (res.classification.suggestedPriority) {
          setPriority(res.classification.suggestedPriority);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('AI classification unavailable; using deterministic rules.');
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !tboh.trim()) {
      setError('Please enter TBOH reference, title, and detailed description.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { ticket } = await api.createTicket({
        title: title.trim(),
        description: description.trim(),
        tboh: tboh.trim().toUpperCase(),
        agencyId: selectedAgencyId,
        category,
        priority,
        region,
        intent: aiAnalysis?.intent || title.trim(),
        bookingContext: {
          tboh: tboh.trim().toUpperCase(),
          serviceType: category === 'Flight Ticket Issue' ? 'Flight' : 'Hotel',
          destination,
          hotelOrFlightName,
          supplierName,
          supplierReference: `${supplierName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`,
          checkInDate,
          lcd,
          passengerName,
          paxCount: 2,
          bookingAmount: 1450,
          currency: 'USD',
        },
      });

      onCreated(ticket);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Create Context-Rich Operations Ticket
            </h3>
            <p className="text-xs text-slate-500">
              B2B travel case connected to booking reference, supplier details & SLA engine.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Booking Reference & Agency Context */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Travel Booking Context (TBOH)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Booking Reference / TBOH *
                </label>
                <input
                  type="text"
                  value={tboh}
                  onChange={(e) => setTboh(e.target.value.toUpperCase())}
                  placeholder="e.g. TBOH-984210"
                  required
                  className="w-full px-3 py-1.5 font-mono text-xs font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Travel Agency
                </label>
                {isAgency ? (
                  <input
                    type="text"
                    disabled
                    value={currentUser?.agencyId || selectedAgencyId}
                    className="w-full px-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
                  />
                ) : (
                  <select
                    value={selectedAgencyId}
                    onChange={(e) => setSelectedAgencyId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    {agencies.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Region
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as Region)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="EMEA">EMEA</option>
                  <option value="APAC">APAC</option>
                  <option value="Americas">Americas</option>
                </select>
              </div>
            </div>

            {/* Context Linking Alert if matching TBOH exists */}
            {matchingTickets.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
                <LinkIcon className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">
                    Context Linking: {matchingTickets.length} existing case(s) found on {tboh}!
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    This ticket will automatically link to previous cases (
                    {matchingTickets.map((t) => `${t.id}: ${t.category}`).join(', ')}) to give the support agent complete historical context.
                  </p>
                </div>
              </div>
            )}

            {/* Passenger & Property Context */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Lead Passenger Name
                </label>
                <input
                  type="text"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Hotel / Airline Name
                </label>
                <input
                  type="text"
                  value={hotelOrFlightName}
                  onChange={(e) => setHotelOrFlightName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Supplier (Bedbank / GDS)
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. Hotelbeds, Expedia, Agoda"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Travel Dates & LCD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Check-in / Departure Date
                </label>
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Last Cancellation Date (LCD)
                </label>
                <input
                  type="date"
                  value={lcd}
                  onChange={(e) => setLcd(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Issue Details & AI Intent Classification */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Complaint & Intent Details
              </h4>
              <button
                type="button"
                onClick={handleAiClassify}
                disabled={isAnalyzingAi}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAnalyzingAi ? 'Analyzing Intent...' : 'Analyze with AI'}</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ticket Title / Summary *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Guest standing at Atlantis check-in: Front desk claims no active reservation"
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Complaint Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Provide detailed description of the travel issue, supplier communication, and immediate action requested..."
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
              />
            </div>

            {/* AI Analysis Preview Box */}
            {aiAnalysis && (
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5 text-xs text-purple-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>AI Intent Classification: {aiAnalysis.category}</span>
                  </div>
                  <span className="text-[10px] bg-purple-200/80 px-2 py-0.5 rounded font-mono font-medium">
                    {aiAnalysis.method}
                  </span>
                </div>
                <p className="text-[11px] text-purple-800">
                  <strong>Detected Intent:</strong> {aiAnalysis.intent}
                </p>
                <p className="text-[11px] text-purple-700">{aiAnalysis.reasoning}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Issue Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TicketCategory)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="Hotel Confirmation">Hotel Confirmation</option>
                  <option value="Booking Failure">Booking Failure</option>
                  <option value="Refund Delay">Refund Delay</option>
                  <option value="Cancellation">Cancellation</option>
                  <option value="Flight Ticket Issue">Flight Ticket Issue</option>
                  <option value="Supplier Response Delay">Supplier Response Delay</option>
                  <option value="Inventory Synchronization">Inventory Synchronization</option>
                  <option value="Special Request">Special Request</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Requested Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="Urgent">Urgent (Check-in &lt; 24h / Emergency)</option>
                  <option value="High">High (Check-in 24h-72h / Flight issue)</option>
                  <option value="Medium">Medium (Standard investigation)</option>
                  <option value="Low">Low (Amenity / Post-travel query)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submission Bar */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? 'Creating & Routing...' : 'Submit Support Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
