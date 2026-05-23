import React from 'react';

export default function Logo({ size = 24, className = '' }) {
  return (
    <img
      src="/logo.png"
      alt="EnduraUP Logo"
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, borderRadius: size * 0.2 }}
    />
  );
}
