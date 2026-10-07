/** 经用户确认的第二版方案；纯材料数据，不包含构件公式。单位 N/mm²。 */
export const concreteMaterials = {
  C25: { fc: 11.9, ft: 1.27 },
  C30: { fc: 14.3, ft: 1.43 },
  C35: { fc: 16.7, ft: 1.57 },
  C40: { fc: 19.1, ft: 1.71 },
  C45: { fc: 21.1, ft: 1.80 },
  C50: { fc: 23.1, ft: 1.89 },
} as const;

export const steelMaterials = {
  HRB400: { fy: 360, Es: 200_000 },
  HRB500: { fy: 435, Es: 200_000 },
} as const;

export const materialSources = {
  concrete: 'GB/T 50010-2010：第4.1.4条、表4.1.4-1/-2（2024局部修订文件第6—7页）',
  steel: 'GB/T 50010-2010：第4.2.3条表4.2.3-1、第4.2.5条表4.2.5（2024局部修订文件第9、11页）',
} as const;
