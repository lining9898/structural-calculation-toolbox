import type { Input, RawInput } from "./types";
const names = {
  b: ["板宽", "mm"],
  h: ["板厚", "mm"],
  span: ["计算跨度", "mm"],
  aBottom: ["下侧钢筋合力点距离", "mm"],
  aTop: ["上侧钢筋合力点距离", "mm"],
  steelBottom: ["下侧受拉钢筋面积", "mm²"],
  steelTop: ["上侧受拉钢筋面积", "mm²"],
  i0: ["换算截面惯性矩 I₀", "mm⁴"],
  wBottom: ["下侧换算截面抵抗矩", "mm³"],
  wTop: ["上侧换算截面抵抗矩", "mm³"],
  longFactor: ["长期挠度增大系数", "无量纲"],
  positiveK: ["正风压标准组合值", "kN/m²"],
  negativeK: ["负风压标准组合绝对值", "kN/m²"],
  positiveD: ["正风压设计值", "kN/m²"],
  negativeD: ["负风压设计绝对值", "kN/m²"],
} as const;
export function validate(
  raw: RawInput,
): { ok: true; input: Input } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const numbers = {} as Record<keyof typeof names, number>;
  for (const key of Object.keys(names) as (keyof typeof names)[]) {
    const text = raw[key].trim(),
      value = Number(text);
    const zeroAllowed = [
      "positiveK",
      "negativeK",
      "positiveD",
      "negativeD",
    ].includes(key);
    if (
      !text ||
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text) ||
      !Number.isFinite(value)
    )
      errors[key] = `请填写有效的${names[key][0]}（${names[key][1]}）。`;
    else if (zeroAllowed ? value < 0 : value <= 0)
      errors[key] =
        `${names[key][0]}必须${zeroAllowed ? "不小于" : "大于"}0（${names[key][1]}）。`;
    else numbers[key] = value;
  }
  for (const key of ["aBottom", "aTop"] as const)
    if (!errors[key] && !errors.h && numbers[key] >= numbers.h)
      errors[key] = "钢筋合力点距离必须小于板厚。";
  for (const key of ["steelBottom", "steelTop"] as const)
    if (
      !errors[key] &&
      !errors.b &&
      !errors.h &&
      numbers[key] >= numbers.b * numbers.h
    )
      errors[key] = "单侧钢筋面积必须小于板截面面积。";
  if (
    !errors.steelBottom &&
    !errors.steelTop &&
    !errors.b &&
    !errors.h &&
    numbers.steelBottom + numbers.steelTop >= numbers.b * numbers.h
  )
    errors.general = "两侧钢筋总面积必须小于板截面面积。";
  if (!errors.longFactor && numbers.longFactor < 1)
    errors.longFactor = "长期挠度增大系数不得小于1，禁止未经依据折减挠度。";
  if (
    !errors.positiveK &&
    !errors.negativeK &&
    !errors.positiveD &&
    !errors.negativeD &&
    [
      numbers.positiveK,
      numbers.negativeK,
      numbers.positiveD,
      numbers.negativeD,
    ].every((v) => v === 0)
  )
    errors.general = "至少填写一个非零风压工况。";
  for (const [k, d] of [
    ["positiveK", "positiveD"],
    ["negativeK", "negativeD"],
  ] as const)
    if (!errors[k] && !errors[d] && (numbers[k] === 0) !== (numbers[d] === 0))
      errors[d] = "同一方向标准组合与设计值应同时填写，或同时为0表示不启用。";
  if (!["A3.5", "A5.0"].includes(raw.concrete))
    errors.concrete = "本版仅支持A3.5、A5.0配筋板。";
  if (!["HPB300", "HRB400", "CRB600H"].includes(raw.steel))
    errors.steel = "请选择支持的钢筋牌号。";
  if (!["sand", "flyash"].includes(raw.product))
    errors.product = "请选择砂制品或粉煤灰制品。";
  if (!raw.source.trim())
    errors.source = "请填写净风压、组合、重要性因素和跨度模型的来源。";
  if (!raw.sectionSource.trim())
    errors.sectionSource = "请填写换算截面数据、长期系数及配筋来源。";
  if (!raw.model)
    errors.model =
      "本版本仅支持无洞口、一向两端简支、均布净风压的非承重板，请确认实际构造符合。";
  if (!raw.windBasis)
    errors.windBasis = "请确认风正负压方向、标准组合和已组合设计值口径。";
  if (!raw.sectionBasis)
    errors.sectionBasis =
      "请确认I₀及两侧抵抗矩来自同一未开裂换算截面，长期系数已考虑长期作用。";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    input: {
      ...numbers,
      concrete: raw.concrete as Input["concrete"],
      steel: raw.steel as Input["steel"],
      product: raw.product as Input["product"],
      source: raw.source.trim(),
      sectionSource: raw.sectionSource.trim(),
    },
  };
}
