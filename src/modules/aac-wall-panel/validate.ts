import { numericFields } from "./types";
import type { Input, NumericKey, RawInput } from "./types";
export function validate(
  raw: RawInput,
): { ok: true; input: Input } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const numbers = {} as Record<NumericKey, number>;
  for (const key of Object.keys(numericFields) as NumericKey[]) {
    const text = raw[key].trim(),
      value = Number(text);
    if (
      !text ||
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text) ||
      !Number.isFinite(value)
    )
      errors[key] =
        `请填写有效的${numericFields[key][0]}（${numericFields[key][1]}）。`;
    else if (value <= 0)
      errors[key] =
        `${numericFields[key][0]}必须大于0（${numericFields[key][1]}）。`;
    else numbers[key] = value;
  }
  if (!errors.count && !Number.isSafeInteger(numbers.count))
    errors.count = "受拉钢筋根数必须是正整数。";
  if (!errors.a && !errors.h && numbers.a >= numbers.h)
    errors.a = "钢筋合力点距离必须小于板厚。";
  if (!errors.a && !errors.diameter && numbers.a < numbers.diameter / 2)
    errors.a = "钢筋中心距板面不得小于钢筋半径，请检查合力点距离和直径。";
  if (!errors.diameter && !errors.h && numbers.diameter >= numbers.h)
    errors.diameter = "钢筋直径必须小于板厚。";
  if (
    !errors.diameter &&
    !errors.count &&
    !errors.b &&
    !errors.h &&
    ((Math.PI * numbers.diameter ** 2) / 4) * numbers.count >=
      numbers.b * numbers.h
  )
    errors.general = "受拉钢筋面积必须小于板截面面积，请检查直径与根数。";
  if (!errors.longFactor && numbers.longFactor < 1)
    errors.longFactor = "长期挠度增大系数不得小于1。";
  if (!errors.basicWind && numbers.basicWind < 0.3)
    errors.basicWind =
      "基本风压不得小于0.30 kN/m²（GB 50009-2012 第8.1.2条）。";
  if (!errors.gammaW && numbers.gammaW < 1)
    errors.gammaW = "本版仅接受不小于1的风荷载分项系数，请核对现行组合依据。";
  if (!["A3.5", "A5.0"].includes(raw.concrete))
    errors.concrete = "本版仅支持A3.5、A5.0配筋板。";
  if (!["HPB300", "HRB400", "CRB600H"].includes(raw.steel))
    errors.steel = "请选择支持的钢筋牌号。";
  if (!["sand", "flyash"].includes(raw.product))
    errors.product = "请选择砂制品或粉煤灰制品。";
  if (!["A", "B", "C", "D"].includes(raw.terrain))
    errors.terrain = "请选择A、B、C或D类地面粗糙度。";
  if (!raw.source.trim())
    errors.source = "请填写风压系数、控制板面、现行荷载组合与支承模型的来源。";
  if (!raw.sectionSource.trim())
    errors.sectionSource = "请填写换算截面、长期系数与实际配筋的来源。";
  if (!raw.model)
    errors.model =
      "本版本仅支持竖向、无洞口、一向两端简支、均布净风压的非承重板，请确认实际构造符合。";
  if (!raw.windBasis)
    errors.windBasis =
      "请确认控制方向、内外压净局部体型系数、手动查表系数及现行组合系数。";
  if (!raw.sectionBasis)
    errors.sectionBasis =
      "请确认I₀及W₀来自同一未开裂换算截面，已考虑实际配筋中性轴及长期作用。";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    input: {
      ...numbers,
      concrete: raw.concrete as Input["concrete"],
      steel: raw.steel as Input["steel"],
      product: raw.product as Input["product"],
      terrain: raw.terrain as Input["terrain"],
      source: raw.source.trim(),
      sectionSource: raw.sectionSource.trim(),
    },
  };
}
