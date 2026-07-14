import React, { useState, useEffect, useRef } from 'react';
import { adherentService } from '../services/adherentService';
import { adherentCalculationService, MortalitePoint, CalculCotisationTrimestrielleResult } from '../services/adherentCalculationService';
import { parametreService } from '../services/parametreService';
import { parametresGenerauxService } from '../services/parametresGenerauxService';
import { Civilite, SituationMatrimoniale, Emploi, Grade, VAdherentComplet } from '../types';
import { Save, ArrowLeft, Loader2, User, FileText, AlertTriangle, Calculator, CheckCircle2, XCircle, Search } from 'lucide-react';
import { formatDateFr, toIsoDate } from '../utils/formatters';

// C1-E : Helpers de formatage locaux (aucune librairie externe)
function formatFCFA(n: number): string {
  if (isNaN(n) || !isFinite(n)) return '0 FCFA';
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

function formatPercent(n: number): string {
  if (isNaN(n) || !isFinite(n)) return '—';
  return `${parseFloat(n.toFixed(4))} %`;
}

function PreCalcRow({
  label, value, mono = false, highlight = false,
}: {
  label: string; value: string; mono?: boolean; highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-right truncate${mono ? ' font-mono' : ''}${highlight ? ' text-emerald-700' : ' text-slate-700'}`}>
        {value}
      </span>
    </div>
  );
}

interface AdherentFormProps {
  adherent: VAdherentComplet | null;
  onCancel: () => void;
  onSaveSuccess: () => void;
}

function isRetirementBeforeFirstPrecompte(dateRetraite?: string | null, datePrecompte?: string | null): boolean {
  const retraite = toIsoDate(dateRetraite);
  const precompte = toIsoDate(datePrecompte);
  return Boolean(retraite && precompte && retraite < precompte);
}

type StatutEsr = 'ACTIF' | 'INACTIF' | 'RETRAITE' | 'DECEDE';

function normalizeStatutEsr(
  value: unknown,
  flags?: Pick<VAdherentComplet, 'decede' | 'retraite'>,
): StatutEsr {
  if (flags?.decede) return 'DECEDE';
  if (flags?.retraite) return 'RETRAITE';
  if (value === true) return 'ACTIF';
  if (value === false) return 'INACTIF';

  const statut = String(value ?? '').trim().toUpperCase();
  if (statut === 'ACTIF' || statut === 'INACTIF' || statut === 'RETRAITE' || statut === 'DECEDE') {
    return statut;
  }
  return 'ACTIF';
}

export default function AdherentForm({ adherent, onCancel, onSaveSuccess }: AdherentFormProps) {
  const [civilites, setCivilites] = useState<Civilite[]>([]);
  const [situations, setSituations] = useState<SituationMatrimoniale[]>([]);
  const [emplois, setEmplois] = useState<Emploi[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [refLoadError, setRefLoadError] = useState<string | null>(null);

  // C1-D : États paramètres actuariels
  const [mortaliteData, setMortaliteData] = useState<MortalitePoint[]>([]);
  const [parametresCalcul, setParametresCalcul] = useState<{
    tauxAnnuel: number;
    fraisRente: number;
    ageMax: number;
  } | null>(null);
  const [calculParamsError, setCalculParamsError] = useState<string | null>(null);
  const [calculDetails, setCalculDetails] = useState<CalculCotisationTrimestrielleResult | null>(null);

  type AgentSearchStatus = 'idle' | 'searching' | 'found' | 'not_found' | 'error';
  const [isSearchingAgent, setIsSearchingAgent] = useState(false);
  const [agentSearchStatus, setAgentSearchStatus] = useState<AgentSearchStatus>('idle');
  const [agentSearchMessage, setAgentSearchMessage] = useState('');
  const lastSearchedMatricule = useRef<string>('');

  const [formData, setFormData] = useState(() => {
    const todayISO = new Date().toISOString().split('T')[0];
    const initPrecompte = adherentCalculationService.calculateDatePremierPrecompte(todayISO);
    const initDateEffet = initPrecompte
      ? adherentCalculationService.calculateDateEffet(initPrecompte)
      : '';
    return {
      date_souscription: todayISO,
      matricule: '',
      civilite: '',
      nom: '',
      prenoms: '',
      date_naissance: '',
      situation_matrimoniale: '',
      telephone: '',
      email: '',
      emploi: '',
      statut: 'ACTIF',
      grade_id: '',
      grade: '',
      date_effet: initDateEffet,
      date_retraite: '',
      age_retraite: 60,
      cotisation_annuelle: 0,
      date_precompte: initPrecompte,
      nb_trimestre: 0,
      cotisation_es: 0,
    };
  });

  useEffect(() => {
    async function loadAuxData() {
      const [civRes, sitRes, empRes, grdList] = await Promise.all([
        adherentService.getCivilites(),
        adherentService.getSituationsMatrimoniales(),
        adherentService.getEmplois(),
        adherentService.getGrades(),
      ]);

      const errors: string[] = [];
      if (civRes.error) errors.push(`Civilités : ${civRes.error.message}`);
      if (sitRes.error) errors.push(`Situations matrimoniales : ${sitRes.error.message}`);
      if (empRes.error) errors.push(`Emplois : ${empRes.error.message}`);

      if (errors.length > 0) {
        setRefLoadError(errors.join(' | '));
      }

      const civList = civRes.data;
      const sitList = sitRes.data;
      const empList = empRes.data;

      setCivilites(civList);
      setSituations(sitList);
      setEmplois(empList);
      setGrades(grdList || []);

      if (adherent) {
        setFormData({
          date_souscription: adherent.date_souscription || '',
          matricule: adherent.matricule || '',
          civilite: adherent.civilite || '',
          nom: adherent.nom || '',
          prenoms: adherent.prenoms || '',
          date_naissance: adherent.date_naissance || '',
          situation_matrimoniale: adherent.situation_matrimoniale || '',
          telephone: adherent.telephone || '',
          email: adherent.email || '',
          emploi: adherent.emploi || '',
          statut: normalizeStatutEsr(adherent.statut, adherent),
          grade_id: adherent.grade_id || '',
          grade: adherent.grade_libelle || '',
          date_effet: adherent.date_effet || '',
          date_retraite: adherent.date_retraite || '',
          age_retraite: adherent.age_retraite || 60,
          cotisation_annuelle: adherent.cotisation_annuelle || 0,
          date_precompte: adherent.date_precompte || '',
          nb_trimestre: adherent.nb_trimestre || 0,
          cotisation_es: adherent.cotisation_es || 0,
        });
      } else {
        setFormData(prev => ({
          ...prev,
          matricule: '',
          civilite: civList[0]?.libelle_civilite || '',
          situation_matrimoniale: sitList[0]?.libelle_situation || '',
          emploi: empList[0]?.libelle_emploi || '',
        }));
      }
    }
    loadAuxData();
  }, [adherent]);

  // C1-D : Chargement mortalité + paramètres actuariels depuis Supabase
  useEffect(() => {
    async function loadCalculParams() {
      setCalculParamsError(null);
      try {
        const [mortRes, paramsRes] = await Promise.all([
          parametreService.getMortalite(),
          parametresGenerauxService.getParametresGeneraux(),
        ]);

        const errs: string[] = [];
        if (mortRes.error) errs.push(`Mortalité : ${mortRes.error.message}`);
        if (paramsRes.error) errs.push(`Paramètres généraux : ${paramsRes.error.message}`);
        if (errs.length > 0) {
          setCalculParamsError(errs.join(' | '));
          return;
        }

        const paramList = paramsRes.data;
        const findVal = (code: string) => paramList.find(p => p.code === code)?.valeur ?? null;

        const tauxGarStr = findVal('TAUX_GAR');
        const fraisRenteStr = findVal('FRAIS_RENTE');
        const ageMaxStr = findVal('AGE_MAX');

        const missing: string[] = [];
        if (!tauxGarStr) missing.push('TAUX_GAR');
        if (!fraisRenteStr) missing.push('FRAIS_RENTE');
        if (!ageMaxStr) missing.push('AGE_MAX');
        if (missing.length > 0) {
          setCalculParamsError(`Paramètres de calcul manquants : ${missing.join(', ')}`);
          return;
        }

        const tauxAnnuel = parseFloat(tauxGarStr!) / 100;
        const fraisRente = parseFloat(fraisRenteStr!) / 100;
        const ageMax = parseInt(ageMaxStr!, 10);

        if (isNaN(tauxAnnuel) || isNaN(fraisRente) || isNaN(ageMax)) {
          setCalculParamsError('Paramètres généraux invalides (conversion numérique échouée).');
          return;
        }

        setMortaliteData(mortRes.data);
        setParametresCalcul({ tauxAnnuel, fraisRente, ageMax });
      } catch (e: any) {
        setCalculParamsError(`Erreur chargement paramètres actuariels : ${e.message}`);
      }
    }
    loadCalculParams();
  }, []);

  // C1-D : Recalcul cotisation_es dès que les paramètres actuariels sont disponibles
  useEffect(() => {
    if (!parametresCalcul || mortaliteData.length === 0) return;
    setFormData(prev => {
      if (prev.cotisation_annuelle <= 0 || prev.nb_trimestre <= 0) return prev;
      const result = adherentCalculationService.calculateCotisationTrimestrielleSimple({
        cotisationAnnuelle: prev.cotisation_annuelle,
        pctPriseEnCharge: 1,
        ageRetraite: prev.age_retraite,
        nbTrimestres: prev.nb_trimestre,
        tauxAnnuel: parametresCalcul.tauxAnnuel,
        fraisRente: parametresCalcul.fraisRente,
        ageMax: parametresCalcul.ageMax,
        mortalite: mortaliteData,
        pasArrondi: 100,
      });
      if ((import.meta as any).env?.DEV) {
        console.info('[COTISATION_ESR] recalc on params load — result', result);
      }
      if (result.status !== 'OK') return prev;
      return { ...prev, cotisation_es: result.cotisationTrimestrielle };
    });
  }, [parametresCalcul, mortaliteData]);

  // C1-E : Calcul complet pour le résumé pré-calcul — stocke tous les détails actuariels
  useEffect(() => {
    if (!parametresCalcul || mortaliteData.length === 0 || formData.cotisation_annuelle <= 0 || formData.nb_trimestre <= 0) {
      setCalculDetails(null);
      return;
    }
    const result = adherentCalculationService.calculateCotisationTrimestrielleSimple({
      cotisationAnnuelle: formData.cotisation_annuelle,
      pctPriseEnCharge: 1,
      ageRetraite: formData.age_retraite,
      nbTrimestres: formData.nb_trimestre,
      tauxAnnuel: parametresCalcul.tauxAnnuel,
      fraisRente: parametresCalcul.fraisRente,
      ageMax: parametresCalcul.ageMax,
      mortalite: mortaliteData,
      pasArrondi: 100,
    });
    setCalculDetails(result);
  }, [formData.cotisation_annuelle, formData.age_retraite, formData.nb_trimestre, parametresCalcul, mortaliteData]);

  // Recalcule toutes les dates ESR à partir des trois champs déclencheurs.
  // WebDev C1-B : DatePremierPrecompte → DateEffet → DateRetraite_31Dec → NbTrimestresEntreDates
  const recalculateDates = (data: {
    date_souscription: string;
    date_naissance: string;
    age_retraite: number;
  }) => {
    const date_precompte = adherentCalculationService.calculateDatePremierPrecompte(data.date_souscription);
    const date_effet = date_precompte
      ? adherentCalculationService.calculateDateEffet(date_precompte)
      : '';
    let date_retraite = '';
    let nb_trimestre = 0;
    if (data.date_naissance && data.age_retraite > 0) {
      date_retraite = adherentCalculationService.calculateDateRetraite(
        data.date_naissance,
        data.age_retraite
      );
    }
    if (date_precompte && date_retraite) {
      nb_trimestre = adherentCalculationService.calculateNbTrimestre(date_precompte, date_retraite);
    }
    return { date_precompte, date_effet, date_retraite, nb_trimestre };
  };

  // C1-D : Calcul actuariel pur — WebDev CalculCotisationTrimestrielle_Simple
  // Aucune valeur inventée : toutes les données viennent de Supabase.
  const computeCotisationEs = (
    data: { cotisation_annuelle: number; age_retraite: number; nb_trimestre: number },
    params: { tauxAnnuel: number; fraisRente: number; ageMax: number } | null,
    mort: MortalitePoint[]
  ): number => {
    if (!params || mort.length === 0 || data.cotisation_annuelle <= 0 || data.nb_trimestre <= 0) return 0;
    const result = adherentCalculationService.calculateCotisationTrimestrielleSimple({
      cotisationAnnuelle: data.cotisation_annuelle,
      pctPriseEnCharge: 1,
      ageRetraite: data.age_retraite,
      nbTrimestres: data.nb_trimestre,
      tauxAnnuel: params.tauxAnnuel,
      fraisRente: params.fraisRente,
      ageMax: params.ageMax,
      mortalite: mort,
      pasArrondi: 100,
    });
    if ((import.meta as any).env?.DEV) {
      console.info('[COTISATION_ESR] params', { ...data, ...params, mortaliteRows: mort.length });
      console.info('[COTISATION_ESR] result', result);
    }
    return result.status === 'OK' ? result.cotisationTrimestrielle : 0;
  };

  const handleGradeChange = (gradeId: string) => {
    const selectedGrade = grades.find(g => String(g.id_grade) === gradeId);
    if (!selectedGrade) return;

    const newAgeRetraite = selectedGrade.age_retraite || 60;
    const newCotisationAnnuelle = selectedGrade.cotisation_annuelle || 0;

    setFormData(prev => {
      const dates = recalculateDates({
        date_souscription: prev.date_souscription,
        date_naissance: prev.date_naissance,
        age_retraite: newAgeRetraite,
      });
      const cotisation_es = computeCotisationEs(
        { cotisation_annuelle: newCotisationAnnuelle, age_retraite: newAgeRetraite, nb_trimestre: dates.nb_trimestre },
        parametresCalcul,
        mortaliteData
      );
      return {
        ...prev,
        grade_id: gradeId,
        grade: selectedGrade.libelle_grade,
        age_retraite: newAgeRetraite,
        cotisation_annuelle: newCotisationAnnuelle,
        cotisation_es,
        ...dates,
      };
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'date_souscription' || name === 'date_naissance') {
        const dates = recalculateDates({
          date_souscription: updated.date_souscription,
          date_naissance: updated.date_naissance,
          age_retraite: updated.age_retraite,
        });
        const merged = { ...updated, ...dates };
        return {
          ...merged,
          cotisation_es: computeCotisationEs(
            { cotisation_annuelle: merged.cotisation_annuelle, age_retraite: merged.age_retraite, nb_trimestre: dates.nb_trimestre },
            parametresCalcul,
            mortaliteData
          ),
        };
      }
      return updated;
    });
  };

  const handleCustomNumberChange = (name: string, val: number) => {
    setFormData(prev => {
      const updated = { ...prev, [name]: val };
      if (name === 'age_retraite') {
        const dates = recalculateDates({
          date_souscription: updated.date_souscription,
          date_naissance: updated.date_naissance,
          age_retraite: val,
        });
        const merged = { ...updated, ...dates };
        return {
          ...merged,
          cotisation_es: computeCotisationEs(
            { cotisation_annuelle: merged.cotisation_annuelle, age_retraite: val, nb_trimestre: dates.nb_trimestre },
            parametresCalcul,
            mortaliteData
          ),
        };
      }
      if (name === 'cotisation_annuelle') {
        return {
          ...updated,
          cotisation_es: computeCotisationEs(
            { cotisation_annuelle: val, age_retraite: updated.age_retraite, nb_trimestre: updated.nb_trimestre },
            parametresCalcul,
            mortaliteData
          ),
        };
      }
      return updated;
    });
  };

  const handleSearchAgent = async (matriculeOverride?: string) => {
    const mat = (matriculeOverride !== undefined ? matriculeOverride : formData.matricule).trim().toUpperCase();
    if (!mat) return;

    lastSearchedMatricule.current = mat;
    setIsSearchingAgent(true);
    setAgentSearchStatus('searching');
    setAgentSearchMessage('Recherche en cours…');

    const { data: agentData, error } = await adherentService.searchAgentByMatricule(mat);
    setIsSearchingAgent(false);

    if (error) {
      setAgentSearchStatus('error');
      setAgentSearchMessage(error);
      return;
    }

    if (!agentData) {
      setAgentSearchStatus('not_found');
      setAgentSearchMessage('Aucun agent trouvé pour ce matricule.');
      return;
    }

    const normalizeOption = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[.\s_-]+/g, '')
        .toLowerCase();

    const pickExistingOption = (value: string | null | undefined, options: string[], fallback: string) => {
      if (!value) return fallback;
      const normalized = normalizeOption(value);
      const alias =
        ['m', 'mr', 'monsieur', 'h', 'homme', 'masculin'].includes(normalized)
          ? 'monsieur'
          : ['f', 'femme', 'feminin', 'mme', 'madame'].includes(normalized)
          ? 'madame'
          : ['mlle', 'mademoiselle'].includes(normalized)
          ? 'mademoiselle'
          : normalized;
      return options.find((option) => normalizeOption(option) === alias) ?? fallback;
    };

    setFormData(prev => {
      const ageRetraite = prev.age_retraite;
      const cotisationAnnuelle = prev.cotisation_annuelle;
      const newDateNaissance = agentData.date_naissance ?? prev.date_naissance;
      const dates = recalculateDates({
        date_souscription: prev.date_souscription,
        date_naissance: newDateNaissance,
        age_retraite: ageRetraite,
      });
      const cotisation_es = computeCotisationEs(
        { cotisation_annuelle: cotisationAnnuelle, age_retraite: ageRetraite, nb_trimestre: dates.nb_trimestre },
        parametresCalcul,
        mortaliteData,
      );
      return {
        ...prev,
        matricule: agentData.matricule,
        nom: agentData.nom,
        prenoms: agentData.prenoms,
        date_naissance: newDateNaissance,
        telephone: agentData.telephone || prev.telephone,
        email: agentData.email || prev.email,
        emploi: pickExistingOption(agentData.emploi, emplois.map((e) => e.libelle_emploi), prev.emploi),
        civilite: pickExistingOption(agentData.civilite, civilites.map((c) => c.libelle_civilite), prev.civilite),
        situation_matrimoniale: pickExistingOption(
          agentData.situation_matrimoniale,
          situations.map((s) => s.libelle_situation),
          prev.situation_matrimoniale,
        ),
        grade_id: prev.grade_id,
        grade: prev.grade,
        age_retraite: ageRetraite,
        cotisation_annuelle: cotisationAnnuelle,
        ...dates,
        cotisation_es,
      };
    });

    setAgentSearchStatus('found');
    setAgentSearchMessage(
      `Agent trouvé (${agentData.source}) — informations préchargées, grade à sélectionner.`,
    );
  };

  const handleMatriculeBlur = () => {
    const mat = formData.matricule.trim().toUpperCase();
    if (!mat || mat === lastSearchedMatricule.current) return;
    handleSearchAgent(mat);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      // Validation des référentiels obligatoires
      if (!formData.civilite) {
        setFormError('La liste des civilités est vide ou non chargée. Veuillez initialiser les référentiels.');
        setIsSubmitting(false);
        return;
      }
      if (!formData.situation_matrimoniale) {
        setFormError('La liste des situations matrimoniales est vide ou non chargée. Veuillez initialiser les référentiels.');
        setIsSubmitting(false);
        return;
      }
      if (!formData.emploi) {
        setFormError('La liste des emplois est vide ou non chargée. Veuillez initialiser les référentiels.');
        setIsSubmitting(false);
        return;
      }

      if (!formData.date_precompte) {
        setFormError('La date de premier précompte est manquante. Vérifiez la date d\'adhésion.');
        setIsSubmitting(false);
        return;
      }
      if (!formData.date_effet) {
        setFormError('La date d\'effet du contrat n\'a pu être calculée. Vérifiez la date d\'adhésion.');
        setIsSubmitting(false);
        return;
      }
      if (isRetirementBeforeFirstPrecompte(formData.date_retraite, formData.date_precompte)) {
        setFormError('La date de retraite est anterieure au premier precompte. Verifiez la date de naissance ou le grade.');
        setIsSubmitting(false);
        return;
      }
      if (formData.nb_trimestre <= 0) {
        setFormError('Le nombre de trimestres est invalide (0). Vérifiez la date de naissance et l\'âge de retraite.');
        setIsSubmitting(false);
        return;
      }

      // C1-E : Vérification statut pré-calcul actuariel
      if (calculDetails && calculDetails.status !== 'OK') {
        setFormError("Le pré-calcul ESR n'est pas valide. Vérifiez les paramètres, la mortalité, le grade et les dates.");
        setIsSubmitting(false);
        return;
      }

      // C1-D : Validation cotisation ESR actuarielle
      if (formData.cotisation_es <= 0) {
        setFormError("La cotisation ESR n'a pas pu être calculée. Vérifiez le grade, la date de naissance, la date d'adhésion, la mortalité et les paramètres généraux.");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        ...formData,
        statut: normalizeStatutEsr(formData.statut),
      };

      if (adherent) {
        const { error } = await adherentService.updateAdherent(adherent.id, payload);
        if (error) throw error;
      } else {
        if (!formData.grade_id) {
          setFormError('Le grade professionnel est obligatoire pour créer un adhérent.');
          setIsSubmitting(false);
          return;
        }
        const { error } = await adherentService.saveAdherent(payload);
        if (error) throw error;
      }
      onSaveSuccess();
    } catch (e: any) {
      console.error('Erreur lors de l enregistrement:', e);
      setFormError(e.message || "Impossible de sauvegarder l'adhérent. Vérifiez la connexion ou les permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-md p-6 max-w-5xl mx-auto" id="adherent-form-container">
      <div className="flex justify-between items-center pb-5 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-3">
          <button
            id="btn-back-to-list"
            onClick={onCancel}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-xl font-bold text-slate-800">
              {adherent ? 'Modifier l\'adhérent' : 'Inscrire un nouvel adhérent'}
            </h3>
            <p className="text-sm text-slate-500">
              {adherent
                ? `Édition des informations de ${adherent.prenoms} ${adherent.nom}`
                : 'Ajout d\'un nouveau membre de la DGI'}
            </p>
          </div>
        </div>
      </div>

      {refLoadError && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Référentiels non disponibles : </span>{refLoadError}
            <br />Veuillez initialiser les référentiels administratifs avant de continuer.
          </div>
        </div>
      )}

      {calculParamsError && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Paramètres actuariels non disponibles : </span>{calculParamsError}
            <br />Le calcul de la cotisation ESR est impossible sans mortalité et paramètres généraux valides.
          </div>
        </div>
      )}

      {formError && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
          {formError}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* BLOC IDENTITÉ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-dotted border-slate-200 pb-2">
            <User className="w-4 h-4 text-emerald-600" />
            <h4 className="text-base font-semibold uppercase tracking-wider text-slate-700">Bloc Identité de l'Adhérent</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">Date d'adhésion</label>
              <input
                type="date"
                name="date_souscription"
                required
                value={formData.date_souscription}
                onChange={handleChange}
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">Matricule DGI / MADGI</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  name="matricule"
                  required
                  value={formData.matricule}
                  onChange={handleChange}
                  onBlur={!adherent ? handleMatriculeBlur : undefined}
                  placeholder="Ex: M80321"
                  className="block min-w-0 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-semibold font-mono"
                />
                {!adherent && (
                  <button
                    type="button"
                    onClick={() => handleSearchAgent()}
                    disabled={isSearchingAgent || !formData.matricule.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 text-xs font-semibold transition disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    {isSearchingAgent
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Search className="w-3.5 h-3.5" />}
                    Rechercher
                  </button>
                )}
              </div>
              {!adherent && agentSearchMessage && (
                <p className={`mt-1.5 text-xs font-medium flex items-center gap-1 ${
                  agentSearchStatus === 'found' ? 'text-emerald-700'
                  : agentSearchStatus === 'not_found' ? 'text-amber-600'
                  : agentSearchStatus === 'error' ? 'text-rose-600'
                  : 'text-slate-500'
                }`}>
                  {agentSearchStatus === 'found' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                  {agentSearchStatus === 'not_found' && <AlertTriangle className="w-3 h-3 shrink-0" />}
                  {agentSearchStatus === 'error' && <XCircle className="w-3 h-3 shrink-0" />}
                  {agentSearchStatus === 'searching' && <Loader2 className="w-3 h-3 shrink-0 animate-spin" />}
                  {agentSearchMessage}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">Civilité</label>
              <select
                name="civilite"
                value={formData.civilite}
                onChange={handleChange}
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
              >
                {civilites.length === 0 && (
                  <option value="">— Référentiel vide —</option>
                )}
                {civilites.map(c => (
                  <option key={c.id_civilite} value={c.libelle_civilite}>
                    {c.libelle_civilite}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">Nom de famille</label>
              <input
                type="text"
                name="nom"
                required
                value={formData.nom}
                onChange={handleChange}
                placeholder="Ex: KONE"
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">Prénoms</label>
              <input
                type="text"
                name="prenoms"
                required
                value={formData.prenoms}
                onChange={handleChange}
                placeholder="Ex: Amadou Bakary"
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">Date de naissance</label>
              <input
                type="date"
                name="date_naissance"
                required
                value={formData.date_naissance}
                onChange={handleChange}
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">Situation matrimoniale</label>
              <select
                name="situation_matrimoniale"
                value={formData.situation_matrimoniale}
                onChange={handleChange}
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
              >
                {situations.length === 0 && (
                  <option value="">— Référentiel vide —</option>
                )}
                {situations.map(s => (
                  <option key={s.id_situation_matrimoniale} value={s.libelle_situation}>
                    {s.libelle_situation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">Téléphone</label>
              <input
                type="text"
                name="telephone"
                required
                value={formData.telephone}
                onChange={handleChange}
                placeholder="Ex: +225 07 08 09 10 11"
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">Adresse Email</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="Ex: agent.dgi@madgi.ci"
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">Emploi / Direction</label>
              <select
                name="emploi"
                value={formData.emploi}
                onChange={handleChange}
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
              >
                {emplois.length === 0 && (
                  <option value="">— Référentiel vide —</option>
                )}
                {emplois.map(e => (
                  <option key={e.id_emploi} value={e.libelle_emploi}>
                    {e.libelle_emploi}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">Statut ESR</label>
              <select
                name="statut"
                value={formData.statut}
                onChange={handleChange}
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
              >
                <option value="ACTIF">ACTIF</option>
                <option value="INACTIF">INACTIF</option>
                <option value="RETRAITE">RETRAITE</option>
                <option value="DECEDE">DECEDE</option>
              </select>
            </div>
          </div>
        </div>

        {/* BLOC CONTRAT ESR */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 border-b border-dotted border-slate-200 pb-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <h4 className="text-base font-semibold uppercase tracking-wider text-slate-700">Bloc Contrat Épargne Santé Retraite (ESR)</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80">
            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">Grade Professionnel</label>
              <select
                name="grade_id"
                required
                value={formData.grade_id}
                onChange={(e) => handleGradeChange(e.target.value)}
                className="mt-1 block w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
              >
                <option value="">-- Sélectionner un grade --</option>
                {grades.map(g => (
                  <option key={g.id_grade} value={String(g.id_grade)}>
                    {g.libelle_grade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">
                Date d'effet du contrat{' '}
                <span className="text-emerald-600 normal-case font-normal">(auto)</span>
              </label>
              <input
                type="date"
                name="date_effet"
                disabled
                value={formData.date_effet}
                className="mt-1 block w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-600 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">Âge de retraite (Ans)</label>
              <input
                type="number"
                name="age_retraite"
                required
                value={formData.age_retraite}
                onChange={(e) => handleCustomNumberChange('age_retraite', parseInt(e.target.value) || 0)}
                className="mt-1 block w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-semibold font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">Date estimée de retraite</label>
              <input
                type="date"
                name="date_retraite"
                required
                disabled
                value={formData.date_retraite}
                className="mt-1 block w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-600 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">Cotisation Annuelle Globale (FCFA)</label>
              <input
                type="number"
                name="cotisation_annuelle"
                required
                value={formData.cotisation_annuelle}
                onChange={(e) => handleCustomNumberChange('cotisation_annuelle', parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-bold font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">
                Date de premier précompte{' '}
                <span className="text-emerald-600 normal-case font-normal">(auto)</span>
              </label>
              <input
                type="date"
                name="date_precompte"
                disabled
                value={formData.date_precompte}
                className="mt-1 block w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-600 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">Nombre de trimestres potentiels</label>
              <input
                type="number"
                name="nb_trimestre"
                disabled
                value={formData.nb_trimestre}
                className="mt-1 block w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 font-bold font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase">
                Cotisation Épargne Santé-Retraite calculée{' '}
                <span className="text-emerald-600 normal-case font-normal">(auto)</span>
              </label>
              <input
                type="number"
                name="cotisation_es"
                disabled
                value={formData.cotisation_es}
                className="mt-1 block w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-emerald-700 font-bold font-mono cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-slate-500">
                Calcul actuariel : taux garanti, frais de rente, mortalité et durée résiduelle.
              </p>
            </div>

            <div className="flex items-center justify-center p-3 bg-emerald-50/50 rounded-xl border border-dotted border-emerald-200 text-sm text-emerald-800">
              Cotisation Retraite Complémentaire : {((formData.cotisation_annuelle - formData.cotisation_es) || 0).toLocaleString('fr-FR')} FCFA / an
            </div>
          </div>
        </div>

        {/* BLOC RÉSUMÉ PRÉ-CALCUL ESR — C1-E */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between border-b border-dotted border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-600" />
              <h4 className="text-base font-semibold uppercase tracking-wider text-slate-700">Résumé du pré-calcul ESR</h4>
            </div>
            {calculDetails ? (
              calculDetails.status === 'OK' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Calcul OK
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                  <XCircle className="w-3.5 h-3.5" /> {calculDetails.status}
                </span>
              )
            ) : !parametresCalcul && !calculParamsError ? (
              <span className="text-xs text-slate-400 italic flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Chargement…
              </span>
            ) : !formData.grade_id ? (
              <span className="text-xs text-slate-400 italic">Sélectionnez un grade</span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" /> Saisie incomplète
              </span>
            )}
          </div>

          {!parametresCalcul && !calculParamsError && (
            <div className="flex items-center gap-2 py-2 text-xs text-slate-500 italic">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              Chargement des paramètres de calcul…
            </div>
          )}

          {parametresCalcul && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Données contrat</p>
                <PreCalcRow label="Grade" value={grades.find(g => String(g.id_grade) === formData.grade_id)?.libelle_grade ?? '—'} />
                <PreCalcRow label="Âge retraite" value={formData.age_retraite > 0 ? `${formData.age_retraite} ans` : '—'} />
                <PreCalcRow label="Cotisation annuelle" value={formData.cotisation_annuelle > 0 ? formatFCFA(formData.cotisation_annuelle) : '—'} />
                <PreCalcRow label="1er précompte" value={formatDateFr(formData.date_precompte)} mono />
                <PreCalcRow label="Date effet" value={formatDateFr(formData.date_effet)} mono />
                <PreCalcRow label="Date retraite" value={formatDateFr(formData.date_retraite)} mono />
                <PreCalcRow label="Trimestres" value={formData.nb_trimestre > 0 ? `${formData.nb_trimestre} T` : '—'} />
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Paramètres techniques</p>
                <PreCalcRow label="Taux garanti" value={formatPercent(parametresCalcul.tauxAnnuel * 100)} />
                <PreCalcRow label="Frais rente" value={formatPercent(parametresCalcul.fraisRente * 100)} />
                <PreCalcRow label="Âge max mortalité" value={`${parametresCalcul.ageMax} ans`} />
                <PreCalcRow label="Table mortalité" value={mortaliteData.length > 0 ? `${mortaliteData.length} points chargés` : 'Non chargée'} />
              </div>

              <div className={`rounded-xl border p-4 space-y-2 ${calculDetails?.status === 'OK' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Résultat calculé</p>
                <PreCalcRow label="Cotisation ESR / trim." value={formData.cotisation_es > 0 ? formatFCFA(formData.cotisation_es) : '—'} highlight />
                <PreCalcRow label="Capital constitutif K" value={calculDetails ? formatFCFA(calculDetails.capitalConstitutif) : '—'} />
                <PreCalcRow label="Facteur de rente a_y" value={calculDetails ? calculDetails.facteurRente.toFixed(6) : '—'} mono />
                <PreCalcRow label="Taux trimestriel ip" value={calculDetails ? formatPercent(calculDetails.tauxTrimestriel * 100) : '—'} />
                <PreCalcRow label="Lx à l'âge retraite" value={calculDetails ? calculDetails.lxRetraite.toLocaleString('fr-FR') : '—'} />
                <PreCalcRow label="Statut" value={calculDetails?.status ?? '—'} />
              </div>
            </div>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            id="btn-cancel-form"
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-semibold transition"
          >
            Annuler
          </button>
          <button
            id="btn-save-submit"
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 text-sm font-semibold transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Enregistrer l'adhérent
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
