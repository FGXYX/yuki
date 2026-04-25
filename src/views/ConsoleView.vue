<script setup lang="ts">
import { ref, watch, nextTick, onMounted, computed } from 'vue';
import { useConsole } from '@/composables/useConsole';

const { logs, clearLogs, addLog, initConsoleListener } = useConsole();
const terminalRef = ref<HTMLElement | null>(null);
const isAutoScroll = ref(true);

// 🌟 新增：当前激活的过滤器
const allLevels = ['info', 'success', 'warning', 'error', 'system'];
const activeFilters = ref([...allLevels]);

// ==========================================
// 🌟 1. 控制台专属主题管理系统
// ==========================================
const isSettingsOpen = ref(false);

const defaultTheme = {
  fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
  fontSize: 13,
  lineHeight: 1.6,
  bgColor: '#0d0d0d',
  colorInfo: '#8be9fd',    // 天蓝色
  colorSuccess: '#50fa7b', // 亮绿色
  colorWarning: '#f1fa8c', // 黄色
  colorError: '#ff5555',   // 红色
  colorSystem: '#bd93f9',  // 紫色
  colorTime: '#888888',    // 时间戳颜色
  colorSource: '#bb86fc'   // 来源标签颜色
};

const consoleTheme = ref({ ...defaultTheme });

// 计算 CSS 变量，绑定到根节点上
const themeVars = computed(() => ({
  '--console-font': consoleTheme.value.fontFamily,
  '--console-size': `${consoleTheme.value.fontSize}px`,
  '--console-line': consoleTheme.value.lineHeight,
  '--console-bg': consoleTheme.value.bgColor,
  '--color-info': consoleTheme.value.colorInfo,
  '--color-success': consoleTheme.value.colorSuccess,
  '--color-warning': consoleTheme.value.colorWarning,
  '--color-error': consoleTheme.value.colorError,
  '--color-system': consoleTheme.value.colorSystem,
  '--color-time': consoleTheme.value.colorTime,
  '--color-source': consoleTheme.value.colorSource,
}));

// 保存主题到本地
const saveTheme = () => {
  localStorage.setItem('yuki_console_theme', JSON.stringify(consoleTheme.value));
};

// 恢复默认主题
const resetTheme = () => {
  consoleTheme.value = { ...defaultTheme };
  saveTheme();
};

// 监听主题变化，随时保存
watch(consoleTheme, saveTheme, { deep: true });

// ==========================================
// 🌟 2. 滚动与初始化逻辑
// ==========================================
watch(logs, () => {
  if (isAutoScroll.value) {
    nextTick(() => {
      if (terminalRef.value) {
        terminalRef.value.scrollTop = terminalRef.value.scrollHeight;
      }
    });
  }
}, { deep: true });

// 🌟 新增：切换过滤器的函数
const toggleFilter = (level: string) => {
  const index = activeFilters.value.indexOf(level);
  if (index > -1) {
    // 如果已经在里面，就删掉（隐藏）
    if (activeFilters.value.length > 1) { // 至少保留一个，防止全空
      activeFilters.value.splice(index, 1);
    }
  } else {
    // 如果不在，就加上（显示）
    activeFilters.value.push(level);
  }
};

// 🌟 关键：计算过滤后的日志列表
const filteredLogs = computed(() => {
  return logs.value.filter(log => activeFilters.value.includes(log.level));
});

onMounted(async () => {
  // 加载本地保存的主题
  const savedTheme = localStorage.getItem('yuki_console_theme');
  if (savedTheme) {
    try { consoleTheme.value = { ...defaultTheme, ...JSON.parse(savedTheme) }; } catch (e) {}
  }

  await initConsoleListener();
  if (logs.value.length === 0) {
    addLog('system', 'System', 'Yuki Developer Console Initialized.');
    addLog('info', 'System', 'Waiting for incoming data streams...');
  }
});
</script>

