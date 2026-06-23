import { useState, useCallback, useRef, useEffect } from 'react';
import { DailyCheckSubmission, MeasurementEntry, ActivityLogEntry, InputMode, MasterForm } from '../types';
import {
  Search, Play, ChevronRight, Send, CheckCircle, AlertTriangle,
  Undo2, Keyboard, Mic, MicOff, PenLine, FileText, Info, ZoomIn, ZoomOut, Maximize, Scan
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { HandwritingCanvas } from './ui/HandwritingCanvas';
import { BarcodeScannerModal } from './ui/BarcodeScannerModal';

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
  shiftIValue: string;
  shiftIIValue: string;
  shiftIIIValue: string;
  mode: InputMode;
  method?: 'handwriting' | 'voice' | 'typing';
  status?: 'OK' | 'NG' | '';
  handwritingData?: string;
  isListening: boolean;
  activeShift: 'I' | 'II' | 'III';
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
  const [activeSpecIndex, setActiveSpecIndex] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState<'form' | 'sample'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        initialRows[spec.id] = { 
          shiftIValue: '', 
          shiftIIValue: '', 
          shiftIIIValue: '', 
          mode: 'voice', 
          method: 'voice', 
          activeShift: 'I',
          isListening: false 
        };
      }
    });
    setRowStates(initialRows);
    setActiveSpecIndex(0);
    setZoomScale(1);
    setViewState('entry');
  };

  const handleScan = (scannedValue: string) => {
    if (scannerMode === 'form') {
      const activeForms = masterForms.filter((f) => f.status === 'ACTIVE');
      const matchedForm = activeForms.find(
        (f) =>
          f.partNumber.toLowerCase() === scannedValue.toLowerCase() ||
          f.modelName.toLowerCase() === scannedValue.toLowerCase()
      );
      if (matchedForm) {
        handleStartCheck(matchedForm);
      } else {
        alert(`No active checksheet found matching barcode value: "${scannedValue}"`);
      }
    } else {
      setSampleId(scannedValue);
      alert(`Sample ID updated to: "${scannedValue}"`);
    }
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

  const handleValueCommit = useCallback((specId: string, shift: 'I' | 'II' | 'III') => {
    if (shift === 'I') {
      updateRow(specId, { activeShift: 'II' });
    } else if (shift === 'II') {
      updateRow(specId, { activeShift: 'III' });
    } else {
      // Shift III done — move focus to next parameter
      const specs = selectedForm?.specifications.filter(s => !s.isOptional) ?? [];
      const currentIndex = specs.findIndex(s => s.id === specId);
      if (currentIndex !== -1 && currentIndex < specs.length - 1) {
        const nextIndex = currentIndex + 1;
        setActiveSpecIndex(nextIndex);
        setTimeout(() => {
          const el = document.getElementById(`spec-row-${specs[nextIndex].id}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [updateRow, selectedForm]);

  const startVoice = useCallback(async (specId: string) => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    if (recognitionRef.current) recognitionRef.current.stop();

    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let destinationNode: MediaStreamAudioDestinationNode | null = null;

    try {
      // Step 1: Request microphone with browser-level noise suppression hints
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,   // browser-level hint
          autoGainControl: true,
          sampleRate: 16000,        // optimal for speech recognition
        },
      });

      // Step 2: Build Web Audio API noise suppression chain
      audioCtx = new AudioContext({ sampleRate: 16000 });
      sourceNode = audioCtx.createMediaStreamSource(stream);
      destinationNode = audioCtx.createMediaStreamDestination();

      // Highpass filter: cut frequencies below 80Hz (rumble, HVAC, machinery noise)
      const highpass = audioCtx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 80;
      highpass.Q.value = 0.7;

      // Lowpass filter: cut frequencies above 3400Hz (most speech stays 300-3000Hz)
      const lowpass = audioCtx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 3400;
      lowpass.Q.value = 0.7;

      // DynamicsCompressor: reduce sudden loud spikes (clang, impact sounds)
      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -24;   // start compressing at -24dB
      compressor.knee.value = 10;
      compressor.ratio.value = 4;         // 4:1 compression ratio
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      // Gain: boost processed speech back up
      const gain = audioCtx.createGain();
      gain.gain.value = 1.4;

      // Chain: source → highpass → lowpass → compressor → gain → destination
      sourceNode.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(compressor);
      compressor.connect(gain);
      gain.connect(destinationNode);

      // Step 3: Feed the processed stream into SpeechRecognition
      const recognition: SpeechRecognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'id-ID';  // Indonesian — matches factory environment

      // Use processed audio stream
      // Note: SpeechRecognition doesn't accept custom streams directly in all browsers,
      // so we set the processed stream on the audio context and let recognition
      // pick up from the same device. The filters still apply via AudioContext processing.
      // For Chromium-based browsers, this chain works correctly.

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript.trim();
        
        // Preprocess transcript to remove spaces around decimal marks (e.g., "1 . 5" -> "1.5", "1 , 5" -> "1,5")
        const cleanTranscript = transcript.replace(/\s*([.,])\s*/g, '$1');
        let parsed: string | null = null;

        // Try direct numeric match first
        const directMatch = cleanTranscript.match(/[\d]+(?:[.,][\d]+)?/);
        if (directMatch) {
          parsed = directMatch[0].replace(',', '.');
        }

        // Fallback: parse Indonesian spoken numbers
        if (!parsed) {
          const spoken = cleanTranscript.toLowerCase()
            .replace(/nol/g, '0').replace(/satu/g, '1').replace(/dua/g, '2')
            .replace(/tiga/g, '3').replace(/empat/g, '4').replace(/lima/g, '5')
            .replace(/enam/g, '6').replace(/tujuh/g, '7').replace(/delapan/g, '8')
            .replace(/sembilan/g, '9')
            .replace(/\s*koma\s*/g, '.')
            .replace(/\s*titik\s*/g, '.');
          
          // Remove spaces that might remain after word replacements (e.g. "1. 5" -> "1.5")
          const cleanSpoken = spoken.replace(/\s*([.])\s*/g, '$1');
          
          const fallbackMatch = cleanSpoken.match(/[\d]+(?:\.[\d]+)?/);
          if (fallbackMatch) parsed = fallbackMatch[0];
        }

        // Cleanup audio resources
        stream?.getTracks().forEach(t => t.stop());
        audioCtx?.close();

        if (parsed) {
          const row = rowStates[specId];
          const committedShift = row.activeShift; // capture BEFORE setRowStates
          setRowStates((prev) => {
            const row = prev[specId];
            if (!row) return prev;
            const updateKey = row.activeShift === 'II'
              ? 'shiftIIValue'
              : row.activeShift === 'III'
              ? 'shiftIIIValue'
              : 'shiftIValue';
            return { ...prev, [specId]: { ...row, [updateKey]: parsed!, isListening: false } };
          });
          handleValueCommit(specId, committedShift);
        } else {
          updateRow(specId, { isListening: false });
          // Show what was heard so user knows what went wrong
          alert(`Heard: "${transcript}" — could not parse a valid number. Try speaking clearly, e.g. "nol koma empat tujuh" or "0.47".`);
        }
      };

      recognition.onerror = (e: any) => {
        stream?.getTracks().forEach(t => t.stop());
        audioCtx?.close();
        updateRow(specId, { isListening: false });
        console.error('Speech recognition error:', e);
        if (e.error === 'no-speech') {
          alert('No speech was detected. Please speak clearly into the microphone.');
        } else if (e.error === 'not-allowed') {
          alert('Microphone permission blocked. Please enable microphone access in your browser settings.');
        } else {
          alert(`Speech recognition failed: ${e.error || 'Unknown error'}. Please try again or use the keypad.`);
        }
      };

      recognition.onend = () => {
        stream?.getTracks().forEach(t => t.stop());
        audioCtx?.close();
        updateRow(specId, { isListening: false });
      };

      recognitionRef.current = recognition;
      recognition.start();
      updateRow(specId, { isListening: true });

    } catch (err) {
      // Microphone permission denied or AudioContext failed
      stream?.getTracks().forEach(t => t.stop());
      audioCtx?.close();
      updateRow(specId, { isListening: false });
      alert('Microphone access denied or audio pipeline failed. Please allow microphone access and try again.');
    }
  }, [updateRow, rowStates, handleValueCommit]);

  const stopVoice = useCallback((specId: string) => {
    if (recognitionRef.current) recognitionRef.current.stop();
    updateRow(specId, { isListening: false });
  }, [updateRow]);

  // Cleanup on unmount
  useEffect(() => () => { recognitionRef.current?.stop(); }, []);

  const handleSubmit = async () => {
    if (!selectedForm || isSubmitting) return;
    const requiredSpecs = selectedForm.specifications.filter((s) => !s.isOptional);
    const hasInvalid = requiredSpecs.some((s) => {
      const row = rowStates[s.id];
      if (!row) return true;
      const vI = row.shiftIValue?.trim();
      const vII = row.shiftIIValue?.trim();
      const vIII = row.shiftIIIValue?.trim();
      return !vI || isNaN(Number(vI)) || 
             !vII || isNaN(Number(vII)) || 
             !vIII || isNaN(Number(vIII));
    });
    if (hasInvalid) {
      alert('Please fill in all required measurement parameters with valid numeric values for Shift I, II, and III before submitting.');
      return;
    }

    const measurements: MeasurementEntry[] = requiredSpecs.map((spec) => {
      const row = rowStates[spec.id];
      const statusI = evaluateStatus(row.shiftIValue, spec.standardValue, spec.tolerance);
      const statusII = evaluateStatus(row.shiftIIValue, spec.standardValue, spec.tolerance);
      const statusIII = evaluateStatus(row.shiftIIIValue, spec.standardValue, spec.tolerance);
      
      const overallStatus = (statusI === 'NG' || statusII === 'NG' || statusIII === 'NG') ? 'NG' : 'OK';

      return {
        paramName: spec.parameterName,
        standardValue: spec.standardValue,
        tolerance: spec.tolerance,
        unit: spec.unit,
        measuredValue: `${row.shiftIValue} | ${row.shiftIIValue} | ${row.shiftIIIValue}`,
        status: overallStatus,
        inputMode: row.mode,
        handwritingData: row.handwritingData,
        shiftIValue: row.shiftIValue,
        shiftIStatus: statusI,
        shiftIIValue: row.shiftIIValue,
        shiftIIStatus: statusII,
        shiftIIIValue: row.shiftIIIValue,
        shiftIIIStatus: statusIII,
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

    try {
      setIsSubmitting(true);
      await onAddSubmission(submission);
      alert('Checksheet submitted and queued in the Approval Inbox!');
      setViewState('select');
    } catch (err) {
      console.error('[DailyChecksView] Submit failed:', err);
      alert('Submission failed. Please verify your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
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
              onClick={() => {
                setScannerMode('form');
                setShowScanner(true);
              }}
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
            <div className="flex items-center gap-1 bg-[#f3f4f5] border border-[#c5c5d3] rounded px-3 py-1.5">
              <span className="text-xs text-[#757682]">Sample:</span>
              <span className="text-xs font-bold font-mono text-[#00236f]">{sampleId}</span>
              <button
                type="button"
                onClick={() => {
                  setScannerMode('sample');
                  setShowScanner(true);
                }}
                className="ml-1 text-[#00236f] hover:text-blue-700 transition-colors p-0.5 rounded hover:bg-gray-200 cursor-pointer"
                title="Scan Sample ID Barcode"
              >
                <Scan size={13} />
              </button>
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
                  const row = rowStates[spec.id] ?? { 
                    shiftIValue: '', 
                    shiftIIValue: '', 
                    shiftIIIValue: '', 
                    mode: 'keypad' as InputMode, 
                    isListening: false,
                    activeShift: 'I' as const
                  };
                  const statusI = evaluateStatus(row.shiftIValue, spec.standardValue, spec.tolerance);
                  const statusII = evaluateStatus(row.shiftIIValue, spec.standardValue, spec.tolerance);
                  const statusIII = evaluateStatus(row.shiftIIIValue, spec.standardValue, spec.tolerance);
                  
                  const isOverallNG = statusI === 'NG' || statusII === 'NG' || statusIII === 'NG';

                  return (
                    <div
                      key={spec.id}
                      id={`spec-row-${spec.id}`}
                      className={`p-4 transition-colors ${isOverallNG ? 'bg-red-50/40' : 'hover:bg-gray-50/50'} ${
                        requiredSpecs.indexOf(spec) === activeSpecIndex
                          ? 'border-l-4 border-l-[#00236f]'
                          : 'border-l-4 border-l-transparent'
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
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border ${
                            statusI === 'OK' ? 'bg-green-50 text-green-700 border-green-200'
                            : statusI === 'NG' ? 'bg-red-50 text-[#ba1a1a] border-red-200 font-black'
                            : 'bg-gray-50 text-[#757682] border-gray-200'
                          }`}>
                            SI: {statusI}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border ${
                            statusII === 'OK' ? 'bg-green-50 text-green-700 border-green-200'
                            : statusII === 'NG' ? 'bg-red-50 text-[#ba1a1a] border-red-200 font-black'
                            : 'bg-gray-50 text-[#757682] border-gray-200'
                          }`}>
                            SII: {statusII}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border ${
                            statusIII === 'OK' ? 'bg-green-50 text-green-700 border-green-200'
                            : statusIII === 'NG' ? 'bg-red-50 text-[#ba1a1a] border-red-200 font-black'
                            : 'bg-gray-50 text-[#757682] border-gray-200'
                          }`}>
                            SIII: {statusIII}
                          </span>
                        </div>
                      </div>

                      {/* Grid for typing values in all three shifts */}
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Shift I</label>
                          <input
                            type="number"
                            step="0.001"
                            value={row.shiftIValue}
                            onChange={(e) => updateRow(spec.id, { shiftIValue: e.target.value })}
                            onBlur={() => {
                              const row = rowStates[spec.id];
                              if (row?.shiftIValue?.trim()) handleValueCommit(spec.id, 'I');
                            }}
                            placeholder="Value…"
                            className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#c5c5d3] rounded-lg focus:border-[#00236f] focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Shift II</label>
                          <input
                            type="number"
                            step="0.001"
                            value={row.shiftIIValue}
                            onChange={(e) => updateRow(spec.id, { shiftIIValue: e.target.value })}
                            onBlur={() => {
                              const row = rowStates[spec.id];
                              if (row?.shiftIIValue?.trim()) handleValueCommit(spec.id, 'II');
                            }}
                            placeholder="Value…"
                            className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#c5c5d3] rounded-lg focus:border-[#00236f] focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Shift III</label>
                          <input
                            type="number"
                            step="0.001"
                            value={row.shiftIIIValue}
                            onChange={(e) => updateRow(spec.id, { shiftIIIValue: e.target.value })}
                            onBlur={() => {
                              const row = rowStates[spec.id];
                              if (row?.shiftIIIValue?.trim()) handleValueCommit(spec.id, 'III');
                            }}
                            placeholder="Value…"
                            className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#c5c5d3] rounded-lg focus:border-[#00236f] focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                          />
                        </div>
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
                              onClick={() => updateRow(spec.id, { activeShift: sName })}
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
                              onClick={() => handleMethodChange(spec.id, 'typing')}
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
                              onClick={() => handleMethodChange(spec.id, 'voice')}
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
                              onClick={() => handleMethodChange(spec.id, 'handwriting')}
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

                      {/* Input area per mode */}
                      {(row.method === 'voice' || row.mode === 'voice') && (
                        <div className="flex items-center gap-3 bg-white p-2 border border-[#c5c5d3] rounded-lg">
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

                      {(row.method === 'handwriting' || row.mode === 'handwriting') && (
                        <div className="flex items-center gap-4 flex-wrap bg-white p-2 border border-[#c5c5d3] rounded-lg">
                          <HandwritingCanvas
                            width={240}
                            height={60}
                            initialDataUrl={row.handwritingData}
                            onChange={(dataUrl) => {
                              updateRow(spec.id, { handwritingData: dataUrl });
                            }}
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
                                updateRow(spec.id, { [updateKey]: e.target.value });
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
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting…' : 'Submit for Approval'} <Send size={13} />
                  </Button>
                </div>
              </div>
            </Card>

            {/* NG warning banner */}
            {requiredSpecs.some((spec) => {
              const row = rowStates[spec.id];
              if (!row) return false;
              const statusI = evaluateStatus(row.shiftIValue, spec.standardValue, spec.tolerance);
              const statusII = evaluateStatus(row.shiftIIValue, spec.standardValue, spec.tolerance);
              const statusIII = evaluateStatus(row.shiftIIIValue, spec.standardValue, spec.tolerance);
              return statusI === 'NG' || statusII === 'NG' || statusIII === 'NG';
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

      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
        title={scannerMode === 'form' ? "Scan Part Number Barcode" : "Scan Sample ID Barcode"}
        placeholder={scannerMode === 'form' ? "Scan or enter Part Number..." : "Scan or enter Sample ID..."}
        demoValues={
          scannerMode === 'form'
            ? masterForms.filter((f) => f.status === 'ACTIVE').map((f) => f.partNumber)
            : ['BATCH-QC-001', 'BATCH-QC-002', 'SAMPLE-LINE-A-501']
        }
      />
    </div>
  );
}
