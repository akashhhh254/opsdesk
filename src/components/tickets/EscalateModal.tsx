import React, { useState } from 'react';
import { Ticket } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { AlertTriangle, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface EscalateModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket;
  onEscalated: (updatedTicket: Ticket) => void;
}

export const EscalateModal: React.FC<EscalateModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onEscalated,
}) => {
  const [reasonCategory, setReasonCategory] = useState(
    'Supplier Non-Responsive on live check-in case'
  );
  const [customDetails, setCustomDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const fullReason = `${reasonCategory}: ${customDetails.trim() || 'Escalated for senior operations manager intervention.'}`;

    try {
      const { ticket: updated } = await api.escalateTicket(ticket.id, fullReason);
      onEscalated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to escalate ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2 text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3 className="text-sm font-bold">Escalate Case to Operations Management</h3>
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
              <span>{ticket.id}</span>
              <span className="text-slate-500 font-sans text-[11px] font-normal">
                Ref: {ticket.tboh}
              </span>
            </div>
            <p className="text-slate-600 font-medium truncate">{ticket.title}</p>
            <p className="text-slate-500 text-[11px]">
              Guest: {ticket.bookingContext.passengerName} · Supplier: {ticket.bookingContext.supplierName}
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Primary Escalation Reason *
            </label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden"
            >
              <option value="Supplier Non-Responsive on live check-in case">
                Supplier Non-Responsive on live check-in case
              </option>
              <option value="Guest Displaced / Stranded at Property Front Desk">
                Guest Displaced / Stranded at Property Front Desk
              </option>
              <option value="SLA Resolution Target Breached">
                SLA Resolution Target Breached
              </option>
              <option value="High Financial Dispute / Debit Claim (> $1,000)">
                High Financial Dispute / Debit Claim (&gt; $1,000)
              </option>
              <option value="Executive Partner / Platinum Agency Request">
                Executive Partner / Platinum Agency Request
              </option>
              <option value="GDS Ticketing Deadlock / Carrier Refusal">
                GDS Ticketing Deadlock / Carrier Refusal
              </option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Escalation Notes & Specific Blockers
            </label>
            <textarea
              value={customDetails}
              onChange={(e) => setCustomDetails(e.target.value)}
              rows={3}
              placeholder="Explain the supplier blocker, attempted resolutions, and why manager intervention is required..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden resize-none"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
              <span>Escalation Protocol Effects</span>
            </p>
            <ul className="list-disc list-inside text-amber-800 space-y-0.5">
              <li>Ownership is transferred directly to Escalation Lead Elena Rostova.</li>
              <li>Ticket status is set to <strong>Escalated</strong> and priority elevated to <strong>Urgent</strong>.</li>
              <li>Recorded in manager radar with audit timeline timestamp.</li>
            </ul>
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
              disabled={isSubmitting}
              className="px-4 py-1.5 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Escalating...' : 'Confirm Escalation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
