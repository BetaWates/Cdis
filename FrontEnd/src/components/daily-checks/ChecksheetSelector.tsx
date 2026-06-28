import React, { memo } from 'react';
import { MasterForm } from '../../types';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Search, FileText, Scan, Play } from 'lucide-react';

interface ChecksheetSelectorProps {
  masterForms: MasterForm[];
  onStartCheck: (form: MasterForm) => void;
  onScanForm: () => void;
}

/**
 * Select-form view for Daily Checks.
 * Extracted from DailyChecksView (original lines 477–554).
 * Owns its own searchQuery state since it doesn't need to be shared.
 */
export const ChecksheetSelector = memo(function ChecksheetSelector({
  masterForms,
  onStartCheck,
  onScanForm,
}: ChecksheetSelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const activeForms = masterForms.filter((f) => f.status === 'ACTIVE');
  const filteredForms = React.useMemo(
    () =>
      activeForms.filter(
        (f) =>
          f.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.partNumber.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [activeForms, searchQuery]
  );

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-[#f8f9fa]">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#191c1d]">Select Checksheet</h1>
            <p className="text-sm text-[#757682] mt-1">Choose a model to begin the daily inspection. Only ACTIVE master forms appear here.</p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <div className="relative flex-1 md:w-80">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#757682]" />
              <input
                type="text"
                placeholder="Filter by Model or Part Number…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#c5c5d3] rounded-lg text-sm text-[#191c1d] focus:border-[#00236f] focus:ring-1 focus:ring-[#00236f] outline-none"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onScanForm}
              className="px-3 py-2.5 border-[#c5c5d3] hover:border-[#00236f] hover:text-[#00236f] transition-all bg-white flex items-center gap-1.5"
              title="Scan Barcode to open checksheet"
            >
              <Scan size={15} /> Scan Barcode
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredForms.map((form) => (
            <Card key={form.id} className="flex flex-col overflow-hidden group hover:shadow-md hover:border-[#00236f] transition-all">
              <div className="h-36 bg-gray-50 flex items-center justify-center overflow-hidden relative border-b border-[#c5c5d3]">
                {form.pdfDataUrl ? (
                  <div className="flex flex-col items-center gap-1.5 text-[#757682]">
                    <FileText size={28} className="text-[#00236f]" />
                    <span className="text-[10px] font-mono truncate max-w-[130px] px-2">{form.pdfFileName}</span>
                  </div>
                ) : (
                  <img src={form.imageUrl} alt={form.modelName} referrerPolicy="no-referrer" className="object-contain h-full w-full mix-blend-multiply p-3 transition-transform group-hover:scale-105" />
                )}
              </div>
              <div className="p-4 flex flex-col gap-3 flex-1">
                <div>
                  <h3 className="font-extrabold text-[#191c1d] text-sm leading-tight">{form.modelName}</h3>
                  <span className="text-[10px] text-[#757682] font-mono bg-gray-100 px-2 py-0.5 rounded inline-block mt-1">
                    {form.partNumber}
                  </span>
                </div>
                <div className="text-[11px] text-[#757682]">
                  {form.specifications.filter((s) => !s.isOptional).length} required parameters
                </div>
                <div className="pt-2 border-t border-gray-100 mt-auto">
                  <Button className="w-full" onClick={() => onStartCheck(form)}>
                    <Play size={13} fill="white" /> Start Daily Check
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {filteredForms.length === 0 && (
            <div className="col-span-full py-16 text-center text-xs text-[#757682] italic">
              {activeForms.length === 0
                ? 'No active master forms yet. Upload and activate one from the Master Forms page.'
                : 'No matching models found.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
