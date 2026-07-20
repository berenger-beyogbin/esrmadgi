import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardList, Loader2, Search, ShieldCheck } from 'lucide-react';
import HeaderBanner from '../components/HeaderBanner';
import { adherentCalculationService, MortalitePoint } from '../services/adherentCalculationService';
import { onlineAdhesionService } from '../services/onlineAdhesionService';
import { ExternalAgentInfo, Grade, OnlineAdhesionPayload, OnlineAdhesionReferentiels } from '../types';
import { formatDateFr, formatFCFA, toIsoDate } from '../utils/formatters';

interface OnlineAdhesionProps {
  onBackToLogin: () => void;
}

type Step = 'LOOKUP' | 'FORM' | 'SUCCESS';

const todayISO = () => new Date().toISOString().split('T')[0];
const fieldClass =
  'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2b529f] focus:border-[#2b529f]';

function normalizeOption(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.\s_-]+/g, '')
    .toLowerCase();
}

function pickExistingOption(value: string | null | undefined, options: string[], fallback = ''): string {
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
}

function isRetirementBeforeFirstPrecompte(dateRetraite?: string | null, datePrecompte?: string | null): boolean {
  const retraite = toIsoDate(dateRetraite);
  const precompte = toIsoDate(datePrecompte);
  return Boolean(retraite && precompte && retraite < precompte);
}

function initialPayload(): OnlineAdhesionPayload {
  const dateSouscription = todayISO();
  const datePrecompte = adherentCalculationService.resolveDatePremierPrecompteChoisie(dateSouscription);
  const dateEffet = datePrecompte ? adherentCalculationService.calculateDateEffet(datePrecompte) : '';

  return {
    date_souscription: dateSouscription,
    matricule: '',
    civilite: '',
    sexe: null,
    nom: '',
    prenoms: '',
    date_naissance: '',
    situation_matrimoniale: '',
    telephone: '',
    email: '',
    emploi: '',
    grade_id: '',
    grade: '',
    date_effet: dateEffet,
    date_retraite: '',
    age_retraite: 60,
    cotisation_annuelle: 0,
    date_precompte: datePrecompte,
    nb_trimestre: 0,
    cotisation_es: 0,
  };
}

