'use client';

interface GaugeChartProps {
  value: number;
  label: string;
  min?: number;
  max?: number;
  thresholds?: {
    red: number;
    yellow: number;
    green: number;
  };
}

export function GaugeChart({
  value,
  label,
  min = 0,
  max = 120,
  thresholds = { red: 90, yellow: 100, green: 110 }
}: GaugeChartProps) {
  // Calculate percentage for gauge fill
  const percentage = ((value - min) / (max - min)) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  // Determine color based on value and thresholds
  const getColor = () => {
    if (value < thresholds.red) return { bg: '#FEE2E2', fill: '#EF4444', text: 'text-red-600' }; // Red
    if (value < thresholds.yellow) return { bg: '#FEF3C7', fill: '#F59E0B', text: 'text-yellow-600' }; // Yellow
    if (value < thresholds.green) return { bg: '#D1FAE5', fill: '#10B981', text: 'text-green-600' }; // Light Green
    return { bg: '#D1FAE5', fill: '#059669', text: 'text-green-700' }; // Dark Green
  };

  const colors = getColor();

  // Calculate arc path - using smaller radius for better fit
  const radius = 60;
  const strokeWidth = 12;
  const center = 75;
  const startAngle = -135; // Start at bottom left
  const endAngle = 135; // End at bottom right
  const totalAngle = endAngle - startAngle;

  const angleAtValue = startAngle + (totalAngle * clampedPercentage / 100);

  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (angleAtValue * Math.PI) / 180;

  const x1 = center + radius * Math.cos(startRad);
  const y1 = center + radius * Math.sin(startRad);
  const x2 = center + radius * Math.cos(endRad);
  const y2 = center + radius * Math.sin(endRad);

  const largeArcFlag = totalAngle * (clampedPercentage / 100) > 180 ? 1 : 0;

  // Format value for display
  const displayValue = value >= 100 ? value.toFixed(0) : value.toFixed(1);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col items-center min-w-0 overflow-hidden">
      <h3 className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 text-center truncate w-full">{label}</h3>

      {/* Responsive SVG container */}
      <div className="w-full max-w-[150px] aspect-[150/110]">
        <svg viewBox="0 0 150 110" className="w-full h-full">
          {/* Background arc */}
          <path
            d={`M ${center + radius * Math.cos(startRad)} ${center + radius * Math.sin(startRad)} A ${radius} ${radius} 0 1 1 ${center + radius * Math.cos((endAngle * Math.PI) / 180)} ${center + radius * Math.sin((endAngle * Math.PI) / 180)}`}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Value arc */}
          {clampedPercentage > 0 && (
            <path
              d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`}
              fill="none"
              stroke={colors.fill}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          )}

          {/* Center text */}
          <text
            x={center}
            y={center + 5}
            textAnchor="middle"
            className="text-xl sm:text-2xl"
            fill={colors.fill}
            style={{ fontWeight: 'bold', fontSize: '20px' }}
          >
            {displayValue}
          </text>
        </svg>
      </div>

      {/* Status indicator */}
      <div className={`mt-2 px-2.5 py-1 rounded-full text-xs ${colors.text} truncate max-w-full`} style={{ backgroundColor: colors.bg }}>
        {value < thresholds.red ? 'Below Target' : value < thresholds.yellow ? 'Improving' : value < thresholds.green ? 'On Target' : 'Excellent'}
      </div>

      {/* Threshold legend - responsive and compact */}
      <div className="mt-2 text-[10px] sm:text-xs text-gray-500 space-y-0.5 w-full">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
          <span className="truncate">&lt; {thresholds.red}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0"></div>
          <span className="truncate">{thresholds.red} - {thresholds.yellow}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
          <span className="truncate">&gt; {thresholds.yellow}</span>
        </div>
      </div>
    </div>
  );
}
