"use client";

import { useState, useEffect, useRef } from "react";

export function TideChart({ tides, className = "" }) {
  if (!tides || tides.length === 0) {
    return null;
  }

  // Sort tides by time
  const sortedTides = [...tides].sort((a, b) => a.time - b.time);
  
  if (sortedTides.length === 0) return null;

  // Get the time range
  const firstTime = sortedTides[0].time;
  const lastTime = sortedTides[sortedTides.length - 1].time;
  const timeRange = lastTime - firstTime;
  
  // Get height range for scaling
  const heights = sortedTides.map(t => t.height || 0);
  const minHeight = Math.min(...heights);
  const maxHeight = Math.max(...heights);
  const heightRange = maxHeight - minHeight || 1; // Avoid division by zero
  
  // Chart dimensions - make it half as wide
  const chartHeight = 100;
  const padding = 25;
  const paddingBottom = 40; // Extra padding for time labels below
  const paddingTop = 35; // Extra padding for height labels above
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  
  // Use a ref to get container width for responsive sizing
  const containerRef = useRef(null);
  const [width, setWidth] = useState(400); // Half the original width

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth || 800);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const innerWidth = width - padding * 2;

  // Convert tide to chart coordinates
  const getX = (time) => {
    if (timeRange === 0) return padding;
    const progress = (time - firstTime) / timeRange;
    return padding + progress * innerWidth;
  };

  const getY = (height) => {
    const normalized = (height - minHeight) / heightRange;
    return paddingTop + (1 - normalized) * innerHeight; // Invert Y axis
  };

  // Create smooth spline curve using Catmull-Rom to Bezier conversion
  const createSplinePath = () => {
    if (sortedTides.length === 0) return '';
    if (sortedTides.length === 1) {
      const x = getX(sortedTides[0].time);
      const y = getY(sortedTides[0].height || 0);
      return `M ${x} ${y}`;
    }
    
    const points = sortedTides.map(tide => ({
      x: getX(tide.time),
      y: getY(tide.height || 0)
    }));
    
    // Start with first point
    let path = `M ${points[0].x} ${points[0].y}`;
    
    // Use Catmull-Rom spline for smooth, natural curves
    // This creates smooth sinusoidal-like curves between points
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : p2;
      
      // Catmull-Rom to Cubic Bezier conversion
      // This creates smooth, natural curves
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    
    return path;
  };
  
  const splinePath = createSplinePath();

  return (
    <div 
      ref={containerRef}
      className={`relative w-full md:w-[400px] ${className}`} 
      style={{ height: `${chartHeight}px`, minHeight: `${chartHeight}px` }}
    >
      <svg
        width={width}
        height={chartHeight}
        className="absolute inset-0"
        style={{ overflow: 'visible', width: '100%', height: '100%' }}
      >
        {/* Background area under curve */}
        <defs>
          <linearGradient id="tideGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        
        {/* Area under curve */}
        {innerWidth > 0 && splinePath && (
          <path
            d={`${splinePath} L ${getX(lastTime)} ${chartHeight - paddingBottom} L ${padding} ${chartHeight - paddingBottom} Z`}
            fill="url(#tideGradient)"
          />
        )}
        
        {/* Tide curve - spline */}
        {innerWidth > 0 && splinePath && (
          <path
            d={splinePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
          />
        )}
        
        {/* Baseline */}
        <line
          x1={padding}
          y1={chartHeight - paddingBottom}
          x2={width - padding}
          y2={chartHeight - paddingBottom}
          stroke="#9ca3af"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
        
        {/* Annotate each tide */}
        {innerWidth > 0 && sortedTides.map((tide, index) => {
          const x = getX(tide.time);
          const y = getY(tide.height || 0);
          
          return (
            <g key={index}>
              {/* Circle at tide point */}
              <circle
                cx={x}
                cy={y}
                r="3"
                fill="#3b82f6"
              />
              
              {/* Tide height above the point */}
              <text
                x={x}
                y={y - 12}
                textAnchor="middle"
                className="font-body fill-ink"
                style={{ fontSize: '11px', fontWeight: 'bold' }}
              >
                {tide.height !== null ? `${tide.height.toFixed(1)}m` : ''}
              </text>
              
              {/* Time below the x-axis */}
              <text
                x={x}
                y={chartHeight - paddingBottom + 18}
                textAnchor="middle"
                className="font-body fill-ink"
                style={{ fontSize: '12px', fontWeight: '500' }}
              >
                {tide.timeStr}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

