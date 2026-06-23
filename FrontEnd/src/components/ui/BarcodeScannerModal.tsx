import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Volume2, Play, Square, AlertCircle, Scan, Info } from 'lucide-react';
import { Button } from './button';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
  title?: string;
  placeholder?: string;
  demoValues?: string[];
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Barcode Scanner",
  placeholder = "Enter barcode value manually...",
  demoValues = []
}: BarcodeScannerModalProps) {
  const [manualInput, setManualInput] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Play a synthesized beep sound on successful scan
  const playBeep = () => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime); // Crisp high-frequency beep
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.12); // Duration 120ms
    } catch (e) {
      console.warn("Audio Context failed to play beep:", e);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera connection failed:", err);
      setCameraError("Camera access denied or unavailable. Please check permissions.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Automatically handle opening/closing cleanup
  useEffect(() => {
    if (isOpen) {
      setManualInput('');
      setCameraError(null);
      // Auto-start camera when modal opens
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    playBeep();
    onScan(manualInput.trim());
    onClose();
  };

  const handleDemoSelect = (val: string) => {
    playBeep();
    onScan(val);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#191c1d] text-white rounded-2xl border border-white/10 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex justify-between items-center bg-[#25282a]">
          <h3 className="font-extrabold text-sm tracking-wide text-white uppercase flex items-center gap-2">
            <Scan size={18} className="text-[#3b82f6]" />
            {title}
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className={`p-1.5 rounded-lg border border-white/10 transition-colors ${isMuted ? 'text-gray-500' : 'text-[#3b82f6]'}`}
              title={isMuted ? "Unmute scanner beep" : "Mute scanner beep"}
            >
              <Volume2 size={16} />
            </button>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Simulation Disclaimer Banner */}
        <div className="bg-blue-950/40 px-5 py-2.5 border-b border-white/10 flex items-center gap-2">
          <Info size={14} className="text-[#3b82f6] shrink-0" />
          <p className="text-[11px] text-[#93c5fd] leading-tight">
            <strong>Simulated Scanner:</strong> Physical barcode decoding via camera is simulated. Use the quick select buttons or type manual codes (compatible with hardware scan wedges).
          </p>
        </div>

        {/* Camera Scanner Viewport */}
        <div className="flex-1 min-h-[260px] bg-slate-950 relative flex items-center justify-center overflow-hidden">
          {isCameraActive && !cameraError ? (
            <div 
              className="relative w-full h-[260px] cursor-pointer"
              onClick={() => {
                if (demoValues && demoValues.length > 0) {
                  handleDemoSelect(demoValues[0]);
                } else {
                  playBeep();
                  onScan("BATCH-QC-001");
                  onClose();
                }
              }}
              title="Click camera feed to simulate barcode scan"
            >
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover"
              />
              {/* Target bracket overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-36 border-2 border-dashed border-[#3b82f6] rounded-xl flex items-center justify-center relative bg-black/25">
                  {/* Corner styling */}
                  <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-[#3b82f6] rounded-tl-md"></div>
                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-[#3b82f6] rounded-tr-md"></div>
                  <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-[#3b82f6] rounded-bl-md"></div>
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-[#3b82f6] rounded-br-md"></div>
                  
                  {/* Scanning Laser animation */}
                  <div className="absolute left-1.5 right-1.5 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-bounce"></div>
                </div>
              </div>

              {/* Status info bar */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-[10px] font-semibold text-slate-300 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Camera active... position barcode and tap screen to scan
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 max-w-xs gap-3">
              {cameraError ? (
                <div className="p-3 bg-red-950/40 rounded-xl border border-red-500/20 text-red-400 text-xs flex flex-col items-center gap-1">
                  <AlertCircle size={32} className="mb-1 text-red-500" />
                  <span>{cameraError}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Camera size={36} className="text-slate-600 mb-1" />
                  <span className="text-xs">Camera feed is offline</span>
                </div>
              )}
              
              <Button 
                variant="outline" 
                onClick={startCamera}
                className="mt-2 text-xs border-white/20 text-white hover:bg-white/10"
              >
                <Play size={12} fill="white" /> Activate Scanner Camera
              </Button>
            </div>
          )}

          {/* Toggle Camera Stream */}
          {isCameraActive && (
            <button
              onClick={stopCamera}
              className="absolute top-3 right-3 bg-black/70 hover:bg-black/90 p-2 rounded-lg text-red-400 hover:text-red-500 border border-white/10 transition-colors"
              title="Stop Camera Stream"
            >
              <Square size={14} fill="currentColor" />
            </button>
          )}
        </div>

        {/* Demo Simulation Panel */}
        {demoValues.length > 0 && (
          <div className="px-5 py-3.5 bg-[#25282a] border-t border-b border-white/10">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Quick Scan Simulation (Click a value to simulate barcode detection):
            </label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
              {demoValues.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleDemoSelect(val)}
                  className="px-2.5 py-1 text-xs font-mono font-bold bg-[#191c1d] border border-white/10 rounded-lg text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white transition-all active:scale-95"
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual Input Footer */}
        <div className="p-5 bg-[#1e2123] border-t border-white/10">
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Or Manual Barcode Input:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder={placeholder}
                className="flex-1 px-3 py-2 bg-[#191c1d] border border-white/10 rounded-lg text-sm text-white focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] outline-none"
              />
              <Button 
                type="submit"
                className="bg-[#3b82f6] hover:bg-[#2563eb] text-white"
                disabled={!manualInput.trim()}
              >
                Confirm Value
              </Button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
