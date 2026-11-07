import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Compass,
  ChevronDown,
  LogOut,
  HelpCircle,
  RefreshCw,
  Mail,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

interface NavbarProps {
  onOpenDemoGuide: () => void;
  onRefreshData?: () => void;
  activeView: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenDemoGuide,
  onRefreshData,
  activeView,
}) => {
  const {
    firebaseUser,
    userProfile,
    signOut,
    isEmailVerified,
    resendVerificationEmail,
  } = useAuth();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'agency':
        return { label: 'Agency / Requester', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'agent':
        return { label: 'Ops Agent', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'escalation_manager':
        return { label: 'Escalation Manager', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'admin':
        return { label: 'Admin / Ops Lead', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: role || 'Member', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const badge = getRoleBadge(userProfile?.role);

  const handleResend = async () => {
    try {
      await resendVerificationEmail();
      setResendStatus('Verification link dispatched to your inbox.');
      setTimeout(() => setResendStatus(null), 4000);
    } catch (err: any) {
      setResendStatus('Could not resend email. Please try again later.');
    }
  };

  return (
    <>
      {/* Email Verification Banner if not verified */}
      {!isEmailVerified && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" />
            <span>
              Please verify your email address (<strong>{firebaseUser?.email}</strong>) to complete account verification.
            </span>
          </div>
          <div className="flex items-center gap-3">
            {resendStatus ? (
              <span className="font-bold text-slate-950">{resendStatus}</span>
            ) : (
              <button
                onClick={handleResend}
                className="underline font-bold hover:text-white cursor-pointer"
              >
                Resend verification email
              </button>
            )}
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-900 px-6 py-3 shadow-xs">
        <div className="flex items-center justify-between gap-6">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <Compass className="w-5 h-5 text-sky-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                OpsDesk
              </span>
              <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">
                TBO Operations Intelligence
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Breadcrumbs */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="text-slate-400">Platform</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold capitalize">
              {activeView.replace('-', ' ')}
            </span>
            {userProfile?.role === 'agency' && (
              <>
                <span>/</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200 font-mono">
                  Agency Tenant
                </span>
              </>
            )}
          </div>

          {/* Zone 3: Actions & User Profile */}
          <div className="flex items-center gap-3 shrink-0">
            {onRefreshData && (
              <button
                onClick={onRefreshData}
                title="Refresh Queue Data"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* Hackathon Judge Demo Walkthrough Trigger */}
            <button
              onClick={onOpenDemoGuide}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Judge Demo Guide</span>
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer text-left"
              >
                {userProfile?.avatarUrl || firebaseUser?.photoURL ? (
                  <img
                    src={userProfile?.avatarUrl || firebaseUser?.photoURL || ''}
                    alt={userProfile?.name || 'User avatar'}
                    className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {userProfile?.name?.charAt(0) || firebaseUser?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                    {userProfile?.name || firebaseUser?.email}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    {badge.label}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {userProfile?.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {firebaseUser?.email}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                        {userProfile?.region && (
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">
                            {userProfile.region}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          signOut();
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out of OpsDesk</span>
                      </button>
                    </div>

                    <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>UID: {firebaseUser?.uid.slice(0, 10)}...</span>
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Authenticated</span>
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
