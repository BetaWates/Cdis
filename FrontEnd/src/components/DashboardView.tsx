import { MasterForm, DailyCheckSubmission } from '../types';
import { ShieldCheck, AlertTriangle, FileSpreadsheet, Hourglass, TrendingUp } from 'lucide-react';

interface DashboardViewProps {
  masterForms: MasterForm[];
  submissions: DailyCheckSubmission[];
  onNavigateToInbox: () => void;
  onNavigateToChecks: () => void;
}

export default function DashboardView({
  masterForms,
  submissions,
  onNavigateToInbox,
  onNavigateToChecks
}: DashboardViewProps) {
  // Compute key stats
  const totalMasterForms = masterForms.length;
  const activeMasterForms = masterForms.filter(f => f.status === 'ACTIVE').length;
  const draftMasterForms = masterForms.filter(f => f.status === 'DRAFT').length;

  const totalSubmissions = submissions.length;
  const pendingSubmissions = submissions.filter(s => s.status === 'PENDING').length;

  // Completed today — match submittedAt against today's date
  const completedToday = submissions.filter(s => {
    if (!s.submittedAt) return false;
    const subDate = new Date(s.submittedAt).toDateString();
    const todayDate = new Date().toDateString();
    return subDate === todayDate;
  }).length;

  // NG Rate: % of submissions containing at least one NG measurement
  const ngSubmissions = submissions.filter(s => s.measurements.some(m => m.status === 'NG')).length;
  const ngRate = totalSubmissions > 0
    ? ((ngSubmissions / totalSubmissions) * 100).toFixed(1)
    : '0.0';
  const ngRateNum = parseFloat(ngRate);

  // Pass rate for the circular chart
  const passedCount = submissions.filter(s => s.measurements.every(m => m.status !== 'NG')).length;
  const passRate = totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 100;

  // Recent 4 submissions for the activity panel
  const recentSubmissions = [...submissions]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 4);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#f8f9fa]">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-6">

        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#191c1d] m-0">
            Inspector Dashboard
          </h1>
          <p className="text-sm text-[#444651] mt-1">
            Real-time compliance KPIs and operational status overview.
          </p>
        </div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Card 1 — Total Master Forms */}
          <div className="bg-white border border-[#c5c5d3] p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-bold text-[#757682] tracking-wider">Master Forms</p>
              <h3 className="text-2xl font-black text-[#00236f] mt-1">{totalMasterForms}</h3>
              <p className="text-[11px] text-[#444651] mt-1 font-semibold">
                <span className="text-[#00236f]">{activeMasterForms} Active</span> • {draftMasterForms} Drafts
              </p>
            </div>
            <div className="p-3 rounded-full bg-[#dce1ff]/40 text-[#00236f]">
              <FileSpreadsheet size={24} />
            </div>
          </div>

          {/* Card 2 — Pending Approval (amber when >0) */}
          <div className={`bg-white border p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center justify-between transition-colors ${
            pendingSubmissions > 0 ? 'border-amber-300 bg-amber-50/30' : 'border-[#c5c5d3]'
          }`}>
            <div>
              <p className="text-xs uppercase font-bold text-[#757682] tracking-wider">Pending Approval</p>
              <h3 className={`text-2xl font-black mt-1 ${pendingSubmissions > 0 ? 'text-[#fea619]' : 'text-[#191c1d]'}`}>
                {pendingSubmissions}
              </h3>
              <button
                onClick={onNavigateToInbox}
                className="text-[11px] text-[#00236f] hover:underline font-bold mt-1 text-left inline-block"
              >
                Requires review &rarr;
              </button>
            </div>
            <div className={`p-3 rounded-full ${pendingSubmissions > 0 ? 'bg-amber-100 text-[#fea619]' : 'bg-amber-50 text-[#fea619]'}`}>
              <Hourglass size={24} />
            </div>
          </div>

          {/* Card 3 — Completed Today (green when >0) */}
          <div className={`bg-white border p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center justify-between transition-colors ${
            completedToday > 0 ? 'border-green-200 bg-green-50/20' : 'border-[#c5c5d3]'
          }`}>
            <div>
              <p className="text-xs uppercase font-bold text-[#757682] tracking-wider">Completed Today</p>
              <h3 className={`text-2xl font-black mt-1 ${completedToday > 0 ? 'text-green-700' : 'text-[#191c1d]'}`}>
                {completedToday}
              </h3>
              <p className="text-[11px] text-[#444651] mt-1">
                {totalSubmissions} total submissions
              </p>
            </div>
            <div className={`p-3 rounded-full ${completedToday > 0 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-800'}`}>
              <ShieldCheck size={24} />
            </div>
          </div>

          {/* Card 4 — NG Rate (red when >10%, amber when >0) */}
          <div className={`bg-white border p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center justify-between transition-colors ${
            ngRateNum > 10
              ? 'border-red-200 bg-red-50/20'
              : ngRateNum > 0
              ? 'border-amber-200 bg-amber-50/20'
              : 'border-green-200 bg-green-50/10'
          }`}>
            <div>
              <p className="text-xs uppercase font-bold text-[#757682] tracking-wider">NG Rate</p>
              <h3 className={`text-2xl font-black mt-1 ${
                ngRateNum > 10 ? 'text-[#ba1a1a]' : ngRateNum > 0 ? 'text-[#fea619]' : 'text-green-700'
              }`}>
                {ngRate}%
              </h3>
              <p className="text-[11px] text-[#444651] mt-1">
                {ngSubmissions} flagged of {totalSubmissions}
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              ngRateNum > 10
                ? 'bg-red-100 text-[#ba1a1a]'
                : ngRateNum > 0
                ? 'bg-amber-100 text-[#fea619]'
                : 'bg-green-100 text-green-700'
            }`}>
              {ngRateNum > 10 ? <AlertTriangle size={24} /> : <TrendingUp size={24} />}
            </div>
          </div>

        </div>

        {/* Graphical Section & Summary Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left panel: Quality Compliance Progress */}
          <div className="lg:col-span-7 bg-white border border-[#c5c5d3] p-6 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="font-bold text-lg text-[#191c1d]">Quality Compliance Progress</h3>
              <p className="text-xs text-[#757682]">Production standard compliance summary.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center my-2">
              <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                {/* SVG Circle indicator */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="40"
                    className="stroke-[#edeeef]" strokeWidth="8" fill="transparent"
                  />
                  <circle
                    cx="50" cy="50" r="40"
                    className="stroke-[#00236f] transition-all duration-1000"
                    strokeWidth="8" fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * passRate) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center flex flex-col">
                  <span className="text-3xl font-black text-[#00236f]">{passRate}%</span>
                  <span className="text-[10px] text-[#757682] uppercase font-bold tracking-wider">Pass rate</span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="p-3 bg-green-50 rounded-lg flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-600"></div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-green-900">Optimal Tolerance Check</p>
                    <p className="text-[11px] text-green-700">Submissions fully compliant with specification documents.</p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-amber-900">Approved Deviations</p>
                    <p className="text-[11px] text-[#653e00]">Minor exceptions signed off by supervisors.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#c5c5d3] pt-4 mt-2 flex justify-between items-center">
              <span className="text-xs text-[#444651]">Ready for next verification batch?</span>
              <button
                onClick={onNavigateToChecks}
                className="text-xs font-bold text-white bg-[#00236f] hover:bg-[#1e3a8a] py-1.5 px-3 rounded"
              >
                Start New Check
              </button>
            </div>
          </div>

          {/* Right panel: Recent Activity Submissions */}
          <div className="lg:col-span-5 bg-white border border-[#c5c5d3] p-6 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-lg text-[#191c1d]">Recent Audits</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider text-white bg-[#00236f] px-2 py-0.5 rounded-full">Live</span>
              </div>
              <p className="text-xs text-[#757682] mb-4">Latest parameter entries logged by the team.</p>

              <div className="space-y-3">
                {recentSubmissions.map((s) => {
                  const hasNG = s.measurements.some(m => m.status === 'NG');
                  return (
                    <div
                      key={s.id}
                      className="p-3 rounded-lg bg-[#f8f9fa] border border-[#edeeef] flex justify-between items-center hover:bg-gray-50 transition-colors"
                    >
                      <div className="overflow-hidden pr-2">
                        <p className="text-xs font-bold text-[#191c1d] truncate">{s.modelName}</p>
                        <p className="text-[10px] text-[#757682] mt-0.5 font-mono">
                          ID: {s.sampleId} • By {s.submitterName}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                        hasNG
                          ? 'bg-red-100 text-[#ba1a1a] border border-red-200'
                          : 'bg-green-100 text-green-800 border border-green-200'
                      }`}>
                        {hasNG ? 'FLAGGED NG' : 'OK'}
                      </span>
                    </div>
                  );
                })}

                {recentSubmissions.length === 0 && (
                  <p className="text-xs text-[#757682] italic py-6 text-center">No checks submitted yet.</p>
                )}
              </div>
            </div>

            <button
              onClick={onNavigateToInbox}
              className="w-full text-center text-xs font-bold text-[#00236f] hover:underline pt-4 border-t border-[#c5c5d3] mt-2 block"
            >
              See all logs in Approval Inbox &rarr;
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
