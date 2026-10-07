export interface Reference {
  id: string;
  step: string;
  standard: string;
  clause: string;
  status: 'confirmed';
  note: string;
  sourceUrl?: string;
  pdfUrl?: string;
  filePage?: number;
  printedPage?: string;
}

const concreteAnnouncement = 'https://www.mohurd.gov.cn/gongkai/zc/wjk/art/2021/art_17339_762454.html';
const officialConcretePdf = 'https://www.mohurd.gov.cn/api-gateway/jpaas-web-server/front/document/download?fileName=%E6%B7%B7%E5%87%9D%E5%9C%9F%E7%BB%93%E6%9E%84%E9%80%9A%E7%94%A8%E8%A7%84%E8%8C%83&fileUrl=YW5UzzlvCwcM%2FNHHX%2FtT6BJ6yM%2FAU1LVtmOVIvNjcuqxaLMLAlBp0EDqzYTeRbwVRDlHIQZ1RBiZxVQ%2Fakt0C2aZ86z4napUYZYbC1ZP2bgUhci45Od3s91MVFev0l%2BPuO8CFWJKBkexESKyNa6CnQ%3D%3D';

/** 条号及页码只记录已实际读取的原页，未核对内容不猜测。 */
const base = 'standards/gb50010-2015.pdf';
const amendment = 'standards/gb50010-2024-amendment.pdf';
const standard = 'GB/T 50010-2010（2015正文＋2024修订）';
const entry = (id: string, step: string, clause: string, pdfUrl: string, filePage: number, printedPage: string, note: string): Reference => ({ id, step, standard, clause, status: 'confirmed', pdfUrl, filePage, printedPage, note });

export const references: readonly Reference[] = [
  { id: 'demand', step: '设计需求与抗力表达式', standard: 'GB 55001-2021', clause: '第3.1.13条 / 式3.1.13-1、-2', status: 'confirmed', note: '按已确认输入合同：M_d包含γ₀，程序不重复乘入。', pdfUrl: 'https://sjw.nanjing.gov.cn/gdzsj/zcfg/gfxwj/202402/P020240228543415520360.pdf', filePage: 12, printedPage: '11', sourceUrl: 'https://sjw.nanjing.gov.cn/gdzsj/zcfg/gfxwj/index_1.html' },
  entry('resistance-factor', '静力抗力系数与弯矩口径', '第3.3.2条 / 式3.3.2-1、-2及注', base, 24, '9—10', '普通静力γ_Rd=1.0；下一页注说明M已含γ₀S。需其他系数的情形不适用。'),
  entry('material-grade', '混凝土与钢筋组合', '第4.1.2条', amendment, 5, '2—3', '条文跨下一页；HRB500时混凝土不低于C30。'),
  entry('concrete-fc', '混凝土抗压强度设计值', '第4.1.4条 / 表4.1.4-1', amendment, 6, '3', '设计值f_c，不是标准值f_ck。'),
  entry('concrete-ft', '混凝土抗拉强度设计值', '第4.1.4条 / 表4.1.4-2', amendment, 7, '4', '设计值f_t，不是标准值f_tk。'),
  entry('steel-fy', '钢筋抗拉强度设计值', '第4.2.3条 / 表4.2.3-1', amendment, 9, '6', 'HRB400取360、HRB500取435 N/mm²。'),
  entry('steel-modulus', '钢筋弹性模量', '第4.2.5条 / 表4.2.5', amendment, 11, '8', '本版两种钢筋E_s=200000 N/mm²。'),
  entry('geometry', '有效高度定义', '第6.2.7条、6.2.14条', base, 53, '38；42', 'h₀定义在第53页，a_s定义在第57页；a_s不是保护层厚度。'),
  entry('stress-block', '等效应力图系数', '第6.2.6条', base, 52, '37—38', '本版C25—C50：α₁=1.0、β₁=0.80；条文跨下一页。'),
  entry('ultimate-strain', '混凝土极限压应变', '第6.2.1条 / 式6.2.1-5及限值', base, 50, '35', '非均匀受压，C25—C50的ε_cu取0.0033。'),
  entry('balanced-zone', '界限受压区高度', '第6.2.7条 / 式6.2.7-1', base, 53, '38', '有屈服点、单一牌号受拉钢筋。'),
  entry('equilibrium', '受压区内力平衡', '第6.2.10条 / 式6.2.10-2', base, 55, '40', '按已确认单筋模型，将预应力筋、受压钢筋项置零。'),
  entry('compression-limit', '受压区高度限制', '第6.2.10条 / 式6.2.10-3', base, 55, '40', 'x≤ξ_bh₀；超过时停止本简化模型输出。'),
  entry('model-exception', '特定配筋情形与受压筋条件', '第6.2.13、6.2.14条', base, 57, '42', '本版不处理这些特定情形；不将超出模型直接断言为一般截面不合格。'),
  entry('capacity', '矩形截面受弯承载力', '第6.2.10条 / 式6.2.10-1', base, 55, '40', '单筋代数简化，不伪装成另列规范公式。'),
  entry('minimum-steel-amendment', '最小配筋的现行规范衔接', '第8.5.1条（2024修订）', amendment, 14, '11', '按GB55008执行；框选旧表和表注为删除内容。'),
  { id: 'frame-width', step: '框架梁最小宽度', standard: 'GB 55008-2021', clause: '第4.4.4条第1款', status: 'confirmed', note: '仅框架梁检查b≥200mm。', sourceUrl: concreteAnnouncement, pdfUrl: officialConcretePdf, filePage: 12, printedPage: '9' },
  { id: 'minimum-steel', step: '最小配筋率及面积口径', standard: 'GB 55008-2021', clause: '第4.4.6条 / 表4.4.6及表注', status: 'confirmed', note: '梁ρ_min=max(0.002,0.45f_t/f_y)；矩形分母bh；表注跨下一页；不采用板类0.15%例外。', sourceUrl: concreteAnnouncement, pdfUrl: officialConcretePdf, filePage: 13, printedPage: '10—11' },
];
