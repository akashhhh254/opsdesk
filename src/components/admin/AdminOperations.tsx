import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import {
  RoutingRule,
  SlaPolicy,
  AuditLog,
  User,
  Agency,
  Region,
  TicketCategory,
  TicketPriority,
} from '../../types/index.ts';
import {
  Layers,
  GitFork,
  Sliders,
  ShieldCheck,
  Building2,
  Users,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  Search,
  AlertCircle,
} from 'lucide-react';

interface AdminOperationsProps {
  onRefreshAllData: () => void;
}

export const AdminOperations: React.FC<AdminOperationsProps> = ({ onRefreshAllData }) => {
  const [activeTab, setActiveTab] = useState<'routing' | 'sla' | 'directory' | 'audit'>('routing');

  // Routing Rules state
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRulePriority, setNewRulePriority] = useState(4);
  const [newRuleRegion, setNewRuleRegion] = useState<Region>('EMEA');
  const [newRuleCategory, setNewRuleCategory] = useState<TicketCategory>('Booking Failure');
  const [newRuleAgentId, setNewRuleAgentId] = useState('');
  const [newRuleExplanation, setNewRuleExplanation] = useState('');

  // SLA Policies state
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);

  // Users & Agencies
  const [users, setUsers] = useState<User[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rulesRes, policiesRes, usersRes, agenciesRes, logsRes] = await Promise.all([
        api.getRoutingRules(),
        api.getSlaPolicies(),
        api.getUsers(),
        api.getAgencies(),
        api.getAuditLogs(),
      ]);

      setRules(rulesRes.rules || []);
      setPolicies(policiesRes.policies || []);
      setUsers(usersRes.users || []);
      setAgencies(agenciesRes.agencies || []);
      setAuditLogs(logsRes.logs || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Toggle rule active
  const handleToggleRule = async (rule: RoutingRule) => {
    const updated = { ...rule, active: !rule.active };
    await api.saveRoutingRule(updated);
    setRules(rules.map((r) => (r.id === rule.id ? updated : r)));
    showMessage(`Rule "${rule.name}" ${updated.active ? 'enabled' : 'disabled'}.`);
  };

  // Delete rule
  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this routing rule?')) return;
    await api.deleteRoutingRule(id);
    setRules(rules.filter((r) => r.id !== id));
    showMessage('Routing rule deleted.');
  };

  // Add rule
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName || !newRuleExplanation) return;

    const newRule: RoutingRule = {
      id: `rule_${Date.now()}`,
      name: newRuleName,
      priority: Number(newRulePriority),
      conditions: {
        region: [newRuleRegion],
        category: [newRuleCategory],
      },
      targetAgentId: newRuleAgentId || users.find((u) => u.role === 'agent')?.id,
      ruleExplanation: newRuleExplanation,
      active: true,
    };

    const { rule } = await api.saveRoutingRule(newRule);
    setRules([...rules, rule]);
    setIsAddingRule(false);
    setNewRuleName('');
    setNewRuleExplanation('');
    showMessage('New routing rule created successfully.');
  };

  // Save SLA Policy
  const handleUpdatePolicy = async (policy: SlaPolicy, newHours: number, newWarning: number) => {
    const updated = {
      ...policy,
      targetResolutionHours: newHours,
      warningThresholdMinutes: newWarning,
    };
    await api.saveSlaPolicy(updated);
    setPolicies(policies.map((p) => (p.id === policy.id ? updated : p)));
    showMessage(`SLA Policy for ${policy.priority} updated.`);
    onRefreshAllData();
  };

  // Reset database back to default seed data
  const handleResetDb = async () => {
    if (!confirm('Reset database to clean synthetic demo seed data? All custom tickets will be reset.')) return;
    try {
      await api.resetDatabase();
      await loadData();
      onRefreshAllData();
      showMessage('Database reset to clean hackathon demo seed data.');
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    }
  };

  const showMessage = (msg: string) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const filteredLogs = auditLogs.filter(
    (l) =>
      auditSearch.trim() === '' ||
      l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.userName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.resourceId.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            <span>Operations & Platform Administration</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure multi-signal routing, travel-aware SLA thresholds, tenant directories & audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetDb}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-colors"
            title="Reset database to demo seed data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo DB</span>
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('routing')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'routing'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GitFork className="w-3.5 h-3.5" />
          <span>Smart Routing Rules ({rules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sla')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'sla'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Travel-Aware SLA Policies ({policies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'directory'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Agencies & User Roles</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>System Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: Smart Routing Rules */}
      {activeTab === 'routing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Automated Routing Engine Configuration
              </h3>
              <p className="text-xs text-slate-500">
                Rules are evaluated sequentially by priority. If no rule matches, multi-signal heuristic takes over.
              </p>
            </div>

            <button
              onClick={() => setIsAddingRule(!isAddingRule)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Routing Rule</span>
            </button>
          </div>

          {/* Add Rule Form */}
          {isAddingRule && (
            <form onSubmit={handleAddRule} className="p-5 bg-sky-50/50 rounded-xl border border-sky-200 space-y-4 text-xs">
              <h4 className="font-bold text-sky-900">Define New Intelligent Routing Rule</h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Rule Name *</label>
                  <input
                    type="text"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    placeholder="e.g. Luxury Resort Escalation Desk"
                    required
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Evaluation Priority</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newRulePriority}
                    onChange={(e) => setNewRulePriority(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Target Specialist Agent</label>
                  <select
                    value={newRuleAgentId}
                    onChange={(e) => setNewRuleAgentId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                  >
                    {users.filter((u) => u.role === 'agent').map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.region} - {ag.specialization?.join(', ')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Match Region</label>
                  <select
                    value={newRuleRegion}
                    onChange={(e) => setNewRuleRegion(e.target.value as Region)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="EMEA">EMEA</option>
                    <option value="APAC">APAC</option>
                    <option value="Americas">Americas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Match Category</label>
                  <select
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value as TicketCategory)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="Hotel Confirmation">Hotel Confirmation</option>
                    <option value="Booking Failure">Booking Failure</option>
                    <option value="Refund Delay">Refund Delay</option>
                    <option value="Cancellation">Cancellation</option>
                    <option value="Flight Ticket Issue">Flight Ticket Issue</option>
                    <option value="Inventory Synchronization">Inventory Synchronization</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Human-Readable Routing Reason Explanation *
                </label>
                <input
                  type="text"
                  value={newRuleExplanation}
                  onChange={(e) => setNewRuleExplanation(e.target.value)}
                  placeholder="e.g. Automatically assigned to luxury desk due to high-value booking property match."
                  required
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingRule(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Save Rule
                </button>
              </div>
            </form>
          )}

          {/* Rules List */}
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {rules.map((rule) => {
              const targetAgent = users.find((u) => u.id === rule.targetAgentId);
              return (
                <div
                  key={rule.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    !rule.active ? 'opacity-60 bg-slate-50' : ''
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                        Priority #{rule.priority}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{rule.name}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.2 rounded ${
                          rule.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {rule.active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>

                    <p className="text-slate-600">{rule.ruleExplanation}</p>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-1">
                      {rule.conditions.region && (
                        <span>Regions: {rule.conditions.region.join(', ')}</span>
                      )}
                      {rule.conditions.category && (
                        <span>· Categories: {rule.conditions.category.join(', ')}</span>
                      )}
                      {rule.conditions.hoursToCheckInLessThan && (
                        <span>· Check-in &lt; {rule.conditions.hoursToCheckInLessThan}h</span>
                      )}
                      <span>
                        · Routes To:{' '}
                        <strong>{targetAgent ? targetAgent.name : 'Unassigned'}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleRule(rule)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                        rule.active
                          ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {rule.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Travel-Aware SLA Policies */}
      {activeTab === 'sla' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Travel-Aware SLA Matrix Configuration
            </h3>
            <p className="text-xs text-slate-500">
              Set target resolution time windows by ticket priority and check-in proximity multipliers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3 text-xs"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900 text-sm">{policy.name}</span>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                    {policy.priority} Priority
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 text-[11px] block font-medium mb-1">
                      Target Resolution (Hours)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      defaultValue={policy.targetResolutionHours}
                      onBlur={(e) =>
                        handleUpdatePolicy(
                          policy,
                          Number(e.target.value),
                          policy.warningThresholdMinutes
                        )
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 text-[11px] block font-medium mb-1">
                      'At-Risk' Warning (Mins)
                    </label>
                    <input
                      type="number"
                      min="15"
                      step="15"
                      defaultValue={policy.warningThresholdMinutes}
                      onBlur={(e) =>
                        handleUpdatePolicy(
                          policy,
                          policy.targetResolutionHours,
                          Number(e.target.value)
                        )
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-600">
                  <p>
                    <strong>Check-in Proximity Multiplier:</strong>{' '}
                    {policy.checkInProximityMultiplier}x
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    When check-in is &lt; 24h away, resolution target window compresses by{' '}
                    {Math.round((1 - policy.checkInProximityMultiplier) * 100)}%.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Agencies & User Directory */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Agencies */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Registered Travel Agencies (Tenants)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {agencies.map((ag) => (
                <div key={ag.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{ag.name}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 rounded border border-emerald-200">
                      {ag.tier}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-500">Code: {ag.code}</p>
                  <p className="text-[11px] text-slate-600">{ag.country} ({ag.region})</p>
                  <p className="text-[11px] text-slate-500">{ag.contactEmail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Users */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Staff & Operations Team Directory</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Region</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Specialization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{u.name}</td>
                      <td className="py-2.5 px-3 capitalize text-slate-700">
                        {u.role.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{u.region || 'Global'}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{u.email}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {u.specialization?.join(', ') || 'General Ops'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: System Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                System Audit Trail & Compliance Ledger
              </h3>
              <p className="text-[11px] text-slate-500">
                Immutable chronological log of ticket assignments, linking, status adjustments & escalations.
              </p>
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit events..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">Actor</th>
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3">Resource</th>
                  <th className="py-2 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] font-bold text-indigo-700 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {log.resourceId}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
