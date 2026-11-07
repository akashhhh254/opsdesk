import React, { useState } from 'react';
import { Ticket, TicketLink } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { Link as LinkIcon, X, Search, AlertCircle } from 'lucide-react';

interface LinkTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket;
  availableTickets: Ticket[];
  onLinked: () => void;
}

export const LinkTicketModal: React.FC<LinkTicketModalProps> = ({
  isOpen,
  onClose,
  ticket,
  availableTickets,
  onLinked,
}) => {
  const [targetTicketId, setTargetTicketId] = useState('');
  const [linkType, setLinkType] = useState<TicketLink['linkType']>('Same Booking');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Candidates for linking (exclude current ticket and already linked ones)
  const candidateTickets = availableTickets.filter(
    (t) =>
      t.id !== ticket.id &&
      (!ticket.linkedTicketIds || !ticket.linkedTicketIds.includes(t.id)) &&
      (search.trim() === '' ||
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        t.tboh.toLowerCase().includes(search.toLowerCase()) ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.bookingContext.passengerName.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTicketId) {
      setError('Please select a target ticket to link.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.linkTickets(
        ticket.id,
        targetTicketId,
        linkType,
        notes || `Linked for context history on ${ticket.tboh}`
      );
      onLinked();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to link tickets');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-2 text-indigo-900">
            <LinkIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold">Context-Rich Ticket Linking</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between font-mono font-bold text-slate-900">
              <span>Source: {ticket.id}</span>
              <span className="text-slate-500 font-sans text-[11px] font-normal">
                Ref: {ticket.tboh}
              </span>
            </div>
            <p className="text-slate-600 font-medium truncate">{ticket.title}</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Link Relationship Type *
            </label>
            <select
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden"
            >
              <option value="Same Booking">Same Booking (Matching TBOH)</option>
              <option value="Repeat Complaint">Repeat Complaint (Same Agency / Property)</option>
              <option value="Related Passenger">Related Passenger / Group Booking</option>
              <option value="Manual Link">Manual Operations Reference</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Target Ticket to Connect *
            </label>

            {/* Quick search inside modal */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidates by ID, TBOH, passenger..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
              {candidateTickets.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  No eligible tickets found to link.
                </div>
              ) : (
                candidateTickets.map((cand) => {
                  const isMatch = cand.tboh.toUpperCase() === ticket.tboh.toUpperCase();
                  const isSelected = cand.id === targetTicketId;
                  return (
                    <div
                      key={cand.id}
                      onClick={() => setTargetTicketId(cand.id)}
                      className={`p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50/70 border-l-4 border-l-indigo-600' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{cand.id}</span>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 rounded">
                            {cand.tboh}
                          </span>
                          {isMatch && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                              Matching TBOH
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-700 truncate mt-0.5">{cand.title}</p>
                        <p className="text-[10px] text-slate-400">
                          {cand.agencyName} · {cand.category} · {cand.status}
                        </p>
                      </div>
                      <input
                        type="radio"
                        name="targetTicket"
                        checked={isSelected}
                        onChange={() => setTargetTicketId(cand.id)}
                        className="accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Context Notes (Visible on Case Timeline)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Rate dispute on same passenger voucher; linked to prevent duplicate supplier credit."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !targetTicketId}
              className="px-4 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Linking...' : 'Connect Cases'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
