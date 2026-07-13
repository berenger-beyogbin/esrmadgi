import React from 'react';

interface ScrollableTableWrapperProps {
  children: React.ReactNode;
  maxHeight?: string;
  className?: string;
}

export function ScrollableTableWrapper({
  children,
  maxHeight = '60vh',
  className = '',
}: ScrollableTableWrapperProps) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden ${className}`.trim()}>
      <div className="overflow-auto" style={{ maxHeight }}>
        {children}
      </div>
    </div>
  );
}
