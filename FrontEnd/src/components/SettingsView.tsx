import React, { useState } from 'react';
import { User, ShieldAlert, RotateCcw, CheckCircle2 } from 'lucide-react';

interface SettingsViewProps {
  onResetData: () => void;
  inspectorName: string;
  setInspectorName: (name: string) => void;
  instructorEmail: string;
}

export default function SettingsView({
  onResetData,
  inspectorName,
  setInspectorName,
  instructorEmail
}: SettingsViewProps) {
  const [tempName, setTempName] = useState(inspectorName);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setInspectorName(tempName);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all data (Master Forms, Daily checks, Submissions) back to defaults? Hand-written entries will be lost.')) {
      onResetData();
      alert('Data successfully restored to defaults.');
      window.location.reload();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#f8f9fa]">
      <div className="max-w-[800px] mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#191c1d] m-0">
            System Settings
          </h1>
          <p className="text-sm text-[#444651] mt-1">
            Configure application profiles, notification tolerance thresholds, and database states.
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white border border-[#c5c5d3] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="p-4 border-b border-[#c5c5d3] bg-[#f8f9fa] flex items-center gap-2">
            <User size={18} className="text-[#00236f]" />
            <h3 className="font-bold text-[#191c1d]">Inspector Profile</h3>
          </div>
          <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#757682] uppercase tracking-wider mb-1">
                  Inspector Name
                </label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-[#c5c5d3] focus:border-[#00236f] focus:ring-1 focus:ring-[#00236f] bg-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#757682] uppercase tracking-wider mb-1">
                  Department / Authority
                </label>
                <input
                  type="text"
                  value="Quality Control Team"
                  disabled
                  className="w-full px-3 py-2 rounded border border-[#c5c5d3] bg-[#f3f4f5] text-sm text-[#757682] cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#757682] uppercase tracking-wider mb-1">
                  System User Email
                </label>
                <input
                  type="text"
                  value={instructorEmail || 'inspector@demomhs.qc'}
                  disabled
                  className="w-full px-3 py-2 rounded border border-[#c5c5d3] bg-[#f3f4f5] text-sm text-[#757682] cursor-not-allowed truncate"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#757682] uppercase tracking-wider mb-1">
                  Default Calibration Target
                </label>
                <input
                  type="text"
                  value="ISO 9001:2015 Compliant"
                  disabled
                  className="w-full px-3 py-2 rounded border border-[#c5c5d3] bg-[#f3f4f5] text-sm text-[#757682] cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#edeeef] pt-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-green-700">
                {saveSuccess && (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Profile settings updated</span>
                  </>
                )}
              </div>
              <button
                type="submit"
                className="bg-[#00236f] hover:bg-[#1e3a8a] text-white font-bold text-xs py-2 px-4 rounded transition-colors"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>

        {/* Database Actions */}
        <div className="bg-white border border-[#c5c5d3] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="p-4 border-b border-[#c5c5d3] bg-red-50/50 flex items-center gap-2">
            <ShieldAlert size={18} className="text-[#ba1a1a]" />
            <h3 className="font-bold text-[#ba1a1a]">System Administration & Diagnostics</h3>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-[#444651]">
              Perform database resetting or clear localStorage keys. This brings back the original Master Forms and pre-loaded checksheets.
            </p>
            <div className="flex justify-start">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 bg-[#ba1a1a] hover:bg-red-800 text-white font-bold text-xs py-2 px-4 rounded transition-colors shadow-sm"
              >
                <RotateCcw size={14} />
                Reset Database Back To Default
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
