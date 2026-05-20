import React from 'react';

export default function Logo({ size = 24, className = '' }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <g transform="skewX(-10) translate(2, 0)">
        {/* Vertical runner spine */}
        <rect x="4" y="4" width="3.5" height="16" rx="1.75" fill="url(#logo-grad)" />
        {/* Top track lane */}
        <rect x="7.5" y="4" width="12.5" height="3" rx="1.5" fill="url(#logo-grad)" />
        {/* Middle track lane (shorter, speed indicator) */}
        <rect x="7.5" y="10.5" width="9" height="3" rx="1.5" fill="url(#logo-grad)" />
        {/* Bottom track lane */}
        <rect x="7.5" y="17" width="12.5" height="3" rx="1.5" fill="url(#logo-grad)" />
      </g>
      <defs>
        <linearGradient id="logo-grad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a78bfa" /> {/* Violet */}
          <stop offset="1" stopColor="#38bdf8" /> {/* Sky Blue */}
        </linearGradient>
      </defs>
    </svg>
  );
}
