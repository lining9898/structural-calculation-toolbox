import { kNmToNmm } from '../../shared/units';
import { concreteGrades, steelGrades } from './types';
import type { BeamInput, FieldErrors, RawInput, Validation } from './types';

const numericFields = {
  b: ['梁宽 b', 'mm'],
  h: ['梁高 h', 'mm'],
  a_s: ['合力点至受拉边距离 a_s', 'mm'],
  A_s: ['受拉钢筋面积 A_s', 'mm²'],
  M_d: ['设计弯矩 M_d', 'kN·m'],
} as const;

export function validateInput(raw: RawInput): Validation {
  const errors: FieldErrors = {};
  const numbers = {} as Record<keyof typeof numericFields, number>;
  for (const key of Object.keys(numericFields) as (keyof typeof numericFields)[]) {
    const [name, unit] = numericFields[key];
    const text = raw[key].trim();
    if (!text) {
      errors[key] = `请填写${name}（${unit}）。`;
      continue;
    }
    const value = Number(text);
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text) || !Number.isFinite(value)) {
      errors[key] = `${name}必须为有效数字（${unit}）。`;
    } else if (value <= 0) {
      errors[key] = `${name}必须大于 0 ${unit}。`;
    } else {
      numbers[key] = value;
    }
  }
  if (!errors.h && !errors.a_s && numbers.a_s >= numbers.h) {
    errors.a_s = '合力点至受拉边距离 a_s 必须小于梁高 h。';
  }
  if (!errors.M_d) {
    try { kNmToNmm(numbers.M_d); }
    catch { errors.M_d = '设计弯矩 M_d 超出可处理范围，请检查数值及单位。'; }
  }
  if (!concreteGrades.includes(raw.concrete as BeamInput['concrete'])) {
    errors.concrete = '请选择本版拟支持的混凝土等级。';
  }
  if (!steelGrades.includes(raw.steel as BeamInput['steel'])) {
    errors.steel = '请选择本版拟支持的钢筋牌号。';
  }
  if (raw.tensionEdge !== 'top' && raw.tensionEdge !== 'bottom') {
    errors.tensionEdge = '请选择当前截面的受拉边。';
  }
  if (!raw.source.trim()) errors.source = '请填写设计弯矩来源及组合说明。';
  if (!raw.singleReinforced) errors.singleReinforced = '当前模型仅拟用于单筋截面，请确认不计受压钢筋贡献。';
  if (!raw.nonPrestressed) errors.nonPrestressed = '当前模型仅拟用于非预应力构件。';
  if (!raw.noSeismicCheck) errors.noSeismicCheck = '当前版本不支持抗震专项验算，不适用时请停止使用本模型。';
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    input: {
      ...numbers,
      concrete: raw.concrete as BeamInput['concrete'],
      steel: raw.steel as BeamInput['steel'],
      tensionEdge: raw.tensionEdge as BeamInput['tensionEdge'],
      source: raw.source.trim(),
    },
  };
}
