import React, { useEffect, useState } from 'react';
import { CheckCircle2, Edit2, Eye, Loader2, RefreshCw, Search, XCircle } from 'lucide-react';
import { adherentCalculationService, MortalitePoint } from '../services/adherentCalculationService';
import { onlineAdhesionService } from '../services/onlineAdhesionService';
import { DBUser, Grade, OnlineAdhesion, OnlineAdhesionPayload, OnlineAdhesionReferentiels, OnlineAdhesionStatus } from '../types';
import { formatDateFr, formatFCFA, toIsoDate } from '../utils/formatters';
import { ScrollableTableWrapper } from '../components/common/ScrollableTableWrapper';

interface AdhesionsEnLigneProps {
  currentUser: DBUser;
}

type ViewState = 'LIST' | 'DETAIL';

const fieldClass =
  'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2b529f] focus:border-[#2b529f]';

function isRetirementBeforeFirstPrecompte(dateRetraite?: string | null, datePrecompte?: string | null): boolean {
  const retraite = toIsoDate(dateRetraite);
  const precompte = toIsoDate(datePrecompte);
  return Boolean(retraite && precompte && retraite < precompte);
}

function payloadFromAdhesion(item: OnlineAdhesion): OnlineAdhesionPayload {
  const datePrecompte = item.date_precompte || null;
  const dateEffet = datePrecompte
    ? adherentCalculationService.calculateDateEffet(datePrecompte) || item.date_effet
    : item.date_effet;

  return {
    date_souscription: item.date_souscription,
    matricule: item.matricule,
    civilite: item.civilite,
    sexe: item.sexe ?? null,
    nom: item.nom,
    prenoms: item.prenoms,
    date_naissance: item.date_naissance,
    situation_matrimoniale: item.situation_matrimoniale,
    telephone: item.telephone,
    email: item.email || '',
    emploi: item.emploi,
    grade_id: item.grade_id,
    grade: item.grade || item.grade_libelle || '',
    date_effet: dateEffet,
    date_retraite: item.date_retraite,
    age_retraite: Number(item.age_retraite || 60),
    cotisation_annuelle: Number(item.cotisation_annuelle || 0),
    date_precompte: datePrecompte,
    nb_trimestre: Number(item.nb_trimestre || 0),
    cotisation_es: Number(item.cotisation_es || 0),
    taux_gar: item.taux_gar ?? null,
    frais_rente: item.frais_rente ?? null,
    taux_rachat: item.taux_rachat ?? null,
  };
}

