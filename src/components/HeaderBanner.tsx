import React from 'react';
import logoMadgi from '../assets/logos/logo-madgi.jpg';
import armoirieCoteIvoire from '../assets/logos/armoirie-cote-ivoire.png';

export default function HeaderBanner() {
  return (
    <header className="bg-white border-b border-slate-200 py-3 px-4 md:px-8 flex items-center justify-between shadow-xs select-none" id="app-header-banner">
      {/* Left — Logo MADGI */}
      <div className="flex items-center shrink-0">
        <img
          src={logoMadgi}
          alt="Logo MADGI"
          className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain"
        />
      </div>

      {/* Center — Titre institutionnel */}
      <div className="text-center flex-1 px-3 sm:px-6">
        <h1 className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold text-[#2b529f] tracking-tight leading-snug font-sans">
          Mutuelle des Agents de la Direction Générale des Impôts
        </h1>
        <div className="w-4/5 sm:w-2/3 md:w-1/2 lg:w-1/3 border-t border-dotted border-slate-300 mx-auto my-1 md:my-1.5" />
        <p className="text-[10px] sm:text-xs md:text-sm font-bold text-[#df9f28] uppercase tracking-widest font-sans">
          Epargne, Santé et Retraite
        </p>
      </div>

      {/* Right — Armoirie de la République de Côte d'Ivoire */}
      <div className="flex items-center shrink-0">
        <img
          src={armoirieCoteIvoire}
          alt="Armoirie de la République de Côte d'Ivoire"
          className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain"
        />
      </div>
    </header>
  );
}
