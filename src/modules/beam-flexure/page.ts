import { formatNumber } from '../../shared/units';
import { calculateBeamFlexure } from './calculate';
import { validateInput } from './validate';
import { references } from './references';
import { concreteGrades, steelGrades } from './types';
import type { CalculationResult, FieldErrors, RawInput } from './types';

function numberField(id: string, title: string, symbol: string, unit: string, hint = ''): string {
  return `<div class="field"><label for="${id}">${title}<span>${symbol}</span></label><div class="number-input"><input id="${id}" name="${id}" type="number" step="any" required aria-describedby="${id}-hint ${id}-error"><span>${unit}</span></div><small id="${id}-hint">${hint}</small><p class="field-error" id="${id}-error"></p></div>`;
}
function selectField(id: string, title: string, options: readonly string[], hint: string): string {
  return `<div class="field"><label for="${id}">${title}</label><select id="${id}" name="${id}" required aria-describedby="${id}-hint ${id}-error"><option value="">请选择</option>${options.map(option => `<option>${option}</option>`).join('')}</select><small id="${id}-hint">${hint}</small><p class="field-error" id="${id}-error"></p></div>`;
}
const diagram = `<svg id="section-diagram" viewBox="0 0 360 290" role="img" aria-labelledby="diagram-title diagram-description"><title id="diagram-title">矩形梁截面示意图</title><desc id="diagram-description">梁宽 b，梁高 h，受拉钢筋合力点距受拉边 a_s。示意图不代表实际配筋数量或比例。</desc><defs><pattern id="concrete-pattern" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r=".8" fill="#cad2d9"/></pattern></defs><rect x="104" y="42" width="142" height="196" fill="url(#concrete-pattern)" stroke="#526678" stroke-width="2"/><path d="M117 55H233V225H117Z" stroke="#8798a5" fill="none" stroke-width="2"/><g id="reinforcement"><circle cx="134" cy="209" r="7" fill="#245c84"/><circle cx="175" cy="209" r="7" fill="#245c84"/><circle cx="216" cy="209" r="7" fill="#245c84"/></g><g stroke="#6c8092" fill="none"><path d="M104 247V273M246 247V273M104 265H246M255 42H290M255 238H290M281 42V238"/><path id="as-lines" d="M74 209H95M74 238H95M82 209V238"/></g><g fill="#526678" font-size="14" font-family="system-ui,sans-serif"><text id="diagram-b" x="175" y="285" text-anchor="middle">b</text><text id="diagram-h" x="294" y="145">h</text><text id="diagram-as" x="24" y="228">a_s</text><text id="diagram-edge" x="175" y="28" text-anchor="middle">受压边</text></g></svg>`;


function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}
function referenceButtons(ids: string[]): string {
  return ids.map(id => {
    const reference = references.find(item => item.id === id)!;
    return `<button class="text-button" type="button" data-reference="${id}">${escapeHtml(reference.standard)} · ${escapeHtml(reference.clause)} · 查看原文</button>`;
  }).join('');
}
const scopeFields = [
  ['singleReinforced', '单一牌号受拉钢筋，按单筋截面验算，不计受压钢筋贡献'],
  ['nonPrestressed', '属于非预应力构件'],
  ['noSeismicCheck', '本次不要求抗震专项验算'],
  ['ordinaryStatic', '普通静力、非疲劳，抗力模型系数 γ_Rd=1.0'],
  ['notDeepBeam', '不属于深受弯构件'],
  ['demandIncludesImportance', '输入弯矩已包含结构重要性因素，程序不再乘 γ₀'],
] as const;