export default function OnlineAdhesion({ onBackToLogin }: OnlineAdhesionProps) {
  const [step, setStep] = useState<Step>('LOOKUP');
  const [matricule, setMatricule] = useState('');
  const [lookupDateNaissance, setLookupDateNaissance] = useState('');
  const [refs, setRefs] = useState<OnlineAdhesionReferentiels | null>(null);
  const [formData, setFormData] = useState<OnlineAdhesionPayload>(() => initialPayload());
  const [isLoadingRefs, setIsLoadingRefs] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMatricule, setSuccessMatricule] = useState('');
  const [pendingAgent, setPendingAgent] = useState<ExternalAgentInfo | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadRefs() {
      setIsLoadingRefs(true);
      const { data, error } = await onlineAdhesionService.getReferentiels();
      if (!mounted) return;
      if (error || !data) {
        setErrorMsg(error?.message || 'Impossible de charger les referentiels.');
      } else {
        setRefs(data);
        setFormData((prev) => ({
          ...prev,
          civilite: data.civilites[0]?.libelle_civilite || '',
          situation_matrimoniale: data.situations_matrimoniales[0]?.libelle_situation || '',
        }));
      }
      setIsLoadingRefs(false);
    }
    loadRefs();
    return () => {
      mounted = false;
    };
  }, []);

  const gradeOptions = refs?.grades ?? [];
  const civiliteOptions = useMemo(() => refs?.civilites.map((c) => c.libelle_civilite) ?? [], [refs]);
  const precompteOptions = useMemo(
    () => adherentCalculationService.getPremierPrecompteTrimestreOptions(formData.date_souscription, true),
    [formData.date_souscription],
  );
  const lookupDisabled = isSearching || !matricule.trim() || !lookupDateNaissance;

  const recalculateFrom = (data: OnlineAdhesionPayload, grade?: Grade | null): OnlineAdhesionPayload => {
    const selectedGrade = grade ?? gradeOptions.find((g) => String(g.id_grade) === data.grade_id) ?? null;
    const ageRetraite = selectedGrade?.age_retraite ?? data.age_retraite;
    const cotisationAnnuelle = selectedGrade?.cotisation_annuelle ?? data.cotisation_annuelle;
    const datePrecompte = adherentCalculationService.resolveDatePremierPrecompteChoisie(
      data.date_souscription,
      data.date_precompte,
    );
    const dateEffet = datePrecompte ? adherentCalculationService.calculateDateEffet(datePrecompte) : '';
    const dateRetraite =
      data.date_naissance && ageRetraite > 0
        ? adherentCalculationService.calculateDateRetraite(data.date_naissance, ageRetraite)
        : '';
    const nbTrimestre =
      datePrecompte && dateRetraite
        ? adherentCalculationService.calculateNbTrimestre(datePrecompte, dateRetraite)
        : 0;

    let cotisationEs = 0;
    const params = refs?.parametres_calcul;
    if (
      params?.tauxAnnuel != null &&
      params.fraisRente != null &&
      params.ageMax != null &&
      cotisationAnnuelle > 0 &&
      nbTrimestre > 0 &&
      (refs?.mortalite?.length ?? 0) > 0
    ) {
      const result = adherentCalculationService.calculateCotisationTrimestrielleSimple({
        cotisationAnnuelle,
        pctPriseEnCharge: 1,
        ageRetraite,
        nbTrimestres: nbTrimestre,
        tauxAnnuel: params.tauxAnnuel,
        fraisRente: params.fraisRente,
        ageMax: params.ageMax,
        mortalite: refs?.mortalite as MortalitePoint[],
        pasArrondi: 100,
      });
      cotisationEs = result.status === 'OK' ? result.cotisationTrimestrielle : 0;
    }

    return {
      ...data,
      grade_id: selectedGrade ? String(selectedGrade.id_grade) : data.grade_id,
      grade: selectedGrade?.libelle_grade ?? data.grade,
      age_retraite: ageRetraite,
      cotisation_annuelle: cotisationAnnuelle,
      date_precompte: datePrecompte,
      date_effet: dateEffet,
      date_retraite: dateRetraite,
      nb_trimestre: nbTrimestre,
      cotisation_es: cotisationEs,
    };
  };

  const preloadFromAgent = (agent: ExternalAgentInfo) => {
    const base = initialPayload();
    const loaded = {
      ...base,
      matricule: agent.matricule,
      nom: agent.nom,
      prenoms: agent.prenoms,
      date_naissance: agent.date_naissance || '',
      civilite: pickExistingOption(agent.civilite, civiliteOptions, refs?.civilites[0]?.libelle_civilite || ''),
      situation_matrimoniale: refs?.situations_matrimoniales[0]?.libelle_situation || '',
      telephone: agent.telephone || '',
      email: agent.email || '',
      emploi: agent.emploi || '',
      grade_id: '',
      grade: '',
    };
    setFormData(recalculateFrom(loaded));
  };

  useEffect(() => {
    if (!pendingAgent || !refs) return;
    preloadFromAgent(pendingAgent);
    setPendingAgent(null);
    setIsSearching(false);
    setStep('FORM');
  }, [pendingAgent, refs]);

  useEffect(() => {
    if (!pendingAgent || isLoadingRefs || refs) return;
    setPendingAgent(null);
    setIsSearching(false);
    setErrorMsg('Impossible de charger les informations necessaires au formulaire. Veuillez reessayer.');
  }, [pendingAgent, isLoadingRefs, refs]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const mat = matricule.trim().toUpperCase();
    if (!mat) {
      setErrorMsg('Veuillez renseigner le matricule.');
      return;
    }
    if (!lookupDateNaissance) {
      setErrorMsg('Veuillez renseigner votre date de naissance.');
      return;
    }

    setIsSearching(true);
    setErrorMsg(null);
    const { data, error } = await onlineAdhesionService.searchAgent(mat, lookupDateNaissance);
    if (error) {
      setIsSearching(false);
      setErrorMsg(error);
      return;
    }
    if (!data) {
      setIsSearching(false);
      setErrorMsg('Aucun agent trouve pour ce matricule.');
      return;
    }

    if (!refs) {
      if (!isLoadingRefs) {
        setIsSearching(false);
        setErrorMsg('Impossible de charger les informations necessaires au formulaire. Veuillez reessayer.');
        return;
      }
      setPendingAgent(data);
      return;
    }

    preloadFromAgent(data);
    setIsSearching(false);
    setStep('FORM');
  };

  const updateField = (name: keyof OnlineAdhesionPayload, value: string | number | null) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value } as OnlineAdhesionPayload;
      if (name === 'date_souscription' || name === 'date_naissance' || name === 'date_precompte') return recalculateFrom(next);
      return next;
    });
  };

  const handleGradeChange = (gradeId: string) => {
    const selectedGrade = gradeOptions.find((grade) => String(grade.id_grade) === gradeId) ?? null;
    setFormData((prev) =>
      recalculateFrom(
        {
          ...prev,
          grade_id: gradeId,
          grade: selectedGrade?.libelle_grade || '',
        },
        selectedGrade,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.grade_id) {
      setErrorMsg('Veuillez selectionner le grade professionnel.');
      return;
    }
    if (!formData.situation_matrimoniale) {
      setErrorMsg('Veuillez selectionner la situation matrimoniale.');
      return;
    }
    if (!formData.date_precompte) {
      setErrorMsg("Aucun trimestre de premier precompte n'est disponible pour cette date d'adhesion.");
      return;
    }
    if (isRetirementBeforeFirstPrecompte(formData.date_retraite, formData.date_precompte)) {
      setErrorMsg('La date de retraite est anterieure au premier precompte. Verifiez la date de naissance ou le grade.');
      return;
    }
    if (formData.cotisation_es <= 0) {
      setErrorMsg('La cotisation ESR n a pas pu etre calculee. Verifiez le grade et les dates.');
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await onlineAdhesionService.submit(formData);
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setSuccessMatricule(data?.matricule || formData.matricule);
    setStep('SUCCESS');
  };

  return (
    <div className="min-h-screen bg-[#f4f7fc] flex flex-col font-sans">
      <HeaderBanner />

      <main className="flex-1 flex flex-col lg:flex-row">
        <section className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-[#e8effa] via-white to-[#eef5fb] p-6 md:p-10 flex-col justify-center">
          <div className="max-w-md mx-auto space-y-8">
            <button
              onClick={onBackToLogin}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#2b529f] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour connexion
            </button>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <ClipboardList className="w-8 h-8 text-[#2b529f] shrink-0" />
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900">Adhesion en ligne</h1>
                  <p className="text-slate-600 mt-2">
                    Saisissez votre matricule, completez les champs requis, puis la mutuelle validera la demande.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-700">
                <p className="flex gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  Les informations d identite sont prechargees depuis SIAPS.
                </p>
                <p className="flex gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  Le grade reste a choisir manuellement pour eviter une mauvaise correspondance.
                </p>
                <p className="flex gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  La demande sera visible dans le module de validation backoffice.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex-1 p-6 md:p-10 flex items-center justify-center">
          <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8">
            <button
              onClick={onBackToLogin}
              className="lg:hidden mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#2b529f] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour connexion
            </button>

            {errorMsg && (
              <div className="mb-5 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
                {errorMsg}
              </div>
            )}

            {step === 'LOOKUP' && (
              <form onSubmit={handleSearch} className="max-w-xl mx-auto py-10 space-y-8">
                <div className="text-center space-y-2">
                  <Search className="w-12 h-12 mx-auto text-[#2b529f]" />
                  <h2 className="text-2xl font-bold text-slate-900">Démarrer l'adhésion</h2>
                  <p className="text-sm text-slate-500">Entrez votre matricule et votre date de naissance.</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Matricule</label>
                  <input
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2b529f]"
                    placeholder="Ex : 000000Y ou 11111R"
                    disabled={isSearching}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Date de naissance</label>
                  <input
                    type="date"
                    value={lookupDateNaissance}
                    onChange={(e) => setLookupDateNaissance(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2b529f]"
                    disabled={isSearching}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={lookupDisabled}
                  className="w-full py-3 bg-[#2b529f] hover:bg-[#1f3e7a] text-white rounded-xl font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  Rechercher
                </button>
              </form>
            )}

            {step === 'FORM' && (
              <form onSubmit={handleSubmit} className="space-y-7">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Formulaire d'adhésion en ligne</h2>
                    <p className="text-sm text-slate-500">Controlez les informations puis selectionnez le grade.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('LOOKUP')}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Changer de matricule
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Date d'adhésion">
                    <input type="date" value={formData.date_souscription} onChange={(e) => updateField('date_souscription', e.target.value)} className={fieldClass} required />
                  </Field>
                  <Field label="Matricule">
                    <input value={formData.matricule} readOnly className={`${fieldClass} bg-slate-100`} />
                  </Field>
                  <Field label="Civilite">
                    <select value={formData.civilite} onChange={(e) => updateField('civilite', e.target.value)} className={fieldClass} required>
                      {refs?.civilites.map((item) => (
                        <option key={item.id_civilite} value={item.libelle_civilite}>{item.libelle_civilite}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Nom">
                    <input value={formData.nom} onChange={(e) => updateField('nom', e.target.value.toUpperCase())} className={fieldClass} required />
                  </Field>
                  <Field label="Prenoms">
                    <input value={formData.prenoms} onChange={(e) => updateField('prenoms', e.target.value)} className={fieldClass} required />
                  </Field>
                  <Field label="Date de naissance">
                    <input type="date" value={formData.date_naissance} onChange={(e) => updateField('date_naissance', e.target.value)} className={fieldClass} required />
                  </Field>
                  <Field label="Situation matrimoniale">
                    <select value={formData.situation_matrimoniale} onChange={(e) => updateField('situation_matrimoniale', e.target.value)} className={fieldClass} required>
                      {refs?.situations_matrimoniales.map((item) => (
                        <option key={item.id_situation_matrimoniale} value={item.libelle_situation}>{item.libelle_situation}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Telephone">
                    <input value={formData.telephone} onChange={(e) => updateField('telephone', e.target.value)} className={fieldClass} required />
                  </Field>
                  <Field label="Email">
                    <input type="email" value={formData.email || ''} onChange={(e) => updateField('email', e.target.value)} className={fieldClass} />
                  </Field>
                  <Field label="Emploi / Direction">
                    <input value={formData.emploi} onChange={(e) => updateField('emploi', e.target.value)} className={fieldClass} required />
                  </Field>
                  <Field label="Grade professionnel">
                    <select value={formData.grade_id} onChange={(e) => handleGradeChange(e.target.value)} className={fieldClass} required>
                      <option value="">-- Selectionner un grade --</option>
                      {gradeOptions.map((grade) => (
                        <option key={grade.id_grade} value={String(grade.id_grade)}>{grade.libelle_grade}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Age retraite">
                    <input value={formData.age_retraite} readOnly className={`${fieldClass} bg-slate-100`} />
                  </Field>
                  <Field label="Trimestre du premier precompte">
                    <select
                      value={formData.date_precompte || ''}
                      onChange={(e) => updateField('date_precompte', e.target.value)}
                      className={fieldClass}
                      disabled={precompteOptions.length === 0}
                      required
                    >
                      {precompteOptions.length === 0 ? (
                        <option value="">Aucun trimestre disponible</option>
                      ) : (
                        <>
                          <option value="">-- Selectionner un trimestre --</option>
                          {precompteOptions.map((option) => (
                            <option key={option.date} value={option.date}>
                              {option.label}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </Field>
                </div>

                {precompteOptions.length === 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-semibold">
                    Aucun trimestre de l'annee d'adhesion ou de l'annee suivante ne commence a partir de cette date.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <Summary label="Cotisation annuelle" value={formatFCFA(formData.cotisation_annuelle)} />
                  <Summary label="Date retraite" value={formatDateFr(formData.date_retraite)} />
                  <Summary label="Premier precompte" value={formatDateFr(formData.date_precompte)} />
                  <Summary label="Date effet" value={formatDateFr(formData.date_effet)} />
                  <Summary label="Trimestres" value={String(formData.nb_trimestre || 0)} />
                  <Summary label="Cotisation ESR" value={formatFCFA(formData.cotisation_es)} strong />
                </div>

                {isRetirementBeforeFirstPrecompte(formData.date_retraite, formData.date_precompte) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-semibold">
                    La date de retraite est anterieure au premier precompte. Verifiez la date de naissance et le grade avant de soumettre.
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                  <button type="button" onClick={onBackToLogin} className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">
                    Annuler
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Soumettre
                  </button>
                </div>
              </form>
            )}

            {step === 'SUCCESS' && (
              <div className="max-w-xl mx-auto py-16 text-center space-y-5">
                <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
                <h2 className="text-2xl font-bold text-slate-900">Adhesion en attente de validation</h2>
                <p className="text-slate-600">
                  Votre demande pour le matricule <strong>{successMatricule}</strong> a ete transmise a la mutuelle.
                </p>
                <button onClick={onBackToLogin} className="px-6 py-3 bg-[#2b529f] hover:bg-[#1f3e7a] text-white rounded-xl font-bold">
                  Retour a la connexion
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-bold text-slate-600 uppercase">{label}</span>
      {children}
    </label>
  );
}

function Summary({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase">{label}</p>
      <p className={`${strong ? 'text-lg text-emerald-700' : 'text-sm text-slate-800'} font-extrabold mt-1 font-mono`}>{value}</p>
    </div>
  );
}
