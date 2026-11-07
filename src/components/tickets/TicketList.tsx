import React, { useState } from 'react';
import { Ticket, TicketPriority, TicketStatus, Region, TicketCategory } from '../../types/index.ts';
import {
  Search,
  Filter,
  AlertCircle,
  Clock,
  Building2,
  Plane,
  Link as LinkIcon,
  ChevronRight,
  ArrowUpDown,
  CheckCircle2,
  Inbox,
} from 'lucide-react';

interface TicketListProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  selectedTicketId?: string;
  isLoading?: boolean;
  filterStatus?: TicketStatus | 'All';
  onFilterStatusChange?: (status: TicketStatus | 'All') => void;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  onSelectTicket,
  selectedTicketId,
  isLoading,
  filterStatus = 'All',
  onFilterStatusChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Filter client-side
  const filtered = tickets.filter((t) => {
    if (filterStatus !== 'All' && t.status !== filterStatus) return false;
    if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
    if (regionFilter !== 'All' && t.region !== regionFilter) return false;
    if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.tboh.toLowerCase().includes(q) ||
        t.agencyName.toLowerCase().includes(q) ||
        t.bookingContext.passengerName.toLowerCase().includes(q) ||
        t.bookingContext.hotelOrFlightName.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getPriorityStyle = (priority: TicketPriority) => {
    switch (priority) {
      case 'Urgent':
        return 'text-rose-700 bg-rose-50 border-rose-200 font-bold';
      case 'High':
        return 'text-amber-700 bg-amber-50 border-amber-200 font-semibold';
      case 'Medium':
        return 'text-sky-700 bg-sky-50 border-sky-200';
      case 'Low':
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'New':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Open':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Escalated':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Closed':
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const renderSlaIndicator = (ticket: Ticket) => {
    if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Resolved</span>
        </span>
      );
    }

    if (ticket.slaStatus === 'Breached') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 tabular-nums">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          <span>Breached ({Math.abs(ticket.slaRemainingMinutes)}m ago)</span>
        </span>
      );
    }

    if (ticket.slaStatus === 'At Risk') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 tabular-nums animate-pulse">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>At Risk ({ticket.slaRemainingMinutes}m left)</span>
        </span>
      );
    }

    const hours = Math.round(ticket.slaRemainingMinutes / 60);
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 tabular-nums">
        <Clock className="w-3 h-3 text-slate-400" />
        <span>{hours > 0 ? `${hours}h left` : `${ticket.slaRemainingMinutes}m left`}</span>
      </span>
    );
  };

  // Check if passenger check-in is urgent (<24h)
  const isUrgentTravel = (ticket: Ticket) => {
    if (!ticket.bookingContext?.checkInDate) return false;
    const hours = (new Date(ticket.bookingContext.checkInDate).getTime() - Date.now()) / (1000 * 60 * 60);
    return hours <= 24 && hours > 0;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Filter and Search Bar */}
      <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Ticket ID, TBOH, Guest, Hotel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Quick Segmented Status Tabs */}
          {onFilterStatusChange && (
            <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-lg text-xs font-medium shrink-0">
              {(['All', 'Open', 'Escalated', 'Resolved'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => onFilterStatusChange(st)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    filterStatus === st
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Filters:
          </span>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 text-xs focus:outline-hidden"
          >
            <option value="All">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 text-xs focus:outline-hidden"
          >
            <option value="All">All Regions</option>
            <option value="EMEA">EMEA</option>
            <option value="APAC">APAC</option>
            <option value="Americas">Americas</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 text-xs focus:outline-hidden max-w-xs"
          >
            <option value="All">All Categories</option>
            <option value="Hotel Confirmation">Hotel Confirmation</option>
            <option value="Booking Failure">Booking Failure</option>
            <option value="Refund Delay">Refund Delay</option>
            <option value="Cancellation">Cancellation</option>
            <option value="Flight Ticket Issue">Flight Ticket Issue</option>
            <option value="Inventory Synchronization">Inventory Synchronization</option>
            <option value="Special Request">Special Request</option>
          </select>

          {(searchQuery || priorityFilter !== 'All' || regionFilter !== 'All' || categoryFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setPriorityFilter('All');
                setRegionFilter('All');
                setCategoryFilter('All');
              }}
              className="text-[11px] text-sky-600 hover:text-sky-800 underline ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Ticket Rows Table */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-xs space-y-2">
            <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading travel operations queue...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600 text-sm">No tickets found</p>
            <p>Try adjusting your search query or active filter settings.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((ticket) => {
              const isSelected = ticket.id === selectedTicketId;
              const hasLinked = ticket.linkedTicketIds && ticket.linkedTicketIds.length > 0;
              const urgentTravel = isUrgentTravel(ticket);

              return (
                <div
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket)}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer ${
                    isSelected ? 'bg-sky-50/50 border-l-4 border-l-sky-600' : ''
                  }`}
                >
                  {/* Left Column: ID, Title, Travel Context Metadata */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Top Row: Ticket ID + TBOH + Priority + Status */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                        {ticket.id}
                      </span>

                      <span className="text-slate-300">·</span>

                      {/* TBOH Booking Ref */}
                      <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {ticket.tboh}
                      </span>

                      {/* Context Link Indicator */}
                      {hasLinked && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200"
                          title={`Linked with ${ticket.linkedTicketIds.join(', ')}`}
                        >
                          <LinkIcon className="w-2.5 h-2.5" />
                          <span>{ticket.linkedTicketIds.length} Linked</span>
                        </span>
                      )}

                      {/* Priority Badge */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider ${getPriorityStyle(
                          ticket.priority
                        )}`}
                      >
                        {ticket.priority}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border font-medium ${getStatusBadge(
                          ticket.status
                        )}`}
                      >
                        {ticket.status}
                      </span>

                      {/* Travel Urgency Pill if check-in < 24h */}
                      {urgentTravel && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 animate-pulse">
                          <span>Check-in &lt; 24h</span>
                        </span>
                      )}
                    </div>

                    {/* Middle: Title */}
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {ticket.title}
                    </h4>

                    {/* Bottom: Context-rich clean metadata without pill sandwich */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-medium text-slate-700">{ticket.agencyName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate max-w-[200px]">
                        {ticket.bookingContext.hotelOrFlightName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Pax: {ticket.bookingContext.passengerName}</span>
                      <span aria-hidden="true">·</span>
                      <span>Supplier: {ticket.bookingContext.supplierName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-400">
                        Check-in: {ticket.bookingContext.checkInDate}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Routing & SLA Countdown */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* SLA countdown */}
                    {renderSlaIndicator(ticket)}

                    {/* Assigned Owner */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                        {ticket.assignedAgentName ? ticket.assignedAgentName.charAt(0) : '?'}
                      </div>
                      <span className="text-[11px] font-medium text-slate-700 truncate max-w-[120px]">
                        {ticket.assignedAgentName || 'Unassigned'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-1 hidden sm:block" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span>
          Showing <strong className="text-slate-800">{filtered.length}</strong> of{' '}
          <strong className="text-slate-800">{tickets.length}</strong> tickets
        </span>
        <span className="text-[11px] text-slate-400">
          Auto-synchronized with TBO Operations Server
        </span>
      </div>
    </div>
  );
};
