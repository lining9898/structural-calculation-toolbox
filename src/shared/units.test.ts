import { describe, expect, it } from 'vitest';
import { formatNumber, kNmToNmm, nmmToKNm } from './units';

describe('弯矩单位边界转换', () => {
  it.each([[1, 1_000_000], [150, 150_000_000], [0.001, 1000], [-2.5, -2_500_000], [0, 0]])('%s kN·m 对应 %s N·mm', (kNm, nmm) => {
    expect(kNmToNmm(kNm)).toBe(nmm);
    expect(nmmToKNm(nmm)).toBe(kNm);
  });
  it('拒绝非有限值和乘法溢出', () => {
    for (const value of [NaN, Infinity, -Infinity, 1e308]) expect(() => kNmToNmm(value)).toThrow();
    expect(() => nmmToKNm(Infinity)).toThrow();
  });
  it('非有限值不以程序错误文本显示', () => {
    expect(formatNumber(NaN)).toBe('—');
    expect(formatNumber(Infinity)).toBe('—');
  });
});
