import { calculate } from "./calculate";
import { references } from "./references";
import type { ReferenceId } from "./references";
import { numericFields } from "./types";
import type { RawInput, Step } from "./types";
import { formatNumber as f } from "../../shared/units";
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const field = (id: string, label: string, unit: string, hint = "") =>
  `<label class="aac-field"><span>${label}</span><div class="aac-number"><input name="${id}" id="${id}" type="number" step="any" aria-describedby="${id}-error"><small>${unit}</small></div>${hint ? `<small>${hint}</small>` : ""}<span class="aac-error" id="${id}-error"></span></label>`;
const refButtons = (ids: readonly string[]) =>
  ids
    .map(
      (id) =>
        `<button class="aac-ref" type="button" data-reference="${id}">${references[id as ReferenceId].name} · 查看原文</button>`,
    )
    .join("");
const process = (steps: Step[]) =>
  steps
    .map(
      (step, index) =>
        `<details><summary>${index + 1}. ${escape(step.title)}</summary><div class="aac-step"><p class="aac-formula">${escape(step.formula)}</p><p>${escape(step.meaning)}</p><p><b>代入：</b>${escape(step.substitution)}</p><p><b>结果：</b>${escape(step.result)}</p>${refButtons(step.references)}</div></details>`,
    )
    .join("");
