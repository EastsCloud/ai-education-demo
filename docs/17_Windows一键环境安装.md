# Windows 一键安装与启动

双击项目根目录的 `start-windows.cmd`。

首次运行会从 https://nodejs.org 下载适合 Windows x64 / ARM64 的 Node.js 24 ZIP，核对官方 SHA256，检查 Node 和内置 SQLite，然后安装到项目的 `.tools/nodejs/`。不需要管理员权限，不修改系统 PATH，也不需要 npm install。

安装成功后自动启动项目，浏览器访问 http://127.0.0.1:4177/ 。终端保持打开，Ctrl+C 停止服务。重复运行会复用已经安装并通过检查的本地环境；已有学习数据库会保留。

也可以在 PowerShell 执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "E:\AI Education\Semi AI\scripts\setup-windows.ps1"
```

只安装，不启动：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "E:\AI Education\Semi AI\scripts\setup-windows.ps1" -SkipStart
```

换端口：在上述命令后增加 `-Port 4178`。使用独立初始数据库：增加 `-Mode clean`（仍包含系统内置演示账号，不清空已有文件）。

安装完成后，原来的 `scripts/dev.ps1` 会自动寻找项目本地 Node，也支持系统 PATH 中已有的 Node.js 24+。系统终端里单独输入 node 仍可能找不到命令，这是项目本地安装的预期行为。

首次安装需要联网访问 nodejs.org；网络失败时会显示错误并退出，修复网络后重跑即可。安装下载与校验文件保留在 `runtime-data/node-setup-*`，实际运行环境在 `.tools/nodejs/`。项目交付清单不包括这些新增文件。
