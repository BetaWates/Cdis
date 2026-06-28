import React, { memo } from 'react';
import { Specification } from '../../types';
import { HandwritingCanvas } from '../ui/HandwritingCanvas';
import { evaluateStatus } from '../../utils/toleranceEvaluator';
import { Mic, MicOff, Info, CheckCircle } from 'lucide-react';

export type InputMode = 'keypad' | 'voice' | 'handwriting';
export type InputMethod = 'typing' | 'voice' | 'handwriting';

export interface RowState {
  shiftIValue: string;
  shiftIIValue: string;
  shiftIIIValue: string;
  mode: InputMode;
  method?: InputMethod;
  isListening: boolean;
  activeShift: 'I' | 'II' | 'III';
  handwritingData?: string;
}

interface MeasurementRowProps {
  spec: Specification;
  rowState: RowState;
  isActive: boolean;
  isSpeechSupported: boolean;
  onUpdate: (specId: string, partial: Partial<RowState>) => void;
  onValueCommit: (specId: string, shift: 'I' | 'II' | 'III') => void;
  onStartVoice: (specId: string) => void;
  onStopVoice: (specId: string) => void;
  onMethodChange: (specId: string, method: InputMethod) => void;
}

/**
 * A single measurement-row for the DailyChecks entry sheet.
 * Extracted from DailyChecksView (original map body lines 651–891).
 *
 * Wrapped with React.memo — with 5–15+ rows, prevents the entire list
 * re-rendering when a single row's voice-listening state changes.
 */