<template>
  <div class="console-container" :style="themeVars">
    <header class="console-header">
      <div class="header-left">
        <h2 class="title">Yuki Console</h2>
        <div class="filter-chips">
          <button 
            v-for="level in allLevels" 
            :key="level"
            :class="['chip', `chip-${level}`, { 'inactive': !activeFilters.includes(level) }]"
            @click="toggleFilter(level)"
                >
            {{ level.toUpperCase() }}
          </button>
        </div>
      </div>
      <div class="header-right">
        <button class="action-btn config-btn" @click="isSettingsOpen = !isSettingsOpen" :class="{ 'active': isSettingsOpen }">
          <span class="icon-wrap" v-html="'⚙️'"></span> CONFIG
        </button>
        <label class="auto-scroll-toggle">
          <input type="checkbox" v-model="isAutoScroll">
          <span>Auto Scroll</span>
        </label>
        <button class="action-btn clear-btn" @click="clearLogs">CLEAR [ x ]</button>
      </div>
    </header>

      <main class="terminal-body" ref="terminalRef">
        <div v-for="log in filteredLogs" :key="log.id" :class="['log-row', `level-${log.level}`]">
          <span class="log-time">[{{ log.time }}]</span>
          <span class="log-source">&lt;{{ log.source }}&gt;</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </main>

    <transition name="fade-slide">
      <div v-if="isSettingsOpen" class="settings-drawer">
        <div class="drawer-header">
          <h3>UI Preferences</h3>
          <button class="close-btn" @click="isSettingsOpen = false">×</button>
        </div>
        
        <div class="drawer-content">
          <div class="setting-item">
            <label>字体族 (Font Family)</label>
            <input type="text" v-model="consoleTheme.fontFamily" class="theme-input">
          </div>
          <div class="setting-item">
            <label>文字大小 (Size: {{ consoleTheme.fontSize }}px)</label>
            <input type="range" v-model="consoleTheme.fontSize" min="10" max="24" class="theme-slider">
          </div>
          <div class="setting-item">
            <label>行间距 (Line Height: {{ consoleTheme.lineHeight }})</label>
            <input type="range" v-model="consoleTheme.lineHeight" min="1.0" max="2.5" step="0.1" class="theme-slider">
          </div>
          
          <div class="divider"></div>
          <h4>🎨 颜色映射器 (Color Mapping)</h4>
          
          <div class="color-grid">
            <div class="color-item"><input type="color" v-model="consoleTheme.bgColor"><label>背景色</label></div>
            <div class="color-item"><input type="color" v-model="consoleTheme.colorTime"><label>时间戳</label></div>
            <div class="color-item"><input type="color" v-model="consoleTheme.colorSource"><label>来源标签</label></div>
            <div class="color-item"><input type="color" v-model="consoleTheme.colorInfo"><label>Info (信息)</label></div>
            <div class="color-item"><input type="color" v-model="consoleTheme.colorSuccess"><label>Success (成功)</label></div>
            <div class="color-item"><input type="color" v-model="consoleTheme.colorWarning"><label>Warning (警告)</label></div>
            <div class="color-item"><input type="color" v-model="consoleTheme.colorError"><label>Error (错误)</label></div>
            <div class="color-item"><input type="color" v-model="consoleTheme.colorSystem"><label>System (系统)</label></div>
          </div>

          <button class="reset-btn" @click="resetTheme">恢复默认主题</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* 🌟 应用全局 CSS 变量 */
.console-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--console-bg);
  color: var(--color-success);
  font-family: var(--console-font);
  overflow: hidden;
  position: relative;
  transition: background-color 0.3s;
}

.console-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background-color: rgba(0, 0, 0, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(4px);
  z-index: 10;
}

.header-left { display: flex; align-items: center; gap: 10px; }
.status-dot { width: 10px; height: 10px; background-color: var(--color-success); border-radius: 50%; box-shadow: 0 0 8px var(--color-success); }
.status-dot.blinking { animation: blink 1.5s infinite ease-in-out; }
@keyframes blink { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.8); } }

