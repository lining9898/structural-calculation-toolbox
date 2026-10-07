# 结构计算工具箱

面向结构工程师的 Web 结构构件计算工具箱。

## 当前交付

[打开工具箱首页](https://lining9898.github.io/structural-calculation-toolbox/)

按用户要求，原受弯模块已从当前应用移除，首页支持四个专业分类与工具搜索；AAC外墙板开放开发预览，其余工具待开发。历史计算代码可在 Git 历史中恢复，不表示任何模块已经验收。

技术栈：Vite、TypeScript、普通 HTML/CSS。无用户系统、数据库或后端。

## 本地运行与检查

```sh
npm ci
npm run dev
npm run build:preview
npm test
```

Node.js >=22.12。build:preview 只将网页和 assets 写入 docs；GitHub Pages 从 module/beam-flexure 分支的 /docs 发布。该分支暂保留原名作为既有预览来源，未合入 dev 或稳定分支。

当前38项AAC板身风作用测试与7项公共单位测试通过。AAC预览仅支持限定板身风作用，抗震、连接、吊装及完整构造尚未完成，不代表整个模块完成。详见docs/aac-wall-panel-development-report.md。

## 规范与计算约束

核心计算须由确定性程序完成，规范、适用条件和公式须先核对。旧 PRE-CALC CHECK 文档仅为历史记录，不代表当前首页具备计算功能。规范原始 PDF 保留本地并被 Git 忽略，不进入公开网页。

一次只开发、测试、验收一个模块。公共数据可共享，构件核心公式保持独立。后续模块的范围和公式按新确认方案实施。

## AAC开发预览

板身按JGJ/T17；抗震相关验算拟参照CECS553，当前抗震正式计算仍待规范协调与节点确认。源代码独立保留在module/aac-wall-panel。原始PDF仍仅本地使用，在线只发布网页产物。
