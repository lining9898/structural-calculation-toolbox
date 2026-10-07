import { describe, expect, it } from 'vitest';
import { calculateBeamFlexure } from './calculate';
import { references } from './references';
import type { RawInput } from './types';
import { validateInput } from './validate';

const valid: RawInput = { b: '250', h: '500', a_s: '40', A_s: '1256', M_d: '150', concrete: 'C30', steel: 'HRB400', tensionEdge: 'bottom', source: '人工填写的外部设计组合', singleReinforced: true, nonPrestressed: true, noSeismicCheck: true, ordinaryStatic: true, notDeepBeam: true, demandIncludesImportance: true, beamType: 'ordinary' };

describe('受弯模块输入检查（不代表规范验算）', () => {
  it('读取正常输入，不擅自生成材料强度', () => {
    const result = validateInput(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.b).toBe(250);
      expect(result.input.M_d).toBe(150);
      expect(result.input).not.toHaveProperty('f_c');
      expect(result.input).not.toHaveProperty('f_y');
    }
  });
  it.each(['b', 'h', 'a_s', 'A_s', 'M_d'] as const)('%s 拒绝空、非有限、非数字、零和负值', key => {
    for (const value of ['', ' ', 'NaN', 'Infinity', '1e999', '0', '-1', '0x10', 'abc']) {
      const result = validateInput({ ...valid, [key]: value });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors[key]).toBeTruthy();
    }
  });
  it.each(['500', '500.001', '600'])('合力点距离 %s mm 达到或超过总高时拒绝', a_s => {
    const result = validateInput({ ...valid, a_s });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.a_s).toContain('必须小于梁高');
  });
  it('正有效高度的几何边界可通过输入检查，但不能成为承载力合格结论', () => {
    const result = calculateBeamFlexure({ ...valid, a_s: '499.999' });
    expect(result.status).toBe('outside-model');
    if (result.status === 'outside-model') expect(result.intermediate.h0).toBeCloseTo(0.001, 10);
  });
  it('弯矩换算溢出时拒绝，返回普通中文提示', () => {
    const result = validateInput({ ...valid, M_d: '1e308' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.M_d).toContain('超出可处理范围');
  });
  it.each([{ concrete: 'C999' }, { steel: 'HRB999' }, { tensionEdge: 'left' }, { source: '  ' }, { singleReinforced: false }, { nonPrestressed: false }, { noSeismicCheck: false }])('拒绝不存在选项、缺少来源或不适用模型：%j', change => {
    expect(validateInput({ ...valid, ...change }).ok).toBe(false);
  });
  it('接收科学计数法并明确其数值', () => {
    const result = validateInput({ ...valid, A_s: '1.256e3' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.input.A_s).toBe(1256);
  });
});

describe('规范映射与非法输入隔离', () => {
  it('非法输入不能获得中间结果或承载力', () => {
    const result = calculateBeamFlexure({ ...valid, b: '-1' });
    expect(result.status).toBe('invalid');
    expect(result).not.toHaveProperty('intermediate');
    expect(result).not.toHaveProperty('capacityKNm');
  });
  it('原文页序绑定已确认的条表', () => {
    const minimum = references.find(reference => reference.id === 'minimum-steel')!;
    expect(minimum.filePage).toBe(13);
    expect(minimum.printedPage).toBe('10—11');
    expect(minimum.status).toBe('confirmed');
    expect(references.every(reference => reference.pdfUrl && reference.filePage)).toBe(true);
  });
});
