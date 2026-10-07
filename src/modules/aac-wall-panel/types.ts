export const numericFields = {
  b: ["板宽", "mm"],
  h: ["板厚", "mm"],
  span: ["计算跨度", "mm"],
  a: ["受拉钢筋合力点距板面", "mm"],
  diameter: ["受拉钢筋直径", "mm"],
  count: ["受拉钢筋根数", "根"],
  i0: ["换算截面惯性矩 I₀", "mm⁴"],
  w: ["受拉边缘换算截面抵抗矩 W₀", "mm³"],
  longFactor: ["长期挠度增大系数", "无量纲"],
  basicWind: ["基本风压 w₀", "kN/m²"],
  height: ["计算高度 z", "m"],
  muZ: ["风压高度变化系数 μz", "无量纲"],
  gust: ["阵风系数 βgz", "无量纲"],
  local: ["控制净局部体型系数绝对值", "无量纲"],
  gammaW: ["风荷载分项系数 γW", "无量纲"],
  gamma0: ["板身重要性系数 γ₀", "无量纲"],
} as const;
export type NumericKey = keyof typeof numericFields;
export type RawInput = Record<NumericKey, string> & {
  concrete: string;
  steel: string;
  product: string;
  terrain: string;
  source: string;
  sectionSource: string;
  model: boolean;
  windBasis: boolean;
  sectionBasis: boolean;
};
export type Input = Record<NumericKey, number> & {
  concrete: "A3.5" | "A5.0";
  steel: "HPB300" | "HRB400" | "CRB600H";
  product: "sand" | "flyash";
  terrain: "A" | "B" | "C" | "D";
  source: string;
  sectionSource: string;
};
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
  area: number;
  reinforcementRatio: number;
  maxReinforcementRatio: number;
  windStandard: number;
  windDesign: number;
  standardMoment: number;
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
      direction: Direction;
      passed: boolean;
      steps: Step[];
    };
