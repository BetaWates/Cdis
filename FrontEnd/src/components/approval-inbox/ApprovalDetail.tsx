import React from 'react';
import { DailyCheckSubmission } from '../../types';
import { ReviewDecisionPanel } from './ReviewDecisionPanel';
import { AuditTimeline } from './AuditTimeline';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '../ui/table';
import { Download, AlertTriangle, Check, CheckCircle, X } from 'lucide-react';
import { exportToExcel, exportToPDF } from './exportUtils';

interface ApprovalDetailProps {
  submission: DailyCheckSubmission;
  inspectorName: string;
  reviewNotes: string;
  setReviewNotes: (v: string) => void;
  isReviewing: boolean;
  onAdvance: () => void;
  onReject: () => void;
  onApproveWaiver: () => void;
  onRequestReject: () => void;
  onBack: () => void;
}

/**
 * Full detail view for a single submission.
 * Extracted from ApprovalInboxView (original lines 786–1196).
 */
export function ApprovalDetail({
  submission,
  inspectorName,
  reviewNotes,
  setReviewNotes,
  isReviewing,
  onAdvance,
  onReject,
  onApproveWaiver,
  onRequestReject,
  onBack,
}: ApprovalDetailProps) {
  const handleExportToExcel = () => exportToExcel(submission);
  const handleExportToPDF = () => exportToPDF(submission);

  const okCount = submission.measurements.filter((m) => m.status === 'OK').length;
  const ngCount = submission.measurements.filter((m) => m.status === 'NG').length;
  const passRate = submission.measurements.length > 0
    ? Math.round((okCount / submission.measurements.length) * 100)
    : 0;

  return (
    <>
      {/* Header / Breadcrumbs */}
      <div className="mb-2">
        <div className="flex items-center gap-1 text-xs text-[#757682] mb-2 font-semibold">
          <button onClick={onBack} className="text-[#00236f] font-bold hover:underline">
            Approval Inbox
          </button>
          <div className="mx-1">/</div>
          <span className="text-gray-900 font-mono">{submission.id}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#00236f] m-0">
              Final Inspection Review: {submission.modelName}
            </h2>
            <p className="text-xs text-[#757682] mt-0.5 font-semibold">
              Submitted by {submission.submitterName} • {submission.submitterDept} • {submission.submittedDate}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleExportToExcel}
                className="text-xs font-bold text-[#00236f] hover:underline flex items-center gap-1.5 bg-[#dce1ff]/30 hover:bg-[#dce1ff]/60 px-3.5 py-1.5 rounded-lg border border-[#b6c4ff] transition-all cursor-pointer select-none active:scale-95"
              >
                <Download size={14} /> Export Excel
              </button>
            </div>
          </div>
          <div className="shrink-0">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
              submission.priority === 'HIGH'
                ? 'bg-red-50 text-[#ba1a1a] border-[#ba1a1a]/30'
                : 'bg-blue-50 text-[#00236f] border-blue-200'
            }`}>
              {submission.priority === 'HIGH' ? 'Needs Supervisor Attention' : 'Standard Queue'}
            </span>
          </div>
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* Left Main (9 cols) */}
        <div className="xl:col-span-9 space-y-6">

          {submission.rejectRequestRemark && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800 flex flex-col gap-1 shadow-sm">
              <span className="font-extrabold text-orange-850 uppercase tracking-wider text-xs">Reject Request Reason:</span>
              <p className="text-orange-950 mt-0.5">{submission.rejectRequestRemark}</p>
            </div>
          )}

          {/* Summary Metrics block */}
          <section className="bg-white border border-[#c5c5d3] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between shadow-sm gap-4">
            <div className="flex items-center gap-8 w-full sm:w-auto">
              <div>
                <span className="text-[10px] text-[#757682] uppercase font-bold tracking-wider">Total Checks</span>
                <h4 className="text-2xl font-black text-slate-800 mt-0.5">{submission.measurements.length}</h4>
              </div>
              <div className="h-8 w-px bg-[#c5c5d3]"></div>
              <div>
                <span className="text-[10px] text-[#757682] uppercase font-bold tracking-wider">Passed (OK)</span>
                <h4 className="text-2xl font-black text-green-700 mt-0.5">{okCount}</h4>
              </div>
              <div className="h-8 w-px bg-[#c5c5d3]"></div>
              <div>
                <span className="text-[10px] text-[#757682] uppercase font-bold tracking-wider">Failed (NG)</span>
                <h4 className="text-2xl font-black text-[#ba1a1a] mt-0.5 flex items-center gap-1">
                  {ngCount}
                  {ngCount > 0 && <AlertTriangle size={16} className="text-[#ba1a1a]" />}
                </h4>
              </div>
            </div>

            {/* Pass rate progress bar */}
            <div className="w-full sm:w-auto overflow-hidden">
              <div className="w-48 bg-slate-100 h-2.5 rounded-full flex overflow-hidden">
                <div className="bg-green-600 h-full" style={{ width: `${(okCount / submission.measurements.length) * 100}%` }}></div>
                <div className="bg-[#ba1a1a] h-full" style={{ width: `${(ngCount / submission.measurements.length) * 100}%` }}></div>
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-[#757682] font-semibold">
                <span>Pass Rate: {passRate}%</span>
                <span>Target: 100%</span>
              </div>
            </div>
          </section>

          {/* Measurement Data Table */}
          <section className="bg-white border border-[#c5c5d3] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#c5c5d3] bg-[#f8f9fa] flex justify-between items-center">
              <h3 className="font-bold text-sm text-[#00236f]">Calibration Values Verification</h3>
              <button
                onClick={() => alert('Simulating downloading raw calibration entries.')}
                className="text-xs font-bold text-[#00236f] hover:underline flex items-center gap-1"
              >
                <Download size={14} /> Export CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">ID</TableHead>
                    <TableHead>Parameter Name</TableHead>
                    <TableHead>Standard Value</TableHead>
                    <TableHead>Tolerance</TableHead>
                    <TableHead>Measured Shift Values</TableHead>
                    <TableHead className="text-right">Verification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submission.measurements.map((m, index) => {
                    const isNG = m.status === 'NG';
                    const valI = m.shiftIValue || m.measuredValue;
                    const valII = m.shiftIIValue || m.measuredValue;
                    const valIII = m.shiftIIIValue || m.measuredValue;
                    const statusI = m.shiftIStatus || m.status;
                    const statusII = m.shiftIIStatus || m.status;
                    const statusIII = m.shiftIIIStatus || m.status;

                    const shiftBadge = (label: string, val: string, st: string) => (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-[#757682] font-bold uppercase w-12">{label}:</span>
                        <span className={st === 'NG' ? 'text-[#ba1a1a] font-bold' : 'text-slate-800 font-medium'}>{val} {m.unit}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                          st === 'OK' ? 'bg-green-50 text-green-700 border-green-200'
                          : st === 'NG' ? 'bg-red-100 text-[#ba1a1a] border-red-200'
                          : 'bg-gray-50 text-[#757682] border-gray-200'
                        }`}>{st}</span>
                      </div>
                    );

                    return (
                      <TableRow key={m.paramName} className={isNG ? 'bg-red-50/50 hover:bg-red-50 text-[#ba1a1a]' : ''}>
                        <TableCell className="text-center font-semibold text-[#757682] relative">
                          {isNG && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ba1a1a]"></div>}
                          {String(index + 1).padStart(2, '0')}
                        </TableCell>
                        <TableCell className="font-semibold">{m.paramName}</TableCell>
                        <TableCell className="text-[#757682] font-mono">{m.standardValue} {m.unit}</TableCell>
                        <TableCell className="text-[#757682] font-mono">{m.tolerance}</TableCell>
                        <TableCell className="font-mono text-xs">
                          <div className="flex flex-col gap-1 py-1">
                            {shiftBadge('Shift I', valI ?? '', statusI ?? '')}
                            {shiftBadge('Shift II', valII ?? '', statusII ?? '')}
                            {shiftBadge('Shift III', valIII ?? '', statusIII ?? '')}
                            {m.handwritingData && (
                              <div className="mt-1 flex flex-col gap-0.5 items-start">
                                <span className="text-[8px] text-[#757682] uppercase font-bold">Ref Handwriting:</span>
                                <img src={m.handwritingData} alt="Handwritten value stroke" className="h-6 border border-gray-100 bg-white rounded object-contain max-w-[100px]" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded ${isNG ? 'bg-[#ba1a1a] text-white' : 'bg-[#dce1ff] text-[#00164e]'}`}>
                            {isNG ? <X size={12} /> : <Check size={12} />}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>

          {/* Shifts Summary Section */}
          <section className="bg-white border border-[#c5c5d3] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#c5c5d3] bg-[#f8f9fa] flex justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-sm text-[#00236f] m-0">Shift Inspection Summary</h3>
                <p className="text-[10px] text-[#757682] mt-0.5 font-semibold">Consolidated tally of PASS/FAIL verification across Shifts I, II, and III.</p>
              </div>
              <div className="flex gap-2.5 shrink-0">
                <button
                  onClick={handleExportToExcel}
                  className="text-xs font-bold text-[#00236f] hover:underline flex items-center gap-1.5 bg-[#dce1ff]/30 hover:bg-[#dce1ff]/60 px-3.5 py-2 rounded-lg border border-[#b6c4ff] transition-all cursor-pointer select-none active:scale-95"
                >
                  <Download size={14} /> Export to Excel
                </button>
                <button
                  onClick={handleExportToPDF}
                  className="text-xs font-bold text-[#00236f] hover:underline flex items-center gap-1.5 bg-[#dce1ff]/30 hover:bg-[#dce1ff]/60 px-3.5 py-2 rounded-lg border border-[#b6c4ff] transition-all cursor-pointer select-none active:scale-95"
                >
                  <Download size={14} className="text-[#00236f]" /> Export to PDF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>Inspection Item</TableHead>
                    <TableHead className="text-center w-32">Total OK</TableHead>
                    <TableHead className="text-center w-32">Total NG</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submission.measurements.map((m, index) => {
                    const statusI = m.shiftIStatus || m.status;
                    const statusII = m.shiftIIStatus || m.status;
                    const statusIII = m.shiftIIIStatus || m.status;
                    let totalOk = 0, totalNg = 0;
                    if (statusI === 'OK') totalOk++; if (statusI === 'NG') totalNg++;
                    if (statusII === 'OK') totalOk++; if (statusII === 'NG') totalNg++;
                    if (statusIII === 'OK') totalOk++; if (statusIII === 'NG') totalNg++;
                    const hasNG = totalNg > 0;

                    return (
                      <TableRow
                        key={`summary-${m.paramName}`}
                        className={hasNG ? 'bg-red-50 hover:bg-red-100/70 text-[#ba1a1a]' : 'hover:bg-gray-50/50'}
                      >
                        <TableCell className="text-center font-semibold text-[#757682] relative">
                          {hasNG && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ba1a1a]"></div>}
                          {String(index + 1).padStart(2, '0')}
                        </TableCell>
                        <TableCell className="font-bold">{m.paramName}</TableCell>
                        <TableCell className="text-center font-mono font-bold text-green-700">{totalOk}</TableCell>
                        <TableCell className={`text-center font-mono font-bold ${hasNG ? 'text-[#ba1a1a]' : 'text-slate-500'}`}>{totalNg}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>

          {/* Review Decision Panel */}
          <ReviewDecisionPanel
            submission={submission}
            inspectorName={inspectorName}
            reviewNotes={reviewNotes}
            setReviewNotes={setReviewNotes}
            isReviewing={isReviewing}
            onAdvance={onAdvance}
            onReject={onReject}
            onApproveWaiver={onApproveWaiver}
            onShowRequestRejectModal={onRequestReject}
          />
        </div>

        {/* Right Sidebar (3 cols) Timeline Activity Log */}
        <div className="xl:col-span-3">
          <AuditTimeline activityLog={submission.activityLog} />
        </div>

      </div>
    </>
  );
}
