import React, { useState } from 'react';
import { DailyCheckSubmission, MeasurementEntry, ActivityLogEntry } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { 
  Search, 
  Filter, 
  Trash2, 
  CheckCircle, 
  X, 
  Download, 
  Check, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  Undo2,
  ThumbsUp,
  Ban,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Inbox,
  UserCheck,
  Bell,
  BellRing,
  FileText
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';

interface ApprovalInboxViewProps {
  submissions: DailyCheckSubmission[];
  setSubmissions: React.Dispatch<React.SetStateAction<DailyCheckSubmission[]>>;
  inspectorName: string;
  pendingCounts: {
    pic: number;
    leader: number;
    spv: number;
    manager: number;
  };
  onAdvanceApproval: (id: string, reviewerName: string, reviewNotes: string) => void;
  onRejectSubmission: (id: string, reviewerName: string, reviewNotes: string) => void;
  onApproveException: (id: string, reviewerName: string, reviewNotes: string) => void;
  onRequestReject: (id: string, requesterName: string, remark: string) => void;
}

export default function ApprovalInboxView({ 
  submissions, 
  setSubmissions,
  inspectorName,
  pendingCounts,
  onAdvanceApproval,
  onRejectSubmission,
  onApproveException,
  onRequestReject
}: ApprovalInboxViewProps) {
  const [viewState, setViewState] = useState<'list' | 'detail'>('list');
  const [selectedSubmission, setSelectedSubmission] = useState<DailyCheckSubmission | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Review notes text
  const [reviewNotes, setReviewNotes] = useState('');

  // Reminder toast and sent-tracking (Task 3E)
  const [reminderToast, setReminderToast] = useState<string | null>(null);
  const [remindersSent, setRemindersSent] = useState<Set<string>>(new Set());

  // Request Reject state
  const [showRequestRejectModal, setShowRequestRejectModal] = useState(false);
  const [requestRejectRemark, setRequestRejectRemark] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const handleExportToExcel = () => {
    if (!selectedSubmission) return;

    // Sheet 1: Inspection Result
    const ws1Data = [
      ["Model Name", "Part Number", "Sample ID", "Submitter Name", "Department", "Submitted Date", "Overall Status"],
      [
        selectedSubmission.modelName || '',
        selectedSubmission.partNumber || '',
        selectedSubmission.sampleId || '',
        selectedSubmission.submitterName || '',
        selectedSubmission.submitterDept || '',
        selectedSubmission.submittedDate || '',
        selectedSubmission.status || ''
      ]
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
    ws1["!cols"] = [
      { wch: 25 }, // Model Name
      { wch: 20 }, // Part Number
      { wch: 15 }, // Sample ID
      { wch: 20 }, // Submitter Name
      { wch: 15 }, // Department
      { wch: 20 }, // Submitted Date
      { wch: 25 }  // Overall Status
    ];

    // Sheet 2: Measurements
    const ws2Data = [
      [
        "Parameter Name",
        "Standard Value",
        "Tolerance",
        "Unit",
        "Shift I Value",
        "Shift I Status",
        "Shift II Value",
        "Shift II Status",
        "Shift III Value",
        "Shift III Status"
      ]
    ];
    selectedSubmission.measurements.forEach(m => {
      const valI = m.shiftIValue !== undefined ? m.shiftIValue : (m.measuredValue || '');
      const statusI = m.shiftIStatus || m.status || '';
      const valII = m.shiftIIValue !== undefined ? m.shiftIIValue : (m.measuredValue || '');
      const statusII = m.shiftIIStatus || m.status || '';
      const valIII = m.shiftIIIValue !== undefined ? m.shiftIIIValue : (m.measuredValue || '');
      const statusIII = m.shiftIIIStatus || m.status || '';

      ws2Data.push([
        m.paramName || '',
        m.standardValue || '',
        m.tolerance || '',
        m.unit || '',
        valI,
        statusI,
        valII,
        statusII,
        valIII,
        statusIII
      ]);
    });
    const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
    ws2["!cols"] = [
      { wch: 30 }, // Parameter Name
      { wch: 15 }, // Standard Value
      { wch: 12 }, // Tolerance
      { wch: 8 },  // Unit
      { wch: 15 }, // Shift I Value
      { wch: 15 }, // Shift I Status
      { wch: 15 }, // Shift II Value
      { wch: 15 }, // Shift II Status
      { wch: 15 }, // Shift III Value
      { wch: 15 }  // Shift III Status
    ];

    // Sheet 3: Approval Log
    const ws3Data = [
      ["Time", "Action", "User", "Details"]
    ];
    selectedSubmission.activityLog.forEach(log => {
      ws3Data.push([
        log.time || '',
        log.action || '',
        log.user || '',
        log.details || ''
      ]);
    });
    const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
    ws3["!cols"] = [
      { wch: 20 }, // Time
      { wch: 20 }, // Action
      { wch: 25 }, // User
      { wch: 40 }  // Details
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Inspection Result");
    XLSX.utils.book_append_sheet(wb, ws2, "Measurements");
    XLSX.utils.book_append_sheet(wb, ws3, "Approval Log");

    const safeFileName = `Inspection_Detail_${selectedSubmission.partNumber}_${selectedSubmission.id}.xlsx`;
    XLSX.writeFile(wb, safeFileName);
  };

  const handleExportToPDF = () => {
    if (!selectedSubmission) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 1. Draw AIINA Logo & Company Name (as header)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(200, 16, 46); // Red (#C8102E)
    doc.text("AIINA", 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(27, 42, 107); // Navy (#1B2A6B)
    doc.text("QC", 48, 20);

    // Blue Line under logo
    doc.setDrawColor(27, 42, 107);
    doc.setLineWidth(0.8);
    doc.line(14, 23, 196, 23);

    // Company Name below line
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(27, 42, 107);
    doc.text("PT. ALPHA INNOVATECH INDONESIA", 14, 27);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text("QUALITY CONTROL DIGITAL INSPECTION SUMMARY REPORT", 14, 38);

    // Two column layout for part & submission info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);

    doc.text(`Model: ${selectedSubmission.modelName}`, 14, 45);
    doc.text(`Part Name: ${selectedSubmission.modelName}`, 14, 50);
    doc.text(`Part Number: ${selectedSubmission.partNumber}`, 14, 55);

    doc.text(`Customer: PT. Alpha Innovatech Indonesia`, 110, 45);
    doc.text(`Inspection Date: ${selectedSubmission.submittedDate}`, 110, 50);
    doc.text(`Inspector: ${selectedSubmission.submitterName}`, 110, 55);

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(14, 60, 196, 60);

    // Section 1 heading
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(27, 42, 107);
    doc.text("1. Calibration Values Verification (Shifts I, II, III)", 14, 67);

    // Gather table body data for Section 1
    const fullTableBody = selectedSubmission.measurements.map((m, index) => {
      const valI = m.shiftIValue || m.measuredValue;
      const valII = m.shiftIIValue || m.measuredValue;
      const valIII = m.shiftIIIValue || m.measuredValue;
      const statusI = m.shiftIStatus || m.status;
      const statusII = m.shiftIIStatus || m.status;
      const statusIII = m.shiftIIIStatus || m.status;

      return [
        String(index + 1).padStart(2, '0'),
        m.paramName,
        `${m.standardValue} ${m.unit}`,
        m.tolerance,
        `Shift I: ${valI} (${statusI})\nShift II: ${valII} (${statusII})\nShift III: ${valIII} (${statusIII})`,
        m.status
      ];
    });

    (doc as any).autoTable({
      startY: 71,
      head: [['No', 'Parameter Name', 'Standard Value', 'Tolerance', 'Measured Shift Values', 'Overall Verification']],
      body: fullTableBody,
      theme: 'striped',
      headStyles: { fillColor: [27, 42, 107], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { fontStyle: 'bold' },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { fontStyle: 'normal' },
        5: { cellWidth: 25, halign: 'center' }
      },
      didParseCell: (data: any) => {
        if (data.column.index === 5 && data.cell.raw === 'NG') {
          data.cell.styles.textColor = [186, 26, 26];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // Section 2 heading
    const finalY1 = (doc as any).lastAutoTable.finalY || 180;
    
    // Check page overflow to push Section 2 to a new page if space is low
    const spaceNeeded = 45; // title + table header + a couple of rows
    const pageHeight = doc.internal.pageSize.height;
    let nextSectionY = finalY1 + 12;
    if (nextSectionY + spaceNeeded > pageHeight) {
      doc.addPage();
      nextSectionY = 20; // reset to top of the new page
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(27, 42, 107);
    doc.text("2. Shift Inspection Summary Tally", 14, nextSectionY);

    // Gather table body data for Section 2
    const summaryTableBody = selectedSubmission.measurements.map((m, index) => {
      const statusI = m.shiftIStatus || m.status;
      const statusII = m.shiftIIStatus || m.status;
      const statusIII = m.shiftIIIStatus || m.status;
      
      let totalOk = 0;
      let totalNg = 0;
      
      if (statusI === 'OK') totalOk++;
      if (statusI === 'NG') totalNg++;
      
      if (statusII === 'OK') totalOk++;
      if (statusII === 'NG') totalNg++;
      
      if (statusIII === 'OK') totalOk++;
      if (statusIII === 'NG') totalNg++;

      return [
        String(index + 1).padStart(2, '0'),
        m.paramName,
        String(totalOk),
        String(totalNg)
      ];
    });

    (doc as any).autoTable({
      startY: nextSectionY + 4,
      head: [['No', 'Inspection Item', 'Total OK', 'Total NG']],
      body: summaryTableBody,
      theme: 'striped',
      headStyles: { fillColor: [27, 42, 107], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { fontStyle: 'bold' },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 40, halign: 'center' }
      },
      didParseCell: (data: any) => {
        if (data.row.section === 'body') {
          const totalNg = parseInt(data.row.cells[3].text || '0', 10);
          if (totalNg > 0) {
            data.cell.styles.fillColor = [255, 240, 240];
            data.cell.styles.textColor = [186, 26, 26];
          }
        }
      }
    });

    const safePdfName = `QC_Summary_Report_${selectedSubmission.partNumber}_${selectedSubmission.id}.pdf`;
    doc.save(safePdfName);
  };

  // Detect submissions pending > 24 hours (compare submittedAt to Date.now())
  const isOverdue = (submittedAt?: string): boolean => {
    if (!submittedAt) return true; // Treat mock data without timestamp as overdue
    try {
      const parsed = new Date(submittedAt);
      if (isNaN(parsed.getTime())) return true;
      return Date.now() - parsed.getTime() > 24 * 60 * 60 * 1000;
    } catch {
      return true;
    }
  };

  const handleSendReminder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRemindersSent(prev => new Set(prev).add(id));
    setReminderToast('Reminder sent to supervisor');
    setTimeout(() => setReminderToast(null), 3500);
  };

  // Helper to extract department initials for the avatar
  const getDeptInitials = (dept: string) => {
    if (!dept) return 'QC';
    const cleaned = dept.replace(/shop/i, '').trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleaned.substring(0, 2).toUpperCase();
  };

  // Filtered submissions
  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = s.modelName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.submitterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.partNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === '' || s.submitterDept.toLowerCase().includes(deptFilter.toLowerCase());
    const matchesPriority = priorityFilter === '' || s.priority === priorityFilter;
    return matchesSearch && matchesDept && matchesPriority;
  });

  const handleOpenDetail = (submission: DailyCheckSubmission) => {
    setSelectedSubmission(submission);
    setReviewNotes(submission.reviewNotes || '');
    setViewState('detail');
  };

  const handleActionCompleted = () => {
    // Refresh selected submission data after action is taken
    setViewState('list');
    setSelectedSubmission(null);
    setReviewNotes('');
  };

  const handleAdvance = async () => {
    if (!selectedSubmission || isReviewing) return;
    try {
      setIsReviewing(true);
      await onAdvanceApproval(selectedSubmission.id, inspectorName, reviewNotes);
      alert('Inspection checksheet approved and advanced to next stage.');
      handleActionCompleted();
    } catch (err) {
      console.error('[ApprovalInboxView] Advance failed:', err);
      alert('Failed to advance approval. Please try again.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleApproveWaiver = async () => {
    if (!selectedSubmission || isReviewing) return;
    try {
      setIsReviewing(true);
      await onApproveException(selectedSubmission.id, inspectorName, reviewNotes);
      alert('Deviation approved as exception. Checksheet status is now set to APPROVED EXCEPTION.');
      handleActionCompleted();
    } catch (err) {
      console.error('[ApprovalInboxView] Waiver failed:', err);
      alert('Failed to approve waiver. Please try again.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission || isReviewing) return;
    if (!reviewNotes.trim()) {
      alert('Review Notes with corrective action is strictly required before rejecting checksheet!');
      return;
    }
    try {
      setIsReviewing(true);
      await onRejectSubmission(selectedSubmission.id, inspectorName, reviewNotes);
      alert('Inspection checksheet rejected and returned to technical line operator for rework.');
      handleActionCompleted();
    } catch (err) {
      console.error('[ApprovalInboxView] Reject failed:', err);
      alert('Failed to reject submission. Please try again.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleRequestReject = () => {
    if (!requestRejectRemark.trim()) {
      alert('Remark / reason is required before submitting a reject request.');
      return;
    }
    if (!selectedSubmission) return;
    onRequestReject(selectedSubmission.id, inspectorName, requestRejectRemark);
    setShowRequestRejectModal(false);
    setRequestRejectRemark('');
    setSelectedSubmission(null);
    alert('Reject request submitted. Approver will review and action.');
  };

  // Helper to check what stage is current
  const getStageStatus = (progress: DailyCheckSubmission['progress'], stage: 'pic' | 'leader' | 'spv' | 'manager') => {
    return progress[stage];
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-[#f8f9fa]">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-6">

        {/* SCREEN A: APPROVAL WORKFLOW LIST */}
        {viewState === 'list' && (
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
              {filteredSubmissions.map((s) => {
                const isHigh = s.priority === 'HIGH';
                const isApproved = s.status === 'APPROVED_EXCEPTION';
                const isRejected = s.status === 'REJECTED';
                const isRequestReject = s.status === 'REQUEST_REJECT';
                
                const okCount = s.measurements.filter(m => m.status === 'OK').length;
                const ngCount = s.measurements.filter(m => m.status === 'NG').length;

                return (
                  <Card 
                    key={s.id}
                    onClick={() => handleOpenDetail(s)}
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
                          {isApproved && <Badge variant="active">APPROVED EXCEPTION</Badge>}
                          {isRejected && <Badge variant="destructive">REJECTED</Badge>}
                          {isRequestReject && (
                            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                              REQUEST REJECT
                            </Badge>
                          )}
                          {!isApproved && !isRejected && !isRequestReject && <Badge variant="secondary">PENDING</Badge>}
                          {/* Reminder Sent badge — shown if overdue */}
                          {!isApproved && !isRejected && isOverdue(s.submittedAt) && (
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
                        {/* Send Reminder — shown for pending items overdue >24h that haven't had a reminder sent yet */}
                        {!isApproved && !isRejected && isOverdue(s.submittedAt) && (
                          <button
                            type="button"
                            onClick={(e) => handleSendReminder(s.id, e)}
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
                            handleOpenDetail(s);
                          }}
                          className="group-hover:bg-[#00236f] group-hover:text-white transition-colors"
                        >
                          Review &rarr;
                        </Button>
                      </div>

                    </CardContent>
                  </Card>
                );
              })}

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
        )}

        {/* SCREEN B: APPROVAL DETAILED REVIEW COLUMN */}
        {viewState === 'detail' && selectedSubmission && (
          <>
            {/* Header / Breadcrumbs */}
            <div className="mb-2">
              <div className="flex items-center gap-1 text-xs text-[#757682] mb-2 font-semibold">
                <button onClick={() => setViewState('list')} className="text-[#00236f] font-bold hover:underline">
                  Approval Inbox
                </button>
                <div className="mx-1">/</div>
                <span className="text-gray-900 font-mono">{selectedSubmission.id}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-[#00236f] m-0">
                    Final Inspection Review: {selectedSubmission.modelName}
                  </h2>
                  <p className="text-xs text-[#757682] mt-0.5 font-semibold">
                    Submitted by {selectedSubmission.submitterName} • {selectedSubmission.submitterDept} • {selectedSubmission.submittedDate}
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
                    selectedSubmission.priority === 'HIGH' 
                      ? 'bg-red-50 text-[#ba1a1a] border-[#ba1a1a]/30' 
                      : 'bg-blue-50 text-[#00236f] border-blue-200'
                  }`}>
                    {selectedSubmission.priority === 'HIGH' ? 'Needs Supervisor Attention' : 'Standard Queue'}
                  </span>
                </div>
              </div>
            </div>

            {/* Split Screen Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Left Main (9 cols) */}
              <div className="xl:col-span-9 space-y-6">
                
                {selectedSubmission?.rejectRequestRemark && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800 flex flex-col gap-1 shadow-sm">
                    <span className="font-extrabold text-orange-850 uppercase tracking-wider text-xs">Reject Request Reason:</span>
                    <p className="text-orange-950 mt-0.5">{selectedSubmission.rejectRequestRemark}</p>
                  </div>
                )}

                {/* Summary Metrics block */}
                <section className="bg-white border border-[#c5c5d3] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between shadow-sm gap-4">
                  <div className="flex items-center gap-8 w-full sm:w-auto">
                    <div>
                      <span className="text-[10px] text-[#757682] uppercase font-bold tracking-wider">Total Checks</span>
                      <h4 className="text-2xl font-black text-slate-800 mt-0.5">{selectedSubmission.measurements.length}</h4>
                    </div>
                    <div className="h-8 w-px bg-[#c5c5d3]"></div>
                    <div>
                      <span className="text-[10px] text-[#757682] uppercase font-bold tracking-wider">Passed (OK)</span>
                      <h4 className="text-2xl font-black text-green-700 mt-0.5">
                        {selectedSubmission.measurements.filter(m => m.status === 'OK').length}
                      </h4>
                    </div>
                    <div className="h-8 w-px bg-[#c5c5d3]"></div>
                    <div>
                      <span className="text-[10px] text-[#757682] uppercase font-bold tracking-wider">Failed (NG)</span>
                      <h4 className="text-2xl font-black text-[#ba1a1a] mt-0.5 flex items-center gap-1">
                        {selectedSubmission.measurements.filter(m => m.status === 'NG').length}
                        {selectedSubmission.measurements.some(m => m.status === 'NG') && (
                          <AlertTriangle size={16} className="text-[#ba1a1a]" />
                        )}
                      </h4>
                    </div>
                  </div>

                  {/* Pass rate progress bar */}
                  <div className="w-full sm:w-auto overflow-hidden">
                    <div className="w-48 bg-slate-100 h-2.5 rounded-full flex overflow-hidden">
                      <div 
                        className="bg-green-600 h-full" 
                        style={{ width: `${(selectedSubmission.measurements.filter(m => m.status === 'OK').length / selectedSubmission.measurements.length) * 100}%` }}
                      ></div>
                      <div 
                        className="bg-[#ba1a1a] h-full" 
                        style={{ width: `${(selectedSubmission.measurements.filter(m => m.status === 'NG').length / selectedSubmission.measurements.length) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-[#757682] font-semibold">
                      <span>Pass Rate: {Math.round((selectedSubmission.measurements.filter(m => m.status === 'OK').length / selectedSubmission.measurements.length) * 100)}%</span>
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
                        {selectedSubmission.measurements.map((m, index) => {
                          const isNG = m.status === 'NG';
                          const valI = m.shiftIValue || m.measuredValue;
                          const valII = m.shiftIIValue || m.measuredValue;
                          const valIII = m.shiftIIIValue || m.measuredValue;
                          const statusI = m.shiftIStatus || m.status;
                          const statusII = m.shiftIIStatus || m.status;
                          const statusIII = m.shiftIIIStatus || m.status;

                          return (
                            <TableRow 
                              key={m.paramName} 
                              className={isNG ? 'bg-red-50/50 hover:bg-red-50 text-[#ba1a1a]' : ''}
                            >
                              <TableCell className="text-center font-semibold text-[#757682] relative">
                                {isNG && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ba1a1a]"></div>}
                                {String(index + 1).padStart(2, '0')}
                              </TableCell>
                              <TableCell className="font-semibold">{m.paramName}</TableCell>
                              <TableCell className="text-[#757682] font-mono">{m.standardValue} {m.unit}</TableCell>
                              <TableCell className="text-[#757682] font-mono">{m.tolerance}</TableCell>
                              <TableCell className="font-mono text-xs">
                                <div className="flex flex-col gap-1 py-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-[#757682] font-bold uppercase w-12">Shift I:</span>
                                    <span className={statusI === 'NG' ? 'text-[#ba1a1a] font-bold' : 'text-slate-800 font-medium'}>
                                      {valI} {m.unit}
                                    </span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                      statusI === 'OK' ? 'bg-green-50 text-green-700 border-green-200' 
                                      : statusI === 'NG' ? 'bg-red-100 text-[#ba1a1a] border-red-200' 
                                      : 'bg-gray-50 text-[#757682] border-gray-200'
                                    }`}>
                                      {statusI}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-[#757682] font-bold uppercase w-12">Shift II:</span>
                                    <span className={statusII === 'NG' ? 'text-[#ba1a1a] font-bold' : 'text-slate-800 font-medium'}>
                                      {valII} {m.unit}
                                    </span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                      statusII === 'OK' ? 'bg-green-50 text-green-700 border-green-200' 
                                      : statusII === 'NG' ? 'bg-red-100 text-[#ba1a1a] border-red-200' 
                                      : 'bg-gray-50 text-[#757682] border-gray-200'
                                    }`}>
                                      {statusII}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-[#757682] font-bold uppercase w-12">Shift III:</span>
                                    <span className={statusIII === 'NG' ? 'text-[#ba1a1a] font-bold' : 'text-slate-800 font-medium'}>
                                      {valIII} {m.unit}
                                    </span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                      statusIII === 'OK' ? 'bg-green-50 text-green-700 border-green-200' 
                                      : statusIII === 'NG' ? 'bg-red-100 text-[#ba1a1a] border-red-200' 
                                      : 'bg-gray-50 text-[#757682] border-gray-200'
                                    }`}>
                                      {statusIII}
                                    </span>
                                  </div>
                                  {m.handwritingData && (
                                    <div className="mt-1 flex flex-col gap-0.5 items-start">
                                      <span className="text-[8px] text-[#757682] uppercase font-bold">Ref Handwriting:</span>
                                      <img 
                                        src={m.handwritingData} 
                                        alt="Handwritten value stroke" 
                                        className="h-6 border border-gray-100 bg-white rounded object-contain max-w-[100px]" 
                                      />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded ${
                                  isNG ? 'bg-[#ba1a1a] text-white' : 'bg-[#dce1ff] text-[#00164e]'
                                }`}>
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
                        <FileText size={14} className="text-[#00236f]" /> Export to PDF
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
                        {selectedSubmission.measurements.map((m, index) => {
                          const statusI = m.shiftIStatus || m.status;
                          const statusII = m.shiftIIStatus || m.status;
                          const statusIII = m.shiftIIIStatus || m.status;
                          
                          let totalOk = 0;
                          let totalNg = 0;
                          
                          if (statusI === 'OK') totalOk++;
                          if (statusI === 'NG') totalNg++;
                          
                          if (statusII === 'OK') totalOk++;
                          if (statusII === 'NG') totalNg++;
                          
                          if (statusIII === 'OK') totalOk++;
                          if (statusIII === 'NG') totalNg++;

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
                              <TableCell className="text-center font-mono font-bold text-green-700">
                                {totalOk}
                              </TableCell>
                              <TableCell className={`text-center font-mono font-bold ${hasNG ? 'text-[#ba1a1a]' : 'text-slate-500'}`}>
                                {totalNg}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </section>

                {/* Supervisor Review Decision block */}
                 {selectedSubmission.status === 'PENDING' || selectedSubmission.status === 'REQUEST_REJECT' ? (
                  <section className="bg-white border border-[#c5c5d3] rounded-xl p-5 shadow-sm space-y-4">
                    <h3 className="font-bold text-sm text-[#00236f] m-0">Review Decision</h3>
                    
                    <div>
                      <label 
                        className="block text-xs font-bold text-[#444651] mb-1.5" 
                        htmlFor="review-notes-entry"
                      >
                        Review Notes / Engineering Corrective Action (Strictly required for rejections)
                      </label>
                      <textarea 
                        id="review-notes-entry"
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Detail corrective directives, alignment modifications, or machine recalibration logs..."
                        rows={3}
                        className="w-full text-xs p-3 rounded-lg border border-[#c5c5d3] focus:border-[#00236f] focus:ring-[#00236f] bg-[#f8f9fa] text-slate-800 outline-none resize-none"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      {selectedSubmission?.status === 'PENDING' && (selectedSubmission.submitterName === inspectorName || selectedSubmission.progress.pic === 'CURRENT' || selectedSubmission.progress.leader === 'CURRENT' || selectedSubmission.progress.spv === 'CURRENT') && (
                        <button
                          onClick={() => setShowRequestRejectModal(true)}
                          className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors cursor-pointer select-none active:scale-95 mr-auto"
                        >
                          Request Reject
                        </button>
                      )}
                       <Button 
                        variant="destructive"
                        onClick={handleReject}
                        disabled={isReviewing}
                        className="flex items-center gap-1.5 transition-colors"
                      >
                        <Ban size={14} /> Reject &amp; Return for Recalibration
                      </Button>
                      <Button 
                        variant="secondary"
                        onClick={handleApproveWaiver}
                        disabled={isReviewing}
                        className="flex items-center gap-1.5 transition-colors border border-[#00236f]/30"
                      >
                        <ThumbsUp size={14} /> Approve Waiver Exception
                      </Button>
                      <Button 
                        variant="default"
                        onClick={handleAdvance}
                        disabled={isReviewing}
                        className="flex items-center gap-1.5 transition-colors"
                      >
                        <CheckCircle size={14} /> Approve &amp; Advance Stage
                      </Button>
                    </div>
                  </section>
                ) : (
                  // Historical submission state review summary
                  <section className="bg-white border border-[#c5c5d3] rounded-xl p-5 shadow-sm">
                    <h3 className="font-bold text-sm text-[#191c1d] mb-2 flex items-center gap-2">
                      <CheckCircle className={selectedSubmission.status === 'APPROVED_EXCEPTION' ? 'text-green-600' : 'text-[#ba1a1a]'} size={20} />
                      Decision Concluded: {selectedSubmission.status.replace('_', ' ')}
                    </h3>
                    {selectedSubmission.reviewNotes && (
                      <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-100 text-xs text-slate-700 font-mono mt-2">
                        <span className="font-bold text-[#191c1d] block mb-1">Signed Action Directives:</span>
                        {selectedSubmission.reviewNotes}
                      </div>
                    )}
                  </section>
                )}

              </div>

              {/* Right Sidebar (3 cols) Timeline Activity Log */}
              <div className="xl:col-span-3">
                <div className="bg-white border border-[#c5c5d3] rounded-xl p-5 shadow-sm sticky top-24 flex flex-col gap-4">
                  <h3 className="font-extrabold text-[#00236f] text-sm flex items-center gap-2 m-0 pb-2 border-b border-gray-100">
                    <Clock size={16} /> Audit Timeline Log
                  </h3>

                  <div className="relative border-l border-gray-200 ml-2.5 pl-4 space-y-6 py-2">
                    {selectedSubmission.activityLog.map((log) => {
                      const isStart = log.type === 'start';
                      const isFlag = log.type === 'flag';
                      const isSubmit = log.type === 'submit';
                      const isApprove = log.type === 'approve';
                      const isReject = log.type === 'reject';
                      
                      return (
                        <div key={log.id} className="relative text-xs">
                          {/* Circle dot annotation */}
                          <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border ${
                            isFlag 
                              ? 'bg-[#ba1a1a] border-[#ffdad6]' 
                              : isApprove 
                              ? 'bg-green-600 border-green-100'
                              : isReject
                              ? 'bg-[#ba1a1a] border-red-100'
                              : isSubmit 
                              ? 'bg-[#00236f] border-blue-50' 
                              : 'bg-gray-300 border-gray-100'
                          }`}></div>
                          
                          <div className="text-[10px] text-[#757682] font-mono mb-0.5">{log.time}</div>
                          <div className={`font-bold uppercase tracking-wider text-[11px] ${
                            isFlag || isReject ? 'text-[#ba1a1a]' : isApprove ? 'text-green-800' : 'text-[#191c1d]'
                          }`}>{log.action}</div>
                          <div className="text-[11px] text-[#757682] mt-1">{log.user} ({log.details})</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          </>
        )}

      </div>

      {showRequestRejectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
            <h3 className="text-base font-semibold text-[#191c1d]">Request Reject</h3>
            <p className="text-sm text-[#757682]">
              Provide a reason for requesting rejection. This will be visible to all approvers.
            </p>
            <textarea
              className="w-full border border-[#c5c5d3] rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#00236f]"
              rows={4}
              placeholder="State the reason for reject request..."
              value={requestRejectRemark}
              onChange={(e) => setRequestRejectRemark(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowRequestRejectModal(false); setRequestRejectRemark(''); }}
                className="px-4 py-2 rounded-lg border border-[#c5c5d3] text-sm text-[#444651] hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestReject}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 cursor-pointer"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
