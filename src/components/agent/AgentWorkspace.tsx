import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Ticket, TicketStatus } from '../../types/index.ts';
import { TicketList } from '../tickets/TicketList.tsx';
import { TicketDetail } from '../tickets/TicketDetail.tsx';
import {
  Inbox,
  AlertTriangle,
  Clock,
  CheckCircle2,
  UserCheck,
  ShieldAlert,
  Flame,
} from 'lucide-react';

interface AgentWorkspaceProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  selectedTicket: Ticket | null;
  onClearSelectedTicket: () => void;
  onTicketUpdated: (ticket: Ticket) => void;
  isLoading?: boolean;
}

export const AgentWorkspace: React.FC<AgentWorkspaceProps> = ({
  tickets,
  onSelectTicket,
  selectedTicket,
  onClearSelectedTicket,
  onTicketUpdated,
  isLoading,
}) => {
  const { currentUser } = useAuth();
  const [activeQueueTab, setActiveQueueTab] = useState<
    'my-queue' | 'unassigned' | 'at-risk' | 'urgent' | 'all'
  >('my-queue');
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'All'>('All');

  // Queues
  const myQueue = tickets.filter(
    (t) => t.assignedAgentId === currentUser?.id && t.status !== 'Resolved' && t.status !== 'Closed'
  );
  const unassignedQueue = tickets.filter(
    (t) => !t.assignedAgentId && t.status !== 'Resolved' && t.status !== 'Closed'
  );
  const atRiskQueue = tickets.filter(
    (t) => (t.slaStatus === 'At Risk' || t.slaStatus === 'Breached') && t.status !== 'Resolved' && t.status !== 'Closed'
  );
  const urgentQueue = tickets.filter(
    (t) => t.priority === 'Urgent' && t.status !== 'Resolved' && t.status !== 'Closed'
  );

  let displayedTickets = tickets;
  if (activeQueueTab === 'my-queue') displayedTickets = myQueue;
  else if (activeQueueTab === 'unassigned') displayedTickets = unassignedQueue;
  else if (activeQueueTab === 'at-risk') displayedTickets = atRiskQueue;
  else if (activeQueueTab === 'urgent') displayedTickets = urgentQueue;

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
      {/* Top Welcome & KPI Metrics Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Support Agent Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operations desk for {currentUser?.name} · Specialization:{' '}
            <span className="font-semibold text-slate-700">
              {currentUser?.specialization?.join(', ') || 'General Operations'}
            </span>
          </p>
        </div>

        {/* Quick KPI Count Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-xs flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">My Active:</span>
            <span className="font-bold text-slate-900 tabular-nums">{myQueue.length}</span>
          </div>

          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg shadow-xs flex items-center gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-amber-900 font-medium">At-Risk SLA:</span>
            <span className="font-bold text-amber-900 tabular-nums">{atRiskQueue.length}</span>
          </div>

          <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg shadow-xs flex items-center gap-2 text-xs">
            <Flame className="w-3.5 h-3.5 text-rose-600" />
            <span className="text-rose-900 font-medium">Triage Unassigned:</span>
            <span className="font-bold text-rose-900 tabular-nums">{unassignedQueue.length}</span>
          </div>
        </div>
      </div>

      {/* Segmented Queue Selector Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveQueueTab('my-queue')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeQueueTab === 'my-queue'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>My Assigned Queue</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/20">
            {myQueue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveQueueTab('unassigned')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeQueueTab === 'unassigned'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Triage / Unassigned</span>
          {unassignedQueue.length > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-500 text-white font-bold">
              {unassignedQueue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveQueueTab('at-risk')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeQueueTab === 'at-risk'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>At-Risk & Breached SLA</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-500 text-white font-bold">
            {atRiskQueue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveQueueTab('urgent')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeQueueTab === 'urgent'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Urgent Priority</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-200 text-slate-700">
            {urgentQueue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveQueueTab('all')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeQueueTab === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>All Permitted Tickets</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-200 text-slate-700">
            {tickets.length}
          </span>
        </button>
      </div>

      {/* Embedded Ticket List */}
      <div className="h-[calc(100vh-230px)]">
        <TicketList
          tickets={displayedTickets}
          onSelectTicket={onSelectTicket}
          isLoading={isLoading}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
        />
      </div>
    </div>
  );
};
