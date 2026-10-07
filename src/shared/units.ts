/** 内部使用 N、mm、N·mm；仅在输入、输出边界换算。 */
export function kNmToNmm(value: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(value * 1_000_000)) {
    throw new RangeError('弯矩数值超出可处理范围。');
  }
  return value * 1_000_000;
}

export function nmmToKNm(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('弯矩数值超出可处理范围。');
  return value / 1_000_000;
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('zh-CN', { maximumSignificantDigits: 8 }).format(value);
}
