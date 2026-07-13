import React from 'react';

/**
 * Circular MADGI Seal Logo
 * Recreates the light blue globe/map circle with "M A D G I" on the top ring.
 */
export function MadgiLogo({ className = 'w-16 h-16', id = 'madgi-logo-svg' }: { className?: string; id?: string }) {
  return (
    <svg
      id={id}
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer subtle shadow circle */}
      <circle cx="50" cy="50" r="48" fill="white" stroke="#2b529f" strokeWidth="1" />
      <circle cx="50" cy="50" r="44" fill="#f0f5fa" stroke="#90b3e4" strokeWidth="2" />
      <circle cx="50" cy="50" r="38" fill="white" stroke="#2b529f" strokeWidth="1.5" />

      {/* Grid globe coordinates lines (finely drawn) */}
      <ellipse cx="50" cy="50" rx="20" ry="38" stroke="#d5e3f5" strokeWidth="0.8" fill="none" />
      <ellipse cx="50" cy="50" rx="35" ry="20" stroke="#d5e3f5" strokeWidth="0.8" fill="none" />
      <line x1="50" y1="12" x2="50" y2="88" stroke="#d5e3f5" strokeWidth="0.8" />
      <line x1="12" y1="50" x2="88" y2="50" stroke="#d5e3f5" strokeWidth="0.8" />

      {/* Map of Côte d'Ivoire inside (delicate blue shape) */}
      <path
        d="M38 32 C 40 30, 45 32, 47 34 C 50 35, 52 32, 55 31 C 58 31, 62 33, 63 35 C 65 37, 63 42, 65 44 C 67 46, 71 47, 72 50 C 73 53, 69 56, 68 59 C 67 61, 68 64, 65 67 C 62 70, 60 74, 56 75 C 54 75, 52 71, 50 71 C 48 71, 46 73, 44 73 C 41 73, 38 67, 39 65 C 40 63, 37 60, 36 58 C 35 56, 33 54, 34 52 C 35 50, 38 48, 38 46 C 38 44, 34 42, 34 39 C 34 36, 36 34, 38 32 Z"
        fill="#b9d3f1"
        fillOpacity="0.8"
        stroke="#4285f4"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Little green accent star or dot representing Abidjan */}
      <circle cx="56" cy="68" r="1.5" fill="#e06666" />
      
      {/* Outer ring text "M A D G I" */}
      {/* Circular Text Path */}
      <path
        id="textPath"
        d="M 17,50 A 33,33 0 1,1 83,50"
        fill="none"
      />
      <text fill="#1c3e7b" fontSize="7.5" fontWeight="bold" letterSpacing="5.5" className="font-sans">
        <textPath href="#textPath" startOffset="50%" textAnchor="middle">
          M A D G I
        </textPath>
      </text>

      {/* Bottom curved subtle ribbon or line */}
      <path d="M 22 68 Q 50 82 78 68" stroke="#2b529f" strokeWidth="1" fill="none" strokeDasharray="2,2" />
    </svg>
  );
}

/**
 * Côte d'Ivoire Coat of Arms / Emblem
 * Featuring the green shield with elephant, elegant gold palm trees, orange/white/green draping or banner.
 */
export function CivCoatOfArms({ className = 'w-16 h-16', id = 'civ-arms-svg' }: { className?: string; id?: string }) {
  return (
    <svg
      id={id}
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sun rays backburst in gold */}
      <path d="M50 15 L50 2 M50 15 L43 5 M50 15 L57 5 M50 15 L36 9 M50 15 L64 9" stroke="#df9f28" strokeWidth="1.2" strokeLinecap="round" />

      {/* Green/Gold Crown or Sun half-circle at top of shield */}
      <path d="M38 25 Q50 15 62 25" fill="#df9f28" opacity="0.3" />
      <path d="M40 23 Q50 16 60 23" stroke="#df9f28" strokeWidth="1.5" fill="none" />

      {/* Elegant palm trees behind/beside the shield */}
      {/* Left Palm Tree */}
      <path d="M30 65 Q22 45 32 25" stroke="#cca353" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Left Palm Fronds */}
      <path d="M28 28 Q18 25 15 32" stroke="#4e8839" strokeWidth="1.5" fill="none" />
      <path d="M30 26 Q20 20 22 28" stroke="#4e8839" strokeWidth="1.5" fill="none" />
      <path d="M31 23 Q25 15 30 22" stroke="#4e8839" strokeWidth="1.5" fill="none" />
      <path d="M32 25 Q23 35 25 40" stroke="#4e8839" strokeWidth="1.2" fill="none" />

      {/* Right Palm Tree */}
      <path d="M70 65 Q78 45 68 25" stroke="#cca353" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Right Palm Fronds */}
      <path d="M72 28 Q82 25 85 32" stroke="#4e8839" strokeWidth="1.5" fill="none" />
      <path d="M70 26 Q80 20 78 28" stroke="#4e8839" strokeWidth="1.5" fill="none" />
      <path d="M69 23 Q75 15 70 22" stroke="#4e8839" strokeWidth="1.5" fill="none" />
      <path d="M68 25 Q77 35 75 40" stroke="#4e8839" strokeWidth="1.2" fill="none" />

      {/* Central Shield: Emerald Green with Gold Border */}
      <path
        d="M34 26 C42 24, 58 24, 66 26 C68 38, 67 52, 60 62 C55 69, 45 69, 40 62 C33 52, 32 38, 34 26 Z"
        fill="#347a2a"
        stroke="#df9f28"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Elephant's Head inside the shield (White/Silver with Gold tusks) */}
      {/* Ears */}
      <path d="M42 34 Q34 32 37 42 Q40 45 44 42 Z" fill="#e8edf3" stroke="#acc2d8" strokeWidth="0.8" />
      <path d="M58 34 Q66 32 63 42 Q60 45 56 42 Z" fill="#e8edf3" stroke="#acc2d8" strokeWidth="0.8" />
      {/* Head */}
      <path d="M44 32 Q50 28 56 32 Q58 38 56 46 Q50 48 44 46 Q42 38 44 32 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
      {/* Trunk curving up or down */}
      <path d="M48 44 Q50 60 54 54 Q56 50 51 46" stroke="#cbd5e1" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Tusks in gold */}
      <path d="M43 42 Q39 45 42 46 Q43 44 44 43" fill="#cca353" />
      <path d="M57 42 Q61 45 58 46 Q57 44 56 43" fill="#cca353" />

      {/* Elegant Ribbon with Cote d'Ivoire Flag Colors at bottom */}
      <path d="M 22 70 Q 50 82 78 70" stroke="#cca353" strokeWidth="4" fill="none" strokeLinecap="round" />
      
      {/* Orange, White, Green Tri-Color ribbon drape */}
      <path d="M 22 70 Q 50 82 78 70" stroke="#f2a154" strokeWidth="2.2" fill="none" />
      <path d="M 24 72 Q 50 83 76 72" stroke="white" strokeWidth="1.2" fill="none" />
      <path d="M 26 74 Q 50 84 74 74" stroke="#4e8839" strokeWidth="0.8" fill="none" />

      {/* Subtext banner label container */}
      <rect x="25" y="78" width="50" height="7" rx="1.5" fill="#f0f5fa" stroke="#90b3e4" strokeWidth="0.8" />
      <text x="50" y="83.5" fill="#2b529f" fontSize="4.2" fontWeight="bold" textAnchor="middle" className="font-sans">
        CÔTE D'IVOIRE
      </text>
    </svg>
  );
}
