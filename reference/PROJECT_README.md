# AI Education

一个面向 AI 教育产品原型的前端与本地运行时项目。

核心方法论：

```text
一对一 / 练中学 / 帮你学
```

当前 MVP 范围已整理到 `docs/mvp-scope-freeze.md`。后续开发应先看这份范围冻结稿，再看 `docs/development-prep.md` 和 `docs/product-decision-checklist.md`。

正式开发前的工程入口文档：

```text
docs/development-prep.md
```

当前学生端主导航：

```text
首页 / 测试 / 练习 / 报告
```

`任务` 是练习的来源和状态，不单独作为主导航。`知识图鉴` 是练习、解析、报告后的二级入口，不放在学生主导航。

## 项目结构

```text
ai education 2/
  index.html
  server/
    database.mjs
    local-api-server.mjs
    dev-server.mjs
  src/
    app.js
    styles.css
    core/
      dom.js
      format.js
      view-router.js
    data/
      mock-data.js
    modules/
      ability-result.js
      behavior-report.js
      daily-practice-engine.js
      home-view.js
      knowledge-atlas.js
      learning-curve.js
      onboarding-assessment.js
      practice-runtime.js
      practice-summary.js
      practice-view.js
      question-generator.js
      report-dashboard.js
  docs/
    README.md
    mvp-scope-freeze.md
    product-decision-checklist.md
    development-reminders.md
    development-prep.md
    mvp-development-tasks.md
    user-management.md
    system-architecture.md
    page-structure.md
    archive/
  README.md
```

## 运行方式

完整本地运行环境会同时提供页面和 SQLite 数据 API：

```text
http://127.0.0.1:4176/
```

它会把学生计划、测试会话和行为事件写入本机数据库；浏览器本地记录仍作为离线兜底。纯静态预览端口也可继续使用，但不会启用 API 同步。

开发状态页：

```text
http://127.0.0.1:4176/development-status.html
```

成品体验入口：

```text
http://127.0.0.1:4176/demo.html
```

如果没有启动本地服务，也可以直接双击 `index.html`，或在浏览器中打开该文件。

## 全系统自动测试

五名学生、五名家长和一名老师的可重复测试入口：

```text
node server/system-journey-e2e.mjs
```

测试会从注册开始，使用真实角色权限完成入学、测试、曲线、三天练习、阶段测试、三角色报告和同类参照，并在重启数据库后验证数据仍然存在。最新的持久化结果保存在 `data/system-e2e-final.sqlite`，最终报告见 `output/test-reports/system-e2e-final-report.md`。

## MVP 开发方向

- 整理模拟数据结构
- 固定入学测试、能力图、目标和学习曲线流程
- 强化练习闭环：原题重做、变式、分层提示、分步引导
- 让行为数据影响下一次出题逻辑
- 让报告读取行为数据，而不是静态文案
- 家长 / 老师观察端先做结构，再做独立运营页面
- 保持 SQLite 本地运行时与未来云端 API 的边界一致
