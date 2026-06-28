import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { DailyCheckSubmission } from '../../types';

/**
 * Exports a DailyCheckSubmission to a multi-sheet Excel file (.xlsx).
 * Extracted from ApprovalInboxView — pure side-effect function.
 */
export function exportToExcel(submission: DailyCheckSubmission): void {
  // Sheet 1: Inspection Result
  const ws1Data = [
    ["Model Name", "Part Number", "Sample ID", "Submitter Name", "Department", "Submitted Date", "Overall Status"],
    [
      submission.modelName || '',
      submission.partNumber || '',
      submission.sampleId || '',
      submission.submitterName || '',
      submission.submitterDept || '',
      submission.submittedDate || '',
      submission.status || ''
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
  submission.measurements.forEach(m => {
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
    { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 8 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }
  ];

  // Sheet 3: Approval Log
  const ws3Data = [["Time", "Action", "User", "Details"]];
  submission.activityLog.forEach(log => {
    ws3Data.push([log.timestamp || (log as { time?: string }).time || '', log.action || '', log.user || '', log.details || '']);
  });
  const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
  ws3["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 40 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, "Inspection Result");
  XLSX.utils.book_append_sheet(wb, ws2, "Measurements");
  XLSX.utils.book_append_sheet(wb, ws3, "Approval Log");

  const safeFileName = `Inspection_Detail_${submission.partNumber}_${submission.id}.xlsx`;
  XLSX.writeFile(wb, safeFileName);
}

/**
 * Exports a DailyCheckSubmission to a formatted PDF report.
 * Extracted from ApprovalInboxView — pure side-effect function.
 */
export function exportToPDF(submission: DailyCheckSubmission): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

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

  doc.text(`Model: ${submission.modelName}`, 14, 45);
  doc.text(`Part Name: ${submission.modelName}`, 14, 50);
  doc.text(`Part Number: ${submission.partNumber}`, 14, 55);

  doc.text(`Customer: PT. Alpha Innovatech Indonesia`, 110, 45);
  doc.text(`Inspection Date: ${submission.submittedDate}`, 110, 50);
  doc.text(`Inspector: ${submission.submitterName}`, 110, 55);

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
  const fullTableBody = submission.measurements.map((m, index) => {
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
  const spaceNeeded = 45;
  const pageHeight = doc.internal.pageSize.height;
  let nextSectionY = finalY1 + 12;
  if (nextSectionY + spaceNeeded > pageHeight) {
    doc.addPage();
    nextSectionY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(27, 42, 107);
  doc.text("2. Shift Inspection Summary Tally", 14, nextSectionY);

  // Gather table body data for Section 2
  const summaryTableBody = submission.measurements.map((m, index) => {
    const statusI = m.shiftIStatus || m.status;
    const statusII = m.shiftIIStatus || m.status;
    const statusIII = m.shiftIIIStatus || m.status;
    let totalOk = 0, totalNg = 0;
    if (statusI === 'OK') totalOk++; if (statusI === 'NG') totalNg++;
    if (statusII === 'OK') totalOk++; if (statusII === 'NG') totalNg++;
    if (statusIII === 'OK') totalOk++; if (statusIII === 'NG') totalNg++;
    return [String(index + 1).padStart(2, '0'), m.paramName, String(totalOk), String(totalNg)];
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

  const safePdfName = `QC_Summary_Report_${submission.partNumber}_${submission.id}.pdf`;
  doc.save(safePdfName);
}
