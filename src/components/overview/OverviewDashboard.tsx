import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Ticket } from '../../types/index.ts';
import {
  Inbox,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Building2,
  ArrowRight,
  Flame,
  ShieldAlert,
  Calendar,
  Layers,
} from 'lucide-react';

interface OverviewDashboardProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onNavigate: (view: string) => void;
  onOpenCreateTicket: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  tickets,
  onSelectTicket,
  onNavigate,
  onOpenCreateTicket,
}) => {
  const { userProfile, isAgency } = useAuth();

  // If agency, isolate to their own tickets
  const permittedTickets = isAgency
    ? tickets.filter((t) => t.agencyId === userProfile?.agencyId)
    : tickets;

  const totalOpen = permittedTickets.filter(
    (t) => t.status !== 'Resolved' && t.status !== 'Closed'
  ).length;

  const pendingCount = permittedTickets.filter((t) => t.status === 'Pending').length;

  const resolvedCount = permittedTickets.filter(
    (t) => t.status === 'Resolved' || t.status === 'Closed'
  ).length;

  const highPriorityCount = permittedTickets.filter(
    (t) => (t.priority === 'High' || t.priority === 'Urgent') && t.status !== 'Resolved' && t.status !== 'Closed'
  ).length;

  const slaAtRiskCount = permittedTickets.filter(
    (t) => t.slaStatus === 'At Risk' && t.status !== 'Resolved' && t.status !== 'Closed'
  ).length;

  const slaBreachedCount = permittedTickets.filter(
    (t) => t.slaStatus === 'Breached' && t.status !== 'Resolved' && t.status !== 'Closed'
  ).length;

  const escalatedCount = permittedTickets.filter(
    (t) => (t.isEscalated || t.status === 'Escalated') && t.status !== 'Resolved' && t.status !== 'Closed'
  ).length;

  // Urgent travel arrival < 24h
  const urgentCheckInTickets = permittedTickets.filter((t) => {
    if (!t.bookingContext?.checkInDate) return false;
    const hours = (new Date(t.bookingContext.checkInDate).getTime() - Date.now()) / (1000 * 60 * 60);
    return hours <= 24 && hours > 0 && t.status !== 'Resolved' && t.status !== 'Closed';
  });

  // Recent 5 active tickets
  const recentTickets = [...permittedTickets].slice(0, 5);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isAgency ? `Welcome, ${userProfile?.name}` : 'Operations Overview'}
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-100 text-slate-700 capitalize">
              Role: {userProfile?.role.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {isAgency
              ? `Authorized tenant view for ${userProfile?.name}. Only your agency's support requests are accessible.`
              : 'Real-time TBO travel operations metrics, urgent check-in monitors, and SLA compliance.'}
          </p>
        </div>

        <button
          onClick={onOpenCreateTicket}
          className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 self-start md:self-auto shrink-0"
        >
          <span>Create New Ticket</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Primary Metrics Grid (Clean, zero-pill, tabular figures) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Open Tickets
          </span>
          <span className="text-2xl font-bold text-slate-900 tabular-nums block mt-1">
            {totalOpen}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Active cases</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Pending
          </span>
          <span className="text-2xl font-bold text-sky-600 tabular-nums block mt-1">
            {pendingCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Awaiting supplier</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Resolved
          </span>
          <span className="text-2xl font-bold text-emerald-600 tabular-nums block mt-1">
            {resolvedCount}
          </span>
          <span className="text-[11px] text-emerald-700 mt-1 block">Completed</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            High Priority
          </span>
          <span className="text-2xl font-bold text-amber-600 tabular-nums block mt-1">
            {highPriorityCount}
          </span>
          <span className="text-[11px] text-amber-700 mt-1 block">High & Urgent</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            SLA At Risk
          </span>
          <span className="text-2xl font-bold text-amber-600 tabular-nums block mt-1">
            {slaAtRiskCount}
          </span>
          <span className="text-[11px] text-amber-700 mt-1 block">&lt; Warning limit</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            SLA Breached
          </span>
          <span className="text-2xl font-bold text-rose-600 tabular-nums block mt-1">
            {slaBreachedCount}
          </span>
          <span className="text-[11px] text-rose-700 mt-1 block">Requires review</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Escalated
          </span>
          <span className="text-2xl font-bold text-purple-600 tabular-nums block mt-1">
            {escalatedCount}
          </span>
          <span className="text-[11px] text-purple-700 mt-1 block">In manager queue</span>
        </div>
      </div>

      {/* Critical Travel Urgency Banner (Arrival < 24h) */}
      {urgentCheckInTickets.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-900 shadow-xs">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-rose-600 shrink-0 animate-bounce" />
            <div>
              <p className="font-bold text-sm">
                {urgentCheckInTickets.length} Passenger(s) Checking In Within 24 Hours!
              </p>
              <p className="text-rose-700 text-[11px] mt-0.5">
                Imminent hotel arrival or departure cutoff. Priority SLA rules in effect.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('escalations')}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer transition-colors shrink-0 text-xs"
          >
            Review Urgent Cases
          </button>
        </div>
      )}

      {/* Two Column Section: Recent Cases & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Operational Cases */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Inbox className="w-3.5 h-3.5 text-slate-500" />
              <span>Recent Operational Support Cases</span>
            </h3>
            <button
              onClick={() => onNavigate('tickets')}
              className="text-xs text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
            >
              View All ({permittedTickets.length}) →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTicket(t)}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 p-2 rounded-lg cursor-pointer transition-colors"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{t.id}</span>
                    <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 rounded">
                      {t.tboh}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${
                        t.priority === 'Urgent'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : t.priority === 'High'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}
                    >
                      {t.priority}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                      {t.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 truncate">{t.title}</h4>
                  <p className="text-[11px] text-slate-500">
                    Guest: {t.bookingContext.passengerName} · {t.bookingContext.hotelOrFlightName}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border block ${
                      t.slaStatus === 'Breached'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : t.slaStatus === 'At Risk'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    SLA: {t.slaStatus}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Owner: {t.assignedAgentName || 'Unassigned'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Quick Status & Regional Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Workload Distribution
            </h3>
            <span className="text-[11px] text-slate-400">By Status & Region</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>New / Unassigned</span>
                <span className="font-bold tabular-nums">
                  {permittedTickets.filter((t) => t.status === 'New').length}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full"
                  style={{
                    width: `${
                      (permittedTickets.filter((t) => t.status === 'New').length /
                        (permittedTickets.length || 1)) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Open / In Investigation</span>
                <span className="font-bold tabular-nums">
                  {permittedTickets.filter((t) => t.status === 'Open').length}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full"
                  style={{
                    width: `${
                      (permittedTickets.filter((t) => t.status === 'Open').length /
                        (permittedTickets.length || 1)) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Escalated to Management</span>
                <span className="font-bold tabular-nums">{escalatedCount}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full"
                  style={{
                    width: `${(escalatedCount / (permittedTickets.length || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Resolved & Closed</span>
                <span className="font-bold tabular-nums">{resolvedCount}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{
                    width: `${(resolvedCount / (permittedTickets.length || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Regions
            </span>
            <div className="flex items-center justify-between text-slate-700">
              <span>EMEA</span>
              <span className="font-bold tabular-nums">
                {permittedTickets.filter((t) => t.region === 'EMEA').length} cases
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span>APAC</span>
              <span className="font-bold tabular-nums">
                {permittedTickets.filter((t) => t.region === 'APAC').length} cases
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span>Americas</span>
              <span className="font-bold tabular-nums">
                {permittedTickets.filter((t) => t.region === 'Americas').length} cases
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
