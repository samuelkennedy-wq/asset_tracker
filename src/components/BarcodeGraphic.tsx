import React from 'react';

interface BarcodeGraphicProps {
  value: string;
  label?: string;
  sublabel?: string;
  height?: number;
  className?: string;
  darkBg?: boolean;
}

export default function BarcodeGraphic({
  value,
  label,
  sublabel,
  height = 54,
  className = '',
  darkBg = false
}: BarcodeGraphicProps) {
  const clean = (value || 'N/A').toUpperCase().trim();

  // Deterministic Code 128 style bar pattern generator
  const generateBars = (str: string) => {
    const bars: { width: number; isSpace: boolean }[] = [];
    // Guard bars
    bars.push({ width: 2, isSpace: false });
    bars.push({ width: 1, isSpace: true });
    bars.push({ width: 2, isSpace: false });
    bars.push({ width: 2, isSpace: true });

    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      const b1 = (code % 3) + 1;
      const s1 = ((code >> 1) % 2) + 1;
      const b2 = ((code >> 2) % 3) + 1;
      const s2 = ((code >> 3) % 2) + 1;

      bars.push({ width: b1, isSpace: false });
      bars.push({ width: s1, isSpace: true });
      bars.push({ width: b2, isSpace: false });
      bars.push({ width: s2, isSpace: true });
    }

    // Stop guard bars
    bars.push({ width: 3, isSpace: false });
    bars.push({ width: 1, isSpace: true });
    bars.push({ width: 1, isSpace: false });
    bars.push({ width: 2, isSpace: false });

    return bars;
  };

  const bars = generateBars(clean);
  const totalWidth = bars.reduce((acc, b) => acc + b.width, 0);

  return (
    <div className={`flex flex-col items-center justify-center p-3.5 rounded-xl border ${
      darkBg ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
    } ${className}`}>
      {label && (
        <span className="text-[10px] font-mono font-black tracking-widest text-teal-500 uppercase mb-1.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
          {label}
        </span>
      )}
      
      <div className="flex items-center justify-center px-4 py-2.5 bg-white rounded-lg border border-slate-300 w-full overflow-hidden shadow-inner">
        <svg
          height={height}
          className="w-full max-w-[280px]"
          preserveAspectRatio="none"
          viewBox={`0 0 ${totalWidth} ${height}`}
        >
          {(() => {
            let currentX = 0;
            return bars.map((bar, idx) => {
              const x = currentX;
              currentX += bar.width;
              if (bar.isSpace) return null;
              return (
                <rect
                  key={idx}
                  x={x}
                  y={0}
                  width={bar.width}
                  height={height}
                  fill="#020617"
                />
              );
            });
          })()}
        </svg>
      </div>

      <div className="mt-2 flex flex-col items-center text-center">
        <span className="font-mono text-xs font-black tracking-widest text-slate-900 dark:text-white uppercase">
          *{clean}*
        </span>
        {sublabel && (
          <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
