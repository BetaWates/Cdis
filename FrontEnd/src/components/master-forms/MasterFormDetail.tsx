import React, { useState } from 'react';
import { MasterForm } from '../../types';
import { StatusBadge } from './StatusBadge';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { FileText, Download, Edit, Undo2, ZoomIn, ZoomOut, Maximize, List } from 'lucide-react';

interface MasterFormDetailProps {
  form: MasterForm;
  onBack: () => void;
}

/**
 * Detail view for a single Master Form — PDF viewer + spec table.
 * Extracted from MasterFormsView (original lines 306–424).
 * Owns its own zoomScale since it's purely local to the detail view.
 */
export function MasterFormDetail({ form, onBack }: MasterFormDetailProps) {
  const [zoomScale, setZoomScale] = useState(1);

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-[#f8f9fa]">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-6">

        {/* Breadcrumb + meta */}
        <Card className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="overflow-hidden">
              <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-[#00236f] font-bold hover:underline mb-2">
                <Undo2 size={13} /> Back to Master Forms
              </button>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={form.status} />
                <span className="text-xs text-[#757682]">Digitized: {form.uploadDate}</span>
              </div>
              <h2 className="text-2xl font-black text-[#191c1d] flex flex-wrap items-center gap-2">
                {form.modelName}
                <span className="text-lg text-[#757682] font-normal font-mono">#{form.partNumber}</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
              <Button variant="outline" onClick={() => alert('Exporting specification PDF…')}>
                <Download size={13} /> Export Specs PDF
              </Button>
              <Button onClick={() => alert(`Editing standard specs for ${form.modelName}.`)}>
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
                {form.pdfDataUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <iframe
                      src={form.pdfDataUrl}
                      title="Technical Drawing PDF"
                      className="w-[400px] h-[500px] rounded border border-white/10"
                    />
                    <span className="text-[10px] text-slate-400 font-mono">{form.pdfFileName}</span>
                  </div>
                ) : (
                  <div className="w-72 h-72 bg-[#0a1c30] shadow-md border border-[#314156] rounded-lg p-4 flex flex-col items-center justify-center">
                    <img
                      src={form.imageUrl}
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
              <span className="text-[10px] uppercase font-bold text-[#00236f] font-mono tracking-wider">{form.specifications.length} Variables</span>
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
                  {form.specifications.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#757682] italic">
                        {form.status === 'PROCESSING' ? 'Parsing Excel data, please wait…' : 'No specifications found.'}
                      </td>
                    </tr>
                  )}
                  {form.specifications.map((spec, i) => (
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
}
