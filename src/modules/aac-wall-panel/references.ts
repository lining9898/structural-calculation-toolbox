export const references = {
 materials:{name:'JGJ/T 17-2020 · 第3.2.2、3.2.3条及表',page:14,printed:'8',pdf:'standards/jgjt17-uploaded.pdf',note:'取表中配筋板括号内强度值；弹性模量区分砂制品与粉煤灰制品。'},
 steel:{name:'JGJ/T 17-2020 · 第3.2.14条 / 表3.2.14',page:17,printed:'11',pdf:'standards/jgjt17-uploaded.pdf',note:'钢筋设计强度；实际板材配筋与产品构造另需核对。'},
 bending:{name:'JGJ/T 17-2020 · 第5.4.1条，公式5.4.1-1～3',page:30,printed:'24',pdf:'standards/jgjt17-uploaded.pdf',note:'不计受压钢筋贡献的受弯板平衡；x≤0.5h₀。'},
 shear:{name:'JGJ/T 17-2020 · 第5.4.2条',page:30,printed:'24–25',pdf:'standards/jgjt17-uploaded.pdf',note:'劈拉强度设计值用于受剪验算；续页为文件第31页。'},
 crack:{name:'JGJ/T 17-2020 · 第5.4.3条',page:31,printed:'25',pdf:'standards/jgjt17-uploaded.pdf',note:'标准组合下截面边缘拉应力不超过劈拉强度标准值；本版不计自应力有利项。'},
 deflection:{name:'JGJ/T 17-2020 · 第5.4.4、5.4.5条',page:31,printed:'25',pdf:'standards/jgjt17-uploaded.pdf',note:'标准组合、考虑长期作用；限值l₀/200。I₀为换算截面惯性矩；长期增大系数须由工程师确认。'},
 exterior:{name:'JGJ/T 17-2020 · 第5.4.6～8条',page:31,printed:'25',pdf:'standards/jgjt17-uploaded.pdf',note:'外墙需要风、抗震及连接可靠性验算；本页板身结果不能代表整个系统合格。'},
 seismic:{name:'T/CECS 553-2018 · 第5.2.1、5.2.3、5.2.4条',page:22,printed:'14–16',pdf:'standards/cecs553-uploaded.pdf',note:'抗震标准作用、设计作用及组合；现行系数协调和具体节点尚待确认，正式抗震结果暂不输出。'},
 connection:{name:'T/CECS 553-2018 · 第5.1.2、5.1.3条',page:22,printed:'14',pdf:'standards/cecs553-uploaded.pdf',note:'连接、层间位移和安装方法；节点及附录C仍待核对。'},
} as const;
export type ReferenceId=keyof typeof references;
