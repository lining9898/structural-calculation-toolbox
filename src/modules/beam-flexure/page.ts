import { formatNumber } from '../../shared/units';
import { assessInput } from './assess';
import { references } from './references';
import { concreteGrades, steelGrades } from './types';
import type { FieldErrors, RawInput } from './types';

function numberField(id: string, title: string, symbol: string, unit: string, hint = ''): string {
  return `<div class="field"><label for="${id}">${title}<span>${symbol}</span></label><div class="number-input"><input id="${id}" name="${id}" type="number" step="any" required aria-describedby="${id}-hint ${id}-error"><span>${unit}</span></div><small id="${id}-hint">${hint}</small><p class="field-error" id="${id}-error"></p></div>`;
}
function selectField(id: string, title: string, options: readonly string[], hint: string): string {
  return `<div class="field"><label for="${id}">${title}</label><select id="${id}" name="${id}" required aria-describedby="${id}-hint ${id}-error"><option value="">请选择</option>${options.map(option => `<option>${option}</option>`).join('')}</select><small id="${id}-hint">${hint}</small><p class="field-error" id="${id}-error"></p></div>`;
}
const diagram = `<svg id="section-diagram" viewBox="0 0 360 290" role="img" aria-labelledby="diagram-title diagram-description"><title id="diagram-title">矩形梁截面示意图</title><desc id="diagram-description">梁宽 b，梁高 h，受拉钢筋合力点距受拉边 a_s。示意图不代表实际配筋数量或比例。</desc><defs><pattern id="concrete-pattern" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r=".8" fill="#cad2d9"/></pattern></defs><rect x="104" y="42" width="142" height="196" fill="url(#concrete-pattern)" stroke="#526678" stroke-width="2"/><path d="M117 55H233V225H117Z" stroke="#8798a5" fill="none" stroke-width="2"/><g id="reinforcement"><circle cx="134" cy="209" r="7" fill="#245c84"/><circle cx="175" cy="209" r="7" fill="#245c84"/><circle cx="216" cy="209" r="7" fill="#245c84"/></g><g stroke="#6c8092" fill="none"><path d="M104 247V273M246 247V273M104 265H246M255 42H290M255 238H290M281 42V238"/><path id="as-lines" d="M74 209H95M74 238H95M82 209V238"/></g><g fill="#526678" font-size="14" font-family="system-ui,sans-serif"><text id="diagram-b" x="175" y="285" text-anchor="middle">b</text><text id="diagram-h" x="294" y="145">h</text><text id="diagram-as" x="24" y="228">a_s</text><text id="diagram-edge" x="175" y="28" text-anchor="middle">受压边</text></g></svg>`;

