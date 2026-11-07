import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Ticket, TicketStatus } from '../../types/index.ts';
import { TicketList } from '../tickets/TicketList.tsx';
import { TicketDetail } from '../tickets/TicketDetail.tsx';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  Flame,
  CheckCircle2,
  UserCheck,
  Building2,
  DollarSign,
} from 'lucide-react';

interface EscalationCenterProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  selectedTicket: Ticket | null;
  onClearSelectedTicket: () => void;
  onTicketUpdated: (ticket: Ticket) => void;
  isLoading?: boolean;
}

export const EscalationCenter: React.FC<EscalationCenterProps> = ({
  tickets,
  onSelectTicket,
  selectedTicket,
  onClearSelectedTicket,
  onTicketUpdated,
  isLoading,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'escalated' | 'breached' | 'urgent-travel' | 'all-risk'>('escalated');

  const escalatedTickets = tickets.filter(
    (t) => t.isEscalated || t.status === 'Escalated'
  );

  const breachedTickets = tickets.filter(
    (t) => t.slaStatus === 'Breached' && t.status !== 'Resolved' && t.status !== 'Closed'
  );

  const urgentTravelTickets = tickets.filter((t) => {
    if (!t.bookingContext?.checkInDate) return false;
    const hours = (new Date(t.bookingContext.checkInDate).getTime() - Date.now()) / (1000 * 60 * 60);
    return hours <= 24 && hours > 0 && t.status !== 'Resolved' && t.status !== 'Closed';
  });

  const highFinancialTickets = tickets.filter(
    (t) => t.bookingContext.bookingAmount >= 2000 && t.status !== 'Resolved' && t.status !== 'Closed'
  );

  let displayedTickets = escalatedTickets;
  if (activeTab === 'breached') displayedTickets = breachedTickets;
  else if (activeTab === 'urgent-travel') displayedTickets = urgentTravelTickets;
  else if (activeTab === 'all-risk') {
    // Union of escalated, breached, and urgent travel
    const set = new Set([...escalatedTickets, ...breachedTickets, ...urgentTravelTickets]);
    displayedTickets = Array.from(set);
  }

  if (selectedTicket) {
    return (
      <TicketDetail
        ticketId={selectedTicket.id}
        onBack={onClearSelectedTicket}
        onTicketUpdated={onTicketUpdated}
        allTickets={tickets}
      />
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-bold tracking-tight">
              Operations Escalation Command Centre
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Managerial oversight for SLA breaches, guest displacement alerts & supplier deadlocks.
          </p>
        </div>

        {/* Manager KPI Counters */}
        <div className="flex items-center gap-3">
          <div className="bg-white/10 px-3 py-2 rounded-lg text-center backdrop-blur-xs">
            <span className="text-[10px] uppercase font-bold text-slate-300 block">
              Active Escalations
            </span>
            <span className="text-lg font-bold text-amber-400 tabular-nums">
              {escalatedTickets.length}
            </span>
          </div>

          <div className="bg-white/10 px-3 py-2 rounded-lg text-center backdrop-blur-xs">
            <span className="text-[10px] uppercase font-bold text-slate-300 block">
              SLA Breached
            </span>
            <span className="text-lg font-bold text-rose-400 tabular-nums">
              {breachedTickets.length}
            </span>
          </div>

          <div className="bg-white/10 px-3 py-2 rounded-lg text-center backdrop-blur-xs">
            <span className="text-[10px] uppercase font-bold text-slate-300 block">
              Check-in &lt; 24h
            </span>
            <span className="text-lg font-bold text-sky-400 tabular-nums">
              {urgentTravelTickets.length}
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Queue Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('escalated')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'escalated'
              ? 'bg-rose-600 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Active Escalations Queue</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/20">
            {escalatedTickets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('breached')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'breached'
              ? 'bg-rose-600 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>SLA Breached Cases</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/20">
            {breachedTickets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('urgent-travel')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'urgent-travel'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Check-in Arrival &lt; 24h</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-200 text-slate-700">
            {urgentTravelTickets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all-risk')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'all-risk'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Combined Risk Radar</span>
        </button>
      </div>

      {/* Escalation Table */}
      <div className="h-[calc(100vh-250px)]">
        <TicketList
          tickets={displayedTickets}
          onSelectTicket={onSelectTicket}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
