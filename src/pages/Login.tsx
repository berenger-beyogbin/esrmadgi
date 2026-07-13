import React, { useState } from 'react';
import { authService } from '../services/authService';
import { DBUser, UserProfile } from '../types';
import { Loader2, Lock, ShieldCheck, CheckCircle2, ClipboardList, CalendarCheck, HelpCircle } from 'lucide-react';
import HeaderBanner from '../components/HeaderBanner';

interface LoginProps {
  onLoginSuccess: (user: DBUser) => void;
  onStartOnlineAdhesion?: () => void;
}

export default function Login({ onLoginSuccess, onStartOnlineAdhesion }: LoginProps) {
  const [matriculeOrEmail, setMatriculeOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDemoFlyout, setShowDemoFlyout] = useState(false);
  const isDemoEnabled = (import.meta as any).env.DEV === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matriculeOrEmail || !password) {
      setErrorMsg('Veuillez renseigner le matricule et le mot de passe.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const rawInput = matriculeOrEmail.trim();
    const formattedEmail = rawInput.includes('@')
      ? rawInput
      : `${rawInput.toLowerCase()}@madgi.ci`;

    if ((import.meta as any).env.DEV) {
      console.info('[LOGIN_ATTEMPT]', { rawInput, formattedEmail });
    }

    const { user, error } = await authService.login(formattedEmail, password);
    setIsLoading(false);

    if (error) {
      setErrorMsg(error.message || 'Identifiants de connexion invalides. Veuillez réessayer.');
    } else if (user) {
      onLoginSuccess(user);
    }
  };

  const handleQuickLogin = (role: UserProfile) => {
    setIsLoading(true);
    setErrorMsg(null);
    setTimeout(() => {
      try {
        const user = authService.loginAsDemo(role);
        onLoginSuccess(user);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Connexion demo indisponible.');
      } finally {
        setIsLoading(false);
      }
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fc] flex flex-col font-sans relative select-none overflow-x-hidden" id="login-screen-outer">
      {/* 1. Header Banner */}
      <HeaderBanner />

      {/* 2. Content Layout split */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10">
        
        {/* Left Side: Wave Background wash + Checklist + Illustrations */}
        <div className="hidden lg:flex flex-1 px-6 py-12 lg:py-16 flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#e8effa] via-[#f1f6fc] to-[#e4eef9]">
          
          {/* Wave Background vectors mimicking screenshot */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <svg className="w-full h-full" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M-100 200 C150 150 250 350 500 300 C750 250 850 400 1000 350 L1000 600 L-100 600 Z" fill="url(#waveGrad)" />
              <defs>
                <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#dbe8f8" />
                  <stop offset="100%" stopColor="#f5f8fc" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Checklist Area (Centered content) */}
          <div className="max-w-lg mx-auto lg:my-auto space-y-8 z-10">
            
            {/* Checklist Item 1: Adhésion en ligne */}
            <div className="flex items-start gap-4 p-2" id="checklist-item-adhesion">
              <div className="p-3 bg-white border border-slate-200/60 rounded-xl shadow-xs flex items-center justify-center shrink-0">
                <ClipboardList className="w-7 h-7 text-slate-600" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Adhésion en ligne</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Avec l'Epargne Santé - Retraite</p>
              </div>
            </div>

            {/* Checklist Item 2: Suivi du compte ESR */}
            <div className="flex items-start gap-4 p-2" id="checklist-item-suivi">
              <div className="p-3 bg-white border border-slate-200/60 rounded-xl shadow-xs flex items-center justify-center shrink-0 relative">
                <CalendarCheck className="w-7 h-7 text-rose-500" />
                <span className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-500 border border-white rounded-full flex items-center justify-center">
                  <span className="block w-1.5 h-1.5 bg-white rounded-full"></span>
                </span>
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Suivi du compte ESR</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Accès complet à l'épargne</p>
              </div>
            </div>

            {/* Checklist Item 3: Retraite sécurisée */}
            <div className="flex items-start gap-4 p-2" id="checklist-item-retraite">
              <div className="p-3 bg-white border border-slate-200/60 rounded-xl shadow-xs flex items-center justify-center shrink-0">
                <ShieldCheck className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Retraite sécurisée</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Préparation et sérénité de longue durée</p>
              </div>
            </div>
          </div>

          {/* Bottom illustration vector representation */}
          <div className="mt-8 mx-auto lg:mx-0 w-full max-w-sm lg:max-w-md opacity-90 z-10 self-center lg:self-start">
            <svg viewBox="0 0 300 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
              {/* Abstract group of agents drawing */}
              <circle cx="60" cy="110" r="16" fill="#1e3a8a" opacity="0.85" />
              <path d="M35 150 C35 125, 45 120, 60 120 C75 120, 85 125, 85 150 Z" fill="#2b529f" />
              
              <circle cx="120" cy="90" r="18" fill="#df9f28" opacity="0.85" />
              <path d="M92 150 C92 110, 105 105, 120 105 C135 105, 148 110, 148 150 Z" fill="#cca353" />

              <circle cx="180" cy="115" r="14" fill="#347a2a" opacity="0.85" />
              <path d="M158 150 C158 130, 168 125, 180 125 C192 125, 202 130, 202 150 Z" fill="#4e8839" />
              
              {/* Screen or dashboard line at the right */}
              <rect x="220" y="80" width="70" height="70" rx="4" fill="white" stroke="#2b529f" strokeWidth="2.5" />
              <line x1="230" y1="100" x2="280" y2="100" stroke="#cbd5e1" strokeWidth="2" />
              <line x1="230" y1="115" x2="270" y2="115" stroke="#cbd5e1" strokeWidth="2" />
              <line x1="230" y1="130" x2="255" y2="130" stroke="#df9f28" strokeWidth="2" />
              
              {/* Connected dots */}
              <path d="M140 100 Q180 70 215 90" stroke="#2b529f" strokeWidth="1.5" strokeDasharray="3,3" />
            </svg>
          </div>
        </div>

        {/* Right Side: Centered Login Card Form */}
        <div className="flex-1 flex justify-center items-center p-6 md:p-12 lg:p-16 bg-white shrink-0">
          
          {/* Card Container exactly as matches screenshot */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.05)] p-6 sm:p-10 w-full max-w-lg space-y-6" id="login-card">
            
            {/* Titles */}
            <div className="text-center space-y-2">
              <h2 className="text-lg sm:text-2xl font-bold text-[#1b3d7b] font-sans">
                Connexion à votre espace ESR
              </h2>
              <p className="text-xs sm:text-xs font-semibold text-slate-700 max-w-sm mx-auto leading-relaxed">
                Accédez à la plateforme de gestion Épargne, Santé et Retraite
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700" id="login-error">
                {errorMsg}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Matricule Row (Horizontal Aligned on Desktop) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <label htmlFor="matricule" className="w-full sm:w-28 text-left text-xs sm:text-sm font-bold text-slate-700 shrink-0">
                  Matricule
                </label>
                <div className="flex-1">
                  <input
                    id="matricule"
                    type="text"
                    required
                    value={matriculeOrEmail}
                    disabled={isLoading}
                    onChange={(e) => setMatriculeOrEmail(e.target.value)}
                    placeholder="11816P"
                    className="w-full px-3.5 py-2.5 bg-[#f0f3f8] border border-slate-200 rounded-md text-slate-800 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-[#2b529f] focus:border-[#2b529f] text-sm font-medium transition"
                  />
                </div>
              </div>

              {/* Password Row (Horizontal Aligned on Desktop) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 relative">
                <label htmlFor="password" className="w-full sm:w-28 text-left text-xs sm:text-sm font-bold text-slate-700 shrink-0">
                  Mot de passe
                </label>
                <div className="flex-1 space-y-1.5">
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    disabled={isLoading}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••"
                    className="w-full px-3.5 py-2.5 bg-[#f0f3f8] border border-slate-200 rounded-md text-slate-800 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-[#2b529f] focus:border-[#2b529f] text-sm font-medium transition"
                  />
                  
                  {/* Password Forgotten on Right */}
                  <div className="text-right">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        alert("Veuillez contacter le service gestionnaire MADGI pour réinitialiser votre mot de passe.");
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline transition"
                    >
                      Mot de passe oublié ?
                    </a>
                  </div>
                </div>
              </div>

              {/* Se connecter Blue Button */}
              <div className="pt-2">
                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-[#2f5597] hover:bg-[#203f7a] text-white font-bold rounded text-sm transition-all duration-150 shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4" />
                      Connexion en cours...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </button>
              </div>
            </form>

            {/* Separator Line */}
            <div className="py-2">
              <div className="w-3/4 border-t border-slate-200 mx-auto" />
            </div>

            {/* S'inscrire en ligne Gold Button */}
            <div>
              <button
                id="btn-register-page"
                onClick={() => {
                  onStartOnlineAdhesion?.();
                }}
                className="w-full py-3 px-4 bg-white border border-[#cca353] text-[#cca353] hover:bg-[#cca353]/5 font-bold rounded text-sm transition transition-all duration-150 cursor-pointer text-center"
              >
                S'inscrire en ligne
              </button>
            </div>

            {/* Secure Footer Indicator inside card bottom */}
            <div className="pt-4 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold tracking-tight border-t border-slate-100 uppercase">
              <Lock className="w-3 h-3 text-slate-800 shrink-0" strokeWidth={3} />
              <span>MADGI - Plateforme sécurisée - Mutuelle des Agents DGI</span>
            </div>

          </div>
        </div>
      </div>

      {/* Floating Reviewer Quick Login Button - beautiful drawer system to keep layout 100% perfect as screenshots */}
      {isDemoEnabled && (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          id="btn-demo-trigger"
          onClick={() => setShowDemoFlyout(!showDemoFlyout)}
          className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center gap-2 text-xs font-bold transition duration-200"
          title="Accès rapide Démo pour relecteurs"
        >
          <HelpCircle className="w-5 h-5 shrink-0" />
          <span className="hidden sm:inline">Accès Démo</span>
        </button>

        {showDemoFlyout && (
          <div className="absolute bottom-14 right-0 w-72 bg-white border border-slate-200 rounded-xl p-4 shadow-2xl space-y-3 z-50 animate-slide-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase">Simulateur d'accords clients</span>
              <button onClick={() => setShowDemoFlyout(false)} className="text-slate-400 hover:text-slate-650 text-sm">✕</button>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal">
              Utilisez les boutons ci-dessous pour vous connecter instantanément à l'un des trois profils préconfigurés :
            </p>
            <div className="space-y-1.5 pt-1">
              <button
                id="btn-demo-adherent"
                onClick={() => handleQuickLogin('ADHERENT')}
                className="w-full py-2 px-3 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-bold flex justify-between items-center transition"
              >
                <span>👤 Profil Adhérent (Jean Marc)</span>
                <span className="text-[9px] bg-slate-200 px-1 py-0.5 rounded text-slate-600">Simuler</span>
              </button>
              <button
                id="btn-demo-gestionnaire"
                onClick={() => handleQuickLogin('GESTIONNAIRE')}
                className="w-full py-2 px-3 text-left bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 text-emerald-800 rounded text-xs font-bold flex justify-between items-center transition"
              >
                <span>💼 Profil Gestionnaire (Mariama)</span>
                <span className="text-[9px] bg-emerald-100 px-1 py-0.5 rounded text-emerald-800">Simuler</span>
              </button>
              <button
                id="btn-demo-administrateur"
                onClick={() => handleQuickLogin('ADMINISTRATEUR')}
                className="w-full py-2 px-3 text-left bg-amber-50/50 hover:bg-amber-50 border border-amber-100 text-amber-800 rounded text-xs font-bold flex justify-between items-center transition"
              >
                <span>👑 Profil Admin (Bakary)</span>
                <span className="text-[9px] bg-amber-100 px-1 py-0.5 rounded text-amber-800">Simuler</span>
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
