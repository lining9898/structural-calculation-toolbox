export interface Reference {
  id: string;
  step: string;
  standard: string;
  clause: string;
  status: 'pending';
  note: string;
  sourceUrl?: string;
  pdfUrl?: string;
  filePage?: number;
  printedPage?: string;
}

const concreteAnnouncement = 'https://www.mohurd.gov.cn/gongkai/zc/wjk/art/2021/art_17339_762454.html';
const officialConcretePdf = 'https://www.mohurd.gov.cn/api-gateway/jpaas-web-server/front/document/download?fileName=%E6%B7%B7%E5%87%9D%E5%9C%9F%E7%BB%93%E6%9E%84%E9%80%9A%E7%94%A8%E8%A7%84%E8%8C%83&fileUrl=YW5UzzlvCwcM%2FNHHX%2FtT6BJ6yM%2FAU1LVtmOVIvNjcuqxaLMLAlBp0EDqzYTeRbwVRDlHIQZ1RBiZxVQ%2Fakt0C2aZ86z4napUYZYbC1ZP2bgUhci45Od3s91MVFev0l%2BPuO8CFWJKBkexESKyNa6CnQ%3D%3D';

/** 条号及页码只记录已实际读取的原页，未核对内容不猜测。 */
export const references: readonly Reference[] = [
  { id: 'demand', step: '设计需求与承载力表达式', standard: 'GB 55001-2021 / GB/T 50010-2010', clause: '待人工确认', status: 'pending', note: '需确认设计弯矩定义与结构重要性因素，避免漏计或重复计入。', sourceUrl: 'https://ebook.chinabuilding.com.cn/c/2021-07-17/94509.shtml' },
  { id: 'materials', step: '材料适用范围与设计值', standard: 'GB 55008-2021 / GB/T 50010-2010', clause: '条文及材料表待人工确认', status: 'pending', note: '尚未录入 f_c、f_t、f_y；界面等级为拟支持选项，不代表材料表已确认。', sourceUrl: concreteAnnouncement },
  { id: 'stress-block', step: '等效应力图与界限高度', standard: 'GB/T 50010-2010（2024年修订）', clause: '待人工确认', status: 'pending', note: 'α₁、ξ_b 等系数及适用条件需对照真实现行正文。', sourceUrl: 'https://sjw.qingdao.gov.cn/cxjsj3/cxjsj200/cxjsj_hydt1/202406/t20240617_8078520.html' },
  { id: 'capacity', step: '受压区高度与正截面承载力', standard: 'GB/T 50010-2010（2024年修订）', clause: '待人工确认', status: 'pending', note: '内力平衡、力臂及受弯承载力公式未确认，禁止输出承载力。' },
  { id: 'minimum-steel', step: '最小配筋率', standard: 'GB 55008-2021', clause: '第4.4.6条 / 表4.4.6', status: 'pending', note: '已核对条表位置；全部表注、配筋率口径与设计标准衔接仍待确认。', sourceUrl: concreteAnnouncement, pdfUrl: officialConcretePdf, filePage: 13, printedPage: '10' },
  { id: 'versions', step: '现行版本与修订状态', standard: '上述三本规范', clause: '待人工确认', status: 'pending', note: '发布公告不等于已完成截至使用日期的修订、替代核查。' },
];
