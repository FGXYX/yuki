# Yuki 更新日志

---

## v1.1.0 — Agent Skill 系统重构：智能注入与结构化升级

> 发布日期: 2026-05-07

### 架构重构

#### Agent Skill 管理系统全面升级

新增 **`SkillManager.ts`** 核心模块，借鉴 Hermes Agent 的 skill 工作流模式，对原有的 Skill 系统进行了全面重构：

| 维度 | 旧版 | 新版 |
|------|------|------|
| **数据模型** | `{name, content, enabled}` | `{name, description, content, category, tags, priority, trigger, ...}` |
| **注入策略** | 所有 enabled skill 全量拼接 | `smartFilterSkills()` 按优先级+触发词智能筛选 |
| **分类管理** | 平铺列表，无分类 | 自动按 category 分组显示（通用/对话/开发/知识/创意/工具） |
| **元数据** | 无 | 描述、标签、优先级、触发词、自定义分类名 |
| **持久化** | ConfigStore 单一存储 | ConfigStore + `{appData}/skills/*.md` 文件双源 |
| **导入** | 原生文本导入 | YAML frontmatter 自动解析 |
| **导出** | 无 | 一键导出为标准 SKILL.md |
| **格式** | 纯文本拼接 | 结构化注入 `## Agent Skill SOP` |

#### 新增文件

- `src/core/SkillManager.ts` — Skill 核心管理模块（数据模型、迁移、文件加载、智能注入、导入导出）

### 新功能

- **智能注入机制** — `smartFilterSkills()` 根据用户输入的关键词自动匹配触发词，高优先级（>=70）+ 匹配触发词的 Skill 优先注入，低优先级 Skill 始终注入但排在后面，有效节省 token
- **分类分组显示** — SkillPanel 按 `category` 分类折叠展示，每个分类区块有颜色标识（蓝=对话，紫=通用，绿=开发，黄=知识，红=创意）
- **自定义分类名** — 预设 6 类之外，点击"自定义"可输入任意分类名
- **标签按钮式分类选择器** — 用颜色圆点标签按钮替代原生 `<select>` 下拉框，适配暗色主题
- **文件源 Skills** — 从 `{appData}/skills/` 目录自动加载 `.md` 文件，合并展示到 SkillPanel
- **导出 SKILL.md** — 一键导出带 YAML frontmatter 的标准 Skill 文件
- **YAML frontmatter 解析** — 导入 `.md` 文件时自动提取 `name/description/category/tags/priority/trigger`

### Bug 修复

- **修复分类分组后展开/编辑索引错位** — 使用 `skills.indexOf(skill)` 子数组索引操作全数组，导致永远修改第一个 skill。改为按对象引用在全数组中查找
- **修复分类标签无法切换** — `updateSkill` 双次 emit 导致第二次的 skill 对象引用过期。改为一次传入 `{ key1: val1, key2: val2 }` 对象
- **修复迁移时 `isExpanded` 被默认值覆盖** — `...DEFAULT_META` 展开后覆盖了明确的 `isExpanded` 值。已从 DEFAULT_META 中移除 UI 状态字段

### UI 改进

- 分类区块视觉优化：深色背景 + 边框包裹，头部左侧色条标记，与面板区分明显
- 分类选择器从原生 `<select>` 改为颜色标签按钮组，适配暗色主题

### 文档

- **更新 README.md**：重构"Agent Skill 系统"配置章节，反映新功能
- **更新 CHANGELOG.md**：本版本记录

---

## v1.0.3 — 架构重构与稳定性提升

> 发布日期: 2026-05-04

### 架构重构

#### 巨型组件拆分
将项目中最臃肿的三个视图组件拆分为职责单一的独立子模块：

| 组件 | 原大小 | 拆分后 | 子组件数量 |
|------|--------|--------|-----------|
| **ChatView** | 2109 行 | 402 行（骨架） | 7 个 |
| **MainView** | 1137 行 | 379 行（骨架） | 5 个 |
| **SettingsView** | 1573 行 | 174 行（骨架） | 7 个 |

拆分遵循"单一职责"原则，每个子组件不超过 300 行，通过 Props + Emits 通信，大幅提升可维护性。

#### 新增组件目录结构

