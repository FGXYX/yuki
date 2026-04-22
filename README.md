# Yuki - 桌面级 AI 虚拟伴侣 🌸

[![Tauri](https://img.shields.io/badge/Tauri-v2.0-24C8D8?logo=tauri&logoColor=white)](https://tauri.app/)
[![Vue.js](https://img.shields.io/badge/Vue-3.0-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Live2D](https://img.shields.io/badge/Live2D-Cubism_4-FF5B7A?logo=live2d)](https://www.live2d.com/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-DEA584?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Platform](https://img.shields.io/badge/platform-Windows-blue)](#)
[![License](https://img.shields.io/badge/license-GPLv3-blue.svg)](LICENSE)


---

![](https://i.ibb.co/Q7fmddB6/1.jpg)


### ❤️ 关于 Yuki

感谢你使用 **Yuki** 🌸

这是一个充满热情的个人项目，旨在探索 **AI 与桌面交互**的无限可能。我希望通过这个项目，让冰冷的技术变得有温度，让每一个使用者都能感受到来自虚拟伙伴的陪伴。

**Yuki** 是一款基于 **Tauri v2 + Vue 3 + Rust** 构建的桌面级 AI 虚拟伴侣应用。它将大语言模型 (LLM) 的自然交互能力与 Live2D 动态渲染技术深度融合，为用户提供具备情绪反馈、语音交互和智能动作联动的沉浸式桌面陪伴体验。

![](https://i.ibb.co/WW0pRm00/2026-04-19-111712.png)

>## 💌 开发者的话
>
>**嗨，我是 FGXYX**，一名在校大三学生。👋
>
>**Yuki** 是我独立开发的第一个大型完整项目，是一个全程借助 AI 辅助完成的产品。✨
>
>一切始于我想把大语言模型接入 QQ 机器人。当时我选择了 **[AstrBot](https://github.com/AstrBotDevs/AstrBot)** 这个优秀的开源框架。它最打动我的，是其强大的**插件生态系统**——通过社区开发者贡献的丰富插件，可以非常轻松地扩展出各种实用功能。例如AI绘画，TTS等等。我也给AstrBot写过一个 **[ImgBB](https://imgbb.com/)** 免费图床插件--- **[ImgBB_Subscriber](https://github.com/FGXYX/astrbot_plugin_ImgBB_Subscriber)** ，让用户在聊天平台上发送图片就可以上传到云端并返回图片链接，当时是为了方便写md文档而开发的。
>
>后来，我发现了 **[Airi](https://github.com/moeru-ai/airi)** 项目。它将 Live2D 虚拟角色与AI模型融合，综合了许多模块，但是我觉得Airi的Live2D模型没有什么交互，缺少动作联动（但不否认airi是一个优秀的社区项目）。我在airi项目上看到了Nerou的影子，希望airi在未来越来越好。
>
>在大学期间，我系统学习了 Web 开发技术栈，并使用 **Spring Boot + Vue** 独立完成了一个前后端分离的学生社团信息管理系统。这段经历不仅让我掌握了扎实的开发技能，也为后续独立开发 **Yuki** 打下了坚实的基础。


> [!WARNING]
>**AI 辅助开发声明**
>
>本项目 **Yuki** 的开发过程中，我大量使用了人工智能工具（如大语言模型）辅助代码生成、逻辑设计、文档撰写及问题排查等环节。
>
>**请注意：**
>- 项目中的所有代码、功能设计与最终实现，均由我本人进行最终审核、修改、测试与把关。
>- AI 工具仅作为辅助开发手段，并非项目核心开发者。
>- 尽管我已尽最大努力确保代码质量与功能稳定性，但由于 AI 生成内容的固有特性，项目可能仍存在潜在的 Bug、安全隐患或未预见的问题。
>- 本项目为个人学习与兴趣驱动的开源/独立开发作品，不提供任何形式的技术支持或使用保证。
>- 使用本项目所产生的任何风险与后果（包括但不限于数据丢失、系统故障、意外行为等），均由使用者自行承担，本人不承担任何相关责任。

---



## ✨ 核心特性

### 🎭 Live2D 角色渲染
- 支持 **Live2D Cubism 4.0** 模型加载与渲染
- 基于 **PixiJS** 的 WebGL 硬件加速
- 实时模型缩放、位置调整与参数微调
- 多模型切换与资源管理

### 🗣️ 全双工语音交互
- **自动语音识别 (ASR)**: 集成 `whisper.cpp` 本地推理引擎
- **语音活动检测 (VAD)**: 智能底噪过滤与 15 秒防死锁机制
- **文本转语音 (TTS)**: 流式音频合成与自然播放
- **打断机制**: 支持随时中断 TTS 并重新响应

### 💬 智能对话系统
- 对接主流 LLM API（OpenAI / Claude / 本地部署）
- 上下文记忆管理与历史对话持久化
- 情绪标签解析与动作联动触发
- 独立聊天窗口与主界面气泡双模式

### 🎮 动作与情绪联动
- 自定义动作别名映射系统
- 情绪驱动的动作随机抽卡机制
- 动作面板实时预览与编辑
- 跨窗口动作配置同步

### 🎨 高度可定制 UI
- 透明窗口与全局鼠标穿透
- 动态主题系统与 CSS 变量注入
- 虚化模式（Ghost Mode）智能避让
- 贴边自动隐藏与拖拽交互

### 🧩 MCP 插件系统
- **Model Context Protocol (MCP)**: 允许 AI 智能体访问本地系统资源
- **插件管理**: 支持动态添加、启用/禁用各类 MCP 插件
- **安全沙箱**: 通过配置化的命令与参数限制，确保插件运行安全
- **环境变量**: 支持为不同插件配置独立的环境变量

### 💡 Agent Skill 系统
- **SOP 规则引擎**: 为 AI 定义特定任务的标准操作流程
- **动态注入**: 将激活的技能规则注入到 AI 的系统提示词中
- **模块化管理**: 支持导入 Markdown 文件作为技能内容
- **开关控制**: 可独立启用/禁用每个技能模块

---

## 📦 技术栈

### 前端层 (Frontend)
| 技术 | 版本 | 用途 |
|------|------|------|
| **Vue 3** | ^3.5.13 | 响应式 UI 框架 |
| **TypeScript** | ~5.6.2 | 类型安全与代码提示 |
| **Vite** | ^6.0.3 | 极速开发服务器与构建工具 |
| **Pinia** | ^3.0.4 | 状态管理 |
| **PixiJS** | ^6.5.10 | 2D 图形渲染引擎 |
| **pixi-live2d-display** | ^0.4.0 | Live2D 模型渲染适配器 |

### 后端层 (Backend - Rust)
| 技术 | 版本 | 用途 |
|------|------|------|
| **Tauri v2** | ^2.0 | 跨平台桌面框架 |
| **whisper.cpp** | Latest | 本地语音识别引擎 |
| **device_query** | 2.1.0 | 全局键盘/鼠标钩子 |
| **SQLite** | via tauri-plugin-sql | 数据持久化存储 |

### Tauri 插件生态
- `@tauri-apps/plugin-fs`: 文件系统操作
- `@tauri-apps/plugin-opener`: 外部链接/文件打开
- `@tauri-apps/plugin-shell`: Shell 命令执行
- `@tauri-apps/plugin-sql`: SQLite 数据库访问
- `@tauri-apps/plugin-store`: JSON 配置持久化

---

## 🚀 快速开始


### 🎯 方式一：下载安装包（推荐普通用户）

**适用人群**: 只想使用软件的普通用户  
**环境要求**: ✅ 仅需 Windows 10/11 系统（无需安装任何开发环境）

#### 步骤 1: 下载最新版本

访问 [GitHub Releases](https://github.com/FGXYX/yuki/releases) 页面，下载最新版本的安装包。

#### 步骤 2: 选择安装包格式

| 格式 | 文件名示例 | 特点 | 推荐场景 |
|------|-----------|------|----------|
| **MSI** | `yuki_0.1.0_x64_en-US.msi` | 标准化安装、支持企业部署、卸载干净 | ✅ **推荐使用** |
| **NSIS** | `yuki_0.1.0_x64-setup.exe` | 传统 exe 格式、兼容性好 | 快速分发 |

#### 步骤 3: 安装与运行

1. 双击下载的安装包（`.msi` 或 `.exe`）
2. 按照安装向导完成安装
3. 在开始菜单或桌面找到 Yuki 快捷方式
4. 双击启动应用

**安装位置**: 默认安装在 `C:\Program Files\yuki\`  
**占用空间**: 约 180 MB（包含所有依赖和语音识别模型）

---

### 💻 方式二：克隆源码（开发者模式）

**适用人群**: 开发者、想要自定义功能的用户  
**环境要求**: Node.js + Rust + Visual Studio Build Tools + Git

#### 1️⃣ 环境准备

在开始之前，请确保你的开发环境已安装以下依赖：

##### 必需组件
- **[Node.js](https://nodejs.org/)**: v18 LTS 或更高版本
- **[Rust](https://www.rust-lang.org/tools/install)**: 最新稳定版（包含 cargo）
- **[Git](https://git-scm.com/)**: 版本控制工具

##### Windows 特定依赖
- **[Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)**
  - 下载并安装时勾选 **"使用 C++ 的桌面开发"** 工作负载
  - 这是编译 Rust 原生模块和 whisper.cpp 所必需的
- **WebView2 Runtime**: Windows 10/11 默认内置，无需额外安装

##### 验证安装
```
# 检查 Node.js
node --version    # 应显示 v18.x.x 或更高
npm --version     # 应显示对应版本

# 检查 Rust
rustc --version   # 应显示 rustc 1.x.x
cargo --version   # 应显示 cargo 1.x.x
```

#### 2️⃣ 克隆项目

```
git clone https://github.com/FGXYX/yuki.git
cd yuki
```

#### 3️⃣ 安装依赖

```
# 安装前端 npm 依赖
npm install
```

首次安装可能需要 2-5 分钟，取决于网络速度。

#### 4️⃣ 启动开发环境

```
# 启动 Tauri 开发模式（支持热重载）
npm run tauri dev
```

**首次运行说明**:
- Tauri 会自动下载并编译 Rust 依赖，可能需要 3-5 分钟
- 编译完成后会自动打开应用窗口
- 修改前端代码后会自动刷新，修改 Rust 代码后需要重启

#### 5️⃣ 生产环境构建（打包为安装包）

```
# 编译并生成 Windows 安装包
npm run tauri build
```

构建完成后，安装包将位于以下目录：

```
src-tauri/target/release/bundle/
├── msi/
│   └── yuki_0.1.0_x64_en-US.msi    # MSI 安装程序（推荐）
└── nsis/
    └── yuki_0.1.0_x64-setup.exe    # NSIS 安装程序（传统 exe）
```

你可以将这些安装包分发给其他用户，他们无需安装开发环境即可使用。

---

### 🆚 两种方式对比

| 特性 | 下载安装包 | 克隆源码 |
|------|-----------|---------|
| **目标用户** | 普通用户 | 开发者 |
| **环境要求** | 仅需 Windows 10/11 | Node.js + Rust + VS Build Tools |
| **安装复杂度** | ⭐（简单） | ⭐⭐⭐⭐⭐（复杂） |
| **可定制性** | ❌ 不可修改 | ✅ 完全可修改 |
| **调试能力** | ❌ 无法调试 | ✅ 可以断点调试 |
| **更新频率** | 等待新版本发布 | 随时拉取最新代码 |
| **文件大小** | ~180 MB | ~500 MB（含依赖） |
| **启动速度** | 即装即用 | 首次需编译（3-5分钟） |

---

### ❓ 如何选择？

**选择下载安装包，如果**:
- ✅ 你只是想使用 Yuki 与 AI 对话
- ✅ 不想配置复杂的开发环境
- ✅ 希望快速上手体验

**选择克隆源码，如果**:
- ✅ 你想添加新的 LLM 提供商支持
- ✅ 你想修改 Live2D 渲染逻辑或 UI 样式
- ✅ 你想优化性能或修复 Bug
- ✅ 你想学习 Tauri + Vue 3 开发技术
- ✅ 你想为开源项目贡献代码

---

## 🔧 配置指南

从这里进入设置中心

![](https://i.ibb.co/pjsMxTqL/2026-04-19-121222.png)

### 1. LLM API 配置(大脑)

在应用的**设置面板**中配置你的 LLM API：

![](https://i.ibb.co/6RNyzPfv/2026-04-19-121450.png)

```
{
  "apiProvider": "openai",
  "apiKey": "sk-xxxxxxxxxxxxxxxx",
  "baseUrl": "https://api.openai.com/v1",
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

#### 🎯 支持的提供商（开箱即用）

| 提供商 | 默认 Base URL | 推荐模型 | 说明 |
|--------|--------------|----------|------|
| **OpenAI** | `https://api.openai.com/v1` | gpt-3.5-turbo / gpt-4 | 官方 API，稳定性最佳 |
| **Anthropic** | `https://api.anthropic.com` | claude-3-haiku / claude-3-sonnet | Claude 系列，长文本能力强 |
| **DeepSeek** | `https://api.deepseek.com/v1` | deepseek-chat | 国产大模型，性价比高 |
| **Ollama** | `http://localhost:11434/v1` | qwen2:7b / llama3:8b | 本地部署，隐私安全 |
| **自定义** | 任意兼容 OpenAI 格式的 API | 根据服务商而定 | 支持中转站/代理 |

---



### 2. Live2D 模型管理（皮肤）

在yuki设置中心的"模型管理"中拖入live2d模型的**ZIP压缩包**

![](https://i.ibb.co/0jfGTj4V/2026-04-19-124502.png)

确保你的live2d模型结构如下
![](https://i.ibb.co/p61V0LDm/2026-04-19-121601.png)
```
your-model-name/
├── model3.json          # 模型描述文件
├── moc3/                # 模型骨骼数据
├── textures/            # 贴图资源
└── motions/             # 动作文件 (.motion3.json)
```

### 3. Whisper 模型选择（耳朵） 

> [!WARNING]
> 使用源码部署或进行开发调试的朋友，请务必手动下载模型并放置到指定目录，否则语音功能将无法使用。

由于 GitHub 的文件大小限制，本项目源码中不包含 Whisper 语音识别所需的模型文件。**使用源码部署或进行开发调试的朋友，请务必手动下载模型并放置到指定目录，否则语音功能将无法使用。**

### 1. 下载模型
请点击下方链接下载 `ggml-base.bin` 模型（约 141MB）：

* **[官方推荐下载 (Hugging Face)](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin)**
* **[备用下载 (本项目 Release 页面)](https://github.com/FGXYX/yuki/releases/latest)** *(推荐：请在 Release 附件中找到该文件)*

### 2. 放置路径
下载完成后，请确保将文件名重命名为 `ggml-base.bin`，并将其放置到项目的以下路径：

`项目根目录/src-tauri/resources/ggml-base.bin`

 **编译过的项目默认使用 `ggml-base.bin`（平衡型）** 

| 模型 | 大小 | 识别精度 | CPU 占用 | 适用场景 |
|------|------|----------|----------|----------|
| `tiny` | 75 MB | ⭐⭐ | 低 | 快速测试 |
| `base` | 148 MB | ⭐⭐⭐ | 中 | **默认推荐** |
| `small` | 466 MB | ⭐⭐⭐⭐ | 高 | 高精度需求 |
| `medium` | 1.5 GB | ⭐⭐⭐⭐⭐ | 极高 | 专业级识别 |

将模型文件放入 `src-tauri/resources/` 并修改 `main.rs` 中的路径引用。

开启方法：点击"语音"即刻开启。

![](https://i.ibb.co/C3nMtsVv/2026-04-19-124243.png)

### 4. 语音合成GPT-SOVITS（说话）

项目目前仅支持 [GPT-SOVITS](https://github.com/RVC-Boss/GPT-SoVITS) 项目，使用的是V2模型。

这是一个开源的语音合成项目，初次使用，请新建立一个api启动脚本，内容如下:

```
runtime\python.exe api_v2.py
pause
```

创建完成后请双击执行，等待启动成功

![](https://i.ibb.co/Kpq0KymC/2026-04-19-122418.png)

启动后如下图所展示这样，即为准备就绪。

![](https://i.ibb.co/S4V55X3S/2026-04-19-123310.png)

在切换模型时会出现模型切换失败的提示，别担心

![](https://i.ibb.co/PGsq8XTS/2026-04-19-123556.png)

只要路径正确，模型切换是没有问题的

![](https://i.ibb.co/Mk5gpxyC/2026-04-19-123748.png)

上述配置完成后，点击右上角就可以启用语音合成

![](https://i.ibb.co/3mXpgdxn/2026-04-19-124046.png)

### 5. MCP (Model Context Protocol) 插件配置

MCP（Model Context Protocol）是 Yuki 的一个重要功能，允许 AI 智能体与本地系统进行交互，从而扩展 AI 的能力范围。MCP 插件可以访问本地文件系统、执行系统命令、连接数据库等。

#### 如何配置 MCP 插件

1. 在聊天界面点击左下角的 **"MCP管理"** 按钮
2. 点击 **"添加本地 MCP 插件"** 创建新的插件配置
3. 填写插件的基本信息：
   - **插件名称**: 便于识别的名称（如 "文件系统访问"）
   - **执行器**: 执行命令的程序（如 `node`, `python`, `npx`）
   - **运行参数**: 启动插件所需的参数
   - **环境变量**: 为插件配置所需的环境变量
4. 如果为自己写的mcp插件，请放在 **%APPDATA%\com.fg.yuki\mcp_plugins** 目录下

#### 默认 MCP 插件配置示例

项目内置了一个 Memory 插件的默认配置：

```
{
  "name": "Memory-Local",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"],
  "env": {
    "MEMORY_FILE_PATH": "C:/Yuki_Data/memory.json" 
  },
  "enabled": true
}
```

#### 常用 MCP 插件类型

| 插件类型 | 命令 | 参数 | 用途 |
|---------|------|------|------|
| 本地内存 | `npx` | `["-y", "@modelcontextprotocol/server-memory"]` | 为 AI 提供长期记忆能力 |
| 文件系统 | `npx` | `["-y", "@modelcontextprotocol/server-fs"]` | 允许 AI 读写本地文件 |
| 命令行工具 | `node` | `["path/to/script.js"]` | 执行自定义脚本 |
| 数据库访问 | `python` | `["mcp_db_server.py"]` | 访问数据库 |

#### 注意事项
- 确保执行器（如 `npx`, `python`）已正确安装并在系统 PATH 中
- 环境变量配置对于某些插件正常运行至关重要
- 启用 MCP 插件可能会带来安全风险，请仅使用可信的插件

### 6. Agent Skill (SOP 规则) 配置

Agent Skill 系统允许您为 Yuki 定义特定任务的标准操作流程(SOP)，这些规则会被注入到 AI 的系统提示词中，使其按照预设的行为模式执行特定任务。

#### 如何配置 Agent Skills

1. 在聊天界面点击左下角的 **"Skill"** 按钮
2. 可以通过两种方式添加技能：
   - **手动创建**: 点击 "手动建空插槽" 创建新的技能
   - **导入文件**: 点击 "导入 .md 文件" 从 Markdown 文件导入技能

#### 技能配置示例

```
毒舌代码审查员
当你被要求看代码文件时：
1. 仔细寻找代码里有没有不优雅的地方。
2. 如果发现问题，必须用[angry]情绪严厉指责主人的代码写得像一坨乱码，然后再给出优化建议。
3. 如果代码写得好，用[shy]情绪傲娇地夸奖。
```

#### 创建有效的 Skill 规则

1. **明确任务范围**: 定义技能适用的具体场景
2. **详细操作步骤**: 列出 AI 应该执行的具体步骤
3. **预期输出格式**: 指定 AI 输出的格式或结构
4. **异常处理**: 定义在特殊情况下的处理方式

#### 实际应用场景

| 场景 | 技能描述 | 用途 |
|------|----------|------|
| 代码审查 | 检查代码质量并提供建议 | 提高代码质量 |
| 内容总结 | 提取关键信息并生成摘要 | 快速了解内容要点 |
| 翻译服务 | 按照特定风格翻译文本 | 保持一致的翻译风格 |
| 文档生成 | 按照模板生成文档 | 标准化文档格式 |

---

## 📁 项目结构

```
yuki/
├── src/                          # 前端业务源码 (Vue 3 + TypeScript)
│   ├── composables/              # 组合式逻辑封装（大脑神经元）
│   │   ├── useChat.ts            # LLM 请求管理、对话历史与情绪解析
│   │   ├── useConsole.ts         # 开发者控制台与日志系统（含崩溃保护）
│   │   ├── useLive2D.ts          # PixiJS 上下文与模型生命周期
│   │   ├── useMotion.ts          # 动作配置流转与别名映射
│   │   ├── useRecorder.ts        # VAD 引擎、WAV 编码与 15s 防死锁
│   │   ├── useTTS.ts             # 流式语音合成与批量更新优化
│   │   └── useTheme.ts           # 动态主题系统与样式注入
│   │
│   ├── core/                     # 底层工具类与实例封装（骨架）
│   │   ├── AudioEncoder.ts       # WAV 音频编码器（PCM → WAV）
│   │   ├── ConfigStore.ts        # Tauri Store 插件封装
│   │   ├── Database.ts           # SQLite 数据库封装（含索引优化）
│   │   ├── Live2DManager.ts      # Live2D 渲染控制器（含纹理释放）
│   │   └── MotionAliasStore.ts   # 动作别名持久化管理
│   │
│   ├── views/                    # UI 视图层（皮肤与交互）
│   │   ├── MainView.vue          # 主视图：Live2D 画布、语音呼吸灯、穿透逻辑
│   │   ├── SettingsView.vue      # 设置面板：API 配置、模型选择、参数调节
│   │   ├── ChatView.vue          # 独立聊天窗口：对话流与历史记录
│   │   └── ConsoleView.vue       # 开发者控制台：实时日志与调试信息
│   │
│   ├── App.vue                   # 路由分发与全局布局
│   └── main.ts                   # Vue 实例初始化
│
├── src-tauri/                    # Rust 后端与系统级配置
│   ├── bin/                      # 外部进程兵营 (Sidecar Binaries)
│   │   ├── whisper-cli-x86_64-pc-windows-msvc.exe  # Whisper C++ 推理引擎
│   │   ├── ggml.dll              # 张量运算核心库
│   │   ├── whisper.dll           # 语音识别逻辑库
│   │   └── ...                   # 其他 C++ 运行时依赖 (SDL2.dll 等)
│   │
│   ├── resources/                # 静态资源与 AI 模型
│   │   └── ggml-base.bin         # Whisper Base 量化模型 (148MB)
│   │
│   ├── capabilities/             # Tauri 权限门禁配置
│   │   └── default.json          # 注册 fs, store, shell:allow-execute
│   │
│   ├── src/
│   │   └── main.rs               # Rust 核心：transcribe_audio 调度函数
│   │
│   ├── Cargo.toml                # Rust 依赖清单
│   └── tauri.conf.json           # Tauri 应用配置（窗口、打包、sidecar）
│
├── public/                       # 静态公共资源
├── dist/                         # 构建输出目录（自动生成）
├── package.json                  # Node.js 依赖与脚本
├── tsconfig.json                 # TypeScript 编译配置
├── vite.config.ts                # Vite 构建配置
└── README.md                     # 项目说明文档（本文件）
```

---

## 🎯 核心功能详解

### 语音交互流程

```
sequenceDiagram
    participant User as 用户
    participant VAD as VAD 检测器
    participant Whisper as Whisper STT
    participant LLM as 大语言模型
    participant TTS as 语音合成
    participant Live2D as Live2D 引擎

    User->>VAD: 说话
    VAD->>VAD: 底噪过滤 & 静音检测
    VAD->>Whisper: 发送 WAV 音频 (≤15s)
    Whisper->>LLM: 返回识别文本
    LLM->>LLM: 生成回复 + 情绪标签
    LLM->>TTS: 发送回复文本
    TTS->>User: 播放语音
    LLM->>Live2D: 触发动作 (根据情绪)
    Live2D->>User: 播放动画
```

### MCP 与 Skill 工作流程

```
sequenceDiagram
    participant User as 用户
    participant LLM as 大语言模型
    participant MCP as MCP 插件系统
    participant LocalSystem as 本地系统
    participant Skill as Skill 规则引擎
    
    User->>LLM: 发送请求
    Note over LLM,Skill: LLM 接收系统提示词，<br/>包含激活的 Skills
    LLM->>Skill: 检查是否有适用的 Skill
    alt 需要 MCP 插件
        LLM->>MCP: 请求执行特定工具
        MCP->>LocalSystem: 执行本地操作
        LocalSystem->>MCP: 返回执行结果
        MCP->>LLM: 发送操作结果
    end
    alt 有匹配的 Skill
        LLM->>Skill: 应用 Skill 规则
        Skill->>LLM: 返回规则指导
    end
    LLM->>User: 根据 MCP 结果和 Skill 规则生成回复
```

---

## 🐛 常见问题

### Q1: 开发环境启动失败，提示 "Rust toolchain not found"
**解决方案**:
```
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 验证安装
rustc --version
cargo --version
```

### Q2: Windows 下编译报错 "link.exe failed"
**解决方案**:
1. 安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. 勾选 **"使用 C++ 的桌面开发"** 工作负载
3. 重启终端后重试

### Q3: Live2D 模型无法加载，控制台报 "404 Not Found"
**解决方案**:
- 确认模型文件位于 `public/models/` 目录下
- 检查 `model3.json` 中的路径引用是否正确（相对路径）
- 确保所有 `.moc3`、`.png`、`.motion3.json` 文件完整

### Q4: 语音识别无响应或识别结果为空
**解决方案**:
1. 检查麦克风权限是否授予应用
2. 确认 `src-tauri/bin/` 目录下存在 `whisper-cli-x86_64-pc-windows-msvc.exe` 及所有 `.dll` 文件
3. 查看开发者控制台 (`F12`) 中的错误日志
4. 尝试降低环境噪音或提高麦克风增益

### Q5: 应用窗口无法拖动或点击穿透异常
**解决方案**:
- 检查是否开启了 **"虚化模式"**（Ghost Mode），该模式下非 UI 区域会穿透
- 点击右上角菜单中的 **"虚化"** 按钮关闭穿透
- 确认 `alwaysOnTop` 配置未与其他窗口管理软件冲突

### Q6: TTS 语音播放卡顿或延迟过高
**解决方案**:
1. 检查网络连接（如使用云端 TTS API）
2. 切换到本地 TTS 引擎（如 Edge-TTS 离线模式）
3. 降低 LLM 回复长度（减少单次合成的文本量）
4. 启用流式播放（已在 `useTTS.ts` 中实现）

### Q7: 打包后的 .exe 无法运行或缺少 DLL
**解决方案**:
- 确保 `src-tauri/bin/` 目录中的所有 [.dll](file://d:\ai\yuki\yuki\src-tauri\bin\SDL2.dll) 文件都已正确放置
- 检查 `tauri.conf.json` 中的 `externalBin` 配置是否包含 `"bin/whisper-cli"`
- 使用 **MSI 安装包**而非直接复制 [.exe](file://d:\ai\yuki\yuki\src-tauri\bin\main.exe)，它会自动处理依赖关系

### Q8: MCP 插件无法正常工作
**解决方案**:
1. 确认 MCP 插件已正确启用（在 MCP 管理面板中）
2. 检查执行器命令是否正确（如 `npx`, `python` 是否在系统 PATH 中）
3. 验证参数和环境变量配置是否正确
4. 查看控制台日志确认 MCP 服务是否已启动
5. 确保 MCP 插件的端口没有被占用

### Q9: Agent Skills 不生效
**解决方案**:
1. 确认对应的 Skill 已启用（在 Skill 面板中）
2. 检查 Skill 内容是否有语法错误
3. 重启应用以重新加载 Skill 配置
4. 验证 LLM 模型是否支持工具调用功能

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！在贡献代码前，请遵循以下步骤：

1. **Fork 本仓库**
2. **创建功能分支**: `git checkout -b feature/amazing-feature`
3. **提交更改**: `git commit -m 'Add some amazing feature'`
4. **推送到分支**: `git push origin feature/amazing-feature`
5. **发起 Pull Request**

### 代码规范
- 前端代码遵循 **Vue 3 Composition API** 风格
- TypeScript 严格模式（`strict: true`）
- Rust 代码通过 `cargo clippy` 检查
- 提交前运行 `npm run build` 确保无编译错误

---



### 📂 如何获取日志和配置文件（提交问题时请附上）

当你遇到问题需要反馈时，提供以下文件将帮助我快速定位问题：

#### 🗺️ Tauri 应用数据存储说明

Yuki 基于 Tauri v2 框架构建，所有用户数据默认存储在 Windows 的 **AppData** 目录下。Windows 系统有两个主要的 AppData 文件夹：

| 目录 | 路径 | 用途 |
|------|------|------|
| **Roaming** | `%APPDATA%` = `C:\Users\你的用户名\AppData\Roaming` | 漫游配置、同步数据 |
| **Local** | `%LOCALAPPDATA%` = `C:\Users\你的用户名\AppData\Local` | 日志文件 |

**Yuki 的所有重要数据都存储在 Roaming 目录下**，因为：
- Tauri Store 插件默认使用 Roaming 目录
- SQLite 数据库也存放在 Roaming 目录
- 这样可以在域环境中实现配置漫游

---

#### 1️⃣ 应用日志文件

**Windows 系统日志位置**:
```
%LOCALAPPDATA%\com.fg.yuki\logs\
```
完整路径示例：
```
C:\Users\FG\AppData\Local\com.fg.yuki\logs\
```

**快捷访问方式**：
1. 按 `Win + R` 打开运行对话框
2. 输入 `%APPDATA%\com.fg.yuki\logs\` 并回车
3. 复制该目录下的所有 `.log` 文件

**主要日志文件**:
- `console.log` - 应用运行时完整日志（包含错误堆栈）
- `performance.log` - 性能监控数据（内存、CPU 占用）
- `crash.log` - 崩溃报告（如有）

---

#### 2️⃣ 用户配置文件

**配置保存位置**:
```
%APPDATA%\com.fg.yuki\.yuki_config.json
```
完整路径示例：
```
C:\Users\FG\AppData\Roaming\com.fg.yuki\.yuki_config.json
```

该文件包含：
- LLM API 配置（apiKey 已加密）
- Live2D 模型选择
- 语音识别参数
- UI 主题设置
- 动作别名映射

**注意**: 提交前请检查 `.yuki_config.json` 中是否包含敏感信息（如 API Key），建议手动删除或脱敏后再发送。

---

#### 3️⃣ 数据库文件（可选）

**SQLite 数据库位置**:
```
%APPDATA%\com.fg.yuki\yuki_data.db
```
完整路径示例：
```
C:\Users\FG\AppData\Roaming\com.fg.yuki\yuki_data.db
```

包含：
- 历史对话记录
- 聊天记录元数据

**隐私提示**: 数据库中可能包含你的聊天内容，如介意隐私泄露，可不提供此文件，或仅提供最近的问题相关记录。

---

### 📋 Issue 提交模板

为了更高效地解决问题，请在提交 Issue 时提供以下信息：

```
## 🌍 环境信息
- **操作系统**: Windows 11 (版本号)
- **Yuki 版本**: v1.0.0
- **安装方式**: exe 安装包 / 源码编译

## 🐛 问题描述
简要描述遇到的问题...

## 🔄 复现步骤
1. 打开设置面板
2. 配置 LLM API
3. 点击测试连通性
4. 出现错误提示：...

## ✅ 预期行为
应该看到什么...

## ❌ 实际行为
实际看到了什么...

## 📎 附件
- [ ] 已附上日志文件（`console.log`）
- [ ] 已附上配置文件（`.yuki_config.json`，已脱敏）
- [ ] 已附上截图或录屏

## 💡 其他补充
任何其他有助于排查的信息...
```

---

## 🙏 致谢

感谢以下开源项目和技术的支持：

- **[Tauri](https://tauri.app/)** - 强大的跨平台桌面应用框架
- **[Vue 3](https://vuejs.org/)** - 渐进式 JavaScript 框架
- **[PixiJS](https://pixijs.com/)** - 高性能 2D 渲染引擎
- **[Live2D Cubism](https://www.live2d.com/)** - 二次元角色动态渲染技术
- **[whisper.cpp](https://github.com/ggerganov/whisper.cpp)** - 高效的本地语音识别引擎
- **[AstrBot](https://github.com/Soulter/AstrBot)** - 最好用的Agent项目😋
- **[Airi](https://github.com/LlmKira/airi)** - live2d结合大模型的综合项目

特别感谢所有为 Yuki 提出建议和反馈的用户们，是你们的参与让这个项目变得更好！💖

---

## ⚖️ 协议与开源声明 (License & Open Source Notice)

本项目核心代码（包含前后端架构、MCP 协议实现、Agent 逻辑等）采用 **GNU General Public License v3.0 (GPLv3)** 开源协议。
这意味着您可以自由地使用、修改和分发本项目的代码，但**任何基于本项目的衍生作品必须同样以 GPLv3 协议开源**，严禁闭源商业化。

###  第三方资产与模型免责声明

Yuki_OS 的强大离不开开源社区与前沿 AI 技术的支持。本项目在运行过程中集成了部分第三方组件与模型，请您在使用时务必遵守其原生许可协议：

* **1. Live2D Cubism SDK:**
  本项目的前端图形渲染基于 Live2D Cubism SDK。该 SDK **不属于** GPLv3 开源范围。任何人使用本项目时，默认同意并受制于 [Live2D 专有软件许可协议 (Live2D Proprietary Software License Agreement)]。
  > ⚠️ **注意**：为了规避版权风险，本项目**不包含**任何内置的 Live2D 模型文件（`.moc3`）。用户需要自行准备合法合规的模型，并通过应用内的“模型管理”面板自行导入。用户需自行承担其所使用模型的版权责任。

* **2. 语音识别 (STT) - Whisper:**
  本项目底层的离线语音识别功能调用了由 OpenAI 开发的 Whisper 模型。Whisper 的源代码及模型权重均遵循 **MIT License** 开放。感谢 OpenAI 为开源世界做出的贡献。

* **3. 语音合成 (TTS) - GPT-SoVITS:**
  本项目的拟人化情感语音合成接入了 GPT-SoVITS 架构。GPT-SoVITS 的核心代码与基础预训练模型均基于 **MIT License** 开源。
  > ⚠️ **注意**：用户如果在本地自行训练并替换特定的音色权重文件（`.pth` / `.ckpt`），请务必确保用于训练的音频数据集未侵犯他人的声音版权。

---

- 🐛 **提交 Issue**: [GitHub Issues](https://github.com/FGXYX/yuki/issues)
- 📧 **邮件联系**: [wdsjfgxyx@gmail.com](mailto:wdsjfgxyx@gmail.com)


---
<div align="center">

**如果这个项目对你有帮助，欢迎点个 ⭐ Star 支持一下！**

Made with ❤️ by [FGXYX](https://github.com/FGXYX)

</div>


## 📄 许可证

本项目采用 [GNU General Public License v3.0](./LICENSE) 许可证。

主要条款:

- 🗣️ 您可以自由地运行、研究、分享（复制)和修改本软件
- 🤝 分发修改后的版本时必须同样使用GPLv3许可证
- 🛡️ 本软件按"现状"提供，没有任何明示或暗示的保证
- ⚠️ 详情请参阅 [LICENSE](./LICENSE) 文件
