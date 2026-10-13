import React from 'react';

interface CompanyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export default function CompanyLogo({ 
  className = '', 
  size = 'md',
  showSubtitle = false 
}: CompanyLogoProps) {
  // Dimensions based on size
  const dimensions = {
    sm: { box: 'w-7 h-7', text: 'text-[11px]', sub: 'text-[9px]' },
    md: { box: 'w-9 h-9', text: 'text-sm', sub: 'text-[10px]' },
    lg: { box: 'w-11 h-11', text: 'text-base', sub: 'text-xs' },
    xl: { box: 'w-16 h-16', text: 'text-2xl', sub: 'text-sm' },
  }[size];

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      {/* Official [24]7.ai Square Logo Badge */}
      <div 
        className={`${dimensions.box} rounded-lg bg-black flex items-center justify-center shrink-0 shadow-sm border border-neutral-800 select-none px-1`}
        title="[24]7.ai"
      >
        <span className={`font-black font-sans tracking-tight text-white ${dimensions.text} flex items-center leading-none`}>
          <span>[24]</span>
          <span className="text-[#f97316]">7</span>
          <span className="text-white text-[80%] ml-[0.5px]">.ai</span>
        </span>
      </div>

      {showSubtitle && (
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-black tracking-tight text-slate-900 uppercase">
            [24]7.ai Asset Tracker
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            IT Asset Movement & Gate Security
          </span>
        </div>
      )}
    </div>
  );
}
