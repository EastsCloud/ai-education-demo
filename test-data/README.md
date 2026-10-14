# 测试数据说明

当前 Git 仓库不提交 SQLite 文件。以下是原交付快照的说明；快照保留在本地交付包。
从 Git clone 后，可以运行 `npm run test:e2e` 生成新的五人测试库和账号报告，
或用 `npm start` / `scripts/dev.ps1 -Action start -Mode clean` 启动初始开发库。

## 1. 数据性质

`test-data/system-e2e-final.sqlite` 只包含自动生成的虚构人物和学习行为，不包含真实学生、家长、老师或学校信息。

基准运行编号：`journey-mtsalc9v`。

## 2. 使用方式

不要直接用应用程序打开并修改基准数据库。`scripts/start-test-data.sh` 会把它复制到 `runtime-data/system-e2e-it-review.sqlite`，页面操作只写入副本。

恢复基准：

```bash
RESET_TEST_DATA=1 ./scripts/start-test-data.sh
```

## 3. 包含内容

- 5 名测试学生
- 5 名对应家长
- 1 名关联五名学生的老师
- 15 条测试中使用的成人关系
- 15 次初始、性格和阶段测试
- 15 次每日练习运行
- 207 个题目交付
- 321 条行为事件
- 10 条成人留言

数据库还可能包含本地演示所需的种子记录，因此整库账号总数不一定等于上述 11 个端到端角色。报告数字按运行编号及角色前缀统计。

## 4. 测试数据不能用于

- 证明真实教育效果
- 训练学生画像或题目模型
- 推断真实同龄学生分布
- 对外宣传真实留存、正确率或商业转化
- 与真实学生数据合并

## 5. 数据完整性

交付时数据库使用 SQLite 备份机制生成独立文件并执行 `PRAGMA integrity_check`。包内不依赖外置 WAL 或 SHM 文件。

