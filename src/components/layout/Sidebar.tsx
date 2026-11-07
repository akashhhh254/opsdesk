import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  LayoutDashboard,
  Inbox,
  UserCheck,
  MessageSquare,
  AlertTriangle,
  BarChart3,
  Sliders,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onSelectView: (view: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenCreateTicket: () => void;
  ticketCounts?: {
    myQueue: number;
    unassigned: number;
    escalated: number;
    atRisk: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  isCollapsed,
  onToggleCollapse,
  onOpenCreateTicket,
  ticketCounts = { myQueue: 0, unassigned: 0, escalated: 0, atRisk: 0 },
}) => {
  const { userProfile, isAgency, isAgent, isManager, isAdmin } = useAuth();
  const role = userProfile?.role;

  const renderNavButton = (
    viewId: string,
    label: string,
    Icon: React.ElementType,
    badgeCount?: number,
    badgeColor?: string
  ) => {
    const isActive = activeView === viewId;
    return (
      <button
        onClick={() => onSelectView(viewId)}
        title={isCollapsed ? label : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
          isActive
            ? 'bg-slate-900 text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
        {!isCollapsed && <span className="flex-1 text-left truncate">{label}</span>}
        {!isCollapsed && badgeCount !== undefined && badgeCount > 0 && (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
              badgeColor || 'bg-slate-200 text-slate-700'
            }`}
          >
            {badgeCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`h-[calc(100vh-61px)] sticky top-[61px] bg-white border-r border-slate-200 flex flex-col transition-all duration-200 shrink-0 z-30 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Primary Action Button */}
      <div className="p-3 border-b border-slate-100">
        <button
          onClick={onOpenCreateTicket}
          className={`w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs py-2 px-3 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap ${
            isCollapsed ? 'px-0' : ''
          }`}
          title="Create New Support Ticket"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>New Ticket</span>}
        </button>
      </div>

      {/* Main Streamlined Navigation (Overview, Tickets, My Queue, Conversations, Escalations, Insights, Settings) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* 1. Overview */}
        {renderNavButton('overview', 'Overview', LayoutDashboard)}

        {/* 2. Tickets (All Permitted Tickets / Agency Tickets) */}
        {renderNavButton(
          'tickets',
          isAgency ? 'My Agency Tickets' : 'All Tickets',
          Inbox
        )}

        {/* 3. My Queue (Agents, Managers, Admins) */}
        {!isAgency && renderNavButton(
          'my-queue',
          'My Queue',
          UserCheck,
          ticketCounts.myQueue
        )}

        {/* 4. Conversations (Supplier & Agency Side Threads) */}
        {!isAgency && renderNavButton(
          'conversations',
          'Side Conversations',
          MessageSquare
        )}

        {/* 5. Escalations (Manager, Admin, Agent) */}
        {!isAgency && renderNavButton(
          'escalations',
          'Escalations',
          AlertTriangle,
          ticketCounts.escalated,
          'bg-rose-100 text-rose-800'
        )}

        {/* 6. Insights & Analytics (Operations Analysis) */}
        {!isAgency && renderNavButton(
          'insights',
          'Insights & Themes',
          BarChart3
        )}

        {/* 7. Settings (Routing, SLA Policies, Audit Logs, Profile) */}
        {renderNavButton(
          'settings',
          isAdmin ? 'Settings & Admin' : 'Settings',
          Sliders
        )}
      </div>

      {/* Compact User Profile Strip at Bottom of Sidebar */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {userProfile?.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {userProfile?.name}
                </p>
                <p className="text-[10px] text-slate-500 capitalize truncate">
                  {userProfile?.role.replace('_', ' ')}
                </p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold mx-auto">
              {userProfile?.name?.charAt(0) || 'U'}
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer shrink-0 ml-1"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
};
