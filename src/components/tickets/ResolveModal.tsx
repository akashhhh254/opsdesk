import React, { useState } from 'react';
import { Ticket } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { CheckCircle2, X, FileCheck2 } from 'lucide-react';

interface ResolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket;
  onResolved: (updatedTicket: Ticket) => void;
}

export const ResolveModal: React.FC<ResolveModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onResolved,
}) => {
  const [resolutionSummary, setResolutionSummary] = useState(
    'Issue investigated with supplier. Confirmation locator verified and re-pushed to hotel PMS. Guest provided check-in voucher.'
  );
  const [rootCause, setRootCause] = useState('Supplier PMS Sync Delay');
  const [creditNoteNumber, setCreditNoteNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionSummary.trim()) {
      setError('Please provide a resolution summary.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const fullSummary = `[${rootCause}] ${resolutionSummary.trim()}${
      creditNoteNumber ? ` (Credit/CN: ${creditNoteNumber})` : ''
    }`;

    try {
      const { ticket: updated } = await api.updateTicket(ticket.id, {
        status: 'Resolved',
        resolvedAt: new Date().toISOString(),
        resolutionSummary: fullSummary,
      });

      onResolved(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold">Resolve Operations Case</h3>
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
              Agency: {ticket.agencyName} · Supplier: {ticket.bookingContext.supplierName}
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Root Cause Category *
            </label>
            <select
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden"
            >
              <option value="Supplier PMS Sync Delay">Supplier PMS Sync Delay</option>
              <option value="Bedbank Rate Differential Rectified">Bedbank Rate Differential Rectified</option>
              <option value="GDS E-Ticket Re-issued / Coupon Validated">GDS E-Ticket Re-issued / Coupon Validated</option>
              <option value="Refund Wallet Credit Processed">Refund Wallet Credit Processed</option>
              <option value="Supplier Cancellation Penalty Waived">Supplier Cancellation Penalty Waived</option>
              <option value="Alternative Property Re-booking Completed">Alternative Property Re-booking Completed</option>
              <option value="Special Amenity Confirmed by Hotel Duty Mgr">Special Amenity Confirmed by Hotel Duty Mgr</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Resolution Summary (Customer-Facing & Audit Trail) *
            </label>
            <textarea
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              rows={4}
              placeholder="Detail how the issue was resolved with the supplier and what actions were taken for the agency/guest..."
              required
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden resize-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Supplier Confirmation / Credit Note Ref (Optional)
            </label>
            <input
              type="text"
              value={creditNoteNumber}
              onChange={(e) => setCreditNoteNumber(e.target.value)}
              placeholder="e.g. CN-9941 / HB-CONF-8821"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs focus:outline-hidden"
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
              disabled={isSubmitting}
              className="px-4 py-1.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Resolving...' : 'Confirm Resolution'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
