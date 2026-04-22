<script setup lang="ts">

import { getCurrentWindow } from '@tauri-apps/api/window';
import MainView from './views/MainView.vue';
import SettingsView from './views/SettingsView.vue';
import ChatView from './views/ChatView.vue';
// 🌟 1. 引入控制台组件
import ConsoleView from './views/ConsoleView.vue'; 

// 🌟 1. 引入日志中心
import { useConsole } from '@/composables/useConsole';

const windowLabel = getCurrentWindow().label;

// 🌟 2. 无论启动的是哪个窗口，第一件事就是全局劫持底层 Console！
const { hijackNativeConsole } = useConsole();
hijackNativeConsole();
</script>

<template>
  <MainView v-if="windowLabel === 'main'" />
  <SettingsView v-else-if="windowLabel === 'settings'" />
  <ChatView v-else-if="windowLabel === 'chat-room'" />
  <ConsoleView v-else-if="windowLabel === 'console-room'" />
</template>

<style>
/* 全局基础重置样式 */
body, html {
  margin: 0; padding: 0;
  background-color: transparent !important;
  overflow: hidden;
  user-select: none;
}
/* 全局滚动条美化 */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border, #3f3f46); border-radius: 10px; transition: background 0.3s ease; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted, #a1a1aa); }
</style>