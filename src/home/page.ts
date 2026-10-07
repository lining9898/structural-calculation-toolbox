const groups = [
  { id: 'concrete', name: '混凝土结构', english: 'CONCRETE', mark: '01', description: '梁、板、柱等混凝土构件的截面设计与验算。', tools: [
    ['梁截面设计与验算', '矩形截面 · 正截面受弯 / 斜截面受剪'],
    ['T 形梁', 'T 形截面正截面受弯'],
    ['双筋矩形梁', '计入受压钢筋的截面受弯'],
    ['板', '板截面设计与验算'],
    ['柱', '柱截面设计与验算'],
  ] },
  { id: 'foundation', name: '地基基础', english: 'FOUNDATION', mark: '02', description: '基础构件计算与地基承载力验算。', tools: [
    ['独立基础', '独立基础构件计算'], ['条形基础', '条形基础构件计算'], ['地基承载力', '地基承载力验算'],
  ] },
  { id: 'steel', name: '钢结构', english: 'STEEL', mark: '03', description: '钢构件及连接计算，具体模块后续确定。', tools: [
    ['钢构件', '计算范围待确定'], ['连接节点', '计算范围待确定'],
  ] },
  { id: 'precast', name: '装配式结构', english: 'PRECAST', mark: '04', description: '装配式构件及连接节点的独立计算。', tools: [
    ['蒸压加气混凝土外墙板', '外墙板构件计算'], ['预制构件', '计算范围待确定'], ['连接节点', '节点设计与验算'],
  ] },
] as const;
const icon = `<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M10 7h20v26H10z" stroke="currentColor" stroke-width="1.6"/><path d="M13 10h14v20H13z" stroke="currentColor" stroke-width="1" opacity=".45"/><circle cx="15" cy="27" r="1.8" fill="currentColor"/><circle cx="25" cy="27" r="1.8" fill="currentColor"/><path d="M6 7v26M4 7h4M4 33h4M10 37h20" stroke="currentColor" opacity=".45"/></svg>`;
export function mountHome(app: HTMLElement): void {
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><a class="brand" href="#" aria-label="工具箱首页"><span class="brand-icon">${icon}</span><span>结构计算工具箱<small>STRUCTURAL TOOLBOX</small></span></a><p class="nav-label">计算工具 / TOOLS</p><nav aria-label="结构专业分类">${groups.map((group,index)=>`<button type="button" class="category-button ${index===0?'selected':''}" data-category="${group.id}" aria-pressed="${index===0}"><span class="category-number">${group.mark}</span><span>${group.name}</span><span class="category-arrow" aria-hidden="true">›</span></button>`).join('')}</nav><div class="sidebar-note"><span class="status-dot"></span>首页预览版<p>一次一个模块<br>逐项复核与验收</p></div></aside>
  <div class="main-shell"><header class="topbar"><span>工作台 <span class="breadcrumb">/ 工具箱首页</span></span><span class="topbar-note">确定性计算 · 透明过程 · 规范可查</span></header><main><section class="intro"><p class="eyebrow">STRUCTURAL CALCULATION TOOLBOX</p><h1>结构计算工具箱</h1><p class="intro-description">从构件出发，让每一步计算都能复核。</p><div class="notice"><span class="notice-mark">i</span><p>蒸压加气混凝土外墙板已开放开发预览，其余工具待开发。所有计算结果均须人工复核。</p></div></section>
  <section class="tool-section" aria-labelledby="category-title"><div class="section-heading"><div><p id="category-english" class="eyebrow"></p><h2 id="category-title"></h2><p id="category-description"></p></div><label class="search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="m12 12 5 5"/></svg><input id="tool-search" type="search" placeholder="查找当前分类下的工具" aria-label="查找当前分类下的工具"></label></div><div class="tool-table"><div class="table-head"><span>计算工具</span><span>计算范围</span><span>状态</span></div><div id="tool-list" aria-live="polite"></div></div><p class="catalog-note">外墙板处于开发预览阶段；每个计算模块须独立核对规范、测试及人工验收。</p></section>
  <section class="principles" aria-label="计算工具要求"><div><span>01</span><h3>算得对</h3><p>确定性公式计算，严格管理单位与边界。</p></div><div><span>02</span><h3>看得懂</h3><p>公式、数值代入和中间结果完整展示。</p></div><div><span>03</span><h3>查得到规范</h3><p>计算步骤对应条文，支持查看规范原文。</p></div></section><footer><span>输入参数 → 规范公式 → 过程展示 → 条件验算 → 计算结果</span><span>结构计算工具箱 · 首页预览</span></footer></main></div></div>`;
  let category: typeof groups[number] = groups[0];
  const search = app.querySelector<HTMLInputElement>('#tool-search')!;
  function render(): void {
    app.querySelector('#category-title')!.textContent=category.name;
    app.querySelector('#category-english')!.textContent=category.english;
    app.querySelector('#category-description')!.textContent=category.description;
    const keyword=search.value.trim().toLowerCase();
    const tools=category.tools.filter(tool=>tool.join(' ').toLowerCase().includes(keyword));
    app.querySelector('#tool-list')!.innerHTML=tools.length ? tools.map(tool=>`<div class="tool-row"><div class="tool-name"><span class="tool-icon">${icon}</span>${tool[0]==='蒸压加气混凝土外墙板'?'<a href="#aac-wall-panel">蒸压加气混凝土外墙板 →</a>':`<strong>${tool[0]}</strong>`}</div><span class="tool-description">${tool[1]}</span><span class="tool-status">${tool[0]==='蒸压加气混凝土外墙板'?'开发预览':'待开发'}</span></div>`).join('') : '<p class="empty-state">当前分类没有匹配的工具，请换个关键词。</p>';
  }
  app.querySelectorAll<HTMLButtonElement>('[data-category]').forEach(button=>button.addEventListener('click',()=>{
    category=groups.find(group=>group.id===button.dataset.category)!;
    search.value='';
    app.querySelectorAll<HTMLButtonElement>('[data-category]').forEach(item=>{const selected=item===button;item.classList.toggle('selected',selected);item.setAttribute('aria-pressed',String(selected));});
    render();
  }));
  search.addEventListener('input',render);
  app.querySelector('.brand')!.addEventListener('click',event=>{event.preventDefault();app.querySelector<HTMLButtonElement>('[data-category="concrete"]')!.click();search.value='';render();});
  render();
}
