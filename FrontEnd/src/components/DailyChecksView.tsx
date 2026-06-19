import { useState, useCallback, useRef, useEffect } from 'react';
import { DailyCheckSubmission, MeasurementEntry, ActivityLogEntry, InputMode, MasterForm } from '../types';
import {
  Search, Play, ChevronRight, Send, CheckCircle, AlertTriangle,
  Undo2, Keyboard, Mic, MicOff, PenLine, FileText, Info, ZoomIn, ZoomOut, Maximize
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { HandwritingCanvas } from './ui/HandwritingCanvas';

interface DailyChecksViewProps {
  masterForms: MasterForm[];
  onAddSubmission: (submission: DailyCheckSubmission) => void;
  inspectorName: string;
}

// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface RowState {
  value: string;
  mode: InputMode;
  method?: 'handwriting' | 'voice' | 'typing';
  status?: 'OK' | 'NG' | '';
  handwritingData?: string;
  isListening: boolean;
}

function evaluateStatus(
  value: string,
  standardValue: string,
  tolerance: string
): 'OK' | 'NG' | '--' {
  if (!value.trim() || isNaN(Number(value))) return '--';
  const num = Number(value);

  const tolLower = tolerance.toLowerCase();

  // Handle MAX / MIN / pure MAX tolerances like "MAX", "MIN", "< 0.8"
  if (tolLower === 'max' || tolLower.startsWith('max')) {
    const std = parseFloat(standardValue);
    if (isNaN(std)) return '--';
    return num <= std ? 'OK' : 'NG';
  }
  if (tolLower === 'min' || tolLower.startsWith('min')) {
    const std = parseFloat(standardValue);
    if (isNaN(std)) return '--';
    return num >= std ? 'OK' : 'NG';
  }
  if (tolLower.startsWith('<')) {
    const limit = parseFloat(tolLower.replace('<', '').trim());
    return num < limit ? 'OK' : 'NG';
  }
  if (tolLower.startsWith('>')) {
    const limit = parseFloat(tolLower.replace('>', '').trim());
    return num > limit ? 'OK' : 'NG';
  }

  // Handle ±0.05 symmetric
  const symMatch = tolerance.match(/^[±+\-]?([\d.]+)$/);
  if (symMatch) {
    const tol = parseFloat(symMatch[1]);
    const std = parseFloat(standardValue);
    if (isNaN(std)) return '--';
    return Math.abs(num - std) <= tol ? 'OK' : 'NG';
  }

  // Handle +0.05 / -0.02 asymmetric
  const asymMatch = tolerance.match(/[+]([\d.]+)\s*\/?\s*-?([\d.]+)/);
  if (asymMatch) {
    const upper = parseFloat(asymMatch[1]);
    const lower = parseFloat(asymMatch[2]);
    const std = parseFloat(standardValue);
    if (isNaN(std)) return '--';
    return num >= std - lower && num <= std + upper ? 'OK' : 'NG';
  }

  return '--';
}

