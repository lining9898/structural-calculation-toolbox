import { describe, it, expect } from "vitest";
import { calculate } from "./calculate";
import type { RawInput } from "./types";
const sample: RawInput = {
  b: "600",
  h: "150",
  span: "3000",
  aBottom: "25",
  aTop: "25",
  steelBottom: "100",
  steelTop: "100",
  concrete: "A3.5",
  steel: "HPB300",
  product: "sand",
  i0: "225000000",
  wBottom: "3000000",
  wTop: "3000000",
  longFactor: "1.5",
  positiveK: "0.5",
  negativeK: "0.8",
  positiveD: "0.75",
  negativeD: "1.2",
  source: "测试荷载与模型",
  sectionSource: "测试换算截面及长期参数",
  model: true,
  windBasis: true,
  sectionBasis: true,
};
function result(change: Partial<RawInput> = {}) {
  const r = calculate({ ...sample, ...change });
  if (r.status !== "calculated") throw new Error("预期有效输入");
  return r;
}
describe("AAC板身风作用独立参考算例", () => {
  it("材料来自JGJ配筋板表，不使用CECS同名等级表", () => {
    expect(result().material).toEqual({
      fc: 2.02,
      ft: 0.32,
      ftk: 0.45,
      Ec: 1900,
      fy: 270,
    });
    expect(result({ concrete: "A5.0" }).material).toEqual({
      fc: 2.89,
      ft: 0.35,
      ftk: 0.49,
      Ec: 2300,
      fy: 270,
    });
    expect(result({ product: "flyash" }).material.Ec).toBe(1700);
  });
  it("标准值、设计值、单位和主要中间结果正确", () => {
    const r = result(),
      positive = r.directions[0];
    expect(positive.h0).toBe(125);
    expect(positive.x).toBeCloseTo(22.277227722772277, 12);
    expect(positive.momentCapacity).toBeCloseTo(2.3056930693069307, 12);
    expect(positive.shearCapacity).toBe(10.8);
    expect(positive.momentDemand).toBe(0.50625);
    expect(positive.shearDemand).toBe(0.675);
    expect(positive.stress).toBe(0.1125);
    expect(positive.deflection).toBeCloseTo(1.3061145510835914, 10);
    expect(positive.deflectionLimit).toBe(15);
    expect(r.passed).toBe(true);
  });
  it("负风压独立计算，采用另一侧钢筋及位置", () => {
    const r = result({ steelTop: "80", aTop: "30" });
    expect(r.directions[1].edge).toBe("上侧");
    expect(r.directions[1].h0).toBe(120);
    expect(r.directions[1].momentDemand).toBe(0.81);
    expect(r.directions[1].stress).toBe(0.18);
    expect(r.directions[1].momentCapacity).not.toBe(
      r.directions[0].momentCapacity,
    );
  });
  it("所有输出有限，过程包含代入、参数、引用及判断", () => {
    for (const d of result().directions) {
      for (const step of d.steps)
        expect(
          step.formula &&
            step.meaning &&
            step.substitution &&
            step.result &&
            step.references.length,
        ).toBeTruthy();
      expect(d.checks).toHaveLength(5);
    }
  });
});
describe("不满足、模型边界及严格等值", () => {
  it("风设计作用超过抗力时保留过程和不满足结论", () => {
    const r = result({ positiveD: "10" });
    expect(r.passed).toBe(false);
    expect(
      r.directions[0].checks.find((c) => c.title === "正截面受弯")?.passed,
    ).toBe(false);
  });
  it("标准风压导致抗裂或挠度不满足", () => {
    const r = result({ positiveK: "20" });
    expect(
      r.directions[0].checks.find((c) => c.title === "标准组合抗裂")?.passed,
    ).toBe(false);
    expect(
      r.directions[0].checks.find((c) => c.title === "考虑长期作用的挠度")
        ?.passed,
    ).toBe(false);
  });
  it("x=0.5h₀恰等通过，略超则不输出受弯抗力", () => {
    const change = {
      concrete: "A3.5",
      steel: "HPB300",
      b: "540",
      h: "225",
      aBottom: "25",
      steelBottom: "404",
    };
    expect(result(change).directions[0].x).toBe(100);
    expect(result(change).directions[0].modelValid).toBe(true);
    const d = result({ ...change, steelBottom: "404.000001" }).directions[0];
    expect(d.modelValid).toBe(false);
    expect(d.momentCapacity).toBeNull();
  });
  it("抗裂应力等限值通过，略超不通过", () => {
    expect(result({ positiveK: "2" }).directions[0].checks[3].passed).toBe(
      true,
    );
    expect(
      result({ positiveK: "2.00000001" }).directions[0].checks[3].passed,
    ).toBe(false);
  });
  it("受弯设计弯矩等抗力与两侧", () => {
    const change = {
      b: "540",
      h: "225",
      aBottom: "25",
      steelBottom: "404",
      span: "1000",
      positiveD: "181.8",
    };
    expect(result(change).directions[0].momentCapacity).toBe(12.2715);
    expect(result(change).directions[0].checks[1].passed).toBe(true);
    expect(
      result({ ...change, positiveD: "181.80000001" }).directions[0].checks[1]
        .passed,
    ).toBe(false);
    expect(
      result({ ...change, positiveD: "181.79999999" }).directions[0].checks[1]
        .passed,
    ).toBe(true);
  });
  it("挠度等限值及略超严格比较", () => {
    const change = { span: "1000", positiveK: "155.04" };
    expect(result(change).directions[0].deflection).toBe(5);
    expect(result(change).directions[0].checks[4].passed).toBe(true);
    expect(
      result({ ...change, positiveK: "155.04000001" }).directions[0].checks[4]
        .passed,
    ).toBe(false);
  });
  it("受剪等限值及略超严格比较", () => {
    expect(result({ positiveD: "12" }).directions[0].checks[2].passed).toBe(
      true,
    );
    expect(
      result({ positiveD: "12.00000001" }).directions[0].checks[2].passed,
    ).toBe(false);
  });
  it("单方向0输入表示不启用，不生成假合格工况", () => {
    const r = result({ negativeK: "0", negativeD: "0" });
    expect(r.directions).toHaveLength(1);
  });
  it("长期增大不改变内力，但增加挠度", () => {
    const a = result({ longFactor: "1" }).directions[0],
      b = result({ longFactor: "2" }).directions[0];
    expect(b.deflection).toBe(a.deflection * 2);
    expect(b.momentDemand).toBe(a.momentDemand);
  });
});
describe("非法输入与不适用模型拒绝", () => {
  it.each([
    "b",
    "h",
    "span",
    "i0",
    "wBottom",
    "wTop",
    "aBottom",
    "aTop",
    "steelBottom",
    "steelTop",
    "longFactor",
  ] as const)("%s必须为有限正数", (key) => {
    for (const value of ["", "NaN", "Infinity", "0", "-1", "0x10"])
      expect(calculate({ ...sample, [key]: value }).status).toBe("invalid");
  });
  it.each(["model", "windBasis", "sectionBasis"] as const)(
    "缺少%s声明不计算",
    (key) =>
      expect(calculate({ ...sample, [key]: false }).status).toBe("invalid"),
  );
  it.each([
    { concrete: "C30" },
    { steel: "HRB500" },
    { product: "unknown" },
    { aBottom: "150" },
    { longFactor: "0.99" },
    { positiveK: "-1" },
    { positiveK: "0", positiveD: "1" },
    { positiveK: "0", positiveD: "0", negativeK: "0", negativeD: "0" },
    { source: "" },
    { sectionSource: "" },
    { span: "1e100" },
  ])("拒绝错误或不适用输入%j", (change) =>
    expect(calculate({ ...sample, ...change }).status).toBe("invalid"),
  );
});
