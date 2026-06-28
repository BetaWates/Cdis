import { 
  LayoutDashboard, 
  FileText, 
  ClipboardCheck, 
  Inbox, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Plus,
  Compass
} from 'lucide-react';
import AiinaLogo from './AiinaLogo';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openSubmissionsCount: number;
  onNewInspection: () => void;
}

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  openSubmissionsCount,
  onNewInspection
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'master-forms', name: 'Master Forms', icon: FileText },
    { id: 'daily-checks', name: 'Daily Checks', icon: ClipboardCheck },
    { id: 'approval-inbox', name: 'Approval Inbox', icon: Inbox, badge: openSubmissionsCount },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <nav className="hidden md:flex flex-col h-screen w-60 bg-white border-r border-[#c5c5d3] z-50 fixed left-0 top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#c5c5d3] flex items-center justify-start">
        <AiinaLogo size="md" />
      </div>

      {/* Primary CTA */}
      <div className="p-4">
        <button 
          onClick={onNewInspection}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#00236f] hover:bg-[#1e3a8a] text-white rounded-lg font-medium text-sm transition-all shadow-sm active:scale-95"
        >
          <Plus size={16} />
          New Inspection
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-2 px-3 flex flex-col gap-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-left group ${
                isActive 
                  ? 'text-[#00236f] font-bold border-r-4 border-[#00236f] bg-[#dce1ff]/20'
                  : 'text-[#444651] hover:bg-[#edeeef] hover:text-[#191c1d]'
              }`}
            >
              <Icon 
                size={18} 
                className={`${isActive ? 'text-[#00236f]' : 'text-[#757682] group-hover:text-[#191c1d]'}`} 
              />
              <span className="text-sm flex-1">{item.name}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-[#fea619] text-[#2a1700] font-bold text-[10px] px-1.5 py-0.5 rounded-full ring-1 ring-amber-400">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Lower Footer Area */}
      <div className="p-3 border-t border-[#c5c5d3] flex flex-col gap-1">
        <button 
          onClick={() => alert("This demo application is fully interactive! Fill daily checksheets, submit, and review them in approval inbox.")}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-[#444651] hover:bg-[#edeeef] transition-colors text-left"
        >
          <HelpCircle size={18} className="text-[#757682]" />
          <span>Support</span>
        </button>
        <button 
          onClick={() => alert("Simulating user logout.")}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-red-700 hover:bg-red-50 transition-colors text-left"
        >
          <LogOut size={18} className="text-red-600" />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}
