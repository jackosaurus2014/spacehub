'use client';

interface StockMiniChartProps {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
}

export default function StockMiniChart({
  data,
  width = 100,
  height = 32,
  positive = true,
}: StockMiniChartProps) {
  if (!data || data.length < 2) {
    return (
      <div
        className="bg-space-700/50 rounded flex items-center justify-center text-star-400 text-xs"
        style={{ width, height }}
      >
        No data
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Create SVG path
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  // Create gradient fill path
  const fillPoints = [
    `0,${height}`,
    ...points,
    `${width},${height}`,
  ];
  const fillD = `M ${fillPoints.join(' L ')} Z`;

  const color = positive ? '#4ade80' : '#f87171'; // green-400 or red-400
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  const first = data[0];
  const last = data[data.length - 1];
  const changePercent = first !== 0 ? ((last - first) / first) * 100 : 0;
  const trend = positive ? 'upward' : 'downward';

  return (
    <div className="inline-block">
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill={`url(#${gradientId})`} />
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="sr-only">
        {`Stock trend chart showing ${trend} movement, ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}% change over ${data.length} data points`}
      </span>
    </div>
  );
}
