import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DailyCheckSubmission, MeasurementEntry, ActivityLogEntry, MasterForm } from '../../types';
import { MeasurementRow, RowState, InputMethod } from './MeasurementRow';
import { evaluateStatus } from '../../utils/toleranceEvaluator';
import { spokenNumberToDigit } from '../../utils/spokenNumberToDigit';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { BarcodeScannerModal } from '../ui/BarcodeScannerModal';
import {
  ChevronRight, Send, AlertTriangle, Undo2, FileText,
  Info, ZoomIn, ZoomOut, Maximize, Scan
} from 'lucide-react';

type InputMode = 'keypad' | 'voice' | 'handwriting';

interface MeasurementEntrySheetProps {
  selectedForm: MasterForm;
  sampleId: string;
  inspectorName: string;
  onAddSubmission: (submission: DailyCheckSubmission) => void;
  onBack: () => void;
  onScanSample: () => void;
  masterForms: MasterForm[];
  showScanner: boolean;
  setShowScanner: (v: boolean) => void;
  scannerMode: 'form' | 'sample';
  onScan: (value: string) => void;
}

const getFriendlyVoiceErrorMessage = (errorType: string): string => {
  switch (errorType) {
    case 'no-speech':
      return 'Tidak ada suara terdeteksi. Silakan bicara dengan jelas ke dekat mikrofon.';
    case 'not-allowed':
      return 'Akses mikrofon diblokir. Harap izinkan akses mikrofon di pengaturan browser Anda.';
    case 'audio-capture':
      return 'Gagal menangkap suara. Pastikan mikrofon terpasang dan berfungsi dengan baik.';
    case 'network':
      return 'Koneksi jaringan gagal. Layanan pengenalan suara memerlukan koneksi internet.';
    case 'timeout':
      return 'Tidak ada suara terdeteksi atau koneksi gagal. Coba lagi atau gunakan input manual.';
    default:
      return `Pengenalan suara gagal (${errorType}). Silakan coba lagi atau gunakan input manual.`;
  }
};

/**
 * Measurement entry sheet — PDF viewer + measurement table + submit.
 * Extracted from DailyChecksView entry view (original lines 556–944).
 * Owns all measurement state: rowStates, activeSpecIndex, zoomScale, voice logic.
 * Speech recognition type declarations live in src/types/speech.d.ts.
 */
