import React, { useEffect, useMemo, useState } from 'react';
import { utilisateurService } from '../services/utilisateurService';
import { DBUser, UserProfile, UtilisateurAcces } from '../types';
import { ScrollableTableWrapper } from '../components/common/ScrollableTableWrapper';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy';
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserCog,
  X,
} from 'lucide-react';

interface UtilisateursProps {
  currentUser: DBUser;
}

type FormMode = 'CREATE' | 'EDIT';

interface UserFormState {
  matricule: string;
  email: string;
  password: string;
  profil: UserProfile;
  telephone: string;
  user_actif: boolean;
  id_adherent: string;
}

const ROLE_OPTIONS: Array<{ value: UserProfile; label: string }> = [
  { value: 'ADHERENT', label: 'Adherent' },
  { value: 'GESTIONNAIRE', label: 'Gestionnaire' },
  { value: 'ADMINISTRATEUR', label: 'Superadmin' },
];

const USERS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const emptyForm: UserFormState = {
  matricule: '',
  email: '',
  password: '',
  profil: 'GESTIONNAIRE',
  telephone: '',
  user_actif: true,
  id_adherent: '',
};

function roleLabel(role: UserProfile): string {
  if (role === 'ADHERENT') return 'Adherent';
  if (role === 'GESTIONNAIRE') return 'Gestionnaire';
  return 'Superadmin';
}

function roleBadge(role: UserProfile): string {
  if (role === 'ADHERENT') return 'bg-slate-100 text-slate-700 border-slate-200';
  if (role === 'GESTIONNAIRE') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleString('fr-FR');
}

function parseOptionalId(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('ID adherent invalide.');
  }
  return value;
}

