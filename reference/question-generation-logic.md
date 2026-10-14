# Question Generation Logic / 题目产生逻辑

本文档只讨论第一层：**题目本身如何产生**。它不讨论某个学生此刻应该收到哪一道题；那是第二层“用户匹配逻辑”。

## 1. 专业参考

这一块在教育测评里接近 **Automatic Item Generation (AIG)**，也就是自动题目生成。AIG 的基本思想是：先由专家定义一个题目模型（item model），再由算法从这个模型生成一组同族题目。

和 AI Education 的方向对应起来：

- AIG 里的 item model = 我们的题型模型。
- AIG 里的 item family = 我们的同一题型变式题族。
- AIG 里的 item generation = 我们的边界内实时出题。
- QTI 里强调的 metadata、response details、scoring logic = 我们题目对象里的能力维度、作答结构、答案与评分逻辑。

参考资料：

- Automatic Item Generation: https://en.wikipedia.org/wiki/Automatic_item_generation
- 1EdTech QTI: https://www.1edtech.org/standards/qti
- Gierl & Lai, The role of item models in automatic item generation: https://doi.org/10.1080/15305058.2011.635830

## 2. 我们自己的定义

AI Education 的题目产生逻辑不是传统题库，也不是让 AI 随机写题。

每一类题应该是一个 **bounded item model / 有边界的题型模型**：

```text
题型模型
= 样题
+ 变量槽
+ 变量合法边界
+ 变式边界
+ 步骤延展边界
+ 答案生成规则
+ 合法性校验规则
+ steps 分解规则
+ 提示分层规则
+ 能力维度映射
```

这个模型负责回答：

- 这一类题的基本结构是什么？
- 哪些数字、条件、问法可以变化？
- 哪些变化会保持同一题型？
- 哪些变化会变成更高一级题型？
- 什么情况下题目无解、不合理或违背基本逻辑？
- 答案怎么生成？
- 解题步骤怎么拆？
- 每一层提示怎么给？

数学题目的内容原则：

- 即使训练目标是计算，也尽量用问题解决 / 应用情境承载。
- 不让学生从一开始形成“数学就是裸算”的观念。
- 计算应该表现为解决问题的工具，而不是独立目的。
- 题目先要求学生理解情境、翻译语言、找到关系，再进入计算。

## 3. 边界的第一含义：合法性与可解性

这里的“边界”首先不是用户难度边界，而是题目合法性边界。

生成器必须保证：

- 不能生成无解题。
- 不能生成条件矛盾题。
- 不能违反样题的基本数量关系。
- 不能生成虽然能算但不符合教学目的的题。
- 如果当前阶段要求整数解，就不能随机生成复杂分数或小数。
- 如果题目目标是训练一个核心关系，就不能加入会改变核心关系的额外条件。

### 3.1 当前执行的答案复算校验

每一道数学题在进入学生流程前，都必须由受限的答案规则解释器独立复算一次。它不执行任意代码，只允许当前逻辑库需要的数学结构：四则运算、百分数、括号、向上取整、指定精度的四舍五入，以及一元一次方程。

校验器会拒绝未知函数、非法标识符、除以零、非线性式、没有唯一解的方程，或与题目保存答案不一致的规则。复算通过是下发题目的内部质量凭据之一。

当前题型同时保存一份私有的 `solutionDerivation`：每一条 steps 都按顺序绑定到四类证据之一：题干情境、核心答案规则、受限解释器复算或最终答案核对。该链还绑定题型、变量槽、情境模板和四阶段帮助路径。任一绑定、复算结果或依赖顺序不一致，题目就不能进入 `system_validated` 状态。题目文字、答案、种子和完整复算轨迹仍只保留在后台。

## 4. 题型模型结构

建议每个题型模型至少包含以下字段：

| 字段 | 含义 |
| --- | --- |
| `id` | 题型唯一编号 |
| `subjectId` | 学科 |
| `knowledgeClusterId` | 知识簇 |
| `seedQuestion` | 样题 |
| `coreRelation` | 核心数学 / 学科关系 |
| `variableSlots` | 可变化的变量槽 |
| `variableBounds` | 变量合法范围和约束 |
| `coreRelation` | 不随故事和数字变化的核心数量 / 几何 / 数据关系 |
| `variantBoundaries` | 哪些变化仍属于本题型 |
| `stepExtensionBoundaries` | 可以增加哪些步骤，最多增加到哪里 |
| `answerRule` | 答案生成规则 |
| `validationRules` | 合法性校验规则 |
| `solutionStrategies` | 可验证解题思路，例如代数法、画图法、列表法、有逻辑的试猜 |
| `solutionSteps` | 标准 steps 分解模板 |
| `hintLayers` | 提示分层模板 |
| `guidedSteps` | 分步引导模板 |
| `supportModes` | 可展开帮助模式，例如折叠提示和分步引导 |
| `abilityDimensions` | 绑定能力维度 |
| `itemTags` | 题目标记体系，包含水平、学制、知识、能力、证据、图鉴和运行模式 |
| `qualityChecks` | 题目质量检查 |

