import { concreteMaterials, steelMaterials } from '../../shared/materials';
import Decimal from 'decimal.js';
import { formatNumber as f, kNmToNmm, nmmToKNm } from '../../shared/units';
import type { CalculationResult, CalculationStep, Check, Intermediate, RawInput } from './types';
import { validateInput } from './validate';

const D = Decimal.clone({ precision: 50 });

/** 单筋矩形截面受弯；系数与公式只在本模块内。按未舍入数值比较，无放宽容差。 */
export function calculateBeamFlexure(raw: RawInput): CalculationResult {
  const validated = validateInput(raw);
  if (!validated.ok) return { status: 'invalid', errors: validated.errors };
  const input = validated.input;
  const { b, h, a_s, A_s, M_d } = input;
  const { fc, ft } = concreteMaterials[input.concrete];
  const { fy, Es } = steelMaterials[input.steel];
  const alpha1 = 1.0;
  const beta1 = 0.80;
  const epsilonCu = 0.0033;
  const gammaRd = 1.0;
  const h0D = new D(h).minus(a_s);
  const stressWidth = new D(alpha1).mul(fc).mul(b);
  const elasticStrain = new D(Es).mul(epsilonCu);
  const force = new D(fy).mul(A_s);
  const area = new D(b).mul(h);
  const xiBD = new D(beta1).div(new D(1).plus(new D(fy).div(elasticStrain)));
  const xD = force.div(stressWidth);
  const h0 = h0D.toNumber();
  const xiB = xiBD.toNumber();
  const xB = xiBD.mul(h0D).toNumber();
  const tension = force.toNumber();
  const x = xD.toNumber();
  const compression = stressWidth.mul(xD).toNumber();
  const rho = new D(A_s).div(area).toNumber();
  const rhoMinD = D.max('0.002', new D('0.45').mul(ft).div(fy));
  const rhoMin = rhoMinD.toNumber();
  const minimumSteel = rhoMinD.mul(area).toNumber();
  // 等价交叉乘积：不依赖无限循环小数舍入，不添加任何放宽容差。
  const withinCompressionZone = force.mul(elasticStrain.plus(fy)).lte(stressWidth.mul(beta1).mul(h0D).mul(elasticStrain));
  const meetsMinimumSteel = new D(A_s).gte(area.mul('0.002')) && force.gte(new D('0.45').mul(ft).mul(area));
  const intermediate: Intermediate = { fc, ft, fy, Es, alpha1, beta1, epsilonCu, gammaRd, h0, xiB, xB, tension, compression, x, rho, rhoMin, minimumSteel };
  if (Object.values(intermediate).some(value => !Number.isFinite(value) || value <= 0)) {
    return { status: 'invalid', errors: { general: '参数数量级导致计算超出可处理范围，请检查数值与单位。' } };
  }
  const checks: Check[] = [];
  if (input.beamType === 'frame') checks.push({ id: 'width', name: '框架梁最小宽度', actual: b, limit: 200, unit: 'mm', operator: '≥', passed: b >= 200, referenceIds: ['frame-width'] });
  checks.push({ id: 'compression-zone', name: '受压区高度与模型范围', actual: x, limit: xB, unit: 'mm', operator: '≤', passed: withinCompressionZone, referenceIds: ['compression-limit', 'model-exception'] });
  checks.push({ id: 'minimum-steel', name: '最小配筋面积', actual: A_s, limit: minimumSteel, unit: 'mm²', operator: '≥', passed: meetsMinimumSteel, referenceIds: ['minimum-steel'] });
  const steps: CalculationStep[] = [];
  const step = (id: string, title: string, formula: string, parameters: string, substitution: string, result: string, referenceIds: string[]) => steps.push({ id, title, formula, parameters, substitution, result, referenceIds });
  step('materials', '材料设计值与适用组合', '按确认的材料表取 f_c、f_t、f_y、E_s', '强度和弹性模量单位均为 N/mm²；钢筋牌号数字不直接代入 f_y。', `${input.concrete}；${input.steel}`, `f_c=${f(fc)}；f_t=${f(ft)}；f_y=${f(fy)}；E_s=${f(Es)} N/mm²`, ['material-grade', 'concrete-fc', 'concrete-ft', 'steel-fy', 'steel-modulus']);
  if (input.beamType === 'frame') step('width', '框架梁宽度', 'b ≥ 200 mm', 'b 为矩形框架梁截面宽度。普通梁不套用此项框架梁限制。', `${f(b)} ≥ 200 mm`, b >= 200 ? '满足' : '不满足；不输出有效设计承载力', ['frame-width']);
  step('height', '有效高度', 'h₀ = h − a_s', 'h 为截面总高；a_s 为受拉钢筋合力点至受拉边距离，单位 mm。', `h₀ = ${f(h)} − ${f(a_s)}`, `${f(h0)} mm`, ['geometry']);
  step('coefficients', '等效应力图与极限压应变', 'α₁=1.0；β₁=0.80；ε_cu=0.0033', '均无量纲，仅采用 C25—C50、非均匀受压；不扩展到更高等级。', `${input.concrete} ≤ C50`, 'α₁=1；β₁=0.8；ε_cu=0.0033', ['stress-block', 'ultimate-strain']);
  step('xi-b', '界限相对受压区高度', 'ξ_b = β₁ / (1 + f_y / (E_s ε_cu))', 'ξ_b 无量纲；f_y、E_s 均为 N/mm²；本模型为单一牌号有屈服点普通钢筋。', `ξ_b = ${f(beta1)} / (1 + ${f(fy)} / (${f(Es)} × ${f(epsilonCu)}))`, `≈ ${f(xiB)}`, ['balanced-zone']);
  step('x-b', '界限受压区高度', 'x_b = ξ_b h₀', 'x_b、h₀ 单位 mm；ξ_b 为上一未舍入结果。', `x_b ≈ ${f(xiB)} × ${f(h0)}`, `≈ ${f(xB)} mm`, ['balanced-zone']);
  step('forces', '受拉合力与受压区高度', 'T=f_y A_s；C=α₁ f_c b x=T；x=f_y A_s/(α₁ f_c b)', 'T、C 单位 N；x、b 单位 mm；A_s 单位 mm²；强度 N/mm²。预应力与受压筋项置零。', `T=${f(fy)} × ${f(A_s)}；x=${f(fy)} × ${f(A_s)} / (${f(alpha1)} × ${f(fc)} × ${f(b)})`, `T≈${f(tension)} N；C≈${f(compression)} N；x≈${f(x)} mm`, ['equilibrium']);
  step('compression-zone', '受压区高度验算', 'x ≤ x_b = ξ_b h₀', '两侧单位 mm；临界判断使用等价交叉乘积，不以显示舍入值比较。', `${f(x)} ≤ ${f(xB)} mm；限值−实际≈${f(xB - x)} mm`, withinCompressionZone ? '满足当前简化模型范围' : '超出当前简化模型范围；不输出有效承载力，不直接等同一般截面不合格', ['compression-limit', 'model-exception']);
  step('reinforcement', '实配与最小配筋', 'ρ=A_s/(b h)；ρ_min=max(0.002,0.45f_t/f_y)；A_s,min=ρ_min b h', '配筋率内部为无量纲小数，显示乘100为%；面积 mm²；本梁不采用特定板类0.15%例外。', `ρ=${f(A_s)}/(${f(b)}×${f(h)})；ρ_min=max(0.002,0.45×${f(ft)}/${f(fy)})；A_s,min≈${f(rhoMin)}×${f(b)}×${f(h)}`, `ρ≈${f(rho * 100)}%；ρ_min≈${f(rhoMin * 100)}%；A_s,min≈${f(minimumSteel)} mm²`, ['minimum-steel', 'minimum-steel-amendment']);
  step('minimum-steel', '最小配筋比较', 'A_s ≥ A_s,min（等价于 ρ ≥ ρ_min）', '分别检查 A_s≥0.002bh 和 f_yA_s≥0.45f_tbh；不以显示舍入值比较。', `${f(A_s)} ≥ ${f(minimumSteel)} mm²；实际−限值≈${f(A_s - minimumSteel)} mm²`, meetsMinimumSteel ? '满足' : '不满足；不输出有效设计承载力', ['minimum-steel']);

  if (!withinCompressionZone) return { status: 'outside-model', input, intermediate, checks, steps, capacityKNm: null };
  if (checks.some(check => !check.passed)) {
    step('withheld', '承载力输出条件', '材料、模型范围及前置规范条件均满足后，才输出有效设计承载力', '当前最小配筋或框架梁宽度不满足。', '前置规范检查不通过', '不满足；承载力不输出', ['capacity', 'minimum-steel']);
    return { status: 'calculated', input, intermediate, checks, steps, passed: false, capacityKNm: null, leverArm: null, momentNmm: null };
  }
  const leverArmD = h0D.minus(xD.div(2));
  const leverArm = leverArmD.toNumber();
  const momentNmm = force.mul(leverArmD).toNumber();
  const resistanceNmm = force.mul(leverArmD).div(gammaRd).toNumber();
  const capacityKNm = nmmToKNm(resistanceNmm);
  if (![leverArm, momentNmm, resistanceNmm, capacityKNm].every(value => Number.isFinite(value) && value > 0)) {
    return { status: 'invalid', errors: { general: '承载力计算超出可处理范围，请检查参数数值及单位。' } };
  }
  const demandNmm = kNmToNmm(M_d);
  const demandD = new D(M_d).mul(1_000_000);
  const passed = demandD.mul(gammaRd).mul(2).mul(stressWidth).lte(stressWidth.mul(2).mul(force).mul(h0D).minus(force.pow(2)));
  checks.push({ id: 'capacity', name: '正截面受弯承载力', actual: demandNmm, limit: resistanceNmm, unit: 'N·mm', operator: '≤', passed, referenceIds: ['demand', 'resistance-factor', 'capacity'] });
  step('lever-arm', '拉压合力臂', 'z=h₀−x/2', 'z、h₀、x 单位 mm；x 为未舍入受压区高度。', `z≈${f(h0)}−${f(x)}/2`, `≈${f(leverArm)} mm`, ['capacity']);
  step('capacity', '截面弯矩抗力与抗力设计值', 'M_u=α₁ f_c b x(h₀−x/2)；M_R=M_u/γ_Rd；γ_Rd=1.0', 'M_u、M_R 单位 N·mm；γ_Rd 无量纲，仅适用于已确认普通静力模型。', `M_u≈${f(alpha1)}×${f(fc)}×${f(b)}×${f(x)}×${f(leverArm)}；M_R=M_u/1`, `M_u≈${f(momentNmm)} N·mm；M_R≈${f(resistanceNmm)} N·mm`, ['capacity', 'demand', 'resistance-factor']);
  step('units', '弯矩单位换算', '1 kN·m=10⁶ N·mm', '输入、输出 kN·m；内部 N·mm；在边界集中换算。', `M_R≈${f(resistanceNmm)}/10⁶；M_d=${f(M_d)}×10⁶`, `M_R≈${f(capacityKNm)} kN·m；M_d≈${f(demandNmm)} N·mm`, []);
  step('comparison', '设计需求与承载力比较', 'M_d ≤ M_R；输入 M_d 已包含 γ₀S，不再重复乘 γ₀', '两侧单位 N·mm；γ₀因素处理由工程师确认并在来源说明中记录。', `${f(demandNmm)} ≤ ${f(resistanceNmm)} N·mm；抗力−需求≈${f(resistanceNmm - demandNmm)} N·mm`, passed ? '满足本模块已检查项目' : '不满足正截面受弯承载力要求', ['demand', 'capacity']);
  return { status: 'calculated', input, intermediate, checks, steps, passed, capacityKNm, leverArm, momentNmm };
}
