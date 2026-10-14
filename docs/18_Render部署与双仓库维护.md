# Render 测试与展示部署

更新日期：2026-10-14。目标是让中美开发、测试团队访问同一个测试环境，
并提供独立的求职展示地址。现阶段保留 Node.js 24 和 SQLite。

## 两个仓库、两个服务

| 仓库 | Render 服务名 | 运行模式 |
| --- | --- | --- |
| EastsCloud/ai-education | ai-education-test | 真实账号、服务器评分、SQLite 持久化 |
| EastsCloud/ai-education-demo | ai-education-demo | 三角色展示，浏览器本地虚构数据 |

两仓库同一份代码，以环境变量区分运行模式。每个服务有独立 Disk。
展示数据保存在访问者浏览器中，不写入团队测试库；清除站点浏览器数据可重新体验。
展示服务仍使用同一 Node 入口，所以也配置独立 Disk 保留其服务器数据库。

## 推荐：从 Blueprint 一次创建两个服务

1. 登录 https://dashboard.render.com/ ，连接 GitHub 账号。
2. 授权 Render 读取 `ai-education` 和 `ai-education-demo` 两个仓库。
3. 点击 **New → Blueprint**，选择 **EastsCloud/ai-education**。
4. 分支 `main`，Blueprint 文件使用根目录 `render.yaml`。
5. 预览应有两个 Node Web Service，区域 Singapore，
   每个服务一个 1 GB Disk，挂载路径 `/var/data`。
6. 检查实例、磁盘费用，确认后创建。创建开始云资源计费。
7. 等两个服务显示 Live，使用控制台实际显示的 URL（可能有随机后缀）。

**只创建这一个 Blueprint，不要再从 demo 仓库重复创建。**
配置中的最小付费实例 ID 为 `0.5c-512mb`（0.5 CPU / 512 MB）；
控制台也可能显示 Starter。Free 实例不能挂持久磁盘。

## 手动创建 Web Service 的设置

点击 **New → Web Service**，分别选仓库并设置以下字段。
手动创建不会自动套用 render.yaml，必须自行设置磁盘和变量。

| 字段 | 测试服务 | 展示服务 |
| --- | --- | --- |
| Repository | EastsCloud/ai-education | EastsCloud/ai-education-demo |
| Name | ai-education-test | ai-education-demo |
| Branch | main | main |
| Region | Singapore | Singapore |
| Root Directory | 留空，package.json 在根目录 | 留空 |
| Runtime / Language | Node | Node |
| Build Command | node --version | node --version |
| Start Command | npm start | npm start |
| Health Check Path | /api/health | /api/health |
| Instance | 最小付费实例，0.5 CPU / 512 MB | 同左 |
| Auto-Deploy | On Commit | On Commit |

Environment Variables：

| Key | 测试服务 | 展示服务 |
| --- | --- | --- |
| NODE_ENV | production | production |
| NODE_VERSION | 24.21.0 | 24.21.0 |
| HOST | 0.0.0.0 | 0.0.0.0 |
| AI_EDUCATION_DATABASE_PATH | /var/data/ai-education.sqlite | /var/data/ai-education.sqlite |
| AI_EDUCATION_SEED_DEMO_ACCOUNTS | false | false |
| AI_EDUCATION_PUBLIC_DEMO | false | true |

不要手动填写 PORT，应用读取 Render 提供的端口。

## Disk 设置（SQLite 持久化）

在创建表单的 Advanced / Add Disk 区域添加磁盘；若未显示，
进入已创建服务的 **Disks → Add Disk**。

- Mount Path：`/var/data`
- Size：`1 GB`
- 环境变量：`AI_EDUCATION_DATABASE_PATH=/var/data/ai-education.sqlite`

**Disk 和数据库路径必须同时设置，再邀请团队录入测试数据。**
无 Disk 时产生的数据不会因为后来添加 Disk 自动搬迁。
为两个服务分别创建磁盘，不要创建 PostgreSQL 服务。

SQLite 启动自动创建文件和表；WAL/SHM 文件也在同一持久目录。
不必上传本机数据库，也不要在 Build 或 Pre-Deploy Command 初始化数据库。
Disk 仅运行时挂载，重启与部署不会复制快照覆盖已有数据库。
挂 Disk 的服务保持单实例，重新部署有短暂中断；代码回滚不会回滚数据库。

## 首次部署验证

两个服务分别访问 `/api/health`，应返回 `ok: true`。

测试服务：
1. 打开 `/signin.html`，注册虚构学生，完成基本信息并做几道题。
2. 注册家长或老师，通过邀请码关联学生并查看报告。
3. 在 Render 执行 Restart Service 或 Deploy latest commit。
4. 再登录，确认账号、关系、练习进度还在。
5. 未登录访问 `/server/database.mjs` 和 `/test-data/system-e2e-final.sqlite`，应为 404。

展示服务：
1. 根地址直接显示学生、家长、老师三个体验入口。
2. 进入学生体验，再切换到家长或老师，检查同一浏览器的展示状态。
3. 无痕窗口应有独立的体验状态。

中美团队各自用实际网络验收完整流程。区域不能保证跨境网络稳定。

## 后续开发与双仓库更新

当前 Windows 主工作目录：`E:\AI Education\Semi AI`。
origin 是主仓库，demo 是展示仓库。

```powershell
Set-Location 'E:\AI Education\Semi AI'
.\scripts\dev.ps1 -Action test
.\scripts\dev.ps1 -Action e2e
node server/render-smoke.mjs
git add .
git commit -m "Describe the change"
.\scripts\push-both.ps1
```

脚本先核对远端地址及历史再推送，不会强制覆盖。
若远端有独立提交，先合并处理，再同步两边。
两服务分别跟踪对应仓库 main，推送触发各自的自动部署。
GitHub Actions 验证合同、E2E 和启动；也可以把 Render 自动部署
切到 After CI Checks Pass，检查成功再部署。

新 clone 主仓库只有 origin，需要执行：
`git remote add demo https://github.com/EastsCloud/ai-education-demo.git`。

本地数据库、日志、安装包和环境变量不推送。
原交付快照保留在本地；新 clone 后用 E2E 生成新的五人测试数据。

## 常见问题

- **No open ports detected**：检查 HOST=0.0.0.0、Start Command=npm start 和 Logs。
- **重启后账号消失**：检查 Disk=/var/data 和数据库路径。
- **首页能开但账号不保存**：确认最新代码、测试服务 PUBLIC_DEMO=false。
- **展示仍要求登录**：展示服务 PUBLIC_DEMO=true 后重新部署、刷新。
- **Disk 创建失败**：确认使用付费实例。
- **找不到 package.json**：Root Directory 留空。
- **Windows npm test 的 EPERM**：用 scripts/dev.ps1 -Action test 直接逐个执行；
  Linux CI 用 npm test。

## 官方文档与历史材料

- https://render.com/docs/deploy-node-express-app （创建流程也适用原生 Node HTTP）
- https://render.com/docs/disks
- https://render.com/docs/blueprint-spec
- https://render.com/docs/node-version
- https://render.com/docs/regions

原 2026 年 9 月交付文档与 MANIFEST.sha256 是历史基线，
更新后的 Git checkout 不再要求通过原交付 checksum。
