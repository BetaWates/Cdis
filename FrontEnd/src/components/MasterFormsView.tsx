import React, { useState, useRef, useEffect } from 'react';
import { MasterForm, Specification } from '../types';
import { parseExcelFile } from '../utils/excelParser';
import {
  FileText, Download, Edit, Filter, Plus, Search,
  Grid, List, ChevronLeft, ChevronRight, Undo2,
  ZoomIn, ZoomOut, Maximize, CheckCircle, Trash2,
  Upload, AlertCircle, FileSpreadsheet, Loader2, Eye, X as XIcon
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge, ProcessingBadge } from './ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';

interface MasterFormsViewProps {
  masterForms: MasterForm[];
  setMasterForms: React.Dispatch<React.SetStateAction<MasterForm[]>>;
  addMasterFormWithParsing: (params: {
    modelName: string;
    partNumber: string;
    excelFile: File;
    pdfFile: File | null;
  }) => Promise<string>;
}

function StatusBadge({ status }: { status: MasterForm['status'] }) {
  if (status === 'PROCESSING') return <ProcessingBadge />;
  if (status === 'ACTIVE') return <Badge variant="active">Active</Badge>;
  if (status === 'DRAFT') return <Badge variant="draft">Draft</Badge>;
  return <Badge variant="archived">Archived</Badge>;
}

