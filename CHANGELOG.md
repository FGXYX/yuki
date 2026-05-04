# 📋 Yuki 更新日志

---

## v1.0.3 — 架构重构与稳定性提升

> 发布日期: 2026-05-04

### 🏗️ 架构重构

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

### 🔧 Bug 修复

#### 严重
- **SQLite 双实例问题** — `Database.ts` 中同时存在 `db` 和 `dbInstance` 两个连接，且未正确关闭旧的连接。已统一为单实例，避免资源泄漏和数据不一致
- **TTS 板块打不开** — `useTTS.ts` 缺少 `ttsList`、`activeTtsId`、`saveTtsConfig` 导出，导致设置面板"语音与合成"选项卡白屏。已补全导出接口并统一播放逻辑

#### 中等
- **主题切换不生效** — `ThemeSettings` 子组件切换主题后父组件未同步 CSS 变量，界面的配色始终不变。已通过 emit 事件机制使父子组件主题状态双向同步
- **AI 引擎管理新增/保存按钮样式丢失** — `.primary-btn` 定义在 scoped CSS 中，子组件无法继承。已迁移到全局非 scoped 样式块
- **情绪动作联动图标不统一** — 侧边栏使用 emoji `🎭` 而其他项使用 Phosphor SVG 图标风格不一致。已替换为匹配的 SVG 笑脸图标
- **情绪动作联动按钮 CSS 缺失** — `v-if` 导致子组件 `onMounted` 时未挂载，数据无法加载。已改为 `v-show`
- **情绪动作无法获取 Live2D 动作列表** — 子组件独立创建 `useLive2D` 实例，`activeModel` 为空。已改用 `ConfigStore` 直接读取模型 ID

### ✨ 功能改进

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

### 🧹 代码清理
- 清理 `src-tauri/src/lib.rs` 中 Tauri 模板残留的 `greet` 函数和 `run` 函数
- 移除未使用的 `dbInstance` 和 `getDB()`

### 📄 文档
- **更新 README.md**：新增"🏗️ 架构演进"章节，全面重写"📁 项目结构"部分，反映新的组件层次
- **新增 CHANGELOG.md**：本次创建，后续版本持续维护

---

## v1.0.2 — MCP 循环代理与 UI 优化

> 发布日期: 2026-04-27

### ✨ 新功能
- **MCP 调用循环代理** — 从单次执行升级为循环代理模式，AI 可以连续调用多个 MCP 工具完成复杂任务
- **控制台消息输出扩展** — 增加更多控制台输出种类，便于调试和监控

### 🎨 UI 改进
- **侧边栏/输入框/顶栏透明度和毛玻璃调节** — 支持滑块实时调节透明度与 `backdrop-filter` 模糊强度
- 控制台内存保护与过滤器优化

---

## v1.0.1 — 初始版本

> 发布日期: 2026-04-22

### 🎉 首个公开发布版本
- Live2D 角色渲染（Cubism 4.0）
- 全双工语音交互（whisper.cpp 本地语音识别）
- 智能对话系统（支持 OpenAI / Claude / DeepSeek / Ollama）
- GPT-SoVITS 语音合成
- 动作与情绪联动
- MCP 插件系统
- Agent Skill 系统
- 透明窗口、全局鼠标穿透、虚化模式
