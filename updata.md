1,项目初期结构
yuki/
├── public/                 # 存放 Live2D 官方 SDK 核心库 (后面会用到)
├── src-tauri/              # Rust 主进程，负责系统级 API 调用
│   ├── src/
│   │   └── main.rs         # Rust 入口文件
│   └── tauri.conf.json     # Tauri 窗口与系统配置
├── src/                    # Vue 3 前端渲染进程
│   ├── assets/             # 存放 CSS/全局样式
│   ├── components/         # 存放普通 UI 组件 (如右键菜单、设置面板)
│   ├── core/               # 🎯 [核心层] WebGL 渲染器、文件加载器适配
│   ├── logic/              # 🎯 [逻辑层] MotionManager 状态机、交互逻辑
│   ├── store/              # Pinia 全局状态 (窗口状态、配置信息)
│   ├── views/
│   │   ├── MainView.vue      <-- 专门负责主窗口：桌宠、透明菜单、聊天面板
│   │   ├── ChatView.vue      <-- 详细聊天面板
│   │   └── SettingsView.vue  <-- 专门负责设置窗口：各种配置表单
│   ├── App.vue               <-- 全局入口：只负责判断该渲染哪个 View
│   └── main.ts             # Vue 入口
├── package.json
├── tsconfig.json
└── vite.config.ts

Choose your package manager: npm
Choose your UI template: Vue
Choose your UI flavor: TypeScript

创建完成后进入cmd
npm install
# 安装基础状态管理库
npm install pinia

2.1窗口透明化配置
找到 "tauri" -> "windows" 数组，修改默认窗口的配置，开启透明和无边框：
yuki/src-tauri/tauri.conf.json
{
  "build": { ... },
  "package": { ... },
  "tauri": {
    "allowlist": { ... },
    "windows": [
      {
        "title": "yuki",
        "width": 400,
        "height": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": false,   // 关闭 Windows 默认标题栏和边框
        "transparent": true,    // 允许窗口背景透明
        "alwaysOnTop": true     // 默认置顶显示
      }
    ],
    "macOSPrivateApi": false
  }
}

2.2Vite 路径别名配置
配置 @ 指向 src 目录，方便我们在不同层级中导入核心逻辑，避免 ../../ 这种丑陋的路径：
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  // 确保 Vite 服务器对 Tauri 友好
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
});

2.3TypeScript别名同步
在 compilerOptions 中添加 baseUrl 和 paths，让 TS 识别我们在 Vite 中配置的别名：

{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    // ... 保留原来的其他配置
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}

yuki/src/
 ├── core/
 │   └── Live2DManager.ts
 ├── views/
 │   ├── MainView.vue      <-- 专门负责主窗口：桌宠、透明菜单、聊天面板
 │   └── SettingsView.vue  <-- 专门负责设置窗口：各种配置表单
 └── App.vue               <-- 全局入口：只负责判断该渲染哪个 View