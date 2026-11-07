import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Ticket } from '../../types/index.ts';
import {
  MessageSquare,
  Building2,
  Lock,
  Send,
  UserCheck,
  Search,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface ConversationsViewProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({
  tickets,
  onSelectTicket,
}) => {
  const { userProfile, isAgency } = useAuth();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'hotelbeds' | 'expedia' | 'webbeds'>('all');

  // Filter tickets with active supplier communications
  const filteredTickets = tickets.filter((t) => {
    if (filterType !== 'all') {
      if (!t.bookingContext.supplierName.toLowerCase().includes(filterType)) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.id.toLowerCase().includes(q) ||
        t.tboh.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.bookingContext.supplierName.toLowerCase().includes(q) ||
        t.bookingContext.passengerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Supplier Side Conversations
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Dedicated operational communication channels with hotel bedbanks, airlines & local property duty managers.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded-lg text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Recipient lists persist across ticket transfers</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search supplier conversations by ID, TBOH, Supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
              filterType === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Suppliers
          </button>
          <button
            onClick={() => setFilterType('hotelbeds')}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
              filterType === 'hotelbeds'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Hotelbeds
          </button>
          <button
            onClick={() => setFilterType('expedia')}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
              filterType === 'expedia'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Expedia Partner
          </button>
          <button
            onClick={() => setFilterType('webbeds')}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
              filterType === 'webbeds'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            WebBeds
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No supplier conversation cases matching your filter.
          </div>
        ) : (
          filteredTickets.map((t) => (
            <div
              key={t.id}
              onClick={() => onSelectTicket(t)}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer transition-colors text-xs"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">{t.id}</span>
                  <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 rounded font-semibold">
                    {t.tboh}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Supplier: {t.bookingContext.supplierName}
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 rounded">
                    Ref: {t.bookingContext.supplierReference}
                  </span>
                </div>

                <h4 className="font-bold text-slate-800 truncate">{t.title}</h4>
                <p className="text-slate-500 text-[11px]">
                  Property: {t.bookingContext.hotelOrFlightName} · Guest: {t.bookingContext.passengerName} · Agency: {t.agencyName}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-slate-500 block">
                    Assigned: {t.assignedAgentName || 'Unassigned'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    SLA: {t.slaStatus}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
