import React, { useState, useMemo } from 'react';
import { DailyCheckSubmission } from '../../types';
import { SubmissionCard } from './SubmissionCard';
import { Card, CardHeader, CardDescription, CardTitle } from '../ui/card';
import { Inbox, BellRing, UserCheck, Clock, ShieldAlert, CheckCircle, Search } from 'lucide-react';

interface ApprovalListProps {
  submissions: DailyCheckSubmission[];
  pendingCounts: { pic: number; leader: number; spv: number; manager: number };
  onOpenDetail: (submission: DailyCheckSubmission) => void;
}

/**
 * Approval Inbox list screen — stage stat cards, filter bar, submission cards.
 * Extracted from ApprovalInboxView (original lines 483–784).
 * Owns filter state (searchQuery, deptFilter, priorityFilter) and reminder state.
 */
export function ApprovalList({ submissions, pendingCounts, onOpenDetail }: ApprovalListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [reminderToast, setReminderToast] = useState<string | null>(null);
  const [remindersSent, setRemindersSent] = useState<Set<string>>(new Set());

  const filteredSubmissions = useMemo(
    () =>
      submissions.filter((s) => {
        const matchesSearch =
          s.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.submitterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.partNumber.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = deptFilter === '' || s.submitterDept.toLowerCase().includes(deptFilter.toLowerCase());
        const matchesPriority = priorityFilter === '' || s.priority === priorityFilter;
        return matchesSearch && matchesDept && matchesPriority;
      }),
    [submissions, searchQuery, deptFilter, priorityFilter]
  );

  const handleSendReminder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRemindersSent((prev) => new Set(prev).add(id));
    setReminderToast('Reminder sent to supervisor');
    setTimeout(() => setReminderToast(null), 3500);
  };

  return (
    <>
      {/* Reminder Toast */}
      {reminderToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-[#dce1ff] border-[#b6c4ff] text-[#00164e] text-sm font-semibold">
          <BellRing size={16} className="text-[#00236f] shrink-0" />
          {reminderToast}
        </div>
      )}

      {/* Header section */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#191c1d] m-0">Approval Inbox</h1>
        <p className="text-sm text-[#444651] mt-1">Review and approve pending checksheet submissions.</p>
      </div>

      {/* Stage Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending PIC */}
        <Card className="relative overflow-hidden border-l-4 border-l-blue-600 transition-all hover:shadow-md">
          <CardHeader className="pb-1">
            <CardDescription className="uppercase tracking-wider font-extrabold text-[9px] text-[#757682]">
              Stage 1: Pending PIC
            </CardDescription>
            <CardTitle className="text-2xl font-black text-[#191c1d] flex items-baseline gap-2 mt-1">
              {pendingCounts.pic}
              <span className="text-xs font-semibold text-[#757682]">submissions</span>
            </CardTitle>
          </CardHeader>
          <div className="absolute right-4 bottom-4 text-blue-200 pointer-events-none">
            <UserCheck size={36} className="opacity-40" />
          </div>
        </Card>

        {/* Card 2: Pending Leader */}
        <Card className="relative overflow-hidden border-l-4 border-l-amber-500 transition-all hover:shadow-md">
          <CardHeader className="pb-1">
            <CardDescription className="uppercase tracking-wider font-extrabold text-[9px] text-[#757682]">
              Stage 2: Pending Leader
            </CardDescription>
            <CardTitle className="text-2xl font-black text-[#191c1d] flex items-baseline gap-2 mt-1">
              {pendingCounts.leader}
              <span className="text-xs font-semibold text-[#757682]">submissions</span>
            </CardTitle>
          </CardHeader>
          <div className="absolute right-4 bottom-4 text-amber-200 pointer-events-none">
            <Clock size={36} className="opacity-40" />
          </div>
        </Card>

        {/* Card 3: Pending SPV */}
        <Card className="relative overflow-hidden border-l-4 border-l-orange-500 transition-all hover:shadow-md">
          <CardHeader className="pb-1">
            <CardDescription className="uppercase tracking-wider font-extrabold text-[9px] text-[#757682]">
              Stage 3: Pending SPV
            </CardDescription>
            <CardTitle className="text-2xl font-black text-[#191c1d] flex items-baseline gap-2 mt-1">
              {pendingCounts.spv}
              <span className="text-xs font-semibold text-[#757682]">submissions</span>
            </CardTitle>
          </CardHeader>
          <div className="absolute right-4 bottom-4 text-orange-200 pointer-events-none">
            <ShieldAlert size={36} className="opacity-40" />
          </div>
        </Card>

        {/* Card 4: Pending Manager */}
        <Card className="relative overflow-hidden border-l-4 border-l-purple-600 transition-all hover:shadow-md">
          <CardHeader className="pb-1">
            <CardDescription className="uppercase tracking-wider font-extrabold text-[9px] text-[#757682]">
              Stage 4: Pending Manager
            </CardDescription>
            <CardTitle className="text-2xl font-black text-[#191c1d] flex items-baseline gap-2 mt-1">
              {pendingCounts.manager}
              <span className="text-xs font-semibold text-[#757682]">submissions</span>
            </CardTitle>
          </CardHeader>
          <div className="absolute right-4 bottom-4 text-purple-200 pointer-events-none">
            <CheckCircle size={36} className="opacity-40" />
          </div>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-[#c5c5d3] rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-3xl">
          {/* Search query */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#757682]" />
            <input
              type="text"
              placeholder="Search by Model, Part, or Submitter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#f8f9fa] border border-[#c5c5d3] placeholder-[#757682] rounded-lg focus:border-[#00236f] focus:outline-none focus:ring-1 focus:ring-[#00236f] text-xs text-[#191c1d]"
            />
          </div>

          {/* Dept select */}
          <div className="relative w-full sm:w-48">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full bg-[#f8f9fa] border border-[#c5c5d3] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#191c1d] appearance-none focus:outline-none focus:ring-1 focus:ring-[#00236f]"
            >
              <option value="">All Departments</option>
              <option value="Assembly">Assembly</option>
              <option value="Paint">Paint Shop</option>
              <option value="Chassis">Chassis</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="relative w-full sm:w-40">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full bg-[#f8f9fa] border border-[#c5c5d3] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#191c1d] appearance-none focus:outline-none focus:ring-1 focus:ring-[#00236f]"
            >
              <option value="">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="NORMAL">Normal</option>
            </select>
          </div>
        </div>
      </div>

      {/* List Cards Container */}
      <div className="flex flex-col gap-4">
        {filteredSubmissions.map((s) => (
          <SubmissionCard
            key={s.id}
            submission={s}
            remindersSent={remindersSent}
            onOpenDetail={onOpenDetail}
            onSendReminder={handleSendReminder}
          />
        ))}

        {filteredSubmissions.length === 0 && (
          <Card className="border-dashed border-gray-300 py-12 flex flex-col items-center justify-center text-center">
            <Inbox className="text-gray-300 mb-2" size={36} />
            <p className="text-xs text-[#757682] italic">
              No pending submission records found in this folder.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
