import { createContext } from 'react';

/** Solo comunica la racha que Inicio ya calcula; no escribe progreso ni datos. */
export interface CompanionProgress { days: number; activationKey: string; challengeDone: boolean }
export const HomeCompanionStreak = createContext<(progress: CompanionProgress) => void>(() => {});
