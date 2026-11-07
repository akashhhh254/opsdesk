import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Compass,
  X,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Link as LinkIcon,
  Building2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface DemoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (view: string) => void;
  onSelectTicketById: (ticketId: string) => void;
  onOpenCreateTicket: () => void;
}

export const DemoGuideModal: React.FC<DemoGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectView,
  onSelectTicketById,
  onOpenCreateTicket,
}) => {
  const { userProfile } = useAuth();

  if (!isOpen) return null;

  const demoSteps = [
    {
      step: 1,
      title: 'Context Capture on Ticket Creation',
      problem: 'Problem 1: Tickets without Context',
      description: 'Open the ticket creation modal and input a TBOH. Notice how OpsDesk captures check-in date, LCD cutoff, supplier locator, and gives instant AI intent suggestions with matching booking alerts.',
      actionLabel: 'Launch Ticket Creation Modal',
      onRun: () => {
        onOpenCreateTicket();
        onClose();
      },
    },
    {
      step: 2,
      title: 'Context-Rich Ticket Linking (Same TBOH)',
      problem: 'Problem 1 & 2: Fragmented Booking History',
      description: 'Open case OPS-1001. View the connected case OPS-1004 sharing TBOH-984210 showing historical resolution details without merging separate customer threads.',
      actionLabel: 'Inspect Linked Case OPS-1001',
      onRun: () => {
        onSelectView('tickets');
        onSelectTicketById('OPS-1001');
        onClose();
      },
    },
    {
      step: 3,
      title: 'Intelligent Routing & Assignment Rationale',
      problem: 'Problem 2: Inefficient Routing & Ownership',
      description: 'Inspect OPS-1001 to view the recorded routing decision: "Assigned via Rule Emergency Check-in Triage (<24h): High-risk passenger arrival within 24h routed directly to Senior Triage Specialist Rahul Sharma."',
      actionLabel: 'View Routing Rules & Policies',
      onRun: () => {
        onSelectView('settings');
        onClose();
      },
    },
    {
      step: 4,
      title: 'Supplier Side Conversations & Recipient Isolation',
      problem: 'Problem 3: Fragile Supplier & Agency Side Threads',
      description: 'Inspect the dedicated Side Conversations view to review communication threads with Hotelbeds and properties, where recipient lists are strictly preserved across transfers.',
      actionLabel: 'Open Supplier Conversations Hub',
      onRun: () => {
        onSelectView('conversations');
        onClose();
      },
    },
    {
      step: 5,
      title: 'Travel-Aware SLA Risk & Escalation Centre',
      problem: 'Problem 4: Generic SLA & Difficult Escalation',
      description: 'Open the Escalation Centre to view breached case OPS-1005 ($4,890 delayed refund) and imminent check-in (<24h) arrival radar with first-class escalation logs.',
      actionLabel: 'Open Escalation Command Centre',
      onRun: () => {
        onSelectView('escalations');
        onClose();
      },
    },
    {
      step: 6,
      title: 'AI Insights & Recurring Complaint Themes',
      problem: 'Problem 5 & 6: Broken Feedback Loop & Archival',
      description: 'Review real persisted database analytics: category breakdowns, agent loads, and clustered themes (e.g., Hotel PMS voucher sync failures, late refunds). Download operations CSV.',
      actionLabel: 'View Operational Insights',
      onRun: () => {
        onSelectView('insights');
        onClose();
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                OpsDesk: Hackathon Demonstration Guide
              </h3>
              <p className="text-[11px] text-slate-400">
                Mapped to the 6 TBO Zendesk Challenge Problems. Click any step to jump!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-950 text-[11px]">
            <strong>Demonstration Tip:</strong> Authenticated as <strong>{userProfile?.name}</strong> ({userProfile?.role.replace('_', ' ')}). Follow these 6 steps to demonstrate the end-to-end travel operations workflows.
          </div>

          <div className="space-y-3">
            {demoSteps.map((s) => (
              <div
                key={s.step}
                className="p-4 bg-slate-50 hover:bg-slate-100/70 transition-colors rounded-xl border border-slate-200 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                      {s.step}
                    </span>
                    <span className="font-bold text-slate-900 text-xs">{s.title}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                    {s.problem}
                  </span>
                </div>

                <p className="text-slate-600 leading-relaxed text-[11px] pl-7">
                  {s.description}
                </p>

                <div className="pl-7 pt-1">
                  <button
                    onClick={s.onRun}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs cursor-pointer transition-colors"
                  >
                    <span>{s.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>TBO Global Operations Challenge 2026</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
