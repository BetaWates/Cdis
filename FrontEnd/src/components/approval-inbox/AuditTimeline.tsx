import React, { memo } from 'react';
import { ActivityLogEntry } from '../../types';
import { Clock } from 'lucide-react';

interface AuditTimelineProps {
  activityLog: ActivityLogEntry[];
}

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export const AuditTimeline = memo(function AuditTimeline({ activityLog }: AuditTimelineProps) {
  return (
    <div className="bg-white border border-[#c5c5d3] rounded-xl p-5 shadow-sm sticky top-24 flex flex-col gap-4">
      <h3 className="font-extrabold text-[#00236f] text-sm flex items-center gap-2 m-0 pb-2 border-b border-gray-100">
        <Clock size={16} /> Audit Timeline Log
      </h3>

      <div className="relative border-l border-gray-200 ml-2.5 pl-4 space-y-6 py-2">
        {activityLog.map((log) => {
          const isStart = log.type === 'start';
          const isFlag = log.type === 'flag';
          const isSubmit = log.type === 'submit';
          const isApprove = log.type === 'approve';
          const isReject = log.type === 'reject';
          const timestamp = log.timestamp || (log as { time?: string }).time || '';

          return (
            <div key={log.id} className="relative text-xs">
              <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border ${
                isFlag
                  ? 'bg-[#ba1a1a] border-[#ffdad6]'
                  : isApprove
                  ? 'bg-green-600 border-green-100'
                  : isReject
                  ? 'bg-[#ba1a1a] border-red-100'
                  : isSubmit
                  ? 'bg-[#00236f] border-blue-50'
                  : isStart
                  ? 'bg-gray-300 border-gray-100'
                  : 'bg-gray-300 border-gray-100'
              }`}></div>

              <div className="text-[10px] text-[#757682] font-mono mb-0.5">{formatTime(timestamp)}</div>
              <div className={`font-bold uppercase tracking-wider text-[11px] ${
                isFlag || isReject ? 'text-[#ba1a1a]' : isApprove ? 'text-green-800' : 'text-[#191c1d]'
              }`}>{log.action}</div>
              <div className="text-[11px] text-[#757682] mt-1">{log.user} ({log.details})</div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