```
src/views/
├── chat/                 # 聊天窗口子组件
│   ├── MessageBubble.vue # 聊天气泡（AI/用户区分）
│   ├── ChatInput.vue     # 输入框与快捷操作
│   ├── MessageList.vue   # 消息列表
│   ├── SessionSidebar.vue# 会话侧边栏
│   ├── ThemePanel.vue    # 聊天主题面板
│   ├── McpPanel.vue      # MCP 插件面板
│   └── SkillPanel.vue    # Agent Skill 面板
├── main/                 # 主窗口子组件
│   ├── SpeechBubble.vue  # 语音气泡
│   ├── ModelTuningModal.vue # 模型参数调节
│   ├── ControlPanel.vue  # 快捷控制面板
│   ├── ChatOverlay.vue   # 快捷聊天覆盖层
│   └── ActionPanelModal.vue # 动作触发面板
└── settings/             # 设置面板子组件
  ├── AiProviderSettings.vue  # AI 引擎管理
  ├── TtsSettings.vue         # 语音合成配置
  ├── ModelSettings.vue       # Live2D 模型库
  ├── EmotionLinkSettings.vue # 情绪动作联动
  ├── PersonaSettings.vue     # 人格设定
  └── ThemeSettings.vue       # 个性化外观
```

### Bug 修复

#### 严重
- **SQLite 双实例问题** — `Database.ts` 中同时存在 `db` 和 `dbInstance` 两个连接，且未正确关闭旧的连接。已统一为单实例，避免资源泄漏和数据不一致
- **TTS 板块打不开** — `useTTS.ts` 缺少 `ttsList`、`activeTtsId`、`saveTtsConfig` 导出，导致设置面板"语音与合成"选项卡白屏。已补全导出接口并统一播放逻辑

#### 中等
- **主题切换不生效** — `ThemeSettings` 子组件切换主题后父组件未同步 CSS 变量，界面的配色始终不变。已通过 emit 事件机制使父子组件主题状态双向同步
- **AI 引擎管理新增/保存按钮样式丢失** — `.primary-btn` 定义在 scoped CSS 中，子组件无法继承。已迁移到全局非 scoped 样式块
- **情绪动作联动图标不统一** — 侧边栏使用 emoji `` 而其他项使用 Phosphor SVG 图标风格不一致。已替换为匹配的 SVG 笑脸图标
- **情绪动作联动按钮 CSS 缺失** — `v-if` 导致子组件 `onMounted` 时未挂载，数据无法加载。已改为 `v-show`
- **情绪动作无法获取 Live2D 动作列表** — 子组件独立创建 `useLive2D` 实例，`activeModel` 为空。已改用 `ConfigStore` 直接读取模型 ID

### 功能改进

#### 状态持久化迁移
- 模型配置（`yuki_models`、`yuki_active_id`）从 `localStorage` 迁移到 **Tauri Store**（`yuki_store.json`），遵循 Tauri v2 最佳实践
- 动作别名配置同步迁移

#### CSS 架构优化
- 全局样式与 scoped 样式明确分离，确保子组件正确继承
- 颜色变量从局部组件提升到 `:root`，Teleport 弹窗（面板）能正确继承
- 拆分独立文字颜色变量：全局、AI 回复、用户、侧边栏、面板

#### VAD 可配置化
- 语音活动检测阈值、静默时长等参数从硬编码改为通过 `ConfigStore` 动态读写
- 为后续设置面板 UI 接入做好准备

#### UI 细节改进
- AI 引擎管理列表的"编辑/删除"按钮从纯图标改为**带文字的药丸按钮**，hover 有明显颜色反馈（蓝色/红色）
- 设置面板侧边栏图标一致性优化

### 代码清理
- 清理 `src-tauri/src/lib.rs` 中 Tauri 模板残留的 `greet` 函数和 `run` 函数
- 移除未使用的 `dbInstance` 和 `getDB()`

### 文档
- **更新 README.md**：新增" 架构演进"章节，全面重写" 项目结构"部分，反映新的组件层次
- **新增 CHANGELOG.md**：本次创建，后续版本持续维护

---

## v1.0.2 — MCP 循环代理与 UI 优化

> 发布日期: 2026-04-27

### 新功能
- **MCP 调用循环代理** — 从单次执行升级为循环代理模式，AI 可以连续调用多个 MCP 工具完成复杂任务
- **控制台消息输出扩展** — 增加更多控制台输出种类，便于调试和监控

### UI 改进
- **侧边栏/输入框/顶栏透明度和毛玻璃调节** — 支持滑块实时调节透明度与 `backdrop-filter` 模糊强度
- 控制台内存保护与过滤器优化

---

## v1.0.1 — 初始版本

> 发布日期: 2026-04-22

### 首个公开发布版本
- Live2D 角色渲染（Cubism 4.0）
- 全双工语音交互（whisper.cpp 本地语音识别）
- 智能对话系统（支持 OpenAI / Claude / DeepSeek / Ollama）
- GPT-SoVITS 语音合成
- 动作与情绪联动
- MCP 插件系统
- Agent Skill 系统
- 透明窗口、全局鼠标穿透、虚化模式
