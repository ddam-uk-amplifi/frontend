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

  // Calculate arc path
  const radius = 80;
  const strokeWidth = 16;
  const center = 100;
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

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col items-center">
      <h3 className="text-sm text-gray-600 mb-4">{label}</h3>
      
      <svg width="200" height="140" viewBox="0 0 200 140">
        {/* Background arc */}
        <path
          d={`M ${center + radius * Math.cos(startRad)} ${center + radius * Math.sin(startRad)} A ${radius} ${radius} 0 1 1 ${center + radius * Math.cos((endAngle * Math.PI) / 180)} ${center + radius * Math.sin((endAngle * Math.PI) / 180)}`}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Value arc */}
        <path
          d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`}
          fill="none"
          stroke={colors.fill}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Center text */}
        <text
          x={center}
          y={center + 5}
          textAnchor="middle"
          className="text-3xl"
          fill={colors.fill}
          style={{ fontWeight: 'bold' }}
        >
          {value.toFixed(1)}
        </text>
      </svg>

      {/* Status indicator */}
      <div className={`mt-4 px-4 py-2 rounded-full text-sm ${colors.text}`} style={{ backgroundColor: colors.bg }}>
        {value < thresholds.red ? 'Below Target' : value < thresholds.yellow ? 'Needs Improvement' : value < thresholds.green ? 'On Target' : 'Excellent'}
      </div>

      {/* Threshold legend */}
      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>&lt; {thresholds.red} - Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>{thresholds.red} - {thresholds.yellow} - Warning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>&gt; {thresholds.yellow} - Good</span>
        </div>
      </div>
    </div>
  );
}
