import React, { useState, useMemo, useCallback } from 'react';
import { MasterForm } from '../../types';
import { StatusBadge } from './StatusBadge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ProcessingBadge } from '../ui/badge';
import {
  FileText, Search, Filter, Grid, List, ChevronLeft, ChevronRight, Plus
} from 'lucide-react';

interface MasterFormsListProps {
  masterForms: MasterForm[];
  onOpenDetail: (form: MasterForm) => void;
  onUpload: () => void;
}

/**
 * Master Forms list screen — toolbar, list/grid toggle, form cards.
 * Extracted from MasterFormsView (original lines 145–304).
 * Owns its own viewMode, searchQuery, statusFilter state.
 * Uses useMemo to avoid recomputing filteredForms on unrelated parent renders.
 */
export const MasterFormsList = React.memo(function MasterFormsList({
  masterForms,
  onOpenDetail,
  onUpload,
}: MasterFormsListProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredForms = useMemo(
    () =>
      masterForms.filter((form) => {
        const matchesSearch =
          form.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          form.partNumber.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || form.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [masterForms, searchQuery, statusFilter]
  );

  return (
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
            <Button onClick={onUpload}>
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
                    onClick={() => onOpenDetail(form)}
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
                        <Button size="sm" variant="ghost" onClick={() => onOpenDetail(form)}>
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
                  onClick={() => onOpenDetail(form)}
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
});
