export interface RawInput {
  b: string;
  h: string;
  span: string;
  aBottom: string;
  aTop: string;
  steelBottom: string;
  steelTop: string;
  concrete: string;
  steel: string;
  product: string;
  i0: string;
  wBottom: string;
  wTop: string;
  longFactor: string;
  positiveK: string;
  negativeK: string;
  positiveD: string;
  negativeD: string;
  source: string;
  sectionSource: string;
  model: boolean;
  windBasis: boolean;
  sectionBasis: boolean;
}
export interface Input {
  b: number;
  h: number;
  span: number;
  aBottom: number;
  aTop: number;
  steelBottom: number;
  steelTop: number;
  concrete: "A3.5" | "A5.0";
  steel: "HPB300" | "HRB400" | "CRB600H";
  product: "sand" | "flyash";
  i0: number;
  wBottom: number;
  wTop: number;
  longFactor: number;
  positiveK: number;
  negativeK: number;
  positiveD: number;
  negativeD: number;
  source: string;
  sectionSource: string;
}
export interface Step {
  title: string;
  formula: string;
  meaning: string;
  substitution: string;
  result: string;
  references: string[];
}
export interface Check {
  title: string;
  comparison: string;
  passed: boolean;
  references: string[];
}
export interface Direction {
  name: string;
  edge: string;
  h0: number;
  x: number;
  xLimit: number;
  modelValid: boolean;
  momentDemand: number;
  shearDemand: number;
  momentCapacity: number | null;
  shearCapacity: number;
  stress: number;
  deflection: number;
  deflectionLimit: number;
  checks: Check[];
  steps: Step[];
  passed: boolean;
}
export type Result =
  | { status: "invalid"; errors: Record<string, string> }
  | {
      status: "calculated";
      input: Input;
      material: { fc: number; ft: number; ftk: number; Ec: number; fy: number };
      directions: Direction[];
      passed: boolean;
      steps: Step[];
    };