export const MeasurementRow = memo(function MeasurementRow({
  spec,
  rowState: row,
  isActive,
  isSpeechSupported,
  onUpdate,
  onValueCommit,
  onStartVoice,
  onStopVoice,
  onMethodChange,
}: MeasurementRowProps) {
  const statusI = evaluateStatus(row.shiftIValue, spec.standardValue, spec.tolerance);
  const statusII = evaluateStatus(row.shiftIIValue, spec.standardValue, spec.tolerance);
  const statusIII = evaluateStatus(row.shiftIIIValue, spec.standardValue, spec.tolerance);
  const isOverallNG = statusI === 'NG' || statusII === 'NG' || statusIII === 'NG';

  const statusBadge = (label: string, status: 'OK' | 'NG' | '--') => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border ${
      status === 'OK' ? 'bg-green-50 text-green-700 border-green-200'
      : status === 'NG' ? 'bg-red-50 text-[#ba1a1a] border-red-200 font-black'
      : 'bg-gray-50 text-[#757682] border-gray-200'
    }`}>
      {label}: {status}
    </span>
  );

  return (
    <div
      id={`spec-row-${spec.id}`}
      className={`p-4 transition-colors ${isOverallNG ? 'bg-red-50/40' : 'hover:bg-gray-50/50'} ${
        isActive ? 'border-l-4 border-l-[#00236f]' : 'border-l-4 border-l-transparent'
      }`}
    >
      {/* Row header: name + standard + statuses */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-xs font-bold text-[#191c1d]">{spec.parameterName}</p>
          <p className="text-[11px] text-[#757682] font-mono mt-0.5">
            Std: {spec.standardValue} &nbsp;·&nbsp; Tol: <span className="text-[#855300] font-semibold">{spec.tolerance}</span> &nbsp;·&nbsp; {spec.unit}
          </p>
        </div>
        <div className="flex gap-1.5 self-start">
          {statusBadge('SI', statusI)}
          {statusBadge('SII', statusII)}
          {statusBadge('SIII', statusIII)}
        </div>
      </div>

      {/* Grid for typing values in all three shifts */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {(['I', 'II', 'III'] as const).map((shift) => {
          const fieldKey = shift === 'I' ? 'shiftIValue' : shift === 'II' ? 'shiftIIValue' : 'shiftIIIValue';
          const label = shift === 'I' ? 'Shift I' : shift === 'II' ? 'Shift II' : 'Shift III';
          return (
            <div key={shift}>
              <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">{label}</label>
              <input
                type="number"
                step="0.001"
                value={row[fieldKey] as string}
                onChange={(e) => onUpdate(spec.id, { [fieldKey]: e.target.value })}
                onBlur={() => {
                  if ((row[fieldKey] as string)?.trim()) onValueCommit(spec.id, shift);
                }}
                placeholder="Value…"
                className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#c5c5d3] rounded-lg focus:border-[#00236f] focus:outline-none focus:ring-1 focus:ring-[#00236f]"
              />
            </div>
          );
        })}
      </div>

      {/* Advanced input method selection & active target */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
        {/* Target Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Target:</span>
          {(['I', 'II', 'III'] as const).map((sName) => (
            <button
              key={sName}
              type="button"
              onClick={() => onUpdate(spec.id, { activeShift: sName })}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                row.activeShift === sName
                  ? 'bg-[#00236f] text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#00236f]'
              }`}
            >
              Shift {sName}
            </button>
          ))}
        </div>

        {/* Method Selector */}
        <div className="flex flex-col sm:items-end items-start gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#00236f] font-semibold flex items-center gap-1 mr-1">
              <Mic size={11} className="text-[#00236f]" /> Voice recommended
            </span>
            <button
              type="button"
              onClick={() => onMethodChange(spec.id, 'typing')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                row.method === 'typing' || (!row.method && row.mode === 'keypad')
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-white text-gray-400 border-gray-200 hover:text-slate-600'
              }`}
            >
              ⌨️ Type
            </button>
            <button
              type="button"
              disabled={!isSpeechSupported}
              onClick={() => onMethodChange(spec.id, 'voice')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                row.method === 'voice' || row.mode === 'voice'
                  ? 'bg-[#00236f] text-white border-transparent'
                  : 'bg-white text-gray-400 border-gray-200 hover:text-slate-600'
              }`}
            >
              🎤 Voice  ★
            </button>
            <button
              type="button"
              onClick={() => onMethodChange(spec.id, 'handwriting')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                row.method === 'handwriting' || row.mode === 'handwriting'
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-white text-gray-400 border-gray-200 hover:text-slate-600'
              }`}
            >
              ✏️ Draw
            </button>
          </div>
          <p className="text-[10px] text-[#757682] mt-1">💡 Voice recommended — noise suppression active</p>
        </div>
      </div>

      {/* Input area: Voice mode */}
      {(row.method === 'voice' || row.mode === 'voice') && (
        <div className="flex items-center gap-3 bg-white p-2 border border-[#c5c5d3] rounded-lg">
          <button
            type="button"
            onClick={() => row.isListening ? onStopVoice(spec.id) : onStartVoice(spec.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border relative ${
              row.isListening
                ? 'bg-red-500 text-white border-red-600 animate-pulse'
                : 'bg-white border-[#c5c5d3] text-[#444651] hover:border-[#00236f]'
            }`}
          >
            {row.isListening ? <MicOff size={14} /> : <Mic size={14} />}
            {row.isListening ? 'Listening… (tap to stop)' : `🎤 Speak now — Shift ${row.activeShift}  (noise suppression active)`}
            {row.isListening && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
              </span>
            )}
          </button>
          {row[`shift${row.activeShift}Value` as keyof RowState] && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">Recorded:</span>
              <span className="text-xs font-mono font-bold text-[#00236f]">
                {row[`shift${row.activeShift}Value` as keyof RowState] as string}
              </span>
              <CheckCircle size={14} className="text-green-600" />
            </div>
          )}
        </div>
      )}

      {/* Input area: Handwriting mode */}
      {(row.method === 'handwriting' || row.mode === 'handwriting') && (
        <div className="flex items-center gap-4 flex-wrap bg-white p-2 border border-[#c5c5d3] rounded-lg">
          <HandwritingCanvas
            width={240}
            height={60}
            initialDataUrl={row.handwritingData}
            onChange={(dataUrl) => onUpdate(spec.id, { handwritingData: dataUrl })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-[#757682] font-bold uppercase tracking-wider flex items-center gap-1">
              ⌨️ Confirm typed value (Shift {row.activeShift}):
            </label>
            <input
              type="number"
              step="0.001"
              value={row[`shift${row.activeShift}Value` as keyof RowState] as string}
              onChange={(e) => {
                const updateKey = row.activeShift === 'II' ? 'shiftIIValue' : row.activeShift === 'III' ? 'shiftIIIValue' : 'shiftIValue';
                onUpdate(spec.id, { [updateKey]: e.target.value });
              }}
              placeholder="Type value after writing…"
              className="w-36 px-2.5 py-1.5 text-xs font-mono border border-[#c5c5d3] rounded-lg focus:border-[#00236f] focus:outline-none focus:ring-1 focus:ring-[#00236f]"
            />
            <p className="text-[10px] text-[#00236f] font-semibold flex items-center gap-1">
              <Info size={11} className="text-[#00236f] shrink-0" />
              Strokes saved visually. Typing is required for OK/NG checks.
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
