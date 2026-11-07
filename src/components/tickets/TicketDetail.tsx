import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import {
  Ticket,
  Message,
  SideConversation,
  TicketEvent,
  TicketPriority,
  TicketStatus,
  User,
} from '../../types/index.ts';
import { EscalateModal } from './EscalateModal.tsx';
import { LinkTicketModal } from './LinkTicketModal.tsx';
import { ResolveModal } from './ResolveModal.tsx';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  MessageSquare,
  Lock,
  Building2,
  Plane,
  Sparkles,
  Link as LinkIcon,
  Unlink,
  History,
  Bot,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Plus,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface TicketDetailProps {
  ticketId: string;
  onBack: () => void;
  onTicketUpdated: (ticket: Ticket) => void;
  allTickets: Ticket[];
}

export const TicketDetail: React.FC<TicketDetailProps> = ({
  ticketId,
  onBack,
  onTicketUpdated,
  allTickets,
}) => {
  const { currentUser, isAgency, isAgent, isManager, isAdmin, allUsers } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Conversations
  const [activeTab, setActiveTab] = useState<'public' | 'internal' | 'supplier' | 'timeline'>('public');
  const [publicMessages, setPublicMessages] = useState<Message[]>([]);
  const [internalNotes, setInternalNotes] = useState<Message[]>([]);
  const [sideConversations, setSideConversations] = useState<SideConversation[]>([]);
  const [selectedSideConvId, setSelectedSideConvId] = useState<string>('');
  const [timelineEvents, setTimelineEvents] = useState<TicketEvent[]>([]);

  // Reply inputs
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // New Supplier Conversation form
  const [isCreatingSideConv, setIsCreatingSideConv] = useState(false);
  const [sideConvTitle, setSideConvTitle] = useState('');
  const [sideConvSupplier, setSideConvSupplier] = useState('');
  const [sideConvEmail, setSideConvEmail] = useState('');
  const [sideConvMessage, setSideConvMessage] = useState('');

  // Modals
  const [isEscalateOpen, setIsEscalateOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);

  // AI tools
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSuggestingDraft, setIsSuggestingDraft] = useState(false);

  // Agent reassignment dropdown
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  const loadTicketData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { ticket: fetched } = await api.getTicketById(ticketId);
      setTicket(fetched);
      setSelectedAgentId(fetched.assignedAgentId || '');

      // Load conversations
      const convData = await api.getConversations(ticketId);
      setPublicMessages(convData.publicMessages || []);
      setInternalNotes(convData.internalNotes || []);
      setSideConversations(convData.sideConversations || []);
      if (convData.sideConversations && convData.sideConversations.length > 0) {
        setSelectedSideConvId(convData.sideConversations[0].id);
      }

      // Load timeline events
      const eventData = await api.getTicketEvents(ticketId);
      setTimelineEvents(eventData.events || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTicketData();
  }, [ticketId]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs space-y-2">
        <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Loading context-rich case data...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-3">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {error || 'Ticket not found or permission denied.'}
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          ← Back to Ticket Queue
        </button>
      </div>
    );
  }

  // Linked tickets data
  const linkedTickets = allTickets.filter(
    (t) => ticket.linkedTicketIds && ticket.linkedTicketIds.includes(t.id)
  );

  // Travel check-in urgency check (<24h)
  const hoursToCheckIn = ticket.bookingContext?.checkInDate
    ? (new Date(ticket.bookingContext.checkInDate).getTime() - Date.now()) / (1000 * 60 * 60)
    : 999;
  const isUrgentTravel = hoursToCheckIn <= 24 && hoursToCheckIn > 0;

  // Handle Send Reply (Public or Internal Note)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSendingReply(true);
    try {
      const recipientType =
        activeTab === 'internal'
          ? 'internal_agent_only'
          : activeTab === 'supplier'
          ? 'supplier_side'
          : 'agency_public';

      const convId = activeTab === 'supplier' ? selectedSideConvId : 'main';

      await api.sendMessage(ticket.id, {
        conversationId: convId,
        content: replyText.trim(),
        recipientType,
      });

      setReplyText('');
      loadTicketData();
    } catch (err: any) {
      alert(`Failed to send message: ${err.message}`);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Handle Create Side Conversation
  const handleCreateSideConv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sideConvTitle || !sideConvSupplier || !sideConvEmail || !sideConvMessage) {
      alert('Please fill out all supplier side conversation fields.');
      return;
    }

    try {
      await api.createSideConversation(ticket.id, {
        title: sideConvTitle,
        supplierName: sideConvSupplier,
        recipients: [
          { name: sideConvSupplier, email: sideConvEmail, type: 'supplier' },
          { name: currentUser?.name || 'TBO Agent', email: currentUser?.email || 'ops@tbo.com', type: 'internal' },
        ],
        initialMessage: sideConvMessage,
      });

      setIsCreatingSideConv(false);
      setSideConvTitle('');
      setSideConvSupplier('');
      setSideConvEmail('');
      setSideConvMessage('');
      loadTicketData();
    } catch (err: any) {
      alert(`Failed to create side conversation: ${err.message}`);
    }
  };

  // Handle Claim Ticket
  const handleClaimTicket = async () => {
    if (!currentUser) return;
    try {
      const { ticket: updated } = await api.updateTicket(ticket.id, {
        assignedAgentId: currentUser.id,
        assignedAgentName: currentUser.name,
        routingReason: `Claimed directly from queue by ${currentUser.name}`,
        status: ticket.status === 'New' ? 'Open' : ticket.status,
      });
      setTicket(updated);
      onTicketUpdated(updated);
      loadTicketData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Reassign Agent
  const handleReassignAgent = async (newAgentId: string) => {
    const targetAgent = allUsers.find((u: User) => u.id === newAgentId);
    if (!targetAgent) return;

    try {
      const { ticket: updated } = await api.updateTicket(ticket.id, {
        assignedAgentId: targetAgent.id,
        assignedAgentName: targetAgent.name,
        routingReason: `Manual supervisor reassignment to ${targetAgent.name}`,
      });
      setTicket(updated);
      setSelectedAgentId(targetAgent.id);
      onTicketUpdated(updated);
      loadTicketData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle AI Summarize
  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const res = await api.summarizeTicket(ticket.id);
      setAiSummary(res.summary);
    } catch (err: any) {
      setAiSummary('Failed to generate summary.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Handle AI Suggest Draft
  const handleSuggestDraft = async (target: 'Agency' | 'Supplier') => {
    setIsSuggestingDraft(true);
    try {
      const res = await api.suggestReply(ticket.id, target);
      setReplyText(res.draft);
    } catch (err: any) {
      alert('Draft suggestion failed.');
    } finally {
      setIsSuggestingDraft(false);
    }
  };

  // Unlink a ticket
  const handleUnlink = async (targetId: string) => {
    if (!confirm(`Are you sure you want to unlink ticket ${targetId}?`)) return;
    try {
      await api.unlinkTickets(ticket.id, targetId);
      loadTicketData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const activeSideConv = sideConversations.find((c) => c.id === selectedSideConvId);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Top Action Breadcrumb Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            ← Back to Queue
          </button>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-slate-900">{ticket.id}</span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {ticket.tboh}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-bold text-slate-700">{ticket.agencyName}</span>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Claim Button if unassigned */}
          {!isAgency && !ticket.assignedAgentId && (
            <button
              onClick={handleClaimTicket}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Claim Ticket</span>
            </button>
          )}

          {/* Link Ticket Button */}
          {!isAgency && (
            <button
              onClick={() => setIsLinkOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer"
              title="Link related cases"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Link Cases</span>
            </button>
          )}

          {/* Escalate Button */}
          {!isAgency && ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
            <button
              onClick={() => setIsEscalateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Escalate Case</span>
            </button>
          )}

          {/* Resolve Button */}
          {!isAgency && ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
            <button
              onClick={() => setIsResolveOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Resolve Case</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
        {/* Left 2 Columns: Context Details + Communications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Case Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            {/* Urgency Alert Banner if check-in is <24h */}
            {isUrgentTravel && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
                  <span>CRITICAL TRAVEL URGENCY: Guest Check-in within {Math.round(hoursToCheckIn)} hours!</span>
                </div>
                <span className="font-mono text-[11px] font-semibold bg-rose-100 px-2 py-0.5 rounded">
                  Check-in: {ticket.bookingContext.checkInDate}
                </span>
              </div>
            )}

            {/* Title & Metadata Strip */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-slate-100 text-slate-700">
                  {ticket.category}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    ticket.priority === 'Urgent'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : ticket.priority === 'High'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-sky-50 text-sky-700 border-sky-200'
                  }`}
                >
                  {ticket.priority} Priority
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    ticket.status === 'Escalated'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : ticket.status === 'Resolved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  Status: {ticket.status}
                </span>

                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-500 font-mono">
                  Region: {ticket.region}
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {ticket.title}
              </h2>
              <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                {ticket.description}
              </p>
            </div>

            {/* Travel Context Grid */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Travel & Booking Context (TBOH)</span>
                </span>
                <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {ticket.tboh}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Lead Guest
                  </span>
                  <span className="font-semibold text-slate-800">
                    {ticket.bookingContext.passengerName} ({ticket.bookingContext.paxCount} Pax)
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Hotel / Airline
                  </span>
                  <span className="font-semibold text-slate-800 truncate block" title={ticket.bookingContext.hotelOrFlightName}>
                    {ticket.bookingContext.hotelOrFlightName}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Supplier & Ref
                  </span>
                  <span className="font-semibold text-slate-800">
                    {ticket.bookingContext.supplierName} ({ticket.bookingContext.supplierReference})
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Booking Value
                  </span>
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {ticket.bookingContext.currency} ${ticket.bookingContext.bookingAmount}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Check-in Date
                  </span>
                  <span className="font-semibold text-slate-800">
                    {ticket.bookingContext.checkInDate}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    LCD Deadline
                  </span>
                  <span className="font-semibold text-slate-800">
                    {ticket.bookingContext.lcd}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Destination
                  </span>
                  <span className="font-semibold text-slate-800">
                    {ticket.bookingContext.destination}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Travel Agency
                  </span>
                  <span className="font-semibold text-slate-800">
                    {ticket.agencyName}
                  </span>
                </div>
              </div>
            </div>

            {/* Context-Rich Ticket Linking Panel */}
            {linkedTickets.length > 0 && (
              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-indigo-700" />
                    <span className="text-xs font-bold text-indigo-900">
                      Connected Cases on this Booking ({linkedTickets.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-indigo-700 font-medium">
                    Same TBOH: {ticket.tboh}
                  </span>
                </div>

                <div className="divide-y divide-indigo-100 bg-white rounded-lg border border-indigo-100 overflow-hidden">
                  {linkedTickets.map((lt) => (
                    <div
                      key={lt.id}
                      className="p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{lt.id}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded border bg-slate-100 text-slate-700">
                            {lt.category}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                              lt.status === 'Resolved'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {lt.status}
                          </span>
                        </div>
                        <p className="text-slate-700 text-xs font-medium truncate mt-0.5">
                          {lt.title}
                        </p>
                        {lt.resolutionSummary && (
                          <p className="text-[11px] text-emerald-800 mt-1 bg-emerald-50/60 p-1.5 rounded border border-emerald-100">
                            <strong>Previous Resolution:</strong> {lt.resolutionSummary}
                          </p>
                        )}
                      </div>

                      {!isAgency && (
                        <button
                          onClick={() => handleUnlink(lt.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Unlink this case"
                        >
                          <Unlink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Smart Routing Explanation Banner */}
            {ticket.routingReason && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Smart Routing Decision Reason
                </span>
                <p className="text-slate-700 font-medium">{ticket.routingReason}</p>
              </div>
            )}
          </div>

          {/* Communications Hub (Public Replies, Internal Notes, Supplier Side Conversations) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Tab Bar */}
            <div className="px-6 pt-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('public')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'public'
                      ? 'border-sky-600 text-sky-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Customer Messages ({publicMessages.length})
                </button>

                {!isAgency && (
                  <button
                    onClick={() => setActiveTab('internal')}
                    className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'internal'
                        ? 'border-amber-600 text-amber-800'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Lock className="w-3 h-3 text-amber-600" />
                    <span>Internal Agent Notes ({internalNotes.length})</span>
                  </button>
                )}

                {!isAgency && (
                  <button
                    onClick={() => setActiveTab('supplier')}
                    className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'supplier'
                        ? 'border-indigo-600 text-indigo-800'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Building2 className="w-3 h-3 text-indigo-600" />
                    <span>Supplier Side Conversations ({sideConversations.length})</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'timeline'
                      ? 'border-slate-800 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <History className="w-3 h-3" />
                  <span>Activity Timeline ({timelineEvents.length})</span>
                </button>
              </div>

              {/* AI Draft Suggestion Button */}
              {!isAgency && activeTab !== 'timeline' && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSuggestDraft(activeTab === 'supplier' ? 'Supplier' : 'Agency')}
                    disabled={isSuggestingDraft}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isSuggestingDraft ? 'Drafting...' : 'AI Draft Reply'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tab Contents */}
            <div className="p-6">
              {/* TAB 1: Customer Public Messages */}
              {activeTab === 'public' && (
                <div className="space-y-4">
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {publicMessages.length === 0 ? (
                      <p className="text-center text-slate-400 text-xs py-8">
                        No messages yet between agency and support.
                      </p>
                    ) : (
                      publicMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                            msg.senderRole === 'agency'
                              ? 'bg-slate-50 border-slate-200 text-slate-800'
                              : 'bg-sky-50/60 border-sky-100 text-slate-900 ml-4'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-800">
                              {msg.senderName} ({msg.senderRole === 'agency' ? 'Agency Requester' : 'TBO Support'})
                            </span>
                            <span className="text-slate-400 tabular-nums">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="whitespace-pre-line text-slate-700">{msg.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Public Reply Composer */}
                  <form onSubmit={handleSendMessage} className="space-y-2 pt-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      placeholder={
                        isAgency
                          ? 'Send an update or question to TBO support operations...'
                          : 'Write a professional response to travel agency requester...'
                      }
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Public message visible to both Agency & Support agents.
                      </span>
                      <button
                        type="submit"
                        disabled={isSendingReply || !replyText.trim()}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Response</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: Internal Notes (AGENT ONLY) */}
              {activeTab === 'internal' && !isAgency && (
                <div className="space-y-4">
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      Internal Notes are strictly confidential and NEVER visible to agency users.
                    </span>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {internalNotes.length === 0 ? (
                      <p className="text-center text-slate-400 text-xs py-8">
                        No internal notes recorded yet.
                      </p>
                    ) : (
                      internalNotes.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-3.5 bg-amber-50/40 border border-amber-200/80 rounded-xl text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-amber-950">
                              {msg.senderName} (Internal Agent Note)
                            </span>
                            <span className="text-slate-400 tabular-nums">
                              {new Date(msg.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          <p className="whitespace-pre-line text-slate-800">{msg.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Internal Note Composer */}
                  <form onSubmit={handleSendMessage} className="space-y-2 pt-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      placeholder="Add confidential agent note (supplier rates, PMS logs, phone call records)..."
                      className="w-full px-3 py-2 text-xs bg-amber-50/20 border border-amber-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-700 font-medium">
                        Stored with audit trail; hidden from client.
                      </span>
                      <button
                        type="submit"
                        disabled={isSendingReply || !replyText.trim()}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Save Internal Note</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: Supplier Side Conversations */}
              {activeTab === 'supplier' && !isAgency && (
                <div className="space-y-4">
                  {/* Top Bar for Side Conversations: selector + New Thread button */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-700">Active Threads:</span>
                      {sideConversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => setSelectedSideConvId(conv.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                            selectedSideConvId === conv.id
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {conv.supplierName}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setIsCreatingSideConv(!isCreatingSideConv)}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Supplier Thread</span>
                    </button>
                  </div>

                  {/* Create Side Conv Form */}
                  {isCreatingSideConv && (
                    <form onSubmit={handleCreateSideConv} className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-3 text-xs">
                      <h4 className="font-bold text-indigo-900">
                        Initiate Supplier Side Conversation
                      </h4>
                      <p className="text-indigo-800 text-[11px]">
                        Recipient emails are strictly preserved across ticket transfers.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">
                            Thread Subject *
                          </label>
                          <input
                            type="text"
                            value={sideConvTitle}
                            onChange={(e) => setSideConvTitle(e.target.value)}
                            placeholder="e.g. Urgent Voucher Verification - HB Ref #HB-984210"
                            required
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-medium mb-1">
                            Supplier / Property Name *
                          </label>
                          <input
                            type="text"
                            value={sideConvSupplier}
                            onChange={(e) => setSideConvSupplier(e.target.value)}
                            placeholder="e.g. Hotelbeds Operations Desk"
                            required
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          Supplier Recipient Email(s) *
                        </label>
                        <input
                          type="email"
                          value={sideConvEmail}
                          onChange={(e) => setSideConvEmail(e.target.value)}
                          placeholder="e.g. urgent-support@hotelbeds.com"
                          required
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          Initial Inquiry Message *
                        </label>
                        <textarea
                          value={sideConvMessage}
                          onChange={(e) => setSideConvMessage(e.target.value)}
                          rows={3}
                          placeholder="State booking ref, guest status, and exact action requested from supplier..."
                          required
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCreatingSideConv(false)}
                          className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                        >
                          Send to Supplier
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Active Side Conversation Message View */}
                  {activeSideConv ? (
                    <div className="space-y-4">
                      {/* Recipient Preservation Bar */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            {activeSideConv.title}
                          </span>
                          <span className="font-mono text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-medium">
                            Status: {activeSideConv.status}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px]">
                          <strong>Preserved Recipients:</strong>{' '}
                          {activeSideConv.recipients.map((r) => `${r.name} <${r.email}>`).join(', ')}
                        </p>
                      </div>

                      {/* Messages list */}
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {activeSideConv.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                              m.senderRole === 'Supplier'
                                ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950 ml-4'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold">
                                {m.senderName} ({m.senderRole})
                              </span>
                              <span className="text-slate-400 tabular-nums">
                                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="whitespace-pre-line text-slate-800">{m.content}</p>
                          </div>
                        ))}
                      </div>

                      {/* Message composer for side thread */}
                      <form onSubmit={handleSendMessage} className="space-y-2 pt-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                          placeholder={`Reply to ${activeSideConv.supplierName}...`}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                        />
                        <div className="flex items-center justify-end">
                          <button
                            type="submit"
                            disabled={isSendingReply || !replyText.trim()}
                            className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Supplier Update</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No supplier side conversation selected. Click "New Supplier Thread" to start one.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Activity Timeline */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {timelineEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                      >
                        <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900">
                              {evt.eventType.replace('_', ' ')}
                            </span>
                            <span className="text-[11px] text-slate-400 tabular-nums">
                              {new Date(evt.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-0.5">{evt.description}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Actor: {evt.actorName} ({evt.actorRole})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Column: SLA Clock, Owner Assignment, AI Intelligence Panel */}
        <div className="space-y-6">
          {/* SLA Status Widget */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Travel-Aware SLA Radar</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tabular-nums ${
                  ticket.slaStatus === 'Breached'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                    : ticket.slaStatus === 'At Risk'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {ticket.slaStatus}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Target SLA Window:</span>
                <span className="font-bold text-slate-800 tabular-nums">
                  {ticket.slaTargetHours} Hours
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Time Remaining:</span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    ticket.slaRemainingMinutes < 0
                      ? 'text-rose-600'
                      : ticket.slaRemainingMinutes < 60
                      ? 'text-amber-600'
                      : 'text-emerald-700'
                  }`}
                >
                  {ticket.slaRemainingMinutes < 0
                    ? `Overdue by ${Math.abs(ticket.slaRemainingMinutes)}m`
                    : `${ticket.slaRemainingMinutes} Minutes`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Resolution Deadline:</span>
                <span className="text-slate-700 font-mono text-[11px]">
                  {new Date(ticket.slaDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {ticket.isEscalated && (
                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] space-y-1">
                  <p className="font-bold">Escalated to Management Queue</p>
                  <p className="text-[10px] text-rose-700">
                    Reason: {ticket.escalationReason}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Ownership & Assignment */}
          {!isAgency && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Queue Ownership & Reassignment
              </span>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">
                    Current Assigned Agent:
                  </span>
                  <div className="flex items-center gap-2 font-bold text-slate-900 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs">
                      {ticket.assignedAgentName ? ticket.assignedAgentName.charAt(0) : '?'}
                    </div>
                    <span>{ticket.assignedAgentName || 'Unassigned / Triage'}</span>
                  </div>
                </div>

                {/* Supervisor Reassign Dropdown */}
                {(isManager || isAdmin) && (
                  <div className="pt-2">
                    <label className="text-[11px] text-slate-500 block mb-1">
                      Reassign Case Owner:
                    </label>
                    <select
                      value={selectedAgentId}
                      onChange={(e) => handleReassignAgent(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="">Select agent...</option>
                      {allUsers
                        .filter((u: User) => u.role === 'agent' || u.role === 'escalation_manager')
                        .map((ag: User) => (
                          <option key={ag.id} value={ag.id}>
                            {ag.name} ({ag.role === 'escalation_manager' ? 'Manager' : ag.region})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Case Intelligence Panel */}
          <div className="bg-gradient-to-br from-purple-50/60 to-sky-50/40 rounded-xl border border-purple-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
              <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                <span>AI Case Intelligence</span>
              </span>
              <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded font-medium">
                Gemini 3.8
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                  Predicted Intent ({ticket.classificationMethod})
                </span>
                <p className="font-semibold text-slate-900 bg-white p-2.5 rounded-lg border border-purple-100">
                  {ticket.intent}
                </p>
              </div>

              {/* Generate Summary Action */}
              <div>
                <button
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                  className="w-full py-1.5 px-3 bg-white hover:bg-purple-50 border border-purple-200 rounded-lg text-purple-800 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-purple-600" />
                  <span>{isGeneratingSummary ? 'Analyzing Case...' : 'Generate Case Summary'}</span>
                </button>

                {aiSummary && (
                  <div className="mt-2 p-3 bg-white rounded-lg border border-purple-200 text-xs text-slate-800 space-y-1 animate-in fade-in">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                      Executive Case Summary
                    </span>
                    <p className="whitespace-pre-line text-[11px] leading-relaxed">{aiSummary}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EscalateModal
        isOpen={isEscalateOpen}
        onClose={() => setIsEscalateOpen(false)}
        ticket={ticket}
        onEscalated={(updated) => {
          setTicket(updated);
          onTicketUpdated(updated);
          loadTicketData();
        }}
      />

      <LinkTicketModal
        isOpen={isLinkOpen}
        onClose={() => setIsLinkOpen(false)}
        ticket={ticket}
        availableTickets={allTickets}
        onLinked={loadTicketData}
      />

      <ResolveModal
        isOpen={isResolveOpen}
        onClose={() => setIsResolveOpen(false)}
        ticket={ticket}
        onResolved={(updated) => {
          setTicket(updated);
          onTicketUpdated(updated);
          loadTicketData();
        }}
      />
    </div>
  );
};
