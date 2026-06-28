import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import DashboardView from './components/DashboardView';
import MasterFormsView from './components/MasterFormsView';
import DailyChecksView from './components/DailyChecksView';
import ApprovalInboxView from './components/ApprovalInboxView';
import SettingsView from './components/SettingsView';
import AiinaLogo from './components/layout/AiinaLogo';
import LoginView from './components/LoginView';
import { Menu, X } from 'lucide-react';
import { useMasterForms } from './hooks/useMasterForms';
import { useSubmissions } from './hooks/useSubmissions';
import { useAuth } from './contexts/AuthContext';

const INSPECTOR_NAME_KEY = 'industrial_qc_inspector_name_v1';

function getInitialInspectorName(): string {
  try {
    const saved = localStorage.getItem(INSPECTOR_NAME_KEY);
    return saved ? JSON.parse(saved) : 'J. Smith';
  } catch {
    return 'J. Smith';
  }
}

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <p className="text-sm text-[#757682]">Loading...</p>
      </div>
    );
  }

  if (!user) return <LoginView />;

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [inspectorName, setInspectorNameState] = useState<string>(getInitialInspectorName);

  const {
    masterForms,
    setMasterForms,
    addMasterFormWithParsing,
    resetToDefaults: resetMasterForms,
  } = useMasterForms();

  const {
    submissions,
    setSubmissions,
    addSubmission,
    advanceApproval,
    rejectSubmission,
    requestRejectSubmission,
    approveException,
    resetToDefaults: resetSubmissions,
    pendingCounts,
  } = useSubmissions();

  const setInspectorName = (name: string) => {
    setInspectorNameState(name);
    localStorage.setItem(INSPECTOR_NAME_KEY, JSON.stringify(name));
  };

  const handleResetData = () => {
    localStorage.removeItem(INSPECTOR_NAME_KEY);
    resetMasterForms();
    resetSubmissions();
    setInspectorNameState('J. Smith');
  };

  const openSubmissionsCount = submissions.filter((s) => s.status === 'PENDING' || s.status === 'REQUEST_REJECT').length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'master-forms', label: 'Master Forms' },
    { id: 'daily-checks', label: 'Daily Checks' },
    { id: 'approval-inbox', label: 'Approval Inbox', count: openSubmissionsCount },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d] flex flex-col md:flex-row antialiased">
      <header className="md:hidden flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#c5c5d3] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <AiinaLogo size="sm" />
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg border border-[#c5c5d3] text-[#444651]"
          id="mobile-drawer-toggle"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="w-64 max-w-[80%] h-full bg-white flex flex-col p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <AiinaLogo size="sm" />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setCurrentTab(item.id); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${currentTab === item.id
                      ? 'bg-[#dce1ff]/40 text-[#00236f] border-l-4 border-[#00236f]'
                      : 'text-[#444651] hover:bg-gray-100'
                    }`}
                >
                  {item.label}
                  {item.count !== undefined && item.count > 0 && (
                    <span className="ml-2 bg-[#fea619] text-[#2a1700] text-[9px] px-2 py-0.5 rounded-full font-black">
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="pt-4 border-t border-gray-100 mt-auto text-center">
              <span className="text-[10px] text-[#757682]">Logged in: {inspectorName}</span>
            </div>
          </div>
        </div>
      )}

      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openSubmissionsCount={openSubmissionsCount}
        onNewInspection={() => { setCurrentTab('daily-checks'); setIsMobileMenuOpen(false); }}
      />

      <main className="flex-1 min-h-screen flex flex-col md:pl-60">
        {currentTab === 'dashboard' && (
          <DashboardView
            masterForms={masterForms}
            submissions={submissions}
            onNavigateToInbox={() => setCurrentTab('approval-inbox')}
            onNavigateToChecks={() => setCurrentTab('daily-checks')}
          />
        )}

        {currentTab === 'master-forms' && (
          <MasterFormsView
            masterForms={masterForms}
            setMasterForms={setMasterForms}
            addMasterFormWithParsing={addMasterFormWithParsing}
          />
        )}

        {currentTab === 'daily-checks' && (
          <DailyChecksView
            masterForms={masterForms}
            onAddSubmission={addSubmission}
            inspectorName={inspectorName}
          />
        )}

        {currentTab === 'approval-inbox' && (
          <ApprovalInboxView
            submissions={submissions}
            inspectorName={inspectorName}
            pendingCounts={pendingCounts}
            onAdvanceApproval={advanceApproval}
            onRejectSubmission={rejectSubmission}
            onApproveException={approveException}
            onRequestReject={requestRejectSubmission}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            onResetData={handleResetData}
            inspectorName={inspectorName}
            setInspectorName={setInspectorName}
            instructorEmail="inspector.smith@aiina.co.id"
          />
        )}
      </main>
    </div>
  );
}
