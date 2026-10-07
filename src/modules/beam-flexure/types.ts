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
}

export type Field = keyof RawInput;
export type FieldErrors = Partial<Record<Field, string>>;
export type Validation = { ok: false; errors: FieldErrors } | { ok: true; input: BeamInput };

export type Assessment =
  | { status: 'invalid'; errors: FieldErrors }
  | { status: 'pending-references'; input: BeamInput; effectiveHeight: number; missing: string[] };
