import React, { useState, useEffect } from 'react';
import { beneficiaireService } from '../services/beneficiaireService';
import { Beneficiaire, LienBeneficiaire, VAdherentComplet } from '../types';
import { Plus, Trash2, Edit, Save, X, Loader2, Users, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

interface BeneficiairesListProps {
  adherent: VAdherentComplet;
  onBack?: () => void;
}

export default function BeneficiairesList({ adherent, onBack }: BeneficiairesListProps) {
  // id_adherent (bigint FK) est prioritaire sur id (UUID) pour la relation beneficiaires
  const resolvedAdherentId = Number(adherent.id_adherent ?? adherent.id);

  const [beneficiaires, setBeneficiaires] = useState<Beneficiaire[]>([]);
  const [liens, setLiens] = useState<LienBeneficiaire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formState, setFormState] = useState({
    nom: '',
    prenoms: '',
    lien: '',
    pourcentage: 0,
  });

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    if (!resolvedAdherentId || isNaN(resolvedAdherentId) || resolvedAdherentId <= 0) {
      setErrorMsg('ID adhérent introuvable, impossible de charger les bénéficiaires.');
      setIsLoading(false);
      return;
    }

    try {
      const { data: bData, error: bError } = await beneficiaireService.getBeneficiairesByAdherent(resolvedAdherentId);
      if (bError) throw bError;
      setBeneficiaires(bData || []);

      const { data: lData, error: lError } = await beneficiaireService.getLiensBeneficiaires();
      if (lError) {
        setErrorMsg(`Référentiel liens bénéficiaires inaccessible : ${lError.message}`);
      }
      setLiens(lData || []);
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Erreur lors du chargement des bénéficiaires : ' + (e.message || String(e)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [resolvedAdherentId]);

  const totalPercentage = beneficiaires.reduce((sum, b) => sum + Number(b.pourcentage || 0), 0);

  const startCreate = () => {
    setEditingId(null);
    setFormState({
      nom: '',
      prenoms: '',
      lien: liens[0]?.libelle_lien ?? '',
      pourcentage: 100 - totalPercentage > 0 ? 100 - totalPercentage : 10,
    });
    setIsEditing(true);
  };

  const startEdit = (b: Beneficiaire) => {
    setEditingId(b.id_beneficiaire);
    setFormState({
      nom: b.nom_benef,
      prenoms: b.prenoms_benef,
      lien: b.lien,
      pourcentage: b.pourcentage,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formState.nom || !formState.prenoms || !formState.lien) {
      setErrorMsg('Tous les champs sont requis.');
      return;
    }

    const pct = Number(formState.pourcentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setErrorMsg('Le pourcentage doit être compris entre 0% et 100%.');
      return;
    }

    const editingItemPct = editingId ? (beneficiaires.find(b => b.id_beneficiaire === editingId)?.pourcentage || 0) : 0;
    const prospectiveSum = totalPercentage - editingItemPct + pct;

    if (prospectiveSum > 100) {
      setErrorMsg(`La somme des pourcentages ne peut pas dépasser 100% (Courante: ${prospectiveSum}%).`);
      return;
    }

    setIsLoading(true);
    try {
      if (editingId) {
        const { error } = await beneficiaireService.updateBeneficiaire(editingId, {
          nom_benef: formState.nom,
          prenoms_benef: formState.prenoms,
          lien: formState.lien,
          pourcentage: pct,
        });
        if (error) throw error;
      } else {
        const { error } = await beneficiaireService.createBeneficiaire({
          id_adherent: resolvedAdherentId,
          nom_benef: formState.nom,
          prenoms_benef: formState.prenoms,
          lien: formState.lien,
          pourcentage: pct,
        });
        if (error) throw error;
      }

      setIsEditing(false);
      setEditingId(null);
      await loadData();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Erreur d\'enregistrement du bénéficiaire.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce bénéficiaire ?')) return;
    setIsLoading(true);
    try {
      const { error } = await beneficiaireService.deleteBeneficiaire(id);
      if (error) throw error;
      await loadData();
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Erreur de suppression du bénéficiaire.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-6 space-y-6" id="beneficiaires-wrapper">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Bénéficiaires désignés pour l'adhérent :
          </h3>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            {adherent.prenoms} {adherent.nom} ({adherent.matricule})
          </p>
        </div>
        {!isEditing && (
          <button
            id="btn-add-beneficiaire"
            onClick={startCreate}
            disabled={liens.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold tracking-wide transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Nouveau bénéficiaire
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl" id="beneficiaire-error">
          {errorMsg}
        </div>
      )}

      {liens.length === 0 && !isLoading && !errorMsg && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="text-sm">La liste des liens bénéficiaires est vide ou inaccessible.
          Veuillez initialiser les référentiels avant d'ajouter des bénéficiaires.</span>
        </div>
      )}

      {/* Distribution status */}
      <div className="p-4 rounded-xl flex items-center gap-3 text-sm justify-between bg-slate-50 border border-slate-200/50">
        <div className="flex items-center gap-2">
          {totalPercentage === 100 ? (
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          )}
          <span className="font-semibold text-slate-700">
            Total des parts désignées : {totalPercentage}% / 100%
          </span>
        </div>
        <p className="text-slate-500">
          {totalPercentage === 100
            ? 'Distribution complète des prestations en cas de décès.'
            : `Reste à désigner : ${100 - totalPercentage}%`}
        </p>
      </div>

      {/* FORM */}
      {isEditing && (
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-200">
            {editingId
              ? 'Modifier un bénéficiaire en cas de décès'
              : 'Déclarer un bénéficiaire en cas de décès'}
          </h4>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase">Nom</label>
              <input
                type="text"
                required
                value={formState.nom}
                onChange={(e) => setFormState({ ...formState, nom: e.target.value })}
                placeholder="Ex: COULIBALY"
                className="mt-1 block w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase">Prénoms</label>
              <input
                type="text"
                required
                value={formState.prenoms}
                onChange={(e) => setFormState({ ...formState, prenoms: e.target.value })}
                placeholder="Ex: Aminata"
                className="mt-1 block w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase">Lien / Parenté</label>
              <select
                value={formState.lien}
                onChange={(e) => setFormState({ ...formState, lien: e.target.value })}
                className="mt-1 block w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {liens.length === 0 && <option value="">— Référentiel vide —</option>}
                {liens.map(ln => (
                  <option key={ln.id_lien_beneficiaire} value={ln.libelle_lien}>
                    {ln.libelle_lien}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase">Part Épargne (%)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={formState.pourcentage}
                  onChange={(e) => setFormState({ ...formState, pourcentage: parseInt(e.target.value) || 0 })}
                  className="mt-1 block w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  id="btn-beneficiaire-save"
                  type="submit"
                  className="px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center transition"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  id="btn-beneficiaire-close"
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl text-xs font-semibold flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* LIST */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : beneficiaires.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-dotted border-slate-200 rounded-2xl">
          <p className="text-slate-400 text-sm">Aucun bénéficiaire désigné pour le moment.</p>
          <button
            id="btn-add-val-direct"
            onClick={startCreate}
            disabled={liens.length === 0}
            className="mt-3 text-sm font-semibold text-emerald-600 hover:text-emerald-500 inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Déclarer un premier bénéficiaire en cas de décès →
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="rtable min-w-full divide-y divide-slate-100 text-sm text-left" id="tbl-beneficiaires">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Bénéficiaire</th>
                <th className="py-3 px-4">Lien de parenté</th>
                <th className="py-3 px-4 text-center">Part attribuée</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {beneficiaires.map(b => (
                <tr key={b.id_beneficiaire} className="hover:bg-slate-50 text-slate-700">
                  <td data-label="Bénéficiaire" className="py-3 px-4 font-semibold uppercase">
                    {b.prenoms_benef} {b.nom_benef}
                  </td>
                  <td data-label="Lien de parenté" className="py-3 px-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-medium text-xs">
                      {b.lien}
                    </span>
                  </td>
                  <td data-label="Part attribuée" className="py-3 px-4 text-center font-bold text-slate-800 font-mono">
                    {b.pourcentage}%
                  </td>
                  <td data-label="Actions" className="py-3 px-4 text-right space-x-2">
                    <button
                      id={`btn-edit-ben-${b.id_beneficiaire}`}
                      onClick={() => startEdit(b)}
                      className="p-1 px-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-105 hover:text-emerald-600 transition"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`btn-delete-ben-${b.id_beneficiaire}`}
                      onClick={() => handleDelete(b.id_beneficiaire)}
                      className="p-1 px-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-105 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {onBack && (
        <div className="pt-4 flex justify-start border-t border-slate-100">
          <button
            id="btn-beneficiaires-back"
            onClick={onBack}
            className="text-sm font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à la fiche adhérent
          </button>
        </div>
      )}
    </div>
  );
}