当前执行中的数学逻辑库会把上述内容组装为私有的版本化 `logicModel`。它记录题型核心关系、变量槽、允许变式、种子和答案区间，以及四阶段基础路径的数量边界。候选题的题干、答案规则、步骤链和 `logicModel` 必须互相一致，才能被下发。原题与数字变式使用“读题翻译 -> 找关系 -> 计算 -> 检查”的四步引导；可选同类进阶题 S1 在计算前加入“整理信息”，S2 再加入“规划步骤”。这两种扩展必须有可验证的结构化步骤绑定，不能只存在于后台答案链。第三次自愿同类进阶可在少数具备已验证逆关系的题型中切换未知量；第四次及以后可在已声明两步关系的题型中加入一个真实的新条件和第二次计算。每种 R1 / M1 题型都必须单独声明生成边界、答案边界与题型级语义校验，不能由通用文字改写冒充。未来全 AI 候选题在没有题型级语义校验器前，也必须绑定到同一份规范。

## 4.1 题目标记体系

每一道题，包括以后 AI 实时生成的题，都必须带完整标记。没有标记的题不能进入测试或练习。

专业参考：

- 1EdTech QTI 说明了题目和测试内容、结果数据需要可交换、可追踪，并包含 item / test / result / metadata 等结构。
- Evidence-Centered Design 的核心思想是先定义要判断的学生能力，再定义什么作答证据可以支持判断，最后设计能收集这些证据的任务。
- Common Core Mathematics 把数学分为内容标准和数学实践，例如 problem solving、modeling、precision、structure 等。
- NGSS 科学标准采用三维学习：学科核心概念、科学与工程实践、跨学科概念。

AI Education 的题目标记分成 10 类：

| 标签类 | 字段示例 | 作用 |
| --- | --- | --- |
| `systemLevelTags` | `education_system`, `grade_band`, `curriculum_standard`, `target_level` | 对应不同学制、年级和标准体系 |
| `difficultyTags` | `difficulty_level`, `cognitive_demand`, `dok_level`, `estimated_time_sec` | 控制难度、认知要求和测试节奏 |
| `knowledgeTags` | `knowledge_cluster_id`, `knowledge_point_ids`, `prerequisite_ids` | 标记到底在练什么知识 |
| `atlasTags` | `atlas_entry_ids`, `common_misconception_ids` | 连接知识图鉴、错题集和概念归纳 |
| `abilityTags` | `ability_dimensions`, `evidence_targets` | 对应多维能力图 |
| `practiceTags` | `runtime_mode`, `variant_level`, `repeat_role`, `support_allowed` | 区分测试、练习、原题重做、变式 |
| `generationTags` | `logic_unit_id`, `seed_id`, `variable_profile_id`, `validation_rule_ids` | 追踪题目如何生成、如何校验 |
| `solutionTags` | `strategy_ids`, `step_template_id`, `hint_template_id`, `guided_mode_id` | 保证解析、提示和分步引导来自同一套逻辑 |
| `evidenceTags` | `scoring_rule_id`, `observable_behaviors`, `response_format` | 记录能证明什么、怎么评分 |
| `qualityTags` | `review_status`, `ai_generated`, `human_verified`, `version` | 控制 AI 出题质量和上线门槛 |

### 4.1.1 学制与水平标记

同一道题可以映射到不同学制中的大致位置。系统不要只写“难度 3”，而要同时记录它在不同标准里的位置。

示例：

```json
{
  "education_system": ["US_CCSS", "CN_National", "IB_MYP"],
  "grade_band": ["US_G6", "CN_G6"],
  "curriculum_standard": ["CCSS.Math.Content.6.EE"],
  "target_level": "grade_6_core",
  "readiness_level": "early_algebra_entry"
}
```

这些标签用于：

- 根据学生所在学制选择题目。
- 把能力图翻译成家长能理解的年级 / 水平表达。
- 支持未来多国家、多课程体系扩展。

### 4.1.2 知识与科学维度标记

这里的“科学维度”不是只指 science 学科，而是指一题到底在测什么能力和证据。

数学题至少标记：

- 数学内容域，例如 algebra / equation / ratio。
- 知识点，例如 total-difference relationship。
- 数学实践，例如 model with mathematics、attend to precision。
- 能力维度，例如 reading extraction、equation building、calculation stability、variant transfer。

