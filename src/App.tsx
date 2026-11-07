import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { api } from './services/api.ts';
import { Ticket } from './types/index.ts';
import { AuthScreen } from './components/auth/AuthScreen.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { OverviewDashboard } from './components/overview/OverviewDashboard.tsx';
import { AgentWorkspace } from './components/agent/AgentWorkspace.tsx';
import { AgencyPortal } from './components/agency/AgencyPortal.tsx';
import { ConversationsView } from './components/conversations/ConversationsView.tsx';
import { EscalationCenter } from './components/escalation/EscalationCenter.tsx';
import { AdminOperations } from './components/admin/AdminOperations.tsx';
import { InsightsAnalytics } from './components/insights/InsightsAnalytics.tsx';
import { CreateTicketModal } from './components/tickets/CreateTicketModal.tsx';
import { DemoGuideModal } from './components/demo/DemoGuideModal.tsx';
import { Compass } from 'lucide-react';

function AuthenticatedApp() {
  const { firebaseUser, userProfile, isLoading, isAgency, isAgent, isManager, isAdmin } = useAuth();

  const [activeView, setActiveView] = useState<string>('overview');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState(false);

  const [ticketError, setTicketError] = useState<string | null>(null);

  // Load tickets on mount or user switch
  const loadTickets = async () => {
    if (!firebaseUser) return;
    try {
      setIsLoadingTickets(true);
      setTicketError(null);
      const res = await api.getTickets({ limit: 100 });
      setTickets(res.tickets || []);
      if (selectedTicket) {
        const refreshed = res.tickets.find((t) => t.id === selectedTicket.id);
        if (refreshed) setSelectedTicket(refreshed);
      }
    } catch (err: any) {
      console.warn('Initial ticket fetch hiccup, attempting recovery:', err?.message || err);
      try {
        await new Promise((r) => setTimeout(r, 800));
        const retryRes = await api.getTickets({ limit: 100 });
        setTickets(retryRes.tickets || []);
      } catch (retryErr: any) {
        console.error('Failed to load tickets after retry:', retryErr);
        setTicketError(retryErr?.message || 'Failed to load tickets');
      }
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (firebaseUser) {
      loadTickets();
    }
  }, [firebaseUser?.uid]);

  const handleTicketUpdated = (updated: Ticket) => {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (selectedTicket?.id === updated.id) {
      setSelectedTicket(updated);
    }
  };

  const handleTicketCreated = (newTicket: Ticket) => {
    setTickets((prev) => [newTicket, ...prev]);
    setSelectedTicket(newTicket);
  };

  const handleSelectTicketById = (ticketId: string) => {
    const found = tickets.find((t) => t.id === ticketId);
    if (found) {
      setSelectedTicket(found);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-center space-y-3">
        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center animate-pulse">
          <Compass className="w-5 h-5 text-sky-400" />
        </div>
        <p className="text-xs font-semibold text-slate-700">Connecting to OpsDesk & Firebase...</p>
      </div>
    );
  }

  // STRICT REQUIREMENT: If not authenticated, render login/signup screen only!
  if (!firebaseUser) {
    return <AuthScreen />;
  }

  // Ticket counts for badges
  const ticketCounts = {
    myQueue: tickets.filter(
      (t) => (t.assignedAgentId === firebaseUser.uid || t.assignedAgentId === 'usr_rahul') &&
        t.status !== 'Resolved' && t.status !== 'Closed'
    ).length,
    unassigned: tickets.filter(
      (t) => !t.assignedAgentId && t.status !== 'Resolved' && t.status !== 'Closed'
    ).length,
    escalated: tickets.filter(
      (t) => (t.isEscalated || t.status === 'Escalated') && t.status !== 'Resolved' && t.status !== 'Closed'
    ).length,
    atRisk: tickets.filter(
      (t) => (t.slaStatus === 'At Risk' || t.slaStatus === 'Breached') && t.status !== 'Resolved' && t.status !== 'Closed'
    ).length,
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Navbar */}
      <Navbar
        onOpenDemoGuide={() => setIsDemoGuideOpen(true)}
        onRefreshData={loadTickets}
        activeView={activeView}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Streamlined Sidebar */}
        <Sidebar
          activeView={activeView}
          onSelectView={(v) => {
            setActiveView(v);
            setSelectedTicket(null);
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenCreateTicket={() => setIsCreateTicketOpen(true)}
          ticketCounts={ticketCounts}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {/* 1. Overview Dashboard */}
          {activeView === 'overview' && !selectedTicket && (
            <OverviewDashboard
              tickets={tickets}
              onSelectTicket={setSelectedTicket}
              onNavigate={(v) => {
                setActiveView(v);
                setSelectedTicket(null);
              }}
              onOpenCreateTicket={() => setIsCreateTicketOpen(true)}
            />
          )}

          {/* 2. Tickets View */}
          {activeView === 'tickets' && (
            isAgency ? (
              <AgencyPortal
                tickets={tickets}
                onSelectTicket={setSelectedTicket}
                selectedTicket={selectedTicket}
                onClearSelectedTicket={() => setSelectedTicket(null)}
                onOpenCreateTicket={() => setIsCreateTicketOpen(true)}
                onTicketUpdated={handleTicketUpdated}
                isLoading={isLoadingTickets}
              />
            ) : (
              <AgentWorkspace
                tickets={tickets}
                onSelectTicket={setSelectedTicket}
                selectedTicket={selectedTicket}
                onClearSelectedTicket={() => setSelectedTicket(null)}
                onTicketUpdated={handleTicketUpdated}
                isLoading={isLoadingTickets}
              />
            )
          )}

          {/* 3. My Queue View */}
          {activeView === 'my-queue' && (
            <AgentWorkspace
              tickets={tickets}
              onSelectTicket={setSelectedTicket}
              selectedTicket={selectedTicket}
              onClearSelectedTicket={() => setSelectedTicket(null)}
              onTicketUpdated={handleTicketUpdated}
              isLoading={isLoadingTickets}
            />
          )}

          {/* 4. Conversations View */}
          {activeView === 'conversations' && (
            <ConversationsView
              tickets={tickets}
              onSelectTicket={(t) => {
                setSelectedTicket(t);
                setActiveView('tickets');
              }}
            />
          )}

          {/* 5. Escalations View */}
          {activeView === 'escalations' && (
            <EscalationCenter
              tickets={tickets}
              onSelectTicket={setSelectedTicket}
              selectedTicket={selectedTicket}
              onClearSelectedTicket={() => setSelectedTicket(null)}
              onTicketUpdated={handleTicketUpdated}
              isLoading={isLoadingTickets}
            />
          )}

          {/* 6. Insights & Analytics */}
          {activeView === 'insights' && (
            <InsightsAnalytics />
          )}

          {/* 7. Settings & Administration */}
          {activeView === 'settings' && (
            <AdminOperations onRefreshAllData={loadTickets} />
          )}
        </main>
      </div>

      {/* Modals */}
      <CreateTicketModal
        isOpen={isCreateTicketOpen}
        onClose={() => setIsCreateTicketOpen(false)}
        onCreated={handleTicketCreated}
        existingTickets={tickets}
      />

      <DemoGuideModal
        isOpen={isDemoGuideOpen}
        onClose={() => setIsDemoGuideOpen(false)}
        onSelectView={setActiveView}
        onSelectTicketById={handleSelectTicketById}
        onOpenCreateTicket={() => setIsCreateTicketOpen(true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
