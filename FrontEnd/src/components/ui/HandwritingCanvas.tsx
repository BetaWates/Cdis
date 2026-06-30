import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface HandwritingCanvasProps {
  /** Called with a base64 PNG data URL every time the user lifts the pen/mouse */
  onChange?: (dataUrl: string) => void;
  /** Populate a previously captured stroke for display */
  initialDataUrl?: string;
  width?: number;
  height?: number;
  className?: string;
  disabled?: boolean;
  isRecognizing?: boolean;
}

/**
 * Lightweight freehand canvas input for stylus / pen / mouse.
 * Uses pointer events for broad device support (mouse, touch, stylus).
 * Stores output as a base64 PNG data URL.
 */
export function HandwritingCanvas({
  onChange,
  initialDataUrl,
  width = 220,
  height = 56,
  className,
  disabled = false,
  isRecognizing = false,
}: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [hasStrokes, setHasStrokes] = useState(!!initialDataUrl);

  // Load initial image if provided
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !initialDataUrl) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = initialDataUrl;
  }, [initialDataUrl]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = (canvasRef.current!.width) / rect.width;
    const scaleY = (canvasRef.current!.height) / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled || isRecognizing) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      isDrawing.current = true;
      lastPos.current = getPos(e);
      setHasStrokes(true);
    },
    [disabled, isRecognizing]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current || disabled || isRecognizing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = '#00236f';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      lastPos.current = pos;
    },
    [disabled, isRecognizing]
  );

  const onPointerUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;
    const canvas = canvasRef.current;
    if (canvas && onChange) {
      onChange(canvas.toDataURL('image/png'));
    }
  }, [onChange]);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    if (onChange) onChange('');
  }, [onChange]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'relative border rounded-lg overflow-hidden bg-white',
          disabled || isRecognizing ? 'border-[#c5c5d3] opacity-50' : 'border-[#00236f]/40 hover:border-[#00236f]',
          'cursor-crosshair'
        )}
        style={{ width, height }}
      >
        {/* Guide line */}
        <div
          className="absolute bottom-3 left-2 right-2 border-b border-dashed border-[#c5c5d3] pointer-events-none"
        />
        {!hasStrokes && !disabled && (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[#c5c5d3] pointer-events-none select-none font-medium">
            Write here
          </span>
        )}
        {isRecognizing && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center pointer-events-none z-10">
            <Loader2 size={16} className="animate-spin text-[#00236f]" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={width * 2}   // 2× for retina sharpness
          height={height * 2}
          style={{ width, height, touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
      {hasStrokes && !disabled && !isRecognizing && (
        <button
          type="button"
          onClick={handleClear}
          title="Clear"
          className="p-1 rounded text-[#757682] hover:text-[#ba1a1a] hover:bg-red-50 transition-colors shrink-0"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
