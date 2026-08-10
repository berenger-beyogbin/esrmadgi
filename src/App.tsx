import React, { useEffect, useState } from 'react';
import { DBUser, UserProfile } from './types';
import { authService } from './services/authService';
import { onSessionExpired } from './lib/apiClient';
import { supabase } from './services/supabaseClient';

// Module import
import Login from './pages/Login';
import OnlineAdhesion from './pages/OnlineAdhesion';
import FirstLoginPasswordChange from './pages/FirstLoginPasswordChange';
import EspaceAdherent from './pages/EspaceAdherent';
import DashboardV2 from './pages/DashboardV2';
import Adherents from './pages/Adherents';
import AdhesionsEnLigne from './pages/AdhesionsEnLigne';
import ComptesEsr from './pages/ComptesEsr';
import Cotisations from './pages/Cotisations';
import Precomptes from './pages/Precomptes';
import RegularisationPrecomptes from './pages/RegularisationPrecomptes';
import CloturePeriode from './pages/CloturePeriode';
import Prestations from './pages/Prestations';
import Rachats from './pages/Rachats';
import Parametres from './pages/Parametres';
import Reporting from './pages/Reporting';
import Utilisateurs from './pages/Utilisateurs';
import Aide from './pages/Aide';
import HeaderBanner from './components/HeaderBanner';

// Icons matching French labels in Screenshot 3
import {
  LayoutDashboard,
  Users,
  Coins,
  Briefcase,
  Wallet,
  RefreshCw,
  BarChart,
  Sliders,
  UserCog,
  ClipboardCheck,
  HelpCircle,
  Power,
  Menu,
  X,
  Repeat,
  ChevronDown,
  PlusCircle,
  List,
  Lock,
  WalletCards,
} from 'lucide-react';

type ModuleType =
  | 'DASHBOARD'
  | 'ADHESIONS_EN_LIGNE'
  | 'ADHERENTS'
  | 'COTISATIONS'
  | 'PRESTATIONS'
  | 'RACHATS'
  | 'COMPTES'
  | 'PRECOMPTES'
  | 'REGULARISATION_PRECOMPTES'
  | 'CLOTURE_PERIODE'
  | 'REPORTING'
  | 'PARAMETRES'
  | 'UTILISATEURS'
  | 'AIDE';

