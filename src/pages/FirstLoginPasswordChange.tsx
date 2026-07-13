import React, { useState } from 'react';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import { DBUser } from '../types';
import { authService } from '../services/authService';
import HeaderBanner from '../components/HeaderBanner';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy';

interface FirstLoginPasswordChangeProps {
  currentUser: DBUser;
  onPasswordChanged: (user: DBUser) => void;
  onSignOut: () => void;
}

export default function FirstLoginPasswordChange({
  currentUser,
  onPasswordChanged,
  onSignOut,
}: FirstLoginPasswordChangeProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isStrongPassword(password)) {
      setErrorMsg(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);
    const { user, error } = await authService.changePassword(password);
    setIsSubmitting(false);

    if (error || !user) {
      setErrorMsg(error?.message || 'Changement de mot de passe impossible.');
      return;
    }

    onPasswordChanged({
      ...user,
      must_change_password: false,
    });
  };

  return (
    <div className="min-h-screen bg-[#f4f7fc] flex flex-col font-sans">
      <HeaderBanner />
      <main className="flex-1 flex items-center justify-center p-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-xl bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.08)] p-6 sm:p-10 space-y-6"
        >
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#2b529f]/10 text-[#2b529f] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Premiere connexion</h1>
              <p className="text-sm text-slate-500 mt-2">
                Bonjour {currentUser.matricule}. Definissez votre mot de passe personnel pour continuer.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">Nouveau mot de passe</span>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={12}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#2b529f]"
                  autoComplete="new-password"
                  required
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">Confirmer le mot de passe</span>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={12}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#2b529f]"
                  autoComplete="new-password"
                  required
                />
              </div>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onSignOut}
              className="sm:w-40 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#2b529f] text-white font-black hover:bg-[#224783] disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
              Enregistrer et continuer
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
