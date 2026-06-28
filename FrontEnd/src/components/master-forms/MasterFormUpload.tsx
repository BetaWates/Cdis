import React, { useState, useRef, useEffect } from 'react';
import { MasterForm, Specification } from '../../types';
import { parseExcelFile } from '../../utils/excelParser';
import {
  CheckCircle, Trash2, Upload, AlertCircle,
  FileSpreadsheet, FileText, Loader2, Eye, X as XIcon
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface MasterFormUploadProps {
  addMasterFormWithParsing: (params: {
    modelName: string;
    partNumber: string;
    excelFile: File;
    pdfFile: File | null;
  }) => Promise<string>;
  onSuccess: () => void;
}

/**
 * Upload view for creating a new Master Form.
 * Extracted from MasterFormsView (original lines 426–634).
 * Owns all upload-related state so it doesn't pollute the orchestrator.
 */
export function MasterFormUpload({ addMasterFormWithParsing, onSuccess }: MasterFormUploadProps) {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [newModelName, setNewModelName] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<Specification[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const excelInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleParsePreview = async () => {
    if (!excelFile) {
      setParseError('Please select an Excel file first.');
      return;
    }
    setIsProcessingFile(true);
    setParseError(null);
    setParsedPreview(null);
    try {
      const specs = await parseExcelFile(excelFile);
      if (specs.length === 0) {
        setParseError('No parameters detected — check that your Excel has the correct column headers (Parameter, Standard Value, Tolerance, Unit).');
        setToast({ msg: 'Parse failed: no parameters found.', type: 'error' });
      } else {
        setParsedPreview(specs);
        setToast({ msg: `Inspection Standard loaded — ${specs.length} parameters detected`, type: 'success' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown parse error';
      setParseError(`Parse failed: ${msg}`);
      setToast({ msg: `Parse failed: ${msg}`, type: 'error' });
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleSaveUploadedForm = async () => {
    if (!excelFile) {
      alert('Please upload an Excel Inspection Standard file first.');
      return;
    }
    if (!newModelName.trim() || !newPartNumber.trim()) {
      alert('Please enter the Model Name and Part Number.');
      return;
    }
    if (!parsedPreview) {
      alert('Please click "Preview Parameters" to parse the Excel file before saving.');
      return;
    }
    setIsSubmitting(true);
    try {
      await addMasterFormWithParsing({
        modelName: newModelName.trim(),
        partNumber: newPartNumber.trim(),
        excelFile,
        pdfFile,
      });
      // Reset form
      setExcelFile(null);
      setPdfFile(null);
      setNewModelName('');
      setNewPartNumber('');
      setParsedPreview(null);
      setParseError(null);
      if (excelInputRef.current) excelInputRef.current.value = '';
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Failed to queue the form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-[#f8f9fa]">
      <div className="max-w-[900px] mx-auto flex flex-col gap-6">

        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold animate-pulse-once transition-all ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-red-50 border-red-200 text-[#ba1a1a]'
          }`}>
            {toast.type === 'success' ? <CheckCircle size={16} className="text-green-600 shrink-0" /> : <AlertCircle size={16} className="text-[#ba1a1a] shrink-0" />}
            {toast.msg}
            <button onClick={() => setToast(null)} className="ml-2 text-current opacity-60 hover:opacity-100"><XIcon size={13} /></button>
          </div>
        )}

        {/* Header */}
        <div className="pb-4 border-b border-[#c5c5d3]">
          <button onClick={onSuccess} className="inline-flex items-center gap-1 text-xs text-[#00236f] font-bold hover:underline mb-2">
            ← Back to List
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#191c1d]">Upload Master Form</h1>
          <p className="text-sm text-[#757682] mt-1">
            Upload Excel + optional PDF drawing. Parse and preview extracted parameters before saving.
          </p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2.5 bg-[#dce1ff]/30 border border-[#b6c4ff] rounded-xl p-4 text-xs text-[#00236f]">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <div>
            <strong>Non-blocking upload:</strong> After clicking "Save", this form immediately appears as <strong>PROCESSING</strong> in the list. You can navigate away and upload another while it parses. The status auto-updates to <strong>ACTIVE</strong> when complete.
          </div>
        </div>

        {/* Metadata fields */}
        <Card className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#757682] uppercase tracking-wider mb-1">Model / Component Name *</label>
            <input
              type="text"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#c5c5d3] rounded-lg focus:outline-none focus:border-[#00236f] focus:ring-1 focus:ring-[#00236f]"
              placeholder="e.g. Engine Block Assembly Alpha"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#757682] uppercase tracking-wider mb-1">Part / Serial Number *</label>
            <input
              type="text"
              value={newPartNumber}
              onChange={(e) => setNewPartNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#c5c5d3] rounded-lg focus:outline-none focus:border-[#00236f] focus:ring-1 focus:ring-[#00236f]"
              placeholder="e.g. PN-2026-A001"
            />
          </div>
        </Card>

        {/* Upload zones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Excel */}
          <Card className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="text-[#00236f]" size={19} />
              <h3 className="font-bold text-[#191c1d]">Inspection Standard (Excel) *</h3>
            </div>
            <label className="border-2 border-dashed border-[#c5c5d3] rounded-xl p-6 flex flex-col items-center text-center hover:border-[#00236f] hover:bg-slate-50 transition-colors cursor-pointer bg-[#f8f9fa]">
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)}
              />
              <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                <Upload size={20} className="text-[#757682]" />
              </div>
              <p className="text-xs font-bold text-[#191c1d] mb-1">Drop Excel file here or click to browse</p>
              <p className="text-[11px] text-[#757682]">Supported: .xlsx, .xls</p>
              <p className="text-[10px] text-[#757682] mt-1.5">Required columns: Parameter, Standard Value, Tolerance, Unit</p>
            </label>
            {excelFile ? (
              <div className="flex items-center justify-between p-2.5 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-600 shrink-0" size={16} />
                  <span className="text-xs text-green-900 font-medium truncate max-w-[180px]">{excelFile.name}</span>
                </div>
                <button onClick={() => { setExcelFile(null); if (excelInputRef.current) excelInputRef.current.value = ''; }} className="text-[#757682] hover:text-[#ba1a1a]"><Trash2 size={15} /></button>
              </div>
            ) : (
              <p className="text-[11px] text-center text-[#757682] italic border border-dashed rounded-lg py-2">No Excel file selected.</p>
            )}
          </Card>

          {/* PDF */}
          <Card className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <FileText className="text-[#00236f]" size={19} />
              <h3 className="font-bold text-[#191c1d]">Technical Drawing (PDF)</h3>
            </div>
            <label className="border-2 border-dashed border-[#c5c5d3] rounded-xl p-6 flex flex-col items-center text-center hover:border-[#00236f] hover:bg-slate-50 transition-colors cursor-pointer bg-[#f8f9fa]">
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
              <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                <Upload size={20} className="text-[#757682]" />
              </div>
              <p className="text-xs font-bold text-[#191c1d] mb-1">Drop PDF drawing here or click to browse</p>
              <p className="text-[11px] text-[#757682]">Supported: .pdf (optional but recommended)</p>
              <p className="text-[10px] text-[#757682] mt-1.5">Stored as reference drawing — not parsed as text</p>
            </label>
            {pdfFile ? (
              <div className="flex items-center justify-between p-2.5 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-600 shrink-0" size={16} />
                  <span className="text-xs text-green-900 font-medium truncate max-w-[180px]">{pdfFile.name}</span>
                </div>
                <button onClick={() => { setPdfFile(null); if (pdfInputRef.current) pdfInputRef.current.value = ''; }} className="text-[#757682] hover:text-[#ba1a1a]"><Trash2 size={15} /></button>
              </div>
            ) : (
              <p className="text-[11px] text-center text-[#757682] italic border border-dashed rounded-lg py-2">No PDF file selected (optional).</p>
            )}
          </Card>
        </div>

        {/* Parse & Preview Step */}
        <div className="flex items-center gap-3 pt-2 border-t border-[#c5c5d3]">
          <Button
            variant="outline"
            onClick={handleParsePreview}
            disabled={!excelFile || isProcessingFile}
            className="flex items-center gap-2"
          >
            {isProcessingFile
              ? <><Loader2 size={14} className="animate-spin" /> Parsing…</>
              : <><Eye size={14} /> Preview Parameters</>}
          </Button>
          {parsedPreview && (
            <span className="text-xs text-green-700 font-semibold flex items-center gap-1">
              <CheckCircle size={13} /> {parsedPreview.length} parameters ready
            </span>
          )}
        </div>

        {/* Parse Error */}
        {parseError && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-[#ba1a1a]">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            {parseError}
          </div>
        )}

        {/* Parsed Specs Preview Table */}
        {parsedPreview && parsedPreview.length > 0 && (
          <div className="border border-green-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-green-50 border-b border-green-200 flex items-center justify-between">
              <span className="text-xs font-bold text-green-900 flex items-center gap-1.5">
                <CheckCircle size={14} /> Preview — {parsedPreview.length} Parameters Detected
              </span>
              <span className="text-[10px] text-green-700">Verify before confirming save</span>
            </div>
            <div className="overflow-auto max-h-60">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-green-50">
                  <tr>
                    <th className="py-2 px-3 text-[10px] font-bold text-[#757682] border-b border-green-200 w-8 text-center">#</th>
                    <th className="py-2 px-3 text-[10px] font-bold text-[#757682] border-b border-green-200">Parameter</th>
                    <th className="py-2 px-3 text-[10px] font-bold text-[#757682] border-b border-green-200">Standard Value</th>
                    <th className="py-2 px-3 text-[10px] font-bold text-[#757682] border-b border-green-200">Tolerance</th>
                    <th className="py-2 px-3 text-[10px] font-bold text-[#757682] border-b border-green-200">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-100">
                  {parsedPreview.map((spec, i) => (
                    <tr key={spec.id} className="hover:bg-green-50/50">
                      <td className="px-3 py-2 text-center text-[#757682] font-mono">{String(i + 1).padStart(2, '0')}</td>
                      <td className="px-3 py-2 font-semibold text-[#191c1d]">{spec.parameterName}</td>
                      <td className="px-3 py-2 font-mono text-slate-700">{spec.standardValue}</td>
                      <td className="px-3 py-2 font-mono text-[#855300] font-semibold">{spec.tolerance}</td>
                      <td className="px-3 py-2 text-[#757682]">{spec.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-2 border-t border-[#c5c5d3]">
          <Button variant="outline" onClick={onSuccess}>Cancel</Button>
          <Button
            onClick={handleSaveUploadedForm}
            disabled={isSubmitting || !parsedPreview}
            className={parsedPreview ? '' : 'opacity-50 cursor-not-allowed'}
          >
            {isSubmitting ? 'Saving…' : 'Confirm & Save Master Form'}
          </Button>
        </div>
      </div>
    </div>
  );
}
