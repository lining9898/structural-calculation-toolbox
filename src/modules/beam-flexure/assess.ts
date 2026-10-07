import { references } from './references';
import type { Assessment, RawInput } from './types';
import { validateInput } from './validate';

/** 当前只检查输入并给出几何关系；没有材料强度或结构承载力公式。 */
export function assessInput(raw: RawInput): Assessment {
  const validation = validateInput(raw);
  if (!validation.ok) return { status: 'invalid', errors: validation.errors };
  return {
    status: 'pending-references',
    input: validation.input,
    effectiveHeight: validation.input.h - validation.input.a_s,
    missing: references.filter(reference => reference.status === 'pending').map(reference => reference.id),
  };
}