.title { margin: 0; font-size: 14px; font-weight: bold; letter-spacing: 1px; color: #e0e0e0; font-family: sans-serif;}

.header-right { display: flex; align-items: center; gap: 12px; }

.auto-scroll-toggle { font-size: 12px; color: #888; display: flex; align-items: center; gap: 6px; cursor: pointer; font-family: sans-serif;}
.auto-scroll-toggle input { cursor: pointer; }

.action-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ccc;
  font-family: sans-serif;
  font-size: 11px;
  padding: 4px 10px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}
.action-btn:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
.config-btn.active { background: rgba(79, 172, 254, 0.2); border-color: #4facfe; color: #4facfe; }
.clear-btn:hover { background: rgba(255, 85, 85, 0.2); border-color: #ff5555; color: #ff5555; }

/* 🌟 动态字体排版 */
.terminal-body {
  flex: 1;
  padding: 12px 16px;
  overflow-y: auto;
  font-size: var(--console-size);
  line-height: var(--console-line);

  /* 🌟 新增这两行，强行开启这段区域的文本复制权限！ */
  user-select: text;
  -webkit-user-select: text;
}
.terminal-body::-webkit-scrollbar { width: 8px; }
.terminal-body::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }

.empty-state { color: #555; font-style: italic; margin-top: 10px; }

.log-row { display: flex; align-items: flex-start; gap: 10px; word-break: break-all; margin-bottom: 4px; }
.log-row:hover { background-color: rgba(255, 255, 255, 0.05); }

/* 🌟 动态颜色注入 */
.log-time { color: var(--color-time); flex-shrink: 0; }
.log-source { color: var(--color-source); flex-shrink: 0; font-weight: bold; }
.log-message { flex: 1; white-space: pre-wrap; }

.level-info .log-message { color: var(--color-info); }
.level-success .log-message { color: var(--color-success); }
.level-warning .log-message { color: var(--color-warning); }
.level-error .log-message { color: var(--color-error); font-weight: bold; }
.level-system .log-message { color: var(--color-system); font-style: italic; }

/* =======================================
   🌟 悬浮设置面板样式
   ======================================= */
.settings-drawer {
  position: absolute; top: 45px; right: 16px;
  width: 320px; max-height: calc(100vh - 80px); overflow-y: auto;
  background: rgba(20, 20, 20, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex; flex-direction: column;
  font-family: sans-serif;
  z-index: 100;
}

.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.drawer-header h3 { margin: 0; font-size: 14px; color: #fff; }
.close-btn { background: none; border: none; color: #888; font-size: 20px; cursor: pointer; }
.close-btn:hover { color: #fff; }

.drawer-content { padding: 16px; display: flex; flex-direction: column; gap: 16px; }

.setting-item { display: flex; flex-direction: column; gap: 8px; }
.setting-item label { font-size: 12px; color: #aaa; }
.theme-input {
  background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff; padding: 6px 10px; border-radius: 4px; outline: none; font-family: monospace; font-size: 12px;
}
.theme-slider { width: 100%; accent-color: #4facfe; }

.divider { height: 1px; background: rgba(255, 255, 255, 0.05); margin: 4px 0; }
.drawer-content h4 { margin: 0; font-size: 13px; color: #fff; }

.color-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.color-item { display: flex; align-items: center; gap: 8px; }
.color-item input[type="color"] {
  width: 24px; height: 24px; padding: 0; border: none; border-radius: 4px; cursor: pointer; background: none;
}
.color-item input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
.color-item input[type="color"]::-webkit-color-swatch { border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; }
.color-item label { font-size: 12px; color: #ccc; cursor: pointer; }

.reset-btn {
  margin-top: 8px; padding: 8px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ccc; border-radius: 4px; cursor: pointer; font-size: 12px; transition: 0.2s;
}
.reset-btn:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }

/* 动画 */
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-10px) scale(0.98); }

/* =======================================
   过滤器样式
   ======================================= */
.filter-chips {
  display: flex;
  gap: 6px;
  margin-left: 20px;
}

.chip {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.05);
  color: #888;
}

/* 激活状态使用主题色 */
.chip-info:not(.inactive)    { color: var(--color-info);    border-color: var(--color-info);    background: rgba(139, 233, 253, 0.1); }
.chip-success:not(.inactive) { color: var(--color-success); border-color: var(--color-success); background: rgba(80, 250, 123, 0.1); }
.chip-warning:not(.inactive) { color: var(--color-warning); border-color: var(--color-warning); background: rgba(241, 250, 140, 0.1); }
.chip-error:not(.inactive)   { color: var(--color-error);   border-color: var(--color-error);   background: rgba(255, 85, 85, 0.1); }
.chip-system:not(.inactive)  { color: var(--color-system);  border-color: var(--color-system);  background: rgba(189, 147, 249, 0.1); }

/* 未激活状态 */
.chip.inactive {
  opacity: 0.4;
  filter: grayscale(1);
}

.chip:hover {
  transform: translateY(-1px);
  filter: brightness(1.2);
}
</style>