科学题至少标记 NGSS 式三维：

- Disciplinary Core Ideas：学科核心概念。
- Science and Engineering Practices：科学与工程实践。
- Crosscutting Concepts：跨学科概念。

英语题至少标记：

- language domain，例如 vocabulary / grammar / reading / writing。
- skill focus，例如 inference / main idea / sentence structure。
- text complexity，例如 lexical load、sentence length、background knowledge demand。

### 4.1.3 证据标记

每道题必须说明：学生的作答能证明什么。

示例：

```json
{
  "evidence_targets": [
    "can_extract_total_and_difference",
    "can_translate_language_to_equation",
    "can_compute_clean_integer_solution"
  ],
  "observable_behaviors": [
    "answer_correctness",
    "response_time",
    "answer_revision",
    "uncertain_choice",
    "hint_depth_in_practice_mode"
  ]
}
```

测试模式下不开放提示，但仍记录：

- 答案
- 用时
- 是否不确定 / 跳过
- 是否修改答案
- 题型和能力维度

练习模式下还记录：

- 打开第几层提示
- 是否进入分步引导
- 是否看之前原题
- 是否完成原题重做和变式迁移

### 4.1.4 上线门槛

AI 生成题必须同时通过：

- `generationTags` 完整：能追踪来自哪个题型模型。
- `knowledgeTags` 完整：知道在练什么知识。
- `abilityTags` 完整：知道进入哪个能力维度。
- `solutionTags` 完整：答案、steps、提示、分步引导可验证。
- `qualityTags.review_status` 至少为 `system_validated`。

如果标签不完整，即使题目看起来合理，也不能发给学生。

## 5. 数学样例：总量与差值关系

样题：

```text
甲数比乙数多 8，两个数一共 38，甲数和乙数分别是多少？
```

核心关系：

```text
a + b = total
a - b = difference
```

变量槽：

| 变量 | 说明 | 合法边界 |
| --- | --- | --- |
| `total` | 两个数总和 | 正整数，建议 20-160 |
| `difference` | 两个数差值 | 正整数，必须小于 total |
| `a` | 较大数 | 由规则生成 |
| `b` | 较小数 | 由规则生成 |

合法性规则：

```text
total > difference
(total - difference) % 2 === 0
b = (total - difference) / 2
a = b + difference
a > 0
b > 0
a + b === total
a - b === difference
```

答案规则：

```text
b = (total - difference) / 2
a = (total + difference) / 2
```

## 6. 变式边界

同一题型内部可以做这些变化：

| 等级 | 变化 | 是否仍属于同一题型 |
| --- | --- | --- |
| L0 | 原题不变 | 是 |
| L1 | 只换 1 个数字 | 是 |
| L2 | 换 2 个数字 | 是 |
| L3 | 关系表述重构，例如“多”改为等价的“少” | 是 |
| L4 | 问法先行、条件后置 | 是 |
| L5 | 改变故事场景但保留关系 | 是 |
| R1 | 在已验证的逆关系中切换未知量 | 是，但仅限题型明确声明该边界 |
| M1 | 在已验证的应用关系中加入一个真实的新条件和第二次计算 | 是，但仅限题型明确声明该边界 |

题目对象会保留对应的变式代码（`L0`-`L5`；额外步骤延展为 `S1` / `S2`；受验证的反向未知量为 `R1`；真实两步关系为 `M1`）。这使图鉴、报告、正式测试和未来 AI 投放都能区分“换数字”“换关系表述”“换问法”“增加整理步骤”“切换未知量”和“增加真实计算关系”，而不会把它们混成同一种难度变化。

同一份已验证步骤链还会生成三种可选解题入口：关系式法、按学科域选择的图形 / 表格法、以及有逻辑的试猜或逆向检查法。它们不直接暴露答案；每一步都复用题目自身的关系和计算链。题目携带的策略 ID、策略模板版本和策略文字必须彼此一致，否则不能下发。这样未来 AI 可以提出新的表达方式，但在策略级语义校验放宽以前，仍只能使用与规范完全绑定的帮助结构。

不应该越界的变化：

- 从两个未知数变成三个未知数。
- 加入比例关系、百分比关系或速度关系。
- 加入需要新知识点才能完成的条件。
- 让答案出现当前阶段不准备训练的复杂形式。

### 6.1 年级边界不是显示标签

同一个题族可以跨多个年级，但不能把高年级的数字范围和步骤负担直接发给低年级学生。因此生成器在每次出题时还要解析一个 `instructionalGrade`。它来自当前的评估 / 学习阶段，而不是只看长期目标：

