import React from 'react';

interface AiinaLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function AiinaLogo({ size = 'md', className = '' }: AiinaLogoProps) {
  // Brand Colors:
  // Red: #C8102E
  // Dark Navy: #1B2A6B

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <div className={`flex flex-col items-start select-none font-sans ${className}`}>
      <div className="flex items-baseline leading-none">
        <span 
          className="font-black tracking-wider text-[#C8102E]"
          style={{ 
            fontSize: isSmall ? '1.25rem' : isLarge ? '2.1rem' : '1.6rem',
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
          }}
        >
          AIINA
        </span>
        <span 
          className="font-extrabold text-[#1B2A6B] tracking-wider uppercase ml-1.5"
          style={{ 
            fontSize: isSmall ? '0.65rem' : isLarge ? '0.95rem' : '0.8rem' 
          }}
        >
          QC
        </span>
      </div>
      <div 
        className="w-full bg-[#1B2A6B] rounded-full" 
        style={{ 
          height: isSmall ? '1.5px' : '2px', 
          marginTop: isSmall ? '2px' : '3px',
          marginBottom: isSmall ? '1px' : '2px'
        }}
      />
      <div 
        className="font-bold text-[#1B2A6B] tracking-wider uppercase leading-none"
        style={{ 
          fontSize: isSmall ? '5.5px' : isLarge ? '9px' : '7.5px',
          letterSpacing: '0.05em'
        }}
      >
        PT. Alpha Innovatech Indonesia
      </div>
    </div>
  );
}
