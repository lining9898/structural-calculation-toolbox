export const concreteGrades = ['C25', 'C30', 'C35', 'C40', 'C45', 'C50'] as const;
export const steelGrades = ['HRB400', 'HRB500'] as const;

export interface RawInput {
  b: string;
  h: string;
  a_s: string;
  A_s: string;
  M_d: string;
  concrete: string;
  steel: string;
  tensionEdge: string;
  source: string;
  singleReinforced: boolean;
  nonPrestressed: boolean;
  noSeismicCheck: boolean;
  ordinaryStatic: boolean;
  notDeepBeam: boolean;
  demandIncludesImportance: boolean;
  beamType: string;
}

export interface BeamInput {
  b: number;
  h: number;
  a_s: number;
  A_s: number;
  M_d: number;
  concrete: typeof concreteGrades[number];
  steel: typeof steelGrades[number];
  tensionEdge: 'top' | 'bottom';
  source: string;
  beamType: 'ordinary' | 'frame';
}

export type Field = keyof RawInput;
export type FieldErrors = Partial<Record<Field | 'general', string>>;
export type Validation = { ok: false; errors: FieldErrors } | { ok: true; input: BeamInput };

export interface Check {
  id: string;
  name: string;
  actual: number;
  limit: number;
  unit: string;
  operator: '≤' | '≥';
  passed: boolean;
  referenceIds: string[];
}

export interface CalculationStep {
  id: string;
  title: string;
  formula: string;
  parameters: string;
  substitution: string;
  result: string;
  referenceIds: string[];
}

export interface Intermediate {
  fc: number; ft: number; fy: number; Es: number;
  alpha1: number; beta1: number; epsilonCu: number; gammaRd: number;
  h0: number; xiB: number; xB: number; tension: number; compression: number;
  x: number; rho: number; rhoMin: number; minimumSteel: number;
}

export type CalculationResult =
  | { status: 'invalid'; errors: FieldErrors }
  | { status: 'outside-model'; input: BeamInput; intermediate: Intermediate; checks: Check[]; steps: CalculationStep[]; capacityKNm: null }
  | { status: 'calculated'; input: BeamInput; intermediate: Intermediate; checks: Check[]; steps: CalculationStep[]; passed: boolean; capacityKNm: number | null; leverArm: number | null; momentNmm: number | null };