export default function App() {
  const [currentUser, setCurrentUser] = useState<DBUser | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [publicView, setPublicView] = useState<'LOGIN' | 'ONLINE_ADHESION'>('LOGIN');
  const [activeModule, setActiveModule] = useState<ModuleType>('DASHBOARD');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCotisationsMenuOpen, setIsCotisationsMenuOpen] = useState(false);
  const [openSpontaneeSignal, setOpenSpontaneeSignal] = useState(0);
  const [activeCotisationChildKey, setActiveCotisationChildKey] = useState<string>('COTISATIONS_LISTE');
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // Sync with actual active session on boot
  useEffect(() => {
    async function checkSession() {
      setIsSessionLoading(true);
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
      setIsSessionLoading(false);
    }
    checkSession();
  }, []);

  // Catch password-reset links: Supabase fires this event when the session comes from a recovery link,
  // regardless of the must_change_password flag, so a "forgot password" reset also lands on the set-password screen.
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'PASSWORD_RECOVERY' || !session?.user) return;
      try {
        const profile = await authService.getUserProfile(session.user.id);
        setCurrentUser(profile);
        setIsPasswordRecovery(true);
        setIsSessionLoading(false);
      } catch {
        // Le profil sera resynchronise au prochain checkSession() si besoin.
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // Force a clean return to the login screen whenever the backend rejects the session (expired token)
  useEffect(() => {
    onSessionExpired(() => {
      setCurrentUser((prev) => {
        if (!prev) return prev;
        authService.logout();
        setSessionExpiredMsg('Votre session a expiré. Veuillez vous reconnecter.');
        setIsPasswordRecovery(false);
        return null;
      });
    });
  }, []);

  const handleLoginSuccess = (user: DBUser) => {
    setCurrentUser(user);
    setActiveModule('DASHBOARD');
    setSessionExpiredMsg(null);
    setIsPasswordRecovery(false);
  };

  const handleSignOut = async () => {
    if (window.confirm('Voulez-vous vous déconnecter de MADGI ESR ?')) {
      await authService.logout();
      setCurrentUser(null);
      setActiveModule('DASHBOARD');
      setIsPasswordRecovery(false);
    }
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-[#f4f7fc] flex flex-col items-center justify-center space-y-4" id="app-boot-loader">
        <div className="w-12 h-12 border-4 border-[#2b529f] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-mono tracking-wider uppercase">MADGI ESR — Initialisation...</p>
      </div>
    );
  }

  // If not logged in, render strict login page with HeaderBanner integrated inside
  if (!currentUser) {
    if (publicView === 'ONLINE_ADHESION') {
      return <OnlineAdhesion onBackToLogin={() => setPublicView('LOGIN')} />;
    }
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onStartOnlineAdhesion={() => setPublicView('ONLINE_ADHESION')}
        sessionExpiredMsg={sessionExpiredMsg}
      />
    );
  }

  if (currentUser.must_change_password || isPasswordRecovery) {
    return (
      <FirstLoginPasswordChange
        currentUser={currentUser}
        onPasswordChanged={(user) => {
          setCurrentUser(user);
          setIsPasswordRecovery(false);
          setActiveModule('DASHBOARD');
        }}
        onSignOut={handleSignOut}
      />
    );
  }

  const ficheAdherentId = new URLSearchParams(window.location.search).get('fiche-adherent');
  if (ficheAdherentId && currentUser.role !== 'ADHERENT') {
    return (
      <EspaceAdherent
        currentUser={currentUser}
        adherentIdOverride={ficheAdherentId}
        previewMode
        onSignOut={() => window.close()}
      />
    );
  }

  if (currentUser.role === 'ADHERENT') {
    return <EspaceAdherent currentUser={currentUser} onSignOut={handleSignOut} />;
  }

  // Sidebar configurations matching Screenshot 3 labels and order
  const menuItems = [
    {
      id: 'DASHBOARD' as ModuleType,
      label: 'Tableau de Bord',
      icon: LayoutDashboard,
      allowed: ['ADHERENT', 'GESTIONNAIRE', 'ADMINISTRATEUR'],
    },
    {
      id: 'ADHESIONS_EN_LIGNE' as ModuleType,
      label: 'Demandes en ligne',
      icon: ClipboardCheck,
      allowed: ['GESTIONNAIRE', 'ADMINISTRATEUR'],
    },
    {
      id: 'ADHERENTS' as ModuleType,
      label: 'Adhérents',
      icon: Users,
      allowed: ['ADHERENT', 'GESTIONNAIRE', 'ADMINISTRATEUR'],
    },
    {
      id: 'COTISATIONS_GROUP',
      label: 'Cotisations',
      icon: Coins,
      allowed: ['GESTIONNAIRE', 'ADMINISTRATEUR'],
      children: [
        { key: 'PRECOMPTES', label: 'Gestion des Précomptes', icon: RefreshCw, moduleId: 'PRECOMPTES' as ModuleType },
        { key: 'REGULARISATION_PRECOMPTES', label: 'Régularisation de Précompte', icon: Repeat, moduleId: 'REGULARISATION_PRECOMPTES' as ModuleType },
        { key: 'COTISATION_SPONTANEE', label: 'Cotisation Spontanée', icon: PlusCircle, moduleId: 'COTISATIONS' as ModuleType, action: 'SPONTANEE' as const },
        { key: 'COTISATIONS_LISTE', label: 'Liste des Cotisations', icon: List, moduleId: 'COTISATIONS' as ModuleType },
        { key: 'CLOTURE_PERIODE', label: 'Clôture de Période', icon: Lock, moduleId: 'CLOTURE_PERIODE' as ModuleType },
      ],
    },
    {
      id: 'PRESTATIONS' as ModuleType,
      label: 'Prestations',
      icon: Briefcase,
      allowed: ['GESTIONNAIRE', 'ADMINISTRATEUR'],
    },
    {
      id: 'RACHATS' as ModuleType,
      label: 'Rachats & Résiliations',
      icon: WalletCards,
      allowed: ['GESTIONNAIRE', 'ADMINISTRATEUR'],
    },
    {
      id: 'COMPTES' as ModuleType,
      label: 'Comptes individuels',
      icon: Wallet,
      allowed: ['ADHERENT', 'GESTIONNAIRE', 'ADMINISTRATEUR'],
    },
    {
      id: 'REPORTING' as ModuleType,
      label: 'Reporting',
      icon: BarChart,
      allowed: ['GESTIONNAIRE', 'ADMINISTRATEUR', 'SUPERADMIN'],
    },
    {
      id: 'PARAMETRES' as ModuleType,
      label: 'Paramètres',
      icon: Sliders,
      allowed: ['ADMINISTRATEUR', 'SUPERADMIN'],
    },
    {
      id: 'UTILISATEURS' as ModuleType,
      label: 'Utilisateurs & Acces',
      icon: UserCog,
      allowed: ['ADMINISTRATEUR', 'SUPERADMIN'],
    },
    {
      id: 'AIDE' as ModuleType,
      label: 'Aide & Supports',
      icon: HelpCircle,
      allowed: ['ADHERENT', 'GESTIONNAIRE', 'ADMINISTRATEUR'],
    },
  ];

  const visibleMenuItems = menuItems.filter((item) =>
    currentUser.role === 'SUPERADMIN' || item.allowed.includes(currentUser.role),
  );

  const selectCotisationChild = (child: { key: string; moduleId: ModuleType; action?: 'SPONTANEE' }) => {
    setActiveModule(child.moduleId);
    setActiveCotisationChildKey(child.key);
    if (child.action === 'SPONTANEE') {
      setOpenSpontaneeSignal((n) => n + 1);
    }
  };

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'DASHBOARD':
        return <DashboardV2 currentUser={currentUser} />;
      case 'ADHESIONS_EN_LIGNE':
        return <AdhesionsEnLigne currentUser={currentUser} />;
      case 'ADHERENTS':
        return <Adherents currentUser={currentUser} />;
      case 'COMPTES':
        return <ComptesEsr currentUser={currentUser} />;
      case 'COTISATIONS':
        return (
          <Cotisations
            currentUser={currentUser}
            openSpontaneeSignal={openSpontaneeSignal}
            activeView={activeCotisationChildKey === 'COTISATION_SPONTANEE' ? 'SPONTANEE' : 'LISTE'}
          />
        );
      case 'PRECOMPTES':
        return <Precomptes currentUser={currentUser} />;
      case 'REGULARISATION_PRECOMPTES':
        return <RegularisationPrecomptes currentUser={currentUser} />;
      case 'CLOTURE_PERIODE':
        return <CloturePeriode currentUser={currentUser} />;
      case 'PRESTATIONS':
        return <Prestations currentUser={currentUser} />;
      case 'RACHATS':
        return <Rachats currentUser={currentUser} />;
      case 'PARAMETRES':
        return <Parametres currentUser={currentUser} />;
      case 'UTILISATEURS':
        return <Utilisateurs currentUser={currentUser} />;
      case 'REPORTING':
        return <Reporting />;
      case 'AIDE':
        return <Aide currentUser={currentUser} />;
      default:
        return <DashboardV2 currentUser={currentUser} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative" id="app-viewport">
      {/* 1. PERSISTENT GLOBAL HEADER BANNER AT THE VERY TOP */}
      <HeaderBanner />

      {/* 2. BODY SHELL COMPRISING SIDEBAR + MAIN AREA */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        
        {/* MOBILE MENU INTERACTIVE NAVIGATION */}
        <div className="md:hidden bg-[#2b529f] text-white p-3.5 flex justify-between items-center z-30 border-b border-[#1f3e7a]">
          <span className="font-bold text-sm uppercase tracking-wider">Navigation Menu</span>
          <button
            id="btn-mobile-burger"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1 text-white hover:text-orange-300 transition"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* MOBILE MENU DRAWER OVERLAY */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-xs" id="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="bg-[#2b529f] w-64 max-w-xs h-full p-5 flex flex-col justify-between border-r border-[#1c3e7b]" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-6">
                <div className="flex justify-between items-center text-white">
                  <span className="font-bold text-sm tracking-wider uppercase">MADGI ESR Menu</span>
                  <button onClick={() => setIsMobileMenuOpen(false)}>✕</button>
                </div>

                <div className="space-y-1">
                  {visibleMenuItems.map((item) => {
                    const IconComponent = item.icon;

                    if ('children' in item) {
                      const isGroupActive = item.children.some((c) => c.moduleId === activeModule);
                      return (
                        <div key={item.id}>
                          <button
                            onClick={() => setIsCotisationsMenuOpen((o) => !o)}
                            className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded text-sm font-semibold leading-snug transition ${
                              isGroupActive
                                ? 'bg-white/15 text-white border-l-4 border-[#df9f28]'
                                : 'text-slate-100/80 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <IconComponent className="w-5 h-5 shrink-0 stroke-[2]" />
                            <span className="flex-1 text-left">{item.label}</span>
                            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isCotisationsMenuOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isCotisationsMenuOpen && (
                            <div className="ml-4 border-l border-white/10 space-y-0.5 mt-0.5">
                              {item.children.map((child) => {
                                const ChildIcon = child.icon;
                                const isChildActive = activeModule === child.moduleId && activeCotisationChildKey === child.key;
                                return (
                                  <button
                                    key={child.key}
                                    onClick={() => {
                                      selectCotisationChild(child);
                                      setIsMobileMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded text-sm leading-snug transition ${
                                      isChildActive
                                        ? 'bg-white/15 text-white font-semibold'
                                        : 'text-slate-200/80 hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    <ChildIcon className="w-4 h-4 shrink-0 stroke-[2]" />
                                    <span>{child.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const isActive = activeModule === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveModule(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded text-sm font-semibold leading-snug transition ${
                          isActive
                            ? 'bg-white/15 text-white border-l-4 border-[#df9f28]'
                            : 'text-slate-100/80 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <IconComponent className="w-5 h-5 shrink-0 stroke-[2]" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile disconnect */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 py-3 text-sm font-bold text-rose-300 hover:text-rose-200 transition"
              >
                <Power className="w-4 h-4 shrink-0 stroke-[2.5]" />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. DESKTOP PERMANENT SIDEBAR (DEEP BLUE bg-[#2b529f]) */}
        <aside className="hidden md:flex w-64 bg-[#2b529f] text-white flex-col justify-between shrink-0 select-none z-25 py-5">
          <nav className="space-y-0.5 px-3">
            {visibleMenuItems.map((item) => {
              const IconComponent = item.icon;

              if ('children' in item) {
                const isGroupActive = item.children.some((c) => c.moduleId === activeModule);
                return (
                  <div key={item.id}>
                    <button
                      id="desktop-nav-COTISATIONS_GROUP"
                      onClick={() => setIsCotisationsMenuOpen((o) => !o)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm leading-snug font-medium transition-all ${
                        isGroupActive
                          ? 'bg-[#1c3e7b] text-white font-bold border-l-[3px] border-[#df9f28] shadow-inner'
                          : 'text-slate-100/90 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <IconComponent className="w-[18px] h-[18px] shrink-0 stroke-[1.8]" />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isCotisationsMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isCotisationsMenuOpen && (
                      <div className="ml-4 border-l border-white/10 space-y-0.5 mt-0.5 mb-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = activeModule === child.moduleId && activeCotisationChildKey === child.key;
                          return (
                            <button
                              key={child.key}
                              id={`desktop-nav-${child.key}`}
                              onClick={() => selectCotisationChild(child)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm leading-snug font-medium transition-all ${
                                isChildActive
                                  ? 'bg-[#1c3e7b] text-white font-bold'
                                  : 'text-slate-100/80 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              <ChildIcon className="w-4 h-4 shrink-0 stroke-[1.8]" />
                              <span className="truncate">{child.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  id={`desktop-nav-${item.id}`}
                  onClick={() => setActiveModule(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm leading-snug font-medium transition-all ${
                    isActive
                      ? 'bg-[#1c3e7b] text-white font-bold border-l-[3px] border-[#df9f28] shadow-inner'
                      : 'text-slate-100/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <IconComponent className="w-[18px] h-[18px] shrink-0 stroke-[1.8]" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="px-3 pt-4 border-t border-[#1c3e7b]/50 space-y-3">
            {/* Indicateur utilisateur */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
              <div className="w-8 h-8 rounded-full bg-[#df9f28] text-white flex items-center justify-center text-sm font-bold shrink-0">
                {currentUser.nom.charAt(0)}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-bold text-white truncate">{currentUser.nom}</p>
                <p className="text-xs text-slate-300/80 uppercase tracking-wider truncate">{currentUser.role}</p>
              </div>
            </div>

            <button
              id="desktop-nav-logout"
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-white hover:text-orange-200 hover:bg-white/5 rounded-lg transition-colors duration-150"
            >
              <Power className="w-4 h-4 shrink-0 stroke-[2]" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </aside>

        {/* 4. MAIN WORKSPACE */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f4f7fc]">
          <div className="max-w-7xl mx-auto">
            {renderActiveModule()}
          </div>
        </main>

      </div>
    </div>
  );
}
