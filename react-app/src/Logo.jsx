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
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <g transform="skewX(-10) translate(2, 0)">
        {/* Vertical runner spine - Violet */}
        <rect x="4" y="4" width="3.5" height="16" rx="1.75" fill="#a78bfa" />
        {/* Top track lane - Violet */}
        <rect x="7.5" y="4" width="12.5" height="3" rx="1.5" fill="#a78bfa" />
        {/* Middle track lane (shorter, speed indicator) - Sky Blue */}
        <rect x="7.5" y="10.5" width="9" height="3" rx="1.5" fill="#38bdf8" />
        {/* Bottom track lane - Sky Blue */}
        <rect x="7.5" y="17" width="12.5" height="3" rx="1.5" fill="#38bdf8" />
      </g>
    </svg>
  );
}
