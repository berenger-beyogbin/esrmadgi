import React, { useEffect, useState } from 'react';
import { DBUser, UserProfile } from './types';
import { authService } from './services/authService';

// Module import
import Login from './pages/Login';
import OnlineAdhesion from './pages/OnlineAdhesion';
import FirstLoginPasswordChange from './pages/FirstLoginPasswordChange';
import EspaceAdherent from './pages/EspaceAdherent';
import Dashboard from './pages/Dashboard';
import Adherents from './pages/Adherents';
import AdhesionsEnLigne from './pages/AdhesionsEnLigne';
import ComptesEsr from './pages/ComptesEsr';
import Cotisations from './pages/Cotisations';
import Precomptes from './pages/Precomptes';
import Paiements from './pages/Paiements';
import Prestations from './pages/Prestations';
import Parametres from './pages/Parametres';
import Audit from './pages/Audit';
import Utilisateurs from './pages/Utilisateurs';
import HeaderBanner from './components/HeaderBanner';

// Icons matching French labels in Screenshot 3
import {
  LayoutDashboard,
  Users,
  Coins,
  Briefcase,
  Wallet,
  RefreshCw,
  Landmark,
  BarChart,
  Sliders,
  UserCog,
  ClipboardCheck,
  HelpCircle,
  Power,
  Menu,
  X
} from 'lucide-react';

type ModuleType =
  | 'DASHBOARD'
  | 'ADHESIONS_EN_LIGNE'
  | 'ADHERENTS'
  | 'COTISATIONS'
  | 'PRESTATIONS'
  | 'COMPTES'
  | 'PRECOMPTES'
  | 'PLACEMENTS'
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

  const handleLoginSuccess = (user: DBUser) => {
    setCurrentUser(user);
    setActiveModule('DASHBOARD');
  };

  const handleSignOut = async () => {
    if (window.confirm('Voulez-vous vous déconnecter de MADGI ESR ?')) {
      await authService.logout();
      setCurrentUser(null);
      setActiveModule('DASHBOARD');
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
      />
    );
  }

  if (currentUser.must_change_password) {
    return (
      <FirstLoginPasswordChange
        currentUser={currentUser}
        onPasswordChanged={(user) => {
          setCurrentUser(user);
          setActiveModule('DASHBOARD');
        }}
        onSignOut={handleSignOut}
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
      id: 'COTISATIONS' as ModuleType,
      label: 'Cotisations',
      icon: Coins,
      allowed: ['GESTIONNAIRE', 'ADMINISTRATEUR'],
    },
    {
      id: 'PRESTATIONS' as ModuleType,
      label: 'Prestations',
      icon: Briefcase,
      allowed: ['GESTIONNAIRE', 'ADMINISTRATEUR'],
    },
    {
      id: 'COMPTES' as ModuleType,
      label: 'Comptes individuels',
      icon: Wallet,
      allowed: ['ADHERENT', 'GESTIONNAIRE', 'ADMINISTRATEUR'],
    },
    {
      id: 'PRECOMPTES' as ModuleType,
      label: 'Précomptes',
      icon: RefreshCw,
      allowed: ['GESTIONNAIRE', 'ADMINISTRATEUR'],
    },
    {
      id: 'PLACEMENTS' as ModuleType,
      label: 'Paiements directs',
      icon: Landmark,
      allowed: ['GESTIONNAIRE', 'ADMINISTRATEUR'],
    },
    {
      id: 'REPORTING' as ModuleType,
      label: 'Audit & Reporting',
      icon: BarChart,
      allowed: ['ADMINISTRATEUR', 'SUPERADMIN'],
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

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'DASHBOARD':
        return <Dashboard currentUser={currentUser} />;
      case 'ADHESIONS_EN_LIGNE':
        return <AdhesionsEnLigne currentUser={currentUser} />;
      case 'ADHERENTS':
        return <Adherents currentUser={currentUser} />;
      case 'COMPTES':
        return <ComptesEsr currentUser={currentUser} />;
      case 'COTISATIONS':
        return <Cotisations currentUser={currentUser} />;
      case 'PRECOMPTES':
        return <Precomptes currentUser={currentUser} />;
      case 'PLACEMENTS':
        return <Paiements currentUser={currentUser} />; // placements manages payments direct
      case 'PRESTATIONS':
        return <Prestations currentUser={currentUser} />;
      case 'PARAMETRES':
        return <Parametres currentUser={currentUser} />;
      case 'UTILISATEURS':
        return <Utilisateurs currentUser={currentUser} />;
      case 'REPORTING':
        return <Audit currentUser={currentUser} />; // audit logs serves reporting purposes
      case 'AIDE':
        return (
          <div className="bg-white p-8 rounded-2xl border border-slate-150 shadow-xs max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-[#2b529f]">Aide & Centre d'assistance MADGI ESR</h2>
            <div className="h-px bg-slate-100" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-base text-slate-600 leading-relaxed">
              <div className="space-y-3">
                <h3 className="text-base font-bold text-slate-800">Comment suivre mes cotisations ?</h3>
                <p>Vos cotisations précomptées ou directes sont automatiquement versées sur votre compte individuel visible dans l'onglet <strong>Comptes Indiv</strong>.</p>
              </div>
              <div className="space-y-3">
                <h3 className="text-base font-bold text-slate-800">Comment demander une prestation ?</h3>
                <p>Rapprochez-vous de votre gestionnaire de mutuelle pour soumettre un dossier de Retraite, Décès ou Invalidité, et suivez son avancement en temps réel.</p>
              </div>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-medium">
              💡 Support technique direct par email : <span className="underline select-text">support.mutuelle@dgi.gouv.ci</span> ou par téléphone au 225-20-30-40-50.
            </div>
          </div>
        );
      default:
        return <Dashboard currentUser={currentUser} />;
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