export default function DailyChecksView({ masterForms, onAddSubmission, inspectorName }: DailyChecksViewProps) {
  const [viewState, setViewState] = useState<'select' | 'entry'>('select');
  const [selectedForm, setSelectedForm] = useState<MasterForm | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sampleId, setSampleId] = useState('');
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [zoomScale, setZoomScale] = useState(1);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSpeechSupported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Only show ACTIVE forms as checksheets
  const activeForms = masterForms.filter((f) => f.status === 'ACTIVE');
  const filteredForms = activeForms.filter(
    (f) =>
      f.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.partNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartCheck = (form: MasterForm) => {
    setSelectedForm(form);
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    setSampleId(`#${new Date().getFullYear()}-${form.partNumber.replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase()}-${randomNum}`);
    // Initialise row states for each spec
    const initialRows: Record<string, RowState> = {};
    form.specifications.forEach((spec) => {
      if (!spec.isOptional) {
        initialRows[spec.id] = { value: '', mode: 'keypad', method: 'typing', isListening: false };
      }
    });
    setRowStates(initialRows);
    setZoomScale(1);
    setViewState('entry');
  };

  const updateRow = useCallback((specId: string, partial: Partial<RowState>) => {
    setRowStates((prev) => ({ ...prev, [specId]: { ...prev[specId], ...partial } }));
  }, []);

  const handleMethodChange = useCallback((specId: string, method: 'typing' | 'voice' | 'handwriting') => {
    const modeMap = {
      typing: 'keypad' as InputMode,
      voice: 'voice' as InputMode,
      handwriting: 'handwriting' as InputMode
    };
    updateRow(specId, { method, mode: modeMap[method], isListening: false });
  }, [updateRow]);

  const startVoice = useCallback((specId: string) => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    // Stop any previous session
    if (recognitionRef.current) recognitionRef.current.stop();

    const recognition: SpeechRecognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.trim();
      // Extract numeric part from speech
      const numericMatch = transcript.match(/[\d]+(?:[.,][\d]+)?/);
      if (numericMatch) {
        const parsed = numericMatch[0].replace(',', '.');
        updateRow(specId, { value: parsed, isListening: false });
      } else {
        updateRow(specId, { isListening: false });
        alert(`Could not parse a number from: "${transcript}". Please try again.`);
      }
    };

    recognition.onerror = () => updateRow(specId, { isListening: false });
    recognition.onend = () => updateRow(specId, { isListening: false });

    recognitionRef.current = recognition;
    recognition.start();
    updateRow(specId, { isListening: true });
  }, [updateRow]);

  const stopVoice = useCallback((specId: string) => {
    if (recognitionRef.current) recognitionRef.current.stop();
    updateRow(specId, { isListening: false });
  }, [updateRow]);

  // Cleanup on unmount
  useEffect(() => () => { recognitionRef.current?.stop(); }, []);

  const handleSubmit = () => {
    if (!selectedForm) return;
    const requiredSpecs = selectedForm.specifications.filter((s) => !s.isOptional);
    const hasEmpty = requiredSpecs.some((s) => !rowStates[s.id]?.value?.trim());
    if (hasEmpty) {
      alert('Please fill in all required measurement parameters before submitting.');
      return;
    }

    const measurements: MeasurementEntry[] = requiredSpecs.map((spec) => {
      const row = rowStates[spec.id];
      return {
        paramName: spec.parameterName,
        standardValue: spec.standardValue,
        tolerance: spec.tolerance,
        unit: spec.unit,
        measuredValue: row.value,
        status: evaluateStatus(row.value, spec.standardValue, spec.tolerance),
        inputMode: row.mode,
        handwritingData: row.handwritingData,
      };
    });

    const isHigh = measurements.some((m) => m.status === 'NG');
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

    const activityLog: ActivityLogEntry[] = [
      { id: `al-${Date.now()}-1`, time: `${dateStr}, ${timeStr}`, action: 'Inspection Started', user: inspectorName, details: `Verification block loaded for ${selectedForm.modelName}`, type: 'start' },
    ];
    if (isHigh) {
      activityLog.push({ id: `al-${Date.now()}-2`, time: `${dateStr}, ${timeStr}`, action: 'NG Flagged', user: 'System', details: 'Out-of-tolerance deviation detected — escalation triggered.', type: 'flag' });
    }
    activityLog.push({ id: `al-${Date.now()}-3`, time: `${dateStr}, ${timeStr}`, action: 'Submitted for Review', user: inspectorName, details: `Dispatched to Approval Inbox. Priority: ${isHigh ? 'HIGH (NG)' : 'NORMAL'}`, type: 'submit' });

    const submission: DailyCheckSubmission = {
      id: `chk-${Date.now()}`,
      modelId: selectedForm.id,
      modelName: selectedForm.modelName,
      partNumber: selectedForm.partNumber,
      sampleId,
      submitterName: inspectorName,
      submitterDept: 'Assembly Line',
      submittedDate: `${dateStr}, ${timeStr}`,
      submittedAt: new Date().toISOString(),
      status: 'PENDING',
      priority: isHigh ? 'HIGH' : 'NORMAL',
      progress: { pic: 'CURRENT', leader: 'PENDING', spv: 'PENDING', manager: 'PENDING' },
      measurements,
      activityLog,
    };

    onAddSubmission(submission);
    alert('Checksheet submitted and queued in the Approval Inbox!');
    setViewState('select');
  };

  // ─── SELECT VIEW ──────────────────────────────────────────────────────────
  if (viewState === 'select') return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-[#f8f9fa]">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#191c1d]">Select Checksheet</h1>
            <p className="text-sm text-[#757682] mt-1">Choose a model to begin the daily inspection. Only ACTIVE master forms appear here.</p>
          </div>
          <div className="relative w-full md:w-96 shrink-0">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#757682]" />
            <input
              type="text"
              placeholder="Filter by Model or Part Number…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#c5c5d3] rounded-lg text-sm text-[#191c1d] focus:border-[#00236f] focus:ring-1 focus:ring-[#00236f] outline-none"
            />
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
                  {form.specifications.filter(s => !s.isOptional).length} required parameters
                </div>
                <div className="pt-2 border-t border-gray-100 mt-auto">
                  <Button className="w-full" onClick={() => handleStartCheck(form)}>
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

  // ─── ENTRY VIEW ───────────────────────────────────────────────────────────
  if (!selectedForm) return null;
  const requiredSpecs = selectedForm.specifications.filter((s) => !s.isOptional);

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-[#f8f9fa]">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#c5c5d3]">
          <div>
            <button onClick={() => setViewState('select')} className="inline-flex items-center gap-1.5 text-xs text-[#00236f] font-bold hover:underline mb-2">
              <Undo2 size={13} /> Back to Model Selection
            </button>
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#00236f] uppercase tracking-wider mb-1">
              <span>Daily Check</span><ChevronRight size={11} className="text-[#757682]" /><span className="text-[#757682]">Active Inspection</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#191c1d]">Parameter Verification — {selectedForm.modelName}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="bg-[#f3f4f5] border border-[#c5c5d3] rounded px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-xs text-[#757682]">Sample:</span>
              <span className="text-xs font-bold font-mono text-[#00236f]">{sampleId}</span>
            </div>
            <Badge variant="active">{requiredSpecs.length} parameters</Badge>
          </div>
        </div>

        {/* Split panel: Drawing + Entry sheet */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">

          {/* Left: PDF / Drawing viewer */}
          <Card className="xl:col-span-2 flex flex-col overflow-hidden">
            <div className="h-10 border-b border-[#c5c5d3] bg-[#f8f9fa] flex items-center justify-between px-4 shrink-0">
              <span className="font-bold text-xs text-[#444651] flex items-center gap-1.5"><FileText size={13} /> Technical Drawing Reference</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setZoomScale(p => Math.min(p + 0.2, 3))} className="p-1 rounded text-[#757682] hover:bg-gray-200" title="Zoom In"><ZoomIn size={13} /></button>
                <button onClick={() => setZoomScale(p => Math.max(p - 0.2, 0.4))} className="p-1 rounded text-[#757682] hover:bg-gray-200" title="Zoom Out"><ZoomOut size={13} /></button>
                <button onClick={() => setZoomScale(1)} className="p-1 rounded text-[#757682] hover:bg-gray-200" title="Reset"><Maximize size={13} /></button>
              </div>
            </div>
            <div className="bg-slate-900 relative flex items-center justify-center overflow-auto min-h-[300px] xl:min-h-[480px]">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:18px_18px]" />
              <div style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center', transition: 'transform 0.2s' }}>
                {selectedForm.pdfData ? (
                  <embed
                    src={`data:application/pdf;base64,${selectedForm.pdfData}`}
                    type="application/pdf"
                    className="w-[300px] h-[420px] rounded-lg border border-white/10"
                  />
                ) : selectedForm.pdfDataUrl ? (
                  <iframe
                    src={selectedForm.pdfDataUrl}
                    title="Technical Drawing"
                    className="w-[300px] h-[420px] rounded border border-white/10"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 max-w-xs">
                    <FileText size={48} className="text-slate-500 mb-3" />
                    <p className="text-xs font-semibold">
                      No drawing attached to this Inspection Standard. Upload a PDF in Master Forms.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-3 bg-slate-800 border-t border-slate-700">
              <p className="text-[10px] text-slate-400 font-mono text-center">
                {selectedForm.modelName} · {selectedForm.partNumber}
              </p>
            </div>
          </Card>

          {/* Right: Measurement entry table */}
          <div className="xl:col-span-3 flex flex-col gap-4">
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-[#c5c5d3] bg-[#f8f9fa] flex justify-between items-center">
                <span className="font-bold text-xs text-[#444651]">Measurement Recording Table</span>
                <span className="text-[10px] text-[#757682] font-semibold uppercase tracking-wider">
                  Inspector: {inspectorName}
                </span>
              </div>

              <div className="divide-y divide-[#c5c5d3]/60">
                {requiredSpecs.map((spec) => {
                  const row = rowStates[spec.id] ?? { value: '', mode: 'keypad' as InputMode, isListening: false };
                  const status = evaluateStatus(row.value, spec.standardValue, spec.tolerance);

                  return (
                    <div key={spec.id} className={`p-4 transition-colors ${status === 'NG' ? 'bg-red-50/40' : 'hover:bg-gray-50/50'}`}>
                      {/* Row header: name + standard + status */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="text-xs font-bold text-[#191c1d]">{spec.parameterName}</p>
                          <p className="text-[11px] text-[#757682] font-mono mt-0.5">
                            Std: {spec.standardValue} &nbsp;·&nbsp; Tol: <span className="text-[#855300] font-semibold">{spec.tolerance}</span> &nbsp;·&nbsp; {spec.unit}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                          status === 'OK' ? 'bg-green-100 text-green-800 border-green-200'
                          : status === 'NG' ? 'bg-red-100 text-[#ba1a1a] border-red-200'
                          : 'bg-gray-100 text-[#757682] border-gray-200'
                        }`}>
                          {status}
                        </span>
                      </div>

                      {/* Method selector toggle */}
                      <div className="flex items-center gap-1.5 mb-3">
                        {/* Type Button */}
                        <button
                          type="button"
                          onClick={() => handleMethodChange(spec.id, 'typing')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                            row.method === 'typing' || (!row.method && row.mode === 'keypad')
                              ? 'bg-[#00236f] text-white border-transparent'
                              : 'bg-white text-[#757682] border-[#c5c5d3] hover:border-[#00236f] hover:text-[#00236f]'
                          }`}
                        >
                          <span>⌨️ Type</span>
                        </button>

                        {/* Voice Button */}
                        <button
                          type="button"
                          disabled={!isSpeechSupported}
                          onClick={() => handleMethodChange(spec.id, 'voice')}
                          title={isSpeechSupported ? 'Voice Dictation (Web Speech API)' : 'Voice input not supported in this browser'}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all relative ${
                            row.method === 'voice' || row.mode === 'voice'
                              ? 'bg-[#00236f] text-white border-transparent'
                              : 'bg-white text-[#757682] border-[#c5c5d3] hover:border-[#00236f] hover:text-[#00236f]'
                          } ${!isSpeechSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span>🎤 Voice</span>
                        </button>

                        {/* Draw Button */}
                        <button
                          type="button"
                          onClick={() => handleMethodChange(spec.id, 'handwriting')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                            row.method === 'handwriting' || row.mode === 'handwriting'
                              ? 'bg-[#00236f] text-white border-transparent'
                              : 'bg-white text-[#757682] border-[#c5c5d3] hover:border-[#00236f] hover:text-[#00236f]'
                          }`}
                        >
                          <span>✏️ Draw</span>
                        </button>
                      </div>

                      {/* Input area per mode */}
                      {(row.method === 'typing' || (!row.method && row.mode === 'keypad')) && (
                        <input
                          type="number"
                          step="0.001"
                          value={row.value}
                          onChange={(e) => updateRow(spec.id, { value: e.target.value })}
                          placeholder="Enter measured value…"
                          className="w-full max-w-xs px-3 py-2 text-sm font-mono border border-[#c5c5d3] rounded-lg focus:border-[#00236f] focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                        />
                      )}

                      {(row.method === 'voice' || row.mode === 'voice') && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => row.isListening ? stopVoice(spec.id) : startVoice(spec.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border relative ${
                              row.isListening
                                ? 'bg-red-500 text-white border-red-600 animate-pulse'
                                : 'bg-white border-[#c5c5d3] text-[#444651] hover:border-[#00236f]'
                            }`}
                          >
                            {row.isListening ? <MicOff size={14} /> : <Mic size={14} />}
                            {row.isListening ? 'Listening… (tap to stop)' : 'Tap to Dictate Value'}
                            {/* Pulsing red mic indicator while listening */}
                            {row.isListening && (
                              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
                              </span>
                            )}
                          </button>
                          {row.value && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-bold text-[#00236f]">{row.value}</span>
                              <CheckCircle size={15} className="text-green-600" />
                            </div>
                          )}
                        </div>
                      )}

                      {(row.method === 'handwriting' || row.mode === 'handwriting') && (
                        <div className="flex items-center gap-4 flex-wrap">
                          <HandwritingCanvas
                            width={240}
                            height={60}
                            initialDataUrl={row.handwritingData}
                            onChange={(dataUrl) => {
                              updateRow(spec.id, { handwritingData: dataUrl });
                            }}
                          />
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-[#757682] font-bold uppercase tracking-wider">
                              Confirm numeric value:
                            </label>
                            <input
                              type="number"
                              step="0.001"
                              value={row.value}
                              onChange={(e) => updateRow(spec.id, { value: e.target.value })}
                              placeholder="Type value after writing…"
                              className="w-36 px-2.5 py-1.5 text-xs font-mono border border-[#c5c5d3] rounded-lg focus:border-[#00236f] focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                            />
                            <p className="text-[10px] text-[#757682]">Handwriting stored alongside entry</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Submit footer */}
              <div className="p-4 bg-[#f8f9fa] border-t border-[#c5c5d3] flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#757682]">
                  <Info size={15} className="text-[#00236f]" />
                  All fields required. Out-of-tolerance values trigger deviation reviews.
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" onClick={() => alert('Draft saved locally.')}>Save Draft</Button>
                  <Button onClick={handleSubmit}>
                    Submit for Approval <Send size={13} />
                  </Button>
                </div>
              </div>
            </Card>

            {/* NG warning banner */}
            {requiredSpecs.some((spec) => {
              const row = rowStates[spec.id];
              return row && evaluateStatus(row.value, spec.standardValue, spec.tolerance) === 'NG';
            }) && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertTriangle size={16} className="text-[#ba1a1a] shrink-0" />
                <p className="text-xs text-[#ba1a1a] font-semibold">
                  One or more measurements are out of tolerance. Submission will be flagged <strong>HIGH PRIORITY</strong> for supervisor review.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