export function mountBeamFlexure(app: HTMLElement): void {
  app.innerHTML = `
    <header class="site-header"><div class="brand"><span class="brand-mark" aria-hidden="true">▥</span>结构计算工具箱</div><span class="header-note">确定性计算 · 过程可复核</span></header>
    <main><div class="page-heading"><div><p class="eyebrow">混凝土结构 / 梁</p><h1>梁截面验算</h1></div><span class="version-note">受弯模块 · 等待工程师人工验收</span></div>
    <nav class="module-nav" aria-label="梁截面验算模块"><span class="current-module" aria-current="page">01 正截面受弯承载力计算</span><span class="future-module">02 斜截面受剪承载力计算 <small>后续独立开发</small></span></nav>
    <p class="scope-note">普通静力单筋矩形截面；非预应力、非深受弯构件，不含疲劳和抗震专项。仅验算本页面列出的项目。</p>
    <div class="workspace"><section class="panel input-panel" aria-labelledby="input-heading"><div class="panel-heading"><h2 id="input-heading">参数输入</h2><span>长度单位 mm</span></div><form id="beam-form" novalidate>
    <fieldset><legend>截面与配筋</legend><div class="field-grid">${numberField('b', '梁宽', 'b', 'mm')}${numberField('h', '梁高', 'h', 'mm')}${numberField('a_s', '钢筋合力点距离', 'a_s', 'mm', '至受拉边的距离，不是保护层厚度。')}${numberField('A_s', '实配受拉钢筋面积', 'A_s', 'mm²', '由工程师按实际配筋汇总。')}
    <div class="field"><label for="beamType">梁类别</label><select id="beamType" name="beamType" aria-describedby="beamType-error"><option value="ordinary">普通梁</option><option value="frame">框架梁</option></select><small>框架梁另检查最小截面宽度。</small><p class="field-error" id="beamType-error"></p></div></div></fieldset>
    <fieldset><legend>材料</legend><div class="field-grid">${selectField('concrete', '混凝土强度等级', concreteGrades, '按已确认材料表读取设计值。')}${selectField('steel', '受拉钢筋牌号', steelGrades, 'HRB500 配合不低于 C30 的混凝土。')}</div></fieldset>
    <fieldset><legend>设计需求</legend><div class="field-grid">${numberField('M_d', '验算弯矩绝对值', 'M_d', 'kN·m', '必须已包含结构重要性因素 γ₀。')}<div class="field"><label for="tensionEdge">受拉边</label><select id="tensionEdge" name="tensionEdge" aria-describedby="tensionEdge-error"><option value="bottom">下边受拉</option><option value="top">上边受拉</option></select><small>配筋与合力点应对应此边。</small><p class="field-error" id="tensionEdge-error"></p></div></div><div class="field"><label for="source">弯矩来源、组合与因素处理说明</label><textarea id="source" name="source" rows="2" required placeholder="填写分析模型、组合，以及 γ₀ 已计入的位置" aria-describedby="source-error"></textarea><p class="field-error" id="source-error"></p></div></fieldset>
    <fieldset class="scope-checks"><legend>模型与输入口径确认</legend>${scopeFields.map(([name, title]) => `<label><input name="${name}" type="checkbox" aria-describedby="${name}-error">${title}</label><p class="field-error" id="${name}-error"></p>`).join('')}</fieldset>
    <p class="field-error" id="general-error" role="alert"></p><div class="form-actions"><button class="primary-button" type="submit">开始计算</button><button class="secondary-button" type="button" id="validate-button">检查输入</button></div><p class="calculation-lock">仅确认适用于当前构件的条件；不满足时应采用其他模型。</p></form></section>
    <div class="results-column"><section class="panel diagram-panel" aria-labelledby="diagram-heading"><div class="panel-heading"><h2 id="diagram-heading">构件示意图</h2><span>矩形截面</span></div>${diagram}<p class="diagram-note">示意图不按比例；圆点不代表实际钢筋根数。</p></section>
    <section class="panel" aria-labelledby="results-heading"><div class="panel-heading"><h2 id="results-heading">主要结果</h2><span id="calculation-state">尚未计算</span></div><div class="main-results"><div><span>受弯承载力 M_R</span><strong><span id="capacity-value">—</span> <small>kN·m</small></strong></div><div><span>验算结论</span><strong id="conclusion-value" class="result-text">尚未计算</strong></div></div><p id="input-status" class="input-status" aria-live="polite">填写参数并确认适用条件，再开始计算。</p><div id="geometry-result"></div><p id="input-summary" class="input-summary"></p></section>
    <section class="panel" aria-labelledby="checks-heading"><div class="panel-heading"><h2 id="checks-heading">规范验算</h2><span>实际值与限值逐项比较</span></div><div id="check-results"><p class="empty-note">计算后显示材料、截面、受压区、最小配筋与承载力判断。</p></div></section></div></div>
    <section class="panel process-panel" aria-labelledby="process-heading"><div class="panel-heading"><h2 id="process-heading">详细计算过程</h2><span>公式 → 代入 → 结果 → 判断 → 原文</span></div><p class="precision-note">显示最多 8 位有效数字；计算保留高精度，临界判断不用显示舍入值或放宽容差。</p><div id="process-steps"><p class="empty-note">开始计算后生成本次参数对应的完整过程。</p></div></section>
    <section class="panel reference-panel" aria-labelledby="reference-heading"><div class="panel-heading"><h2 id="reference-heading">规范依据</h2><span>第二版方案已确认</span></div><div class="table-scroll"><table><thead><tr><th>计算步骤</th><th>规范 / 条文</th><th>适用说明</th><th>原文</th></tr></thead><tbody>${references.map(reference => `<tr><th scope="row">${reference.step}</th><td>${reference.standard}<small>${reference.clause}</small></td><td><span class="status-pass">方案已确认</span><small>${reference.note}</small></td><td><button class="text-button" type="button" data-reference="${reference.id}">查看规范原文</button>${reference.sourceUrl ? `<a href="${reference.sourceUrl}" target="_blank" rel="noopener noreferrer">发布来源 ↗</a>` : ''}</td></tr>`).join('')}</tbody></table></div></section>
    <footer>“满足”仅指本模块检查项目，不等于整根梁或工程全面合格。受剪、裂缝、挠度、锚固、耐久性与完整构造尚未验算。核心结果需经工程师人工验收。</footer></main>
    <dialog id="pdf-dialog" aria-labelledby="pdf-title"><div class="pdf-toolbar"><div><h2 id="pdf-title">规范原文</h2><p id="pdf-page-note"></p></div><button type="button" class="secondary-button" id="pdf-close">关闭</button></div><p id="pdf-status" class="pdf-fallback" aria-live="polite"></p><p class="pdf-fallback"><a id="pdf-source" target="_blank" rel="noopener noreferrer">官方发布来源</a> <a id="pdf-open" target="_blank" rel="noopener noreferrer">新窗口打开同一原页</a></p><iframe id="pdf-frame" title="规范 PDF 原文" referrerpolicy="no-referrer"></iframe></dialog>`;
  const get = <T extends Element>(selector: string) => app.querySelector<T>(selector)!;
  const form = get<HTMLFormElement>('#beam-form');
  const status = get<HTMLParagraphElement>('#input-status');
  const geometry = get<HTMLDivElement>('#geometry-result');
  const process = get<HTMLDivElement>('#process-steps');
  const checkResults = get<HTMLDivElement>('#check-results');
  let hasResult = false;
  function readInput(): RawInput {
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? '');
    return { b: value('b'), h: value('h'), a_s: value('a_s'), A_s: value('A_s'), M_d: value('M_d'), concrete: value('concrete'), steel: value('steel'), tensionEdge: value('tensionEdge'), source: value('source'), beamType: value('beamType'), singleReinforced: data.has('singleReinforced'), nonPrestressed: data.has('nonPrestressed'), noSeismicCheck: data.has('noSeismicCheck'), ordinaryStatic: data.has('ordinaryStatic'), notDeepBeam: data.has('notDeepBeam'), demandIncludesImportance: data.has('demandIncludesImportance') };
  }
  function showErrors(errors: FieldErrors): void {
    form.querySelectorAll<HTMLElement>('.field-error').forEach(element => { element.textContent = ''; });
    form.querySelectorAll<HTMLElement>('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    for (const [key, message] of Object.entries(errors)) {
      get<HTMLElement>(`#${key}-error`).textContent = message;
      form.querySelector<HTMLElement>(`[name="${key}"]`)?.setAttribute('aria-invalid', 'true');
    }
  }
  function clearResults(): void {
    geometry.replaceChildren();
    get<HTMLElement>('#capacity-value').textContent = '—';
    get<HTMLElement>('#conclusion-value').textContent = '尚未计算';
    get<HTMLElement>('#conclusion-value').className = 'result-text';
    get<HTMLElement>('#calculation-state').textContent = '尚未计算';
    get<HTMLElement>('#input-summary').textContent = '';
    checkResults.innerHTML = '<p class="empty-note">重新计算后显示本次参数的验算结果。</p>';
    process.innerHTML = '<p class="empty-note">重新计算后显示本次参数的详细过程。</p>';
  }
  function renderResult(result: CalculationResult): void {
    clearResults();
    hasResult = true;
    if (result.status === 'invalid') {
      showErrors(result.errors);
      status.textContent = '未计算，请按输入旁的提示修改。';
      status.className = 'input-status invalid';
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    showErrors({});
    const outside = result.status === 'outside-model';
    const passed = result.status === 'calculated' && result.passed;
    const conclusion = outside ? '超出当前模型' : passed ? '满足本模块检查项目' : '不满足';
    get<HTMLElement>('#calculation-state').textContent = outside ? '模型不适用' : '本次验算已完成';
    get<HTMLElement>('#capacity-value').textContent = result.capacityKNm === null ? '—' : formatNumber(result.capacityKNm);
    get<HTMLElement>('#conclusion-value').textContent = conclusion;
    get<HTMLElement>('#conclusion-value').className = `result-text ${passed ? 'status-pass' : 'status-fail'}`;
    status.textContent = outside ? '按实配面积得到的受压区高度超出本简化模型，不输出有效承载力；不能直接据此判定一般截面不合格。' : result.capacityKNm === null ? '前置规范条件不满足，不输出有效设计承载力。请查看逐项判断。' : passed ? '满足本模块已检查项目；其他构造及使用性能项目未验算。' : '正截面受弯承载力不足，请查看实际需求与抗力比较。';
    status.className = `input-status ${passed ? 'success' : 'invalid'}`;
    geometry.textContent = `有效高度 h₀ = ${formatNumber(result.input.h)} − ${formatNumber(result.input.a_s)} = ${formatNumber(result.intermediate.h0)} mm`;
    geometry.className = 'geometry-value';
    get<HTMLElement>('#input-summary').textContent = `验算弯矩 M_d=${formatNumber(result.input.M_d)} kN·m（已含 γ₀）；${result.input.concrete} / ${result.input.steel}；来源：${result.input.source}`;
    checkResults.innerHTML = `<ul class="check-list"><li><span>材料组合与输入口径</span><span class="status-pass">已检查 / 已声明</span></li>${result.checks.map(check => `<li class="check-detail"><div><strong>${check.name}</strong><small>${formatNumber(check.actual)} ${check.operator} ${formatNumber(check.limit)} ${check.unit}</small>${referenceButtons(check.referenceIds)}</div><span class="${check.passed ? 'status-pass' : 'status-fail'}">${check.passed ? '满足' : check.id === 'compression-zone' ? '超出模型' : '不满足'}</span></li>`).join('')}${result.capacityKNm === null ? '<li><span>设计需求与承载力比较</span><span>未执行</span></li>' : ''}</ul>`;
    process.innerHTML = result.steps.map((step, index) => `<details ${['height', 'compression-zone', 'minimum-steel', 'comparison'].includes(step.id) ? 'open' : ''} data-step="${step.id}"><summary>${String(index + 1).padStart(2, '0')} ${escapeHtml(step.title)}</summary><div class="process-body"><p class="formula">${escapeHtml(step.formula)}</p><p>${escapeHtml(step.parameters)}</p><p><strong>数值代入：</strong>${escapeHtml(step.substitution)}</p><p><strong>结果 / 判断：</strong>${escapeHtml(step.result)}</p><div class="step-references">${referenceButtons(step.referenceIds)}</div></div></details>`).join('');
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
    try { renderResult(calculateBeamFlexure(readInput())); }
    catch {
      clearResults(); hasResult = true;
      showErrors({ general: '本次计算未完成，请检查参数或联系维护人员。' });
      status.textContent = '本次计算未完成，不输出结果。'; status.className = 'input-status invalid';
    }
  });
  get<HTMLButtonElement>('#validate-button').addEventListener('click', () => {
    clearResults(); hasResult = true;
    const checked = validateInput(readInput());
    showErrors(checked.ok ? {} : checked.errors);
    status.textContent = checked.ok ? '输入格式、材料组合及模型声明已检查；承载力未计算，请点击“开始计算”。' : '输入检查未通过，请修改后继续。';
    status.className = checked.ok ? 'input-status' : 'input-status invalid';
  });
  function onInputChange(): void {
    updateDiagram();
    if (!hasResult) return;
    hasResult = false; clearResults(); showErrors({});
    status.className = 'input-status';
    status.textContent = '参数已修改，上次结果已失效；请重新计算。';
  }
  form.addEventListener('input', onInputChange);
  form.addEventListener('change', onInputChange);
  const dialog = get<HTMLDialogElement>('#pdf-dialog');
  const frame = get<HTMLIFrameElement>('#pdf-frame');
  let pdfRequest = 0;
  app.addEventListener('click', async event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-reference]');
    if (!button) return;
    const reference = references.find(item => item.id === button.dataset.reference);
    if (!reference?.pdfUrl || !reference.filePage) return;
    const request = ++pdfRequest;
    frame.removeAttribute('src');
    const local = !reference.pdfUrl.startsWith('https:');
    const pdfUrl = new URL(reference.pdfUrl, document.baseURI).href;
    const pageUrl = `${pdfUrl}#page=${reference.filePage}&view=FitH`;
    get<HTMLHeadingElement>('#pdf-title').textContent = `${reference.standard} · ${reference.clause}`;
    get<HTMLParagraphElement>('#pdf-page-note').textContent = `PDF 文件第 ${reference.filePage} 页 / 印刷第 ${reference.printedPage} 页。页码仅适用于此文件；跨页内容请继续向后阅读。`;
    const source = get<HTMLAnchorElement>('#pdf-source');
    source.hidden = !reference.sourceUrl;
    if (reference.sourceUrl) source.href = reference.sourceUrl;
    const open = get<HTMLAnchorElement>('#pdf-open');
    open.hidden = true;
    const pdfStatus = get<HTMLParagraphElement>('#pdf-status');
    pdfStatus.textContent = local ? '正在检查原文文件…' : '正在打开官方原文；外站可能限制内嵌，无法显示时请查看官方来源。';
    dialog.showModal();
    if (local) {
      try {
        const response = await fetch(pdfUrl, { method: 'HEAD' });
        if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) throw new Error('missing');
        if (request !== pdfRequest || !dialog.open) return;
        pdfStatus.textContent = '已打开本地原文文件。若浏览器未自动定位，可按上方文件页序跳转。';
      } catch {
        if (request !== pdfRequest || !dialog.open) return;
        pdfStatus.textContent = '当前应用没有配置此原文 PDF。计算依据见已确认方案；需维护人员补齐文件后查看原页。';
        return;
      }
    }
    if (request !== pdfRequest || !dialog.open) return;
    frame.src = pageUrl;
    open.href = pageUrl; open.hidden = false;
  });
  get<HTMLButtonElement>('#pdf-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { ++pdfRequest; frame.removeAttribute('src'); });
}
