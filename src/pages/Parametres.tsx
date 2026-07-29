import React, { useEffect, useState } from 'react';
import { parametreService } from '../services/parametreService';
import { parametresGenerauxService } from '../services/parametresGenerauxService';
import {
  Grade, ParametreVersion, ParamRepartition, Mortalite, ParametreGeneral, DBUser,
  Civilite, SituationMatrimoniale, Emploi, LienBeneficiaire, Fonction,
} from '../types';
import { Settings, Plus, RotateCw, Save, Layers, HeartPulse, BookOpen, X } from 'lucide-react';
import { ScrollableTableWrapper } from '../components/common/ScrollableTableWrapper';

interface ParametresProps {
  currentUser: DBUser;
}

type SubTab = 'ESR_GENERAL' | 'GRADES' | 'VERSIONS' | 'REPARTITIONS' | 'MORTALITE' | 'REFERENTIELS_ADMIN';

const percentageParameterCodes = new Set([
  'TAUX_GAR',
  'FRAIS_RENTE',
  'TAUX_RACHAT',
  'FRAIS_GESTION_RACHAT',
  'TAUX_DECES_AVANT_RETRAITE',
  'TAUX_INVALIDITE_AVANT_RETRAITE',
  'TAUX_COUVERTURE_RETRAITE',
  'TAUX_REMBOURSEMENT_SOINS',
  'TAUX_DECES_PENDANT_RENTE',
]);

