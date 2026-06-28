import React, { memo } from 'react';
import { DailyCheckSubmission } from '../../types';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import {
  Bell,
  BellRing,
  AlertTriangle,
  Check,
  CheckCircle,
} from 'lucide-react';

/** Extracts two-letter initials from a department string. */
function getDeptInitials(dept: string): string {
  if (!dept) return 'QC';
  const cleaned = dept.replace(/shop/i, '').trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return cleaned.substring(0, 2).toUpperCase();
}

/** Returns true when a submission has been pending for more than 24 hours. */
function isOverdue(submittedAt?: string): boolean {
  if (!submittedAt) return true;
  try {
    const parsed = new Date(submittedAt);
    if (isNaN(parsed.getTime())) return true;
    return Date.now() - parsed.getTime() > 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

interface SubmissionCardProps {
  submission: DailyCheckSubmission;
  remindersSent: Set<string>;
  onOpenDetail: (s: DailyCheckSubmission) => void;
  onSendReminder: (id: string, e: React.MouseEvent) => void;
}

/**
 * Single submission card in the Approval Inbox list.
 * Extracted from ApprovalInboxView (original lines 615–771).
 * Wrapped with React.memo — with 10–50 cards, prevents all cards
 * re-rendering when only filter state or one reminder badge changes.
 */
export const SubmissionCard = memo(function SubmissionCard({
  submission: s,
  remindersSent,
  onOpenDetail,
  onSendReminder,
}: SubmissionCardProps) {
  const isHigh = s.priority === 'HIGH';
  const isApproved = s.status === 'APPROVED' || s.status === 'APPROVED_EXCEPTION';
  const isRejected = s.status === 'REJECTED';
  const isRequestReject = s.status === 'REQUEST_REJECT';

  const okCount = s.measurements.filter((m) => m.status === 'OK').length;
  const ngCount = s.measurements.filter((m) => m.status === 'NG').length;
  const overdue = isOverdue(s.submittedAt);

  return (
    <Card
      onClick={() => onOpenDetail(s)}
      className="hover:border-[#00236f] hover:shadow-md transition-all cursor-pointer group"
    >
      <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

        {/* Submitter & Avatar */}
        <div className="flex items-center gap-4 min-w-[200px]">
          <div className="w-10 h-10 rounded-full bg-[#dce1ff] text-[#00236f] flex items-center justify-center font-extrabold text-xs shrink-0 shadow-inner">
            {getDeptInitials(s.submitterDept)}
          </div>
          <div>
            <h4 className="font-extrabold text-[#191c1d] text-sm group-hover:text-[#00236f] transition-colors">
              {s.submitterName}
            </h4>
            <span className="text-[10px] text-[#757682] font-semibold">{s.submitterDept} • {s.submittedDate}</span>
          </div>
        </div>

        {/* Model Details */}
        <div className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#191c1d] text-xs">{s.modelName}</span>
            <span className="text-[10px] text-[#757682] font-mono font-medium">({s.partNumber})</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {isHigh && <Badge variant="high">HIGH PRIORITY</Badge>}
            {isApproved && <Badge variant="active">{s.status === 'APPROVED' ? 'APPROVED' : 'APPROVED EXCEPTION'}</Badge>}
            {isRejected && <Badge variant="destructive">REJECTED</Badge>}
            {isRequestReject && (
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                REQUEST REJECT
              </Badge>
            )}
            {!isApproved && !isRejected && !isRequestReject && <Badge variant="secondary">PENDING</Badge>}
            {!isApproved && !isRejected && overdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border bg-[#dce1ff] text-[#00164e] border-[#b6c4ff]">
                <Bell size={9} /> Reminder Sent
              </span>
            )}
          </div>
        </div>

        {/* OK/NG Summary Metrics */}
        <div className="flex items-center gap-4 min-w-[120px] bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
          <div className="text-center">
            <div className="text-[8px] uppercase tracking-wider font-extrabold text-[#757682]">Passed</div>
            <div className="text-xs font-black text-green-700">{okCount} OK</div>
          </div>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="text-center">
            <div className="text-[8px] uppercase tracking-wider font-extrabold text-[#757682]">Failed</div>
            <div className={`text-xs font-black ${ngCount > 0 ? 'text-[#ba1a1a] flex items-center gap-0.5' : 'text-slate-500'}`}>
              {ngCount} NG
              {ngCount > 0 && <AlertTriangle size={10} className="text-[#ba1a1a]" />}
            </div>
          </div>
        </div>

        {/* Interactive Stage Progress Nodes */}
        <div className="flex items-center gap-1.5 min-w-[280px]">
          {/* PIC node */}
          <div className="flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border ${
              s.progress.pic === 'APPROVED' ? 'bg-[#00236f] text-white border-transparent' : 'bg-transparent text-[#757682] border-[#c5c5d3]'
            }`}>
              {s.progress.pic === 'APPROVED' ? <Check size={12} /> : '1'}
            </div>
            <span className="text-[8px] font-extrabold uppercase text-[#757682]">PIC</span>
          </div>
          <div className={`w-8 h-[2px] mb-3 ${s.progress.leader === 'APPROVED' || s.progress.leader === 'CURRENT' ? 'bg-[#00236f]' : 'bg-[#c5c5d3]'}`}></div>

          {/* Leader node */}
          <div className="flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border ${
              s.progress.leader === 'APPROVED'
                ? 'bg-[#00236f] text-white border-transparent'
                : s.progress.leader === 'CURRENT'
                ? 'border-2 border-[#fea619] text-[#fea619] bg-amber-50 animate-pulse'
                : 'bg-transparent text-[#757682] border-[#c5c5d3]'
            }`}>
              {s.progress.leader === 'APPROVED' ? <Check size={12} /> : '2'}
            </div>
            <span className="text-[8px] font-extrabold uppercase text-[#757682]">Leader</span>
          </div>
          <div className={`w-8 h-[2px] mb-3 ${s.progress.spv === 'APPROVED' || s.progress.spv === 'CURRENT' ? 'bg-[#00236f]' : 'bg-[#c5c5d3]'}`}></div>

          {/* SPV node */}
          <div className="flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border ${
              s.progress.spv === 'APPROVED'
                ? 'bg-[#00236f] text-white border-transparent'
                : s.progress.spv === 'CURRENT'
                ? 'border-2 border-[#fea619] text-[#fea619] bg-amber-50 animate-pulse'
                : 'bg-transparent text-[#757682] border-[#c5c5d3]'
            }`}>
              {s.progress.spv === 'APPROVED' ? <Check size={12} /> : '3'}
            </div>
            <span className="text-[8px] font-extrabold uppercase text-[#757682]">SPV</span>
          </div>
          <div className={`w-8 h-[2px] mb-3 ${s.progress.manager === 'APPROVED' || s.progress.manager === 'CURRENT' ? 'bg-[#00236f]' : 'bg-[#c5c5d3]'}`}></div>

          {/* Manager node */}
          <div className="flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border ${
              s.progress.manager === 'APPROVED'
                ? 'bg-[#00236f] text-white border-transparent'
                : s.progress.manager === 'CURRENT'
                ? 'border-2 border-[#fea619] text-[#fea619] bg-amber-50 animate-pulse'
                : 'bg-transparent text-[#757682] border-[#c5c5d3]'
            }`}>
              {s.progress.manager === 'APPROVED' ? <Check size={12} /> : '4'}
            </div>
            <span className="text-[8px] font-extrabold uppercase text-[#757682]">Manager</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="shrink-0 flex flex-col gap-2 items-end">
          {!isApproved && !isRejected && overdue && (
            <button
              type="button"
              onClick={(e) => onSendReminder(s.id, e)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-[#00236f] border border-[#00236f]/30 rounded-lg px-2.5 py-1 hover:bg-[#dce1ff]/30 transition-colors"
              title="Send email reminder to supervisor"
            >
              <BellRing size={11} /> Send Reminder
            </button>
          )}
          <Button
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(s);
            }}
            className="group-hover:bg-[#00236f] group-hover:text-white transition-colors"
          >
            Review &rarr;
          </Button>
        </div>

      </CardContent>
    </Card>
  );
});
