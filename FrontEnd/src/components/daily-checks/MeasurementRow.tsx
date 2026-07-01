import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Specification } from '../../types';
import { HandwritingCanvas } from '../ui/HandwritingCanvas';
import { evaluateStatus } from '../../utils/toleranceEvaluator';
import { Mic, MicOff, Info, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { recognizeDigit } from '../../utils/digitRecognition';

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
  voiceState?: 'idle' | 'listening' | 'processing' | 'failed';
  voiceError?: string;
  shiftIHandwritten?: boolean;
  shiftIIHandwritten?: boolean;
  shiftIIIHandwritten?: boolean;
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
  const isVisual = (spec as any).inputType === 'visual' || (spec as any).input_type === 'visual';
  const statusI = isVisual ? (row.shiftIValue || '--') : evaluateStatus(row.shiftIValue, spec.standardValue, spec.tolerance);
  const statusII = isVisual ? (row.shiftIIValue || '--') : evaluateStatus(row.shiftIIValue, spec.standardValue, spec.tolerance);
  const statusIII = isVisual ? (row.shiftIIIValue || '--') : evaluateStatus(row.shiftIIIValue, spec.standardValue, spec.tolerance);
  const isOverallNG = statusI === 'NG' || statusII === 'NG' || statusIII === 'NG';

  const [autoRecognize, setAutoRecognize] = useState<boolean>(true);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [shiftIJudgment, setShiftIJudgment] = useState<'OK' | 'NG' | null>((row.shiftIValue as 'OK' | 'NG') || null);
  const [shiftIIJudgment, setShiftIIJudgment] = useState<'OK' | 'NG' | null>((row.shiftIIValue as 'OK' | 'NG') || null);
  const [shiftIIIJudgment, setShiftIIIJudgment] = useState<'OK' | 'NG' | null>((row.shiftIIIValue as 'OK' | 'NG') || null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ocrRequestIdRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setShiftIJudgment((row.shiftIValue as 'OK' | 'NG') || null);
  }, [row.shiftIValue]);

  useEffect(() => {
    setShiftIIJudgment((row.shiftIIValue as 'OK' | 'NG') || null);
  }, [row.shiftIIValue]);

  useEffect(() => {
    setShiftIIIJudgment((row.shiftIIIValue as 'OK' | 'NG') || null);
  }, [row.shiftIIIValue]);

  const handleJudgmentChange = useCallback((shift: 'I' | 'II' | 'III', value: 'OK' | 'NG') => {
    if (shift === 'I') {
      setShiftIJudgment(value);
      onUpdate(spec.id, { shiftIValue: value });
      onValueCommit(spec.id, 'I');
    } else if (shift === 'II') {
      setShiftIIJudgment(value);
      onUpdate(spec.id, { shiftIIValue: value });
      onValueCommit(spec.id, 'II');
    } else {
      setShiftIIIJudgment(value);
      onUpdate(spec.id, { shiftIIIValue: value });
      onValueCommit(spec.id, 'III');
    }
  }, [spec.id, onUpdate, onValueCommit]);

  const runRecognition = useCallback(async (dataUrl: string) => {
    if (!dataUrl) return;
    const requestId = ++ocrRequestIdRef.current;
    setIsRecognizing(true);
    setErrorMsg('');
    try {
      const result = await recognizeDigit(dataUrl);
      if (requestId !== ocrRequestIdRef.current) {
        return;
      }
      if (result.isValid) {
        const valueKey = row.activeShift === 'II' ? 'shiftIIValue' : row.activeShift === 'III' ? 'shiftIIIValue' : 'shiftIValue';
        const hwKey = row.activeShift === 'II' ? 'shiftIIHandwritten' : row.activeShift === 'III' ? 'shiftIIIHandwritten' : 'shiftIHandwritten';
        onUpdate(spec.id, { 
          [valueKey]: result.text,
          [hwKey]: true
        });
      } else {
        setErrorMsg('Tidak bisa membaca tulisan, silakan ketik manual');
      }
    } catch (err) {
      console.error(err);
      if (requestId === ocrRequestIdRef.current) {
        setErrorMsg('Tidak bisa membaca tulisan, silakan ketik manual');
      }
    } finally {
      if (requestId === ocrRequestIdRef.current) {
        setIsRecognizing(false);
      }
    }
  }, [onUpdate, spec.id, row.activeShift]);

  const handleHandwritingChange = useCallback((dataUrl: string) => {
    onUpdate(spec.id, { handwritingData: dataUrl });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!dataUrl) {
      ocrRequestIdRef.current++;
      setErrorMsg('');
      setIsRecognizing(false);
      return;
    }

    if (autoRecognize) {
      debounceTimerRef.current = setTimeout(() => {
        runRecognition(dataUrl);
      }, 800);
    }
  }, [onUpdate, spec.id, autoRecognize, runRecognition]);

  const handleManualRecognize = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    runRecognition(row.handwritingData || '');
  }, [runRecognition, row.handwritingData]);

  const statusBadge = (label: string, status: 'OK' | 'NG' | '--') => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border ${
      status === 'OK' ? 'bg-green-50 text-green-700 border-green-200'
      : status === 'NG' ? 'bg-red-50 text-[#ba1a1a] border-red-200 font-black'
      : 'bg-gray-50 text-[#757682] border-gray-200'
    }`}>
      {label}: {status}
    </span>
  );

  if (isVisual) {
    return (
      <div
        id={`spec-row-${spec.id}`}
        className={`p-4 transition-colors ${isOverallNG ? 'bg-red-50/40' : 'hover:bg-gray-50/50'} ${
          isActive ? 'border-l-4 border-l-[#00236f]' : 'border-l-4 border-l-transparent'
        }`}
      >
        {/* Row header: name + judgment badges */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-xs font-bold text-[#191c1d]">{spec.parameterName}</p>
            <p className="text-[11px] text-[#757682] font-mono mt-0.5">
              Visual Check &nbsp;·&nbsp; OK / NG Judgment
            </p>
          </div>
          <div className="flex gap-1.5 self-start">
            {statusBadge('SI', statusI as any)}
            {statusBadge('SII', statusII as any)}
            {statusBadge('SIII', statusIII as any)}
          </div>
        </div>

        {/* Judgment selection buttons for each shift */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {(['I', 'II', 'III'] as const).map((shift) => {
            const label = shift === 'I' ? 'Shift I' : shift === 'II' ? 'Shift II' : 'Shift III';
            const judgmentVal = shift === 'I' ? shiftIJudgment : shift === 'II' ? shiftIIJudgment : shiftIIIJudgment;
            const shiftCode = shift === 'I' ? 'SI' : shift === 'II' ? 'SII' : 'SIII';

            return (
              <div key={shift} className="flex flex-col gap-1.5">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                  <span>{label}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-bold border ${
                    judgmentVal === 'OK' ? 'bg-green-50 text-green-700 border-green-200'
                    : judgmentVal === 'NG' ? 'bg-red-50 text-[#ba1a1a] border-red-200 font-black'
                    : 'bg-gray-50 text-[#757682] border-gray-200'
                  }`}>
                    {shiftCode}: {judgmentVal || '--'}
                  </span>
                </label>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleJudgmentChange(shift, 'OK')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                      judgmentVal === 'OK'
                        ? 'bg-green-600 text-white border-transparent shadow-sm'
                        : 'bg-white text-green-700 border-green-200 hover:bg-green-50'
                    }`}
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => handleJudgmentChange(shift, 'NG')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                      judgmentVal === 'NG'
                        ? 'bg-red-600 text-white border-transparent shadow-sm'
                        : 'bg-white text-red-700 border-red-200 hover:bg-red-50'
                    }`}
                  >
                    NG
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

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
          const isHw = row[`shift${shift}Handwritten` as keyof RowState] as boolean;
          return (
            <div key={shift}>
              <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider flex items-center justify-between">
                <span>{label}</span>
                {isHw && (
                  <span className="text-[8px] font-extrabold text-[#00236f] bg-blue-50 px-1 py-0.2 rounded border border-blue-200" title="Recognized via handwriting">
                    ✏️ OCR
                  </span>
                )}
              </label>
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
        <div className="flex flex-col gap-2 bg-white p-3 border border-[#c5c5d3] rounded-lg">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              disabled={row.voiceState === 'processing'}
              onClick={() => {
                if (row.voiceState === 'listening' || row.isListening) {
                  onStopVoice(spec.id);
                } else {
                  onStartVoice(spec.id);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border relative cursor-pointer ${
                row.voiceState === 'listening' || row.isListening
                  ? 'bg-red-500 text-white border-red-600 hover:bg-red-600 animate-pulse'
                  : row.voiceState === 'processing'
                  ? 'bg-amber-500 text-white border-amber-600 cursor-not-allowed'
                  : 'bg-white border-[#c5c5d3] text-[#444651] hover:border-[#00236f] hover:bg-slate-50'
              }`}
            >
              {row.voiceState === 'listening' || row.isListening ? (
                <MicOff size={14} />
              ) : row.voiceState === 'processing' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Mic size={14} />
              )}

              {row.voiceState === 'listening' || row.isListening
                ? 'Listening… (tap to stop)'
                : row.voiceState === 'processing'
                ? 'Processing speech…'
                : `🎤 Speak now — Shift ${row.activeShift}`}

              {(row.voiceState === 'listening' || row.isListening) && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
                </span>
              )}
            </button>

            {row[`shift${row.activeShift}Value` as keyof RowState] && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                <span className="text-[10px] text-green-700 font-bold uppercase">Recorded Shift {row.activeShift}:</span>
                <span className="text-xs font-mono font-bold text-green-800">
                  {row[`shift${row.activeShift}Value` as keyof RowState] as string}
                </span>
                <CheckCircle size={14} className="text-green-600" />
              </div>
            )}
          </div>

          {/* Voice State / Error message Display */}
          {(row.voiceState === 'failed' && row.voiceError) && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5 mt-1">
              <AlertCircle size={15} className="shrink-0 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{row.voiceError}</p>
              </div>
            </div>
          )}

          {row.voiceState === 'listening' && (
            <p className="text-[10px] text-slate-500 italic mt-0.5 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
              Bicara sekarang... Sistem akan memproses suara Anda setelah selesai bicara.
            </p>
          )}

          {row.voiceState === 'processing' && (
            <p className="text-[10px] text-amber-600 italic mt-0.5 flex items-center gap-1">
              <Loader2 size={11} className="animate-spin text-amber-500" />
              Sedang memproses suara... Harap tunggu.
            </p>
          )}
        </div>
      )}

      {/* Input area: Handwriting mode */}
      {(row.method === 'handwriting' || row.mode === 'handwriting') && (() => {
        const isHandwritingDrawn = !!(row.handwritingData && row.handwritingData.length > 0);
        return (
          <div className="flex flex-col gap-2 bg-white p-3 border border-[#c5c5d3] rounded-lg">
            {/* Header/Instruction Label above the canvas */}
            <div className="flex items-center gap-1.5 text-xs text-[#00236f] font-semibold border-b border-slate-100 pb-1.5 mb-1">
              <span>✏️ Tulis di sini sebagai catatan visual — nilai tetap harus diketik manual di kolom sebelah.</span>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Canvas column with controls below/next to it */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <HandwritingCanvas
                    width={240}
                    height={60}
                    initialDataUrl={row.handwritingData}
                    onChange={handleHandwritingChange}
                    isRecognizing={isRecognizing}
                  />
                  
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={isRecognizing || !isHandwritingDrawn}
                      onClick={handleManualRecognize}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-1 justify-center ${
                        isRecognizing
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : !isHandwritingDrawn
                          ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                          : 'bg-[#00236f] text-white border-transparent hover:bg-[#001c56] cursor-pointer'
                      }`}
                    >
                      {isRecognizing ? (
                        <>
                          <Loader2 size={10} className="animate-spin" />
                          <span>Proses...</span>
                        </>
                      ) : (
                        <span>🔍 OCR</span>
                      )}
                    </button>
                    
                    <label className="flex items-center gap-1 cursor-pointer select-none text-[9px] text-gray-500 font-bold">
                      <input
                        type="checkbox"
                        checked={autoRecognize}
                        onChange={(e) => setAutoRecognize(e.target.checked)}
                        className="rounded border-gray-300 text-[#00236f] focus:ring-[#00236f] h-3 w-3"
                      />
                      <span>Auto OCR</span>
                    </label>
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-[10px] text-[#ba1a1a] font-semibold flex items-center gap-1 mt-0.5">
                    <AlertCircle size={11} className="text-[#ba1a1a] shrink-0" />
                    {errorMsg}
                  </p>
                )}

                <p className="text-[10px] text-[#00236f] font-bold flex items-center gap-1 mt-0.5">
                  <Info size={11} className="text-[#00236f] shrink-0" />
                  Strokes saved visually. Typing is required for OK/NG checks.
                </p>
              </div>

              {/* Visual connector: Arrow or divider */}
              <div className="hidden sm:flex items-center text-slate-300 font-bold text-lg select-none px-1">
                ➔
              </div>

              {/* Input Confirmation column */}
              <div className="flex flex-col gap-1.5">
                <div className={`flex flex-col gap-1.5 p-3 rounded-lg border-2 transition-all ${
                  isHandwritingDrawn 
                    ? 'bg-blue-50/30 border-[#00236f]/30' 
                    : 'bg-slate-50/50 border-slate-200'
                }`}>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider ${
                    isHandwritingDrawn ? 'text-[#00236f]' : 'text-slate-400'
                  }`}>
                    ⌨️ Confirm typed value (Shift {row.activeShift}):
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    disabled={!isHandwritingDrawn}
                    value={row[`shift${row.activeShift}Value` as keyof RowState] as string}
                    onChange={(e) => {
                      const updateKey = row.activeShift === 'II' ? 'shiftIIValue' : row.activeShift === 'III' ? 'shiftIIIValue' : 'shiftIValue';
                      onUpdate(spec.id, { [updateKey]: e.target.value });
                    }}
                    onBlur={() => {
                      const updateKey = row.activeShift === 'II' ? 'shiftIIValue' : row.activeShift === 'III' ? 'shiftIIIValue' : 'shiftIValue';
                      const currentValue = row[updateKey] as string;
                      if (currentValue?.trim()) {
                        onValueCommit(spec.id, row.activeShift);
                      }
                    }}
                    placeholder={isHandwritingDrawn ? "Type value here…" : "Draw first to unlock…"}
                    className={`w-36 px-2.5 py-1.5 text-xs font-mono border rounded-lg focus:outline-none focus:ring-1 transition-all ${
                      isHandwritingDrawn
                        ? 'border-[#00236f]/60 bg-white text-slate-800 focus:border-[#00236f] focus:ring-[#00236f]'
                        : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  />
                </div>

                {row[`shift${row.activeShift}Value` as keyof RowState] && (
                  <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-2 py-1 rounded-lg self-start">
                    <span className="text-[9px] text-green-700 font-bold uppercase">Accepted Shift {row.activeShift}:</span>
                    <span className="text-[10px] font-mono font-bold text-green-800">
                      {row[`shift${row.activeShift}Value` as keyof RowState] as string}
                    </span>
                    <CheckCircle size={12} className="text-green-600" />
                    {row[`shift${row.activeShift}Handwritten` as keyof RowState] && (
                      <span className="text-[8px] bg-[#00236f]/10 text-[#00236f] px-1 rounded font-bold uppercase">OCR</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
});