export default function Parametres({ currentUser }: ParametresProps) {
  const canAdmin = currentUser.role === 'ADMINISTRATEUR' || currentUser.role === 'SUPERADMIN';
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('ESR_GENERAL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Paramètres généraux ESR States
  const [parametresGeneraux, setParametresGeneraux] = useState<ParametreGeneral[]>([]);
  const [isLoadingPG, setIsLoadingPG] = useState(true);
  const [pgError, setPgError] = useState<string | null>(null);
  const [editingPGId, setEditingPGId] = useState<number | null>(null);
  const [pgEditForm, setPgEditForm] = useState<{ valeur: string; libelle: string; description: string; actif: boolean; date_debut: string; date_fin: string }>({
    valeur: '',
    libelle: '',
    description: '',
    actif: true,
    date_debut: '',
    date_fin: '',
  });
  const [isSavingPG, setIsSavingPG] = useState(false);

  // Grades States
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isLoadingGrades, setIsLoadingGrades] = useState(true);
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [gradeForm, setGradeForm] = useState({
    libelle_grade: '',
    age_retraite: 60,
    cotisation_annuelle: 600000,
  });
  const [editingGradeId, setEditingGradeId] = useState<number | null>(null);
  const [gradeEditForm, setGradeEditForm] = useState({
    libelle_grade: '',
    age_retraite: 60,
    cotisation_annuelle: 600000,
    actif: true,
  });

  // Versions States
  const [versions, setVersions] = useState<ParametreVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);

  // Repartitions States
  const [repartitions, setRepartitions] = useState<ParamRepartition[]>([]);
  const [isLoadingRepartitions, setIsLoadingRepartitions] = useState(true);
  const [repartitionsError, setRepartitionsError] = useState<string | null>(null);
  const [showRepartitionForm, setShowRepartitionForm] = useState(false);
  const [repartitionForm, setRepartitionForm] = useState({ date_effet: '', taux_sante: '', taux_retraite: '', taux_actif: true });
  const [editingRepartitionId, setEditingRepartitionId] = useState<number | null>(null);
  const [repartitionEditForm, setRepartitionEditForm] = useState({ date_effet: '', taux_sante: '', taux_retraite: '', taux_actif: true });
  const [repartitionFormError, setRepartitionFormError] = useState<string | null>(null);
  const [repartitionEditError, setRepartitionEditError] = useState<string | null>(null);

  // Mortalite States
  const [mortalites, setMortalites] = useState<Mortalite[]>([]);
  const [isLoadingMortalites, setIsLoadingMortalites] = useState(true);
  const [mortaliteError, setMortaliteError] = useState<string | null>(null);
  const [mortaliteSearch, setMortaliteSearch] = useState('');

  // Référentiels administratifs States
  const [isLoadingRef, setIsLoadingRef] = useState(false);
  const [refGlobalError, setRefGlobalError] = useState<string | null>(null);

  const [civilites, setCivilites] = useState<Civilite[]>([]);
  const [editingCivId, setEditingCivId] = useState<number | null>(null);
  const [civEditForm, setCivEditForm] = useState({ libelle_civilite: '', actif: true });
  const [showCivForm, setShowCivForm] = useState(false);
  const [civNewForm, setCivNewForm] = useState({ libelle_civilite: '', actif: true });
  const [civError, setCivError] = useState<string | null>(null);

  const [situations, setSituations] = useState<SituationMatrimoniale[]>([]);
  const [editingSitId, setEditingSitId] = useState<number | null>(null);
  const [sitEditForm, setSitEditForm] = useState({ libelle_situation: '', actif: true });
  const [showSitForm, setShowSitForm] = useState(false);
  const [sitNewForm, setSitNewForm] = useState({ libelle_situation: '', actif: true });
  const [sitError, setSitError] = useState<string | null>(null);

  const [emplois, setEmplois] = useState<Emploi[]>([]);
  const [editingEmpId, setEditingEmpId] = useState<number | null>(null);
  const [empEditForm, setEmpEditForm] = useState({ libelle_emploi: '', actif: true });
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [empNewForm, setEmpNewForm] = useState({ libelle_emploi: '', actif: true });
  const [empError, setEmpError] = useState<string | null>(null);

  const [liens, setLiens] = useState<LienBeneficiaire[]>([]);
  const [editingLienId, setEditingLienId] = useState<number | null>(null);
  const [lienEditForm, setLienEditForm] = useState({ libelle_lien: '', actif: true });
  const [showLienForm, setShowLienForm] = useState(false);
  const [lienNewForm, setLienNewForm] = useState({ libelle_lien: '', actif: true });
  const [lienError, setLienError] = useState<string | null>(null);

  const [fonctions, setFonctions] = useState<Fonction[]>([]);
  const [editingFonctionId, setEditingFonctionId] = useState<number | null>(null);
  const [fonctionEditForm, setFonctionEditForm] = useState({ libelle_fonction: '', actif: true });
  const [showFonctionForm, setShowFonctionForm] = useState(false);
  const [fonctionNewForm, setFonctionNewForm] = useState({ libelle_fonction: '', actif: true });
  const [fonctionError, setFonctionError] = useState<string | null>(null);

  // Handlers for Paramètres généraux
  const loadParametresGeneraux = async () => {
    setIsLoadingPG(true);
    setPgError(null);
    try {
      const { data, error } = await parametresGenerauxService.getParametresGeneraux();
      if (error) throw error;
      setParametresGeneraux(data || []);
    } catch (e: any) {
      setPgError(e?.message || 'Erreur de chargement des paramètres généraux ESR.');
    } finally {
      setIsLoadingPG(false);
    }
  };

  const handleStartEditPG = (pg: ParametreGeneral) => {
    setEditingPGId(pg.id_parametre_generaux);
    setPgEditForm({
      valeur: pg.valeur ?? '',
      libelle: pg.libelle ?? '',
      description: pg.description ?? '',
      actif: pg.actif ?? true,
      date_debut: pg.date_debut ?? '',
      date_fin: pg.date_fin ?? '',
    });
  };

  const handleCancelEditPG = () => {
    setEditingPGId(null);
  };

  const handleSavePG = async (id: number) => {
    setIsSavingPG(true);
    setPgError(null);
    try {
      const current = parametresGeneraux.find((item) => item.id_parametre_generaux === id);
      if (current?.code && percentageParameterCodes.has(current.code)) {
        const numericValue = Number(pgEditForm.valeur.replace(',', '.'));
        if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100) {
          throw new Error('Le taux doit être compris entre 0 et 100.');
        }
      }
      const { error } = await parametresGenerauxService.updateParametreGeneral(id, {
        valeur: pgEditForm.valeur || null,
        libelle: pgEditForm.libelle,
        description: pgEditForm.description || null,
        actif: pgEditForm.actif,
        date_debut: pgEditForm.date_debut || null,
        date_fin: pgEditForm.date_fin || null,
      });
      if (error) throw error;
      setEditingPGId(null);
      await loadParametresGeneraux();
    } catch (e: any) {
      setPgError(e?.message || 'Erreur lors de la mise à jour du paramètre.');
    } finally {
      setIsSavingPG(false);
    }
  };

  // Handlers for Grades
  const loadGradesData = async () => {
    setIsLoadingGrades(true);
    setErrorMsg(null);
    try {
      const { data, error } = await parametreService.getGrades();
      if (error) throw error;
      setGrades(data || []);
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Erreur de chargement des grades.');
    } finally {
      setIsLoadingGrades(false);
    }
  };

  const handleCreateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeForm.libelle_grade) return;

    setIsLoadingGrades(true);
    try {
      const { error } = await parametreService.createGrade({
        libelle_grade: gradeForm.libelle_grade,
        age_retraite: Number(gradeForm.age_retraite),
        cotisation_annuelle: Number(gradeForm.cotisation_annuelle),
        actif: true,
      });

      if (error) throw error;
      setShowGradeForm(false);
      setGradeForm({ libelle_grade: '', age_retraite: 60, cotisation_annuelle: 600000 });
      await loadGradesData();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Erreur lors de la création du grade.');
    } finally {
      setIsLoadingGrades(false);
    }
  };

  const handleStartEditGrade = (grade: Grade) => {
    setEditingGradeId(grade.id_grade);
    setGradeEditForm({
      libelle_grade: grade.libelle_grade,
      age_retraite: grade.age_retraite,
      cotisation_annuelle: grade.cotisation_annuelle,
      actif: grade.actif ?? true,
    });
  };

  const handleCancelEditGrade = () => {
    setEditingGradeId(null);
  };

  const handleSaveGrade = async (id_grade: number) => {
    setIsLoadingGrades(true);
    setErrorMsg(null);
    try {
      const { error } = await parametreService.updateGrade(id_grade, {
        libelle_grade: gradeEditForm.libelle_grade,
        age_retraite: gradeEditForm.age_retraite,
        cotisation_annuelle: gradeEditForm.cotisation_annuelle,
        actif: gradeEditForm.actif,
      });
      if (error) throw error;
      setEditingGradeId(null);
      await loadGradesData();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Erreur lors de la mise à jour du grade.');
    } finally {
      setIsLoadingGrades(false);
    }
  };

  // Handlers for parameters versions
  const loadVersionsData = async () => {
    setIsLoadingVersions(true);
    try {
      const { data, error } = await parametreService.getParametreVersions();
      if (error) throw error;
      setVersions(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  // Handlers for Repartitions
  const validateRepartitionTaux = (ts: string, tr: string): string | null => {
    const s = parseFloat(ts), r = parseFloat(tr);
    if (isNaN(s) || s < 0 || s > 100) return 'Taux santé doit être compris entre 0 et 100.';
    if (isNaN(r) || r < 0 || r > 100) return 'Taux retraite doit être compris entre 0 et 100.';
    if (Math.abs(s + r - 100) > 0.001) return 'Taux santé + Taux retraite doit être égal à 100.';
    return null;
  };

  const loadRepartitionsData = async () => {
    setIsLoadingRepartitions(true);
    setRepartitionsError(null);
    const { data, error } = await parametreService.getParamRepartitions();
    if (error) setRepartitionsError(error.message || 'Erreur de chargement des répartitions.');
    setRepartitions(data || []);
    setIsLoadingRepartitions(false);
  };

  const handleCreateRepartition = async (e: React.FormEvent) => {
    e.preventDefault();
    setRepartitionFormError(null);
    if (!repartitionForm.date_effet) { setRepartitionFormError("La date d'effet est obligatoire."); return; }
    const err = validateRepartitionTaux(repartitionForm.taux_sante, repartitionForm.taux_retraite);
    if (err) { setRepartitionFormError(err); return; }
    setIsLoadingRepartitions(true);
    const { error } = await parametreService.createParamRepartition({
      date_effet: repartitionForm.date_effet,
      taux_sante: parseFloat(repartitionForm.taux_sante),
      taux_retraite: parseFloat(repartitionForm.taux_retraite),
      taux_actif: repartitionForm.taux_actif,
    });
    if (error) {
      setRepartitionsError(error.message || 'Erreur lors de la création.');
      setIsLoadingRepartitions(false);
      return;
    }
    setShowRepartitionForm(false);
    setRepartitionForm({ date_effet: '', taux_sante: '', taux_retraite: '', taux_actif: true });
    await loadRepartitionsData();
  };

  const handleStartEditRepartition = (rp: ParamRepartition) => {
    setEditingRepartitionId(rp.id_param_repartition);
    setRepartitionEditForm({
      date_effet: rp.date_effet,
      taux_sante: rp.taux_sante !== null ? String(rp.taux_sante) : '',
      taux_retraite: rp.taux_retraite !== null ? String(rp.taux_retraite) : '',
      taux_actif: rp.taux_actif ?? true,
    });
    setRepartitionEditError(null);
  };

  const handleCancelEditRepartition = () => {
    setEditingRepartitionId(null);
    setRepartitionEditError(null);
  };

  const handleSaveRepartition = async (id: number) => {
    setRepartitionEditError(null);
    if (!repartitionEditForm.date_effet) { setRepartitionEditError("Date d'effet obligatoire."); return; }
    const err = validateRepartitionTaux(repartitionEditForm.taux_sante, repartitionEditForm.taux_retraite);
    if (err) { setRepartitionEditError(err); return; }
    setIsLoadingRepartitions(true);
    const { error } = await parametreService.updateParamRepartition(id, {
      date_effet: repartitionEditForm.date_effet,
      taux_sante: parseFloat(repartitionEditForm.taux_sante),
      taux_retraite: parseFloat(repartitionEditForm.taux_retraite),
      taux_actif: repartitionEditForm.taux_actif,
    });
    if (error) {
      setRepartitionEditError(error.message || 'Erreur lors de la mise à jour.');
      setIsLoadingRepartitions(false);
      return;
    }
    setEditingRepartitionId(null);
    await loadRepartitionsData();
  };

  // Handlers for mortality table
  const loadMortaliteData = async () => {
    setIsLoadingMortalites(true);
    setMortaliteError(null);
    const { data, error } = await parametreService.getMortalite();
    if (error) setMortaliteError(error.message || 'Erreur de chargement de la table de mortalité.');
    setMortalites(data);
    setIsLoadingMortalites(false);
  };

  const loadReferentielsData = async () => {
    setIsLoadingRef(true);
    setRefGlobalError(null);
    const [civRes, sitRes, empRes, lienRes, fonRes] = await Promise.all([
      parametreService.getCivilites(),
      parametreService.getSituationsMatrimoniales(),
      parametreService.getEmplois(),
      parametreService.getLiensBeneficiaires(),
      parametreService.getFonctions(),
    ]);
    const errs: string[] = [];
    if (civRes.error) errs.push(`Civilités : ${civRes.error.message}`);
    if (sitRes.error) errs.push(`Situations matrimoniales : ${sitRes.error.message}`);
    if (empRes.error) errs.push(`Emplois : ${empRes.error.message}`);
    if (lienRes.error) errs.push(`Liens bénéficiaires : ${lienRes.error.message}`);
    if (fonRes.error) errs.push(`Fonctions : ${fonRes.error.message}`);
    if (errs.length > 0) setRefGlobalError(errs.join(' | '));
    setCivilites(civRes.data);
    setSituations(sitRes.data);
    setEmplois(empRes.data);
    setLiens(lienRes.data);
    setFonctions(fonRes.data);
    setIsLoadingRef(false);
  };

  useEffect(() => {
    if (activeSubTab === 'ESR_GENERAL') loadParametresGeneraux();
    else if (activeSubTab === 'GRADES') loadGradesData();
    else if (activeSubTab === 'VERSIONS') loadVersionsData();
    else if (activeSubTab === 'REPARTITIONS') loadRepartitionsData();
    else if (activeSubTab === 'MORTALITE') loadMortaliteData();
    else if (activeSubTab === 'REFERENTIELS_ADMIN') loadReferentielsData();
  }, [activeSubTab]);

  return (
    <div className="space-y-6" id="parametres-module-wrapper">
      {/* Header Portlet */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm font-sans">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-600" />
            Paramètres Techniques de l'Actuariat
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Configuration des variables, répartition des rentes, coefficients de mortalité et gestion des grades ESR.
          </p>
        </div>
      </div>

      {/* Settings Sub-Tab selection */}
      <div className="flex flex-wrap border-b border-slate-200 text-xs font-semibold gap-2">
        <button
          onClick={() => setActiveSubTab('ESR_GENERAL')}
          className={`pb-3 px-4 border-b-2 transition ${
            activeSubTab === 'ESR_GENERAL'
              ? 'border-emerald-500 text-emerald-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Paramètres généraux ESR
        </button>
        <button
          onClick={() => setActiveSubTab('GRADES')}
          className={`pb-3 px-4 border-b-2 transition ${
            activeSubTab === 'GRADES' 
              ? 'border-emerald-500 text-emerald-600 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Gestion des Grades & Échelons
        </button>
        <button
          onClick={() => setActiveSubTab('VERSIONS')}
          className={`pb-3 px-4 border-b-2 transition ${
            activeSubTab === 'VERSIONS' 
              ? 'border-emerald-500 text-emerald-600 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Paramètres Réglementaires Versionnés
        </button>
        <button
          onClick={() => setActiveSubTab('REPARTITIONS')}
          className={`pb-3 px-4 border-b-2 transition ${
            activeSubTab === 'REPARTITIONS' 
              ? 'border-emerald-500 text-emerald-600 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Clés de Répartition (Santé / Retraite)
        </button>
        <button
          onClick={() => setActiveSubTab('MORTALITE')}
          className={`pb-3 px-4 border-b-2 transition ${
            activeSubTab === 'MORTALITE'
              ? 'border-emerald-500 text-emerald-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Lois de Survie (Mortalité)
        </button>
        <button
          onClick={() => setActiveSubTab('REFERENTIELS_ADMIN')}
          className={`pb-3 px-4 border-b-2 transition ${
            activeSubTab === 'REFERENTIELS_ADMIN'
              ? 'border-emerald-500 text-emerald-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Référentiels administratifs
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* 0. PARAMÈTRES GÉNÉRAUX ESR TAB */}
      {activeSubTab === 'ESR_GENERAL' && (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs rounded-xl">
            Paramètres actuariels et réglementaires globaux de l'ESR.
            Seule la modification est autorisée — aucune création ni suppression depuis cette interface.
          </div>

          {pgError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
              {pgError}
            </div>
          )}

          {isLoadingPG ? (
            <div className="text-center py-6">
              <RotateCw className="w-6 h-6 animate-spin mx-auto text-slate-400" />
            </div>
          ) : parametresGeneraux.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 text-sm">
              Aucun paramètre général ESR disponible. Veuillez initialiser les paramètres.
            </div>
          ) : (
            <ScrollableTableWrapper className="text-xs">
              <table className="min-w-full divide-y divide-slate-100 text-left" id="tbl-parametres-generaux">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase font-bold text-xs">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Libellé</th>
                    <th className="py-3 px-4">Valeur</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-center">Actif</th>
                    <th className="py-3 px-4">Date début</th>
                    <th className="py-3 px-4">Date fin</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {parametresGeneraux.map((pg) => (
                    <tr key={pg.id_parametre_generaux} className="hover:bg-slate-50/50">
                      {editingPGId === pg.id_parametre_generaux ? (
                        <>
                          <td className="py-3 px-4 font-bold font-mono text-indigo-700 uppercase">{pg.code ?? '—'}</td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={pgEditForm.libelle}
                              onChange={(e) => setPgEditForm({ ...pgEditForm, libelle: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              placeholder="Libellé"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type={pg.code && percentageParameterCodes.has(pg.code) ? 'number' : 'text'}
                              min={pg.code && percentageParameterCodes.has(pg.code) ? 0 : undefined}
                              max={pg.code && percentageParameterCodes.has(pg.code) ? 100 : undefined}
                              step={pg.code && percentageParameterCodes.has(pg.code) ? 0.01 : undefined}
                              value={pgEditForm.valeur}
                              onChange={(e) => setPgEditForm({ ...pgEditForm, valeur: e.target.value })}
                              className="w-full bg-white border border-indigo-300 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={pgEditForm.description}
                              onChange={(e) => setPgEditForm({ ...pgEditForm, description: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              placeholder="Description (optionnel)"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={pgEditForm.actif}
                              onChange={(e) => setPgEditForm({ ...pgEditForm, actif: e.target.checked })}
                              className="w-4 h-4 accent-emerald-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="date"
                              value={pgEditForm.date_debut}
                              onChange={(e) => setPgEditForm({ ...pgEditForm, date_debut: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="date"
                              value={pgEditForm.date_fin}
                              onChange={(e) => setPgEditForm({ ...pgEditForm, date_fin: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleSavePG(pg.id_parametre_generaux)}
                                disabled={isSavingPG}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] disabled:opacity-50"
                              >
                                {isSavingPG ? '…' : 'Enregistrer'}
                              </button>
                              <button
                                onClick={handleCancelEditPG}
                                className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-[10px]"
                              >
                                Annuler
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 font-bold font-mono text-indigo-700 uppercase">{pg.code ?? <span className="text-slate-300 italic">—</span>}</td>
                          <td className="py-3 px-4 font-semibold text-slate-700">{pg.libelle}</td>
                          <td className="py-3 px-4 font-extrabold font-mono text-slate-800">
                            {pg.valeur ?? <span className="text-slate-300 italic">—</span>}
                            {pg.valeur != null && pg.code && percentageParameterCodes.has(pg.code) ? ' %' : ''}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{pg.description ?? <span className="text-slate-300 italic">—</span>}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              pg.actif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {pg.actif ? 'OUI' : 'NON'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">{pg.date_debut ?? '—'}</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{pg.date_fin ?? '—'}</td>
                          <td className="py-3 px-4 text-right">
                            {canAdmin && (
                              <button
                                onClick={() => handleStartEditPG(pg)}
                                className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-[10px] transition"
                              >
                                Modifier
                              </button>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTableWrapper>
          )}
        </div>
      )}

      {/* 1. GRADES TAB */}
      {activeSubTab === 'GRADES' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200/60 rounded-xl text-xs text-slate-600">
            <span>Ces configurations s'appliquent lors de l'enregistrement de contrats d'adhérents pour précalculer l'âge de retraite et la cotisation induite.</span>
            {!showGradeForm && currentUser.role !== 'ADHERENT' && (
              <button
                id="btn-show-grade-form"
                onClick={() => setShowGradeForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-650 hover:bg-emerald-600 text-slate-700 hover:text-white border border-emerald-300 rounded-lg font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouveau Grade
              </button>
            )}
          </div>

          {showGradeForm && (
            <div className="p-5 bg-white border border-slate-200 rounded-xl max-w-lg mx-auto" id="grade-form-panel">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-700 pb-2 border-b border-slate-100 mb-4">Ajout d'un échelon de cotisation</h4>
              <form onSubmit={handleCreateGrade} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-xs uppercase font-bold text-slate-500">Libellé Grade</label>
                  <input
                    type="text"
                    required
                    value={gradeForm.libelle_grade}
                    onChange={(e) => setGradeForm({ ...gradeForm, libelle_grade: e.target.value })}
                    placeholder="Ex: A8"
                    className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs uppercase font-bold text-slate-500">Âge de retraite par défaut</label>
                    <input
                      type="number"
                      required
                      value={gradeForm.age_retraite}
                      onChange={(e) => setGradeForm({ ...gradeForm, age_retraite: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase font-bold text-slate-500">Cotisation Annuelle (FCFA)</label>
                    <input
                      type="number"
                      required
                      value={gradeForm.cotisation_annuelle}
                      onChange={(e) => setGradeForm({ ...gradeForm, cotisation_annuelle: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    id="btn-grade-cancel"
                    type="button"
                    onClick={() => setShowGradeForm(false)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    id="btn-grade-save"
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
                  >
                    Publier l'échelon
                  </button>
                </div>
              </form>
            </div>
          )}

          {isLoadingGrades ? (
            <div className="text-center py-6">
              <RotateCw className="w-6 h-6 animate-spin mx-auto text-slate-450" />
            </div>
          ) : grades.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 text-sm">
              Aucun grade disponible. Veuillez initialiser les grades.
            </div>
          ) : (
            <ScrollableTableWrapper className="text-xs">
              <table className="min-w-full divide-y divide-slate-100 text-left" id="tbl-grades">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase font-bold text-xs">
                  <tr>
                    <th className="py-2.5 px-4">ID</th>
                    <th className="py-2.5 px-4">Libellé Grade</th>
                    <th className="py-2.5 px-4 text-center">Âge Retraite</th>
                    <th className="py-2.5 px-4 text-right">Cotisation Annuelle</th>
                    <th className="py-2.5 px-4 text-center">Actif</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {grades.map((gr) => (
                    <tr key={gr.id_grade} className="hover:bg-slate-50/50">
                      {editingGradeId === gr.id_grade ? (
                        <>
                          <td className="py-3 px-4 font-mono text-slate-400">{gr.id_grade}</td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={gradeEditForm.libelle_grade}
                              onChange={(e) => setGradeEditForm({ ...gradeEditForm, libelle_grade: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 uppercase"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              value={gradeEditForm.age_retraite}
                              onChange={(e) => setGradeEditForm({ ...gradeEditForm, age_retraite: parseInt(e.target.value) || 60 })}
                              className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <input
                              type="number"
                              value={gradeEditForm.cotisation_annuelle}
                              onChange={(e) => setGradeEditForm({ ...gradeEditForm, cotisation_annuelle: parseFloat(e.target.value) || 0 })}
                              className="w-36 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono text-right focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={gradeEditForm.actif}
                              onChange={(e) => setGradeEditForm({ ...gradeEditForm, actif: e.target.checked })}
                              className="w-4 h-4 accent-emerald-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleSaveGrade(gr.id_grade)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px]"
                              >
                                Enregistrer
                              </button>
                              <button
                                onClick={handleCancelEditGrade}
                                className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-[10px]"
                              >
                                Annuler
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 font-mono text-slate-400">{gr.id_grade}</td>
                          <td className="py-3 px-4 font-bold font-mono text-slate-800">{gr.libelle_grade}</td>
                          <td className="py-3 px-4 text-center font-semibold font-mono text-slate-600">{gr.age_retraite} ans</td>
                          <td className="py-3 px-4 text-right font-extrabold font-mono text-slate-800">
                            {gr.cotisation_annuelle.toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              gr.actif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {gr.actif ? 'OUI' : 'NON'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {currentUser.role !== 'ADHERENT' && (
                              <button
                                onClick={() => handleStartEditGrade(gr)}
                                className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-[10px] transition"
                              >
                                Modifier
                              </button>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTableWrapper>
          )}
        </div>
      )}

      {/* 2. REGULATORY PARAMETERS TAB */}
      {activeSubTab === 'VERSIONS' && (
        <div className="space-y-4">
          <p className="text-slate-500 text-xs">Tableau de configuration historique globale : <span className="font-mono text-emerald-600">parametre_versions</span>.</p>
          {isLoadingVersions ? (
            <div className="text-center py-6"><RotateCw className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
          ) : (
            <ScrollableTableWrapper className="text-xs">
              <table className="min-w-full divide-y divide-slate-100 text-left" id="tbl-versions">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase font-bold text-xs">
                  <tr>
                    <th className="py-3 px-4">Code Paramètre</th>
                    <th className="py-3 px-4">Intititule</th>
                    <th className="py-3 px-4">Valeur Appliquée</th>
                    <th className="py-3 px-4">Date de début d'application</th>
                    <th className="py-3 px-4">Date de fin d'effet</th>
                    <th className="py-3 px-4">État d'activité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {versions.map((vr) => (
                    <tr key={vr.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-bold font-mono text-slate-800 uppercase">{vr.code}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600">{vr.nom}</td>
                      <td className="py-3.5 px-4 font-extrabold text-indigo-700 font-mono">{vr.valeur}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-550">{vr.date_debut}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{vr.date_fin || 'Indéterminée (Courante)'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          vr.actif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-450'
                        }`}>
                          {vr.actif ? 'ACTIF' : 'INACTIF'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTableWrapper>
          )}
        </div>
      )}

      {/* 3. REPARTITIONS TAB */}
      {activeSubTab === 'REPARTITIONS' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200/60 rounded-xl text-xs text-slate-600">
            <span>Clés de répartition lues depuis <span className="font-mono text-emerald-600">param_repartitions</span>. Chaque ligne ventile la cotisation entre santé et retraite.</span>
            {!showRepartitionForm && currentUser.role !== 'ADHERENT' && (
              <button
                onClick={() => { setShowRepartitionForm(true); setRepartitionFormError(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-650 hover:bg-emerald-600 text-slate-700 hover:text-white border border-emerald-300 rounded-lg font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouvelle répartition
              </button>
            )}
          </div>

          {showRepartitionForm && (
            <div className="p-5 bg-white border border-slate-200 rounded-xl max-w-lg mx-auto">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-700 pb-2 border-b border-slate-100 mb-4">Nouvelle clé de répartition</h4>
              <form onSubmit={handleCreateRepartition} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-xs uppercase font-bold text-slate-500">Date d'effet *</label>
                  <input
                    type="date"
                    required
                    value={repartitionForm.date_effet}
                    onChange={(e) => setRepartitionForm({ ...repartitionForm, date_effet: e.target.value })}
                    className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs uppercase font-bold text-slate-500">Taux Santé (%) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      step="0.01"
                      value={repartitionForm.taux_sante}
                      onChange={(e) => setRepartitionForm({ ...repartitionForm, taux_sante: e.target.value })}
                      className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: 25"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase font-bold text-slate-500">Taux Retraite (%) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      step="0.01"
                      value={repartitionForm.taux_retraite}
                      onChange={(e) => setRepartitionForm({ ...repartitionForm, taux_retraite: e.target.value })}
                      className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: 75"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="new-taux-actif"
                    checked={repartitionForm.taux_actif}
                    onChange={(e) => setRepartitionForm({ ...repartitionForm, taux_actif: e.target.checked })}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                  <label htmlFor="new-taux-actif" className="text-xs uppercase font-bold text-slate-500 cursor-pointer">Actif</label>
                </div>
                {repartitionFormError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] rounded-lg">
                    {repartitionFormError}
                  </div>
                )}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowRepartitionForm(false); setRepartitionFormError(null); }}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-semibold"
                  >
                    Annuler
                  </button>
                  <button type="submit" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold">
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          )}

          {repartitionsError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
              {repartitionsError}
            </div>
          )}

          {isLoadingRepartitions ? (
            <div className="text-center py-6"><RotateCw className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
          ) : repartitions.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 text-sm">
              Aucune clé de répartition disponible.
            </div>
          ) : (
            <ScrollableTableWrapper className="text-xs">
              <table className="min-w-full divide-y divide-slate-100 text-left" id="tbl-repartitions">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase font-bold text-xs">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Date effet</th>
                    <th className="py-3 px-4 text-center">Taux santé (%)</th>
                    <th className="py-3 px-4 text-center">Taux retraite (%)</th>
                    <th className="py-3 px-4 text-center">Total (%)</th>
                    <th className="py-3 px-4 text-center">Actif</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {repartitions.map((rp) => (
                    <tr key={rp.id_param_repartition} className="hover:bg-slate-50/50">
                      {editingRepartitionId === rp.id_param_repartition ? (
                        <>
                          <td className="py-3 px-4 font-mono text-slate-400">{rp.id_param_repartition}</td>
                          <td className="py-3 px-4">
                            <input
                              type="date"
                              value={repartitionEditForm.date_effet}
                              onChange={(e) => setRepartitionEditForm({ ...repartitionEditForm, date_effet: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={repartitionEditForm.taux_sante}
                              onChange={(e) => setRepartitionEditForm({ ...repartitionEditForm, taux_sante: e.target.value })}
                              className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={repartitionEditForm.taux_retraite}
                              onChange={(e) => setRepartitionEditForm({ ...repartitionEditForm, taux_retraite: e.target.value })}
                              className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            {(() => {
                              const s = parseFloat(repartitionEditForm.taux_sante);
                              const r = parseFloat(repartitionEditForm.taux_retraite);
                              if (isNaN(s) || isNaN(r)) return <span className="text-slate-400">—</span>;
                              const total = s + r;
                              return <span className={Math.abs(total - 100) > 0.001 ? 'text-rose-600 font-bold' : 'text-slate-800 font-bold'}>{total.toFixed(2)}%</span>;
                            })()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={repartitionEditForm.taux_actif}
                              onChange={(e) => setRepartitionEditForm({ ...repartitionEditForm, taux_actif: e.target.checked })}
                              className="w-4 h-4 accent-emerald-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex flex-col items-end gap-1">
                              {repartitionEditError && (
                                <span className="text-rose-600 text-[9px] font-semibold text-right">{repartitionEditError}</span>
                              )}
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleSaveRepartition(rp.id_param_repartition)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px]"
                                >
                                  Enregistrer
                                </button>
                                <button
                                  onClick={handleCancelEditRepartition}
                                  className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-[10px]"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 font-mono text-slate-400">{rp.id_param_repartition}</td>
                          <td className="py-3 px-4 font-mono text-slate-700">{rp.date_effet}</td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-600 font-mono">
                            {rp.taux_sante !== null ? `${rp.taux_sante}%` : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-sky-600 font-mono">
                            {rp.taux_retraite !== null ? `${rp.taux_retraite}%` : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-bold font-mono">
                            {rp.taux_sante !== null && rp.taux_retraite !== null ? (
                              <span className={Math.abs(rp.taux_sante + rp.taux_retraite - 100) > 0.001 ? 'text-rose-600' : 'text-slate-800'}>
                                {(rp.taux_sante + rp.taux_retraite)}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              rp.taux_actif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {rp.taux_actif ? 'OUI' : 'NON'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {currentUser.role !== 'ADHERENT' && (
                              <button
                                onClick={() => handleStartEditRepartition(rp)}
                                className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-[10px] transition"
                              >
                                Modifier
                              </button>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTableWrapper>
          )}
        </div>
      )}

      {/* 5. RÉFÉRENTIELS ADMINISTRATIFS TAB */}
      {activeSubTab === 'REFERENTIELS_ADMIN' && (
        <div className="space-y-8">
          <div className="p-4 bg-sky-50 border border-sky-100 text-sky-800 text-xs rounded-xl flex gap-2">
            <BookOpen className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Référentiels administratifs</p>
              <p className="font-light mt-1 leading-relaxed">
                Ces référentiels alimentent les listes déroulantes du formulaire adhérent et des bénéficiaires.
                Vérifiez qu'ils sont bien renseignés avant de saisir les adhérents.
              </p>
            </div>
          </div>

          {refGlobalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
              Erreur de chargement : {refGlobalError}
            </div>
          )}

          {isLoadingRef ? (
            <div className="text-center py-10">
              <RotateCw className="w-6 h-6 animate-spin mx-auto text-slate-400" />
            </div>
          ) : (
            <div className="space-y-10">

              {/* ── 1. CIVILITÉS ─────────────────────────────────────── */}
              <section className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800">1. Civilités</h3>
                  {!showCivForm && currentUser.role !== 'ADHERENT' && (
                    <button
                      onClick={() => { setShowCivForm(true); setCivNewForm({ libelle_civilite: '', actif: true }); setCivError(null); }}
                      className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter
                    </button>
                  )}
                </div>

                {civError && <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">{civError}</div>}

                {showCivForm && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setCivError(null);
                      if (!civNewForm.libelle_civilite.trim()) { setCivError('Le libellé est obligatoire.'); return; }
                      const { error } = await parametreService.createCivilite({ libelle_civilite: civNewForm.libelle_civilite.trim(), actif: civNewForm.actif });
                      if (error) { setCivError(error.message); return; }
                      setShowCivForm(false);
                      await loadReferentielsData();
                    }}
                    className="flex gap-2 items-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                  >
                    <input
                      type="text"
                      required
                      value={civNewForm.libelle_civilite}
                      onChange={(e) => setCivNewForm({ ...civNewForm, libelle_civilite: e.target.value })}
                      placeholder="Ex: Madame"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <label className="flex items-center gap-1 text-slate-500 font-semibold">
                      <input type="checkbox" checked={civNewForm.actif} onChange={(e) => setCivNewForm({ ...civNewForm, actif: e.target.checked })} className="accent-emerald-600" />
                      Actif
                    </label>
                    <button type="submit" className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-500">Créer</button>
                    <button type="button" onClick={() => setShowCivForm(false)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
                  </form>
                )}

                {civilites.length === 0 ? (
                  <div className="p-6 text-center bg-white rounded-xl border border-slate-100 text-slate-400 text-xs">
                    Aucune civilité disponible.
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-100 bg-white overflow-hidden text-xs">
                    <div className="overflow-auto max-h-[350px]">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase font-bold text-xs">
                        <tr>
                          <th className="py-2 px-4">ID</th>
                          <th className="py-2 px-4">Libellé</th>
                          <th className="py-2 px-4 text-center">Actif</th>
                          <th className="py-2 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {civilites.map((civ) => (
                          <tr key={civ.id_civilite} className="hover:bg-slate-50/50">
                            {editingCivId === civ.id_civilite ? (
                              <>
                                <td className="py-2 px-4 font-mono text-slate-400">{civ.id_civilite}</td>
                                <td className="py-2 px-4">
                                  <input
                                    type="text"
                                    value={civEditForm.libelle_civilite}
                                    onChange={(e) => setCivEditForm({ ...civEditForm, libelle_civilite: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                  />
                                </td>
                                <td className="py-2 px-4 text-center">
                                  <input type="checkbox" checked={civEditForm.actif} onChange={(e) => setCivEditForm({ ...civEditForm, actif: e.target.checked })} className="accent-emerald-600" />
                                </td>
                                <td className="py-2 px-4 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={async () => {
                                        setCivError(null);
                                        const { error } = await parametreService.updateCivilite(civ.id_civilite, civEditForm);
                                        if (error) { setCivError(error.message); return; }
                                        setEditingCivId(null);
                                        await loadReferentielsData();
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px]"
                                    >Enregistrer</button>
                                    <button onClick={() => setEditingCivId(null)} className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-[10px]">Annuler</button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 px-4 font-mono text-slate-400">{civ.id_civilite}</td>
                                <td className="py-2 px-4 font-semibold">{civ.libelle_civilite}</td>
                                <td className="py-2 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${civ.actif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                                    {civ.actif ? 'OUI' : 'NON'}
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-right">
                                  {currentUser.role !== 'ADHERENT' && (
                                    <button
                                      onClick={() => { setEditingCivId(civ.id_civilite); setCivEditForm({ libelle_civilite: civ.libelle_civilite, actif: civ.actif ?? true }); setCivError(null); }}
                                      className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-[10px] transition"
                                    >Modifier</button>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </section>

              {/* ── 2. SITUATIONS MATRIMONIALES ──────────────────────── */}
              <section className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800">2. Situations matrimoniales</h3>
                  {!showSitForm && currentUser.role !== 'ADHERENT' && (
                    <button
                      onClick={() => { setShowSitForm(true); setSitNewForm({ libelle_situation: '', actif: true }); setSitError(null); }}
                      className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter
                    </button>
                  )}
                </div>

                {sitError && <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">{sitError}</div>}

                {showSitForm && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setSitError(null);
                      if (!sitNewForm.libelle_situation.trim()) { setSitError('Le libellé est obligatoire.'); return; }
                      const { error } = await parametreService.createSituationMatrimoniale({ libelle_situation: sitNewForm.libelle_situation.trim(), actif: sitNewForm.actif });
                      if (error) { setSitError(error.message); return; }
                      setShowSitForm(false);
                      await loadReferentielsData();
                    }}
                    className="flex gap-2 items-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                  >
                    <input
                      type="text"
                      required
                      value={sitNewForm.libelle_situation}
                      onChange={(e) => setSitNewForm({ ...sitNewForm, libelle_situation: e.target.value })}
                      placeholder="Ex: Marié(e)"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <label className="flex items-center gap-1 text-slate-500 font-semibold">
                      <input type="checkbox" checked={sitNewForm.actif} onChange={(e) => setSitNewForm({ ...sitNewForm, actif: e.target.checked })} className="accent-emerald-600" />
                      Actif
                    </label>
                    <button type="submit" className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-500">Créer</button>
                    <button type="button" onClick={() => setShowSitForm(false)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
                  </form>
                )}

                {situations.length === 0 ? (
                  <div className="p-6 text-center bg-white rounded-xl border border-slate-100 text-slate-400 text-xs">
                    Aucune situation matrimoniale disponible.
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-100 bg-white overflow-hidden text-xs">
                    <div className="overflow-auto max-h-[350px]">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase font-bold text-xs">
                        <tr>
                          <th className="py-2 px-4">ID</th>
                          <th className="py-2 px-4">Libellé</th>
                          <th className="py-2 px-4 text-center">Actif</th>
                          <th className="py-2 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {situations.map((sit) => (
                          <tr key={sit.id_situation_matrimoniale} className="hover:bg-slate-50/50">
                            {editingSitId === sit.id_situation_matrimoniale ? (
                              <>
                                <td className="py-2 px-4 font-mono text-slate-400">{sit.id_situation_matrimoniale}</td>
                                <td className="py-2 px-4">
                                  <input
                                    type="text"
                                    value={sitEditForm.libelle_situation}
                                    onChange={(e) => setSitEditForm({ ...sitEditForm, libelle_situation: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                  />
                                </td>
                                <td className="py-2 px-4 text-center">
                                  <input type="checkbox" checked={sitEditForm.actif} onChange={(e) => setSitEditForm({ ...sitEditForm, actif: e.target.checked })} className="accent-emerald-600" />
                                </td>
                                <td className="py-2 px-4 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={async () => {
                                        setSitError(null);
                                        const { error } = await parametreService.updateSituationMatrimoniale(sit.id_situation_matrimoniale, sitEditForm);
                                        if (error) { setSitError(error.message); return; }
                                        setEditingSitId(null);
                                        await loadReferentielsData();
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px]"
                                    >Enregistrer</button>
                                    <button onClick={() => setEditingSitId(null)} className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-[10px]">Annuler</button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 px-4 font-mono text-slate-400">{sit.id_situation_matrimoniale}</td>
                                <td className="py-2 px-4 font-semibold">{sit.libelle_situation}</td>
                                <td className="py-2 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${sit.actif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                                    {sit.actif ? 'OUI' : 'NON'}
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-right">
                                  {currentUser.role !== 'ADHERENT' && (
                                    <button
                                      onClick={() => { setEditingSitId(sit.id_situation_matrimoniale); setSitEditForm({ libelle_situation: sit.libelle_situation, actif: sit.actif ?? true }); setSitError(null); }}
                                      className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-[10px] transition"
                                    >Modifier</button>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </section>

              {/* ── 3. EMPLOIS ───────────────────────────────────────── */}
              <section className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800">3. Emplois</h3>
                  {!showEmpForm && currentUser.role !== 'ADHERENT' && (
                    <button
                      onClick={() => { setShowEmpForm(true); setEmpNewForm({ libelle_emploi: '', actif: true }); setEmpError(null); }}
                      className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter
                    </button>
                  )}
                </div>

                {empError && <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">{empError}</div>}

                {showEmpForm && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setEmpError(null);
                      if (!empNewForm.libelle_emploi.trim()) { setEmpError('Le libellé est obligatoire.'); return; }
                      const { error } = await parametreService.createEmploi({ libelle_emploi: empNewForm.libelle_emploi.trim(), actif: empNewForm.actif });
                      if (error) { setEmpError(error.message); return; }
                      setShowEmpForm(false);
                      await loadReferentielsData();
                    }}
                    className="flex gap-2 items-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                  >
                    <input
                      type="text"
                      required
                      value={empNewForm.libelle_emploi}
                      onChange={(e) => setEmpNewForm({ ...empNewForm, libelle_emploi: e.target.value })}
                      placeholder="Ex: Inspecteur"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <label className="flex items-center gap-1 text-slate-500 font-semibold">
                      <input type="checkbox" checked={empNewForm.actif} onChange={(e) => setEmpNewForm({ ...empNewForm, actif: e.target.checked })} className="accent-emerald-600" />
                      Actif
                    </label>
                    <button type="submit" className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-500">Créer</button>
                    <button type="button" onClick={() => setShowEmpForm(false)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
                  </form>
                )}

                {emplois.length === 0 ? (
                  <div className="p-6 text-center bg-white rounded-xl border border-slate-100 text-slate-400 text-xs">
                    Aucun emploi disponible.
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-100 bg-white overflow-hidden text-xs">
                    <div className="overflow-auto max-h-[350px]">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase font-bold text-xs">
                        <tr>
                          <th className="py-2 px-4">ID</th>
                          <th className="py-2 px-4">Libellé</th>
                          <th className="py-2 px-4 text-center">Actif</th>
                          <th className="py-2 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {emplois.map((emp) => (
                          <tr key={emp.id_emploi} className="hover:bg-slate-50/50">
                            {editingEmpId === emp.id_emploi ? (
                              <>
                                <td className="py-2 px-4 font-mono text-slate-400">{emp.id_emploi}</td>
                                <td className="py-2 px-4">
                                  <input
                                    type="text"
                                    value={empEditForm.libelle_emploi}
                                    onChange={(e) => setEmpEditForm({ ...empEditForm, libelle_emploi: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                  />
                                </td>
                                <td className="py-2 px-4 text-center">
                                  <input type="checkbox" checked={empEditForm.actif} onChange={(e) => setEmpEditForm({ ...empEditForm, actif: e.target.checked })} className="accent-emerald-600" />
                                </td>
                                <td className="py-2 px-4 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={async () => {
                                        setEmpError(null);
                                        const { error } = await parametreService.updateEmploi(emp.id_emploi, empEditForm);
                                        if (error) { setEmpError(error.message); return; }
                                        setEditingEmpId(null);
                                        await loadReferentielsData();
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px]"
                                    >Enregistrer</button>
                                    <button onClick={() => setEditingEmpId(null)} className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-[10px]">Annuler</button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 px-4 font-mono text-slate-400">{emp.id_emploi}</td>
                                <td className="py-2 px-4 font-semibold">{emp.libelle_emploi}</td>
                                <td className="py-2 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${emp.actif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                                    {emp.actif ? 'OUI' : 'NON'}
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-right">
                                  {currentUser.role !== 'ADHERENT' && (
                                    <button
                                      onClick={() => { setEditingEmpId(emp.id_emploi); setEmpEditForm({ libelle_emploi: emp.libelle_emploi, actif: emp.actif ?? true }); setEmpError(null); }}
                                      className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-[10px] transition"
                                    >Modifier</button>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </section>

              {/* ── 4. LIENS BÉNÉFICIAIRES ───────────────────────────── */}
              <section className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800">4. Liens bénéficiaires</h3>
                  {!showLienForm && currentUser.role !== 'ADHERENT' && (
                    <button
                      onClick={() => { setShowLienForm(true); setLienNewForm({ libelle_lien: '', actif: true }); setLienError(null); }}
                      className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter
                    </button>
                  )}
                </div>

                {lienError && <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">{lienError}</div>}

                {showLienForm && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setLienError(null);
                      if (!lienNewForm.libelle_lien.trim()) { setLienError('Le libellé est obligatoire.'); return; }
                      const { error } = await parametreService.createLienBeneficiaire({ libelle_lien: lienNewForm.libelle_lien.trim(), actif: lienNewForm.actif });
                      if (error) { setLienError(error.message); return; }
                      setShowLienForm(false);
                      await loadReferentielsData();
                    }}
                    className="flex gap-2 items-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                  >
                    <input
                      type="text"
                      required
                      value={lienNewForm.libelle_lien}
                      onChange={(e) => setLienNewForm({ ...lienNewForm, libelle_lien: e.target.value })}
                      placeholder="Ex: Conjoint(e)"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <label className="flex items-center gap-1 text-slate-500 font-semibold">
                      <input type="checkbox" checked={lienNewForm.actif} onChange={(e) => setLienNewForm({ ...lienNewForm, actif: e.target.checked })} className="accent-emerald-600" />
                      Actif
                    </label>
                    <button type="submit" className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-500">Créer</button>
                    <button type="button" onClick={() => setShowLienForm(false)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
                  </form>
                )}

                {liens.length === 0 ? (
                  <div className="p-6 text-center bg-white rounded-xl border border-slate-100 text-slate-400 text-xs">
                    Aucun lien bénéficiaire disponible.
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-100 bg-white overflow-hidden text-xs">
                    <div className="overflow-auto max-h-[350px]">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase font-bold text-xs">
                        <tr>
                          <th className="py-2 px-4">ID</th>
                          <th className="py-2 px-4">Libellé</th>
                          <th className="py-2 px-4 text-center">Actif</th>
                          <th className="py-2 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {liens.map((lien) => (
                          <tr key={lien.id_lien_beneficiaire} className="hover:bg-slate-50/50">
                            {editingLienId === lien.id_lien_beneficiaire ? (
                              <>
                                <td className="py-2 px-4 font-mono text-slate-400">{lien.id_lien_beneficiaire}</td>
                                <td className="py-2 px-4">
                                  <input
                                    type="text"
                                    value={lienEditForm.libelle_lien}
                                    onChange={(e) => setLienEditForm({ ...lienEditForm, libelle_lien: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                  />
                                </td>
                                <td className="py-2 px-4 text-center">
                                  <input type="checkbox" checked={lienEditForm.actif} onChange={(e) => setLienEditForm({ ...lienEditForm, actif: e.target.checked })} className="accent-emerald-600" />
                                </td>
                                <td className="py-2 px-4 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={async () => {
                                        setLienError(null);
                                        const { error } = await parametreService.updateLienBeneficiaire(lien.id_lien_beneficiaire, lienEditForm);
                                        if (error) { setLienError(error.message); return; }
                                        setEditingLienId(null);
                                        await loadReferentielsData();
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px]"
                                    >Enregistrer</button>
                                    <button onClick={() => setEditingLienId(null)} className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-[10px]">Annuler</button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 px-4 font-mono text-slate-400">{lien.id_lien_beneficiaire}</td>
                                <td className="py-2 px-4 font-semibold">{lien.libelle_lien}</td>
                                <td className="py-2 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${lien.actif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                                    {lien.actif ? 'OUI' : 'NON'}
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-right">
                                  {currentUser.role !== 'ADHERENT' && (
                                    <button
                                      onClick={() => { setEditingLienId(lien.id_lien_beneficiaire); setLienEditForm({ libelle_lien: lien.libelle_lien, actif: lien.actif ?? true }); setLienError(null); }}
                                      className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-[10px] transition"
                                    >Modifier</button>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </section>

              {/* ── 5. FONCTIONS ─────────────────────────────────────── */}
              <section className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800">5. Fonctions</h3>
                  {!showFonctionForm && currentUser.role !== 'ADHERENT' && (
                    <button
                      onClick={() => { setShowFonctionForm(true); setFonctionNewForm({ libelle_fonction: '', actif: true }); setFonctionError(null); }}
                      className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter
                    </button>
                  )}
                </div>

                {fonctionError && <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">{fonctionError}</div>}

                {showFonctionForm && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setFonctionError(null);
                      if (!fonctionNewForm.libelle_fonction.trim()) { setFonctionError('Le libellé est obligatoire.'); return; }
                      const { error } = await parametreService.createFonction({ libelle_fonction: fonctionNewForm.libelle_fonction.trim(), actif: fonctionNewForm.actif });
                      if (error) { setFonctionError(error.message); return; }
                      setShowFonctionForm(false);
                      await loadReferentielsData();
                    }}
                    className="flex gap-2 items-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                  >
                    <input
                      type="text"
                      required
                      value={fonctionNewForm.libelle_fonction}
                      onChange={(e) => setFonctionNewForm({ ...fonctionNewForm, libelle_fonction: e.target.value })}
                      placeholder="Ex: Chef de service"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <label className="flex items-center gap-1 text-slate-500 font-semibold">
                      <input type="checkbox" checked={fonctionNewForm.actif} onChange={(e) => setFonctionNewForm({ ...fonctionNewForm, actif: e.target.checked })} className="accent-emerald-600" />
                      Actif
                    </label>
                    <button type="submit" className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-500">Créer</button>
                    <button type="button" onClick={() => setShowFonctionForm(false)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
                  </form>
                )}

                {fonctions.length === 0 ? (
                  <div className="p-6 text-center bg-white rounded-xl border border-slate-100 text-slate-400 text-xs">
                    Aucune fonction disponible.
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-100 bg-white overflow-hidden text-xs">
                    <div className="overflow-auto max-h-[350px]">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase font-bold text-xs">
                        <tr>
                          <th className="py-2 px-4">ID</th>
                          <th className="py-2 px-4">Libellé</th>
                          <th className="py-2 px-4 text-center">Actif</th>
                          <th className="py-2 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {fonctions.map((fn) => (
                          <tr key={fn.id_fonction} className="hover:bg-slate-50/50">
                            {editingFonctionId === fn.id_fonction ? (
                              <>
                                <td className="py-2 px-4 font-mono text-slate-400">{fn.id_fonction}</td>
                                <td className="py-2 px-4">
                                  <input
                                    type="text"
                                    value={fonctionEditForm.libelle_fonction}
                                    onChange={(e) => setFonctionEditForm({ ...fonctionEditForm, libelle_fonction: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                  />
                                </td>
                                <td className="py-2 px-4 text-center">
                                  <input type="checkbox" checked={fonctionEditForm.actif} onChange={(e) => setFonctionEditForm({ ...fonctionEditForm, actif: e.target.checked })} className="accent-emerald-600" />
                                </td>
                                <td className="py-2 px-4 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={async () => {
                                        setFonctionError(null);
                                        const { error } = await parametreService.updateFonction(fn.id_fonction, fonctionEditForm);
                                        if (error) { setFonctionError(error.message); return; }
                                        setEditingFonctionId(null);
                                        await loadReferentielsData();
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px]"
                                    >Enregistrer</button>
                                    <button onClick={() => setEditingFonctionId(null)} className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-[10px]">Annuler</button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 px-4 font-mono text-slate-400">{fn.id_fonction}</td>
                                <td className="py-2 px-4 font-semibold">{fn.libelle_fonction}</td>
                                <td className="py-2 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${fn.actif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                                    {fn.actif ? 'OUI' : 'NON'}
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-right">
                                  {currentUser.role !== 'ADHERENT' && (
                                    <button
                                      onClick={() => { setEditingFonctionId(fn.id_fonction); setFonctionEditForm({ libelle_fonction: fn.libelle_fonction, actif: fn.actif ?? true }); setFonctionError(null); }}
                                      className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-[10px] transition"
                                    >Modifier</button>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </section>

            </div>
          )}
        </div>
      )}

      {/* 4. MORTALITY CURVE TAB */}
      {activeSubTab === 'MORTALITE' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs rounded-xl flex gap-2">
            <HeartPulse className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold flex items-center gap-1">Table de Mortalité :</p>
              <p className="font-light text-emerald-855 mt-1 leading-relaxed">
                Représentation des coefficients d'invalidité et de probabilité de décès appliqués lors de la liquidation des rentes de retraite. La variable <span className="font-mono font-semibold">lx</span> représente le nombre de survivants théoriques à chaque âge, <span className="font-mono font-semibold">dx</span> le nombre de décès sur l'année, et <span className="font-mono font-semibold">qx</span> la probabilité actuarielle annuelle de décès.
              </p>
            </div>
          </div>

          {mortaliteError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
              {mortaliteError}
            </div>
          )}

          {!isLoadingMortalites && mortalites.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span className="text-xs text-slate-500 font-mono">
                {mortalites.length} ligne{mortalites.length !== 1 ? 's' : ''} chargée{mortalites.length !== 1 ? 's' : ''}
              </span>
              <input
                type="text"
                value={mortaliteSearch}
                onChange={(e) => setMortaliteSearch(e.target.value)}
                placeholder="Rechercher un âge…"
                className="w-full sm:w-52 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
              />
            </div>
          )}

          {isLoadingMortalites ? (
            <div className="text-center py-6"><RotateCw className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
          ) : mortalites.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 text-sm">
              Aucune donnée de mortalité disponible.
            </div>
          ) : (
            <ScrollableTableWrapper className="text-[11px]">
              <table className="min-w-full divide-y divide-slate-100 text-left text-slate-700" id="tbl-mortalite">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase font-bold text-xs">
                  <tr>
                    <th className="py-2.5 px-4 text-center">Âge (x)</th>
                    <th className="py-2.5 px-4 text-right">Nombre Vivants (lx)</th>
                    <th className="py-2.5 px-4 text-right">Nombre Décès attendus (dx)</th>
                    <th className="py-2.5 px-4 text-right">Taux de mortalité (qx)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(mortaliteSearch.trim()
                    ? mortalites.filter(m => String(m.age_mort).includes(mortaliteSearch.trim()))
                    : mortalites
                  ).map((m) => (
                    <tr key={m.age_mort} className="hover:bg-slate-50/40">
                      <td className="py-2 px-4 text-center font-bold text-slate-800 font-mono">{m.age_mort} ans</td>
                      <td className="py-2 px-4 text-right font-mono font-semibold">{Number(m.lx).toLocaleString('fr-FR')}</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-550">{Number(m.dx).toLocaleString('fr-FR')}</td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-indigo-700">{m.qx}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTableWrapper>
          )}
        </div>
      )}
    </div>
  );
}