export function mountAAC(app: HTMLElement): void {
  app.innerHTML = `<header class="aac-header"><a href="#">← 工具箱首页</a><span>装配式结构 / 蒸压加气混凝土外墙板</span><small>开发验收版</small></header><main class="aac-main"><div class="aac-title"><p class="eyebrow">AUTOCLAVED AERATED CONCRETE</p><h1>蒸压加气混凝土外墙板</h1><p>板身按 JGJ/T 17；抗震相关验算参照 T/CECS 553。</p></div><div class="notice"><span class="notice-mark">i</span><p>本版验算工程师选择的一个控制方向：板身受弯、受剪、抗裂及挠度。抗震、连接、位移适应和吊装尚未完成，不能给出外墙系统整体合格结论。</p></div>
 <div class="aac-workspace"><section class="aac-panel"><h2>板与受力示意</h2><svg class="aac-diagram" viewBox="0 0 300 290" role="img" aria-label="两端简支外墙板在均布面外风作用下的示意"><defs><marker id="wind-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#42738e"/></marker></defs><rect x="120" y="42" width="32" height="205" fill="#edf3f7" stroke="#597b90" stroke-width="2"/><path d="M120 42l-13 14h26zM120 247l-13 14h26z" fill="none" stroke="#597b90"/><path d="M60 75h50M60 115h50M60 155h50M60 195h50M60 235h50" stroke="#42738e" marker-end="url(#wind-arrow)"/><path d="M180 42h15M180 247h15M188 42v205" stroke="#a3b1bb"/><text x="201" y="150" fill="#597b90" font-size="12">l₀</text><text x="38" y="27" fill="#597b90" font-size="12">均布净风压 · 一向两端简支</text><text x="50" y="280" fill="#7b8f9b" font-size="11">板面、支点与钢筋位置以实际构造为准</text></svg><p class="aac-note">工程师选择风压较大的一面，输入该受拉面的配筋。<br>竖向板自重沿面内，不加入本页面外均布荷载。<br>本页不计算自重引起的轴力及连接作用。</p><div class="aac-pending"><h3>抗震与连接</h3><p>【待确认】现行地震系数及组合、具体支承连接、层间位移适应能力。</p><p>此部分未计算，不会自动显示“满足”。</p>${refButtons(["seismic", "connection", "exterior"])}</div></section>
 <section class="aac-panel"><div class="aac-panel-heading"><h2>计算参数</h2><button type="button" id="aac-example" class="aac-secondary">填入参考示例</button></div><form id="aac-form" novalidate>
 <fieldset><legend>板与计算跨度</legend><div class="aac-grid">${field("b", "整块板计算宽度 b", "mm")}${field("h", "板厚 h", "mm")}${field("span", "计算跨度 l₀", "mm", "两端简支计算跨度，不能直接用板总长代替。")}</div></fieldset>
 <fieldset><legend>材料与实际配筋</legend><div class="aac-grid"><label class="aac-field"><span>强度级别</span><select name="concrete"><option value="A3.5">A3.5 配筋板</option><option value="A5.0">A5.0 配筋板</option></select><span class="aac-error" id="concrete-error"></span></label><label class="aac-field"><span>材料品种</span><select name="product"><option value="sand">砂制品</option><option value="flyash">粉煤灰制品</option></select><span class="aac-error" id="product-error"></span></label><label class="aac-field"><span>钢筋牌号</span><select name="steel"><option>HPB300</option><option>HRB400</option><option>CRB600H</option></select><span class="aac-error" id="steel-error"></span></label>${field("diameter", "受拉钢筋直径 d", "mm")}${field("count", "受拉钢筋根数 n", "根", "只输入所选受拉面的钢筋，面积由程序计算。")}${field("a", "受拉合力点距板面 a_s", "mm", "不是净保护层厚度；本版不计受压筋有利贡献。")}</div><p class="aac-note">As = πd²n/4；计算时自动显示面积及配筋率。</p></fieldset>
 <fieldset><legend>风荷载参数 · GB 50009-2012 围护结构</legend><p class="aac-note">仅计算一个控制方向。μz、βgz手动查表输入；粗糙度和高度用于记录取值条件，程序不自动生成系数。体型系数输入已考虑内外压不利组合的净局部体型系数绝对值。</p><div class="aac-grid">${field("basicWind", "基本风压 w₀", "kN/m²", "不小于0.30；按项目地点、重现期及适用要求确认。")}<label class="aac-field"><span>地面粗糙度类别</span><select name="terrain"><option>A</option><option selected>B</option><option>C</option><option>D</option></select><span class="aac-error" id="terrain-error"></span></label>${field("height", "计算高度 z", "m")}${field("muZ", "风压高度变化系数 μz", "无量纲", "查表8.2.1输入。")} ${field("gust", "阵风系数 βgz", "无量纲", "围护结构查表8.6.1；不是主体风振系数βz。")} ${field("local", "控制净局部体型系数 |μsl,net|", "无量纲", "已考虑墙面部位、内外压及适用的面积条件。")} ${field("gammaW", "风荷载分项系数 γW", "无量纲", "按现行组合确认；不从2012旧版系数自动取值。")} ${field("gamma0", "板身重要性系数 γ₀", "无量纲", "用于γ₀M、γ₀V；不要再乘一次。")}</div><p class="aac-note">wk = βgz |μsl,net| μz w₀；设计需求按γ₀γW放大。仅单一风作用，未自动生成其他荷载组合。</p>${refButtons(["wind", "windHeight", "windGust", "windLocal", "windInternal"])}<label class="aac-field"><span>风荷载、控制板面与现行组合取值依据</span><textarea name="source" rows="2" placeholder="说明控制受拉面、系数查表条件、内外压处理、γW和γ₀现行依据及实际支承"></textarea><span class="aac-error" id="source-error"></span></label></fieldset>
 <fieldset><legend>换算截面与长期作用</legend><p class="aac-note">输入同一未开裂换算截面的 I₀ 与所选受拉边缘 W₀。单侧配筋会改变换算截面中性轴，不能直接假定仍在板厚中心。可依据厂家资料或经工程师复核的截面计算输入，不直接使用毛截面替代。</p><div class="aac-grid">${field("i0", "换算截面惯性矩 I₀", "mm⁴")}${field("w", "受拉边缘换算截面抵抗矩 W₀", "mm³")}${field("longFactor", "长期挠度增大系数 η_long", "无量纲", "按1+(Mq/Mk)(θ−1)确认；不默认取1。")}</div><label class="aac-field"><span>换算截面、长期系数与配筋来源</span><textarea name="sectionSource" rows="2" placeholder="填写配筋图、换算截面计算和长期系数依据"></textarea><span class="aac-error" id="sectionSource-error"></span></label></fieldset>
 <fieldset class="aac-options"><legend>适用条件确认</legend>${[
   [
     "model",
     "竖向、无洞口、非承重、一向两端简支、均布净风压；实际构造符合此模型",
   ],
   [
     "windBasis",
     "已确认控制板面、净局部体型系数、手动查表系数及现行γW、γ₀取值",
   ],
   ["sectionBasis", "换算截面及长期系数已核对，I₀和W₀已考虑实际配筋中性轴"],
 ]
   .map(
     ([id, label]) =>
       `<label><input type="checkbox" name="${id}">${label}</label><span class="aac-error" id="${id}-error"></span>`,
   )
   .join(
     "",
   )}</fieldset><p class="aac-error" id="general-error" role="alert"></p><button class="aac-primary" type="submit">开始板身风荷载验算</button><p id="aac-input-state" class="aac-note" aria-live="polite">填写参数后开始计算。输入改变后旧结果立即失效。</p></form></section></div>
 <section class="aac-panel aac-result-panel" id="aac-results"><div class="aac-panel-heading"><h2>主要结果与逐项验算</h2><button class="aac-secondary" id="aac-print" disabled>打印计算书</button></div><div id="aac-result-content" aria-live="polite"><p class="aac-note">尚未计算。</p></div></section>
 <section class="aac-panel aac-report"><div class="aac-panel-heading"><h2>完整计算过程</h2><button class="aac-secondary" id="aac-expand">展开全部</button></div><p class="aac-note">显示最多8位有效数字；判断使用未显示舍入的高精度值，不放宽规范限值。力学关系和规范验算分别说明。</p><div id="aac-process"><p class="aac-note">计算后显示材料、内力、代入、结果、判断及原文。</p></div></section>
 <section class="aac-panel aac-report"><h2>规范依据与未完成项目</h2><div class="aac-reference-list">${Object.entries(
   references,
 )
   .map(([id, ref]) => `<div>${refButtons([id])}<p>${ref.note}</p></div>`)
   .join(
     "",
   )}</div></section><footer>当前仅板身风作用验算。抗震、连接、安装吊装、构造、产品合格性及整体系安全尚未完成；结果需经工程师人工验收。</footer></main>
 <dialog id="aac-pdf"><div class="aac-panel-heading"><h2 id="aac-pdf-title">规范原文</h2><button class="aac-secondary" id="aac-pdf-close">关闭</button></div><p id="aac-pdf-note" class="aac-note"></p><p id="aac-pdf-state" class="aac-note"></p><a id="aac-pdf-open" target="_blank" rel="noopener" hidden>新窗口查看同一原页</a><iframe id="aac-pdf-frame" title="规范原文"></iframe></dialog>`;
  const get = <T extends HTMLElement>(selector: string) =>
    app.querySelector<T>(selector)!;
  const form = get<HTMLFormElement>("#aac-form"),
    report = get("#aac-process"),
    results = get("#aac-result-content"),
    print = get<HTMLButtonElement>("#aac-print");
  let hasResult = false;
  function clear() {
    results.innerHTML =
      '<p class="aac-note">参数已修改或尚未计算，请重新计算。</p>';
    report.innerHTML = '<p class="aac-note">重新计算后显示本次过程。</p>';
    print.disabled = true;
    hasResult = false;
  }
  function showErrors(errors: Record<string, string>) {
    form.querySelectorAll(".aac-error").forEach((el) => {
      el.textContent = "";
    });
    form
      .querySelectorAll("[aria-invalid]")
      .forEach((el) => el.removeAttribute("aria-invalid"));
    for (const [id, message] of Object.entries(errors)) {
      get("#" + id + "-error").textContent = message;
      form
        .querySelector(`[name="${id}"]`)
        ?.setAttribute("aria-invalid", "true");
    }
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }
  function read(): RawInput {
    const data = new FormData(form);
    return Object.fromEntries([
      ...[
        ...Object.keys(numericFields),
        "concrete",
        "steel",
        "product",
        "terrain",
        "source",
        "sectionSource",
      ].map((key) => [key, String(data.get(key) ?? "")]),
      ...["model", "windBasis", "sectionBasis"].map((key) => [
        key,
        data.has(key),
      ]),
    ]) as unknown as RawInput;
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clear();
    showErrors({});
    try {
      const result = calculate(read());
      if (result.status === "invalid") {
        showErrors(result.errors);
        get("#aac-input-state").textContent = "输入未通过，不输出计算结果。";
        return;
      }
      hasResult = true;
      print.disabled = false;
      get("#aac-input-state").textContent =
        "板身风作用验算已完成；外墙系统整体结论尚未给出。";
      results.innerHTML = `<div class="aac-result-banner ${result.passed ? "aac-pass" : "aac-fail"}">${result.passed ? "所选控制方向的板身已检查项目满足" : "存在不满足或超出公式适用范围的项目"}<small>抗震、连接及其他未完成项：未验算</small></div><div class="aac-results-grid" style="grid-template-columns:1fr">${[result.direction].map((d) => `<section><h3>${d.name} · ${d.edge}受拉</h3><div class="aac-key-result"><span>受弯承载力</span><strong>${d.momentCapacity === null ? "未输出" : f(d.momentCapacity)} <small>kN·m</small></strong><span>γ₀M需求 ${f(d.momentDemand)} kN·m</span></div><dl><div><dt>受拉钢筋面积 / 配筋率</dt><dd>${f(d.area)} mm² / ${f(d.reinforcementRatio)}%</dd></div><div><dt>风荷载标准值 wk</dt><dd>${f(d.windStandard)} kN/m²</dd></div><div><dt>标准弯矩 Mk</dt><dd>${f(d.standardMoment)} kN·m</dd></div><div><dt>受剪承载力 / γ₀V需求</dt><dd>${f(d.shearCapacity)} / ${f(d.shearDemand)} kN</dd></div><div><dt>抗裂边缘应力</dt><dd>${f(d.stress)} N/mm²</dd></div><div><dt>挠度 / 限值</dt><dd>${f(d.deflection)} / ${f(d.deflectionLimit)} mm</dd></div></dl><ul class="aac-checks">${d.checks.map((c) => `<li><div><b>${c.title}</b><p>${c.comparison}</p>${refButtons(c.references)}</div><span class="${c.passed ? "aac-pass" : "aac-fail"}">${c.passed ? "满足" : "不满足 / 不适用"}</span></li>`).join("")}</ul></section>`).join("")}</div>`;
      const source = document.createElement("p");
      source.className = "aac-note";
      source.textContent = `输入来源：${result.input.source}；截面及长期来源：${result.input.sectionSource}`;
      results.append(source);
      report.innerHTML =
        process(result.steps) +
        [result.direction]
          .map(
            (d) =>
              `<h3 class="aac-direction-title">${d.name} · ${d.edge}受拉</h3>${process(d.steps)}`,
          )
          .join("");
    } catch {
      clear();
      showErrors({ general: "本次计算未完成，请检查参数数值与单位。" });
    }
  });
  form.addEventListener("input", () => {
    if (hasResult) {
      clear();
      showErrors({});
      get("#aac-input-state").textContent =
        "参数已修改，上次结果已失效，请重新计算。";
    }
  });
  form.addEventListener("change", () => {
    if (hasResult) {
      clear();
      showErrors({});
      get("#aac-input-state").textContent = "参数已修改，请重新计算。";
    }
  });
  get("#aac-expand").addEventListener("click", () =>
    report.querySelectorAll("details").forEach((el) => {
      el.open = true;
    }),
  );
  print.addEventListener("click", () => {
    const details = [...report.querySelectorAll("details")],
      state = details.map((el) => el.open);
    details.forEach((el) => {
      el.open = true;
    });
    window.addEventListener(
      "afterprint",
      () =>
        details.forEach((el, index) => {
          el.open = state[index];
        }),
      { once: true },
    );
    window.print();
  });
  get("#aac-example").addEventListener("click", () => {
    clear();
    showErrors({});
    const example = {
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
      basicWind: "0.450",
      height: "10",
      muZ: "1.000",
      gust: "1.700",
      local: "1.20",
      gammaW: "1.5",
      gamma0: "1.0",
      i0: "463826524.06275657",
      w: "5051634.847206384",
      longFactor: "1",
      source:
        "参考演示：B类10m，μz=1，βgz=1.7；假定控制净局部体型系数1.2，γW=1.5、γ₀=1。上述工程适用性需人工确认。",
      sectionSource:
        "参考截面仅作演示：单侧φ8×4，按Es/Ec=200000/2300、忽略钢筋自身惯性，换算中性轴距受压面108.1828877mm，I₀=463826524.06275657mm⁴、W₀=5051634.847206384mm³；风作用长期系数取1需核对。",
    };
    for (const [id, value] of Object.entries(example))
      form.querySelector<HTMLInputElement>(`[name="${id}"]`)!.value = value;
    form
      .querySelectorAll<HTMLInputElement>('[type="checkbox"]')
      .forEach((el) => {
        el.checked = false;
      });
    get("#aac-input-state").textContent =
      "已填入参考演示，截面数据与工程适用性需人工核对；确认项未自动勾选。";
  });
  const dialog = get<HTMLDialogElement>("#aac-pdf"),
    frame = get<HTMLIFrameElement>("#aac-pdf-frame");
  let requestId = 0;
  app.onclick = async (event) => {
    const button = (event.target as Element).closest<HTMLElement>(
      "[data-reference]",
    );
    if (!button) return;
    const ref = references[button.dataset.reference as ReferenceId];
    if (!ref) return;
    const current = ++requestId;
    frame.removeAttribute("src");
    get("#aac-pdf-title").textContent = ref.name;
    get("#aac-pdf-note").textContent =
      `PDF文件第${ref.page}页，印刷页${ref.printed}；${ref.note}`;
    const open = get<HTMLAnchorElement>("#aac-pdf-open");
    open.hidden = true;
    get("#aac-pdf-state").textContent = "正在检查本地原文…";
    dialog.showModal();
    const url = new URL(ref.pdf, document.baseURI);
    url.hash = `page=${ref.page}`;
    if (url.origin !== location.origin) {
      // Public original scan; private uploaded standards still use the local-only path below.
      frame.src = url.href;
      open.href = url.href;
      open.hidden = false;
      get("#aac-pdf-state").textContent =
        "公开原版扫描按对应页打开；如网页内无法加载，可点击新窗口查看。";
      return;
    }
    try {
      const response = await fetch(new URL(ref.pdf, document.baseURI), {
        method: "HEAD",
      });
      if (current !== requestId || !dialog.open) return;
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("application/pdf")
      ) {
        get("#aac-pdf-state").textContent =
          "在线版未公开原始PDF。请在已保存规范原文的本地版本查看对应文件页码；不会改为整本下载。";
        return;
      }
      frame.src = url.href;
      open.href = url.href;
      open.hidden = false;
      get("#aac-pdf-state").textContent =
        "已打开原文入口；具体页码定位由浏览器PDF阅读器支持。";
    } catch {
      if (current === requestId && dialog.open)
        get("#aac-pdf-state").textContent =
          "原文暂无法加载，请使用本地规范按上述页码核对。";
    }
  };
  get("#aac-pdf-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    requestId++;
    frame.removeAttribute("src");
  });
}