export default function Utilisateurs({ currentUser }: UtilisateursProps) {
  const [users, setUsers] = useState<UtilisateurAcces[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [profilFilter, setProfilFilter] = useState<UserProfile | 'TOUS'>('TOUS');
  const [actifFilter, setActifFilter] = useState<'TOUS' | 'true' | 'false'>('TOUS');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [formMode, setFormMode] = useState<FormMode>('CREATE');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UtilisateurAcces | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [showFormPassword, setShowFormPassword] = useState(false);

  const activeCount = useMemo(() => users.filter((u) => u.user_actif).length, [users]);
  const adminCount = useMemo(
    () => users.filter((u) => u.profil === 'ADMINISTRATEUR' || u.profil === 'SUPERADMIN').length,
    [users],
  );

  const loadUsers = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await utilisateurService.getUtilisateurs({
        search: search.trim() || undefined,
        profil: profilFilter,
        actif: actifFilter,
      });
      if (error) throw error;
      setUsers(data || []);
      setCurrentPage(1);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Erreur lors du chargement des utilisateurs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [profilFilter, actifFilter]);

  const openCreate = () => {
    setFormMode('CREATE');
    setEditingUser(null);
    setForm(emptyForm);
    setShowFormPassword(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowForm(true);
  };

  const openEdit = (user: UtilisateurAcces) => {
    setFormMode('EDIT');
    setEditingUser(user);
    setForm({
      matricule: user.matricule,
      email: user.email,
      password: '',
      profil: user.profil === 'SUPERADMIN' ? 'ADMINISTRATEUR' : user.profil,
      telephone: user.telephone ?? '',
      user_actif: user.user_actif,
      id_adherent: user.id_adherent ?? '',
    });
    setShowFormPassword(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setForm(emptyForm);
    setShowFormPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const idAdherent = parseOptionalId(form.id_adherent);

      if (formMode === 'CREATE') {
        if (!form.matricule.trim()) throw new Error('Matricule obligatoire.');
        if (!form.password.trim()) throw new Error('Mot de passe obligatoire.');
        if (!isStrongPassword(form.password)) throw new Error(PASSWORD_POLICY_MESSAGE);

        const { error } = await utilisateurService.createUtilisateur({
          matricule: form.matricule.trim().toUpperCase(),
          email: form.email.trim(),
          password: form.password,
          profil: form.profil,
          telephone: form.telephone.trim() || null,
          user_actif: form.user_actif,
          id_adherent: idAdherent,
        });
        if (error) throw error;
        setSuccessMsg('Acces utilisateur cree ou repare avec succes.');
      } else if (editingUser) {
        if (form.password.trim() && !isStrongPassword(form.password)) throw new Error(PASSWORD_POLICY_MESSAGE);
        const { error } = await utilisateurService.updateUtilisateur(editingUser.id_utilisateur, {
          email: form.email.trim(),
          password: form.password.trim() || undefined,
          profil: form.profil,
          telephone: form.telephone.trim() || null,
          user_actif: form.user_actif,
          id_adherent: idAdherent,
        });
        if (error) throw error;
        setSuccessMsg('Acces utilisateur mis a jour.');
      }

      closeForm();
      await loadUsers();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Impossible d enregistrer cet acces.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      loadUsers();
    }
  };

  const editingSelf = Boolean(editingUser && String(editingUser.id_utilisateur) === String(currentUser.id));
  const totalPages = Math.max(1, Math.ceil(users.length / rowsPerPage));
  const firstRowIndex = (currentPage - 1) * rowsPerPage;
  const paginatedUsers = users.slice(firstRowIndex, firstRowIndex + rowsPerPage);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  return (
    <div className="space-y-6" id="utilisateurs-acces-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <UserCog className="w-5 h-5 text-emerald-600" />
            Utilisateurs & Acces
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Gestion des comptes, profils et rattachements des utilisateurs MADGI ESR.
          </p>
        </div>
        <button
          id="btn-user-create"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2b529f] hover:bg-[#1c3e7b] text-white rounded-xl text-sm font-bold transition"
        >
          <Plus className="w-4 h-4" />
          Nouvel acces
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Utilisateurs</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800 font-mono">{users.length}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Comptes actifs</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700 font-mono">{activeCount}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Superadmins</p>
          <p className="mt-1 text-2xl font-extrabold text-[#2b529f] font-mono">{adminCount}</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,1.5fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto] items-end gap-4">
          <div className="relative">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Recherche</label>
            <input
              id="input-users-search"
              type="text"
              placeholder="Matricule, email, telephone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyPress}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-8" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Profil</label>
            <select
              value={profilFilter}
              onChange={(e) => setProfilFilter(e.target.value as UserProfile | 'TOUS')}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="TOUS">Tous les profils</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Statut</label>
            <select
              value={actifFilter}
              onChange={(e) => setActifFilter(e.target.value as 'TOUS' | 'true' | 'false')}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="TOUS">Tous</option>
              <option value="true">Actifs</option>
              <option value="false">Desactives</option>
            </select>
          </div>
          <button
            id="btn-users-refresh"
            onClick={loadUsers}
            disabled={isLoading}
            className="h-[42px] flex items-center justify-center gap-1.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">
                {formMode === 'CREATE' ? 'Creer un acces utilisateur' : 'Modifier un acces utilisateur'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {formMode === 'CREATE'
                  ? 'Le compte de connexion et le profil metier seront prepares ensemble.'
                  : 'Laissez le mot de passe vide pour le conserver.'}
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Matricule</label>
              <input
                value={form.matricule}
                onChange={(e) => setForm({ ...form, matricule: e.target.value.toUpperCase() })}
                disabled={formMode === 'EDIT'}
                required
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-mono disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                {formMode === 'CREATE' ? 'Mot de passe' : 'Nouveau mot de passe'}
              </label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showFormPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={formMode === 'CREATE'}
                  minLength={form.password ? 8 : undefined}
                  className="w-full pl-9 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowFormPassword((value) => !value)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-[#2b529f] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#2b529f]/40"
                  aria-label={showFormPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  title={showFormPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Profil</label>
              <select
                value={form.profil}
                onChange={(e) => {
                  const nextProfil = e.target.value as UserProfile;
                  setForm({
                    ...form,
                    profil: nextProfil,
                    id_adherent: nextProfil === 'ADHERENT' ? form.id_adherent : '',
                  });
                }}
                disabled={editingSelf}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm disabled:bg-slate-100"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telephone</label>
              <input
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID adherent lie</label>
              <input
                value={form.id_adherent}
                onChange={(e) => setForm({ ...form, id_adherent: e.target.value })}
                placeholder="Automatique si profil adherent"
                disabled={form.profil !== 'ADHERENT'}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            <div className="md:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.user_actif}
                  disabled={editingSelf}
                  onChange={(e) => setForm({ ...form, user_actif: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                Compte actif
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold disabled:opacity-60"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500 text-sm font-medium">Chargement des utilisateurs...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-sm">Aucun utilisateur ne correspond aux filtres.</p>
        </div>
      ) : (
        <ScrollableTableWrapper maxHeight="none">
          <table className="rtable min-w-full divide-y divide-slate-100 text-sm text-left text-slate-700" id="tbl-utilisateurs">
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase tracking-wide font-bold text-xs">
              <tr>
                <th className="py-3.5 px-4">Matricule</th>
                <th className="py-3.5 px-4">Profil</th>
                <th className="py-3.5 px-4 text-center">Statut</th>
                <th className="py-3.5 px-4 text-center">Connexion</th>
                <th className="py-3.5 px-4 text-center">Derniere connexion</th>
                <th className="py-3.5 px-4 text-center">Rattachement</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedUsers.map((user) => (
                <tr key={user.id_utilisateur} className="hover:bg-slate-50/50 transition">
                  <td data-label="Matricule" className="py-3.5 px-4 font-bold font-mono text-slate-800">{user.matricule}</td>
                  <td data-label="Profil" className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs border ${roleBadge(user.profil)}`}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {roleLabel(user.profil)}
                    </span>
                  </td>
                  <td data-label="Statut" className="py-3.5 px-4 text-center">
                    {user.user_actif ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs">
                        <Ban className="w-3.5 h-3.5" />
                        Desactive
                      </span>
                    )}
                  </td>
                  <td data-label="Connexion" className="py-3.5 px-4 text-center">
                    {user.email_confirme ? (
                      <span className="text-emerald-700 font-semibold text-xs">Pret</span>
                    ) : (
                      <span className="text-amber-700 font-semibold text-xs">A verifier</span>
                    )}
                  </td>
                  <td data-label="Derniere connexion" className="py-3.5 px-4 text-center font-mono text-xs text-slate-500">
                    {formatDate(user.derniere_connexion)}
                  </td>
                  <td data-label="Rattachement" className="py-3.5 px-4 text-center font-mono text-xs text-slate-600">
                    {user.id_adherent ?? '-'}
                  </td>
                  <td data-label="Actions" className="py-3.5 px-4 text-right">
                    <button
                      id={`btn-edit-user-${user.id_utilisateur}`}
                      onClick={() => openEdit(user)}
                      className="p-1 px-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-emerald-600 font-semibold inline-flex items-center gap-1 transition"
                    >
                      <UserCog className="w-3.5 h-3.5" />
                      Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/70">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-medium text-slate-600">
              <span>
                Affichage {firstRowIndex + 1} à {Math.min(firstRowIndex + rowsPerPage, users.length)} sur {users.length} utilisateurs
              </span>
              <label className="flex items-center gap-2">
                <span>Lignes par page</span>
                <select
                  value={rowsPerPage}
                  onChange={(event) => {
                    setRowsPerPage(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  aria-label="Nombre de lignes par page"
                >
                  {USERS_PER_PAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Page précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-700">Page {currentPage} sur {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Page suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </ScrollableTableWrapper>
      )}
    </div>
  );
}
