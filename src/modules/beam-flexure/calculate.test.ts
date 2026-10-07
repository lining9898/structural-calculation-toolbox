import { describe, expect, it } from 'vitest';
import { calculateBeamFlexure } from './calculate';
import { references } from './references';
import type { RawInput } from './types';
const normal: RawInput = { b:'250',h:'500',a_s:'40',A_s:'1256',M_d:'150',concrete:'C30',steel:'HRB400',tensionEdge:'bottom',source:'测试组合，已包含重要性因素',beamType:'ordinary',singleReinforced:true,nonPrestressed:true,noSeismicCheck:true,ordinaryStatic:true,notDeepBeam:true,demandIncludesImportance:true };
function result(change: Partial<RawInput> = {}) {
  const r = calculateBeamFlexure({...normal,...change});
  if(r.status !== 'calculated') throw new Error(`预期完成计算，实际为 ${r.status}`);
  return r;
}
describe('受弯承载力：独立高精度展开式参考算例', () => {
  it('正常算例材料、内力、几何、中间量、单位与结论', () => {
    const r=result();
    expect(r.intermediate).toMatchObject({fc:14.3,ft:1.43,fy:360,Es:200000,h0:460,tension:452160,minimumSteel:250,rhoMin:0.002});
    expect(r.intermediate.x).toBeCloseTo(126.47832167832168,11);
    expect(r.intermediate.xiB).toBeCloseTo(0.5176470588235294,14);
    expect(r.intermediate.xB).toBeCloseTo(238.11764705882354,11);
    expect(r.intermediate.compression).toBe(r.intermediate.tension);
    expect(r.leverArm).toBeCloseTo(396.76083916083916,11);
    expect(r.capacityKNm).toBeCloseTo(179.39938103496503,10);
    expect(r.momentNmm).toBeCloseTo(179399381.03496503,5);
    expect(r.passed).toBe(true);
    expect(r.checks.every(c=>c.passed)).toBe(true);
    expect(r.checks.find(c=>c.id==='capacity')?.actual).toBe(150000000);
  });
  it('HRB500与C35组合',()=>{
    const r=result({b:'300',h:'600',a_s:'50',A_s:'1000',M_d:'200',concrete:'C35',steel:'HRB500'});
    expect(r.intermediate.fy).toBe(435);
    expect(r.intermediate.x).toBeCloseTo(86.82634730538922,11);
    expect(r.capacityKNm).toBeCloseTo(220.36526946107784,10);
    expect(r.passed).toBe(true);
  });
  it('承载力不足保留完整结果并标记不满足',()=>{
    const r=result({b:'200',h:'400',a_s:'35',A_s:'800',M_d:'90',concrete:'C25'});
    expect(r.capacityKNm).toBeCloseTo(87.69478991596639,10);
    expect(r.passed).toBe(false);
    expect(r.checks.find(c=>c.id==='capacity')?.passed).toBe(false);
    expect(r.steps.find(s=>s.id==='comparison')?.result).toContain('不满足');
  });
  it('所有步骤的引用均存在且确认，过程包含公式代入和结果',()=>{
    for(const s of result().steps) {
      expect(s.formula && s.parameters && s.substitution && s.result).toBeTruthy();
      for(const id of s.referenceIds) expect(references.find(r=>r.id===id)?.status).toBe('confirmed');
    }
  });
});
describe('严格边界，无放宽容差',()=>{
  const balanced={b:'360',h:'465',a_s:'40',A_s:'3146',M_d:'356.7564'};
  it('受压区高度恰等限值、弯矩恰等承载力通过',()=>{
    const r=result(balanced);
    expect(r.intermediate.x).toBe(220);
    expect(r.intermediate.xB).toBe(220);
    expect(r.capacityKNm).toBeCloseTo(356.7564,10);
    expect(r.passed).toBe(true);
  });
  it('受压区高度略超限禁止输出承载力',()=>{
    const r=calculateBeamFlexure({...normal,...balanced,A_s:'3146.000001'});
    expect(r.status).toBe('outside-model');
    if(r.status==='outside-model') expect(r.capacityKNm).toBeNull();
  });
  it('受压区高度略低限允许计算',()=>expect(result({...balanced,A_s:'3145.999999',M_d:'1'}).passed).toBe(true));
  it('弯矩略超限不满足，略低限满足',()=>{
    expect(result({...balanced,M_d:'356.75640001'}).passed).toBe(false);
    expect(result({...balanced,M_d:'356.75639999'}).passed).toBe(true);
  });
  it('0.20%最小配筋率等值与两侧',()=>{
    expect(result({A_s:'250',M_d:'1'}).passed).toBe(true);
    const low=result({A_s:'249.999999',M_d:'1'});
    expect(low.passed).toBe(false); expect(low.capacityKNm).toBeNull();
    expect(result({A_s:'250.000001',M_d:'1'}).passed).toBe(true);
  });
  it('0.45ft/fy控制最小配筋率等值与两侧',()=>{
    const change={concrete:'C50',b:'200',h:'400',A_s:'189',M_d:'1'};
    const r=result(change);expect(r.intermediate.rhoMin).toBe(0.0023625);expect(r.intermediate.minimumSteel).toBe(189);expect(r.passed).toBe(true);
    expect(result({...change,A_s:'188.999999'}).capacityKNm).toBeNull();
    expect(result({...change,A_s:'189.000001'}).passed).toBe(true);
  });
  it('框架梁200mm边界与普通梁区别',()=>{
    expect(result({b:'200',beamType:'frame'}).passed).toBe(true);
    expect(result({b:'199.999',beamType:'frame'}).capacityKNm).toBeNull();
    expect(result({b:'199.999',beamType:'ordinary'}).capacityKNm).not.toBeNull();
  });
});
describe('适用条件与单位',()=>{
  it.each(['ordinaryStatic','notDeepBeam','demandIncludesImportance'] as const)('缺少%s确认不计算',key=>expect(calculateBeamFlexure({...normal,[key]:false}).status).toBe('invalid'));
  it('HRB500+C25拒绝',()=>expect(calculateBeamFlexure({...normal,steel:'HRB500',concrete:'C25'}).status).toBe('invalid'));
  it('截面乘积溢出拒绝',()=>expect(calculateBeamFlexure({...normal,b:'1e200',h:'1e200'}).status).toBe('invalid'));
  it('钢筋面积达到截面面积拒绝',()=>expect(calculateBeamFlexure({...normal,A_s:'125000'}).status).toBe('invalid'));
  it('需求不重复乘重要性系数，受拉边不改变单筋承载力',()=>{
    expect(result({tensionEdge:'top'}).capacityKNm).toBe(result().capacityKNm);
    expect(result({M_d:'180'}).passed).toBe(false);
  });
});