```text
family.gradeBands
+ 当前测试或当前教学阶段对应的年级
-> instructionalGrade
-> grade-aware seed range
-> 题目变量、答案、步骤和完整标签
```

系统把这个年级同时写入：

- `systemLevelTags.instructionalGrade`
- `difficultyTags.instructionalGrade`
- `generationTags.instructionalGrade`

这样，后续的能力图、正式测试、图鉴和报告既能知道题目属于哪个题族，也能知道它实际以哪个年级的数字与负荷交付。年级适配只在本题族允许的范围内收紧或放宽变量，不会把低年级题偷偷变成需要新知识的题。

## 7. 步骤延展边界

步骤延展是从同一个核心关系出发，增加中间转换，但不能改变题型本质。

允许的延展：

- 增加单位转换。
- 增加一个中间总量。
- 先从文字中提取总量，再列方程。
- 改变条件顺序，让学生先读题整理。

不允许的延展：

- 增加另一个独立知识点导致题型变质。
- 增加太多步骤，让学生不知道系统到底在训练什么。
- 生成答案不唯一或条件不足的题。

当前数学生成器会把“多一步整理”作为独立受控形式：在不改变答案规则的前提下，插入“整理已知量、要求量和关系”的中间步骤。它只允许在题型模型规定的 4-6 步边界内出现；题面重构和步骤延展都必须留下可校验的结构记录，否则候选题会被拒绝。

## 8. 生成流程

```text
选择题型模型
-> 读取样题和核心关系
-> 选择变式等级
-> 生成变量候选值
-> 运行合法性校验
-> 生成题干
-> 生成答案
-> 生成 steps
-> 生成提示层
-> 生成分步引导
-> 校验两种帮助模式都来自同一套可验证拆解逻辑
-> 运行质量检查
-> 输出题目对象
```

## 9. 质量检查

每一道生成题至少要通过：

- 关系检查：题干条件和核心关系一致。
- 可解性检查：条件足够，答案唯一。
- 结果检查：答案符合当前阶段的教学目的。
- 表达检查：题干没有歧义。
- steps 检查：每一步都能从上一层推出。
- 提示检查：提示不是直接泄露答案，而是逐层打开。
- 可验证拆解检查：拆解逻辑必须可被规则或校验器验证，不能只依赖 AI 文本解释。每一步应能追溯到题目条件、核心关系、变量定义或上一层推导。
- 年级边界检查：`instructionalGrade` 必须在该题族的 `gradeBands` 内，且三个标签位置必须一致。

学生端发布门槛：

- 题目必须能绑定到已定义题型模型。
- 系统必须能生成并校验答案。
- 系统必须能生成并校验 steps。
- 系统必须能生成并校验分层提示。
- 系统必须能验证拆解逻辑，而不是只生成看起来合理的解析。
- 如果题目无法可靠拆解，不能进入学生端，只能留在后台生成、校验、人工审核或 AI 多轮验证流程中。

### 9.1 题目投放与判分边界

生成合格不等于可以把完整题目对象发给页面。上线运行时还要经过一次 **question delivery** 边界：

```text
后台生成并校验候选题
-> 创建带学生、学科、模式、题型、年级、seed 的投放记录
-> 页面只接收题面和可见支持状态
-> 学生提交答案
-> 后台判分并记录用时、尝试次数、提示深度
-> 后台只返回正确 / 重做 / 可继续等结果状态
```

必须隐藏在后台的内容：

- 正确答案与答案规则。
- 原始变量边界、校验轨迹和内部生成提示。
- 未打开的提示层与未打开的分步引导。
- 与个人画像有关的内部风险或匹配信号。

模式规则：

- `practice`：可以按一次一层的方式取提示和分步引导；每一次打开都写入行为证据。
- `initial_assessment`：使用同一逻辑库，但由后台顺序投放、后台判分；不开放提示，不返回标准答案，只把安全的能力证据交给能力图。
- `formal_assessment`：不开放提示或分步引导；后台拒绝支持请求，答案由后台判分，只有完成后的正式结果可进入动态曲线。
- 学生自己和管理员可以提交作答；家长、老师只能查看被授权范围内的学习记录，不能代答。

## 10. 对 AI 的使用方式

第一阶段不应该让 AI 自由生成题。更稳妥的方式是：

```text
规则生成变量和答案
AI 只负责润色题干、改写场景、生成提示语言
系统再校验题干、答案、steps 和提示
```

后期 AI 能力更强时，也仍然应该被题型模型约束：

```text
AI 在边界内生成
规则引擎做合法性校验
系统记录题目质量和学生表现
再逐步优化题型模型
```

这就是我们和普通题库或普通 AI 出题的区别：**不是让 AI 想一道题，而是让 AI 在题型模型规定的可控空间里生成题。**
