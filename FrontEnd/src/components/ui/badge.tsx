import React from 'react';
import { cn } from '../../utils/cn';

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'processing'
  | 'active'
  | 'draft'
  | 'archived'
  | 'ok'
  | 'ng'
  | 'high'
  | 'normal';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children?: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[#dce1ff] text-[#00164e] border-[#b6c4ff]',
  secondary: 'bg-[#f3f4f5] text-[#444651] border-[#c5c5d3]',
  destructive: 'bg-red-100 text-[#ba1a1a] border-red-200',
  outline: 'bg-transparent text-[#444651] border-[#c5c5d3]',
  // Status variants
  processing: 'bg-amber-100 text-amber-900 border-amber-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  draft: 'bg-amber-100 text-[#684000] border-amber-200',
  archived: 'bg-gray-100 text-[#444651] border-gray-200',
  // Measurement result variants
  ok: 'bg-green-100 text-green-800 border-green-200',
  ng: 'bg-red-100 text-[#ba1a1a] border-red-200',
  // Priority variants
  high: 'bg-red-100 text-[#ba1a1a] border-red-200',
  normal: 'bg-blue-50 text-[#00236f] border-blue-200',
};

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** Animated pulsing dot for PROCESSING state */
export function ProcessingBadge({ className }: { className?: string }) {
  return (
    <Badge variant="processing" className={className}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600" />
      </span>
      Processing
    </Badge>
  );
}