export default function MasterFormsView({ masterForms, setMasterForms, addMasterFormWithParsing }: MasterFormsViewProps) {
  const [viewState, setViewState] = useState<'list' | 'detail' | 'upload'>('list');
  const [selectedForm, setSelectedForm] = useState<MasterForm | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [zoomScale, setZoomScale] = useState(1);

  // Upload state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [newModelName, setNewModelName] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview state (Task 3A)
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

  // Parse Excel for preview before saving
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

  const filteredForms = masterForms.filter((form) => {
    const matchesSearch =
      form.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.partNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || form.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenDetail = (form: MasterForm) => {
    if (form.status === 'PROCESSING') return; // don't open while parsing
    setSelectedForm(form);
    setZoomScale(1);
    setViewState('detail');
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
      // Reset form — navigation back to list happens immediately
      setExcelFile(null);
      setPdfFile(null);
      setNewModelName('');
      setNewPartNumber('');
      setParsedPreview(null);
      setParseError(null);
      if (excelInputRef.current) excelInputRef.current.value = '';
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      setViewState('list');
    } catch (err) {
      console.error(err);
      alert('Failed to queue the form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── LIST VIEW ────────────────────────────────────────────────────────────
  if (viewState === 'list') return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-[#f8f9fa]">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#191c1d]">Master Forms</h1>
            <p className="text-sm text-[#757682] mt-1">Manage and standardize your inspection protocols.</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-[#c5c5d3] rounded-lg pl-3 pr-8 py-2 text-xs font-semibold text-[#191c1d] focus:border-[#00236f] focus:outline-none focus:ring-1 focus:ring-[#00236f] cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PROCESSING">Processing</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <Filter size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#757682]" />
            </div>
            <Button onClick={() => setViewState('upload')}>
              <Plus size={15} /> Add New Master Form
            </Button>
          </div>
        </div>

        {/* Table Card */}
        <Card className="overflow-hidden flex flex-col min-h-[400px]">
          {/* Toolbar */}
          <div className="px-5 py-3 border-b border-[#c5c5d3] flex items-center justify-between gap-4 bg-white">
            <div className="relative w-64 md:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#757682]" />
              <input
                type="text"
                placeholder="Search model or part number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#c5c5d3] bg-[#f8f9fa] placeholder-[#757682] focus:border-[#00236f] focus:ring-1 focus:ring-[#00236f] outline-none text-xs text-[#191c1d]"
              />
            </div>
            <div className="hidden sm:block text-xs font-mono font-bold text-[#757682] uppercase tracking-wider">
              {filteredForms.length} items
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'text-[#00236f] bg-[#dce1ff]/30' : 'text-[#757682] hover:bg-gray-100'}`} title="Grid View"><Grid size={17} /></button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'text-[#00236f] bg-[#dce1ff]/30' : 'text-[#757682] hover:bg-gray-100'}`} title="List View"><List size={17} /></button>
            </div>
          </div>

          {/* List / Grid */}
          {viewMode === 'list' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model Name</TableHead>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Digitized Date</TableHead>
                  <TableHead>Specs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredForms.map((form) => (
                  <TableRow
                    key={form.id}
                    onClick={() => handleOpenDetail(form)}
                    className={`group ${form.status === 'PROCESSING' ? 'opacity-70 cursor-default' : 'cursor-pointer'}`}
                  >
                    <TableCell className="font-semibold flex items-center gap-2.5">
                      <FileText size={16} className="text-[#00236f] shrink-0" />
                      {form.modelName}
                    </TableCell>
                    <TableCell className="font-mono text-[#757682]">{form.partNumber}</TableCell>
                    <TableCell className="text-[#757682]">{form.uploadDate}</TableCell>
                    <TableCell className="text-[#757682]">
                      {form.status === 'PROCESSING' ? (
                        <span className="text-amber-600 font-semibold text-[11px]">Parsing…</span>
                      ) : (
                        <span className="font-mono">{form.specifications.length} vars</span>
                      )}
                    </TableCell>
                    <TableCell><StatusBadge status={form.status} /></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {form.status !== 'PROCESSING' ? (
                        <Button size="sm" variant="ghost" onClick={() => handleOpenDetail(form)}>
                          Open Specs →
                        </Button>
                      ) : (
                        <span className="text-[11px] text-[#757682] italic">Processing…</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredForms.length === 0 && (
                  <TableRow>
                    <td colSpan={6} className="py-16 text-center text-xs text-[#757682] italic">No matching master forms found.</td>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredForms.map((form) => (
                <div
                  key={form.id}
                  onClick={() => handleOpenDetail(form)}
                  className={`border border-[#c5c5d3] rounded-xl overflow-hidden transition-all bg-white group ${form.status === 'PROCESSING' ? 'cursor-default' : 'cursor-pointer hover:shadow-md hover:border-[#00236f]'}`}
                >
                  <div className="h-36 bg-slate-50 overflow-hidden flex items-center justify-center p-3 relative">
                    {form.pdfDataUrl ? (
                      <div className="flex flex-col items-center gap-2 text-[#757682]">
                        <FileText size={32} className="text-[#00236f]" />
                        <span className="text-[10px] font-mono truncate max-w-[140px]">{form.pdfFileName}</span>
                      </div>
                    ) : (
                      <img src={form.imageUrl} alt={form.modelName} referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform group-hover:scale-105" />
                    )}
                    {form.status === 'PROCESSING' && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <ProcessingBadge />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-sm text-[#191c1d] truncate">{form.modelName}</h3>
                      <StatusBadge status={form.status} />
                    </div>
                    <p className="text-[11px] font-mono text-[#757682]">{form.partNumber}</p>
                    <div className="border-t border-gray-100 pt-2 mt-1 flex justify-between items-center">
                      <span className="text-[10px] text-[#757682]">{form.uploadDate}</span>
                      {form.status !== 'PROCESSING' && (
                        <span className="text-xs font-bold text-[#00236f] group-hover:underline">View specs →</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#c5c5d3] bg-[#f8f9fa] flex items-center justify-between mt-auto">
            <span className="text-xs text-[#757682]">{filteredForms.length} of {masterForms.length} forms</span>
            <div className="flex gap-2">
              <button disabled className="p-1 px-2.5 rounded border border-[#c5c5d3] text-gray-400 cursor-not-allowed"><ChevronLeft size={15} /></button>
              <button disabled className="p-1 px-2.5 rounded border border-[#c5c5d3] text-gray-400 cursor-not-allowed"><ChevronRight size={15} /></button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  // ─── DETAIL VIEW ─────────────────────────────────────────────────────────
  if (viewState === 'detail' && selectedForm) return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-[#f8f9fa]">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-6">

        {/* Breadcrumb + meta */}
        <Card className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="overflow-hidden">
              <button onClick={() => setViewState('list')} className="inline-flex items-center gap-1.5 text-xs text-[#00236f] font-bold hover:underline mb-2">
                <Undo2 size={13} /> Back to Master Forms
              </button>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={selectedForm.status} />
                <span className="text-xs text-[#757682]">Digitized: {selectedForm.uploadDate}</span>
              </div>
              <h2 className="text-2xl font-black text-[#191c1d] flex flex-wrap items-center gap-2">
                {selectedForm.modelName}
                <span className="text-lg text-[#757682] font-normal font-mono">#{selectedForm.partNumber}</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
              <Button variant="outline" onClick={() => alert('Exporting specification PDF…')}>
                <Download size={13} /> Export Specs PDF
              </Button>
              <Button onClick={() => alert(`Editing standard specs for ${selectedForm.modelName}.`)}>
                <Edit size={13} /> Edit Standard Specs
              </Button>
            </div>
          </div>
        </Card>

        {/* Split panel: PDF viewer + Spec table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[520px]">

          {/* Left: Drawing / PDF viewer */}
          <Card className="flex flex-col overflow-hidden">
            <div className="h-10 border-b border-[#c5c5d3] bg-[#f8f9fa] flex items-center justify-between px-4 shrink-0">
              <span className="font-bold text-xs text-[#444651] flex items-center gap-1.5"><FileText size={13} /> Blueprint / Technical Drawing</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setZoomScale((p) => Math.min(p + 0.2, 3))} className="p-1 rounded text-[#757682] hover:bg-gray-200" title="Zoom In"><ZoomIn size={13} /></button>
                <button onClick={() => setZoomScale((p) => Math.max(p - 0.2, 0.4))} className="p-1 rounded text-[#757682] hover:bg-gray-200" title="Zoom Out"><ZoomOut size={13} /></button>
                <button onClick={() => setZoomScale(1)} className="p-1 rounded text-[#757682] hover:bg-gray-200" title="Reset"><Maximize size={13} /></button>
              </div>
            </div>
            <div className="flex-1 bg-slate-900 relative flex items-center justify-center overflow-auto min-h-[360px]">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:18px_18px] opacity-50" />
              <div
                className="relative transition-transform duration-200"
                style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
              >
                {selectedForm.pdfDataUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <iframe
                      src={selectedForm.pdfDataUrl}
                      title="Technical Drawing PDF"
                      className="w-[400px] h-[500px] rounded border border-white/10"
                    />
                    <span className="text-[10px] text-slate-400 font-mono">{selectedForm.pdfFileName}</span>
                  </div>
                ) : (
                  <div className="w-72 h-72 bg-[#0a1c30] shadow-md border border-[#314156] rounded-lg p-4 flex flex-col items-center justify-center">
                    <img
                      src={selectedForm.imageUrl}
                      alt="Technical Drawing"
                      referrerPolicy="no-referrer"
                      className="max-h-56 max-w-full object-contain filter invert opacity-90"
                    />
                    <div className="mt-3">
                      <p className="text-[10px] text-teal-400 uppercase font-bold tracking-widest font-mono">Isometric projection</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Right: Specification table */}
          <Card className="flex flex-col overflow-hidden">
            <div className="h-10 border-b border-[#c5c5d3] bg-[#f8f9fa] flex items-center justify-between px-4 shrink-0">
              <span className="font-bold text-xs text-[#444651] flex items-center gap-1.5"><List size={13} /> Digitized Threshold Guidelines</span>
              <span className="text-[10px] uppercase font-bold text-[#00236f] font-mono tracking-wider">{selectedForm.specifications.length} Variables</span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#f8f9fa] border-b border-[#c5c5d3] z-10">
                  <tr>
                    <th className="py-2 px-3 text-[11px] font-bold text-[#757682] w-10 text-center border-r border-[#c5c5d3]">#</th>
                    <th className="py-2 px-3 text-[11px] font-bold text-[#757682] border-r border-[#c5c5d3]">Parameter</th>
                    <th className="py-2 px-3 text-[11px] font-bold text-[#757682] border-r border-[#c5c5d3]">Standard Value</th>
                    <th className="py-2 px-3 text-[11px] font-bold text-[#757682] border-r border-[#c5c5d3]">Tolerance</th>
                    <th className="py-2 px-3 text-[11px] font-bold text-[#757682] text-center w-14">Unit</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-[#191c1d] divide-y divide-[#c5c5d3]/50">
                  {selectedForm.specifications.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#757682] italic">
                        {selectedForm.status === 'PROCESSING' ? 'Parsing Excel data, please wait…' : 'No specifications found.'}
                      </td>
                    </tr>
                  )}
                  {selectedForm.specifications.map((spec, i) => (
                    <tr key={spec.id} className={`hover:bg-slate-50 transition-colors ${spec.isOptional ? 'text-[#757682] italic' : ''}`}>
                      <td className="px-3 py-2.5 text-center text-[#757682] font-semibold border-r border-[#c5c5d3]/40">{String(i + 1).padStart(2, '0')}</td>
                      <td className="px-3 py-2.5 font-semibold border-r border-[#c5c5d3]/40">{spec.parameterName}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-700 border-r border-[#c5c5d3]/40">{spec.standardValue}</td>
                      <td className="px-3 py-2.5 font-mono text-[#855300] font-semibold border-r border-[#c5c5d3]/40">{spec.tolerance}</td>
                      <td className="px-3 py-2.5 text-[#757682] font-bold text-center">{spec.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  // ─── UPLOAD VIEW ──────────────────────────────────────────────────────────
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
          <button onClick={() => setViewState('list')} className="inline-flex items-center gap-1 text-xs text-[#00236f] font-bold hover:underline mb-2">
            <Undo2 size={13} /> Back to List
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
          <Button variant="outline" onClick={() => setViewState('list')}>Cancel</Button>
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