export function mountBeamFlexure(app: HTMLElement): void {
  app.innerHTML = `
    <header class="site-header"><div class="brand"><span class="brand-mark" aria-hidden="true">▥</span>结构计算工具箱</div><span class="header-note">确定性计算 · 过程可复核</span></header>
    <main><div class="page-heading"><div><p class="eyebrow">混凝土结构 / 梁</p><h1>梁截面验算</h1></div><span class="version-note">开发预览 · 核心计算待规范确认</span></div>
    <nav class="module-nav" aria-label="梁截面验算模块"><span class="current-module" aria-current="page">01 正截面受弯承载力计算</span><span class="future-module">02 斜截面受剪承载力计算 <small>后续独立开发</small></span></nav>
    <p class="scope-note">当前范围：单筋矩形截面、非预应力、不含抗震专项验算。由工程师提供设计弯矩与实配钢筋。</p>
    <div class="workspace"><section class="panel input-panel" aria-labelledby="input-heading"><div class="panel-heading"><h2 id="input-heading">参数输入</h2><span>长度单位 mm</span></div><form id="beam-form" novalidate>
    <fieldset><legend>截面与配筋</legend><div class="field-grid">${numberField('b', '梁宽', 'b', 'mm')}${numberField('h', '梁高', 'h', 'mm')}${numberField('a_s', '钢筋合力点距离', 'a_s', 'mm', '至受拉边的距离，不是保护层厚度。')}${numberField('A_s', '实配受拉钢筋面积', 'A_s', 'mm²', '由工程师按实际配筋汇总。')}</div></fieldset>
    <fieldset><legend>材料</legend><div class="field-grid">${selectField('concrete', '混凝土强度等级', concreteGrades, '拟支持范围；强度设计值尚待核对。')}${selectField('steel', '受拉钢筋牌号', steelGrades, '牌号数字不直接作为强度设计值。')}</div></fieldset>
    <fieldset><legend>设计需求</legend><div class="field-grid">${numberField('M_d', '设计弯矩绝对值', 'M_d', 'kN·m', '输入当前截面的设计值。')}<div class="field"><label for="tensionEdge">受拉边</label><select id="tensionEdge" name="tensionEdge" aria-describedby="tensionEdge-error"><option value="bottom">下边受拉</option><option value="top">上边受拉</option></select><small>配筋与合力点应对应此边。</small><p class="field-error" id="tensionEdge-error"></p></div></div><div class="field"><label for="source">弯矩来源与组合说明</label><textarea id="source" name="source" rows="2" required placeholder="填写分析模型、组合或工况" aria-describedby="source-error"></textarea><p class="field-error" id="source-error"></p></div></fieldset>
    <fieldset class="scope-checks"><legend>模型适用范围</legend><label><input name="singleReinforced" type="checkbox" aria-describedby="singleReinforced-error">按单筋截面验算，不计受压钢筋贡献</label><p class="field-error" id="singleReinforced-error"></p><label><input name="nonPrestressed" type="checkbox" aria-describedby="nonPrestressed-error">属于非预应力构件</label><p class="field-error" id="nonPrestressed-error"></p><label><input name="noSeismicCheck" type="checkbox" aria-describedby="noSeismicCheck-error">本次不要求抗震专项验算</label><p class="field-error" id="noSeismicCheck-error"></p></fieldset>
    <div class="form-actions"><button class="primary-button" type="submit">检查输入</button><button class="secondary-button" type="button" disabled aria-describedby="calculation-lock">开始计算</button></div><p id="calculation-lock" class="calculation-lock">公式、材料表及限值确认后开放承载力计算。</p></form></section>
    <div class="results-column"><section class="panel diagram-panel" aria-labelledby="diagram-heading"><div class="panel-heading"><h2 id="diagram-heading">构件示意图</h2><span>矩形截面</span></div>${diagram}<p class="diagram-note">示意图不按比例；圆点不代表实际钢筋根数。</p></section>
    <section class="panel" aria-labelledby="results-heading"><div class="panel-heading"><h2 id="results-heading">主要结果</h2><span class="status-pending">尚未计算</span></div><div class="main-results"><div><span>受弯承载力 M_R</span><strong>— <small>kN·m</small></strong></div><div><span>承载力判断</span><strong class="result-text">待规范确认</strong></div></div><p id="input-status" class="input-status" aria-live="polite">填写参数并检查输入。当前不会输出承载力或合格结论。</p><div id="geometry-result"></div></section>
    <section class="panel" aria-labelledby="checks-heading"><div class="panel-heading"><h2 id="checks-heading">规范验算</h2><span>逐项展示</span></div><ul class="check-list">${['设计需求表达式', '材料等级与设计值', '受压区高度与界限', '最小配筋率', '正截面受弯承载力'].map(title => `<li><span>${title}</span><span>待人工确认</span></li>`).join('')}</ul></section></div></div>
    <section class="panel process-panel" aria-labelledby="process-heading"><div class="panel-heading"><h2 id="process-heading">详细计算过程</h2><span>公式 → 代入 → 结果 → 判断 → 依据</span></div>
    <details open><summary>01 有效高度 · 几何关系</summary><div class="process-body"><p class="formula">h₀ = h − a_s</p><p>h：截面总高度；a_s：受拉钢筋合力点至受拉边距离，单位均为 mm。</p><p id="geometry-substitution">输入检查通过后显示数值代入。此项几何关系不代表结构承载力合格。</p><small>几何关系明确；规范符号定义与条文映射待补充。</small></div></details>
    <details><summary>02 材料参数与计算系数</summary><div class="process-body"><p>逐项展示 f_c、f_t、f_y、α₁、ξ_b 的取值、适用条件及规范表格。</p><p class="pending-note">待人工确认：材料表、应力图系数、界限高度。</p></div></details>
    <details><summary>03 内力平衡与受压区高度验算</summary><div class="process-body"><p>展示受拉力、受压力、受压区高度和界限条件；超出模型范围时停止输出有效承载力。</p><p class="pending-note">待人工确认：规范原式与模型限制。</p></div></details>
    <details><summary>04 最小配筋验算</summary><div class="process-body"><p>展示实配配筋率、规范限值、最小钢筋面积及比较。</p><p>GB 55008-2021 第4.4.6条 / 表4.4.6 <button class="text-button" type="button" data-reference="minimum-steel">查看规范原文</button></p><p class="pending-note">条表位置已核对；完整表注、分母口径与设计标准衔接仍待人工确认。</p></div></details>
    <details><summary>05 受弯承载力与设计需求比较</summary><div class="process-body"><p>按确认公式展示力臂、承载力、单位换算和需求比较。</p><p class="pending-note">待人工确认：承载力原式与设计需求表达式。</p></div></details></section>
    <section class="panel reference-panel" aria-labelledby="reference-heading"><div class="panel-heading"><h2 id="reference-heading">规范依据</h2><span>依据跟随计算步骤</span></div><div class="table-scroll"><table><thead><tr><th>计算步骤</th><th>规范 / 条文</th><th>确认状态</th><th>原文</th></tr></thead><tbody>${references.map(reference => `<tr><th scope="row">${reference.step}</th><td>${reference.standard}<small>${reference.clause}</small></td><td><span class="status-pending">待人工确认</span><small>${reference.note}</small></td><td>${reference.pdfUrl ? `<button class="text-button" type="button" data-reference="${reference.id}">查看规范原文</button>` : '<span class="muted">原页待补充</span>'}${reference.sourceUrl ? `<a href="${reference.sourceUrl}" target="_blank" rel="noopener noreferrer">发布来源 ↗</a>` : ''}</td></tr>`).join('')}</tbody></table></div></section>
    <footer>仅检查本模块定义的项目；不包含受剪、裂缝、挠度、锚固及完整构造验算。斜截面受剪将作为独立模块开发。</footer></main>
    <dialog id="pdf-dialog" aria-labelledby="pdf-title"><div class="pdf-toolbar"><div><h2 id="pdf-title">规范原文</h2><p id="pdf-page-note"></p></div><button type="button" class="secondary-button" id="pdf-close">关闭</button></div><p class="pdf-fallback">若无法内嵌显示或定位，请查看 <a id="pdf-source" target="_blank" rel="noopener noreferrer">官方发布页面及附件</a>。页序仅对应此官方 PDF。</p><iframe id="pdf-frame" title="规范 PDF 原文" referrerpolicy="no-referrer"></iframe></dialog>`;

  const get = <T extends Element>(selector: string) => app.querySelector<T>(selector)!;
  const form = get<HTMLFormElement>('#beam-form');
  const status = get<HTMLParagraphElement>('#input-status');
  const geometry = get<HTMLDivElement>('#geometry-result');
  const substitution = get<HTMLParagraphElement>('#geometry-substitution');
  let hasAssessment = false;
  function readInput(): RawInput {
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? '');
    return { b: value('b'), h: value('h'), a_s: value('a_s'), A_s: value('A_s'), M_d: value('M_d'), concrete: value('concrete'), steel: value('steel'), tensionEdge: value('tensionEdge'), source: value('source'), singleReinforced: data.has('singleReinforced'), nonPrestressed: data.has('nonPrestressed'), noSeismicCheck: data.has('noSeismicCheck') };
  }
  function showErrors(errors: FieldErrors): void {
    form.querySelectorAll<HTMLElement>('.field-error').forEach(element => { element.textContent = ''; });
    form.querySelectorAll<HTMLElement>('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    for (const [key, message] of Object.entries(errors)) {
      get<HTMLElement>(`#${key}-error`).textContent = message;
      form.querySelector<HTMLElement>(`[name="${key}"]`)?.setAttribute('aria-invalid', 'true');
    }
  }
  function updateDiagram(): void {
    const raw = readInput();
    const label = (value: string, symbol: string) => Number.isFinite(Number(value)) && Number(value) > 0 ? `${symbol} = ${formatNumber(Number(value))}` : symbol;
    get<SVGTextElement>('#diagram-b').textContent = label(raw.b, 'b');
    get<SVGTextElement>('#diagram-h').textContent = label(raw.h, 'h');
    const top = raw.tensionEdge === 'top';
    get<SVGElement>('#reinforcement').setAttribute('transform', top ? 'translate(0 -138)' : '');
    get<SVGElement>('#as-lines').setAttribute('d', top ? 'M74 42H95M74 71H95M82 42V71' : 'M74 209H95M74 238H95M82 209V238');
    get<SVGTextElement>('#diagram-as').setAttribute('y', top ? '62' : '228');
    get<SVGTextElement>('#diagram-edge').textContent = top ? '受拉边' : '受压边';
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    hasAssessment = true;
    const assessment = assessInput(readInput());
    geometry.replaceChildren();
    if (assessment.status === 'invalid') {
      showErrors(assessment.errors);
      status.textContent = '输入检查未通过，请按参数旁的提示修改。';
      status.className = 'input-status invalid';
      substitution.textContent = '输入未通过检查，不输出几何结果。';
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    showErrors({});
    status.textContent = '输入格式及声明检查通过；公式、材料与限值待确认，承载力未计算。';
    status.className = 'input-status';
    const text = `h₀ = ${formatNumber(assessment.input.h)} − ${formatNumber(assessment.input.a_s)} = ${formatNumber(assessment.effectiveHeight)} mm`;
    const p = document.createElement('p');
    p.className = 'geometry-value';
    p.textContent = `有效高度（几何）：${text}`;
    geometry.append(p);
    substitution.textContent = `${text}。仅为几何结果，不构成承载力验算结论。`;
  });
  function onInputChange(): void {
    updateDiagram();
    if (!hasAssessment) return;
    hasAssessment = false;
    showErrors({});
    status.className = 'input-status';
    status.textContent = '参数已修改，请重新检查输入；上次结果已失效。';
    geometry.replaceChildren();
    substitution.textContent = '参数已修改，重新检查输入后显示数值代入。';
  }
  form.addEventListener('input', onInputChange);
  form.addEventListener('change', onInputChange);
  const dialog = get<HTMLDialogElement>('#pdf-dialog');
  const frame = get<HTMLIFrameElement>('#pdf-frame');
  app.querySelectorAll<HTMLButtonElement>('[data-reference]').forEach(button => {
    button.addEventListener('click', () => {
      const reference = references.find(item => item.id === button.dataset.reference);
      if (!reference?.pdfUrl || !reference.filePage) return;
      get<HTMLHeadingElement>('#pdf-title').textContent = `${reference.standard} · ${reference.clause}`;
      get<HTMLParagraphElement>('#pdf-page-note').textContent = `官方 PDF 文件第 ${reference.filePage} 页 / 印刷第 ${reference.printedPage} 页。计算条件仍待确认。`;
      get<HTMLAnchorElement>('#pdf-source').href = reference.sourceUrl!;
      frame.src = `${reference.pdfUrl}#page=${reference.filePage}&view=FitH`;
      dialog.showModal();
    });
  });
  get<HTMLButtonElement>('#pdf-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => frame.removeAttribute('src'));
}