export default function AdhesionsEnLigne({ currentUser }: AdhesionsEnLigneProps) {
  const [items, setItems] = useState<OnlineAdhesion[]>([]);
  const [refs, setRefs] = useState<OnlineAdhesionReferentiels | null>(null);
  const [viewState, setViewState] = useState<ViewState>('LIST');
  const [selected, setSelected] = useState<OnlineAdhesion | null>(null);
  const [formData, setFormData] = useState<OnlineAdhesionPayload | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const gradeOptions = refs?.grades ?? [];
  const isReadOnly = selected?.statut_demande === 'VALIDE' || selected?.statut_demande === 'REJETE';
  const precompteOptions = formData
    ? adherentCalculationService.getPremierPrecompteTrimestreOptions(formData.date_souscription, true)
    : [];

  const loadRefs = async () => {
    const { data, error } = await onlineAdhesionService.getReferentiels();
    if (error || !data) {
      setErrorMsg(error?.message || 'Impossible de charger les referentiels.');
      return;
    }
    setRefs(data);
  };

  const fetchItems = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const { data, error } = await onlineAdhesionService.list({
      search: search.trim() || undefined,
      statut: 'EN_ATTENTE',
    });
    setIsLoading(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setItems(data);
  };

  useEffect(() => {
    loadRefs();
  }, []);

  useEffect(() => {
    fetchItems();
  }, []);

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

  const openDetail = (item: OnlineAdhesion) => {
    setSelected(item);
    setFormData(payloadFromAdhesion(item));
    setActionMsg(null);
    setViewState('DETAIL');
  };

  const updateField = (name: keyof OnlineAdhesionPayload, value: string | number | null) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [name]: value } as OnlineAdhesionPayload;
      if (name === 'date_souscription' || name === 'date_naissance' || name === 'date_precompte') return recalculateFrom(next);
      return next;
    });
  };

  const handleGradeChange = (gradeId: string) => {
    const selectedGrade = gradeOptions.find((grade) => String(grade.id_grade) === gradeId) ?? null;
    setFormData((prev) =>
      prev
        ? recalculateFrom(
            {
              ...prev,
              grade_id: gradeId,
              grade: selectedGrade?.libelle_grade || '',
            },
            selectedGrade,
          )
        : prev,
    );
  };

  const ensureReady = (): OnlineAdhesionPayload | null => {
    if (!formData) return null;
    if (!formData.grade_id) {
      setActionMsg('Le grade professionnel est obligatoire.');
      return null;
    }
    if (!formData.date_precompte) {
      setActionMsg("Aucun trimestre de premier precompte n'est disponible pour cette date d'adhesion.");
      return null;
    }
    if (isRetirementBeforeFirstPrecompte(formData.date_retraite, formData.date_precompte)) {
      setActionMsg('La date de retraite est anterieure au premier precompte. Verifiez la date de naissance ou le grade.');
      return null;
    }
    if (formData.cotisation_es <= 0 || formData.nb_trimestre <= 0) {
      setActionMsg('Le calcul ESR est incomplet. Verifiez le grade et les dates.');
      return null;
    }
    return formData;
  };

  const handleSave = async () => {
    if (!selected) return;
    const payload = ensureReady();
    if (!payload) return;
    setIsSubmitting(true);
    setActionMsg(null);
    const { data, error } = await onlineAdhesionService.update(selected.id, payload);
    setIsSubmitting(false);
    if (error || !data) {
      setActionMsg(error?.message || 'Mise a jour impossible.');
      return;
    }
    setSelected(data);
    setFormData(payloadFromAdhesion(data));
    setActionMsg('Demande mise a jour.');
    fetchItems();
  };

  const handleValidate = async () => {
    if (!selected) return;
    const payload = ensureReady();
    if (!payload) return;
    if (!window.confirm('Valider cette adhesion en ligne et creer l adherent ESR actif ?')) return;

    setIsSubmitting(true);
    setActionMsg(null);
    const { data, error } = await onlineAdhesionService.validate(selected.id, payload);
    setIsSubmitting(false);
    if (error || !data) {
      setActionMsg(error?.message || 'Validation impossible.');
      return;
    }
    setSelected(null);
    setFormData(null);
    setViewState('LIST');
    const firstLogin = data.first_login;
    setActionMsg(
      firstLogin
        ? `Adhesion validee. Acces adherent cree : identifiant ${firstLogin.login}. L adherent definira son mot de passe a la premiere connexion.`
        : 'Adhesion validee. L adherent est maintenant actif dans la liste globale.',
    );
    await fetchItems();
  };

  const handleReject = async () => {
    if (!selected) return;
    const motif = window.prompt('Motif du rejet :') || '';
    if (!window.confirm('Confirmer le rejet de cette demande ?')) return;

    setIsSubmitting(true);
    setActionMsg(null);
    const { data, error } = await onlineAdhesionService.reject(selected.id, motif);
    setIsSubmitting(false);
    if (error || !data) {
      setActionMsg(error?.message || 'Rejet impossible.');
      return;
    }
    setSelected(null);
    setFormData(null);
    setViewState('LIST');
    setActionMsg('Demande rejetee et retiree de la file en attente.');
    await fetchItems();
  };

  const pendingCount = items.length;

  return (
    <div className="space-y-6" id="online-adhesions-main">
      {viewState === 'LIST' && (
        <>
          <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Validation des adhesions en ligne</h2>
              <p className="text-sm text-slate-500 mt-1">
                File des demandes en attente. Une demande validee apparait dans la liste globale des adherents.
              </p>
              <p className="text-xs text-slate-400 mt-2">Connecte : {currentUser.prenoms} {currentUser.nom}</p>
            </div>
            <div className="text-right">
              <span className="inline-flex px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold">
                {pendingCount} en attente
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchItems()}
                placeholder="Matricule, nom ou prenoms"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button onClick={fetchItems} className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {errorMsg && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">{errorMsg}</div>}
          {actionMsg && <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm">{actionMsg}</div>}

          {isLoading ? (
            <div className="p-16 bg-white border border-slate-100 rounded-2xl text-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
              Chargement des demandes...
            </div>
          ) : (
            <ScrollableTableWrapper>
              <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase tracking-wide font-bold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Matricule</th>
                    <th className="py-2.5 px-3">Nom et prénoms</th>
                    <th className="py-2.5 px-3">Téléphone</th>
                    <th className="py-2.5 px-3">Grade</th>
                    <th className="py-2.5 px-3">Emploi / Fonction</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Statut</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">Aucune demande trouvee.</td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono whitespace-nowrap">{formatDateFr(item.date_souscription)}</td>
                        <td className="py-2.5 px-3 font-bold font-mono whitespace-nowrap">{item.matricule}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-800">{item.nom}</span>
                          <span className="ml-1 text-[11px] text-slate-500">{item.prenoms}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono whitespace-nowrap">{item.telephone}</td>
                        <td className="py-2.5 px-3 font-bold">{item.grade || '-'}</td>
                        <td className="py-2.5 px-3 max-w-xs truncate" title={item.emploi}>{item.emploi}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <StatusBadge status={item.statut_demande} />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => openDetail(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-[#2b529f] text-xs font-bold hover:bg-slate-50 whitespace-nowrap"
                          >
                            <Eye className="w-4 h-4" />
                            Ouvrir
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ScrollableTableWrapper>
          )}
        </>
      )}

      {viewState === 'DETAIL' && selected && formData && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <button onClick={() => setViewState('LIST')} className="text-sm font-bold text-[#2b529f] hover:underline mb-2">
                Retour a la liste
              </button>
              <h2 className="text-2xl font-bold text-slate-900">
                Validation : {selected.nom} {selected.prenoms}
              </h2>
              <div className="mt-2"><StatusBadge status={selected.statut_demande} /></div>
            </div>
            {!isReadOnly && (
              <div className="flex flex-wrap gap-2">
                <button onClick={handleSave} disabled={isSubmitting} className="inline-flex items-center gap-2 px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold disabled:opacity-50">
                  <Edit2 className="w-4 h-4" />
                  Enregistrer
                </button>
                <button onClick={handleValidate} disabled={isSubmitting} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 disabled:opacity-50">
                  <CheckCircle2 className="w-4 h-4" />
                  Valider
                </button>
                <button onClick={handleReject} disabled={isSubmitting} className="inline-flex items-center gap-2 px-4 py-2 border border-rose-200 bg-rose-50 text-rose-700 rounded-xl text-sm font-bold hover:bg-rose-100 disabled:opacity-50">
                  <XCircle className="w-4 h-4" />
                  Rejeter
                </button>
              </div>
            )}
          </div>

          {actionMsg && (
            <div className={`p-3 rounded-xl text-sm border ${
              actionMsg.toLowerCase().includes('impossible') || actionMsg.toLowerCase().includes('obligatoire') || actionMsg.toLowerCase().includes('incomplet')
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {actionMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Date d adhesion"><input type="date" disabled={isReadOnly} value={formData.date_souscription} onChange={(e) => updateField('date_souscription', e.target.value)} className={fieldClass} /></Field>
            <Field label="Matricule"><input disabled value={formData.matricule} className={`${fieldClass} bg-slate-100`} /></Field>
            <Field label="Civilite">
              <select disabled={isReadOnly} value={formData.civilite} onChange={(e) => updateField('civilite', e.target.value)} className={fieldClass}>
                {refs?.civilites.map((item) => <option key={item.id_civilite} value={item.libelle_civilite}>{item.libelle_civilite}</option>)}
              </select>
            </Field>
            <Field label="Nom"><input disabled={isReadOnly} value={formData.nom} onChange={(e) => updateField('nom', e.target.value.toUpperCase())} className={fieldClass} /></Field>
            <Field label="Prenoms"><input disabled={isReadOnly} value={formData.prenoms} onChange={(e) => updateField('prenoms', e.target.value)} className={fieldClass} /></Field>
            <Field label="Date naissance"><input type="date" disabled={isReadOnly} value={formData.date_naissance} onChange={(e) => updateField('date_naissance', e.target.value)} className={fieldClass} /></Field>
            <Field label="Situation matrimoniale">
              <select disabled={isReadOnly} value={formData.situation_matrimoniale} onChange={(e) => updateField('situation_matrimoniale', e.target.value)} className={fieldClass}>
                {refs?.situations_matrimoniales.map((item) => <option key={item.id_situation_matrimoniale} value={item.libelle_situation}>{item.libelle_situation}</option>)}
              </select>
            </Field>
            <Field label="Telephone"><input disabled={isReadOnly} value={formData.telephone} onChange={(e) => updateField('telephone', e.target.value)} className={fieldClass} /></Field>
            <Field label="Email"><input type="email" disabled={isReadOnly} value={formData.email || ''} onChange={(e) => updateField('email', e.target.value)} className={fieldClass} /></Field>
            <Field label="Emploi / Fonction"><input disabled={isReadOnly} value={formData.emploi} onChange={(e) => updateField('emploi', e.target.value)} className={fieldClass} /></Field>
            <Field label="Grade">
              <select disabled={isReadOnly} value={formData.grade_id} onChange={(e) => handleGradeChange(e.target.value)} className={fieldClass}>
                <option value="">-- Selectionner un grade --</option>
                {gradeOptions.map((grade) => <option key={grade.id_grade} value={String(grade.id_grade)}>{grade.libelle_grade}</option>)}
              </select>
            </Field>
            <Field label="Trimestre precompte">
              <select
                disabled={isReadOnly || precompteOptions.length === 0}
                value={formData.date_precompte || ''}
                onChange={(e) => updateField('date_precompte', e.target.value)}
                className={fieldClass}
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
            <Field label="Statut"><input disabled value={selected.statut_demande.replace('_', ' ')} className={`${fieldClass} bg-slate-100`} /></Field>
          </div>

          {precompteOptions.length === 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-semibold">
              Aucun trimestre de l'annee d'adhesion ou de l'annee suivante ne commence a partir de cette date.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <Summary label="Cotisation annuelle" value={formatFCFA(formData.cotisation_annuelle)} />
            <Summary label="Age retraite" value={String(formData.age_retraite)} />
            <Summary label="Date retraite" value={formatDateFr(formData.date_retraite)} />
            <Summary label="Date effet" value={formatDateFr(formData.date_effet)} />
            <Summary label="Premier precompte" value={formatDateFr(formData.date_precompte)} />
            <Summary label="Trimestres" value={String(formData.nb_trimestre)} />
            <Summary label="Cotisation ESR" value={formatFCFA(formData.cotisation_es)} strong />
          </div>

          {isRetirementBeforeFirstPrecompte(formData.date_retraite, formData.date_precompte) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-semibold">
              La date de retraite est anterieure au premier precompte. Corrigez la date de naissance ou le grade avant validation.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: OnlineAdhesionStatus }) {
  const classes =
    status === 'VALIDE'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : status === 'REJETE'
      ? 'bg-rose-50 border-rose-200 text-rose-700'
      : 'bg-amber-50 border-amber-200 text-amber-700';

  return <span className={`inline-flex px-2 py-1 rounded-full border text-[10px] leading-none font-bold whitespace-nowrap ${classes}`}>{status.replace('_', ' ')}</span>;
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
      <p className={`${strong ? 'text-xl text-emerald-700' : 'text-sm text-slate-800'} font-extrabold mt-1 font-mono`}>{value}</p>
    </div>
  );
}
