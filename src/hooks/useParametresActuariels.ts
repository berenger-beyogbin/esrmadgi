import { useEffect, useState } from 'react';
import { parametreService } from '../services/parametreService';
import { parametresGenerauxService } from '../services/parametresGenerauxService';
import { MortalitePoint } from '../services/adherentCalculationService';

export interface ParametresActuariels {
  tauxAnnuel: number;
  fraisRente: number;
  ageMax: number;
}

interface UseParametresActuarielsResult {
  mortaliteData: MortalitePoint[];
  parametresCalcul: ParametresActuariels | null;
  calculParamsError: string | null;
  isLoading: boolean;
}

/** Charge la table de mortalité et les paramètres actuariels généraux (TAUX_GAR, FRAIS_RENTE, AGE_MAX). */
export function useParametresActuariels(): UseParametresActuarielsResult {
  const [mortaliteData, setMortaliteData] = useState<MortalitePoint[]>([]);
  const [parametresCalcul, setParametresCalcul] = useState<ParametresActuariels | null>(null);
  const [calculParamsError, setCalculParamsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCalculParams() {
      setIsLoading(true);
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
        const findVal = (code: string) => paramList.find((p) => p.code === code)?.valeur ?? null;

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
      } finally {
        setIsLoading(false);
      }
    }
    loadCalculParams();
  }, []);

  return { mortaliteData, parametresCalcul, calculParamsError, isLoading };
}
