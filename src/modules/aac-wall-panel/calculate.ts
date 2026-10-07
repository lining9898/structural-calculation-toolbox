import Decimal from 'decimal.js';
import {formatNumber as f} from '../../shared/units';
import {validate} from './validate';
import type {Direction,RawInput,Result,Step} from './types';
const D=Decimal.clone({precision:50});
// 独立AAC模块材料数据：JGJ/T17表3.2.2-1、-2配筋板括号值，表3.2.3、3.2.14。
const grades={'A3.5':{fc:2.02,ft:0.32,ftk:0.45,sand:1900,flyash:1700},'A5.0':{fc:2.89,ft:0.35,ftk:0.49,sand:2300,flyash:2000}};
const steels={HPB300:270,HRB400:360,CRB600H:430};
export function calculate(raw:RawInput):Result{
 const checked=validate(raw);if(!checked.ok)return{status:'invalid',errors:checked.errors};const input=checked.input;
 const grade=grades[input.concrete],material={fc:grade.fc,ft:grade.ft,ftk:grade.ftk,Ec:grade[input.product],fy:steels[input.steel]};
 const steps:Step[]=[{title:'材料设计值与标准值',formula:'按配筋板材料表取值，不采用砌块或普通混凝土表',meaning:'fc、ft、ftk、Ec、fy均为N/mm²；ft是设计值，ftk是标准值。',substitution:`${input.concrete}；${input.steel}；${input.product==='sand'?'砂制品':'粉煤灰制品'}`,result:`fc=${f(material.fc)}，ft=${f(material.ft)}，ftk=${f(material.ftk)}，Ec=${f(material.Ec)}，fy=${f(material.fy)} N/mm²`,references:['materials','steel']},{title:'受力模型与输入口径',formula:'一向、两端简支、无洞口、均布净压力；1 kN/m = 1 N/mm',meaning:'风压为已确定的净压力标准组合值和设计值；不重复乘重要性及分项系数。正风压定义为下侧受拉，负风压为上侧受拉，必须与实际板面确认。',substitution:`b=${f(input.b)} mm，h=${f(input.h)} mm，l₀=${f(input.span)} mm`,result:'仅板身风作用检查；抗震、连接、吊装和完整构造未完成。',references:['exterior']}];
 const directions:Direction[]=[];
 for(const [name,edge,pk,pd,a,As,W]of[['正风压','下侧',input.positiveK,input.positiveD,input.aBottom,input.steelBottom,input.wBottom],['负风压','上侧',input.negativeK,input.negativeD,input.aTop,input.steelTop,input.wTop]] as const){
 if(pk===0&&pd===0)continue;
 const h0=new D(input.h).minus(a),force=new D(material.fy).mul(As),stressWidth=new D(material.fc).mul(input.b),x=force.div(stressWidth),xLimit=h0.mul('0.5');
 const valid=force.mul(2).lte(stressWidth.mul(h0));
 const qk=new D(pk).mul(input.b).div(1000),qd=new D(pd).mul(input.b).div(1000),L=new D(input.span),Mk=qk.mul(L.pow(2)).div(8),Md=qd.mul(L.pow(2)).div(8),Vd=qd.mul(L).div(2);
 const MR=valid?new D('0.75').mul(force).mul(h0.minus(x.div(2))):null;
 const VR=new D('0.45').mul(material.ft).mul(input.b).mul(h0),sigma=Mk.div(W),Bs=new D('0.85').mul(material.Ec).mul(input.i0),B=Bs.div(input.longFactor),delta=new D(5).mul(qk).mul(L.pow(4)).div(new D(384).mul(B)),deltaLimit=L.div(200);
 const all=[h0,x,xLimit,qk,qd,Mk,Md,Vd,VR,sigma,Bs,B,delta,deltaLimit,...MR?[MR]:[]];
 if(all.some(value=>!Number.isFinite(value.toNumber())||value.lt(0))||h0.lte(0)||B.lte(0))return{status:'invalid',errors:{general:'参数数量级超出可处理范围，请检查数值和单位。'}};
 const bendingPass=valid&&Md.mul(stressWidth).mul(2).lte(new D('.75').mul(force).mul(stressWidth.mul(2).mul(h0).minus(force)));
 const checks=[{title:'受压区与公式适用范围',comparison:`x≈${f(x.toNumber())} ≤ 0.5h₀=${f(xLimit.toNumber())} mm`,passed:valid,references:['bending']},{title:'正截面受弯',comparison:MR?`M_d≈${f(Md.div(1e6).toNumber())} ≤ M_R≈${f(MR.div(1e6).toNumber())} kN·m`:'超出受压区范围，不输出有效受弯承载力',passed:bendingPass,references:['bending']},{title:'斜截面受剪',comparison:`V_d≈${f(Vd.div(1000).toNumber())} ≤ V_R≈${f(VR.div(1000).toNumber())} kN`,passed:Vd.lte(VR),references:['shear']},{title:'标准组合抗裂',comparison:`σ≈${f(sigma.toNumber())} ≤ f_tk=${f(material.ftk)} N/mm²（不计自应力有利项）`,passed:Mk.lte(new D(material.ftk).mul(W)),references:['crack']},{title:'考虑长期作用的挠度',comparison:`δ≈${f(delta.toNumber())} ≤ l₀/200=${f(deltaLimit.toNumber())} mm`,passed:new D(5).mul(qk).mul(L.pow(4)).mul(input.longFactor).mul(200).lte(new D(384).mul(Bs).mul(L)),references:['deflection']}];
 const directionSteps:Step[]=[];const step=(title:string,formula:string,meaning:string,substitution:string,result:string,references:string[])=>directionSteps.push({title,formula,meaning,substitution,result,references});
 step('有效高度与受拉面积','h₀=h−a_s','a_s为该侧钢筋合力点距受拉板面距离；不是净保护层。面积为该侧As，不是两侧总面积。',`${f(input.h)}−${f(a)}；A_s=${f(As)} mm²`,`h₀=${f(h0.toNumber())} mm；${edge}受拉`,['bending']);
 step('净风压转线荷载','q=p×b/1000；p为kN/m²，b为mm，q为N/mm','宽度为整块板计算宽度。qk对应标准组合，qd对应设计值。',`qk=${f(pk)}×${f(input.b)}/1000；qd=${f(pd)}×${f(input.b)}/1000`,`qk=${f(qk.toNumber())}；qd=${f(qd.toNumber())} N/mm`,['exterior']);
 step('标准与设计内力','M_k=qk l₀²/8；M_d=qd l₀²/8；V_d=qd l₀/2','均布荷载下两端简支的一向力学关系；不是任意连接条件通用公式。M内部N·mm，V内部N。',`M_k=${f(qk.toNumber())}×${f(input.span)}²/8；M_d=${f(qd.toNumber())}×${f(input.span)}²/8；V_d=${f(qd.toNumber())}×${f(input.span)}/2`,`M_k≈${f(Mk.div(1e6).toNumber())} kN·m；M_d≈${f(Md.div(1e6).toNumber())} kN·m；V_d≈${f(Vd.div(1000).toNumber())} kN`,['exterior']);
 step('受压区高度与限值','fc b x=fy As；x=fy As/(fc b)；x≤0.5h₀','不计受压钢筋贡献；强度N/mm²，长度mm，面积mm²。',`x=${f(material.fy)}×${f(As)}/(${f(material.fc)}×${f(input.b)})`,`x≈${f(x.toNumber())} mm；限值${f(xLimit.toNumber())} mm；${valid?'满足':'超出公式适用范围'}`,['bending']);
 step('受弯承载力','M_R=0.75 fc b x(h₀−x/2)','由5.4.1-1与截面平衡计算；不得套用CECS对称配筋受弯式。',valid?`0.75×${f(material.fc)}×${f(input.b)}×${f(x.toNumber())}×(${f(h0.toNumber())}−${f(x.toNumber())}/2)`:'受压区范围未满足，本式不作为有效抗力输出',MR?`M_R≈${f(MR.toNumber())} N·mm = ${f(MR.div(1e6).toNumber())} kN·m；${bendingPass?'满足':'不满足'}`:'未输出有效受弯抗力',['bending']);
 step('受剪承载力','V_R=0.45 ft b h₀','ft为AAC劈拉强度设计值；不是标准值。',`0.45×${f(material.ft)}×${f(input.b)}×${f(h0.toNumber())}`,`V_R≈${f(VR.toNumber())} N = ${f(VR.div(1000).toNumber())} kN；${Vd.lte(VR)?'满足':'不满足'}`,['shear']);
 step('抗裂检查','σ=M_k/W₀ ≤ f_tk','W₀为对应受拉边缘的未开裂换算截面抵抗矩，单位mm³；不自动扣除CECS自应力。',`${f(Mk.toNumber())}/${f(W)}`,`σ≈${f(sigma.toNumber())} N/mm²；限值${f(material.ftk)} N/mm²；${Mk.lte(new D(material.ftk).mul(W))?'满足':'不满足'}`,['crack']);
 step('短期及长期刚度','Bs=0.85 Ec I₀；B=Bs/η_long；η_long=1+(Mq/Mk)(θ−1)','I₀单位mm⁴；刚度单位N·mm²。η_long由工程师按JGJ5.4.5-2确认；本版不猜Mq、θ，不自动忽略长期作用。',`Bs=0.85×${f(material.Ec)}×${f(input.i0)}；B=Bs/${f(input.longFactor)}`,`Bs≈${f(Bs.toNumber())}；B≈${f(B.toNumber())} N·mm²`,['deflection']);
 step('均布风荷载挠度','δ=5 qk l₀⁴/(384 B) ≤ l₀/200','两端简支一向力学关系；按标准组合及已确认的长期刚度，不采用CECS的支点距/250替代。',`5×${f(qk.toNumber())}×${f(input.span)}⁴/(384×${f(B.toNumber())})`,`δ≈${f(delta.toNumber())} mm；限值${f(deltaLimit.toNumber())} mm；${checks[4].passed?'满足':'不满足'}`,['deflection']);
 directions.push({name,edge,h0:h0.toNumber(),x:x.toNumber(),xLimit:xLimit.toNumber(),modelValid:valid,momentDemand:Md.div(1e6).toNumber(),shearDemand:Vd.div(1000).toNumber(),momentCapacity:MR?.div(1e6).toNumber()??null,shearCapacity:VR.div(1000).toNumber(),stress:sigma.toNumber(),deflection:delta.toNumber(),deflectionLimit:deltaLimit.toNumber(),checks,steps:directionSteps,passed:checks.every(check=>check.passed)});
 }
 return{status:'calculated',input,material,directions,passed:directions.every(direction=>direction.passed),steps};
}