export function MeasurementEntrySheet({
  selectedForm,
  sampleId,
  inspectorName,
  onAddSubmission,
  onBack,
  onScanSample,
  masterForms,
  showScanner,
  setShowScanner,
  scannerMode,
  onScan,
}: MeasurementEntrySheetProps) {
  const isSpeechSupported =
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  // Initialise row states lazily — runs once on mount for the current form
  const [rowStates, setRowStates] = useState<Record<string, RowState>>(() => {
    const initialRows: Record<string, RowState> = {};
    selectedForm.specifications.forEach((spec) => {
      if (!spec.isOptional) {
        initialRows[spec.id] = {
          shiftIValue: '',
          shiftIIValue: '',
          shiftIIIValue: '',
          mode: 'voice' as InputMode,
          method: 'voice',
          activeShift: 'I',
          isListening: false,
          voiceState: 'idle',
          voiceError: '',
          shiftIHandwritten: false,
          shiftIIHandwritten: false,
          shiftIIIHandwritten: false,
        };
      }
    });
    return initialRows;
  });

  const [activeSpecIndex, setActiveSpecIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isMountedRef = useRef(true);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const voiceTimeoutRef = useRef<any>(null);

  const cleanupAudioPipeline = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.error('Failed to stop media recorder on unmount:', e);
        }
      }
      cleanupAudioPipeline();
    };
  }, [cleanupAudioPipeline]);

  const updateRow = useCallback((specId: string, partial: Partial<RowState>) => {
    if (!isMountedRef.current) return;
    setRowStates((prev) => ({
      ...prev,
      [specId]: { ...prev[specId], ...partial },
    }));
  }, []);

  const handleValueCommit = useCallback(
    (specId: string, shift: 'I' | 'II' | 'III') => {
      const requiredSpecs = selectedForm.specifications.filter((s) => !s.isOptional);
      const idx = requiredSpecs.findIndex((s) => s.id === specId);
      if (idx !== -1) setActiveSpecIndex(idx + 1);
    },
    [selectedForm.specifications]
  );

  const handleMethodChange = useCallback(
    (specId: string, method: InputMethod) => {
      updateRow(specId, {
        method,
        mode: method === 'voice' ? 'voice' : method === 'handwriting' ? 'handwriting' : 'keypad',
      });
    },
    [updateRow]
  );

  const startVoice = useCallback(
    async (specId: string) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }
      cleanupAudioPipeline();

      if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
        updateRow(specId, {
          voiceState: 'failed',
          voiceError: 'Layanan perekaman suara tidak didukung di browser ini.',
        });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
        });
        mediaStreamRef.current = stream;

        let options: any = {};
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' };
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          options = { mimeType: 'audio/wav' };
          mimeType = 'audio/wav';
        }

        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          cleanupAudioPipeline();

          updateRow(specId, { isListening: false, voiceState: 'processing', voiceError: '' });

          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, `audio.${mimeType === 'audio/wav' ? 'wav' : 'webm'}`);

            const response = await fetch('/api/voice/transcribe', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              let errMsg = 'Transcription failed. Please use manual input.';
              try {
                const errJson = await response.json();
                if (errJson.error) {
                  errMsg = errJson.error;
                }
              } catch (e) {}
              
              updateRow(specId, {
                voiceState: 'failed',
                voiceError: errMsg,
              });
              return;
            }

            const data = await response.json();
            const transcript = data.transcript;

            if (!transcript) {
              updateRow(specId, {
                voiceState: 'failed',
                voiceError: 'Transcription returned empty result. Please try again.',
              });
              return;
            }

            const converted = transcript.trim();
            const parsedValue = parseFloat(converted);

            setRowStates((prev) => {
              const currentRow = prev[specId];
              if (!currentRow) return prev;
              const activeShift = currentRow.activeShift ?? 'I';
              const updateKey =
                activeShift === 'II' ? 'shiftIIValue' : activeShift === 'III' ? 'shiftIIIValue' : 'shiftIValue';

              if (!isNaN(parsedValue)) {
                setTimeout(() => {
                  handleValueCommit(specId, activeShift);
                }, 0);

                return {
                  ...prev,
                  [specId]: {
                    ...currentRow,
                    [updateKey]: converted,
                    voiceState: 'idle',
                    voiceError: '',
                  }
                };
              } else {
                return {
                  ...prev,
                  [specId]: {
                    ...currentRow,
                    voiceState: 'failed',
                    voiceError: `Input suara "${transcript}" tidak dapat dibaca sebagai angka. Silakan coba lagi.`,
                  }
                };
              }
            });
          } catch (error: any) {
            console.error('Error during transcription workflow:', error);
            updateRow(specId, {
              voiceState: 'failed',
              voiceError: 'Gagal menghubungi server transkripsi. Harap periksa jaringan Anda.',
            });
          }
        };

        // 10 seconds timeout to automatically stop recording
        voiceTimeoutRef.current = setTimeout(() => {
          console.warn('Voice recording timed out.');
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
              mediaRecorderRef.current.stop();
            } catch (e) {
              console.error(e);
            }
          }
        }, 10000);

        mediaRecorder.start();
        updateRow(specId, { isListening: true, voiceState: 'listening', voiceError: '' });
      } catch (err) {
        if (voiceTimeoutRef.current) {
          clearTimeout(voiceTimeoutRef.current);
          voiceTimeoutRef.current = null;
        }
        cleanupAudioPipeline();
        updateRow(specId, {
          isListening: false,
          voiceState: 'failed',
          voiceError: 'Akses mikrofon ditolak atau gangguan sistem audio. Silakan coba lagi.',
        });
      }
    },
    [updateRow, handleValueCommit, cleanupAudioPipeline]
  );

  const stopVoice = useCallback(
    (specId: string) => {
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
    },
    []
  );

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const requiredSpecs = selectedForm.specifications.filter((s) => !s.isOptional);
    const hasInvalid = requiredSpecs.some((s) => {
      const row = rowStates[s.id];
      if (!row) return true;
      const isVisual = (s as any).inputType === 'visual' || (s as any).input_type === 'visual';
      const vI = row.shiftIValue?.trim();
      const vII = row.shiftIIValue?.trim();
      const vIII = row.shiftIIIValue?.trim();
      if (isVisual) {
        return !vI || !vII || !vIII;
      }
      return !vI || isNaN(Number(vI)) || !vII || isNaN(Number(vII)) || !vIII || isNaN(Number(vIII));
    });
    if (hasInvalid) {
      alert('Please fill in all required parameters with valid values for Shift I, II, and III before submitting.');
      return;
    }

    const measurements: MeasurementEntry[] = requiredSpecs.map((spec) => {
      const row = rowStates[spec.id];
      const isVisual = (spec as any).inputType === 'visual' || (spec as any).input_type === 'visual';
      const statusI = isVisual ? (row.shiftIValue as 'OK' | 'NG') : evaluateStatus(row.shiftIValue, spec.standardValue, spec.tolerance);
      const statusII = isVisual ? (row.shiftIIValue as 'OK' | 'NG') : evaluateStatus(row.shiftIIValue, spec.standardValue, spec.tolerance);
      const statusIII = isVisual ? (row.shiftIIIValue as 'OK' | 'NG') : evaluateStatus(row.shiftIIIValue, spec.standardValue, spec.tolerance);
      const overallStatus = statusI === 'NG' || statusII === 'NG' || statusIII === 'NG' ? 'NG' : 'OK';
      return {
        paramName: spec.parameterName,
        standardValue: spec.standardValue || '',
        tolerance: spec.tolerance || '',
        unit: spec.unit || '',
        measuredValue: `${row.shiftIValue} | ${row.shiftIIValue} | ${row.shiftIIIValue}`,
        status: overallStatus,
        inputMode: isVisual ? undefined : row.mode,
        handwritingData: isVisual ? undefined : row.handwritingData,
        shiftIValue: row.shiftIValue,
        shiftIStatus: statusI,
        shiftIHandwritten: isVisual ? false : row.shiftIHandwritten,
        shiftIIValue: row.shiftIIValue,
        shiftIIStatus: statusII,
        shiftIIHandwritten: isVisual ? false : row.shiftIIHandwritten,
        shiftIIIValue: row.shiftIIIValue,
        shiftIIIStatus: statusIII,
        shiftIIIHandwritten: isVisual ? false : row.shiftIIIHandwritten,
      };
    });

    const isHigh = measurements.some((m) => m.status === 'NG');
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    const timestamp = now.toISOString();

    const activityLog: ActivityLogEntry[] = [
      { id: `al-${Date.now()}-1`, timestamp, action: 'Inspection Started', user: inspectorName, details: `Verification block loaded for ${selectedForm.modelName}`, type: 'start' },
    ];
    if (isHigh) {
      activityLog.push({ id: `al-${Date.now()}-2`, timestamp, action: 'NG Flagged', user: 'System', details: 'Out-of-tolerance deviation detected - escalation triggered.', type: 'flag' });
    }
    activityLog.push({ id: `al-${Date.now()}-3`, timestamp, action: 'Submitted for Review', user: inspectorName, details: `Dispatched to Approval Inbox. Priority: ${isHigh ? 'HIGH (NG)' : 'NORMAL'}`, type: 'submit' });

    const submission: DailyCheckSubmission = {
      id: `chk-${Date.now()}`,
      modelId: selectedForm.id,
      modelName: selectedForm.modelName,
      partNumber: selectedForm.partNumber,
      sampleId,
      submitterName: inspectorName,
      submitterDept: 'Assembly Line',
      submittedDate: `${dateStr}, ${timeStr}`,
      submittedAt: timestamp,
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
      onBack();
    } catch (err) {
      console.error('[MeasurementEntrySheet] Submit failed:', err);
      alert('Submission failed. Please verify your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiredSpecs = selectedForm.specifications.filter((s) => !s.isOptional);
  const hasAnyNG = requiredSpecs.some((spec) => {
    const row = rowStates[spec.id];
    if (!row) return false;
    const isVisual = (spec as any).inputType === 'visual' || (spec as any).input_type === 'visual';
    if (isVisual) {
      return row.shiftIValue === 'NG' || row.shiftIIValue === 'NG' || row.shiftIIIValue === 'NG';
    }
    return (
      evaluateStatus(row.shiftIValue, spec.standardValue, spec.tolerance) === 'NG' ||
      evaluateStatus(row.shiftIIValue, spec.standardValue, spec.tolerance) === 'NG' ||
      evaluateStatus(row.shiftIIIValue, spec.standardValue, spec.tolerance) === 'NG'
    );
  });

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-[#f8f9fa]">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#c5c5d3]">
          <div>
            <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-[#00236f] font-bold hover:underline mb-2">
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
                onClick={onScanSample}
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
                <button onClick={() => setZoomScale((p) => Math.min(p + 0.2, 3))} className="p-1 rounded text-[#757682] hover:bg-gray-200" title="Zoom In"><ZoomIn size={13} /></button>
                <button onClick={() => setZoomScale((p) => Math.max(p - 0.2, 0.4))} className="p-1 rounded text-[#757682] hover:bg-gray-200" title="Zoom Out"><ZoomOut size={13} /></button>
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
                {requiredSpecs.map((spec, idx) => {
                  const row = rowStates[spec.id] ?? {
                    shiftIValue: '', shiftIIValue: '', shiftIIIValue: '',
                    mode: 'keypad' as InputMode, isListening: false, activeShift: 'I' as const,
                    shiftIHandwritten: false, shiftIIHandwritten: false, shiftIIIHandwritten: false,
                  };
                  return (
                    <MeasurementRow
                      key={spec.id}
                      spec={spec}
                      rowState={row}
                      isActive={idx === activeSpecIndex}
                      isSpeechSupported={isSpeechSupported}
                      onUpdate={updateRow}
                      onValueCommit={handleValueCommit}
                      onStartVoice={startVoice}
                      onStopVoice={stopVoice}
                      onMethodChange={handleMethodChange}
                    />
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
            {hasAnyNG && (
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
        onScan={onScan}
        title={scannerMode === 'form' ? 'Scan Part Number Barcode' : 'Scan Sample ID Barcode'}
        placeholder={scannerMode === 'form' ? 'Scan or enter Part Number...' : 'Scan or enter Sample ID...'}
        demoValues={
          scannerMode === 'form'
            ? masterForms.filter((f) => f.status === 'ACTIVE').map((f) => f.partNumber)
            : ['BATCH-QC-001', 'BATCH-QC-002', 'SAMPLE-LINE-A-501']
        }
      />
    </div>
  );
}
