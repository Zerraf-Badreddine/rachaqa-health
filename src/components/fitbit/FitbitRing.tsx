import { useId } from 'react';

interface FitbitRingProps {
  progress: number; // 0 to 1 (or >1)
  size?: number;
  strokeWidth?: number;
  color?: string;
  gradientColors?: [string, string];
  bgColor?: string;
  innerBg?: string;
  badgeText?: string | null;
  badgeBg?: string;
  badgeTextColor?: string;
  children?: React.ReactNode;
  className?: string;
}

export function FitbitRing({
  progress,
  size = 120,
  strokeWidth = 10,
  color = '#00B0B9',
  gradientColors,
  bgColor,
  innerBg,
  badgeText,
  badgeBg,
  badgeTextColor,
  children,
  className = '',
}: FitbitRingProps) {
  const gradId = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const strokeDashoffset = circumference - clampedProgress * circumference;

  const strokeColor = gradientColors ? `url(#${gradId})` : color;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {gradientColors && (
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="100%" stopColor={gradientColors[1]} />
            </linearGradient>
          </defs>
        )}
        {innerBg && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - strokeWidth / 2}
            fill={innerBg}
          />
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className={bgColor ? '' : 'text-slate-100 dark:text-slate-800/80'}
          style={bgColor ? { color: bgColor } : undefined}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${gradientColors ? gradientColors[0] : color}55)` }}
        />
      </svg>

      {badgeText && (
        <div
          className="absolute bottom-1 z-20 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-tight shadow-md flex items-center justify-center"
          style={{
            backgroundColor: badgeBg || (gradientColors ? gradientColors[1] : color),
            color: badgeTextColor || '#042E16',
          }}
        >
          {badgeText}
        </div>
      )}

      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 z-10">
          {children}
        </div>
      )}
    </div>
  );
}

