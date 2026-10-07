import { describe, it, expect } from "vitest";
import { calculate } from "./calculate";
import { numericFields } from "./types";
import type { RawInput, NumericKey } from "./types";
const sample: RawInput = {
  b: "600",
  h: "200",
  span: "3000",
  a: "35",
  diameter: "8",
  count: "4",
  concrete: "A5.0",
  steel: "CRB600H",
  product: "sand",
  terrain: "B",
  basicWind: "0.45",
  height: "10",
  muZ: "1",
  gust: "1.7",
  local: "1.2",
  gammaW: "1.5",
  gamma0: "1",
  i0: "463826524.06275657",
  w: "5051634.847206384",
  longFactor: "1",
  source: "独立复核参考荷载与模型",
  sectionSource: "单侧配筋换算截面参考，I₀和W₀手动确认",
  model: true,
  windBasis: true,
  sectionBasis: true,
};
function result(change: Partial<RawInput> = {}) {
  const r = calculate({ ...sample, ...change });
  if (r.status !== "calculated")
    throw new Error("预期有效输入：" + JSON.stringify(r));
  return r;
}
// Independent expectations calculated with Python Decimal, not copied from program output.
describe("单控制方向AAC参考算例", () => {
  it("JGJ配筋板材料、砂与粉煤灰品种及钢筋设计值独立取值", () => {
    expect(result().material).toEqual({
      fc: 2.89,
      ft: 0.35,
      ftk: 0.49,
      Ec: 2300,
      fy: 430,
    });
    expect(result({ concrete: "A3.5", steel: "HPB300" }).material).toEqual({
      fc: 2.02,
      ft: 0.32,
      ftk: 0.45,
      Ec: 1900,
      fy: 270,
    });
    expect(result({ product: "flyash" }).material.Ec).toBe(2000);
    expect(result({ concrete: "A3.5", product: "flyash" }).material.Ec).toBe(
      1700,
    );
    expect(result({ steel: "HRB400" }).material.fy).toBe(360);
  });
  it("直径与根数计算面积、配筋率，不使用舍入面积201.1计算抗力", () => {
    const d = result().direction;
    expect(d.area).toBeCloseTo(201.06192982974677, 11);
    expect(d.reinforcementRatio).toBeCloseTo(0.2030928584138856, 12);
    expect(d.maxReinforcementRatio).toBeCloseTo(0.33604651162790696, 12);
    expect(d.h0).toBe(165);
    expect(d.x).toBeCloseTo(49.85964811233628, 11);
    expect(d.xLimit).toBe(82.5);
    expect(result({ count: "2" }).direction.area).toBe(d.area / 2);
    expect(result({ diameter: "4" }).direction.area).toBe(d.area / 4);
  });
  it("围护风公式、标准内力及设计作用系数各计一次", () => {
    const d = result().direction;
    expect(d.windStandard).toBe(0.918);
    expect(d.windDesign).toBe(1.377);
    expect(d.standardMoment).toBe(0.61965);
    expect(d.momentDemand).toBe(0.929475);
    expect(d.shearDemand).toBe(1.2393);
    expect(result({ gamma0: "1.1" }).direction.momentDemand).toBe(1.0224225);
    expect(result({ gammaW: "2" }).direction.windStandard).toBe(0.918);
  });
  it("强度、抗裂、长期挠度及单位正确", () => {
    const r = result(),
      d = r.direction;
    expect(d.momentCapacity).toBeCloseTo(9.082496513512029, 11);
    expect(d.shearCapacity).toBe(15.5925);
    expect(d.stress).toBeCloseTo(0.12266326025973038, 12);
    expect(d.deflection).toBeCloseTo(0.6406419721918065, 12);
    expect(d.deflectionLimit).toBe(15);
    expect(r.passed).toBe(true);
  });
  it("高度与粗糙度只记录，不暗中覆盖人工查表系数", () => {
    expect(result({ height: "50", terrain: "D" }).direction.windStandard).toBe(
      0.918,
    );
    expect(result({ muZ: "2" }).direction.windStandard).toBe(1.836);
    expect(result({ gust: "2" }).direction.windStandard).toBe(1.08);
  });
  it("单方向完整过程包含面积、风公式、代入、单位与条文映射", () => {
    const r = result();
    expect("directions" in r).toBe(false);
    for (const step of [...r.steps, ...r.direction.steps])
      expect(
        step.formula &&
          step.meaning &&
          step.substitution &&
          step.result &&
          step.references.length,
      ).toBeTruthy();
    expect(r.direction.checks).toHaveLength(5);
    expect(r.direction.steps.some((s) => s.references.includes("wind"))).toBe(
      true,
    );
  });
});
describe("边界与不满足结果，判断不放宽限值", () => {
  it("受压区边界两侧；超限不输出有效受弯承载力", () => {
    expect(result({ diameter: "10.29063931" }).direction.modelValid).toBe(true);
    const d = result({ diameter: "10.29063933" }).direction;
    expect(d.modelValid).toBe(false);
    expect(d.momentCapacity).toBeNull();
    expect(d.checks[1].passed).toBe(false);
  });
  it("受弯需求超过抗力保留不满足过程", () => {
    const r = result({ gammaW: "20" });
    expect(r.passed).toBe(false);
    expect(r.direction.checks[1].passed).toBe(false);
  });
  it("受弯极限两侧严格比较，不使用显示舍入的9.08作为抗力", () => {
    // Independent critical γW = 14.65746229889781189… for this fixture.
    expect(result({ gammaW: "14.65746229" }).direction.checks[1].passed).toBe(
      true,
    );
    expect(result({ gammaW: "14.65746231" }).direction.checks[1].passed).toBe(
      false,
    );
  });
  it("抗裂等限值通过，略超不通过", () => {
    const change = {
      basicWind: "1",
      muZ: "1",
      gust: "1",
      local: "1.96",
      w: "2700000",
    };
    expect(result(change).direction.stress).toBe(0.49);
    expect(result(change).direction.checks[3].passed).toBe(true);
    expect(
      result({ ...change, local: "1.96000001" }).direction.checks[3].passed,
    ).toBe(false);
  });
  it("受剪等限值通过，略超不通过", () => {
    const change = {
      basicWind: "1",
      muZ: "1",
      gust: "1",
      local: "17.325",
      gammaW: "1",
      gamma0: "1",
    };
    expect(result(change).direction.shearDemand).toBe(15.5925);
    expect(result(change).direction.checks[2].passed).toBe(true);
    expect(
      result({ ...change, local: "17.32500001" }).direction.checks[2].passed,
    ).toBe(false);
  });
  it("挠度等限值及略超严格比较", () => {
    const change = {
      concrete: "A3.5",
      span: "1000",
      i0: "225000000",
      longFactor: "1.5",
      basicWind: "1",
      muZ: "1",
      gust: "1",
      local: "155.04",
    };
    expect(result(change).direction.deflection).toBe(5);
    expect(result(change).direction.checks[4].passed).toBe(true);
    expect(
      result({ ...change, local: "155.04000001" }).direction.checks[4].passed,
    ).toBe(false);
  });
  it("标准风压过大抗裂与挠度不满足；长期增大只影响挠度", () => {
    const a = result().direction,
      b = result({ longFactor: "2" }).direction;
    expect(b.deflection).toBe(a.deflection * 2);
    expect(b.momentDemand).toBe(a.momentDemand);
    const d = result({ local: "100" }).direction;
    expect(d.checks[3].passed).toBe(false);
    expect(d.checks[4].passed).toBe(false);
  });
  it("基本风压0.30边界接受，低于该值拒绝", () => {
    expect(result({ basicWind: "0.3" }).status).toBe("calculated");
    expect(calculate({ ...sample, basicWind: "0.29999999" }).status).toBe(
      "invalid",
    );
  });
});
describe("非法输入与不适用模型", () => {
  it.each(Object.keys(numericFields) as NumericKey[])(
    "%s必须为有限正数",
    (key) => {
      for (const value of ["", "NaN", "Infinity", "0", "-1", "0x10"])
        expect(calculate({ ...sample, [key]: value }).status).toBe("invalid");
    },
  );
  it.each(["model", "windBasis", "sectionBasis"] as const)(
    "未确认%s不计算",
    (key) =>
      expect(calculate({ ...sample, [key]: false }).status).toBe("invalid"),
  );
  it.each([
    { concrete: "C30" },
    { steel: "HRB500" },
    { product: "unknown" },
    { terrain: "E" },
    { a: "200" },
    { a: "3" },
    { diameter: "200" },
    { count: "4.5" },
    { count: "1e20" },
    { longFactor: "0.99" },
    { gammaW: "0.5" },
    { source: "" },
    { sectionSource: "" },
    { span: "1e100" },
  ])("拒绝错误或不适用输入%j", (change) =>
    expect(calculate({ ...sample, ...change }).status).toBe("invalid"),
  );
});
