# 结构计算工具箱

面向结构工程师的 Web 结构构件计算工具箱。

## 当前交付

[打开工具箱首页](https://lining9898.github.io/structural-calculation-toolbox/)

按用户要求，原受弯模块已从当前应用移除，现仅交付主 UI。首页支持四个专业分类与当前分类工具搜索；所有工具标注待开发，暂不提供计算。历史计算代码可在 Git 历史中恢复，不表示任何模块已经验收。

技术栈：Vite、TypeScript、普通 HTML/CSS。无用户系统、数据库或后端。

## 本地运行与检查

```sh
npm ci
npm run dev
npm run build:preview
npm test
```

Node.js >=22.12。build:preview 只将网页和 assets 写入 docs；GitHub Pages 从 module/beam-flexure 分支的 /docs 发布。该分支暂保留原名作为既有预览来源，未合入 dev 或稳定分支。

当前测试为保留的 7 项公共单位检查；原受弯专用测试随模块移除，不再声称通过 46 项模块测试。首页以浏览器交互和响应式检查验证。

## 规范与计算约束

核心计算须由确定性程序完成，规范、适用条件和公式须先核对。旧 PRE-CALC CHECK 文档仅为历史记录，不代表当前首页具备计算功能。规范原始 PDF 保留本地并被 Git 忽略，不进入公开网页。

一次只开发、测试、验收一个模块。公共数据可共享，构件核心公式保持独立。后续模块的范围和公式按新确认方案实施。
