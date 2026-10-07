import Decimal from "decimal.js";
import { formatNumber as f } from "../../shared/units";
import { validate } from "./validate";
import type { Direction, RawInput, Result, Step } from "./types";
const D = Decimal.clone({ precision: 50 });
// 独立AAC模块材料数据：JGJ/T17表3.2.2-1、-2配筋板括号值，表3.2.3、3.2.14。
const grades = {
  "A3.5": { fc: 2.02, ft: 0.32, ftk: 0.45, sand: 1900, flyash: 1700 },
  "A5.0": { fc: 2.89, ft: 0.35, ftk: 0.49, sand: 2300, flyash: 2000 },
};
const steels = { HPB300: 270, HRB400: 360, CRB600H: 430 };
export function calculate(raw: RawInput): Result {
  const checked = validate(raw);
  if (!checked.ok) return { status: "invalid", errors: checked.errors };
  const input = checked.input;
  const grade = grades[input.concrete],
    material = {
      fc: grade.fc,
      ft: grade.ft,
      ftk: grade.ftk,
      Ec: grade[input.product],
      fy: steels[input.steel],
    };
  const steps: Step[] = [
    {
      title: "材料设计值与标准值",
      formula: "按配筋板材料表取值，不采用砌块或普通混凝土表",
      meaning: "fc、ft、ftk、Ec、fy均为N/mm²；ft是设计值，ftk是标准值。",
      substitution: `${input.concrete}；${input.steel}；${input.product === "sand" ? "砂制品" : "粉煤灰制品"}`,
      result: `fc=${f(material.fc)}，ft=${f(material.ft)}，ftk=${f(material.ftk)}，Ec=${f(material.Ec)}，fy=${f(material.fy)} N/mm²`,
      references: ["materials", "steel"],
    },
    {
      title: "受力模型与输入口径",
      formula: "一向、两端简支、无洞口、均布净压力；1 kN/m = 1 N/mm",
      meaning:
        "仅验算工程师选定控制方向的受拉配筋；竖向板自重沿面内，不加入本页的面外均布风荷载。γ₀及γW各计一次，需求为γ₀M和γ₀V。",
      substitution: `b=${f(input.b)} mm，h=${f(input.h)} mm，l₀=${f(input.span)} mm`,
      result: "仅板身风作用检查；抗震、连接、吊装和完整构造未完成。",
      references: ["exterior"],
    },
  ];
  const As = D.acos(-1)
    .mul(new D(input.diameter).pow(2))
    .div(4)
    .mul(input.count);
  const pk = new D(input.gust)
    .mul(input.local)
    .mul(input.muZ)
    .mul(input.basicWind);
  const pd = pk.mul(input.gammaW).mul(input.gamma0);
  const a = input.a,
    W = input.w;
  const name = "所选控制方向",
    edge = "所选板面";
  const h0 = new D(input.h).minus(a),
    force = new D(material.fy).mul(As),
    stressWidth = new D(material.fc).mul(input.b),
    x = force.div(stressWidth),
    xLimit = h0.mul("0.5");
  const valid = force.mul(2).lte(stressWidth.mul(h0));
  const qk = new D(pk).mul(input.b).div(1000),
    qd = new D(pd).mul(input.b).div(1000),
    L = new D(input.span),
    Mk = qk.mul(L.pow(2)).div(8),
    Md = qd.mul(L.pow(2)).div(8),
    Vd = qd.mul(L).div(2);
  const MR = valid ? new D("0.75").mul(force).mul(h0.minus(x.div(2))) : null;
  const VR = new D("0.45").mul(material.ft).mul(input.b).mul(h0),
    sigma = Mk.div(W),
    Bs = new D("0.85").mul(material.Ec).mul(input.i0),
    B = Bs.div(input.longFactor),
    delta = new D(5).mul(qk).mul(L.pow(4)).div(new D(384).mul(B)),
    deltaLimit = L.div(200);
  const all = [
    h0,
    x,
    xLimit,
    qk,
    qd,
    Mk,
    Md,
    Vd,
    VR,
    sigma,
    Bs,
    B,
    delta,
    deltaLimit,
    ...(MR ? [MR] : []),
  ];
  if (
    all.some((value) => !Number.isFinite(value.toNumber()) || value.lt(0)) ||
    h0.lte(0) ||
    B.lte(0)
  )
    return {
      status: "invalid",
      errors: { general: "参数数量级超出可处理范围，请检查数值和单位。" },
    };
  const bendingPass =
    valid &&
    Md.mul(stressWidth)
      .mul(2)
      .lte(
        new D(".75").mul(force).mul(stressWidth.mul(2).mul(h0).minus(force)),
      );
  const checks = [
    {
      title: "受压区与公式适用范围",
      comparison: `x≈${f(x.toNumber())} ≤ 0.5h₀=${f(xLimit.toNumber())} mm`,
      passed: valid,
      references: ["bending"],
    },
    {
      title: "正截面受弯",
      comparison: MR
        ? `γ₀M≈${f(Md.div(1e6).toNumber())} ≤ M_R≈${f(MR.div(1e6).toNumber())} kN·m`
        : "超出受压区范围，不输出有效受弯承载力",
      passed: bendingPass,
      references: ["bending"],
    },
    {
      title: "斜截面受剪",
      comparison: `γ₀V≈${f(Vd.div(1000).toNumber())} ≤ V_R≈${f(VR.div(1000).toNumber())} kN`,
      passed: Vd.lte(VR),
      references: ["shear"],
    },
    {
      title: "标准组合抗裂",
      comparison: `σ≈${f(sigma.toNumber())} ≤ f_tk=${f(material.ftk)} N/mm²（不计自应力有利项）`,
      passed: Mk.lte(new D(material.ftk).mul(W)),
      references: ["crack"],
    },
    {
      title: "考虑长期作用的挠度",
      comparison: `δ≈${f(delta.toNumber())} ≤ l₀/200=${f(deltaLimit.toNumber())} mm`,
      passed: new D(5)
        .mul(qk)
        .mul(L.pow(4))
        .mul(input.longFactor)
        .mul(200)
        .lte(new D(384).mul(Bs).mul(L)),
      references: ["deflection"],
    },
  ];
  const ratio = As.div(new D(input.b).mul(h0));
  const ratioMax = new D("0.5").mul(material.fc).div(material.fy);
  const directionSteps: Step[] = [];
  const step = (
    title: string,
    formula: string,
    meaning: string,
    substitution: string,
    result: string,
    references: string[],
  ) =>
    directionSteps.push({
      title,
      formula,
      meaning,
      substitution,
      result,
      references,
    });
  step(
    "受拉钢筋面积与有效高度",
    "As=π d² n/4；h₀=h−a_s",
    "d是钢筋公称直径，n是所选受拉板面的根数；a_s是钢筋合力点距受拉板面距离，不是净保护层。",
    `As=π×${f(input.diameter)}²×${input.count}/4；h₀=${f(input.h)}−${f(a)}`,
    `As≈${f(As.toNumber())} mm²；h₀=${f(h0.toNumber())} mm`,
    ["steel", "bending"],
  );
  step(
    "配筋率及受压区限值对应的最大配筋率",
    "ρ=As/(b h₀)；ρmax=0.5 fc/fy；ρ≤ρmax ⇔ x≤0.5h₀",
    "配筋率以有效截面b h₀为分母。本项是5.4.1受压区范围的等价检查，不代表完整构造配筋合格。",
    `ρ=${f(As.toNumber())}/(${f(input.b)}×${f(h0.toNumber())})；ρmax=0.5×${f(material.fc)}/${f(material.fy)}`,
    `ρ≈${f(ratio.mul(100).toNumber())}%；ρmax≈${f(ratioMax.mul(100).toNumber())}%；${valid ? "满足受压区范围" : "超出受压区范围"}`,
    ["bending"],
  );
  step(
    "围护结构控制风荷载标准值",
    "wk=βgz |μsl,net| μz w₀",
    "采用GB 50009围护结构公式；μsl,net是工程师确认内外压不利组合后的净局部体型系数。系数手动查表，不由粗糙度或高度自动生成。",
    `${f(input.gust)}×${f(input.local)}×${f(input.muZ)}×${f(input.basicWind)}；${input.terrain}类，z=${f(input.height)} m`,
    `wk≈${f(pk.toNumber())} kN/m²`,
    ["wind", "windHeight", "windGust", "windLocal", "windInternal"],
  );
  step(
    "单一风作用设计需求",
    "p_d*=γ₀ γW wk；γ₀M=γ₀ γW Mk；γ₀V=γ₀ γW Vk",
    "星号表示用于需求比较的等效压力，已包含板身重要性系数。γW、γ₀由工程师按现行规范及项目要求确认；本版不自动推定组合系数，不计其他作用组合。",
    `${f(input.gamma0)}×${f(input.gammaW)}×${f(pk.toNumber())}`,
    `p_d*≈${f(pd.toNumber())} kN/m²；各系数只乘一次`,
    ["exterior"],
  );
  step(
    "净风压转线荷载",
    "q=p×b/1000；p为kN/m²，b为mm，q为N/mm",
    "宽度为整块板计算宽度。qk对应标准组合，qd对应包含γ₀的设计需求。",
    `qk=${f(pk.toNumber())}×${f(input.b)}/1000；qd=${f(pd.toNumber())}×${f(input.b)}/1000`,
    `qk=${f(qk.toNumber())}；qd=${f(qd.toNumber())} N/mm`,
    ["exterior"],
  );
  step(
    "标准内力与包含γ₀的设计需求",
    "M_k=qk l₀²/8；γ₀M=qd l₀²/8；γ₀V=qd l₀/2",
    "均布荷载下两端简支的一向力学关系；不是任意连接条件通用公式。M内部N·mm，V内部N。",
    `M_k=${f(qk.toNumber())}×${f(input.span)}²/8；γ₀M=${f(qd.toNumber())}×${f(input.span)}²/8；γ₀V=${f(qd.toNumber())}×${f(input.span)}/2`,
    `M_k≈${f(Mk.div(1e6).toNumber())} kN·m；γ₀M≈${f(Md.div(1e6).toNumber())} kN·m；γ₀V≈${f(Vd.div(1000).toNumber())} kN`,
    ["exterior"],
  );
  step(
    "受压区高度与限值",
    "fc b x=fy As；x=fy As/(fc b)；x≤0.5h₀",
    "不计受压钢筋贡献；强度N/mm²，长度mm，面积mm²。",
    `x=${f(material.fy)}×${f(As.toNumber())}/(${f(material.fc)}×${f(input.b)})`,
    `x≈${f(x.toNumber())} mm；限值${f(xLimit.toNumber())} mm；${valid ? "满足" : "超出公式适用范围"}`,
    ["bending"],
  );
  step(
    "受弯承载力",
    "M_R=0.75 fc b x(h₀−x/2)",
    "由5.4.1-1与截面平衡计算；不得套用CECS对称配筋受弯式。",
    valid
      ? `0.75×${f(material.fc)}×${f(input.b)}×${f(x.toNumber())}×(${f(h0.toNumber())}−${f(x.toNumber())}/2)`
      : "受压区范围未满足，本式不作为有效抗力输出",
    MR
      ? `M_R≈${f(MR.toNumber())} N·mm = ${f(MR.div(1e6).toNumber())} kN·m；${bendingPass ? "满足" : "不满足"}`
      : "未输出有效受弯抗力",
    ["bending"],
  );
  step(
    "受剪承载力",
    "V_R=0.45 ft b h₀",
    "ft为AAC劈拉强度设计值；不是标准值。",
    `0.45×${f(material.ft)}×${f(input.b)}×${f(h0.toNumber())}`,
    `V_R≈${f(VR.toNumber())} N = ${f(VR.div(1000).toNumber())} kN；${Vd.lte(VR) ? "满足" : "不满足"}`,
    ["shear"],
  );
  step(
    "抗裂检查",
    "σ=M_k/W₀ ≤ f_tk",
    "W₀为对应受拉边缘的未开裂换算截面抵抗矩，单位mm³；不自动扣除CECS自应力。",
    `${f(Mk.toNumber())}/${f(W)}`,
    `σ≈${f(sigma.toNumber())} N/mm²；限值${f(material.ftk)} N/mm²；${Mk.lte(new D(material.ftk).mul(W)) ? "满足" : "不满足"}`,
    ["crack"],
  );
  step(
    "短期及长期刚度",
    "Bs=0.85 Ec I₀；B=Bs/η_long；η_long=1+(Mq/Mk)(θ−1)",
    "I₀单位mm⁴；刚度单位N·mm²。η_long由工程师按JGJ5.4.5-2确认；本版不猜Mq、θ，不自动忽略长期作用。",
    `Bs=0.85×${f(material.Ec)}×${f(input.i0)}；B=Bs/${f(input.longFactor)}`,
    `Bs≈${f(Bs.toNumber())}；B≈${f(B.toNumber())} N·mm²`,
    ["deflection"],
  );
  step(
    "均布风荷载挠度",
    "δ=5 qk l₀⁴/(384 B) ≤ l₀/200",
    "两端简支一向力学关系；按标准组合及已确认的长期刚度，不采用CECS的支点距/250替代。",
    `5×${f(qk.toNumber())}×${f(input.span)}⁴/(384×${f(B.toNumber())})`,
    `δ≈${f(delta.toNumber())} mm；限值${f(deltaLimit.toNumber())} mm；${checks[4].passed ? "满足" : "不满足"}`,
    ["deflection"],
  );
  const direction: Direction = {
    name,
    edge,
    area: As.toNumber(),
    reinforcementRatio: ratio.mul(100).toNumber(),
    maxReinforcementRatio: ratioMax.mul(100).toNumber(),
    windStandard: pk.toNumber(),
    windDesign: pd.toNumber(),
    standardMoment: Mk.div(1e6).toNumber(),
    h0: h0.toNumber(),
    x: x.toNumber(),
    xLimit: xLimit.toNumber(),
    modelValid: valid,
    momentDemand: Md.div(1e6).toNumber(),
    shearDemand: Vd.div(1000).toNumber(),
    momentCapacity: MR?.div(1e6).toNumber() ?? null,
    shearCapacity: VR.div(1000).toNumber(),
    stress: sigma.toNumber(),
    deflection: delta.toNumber(),
    deflectionLimit: deltaLimit.toNumber(),
    checks,
    steps: directionSteps,
    passed: checks.every((check) => check.passed),
  };
  return {
    status: "calculated",
    input,
    material,
    direction,
    passed: direction.passed,
    steps,
  };
}
