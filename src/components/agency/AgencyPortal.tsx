import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Ticket, TicketStatus } from '../../types/index.ts';
import { TicketList } from '../tickets/TicketList.tsx';
import { TicketDetail } from '../tickets/TicketDetail.tsx';
import {
  Building2,
  PlusCircle,
  Search,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileQuestion,
} from 'lucide-react';

interface AgencyPortalProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  selectedTicket: Ticket | null;
  onClearSelectedTicket: () => void;
  onOpenCreateTicket: () => void;
  onTicketUpdated: (ticket: Ticket) => void;
  isLoading?: boolean;
}

export const AgencyPortal: React.FC<AgencyPortalProps> = ({
  tickets,
  onSelectTicket,
  selectedTicket,
  onClearSelectedTicket,
  onOpenCreateTicket,
  onTicketUpdated,
  isLoading,
}) => {
  const { currentUser } = useAuth();
  const [bookingLookupTboh, setBookingLookupTboh] = useState('');
  const [lookupResult, setLookupResult] = useState<Ticket[] | null>(null);

  // Agency only sees their own tickets
  const myAgencyTickets = tickets.filter(
    (t) => t.agencyId === currentUser?.agencyId
  );

  const handleBookingSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingLookupTboh.trim()) {
      setLookupResult(null);
      return;
    }
    const matched = myAgencyTickets.filter(
      (t) => t.tboh.toUpperCase() === bookingLookupTboh.trim().toUpperCase()
    );
    setLookupResult(matched);
  };

  if (selectedTicket) {
    return (
      <TicketDetail
        ticketId={selectedTicket.id}
        onBack={onClearSelectedTicket}
        onTicketUpdated={onTicketUpdated}
        allTickets={myAgencyTickets}
      />
    );
  }

  const openTicketsCount = myAgencyTickets.filter(
    (t) => t.status !== 'Resolved' && t.status !== 'Closed'
  ).length;
  const resolvedTicketsCount = myAgencyTickets.filter(
    (t) => t.status === 'Resolved' || t.status === 'Closed'
  ).length;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto w-full">
      {/* Agency Identity Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">
                {myAgencyTickets[0]?.agencyName || 'Travel Agency Requester Portal'}
              </h1>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Platinum Partner
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Agency Contact: {currentUser?.name} ({currentUser?.email}) · Tenant ID: {currentUser?.agencyId}
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Strict Tenant Isolation Active</span>
              </span>
              <span>·</span>
              <span>All communications audited by TBO</span>
            </div>
          </div>
        </div>

        {/* Action Button & Stats */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-400 block font-medium">Open Cases</span>
            <span className="text-base font-bold text-slate-800 tabular-nums">
              {openTicketsCount}
            </span>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-400 block font-medium">Resolved</span>
            <span className="text-base font-bold text-emerald-700 tabular-nums">
              {resolvedTicketsCount}
            </span>
          </div>

          <button
            onClick={onOpenCreateTicket}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Support Case</span>
          </button>
        </div>
      </div>

      {/* Quick Booking Verification & History Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
          Quick Booking Reference History Search (TBOH)
        </span>

        <form onSubmit={handleBookingSearch} className="flex gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by TBOH e.g. TBOH-984210..."
              value={bookingLookupTboh}
              onChange={(e) => setBookingLookupTboh(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Find Cases
          </button>
          {lookupResult && (
            <button
              type="button"
              onClick={() => {
                setLookupResult(null);
                setBookingLookupTboh('');
              }}
              className="px-2 text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Clear
            </button>
          )}
        </form>

        {lookupResult && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
            <span className="font-semibold text-slate-800">
              Found {lookupResult.length} historical case(s) for booking reference {bookingLookupTboh.toUpperCase()}:
            </span>
            {lookupResult.length === 0 ? (
              <p className="text-slate-500">No support requests have been filed for this booking reference.</p>
            ) : (
              <div className="divide-y divide-slate-200">
                {lookupResult.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTicket(t)}
                    className="py-2 flex items-center justify-between cursor-pointer hover:text-sky-700"
                  >
                    <div>
                      <span className="font-mono font-bold">{t.id}</span> · {t.title}
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white border">
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agency Ticket Queue Table */}
      <div className="h-[calc(100vh-320px)]">
        <TicketList
          tickets={myAgencyTickets}
          onSelectTicket={onSelectTicket}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
