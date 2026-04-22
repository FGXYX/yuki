<script setup lang="ts">
// ============================================================================
// 1. 模块引入 (Imports)
// ============================================================================
import { onMounted, onUnmounted, ref, nextTick, watch } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen, emit, type UnlistenFn } from '@tauri-apps/api/event';

// 核心数据库
import { initDB } from '@/core/Database';

// 🌟 引入刚刚拆分出去的“四大管理部门”
import { useChat } from '@/composables/useChat';
import { useMotion } from '@/composables/useMotion';
import { useLive2D } from '@/composables/useLive2D';
import { useTheme } from '@/composables/useTheme';
import { useTTS } from '@/composables/useTTS';
import { useConsole } from '@/composables/useConsole';
import { ConfigStore } from '@/core/ConfigStore'; // 🌟 新增：读取数据库配置
import { useRecorder } from '@/composables/useRecorder';
// 引入 invoke 用于调用 Rust 命令
import { invoke } from '@tauri-apps/api/core';


// ============================================================================
// 2. 组合式部门接入 (Composables)
// ============================================================================
// 聊天系统
const {
  isChatInputOpen, isSpeaking, chatInputText, bubbleMessage, 
  chatInputRef, isChatHistoryOpen, historyScrollRef, chatHistory, bubbleScrollRef,
  clearChatHistory, openChatWindow, adjustTextareaHeight, triggerSpeechBubble, sendMessage
} = useChat();

// 动作系统
const {
  isActionListOpen, currentMotions, isEditingActions, savedAliases, editingAliases,
  openActionPanel, toggleActionEditMode, saveMotionAliases, playAction
} = useMotion();

// Live2D 引擎系统
const {
  live2dCanvas, isModelManagerOpen, isModelHidden, activeModel,
  getManager, loadRegistry, onScaleChange, onPosChange, initEngine, setupModelChangeListener
} = useLive2D();

// 主题系统
const { currentThemeStyle } = useTheme();

const { isPlayingTTS, stopTTS, loadTtsConfig } = useTTS();
// 控制台
const { clearLogs, addLog } = useConsole();
// 录音系统
const { isAutoVoiceMode, isRecording, startAutoVoice, stopAutoVoice } = useRecorder();

// ============================================================================
// 3. 常量与静态资源 (Constants & Icons)
// ============================================================================
const ICON_PIN_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>';
const ICON_PIN_ON = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>';
const ICON_GHOST_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"></path></svg>';
const ICON_GHOST_ON = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"></path></svg>';

const UI_PAPER_PLANE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M210.3,35.9L23.9,88.4a8,8,0,0,0-1.2,15l85.6,40.5a7.8,7.8,0,0,0,4.2,1.1l77.5-77.5a8,8,0,1,1,11.4,11.4l-77.5,77.5a7.8,7.8,0,0,0,1.1,4.2l40.5,85.6a8,8,0,0,0,15-1.2L232.1,57.1A8,8,0,0,0,210.3,35.9Z"></path></svg>';
const UI_DOTS = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><circle cx="128" cy="128" r="16" fill="currentColor"></circle><circle cx="128" cy="64" r="16" fill="currentColor"></circle><circle cx="128" cy="192" r="16" fill="currentColor"></circle></svg>';
const UI_CROSS = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><line x1="200" y1="56" x2="56" y2="200" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></line><line x1="200" y1="200" x2="56" y2="56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></line></svg>';
const UI_DRAG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M128,40V216M88,80l40-40,40,40M88,176l40,40,40-40M40,128H216M80,88,40,128l40,40M176,88l40,40-40,40"></path></svg>';

const UI_HISTORY = '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z"></path></svg>';
const UI_TRASH = '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>';
const UI_EXPAND = '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M216,48V88a8,8,0,0,1-16,0V56H168a8,8,0,0,1,0-16h40A8,8,0,0,1,216,48ZM88,200H56V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H88a8,8,0,0,0,0-16Zm112-40a8,8,0,0,0-8,8v32H168a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,200,160ZM56,88V56H88a8,8,0,0,0,0-16H48a8,8,0,0,0-8,8V88a8,8,0,0,0,16,0Z"></path></svg>';

// ============================================================================
// 4. 局部状态管理 (Local State)
// ============================================================================
const appWindow = getCurrentWindow();
const unlisteners: UnlistenFn[] = []; // 全局 Tauri 监听器回收垃圾桶

// UI 开关状态
const isMenuOpen = ref(false); 
const isAlwaysOnTop = ref(true);
const isFadeMode = ref(false);     
const isDocked = ref(false);

// 窗口与穿透判定核心变量
let winBounds = { x: 0, y: 0, width: 0, height: 0 };
let isCurrentlyIgnoring = false;
let isMouseMoveHandling = false;
let dockTimeout: ReturnType<typeof setTimeout> | null = null;

// 悬浮菜单配置
const menuItems = ref([
  { id: 'dress', label: '换装', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/></svg>' },
  { id: 'settings', label: '设置', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' },
  { id: 'console', label: '控制台', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>' },
  { id: 'voice', label: '语音', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>' },
  { id: 'chat', label: '对话', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' },
  { id: 'pin', label: '置顶', icon: ICON_PIN_ON },
  { id: 'fade', label: '虚化', icon: ICON_GHOST_OFF }, 
  { id: 'action', label: '动作', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' },
  { id: 'interact', label: '互动', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' },
]);

// ============================================================================
// 5. 局部 UI 与窗口交互逻辑 (UI Interactions)
// ============================================================================
const updateWinBounds = async () => { 
  try { 
    const pos = await appWindow.outerPosition(); 
    const size = await appWindow.outerSize(); 
    winBounds = { x: pos.x, y: pos.y, width: size.width, height: size.height }; 
  } catch (e) { } 
};

const handleMouseEnter = () => { 
  isDocked.value = false; 
  if (dockTimeout) clearTimeout(dockTimeout); 
};

const handleMouseLeave = () => { 
  if (!isMenuOpen.value) { 
    dockTimeout = setTimeout(() => { isDocked.value = true; }, 2500); 
  } 
};

const startDrag = () => appWindow.startDragging();
const toggleMenu = () => { isMenuOpen.value = !isMenuOpen.value; };

/**
 * 侧边栏菜单点击分发中心
 */
const handleItemClick = async (item: any) => {
  if (item.id === 'console') { 
    try {
      const consoleWin = await WebviewWindow.getByLabel('console-room');
      if (consoleWin) { 
        await consoleWin.show();
        await consoleWin.setFocus(); 
      } else { 
        const win = new WebviewWindow('console-room', { 
          url: '/', // 我们下一步会在路由里注册这个地址
          title: 'Yuki 开发者控制台', 
          width: 750, 
          height: 500, 
          decorations: true, 
          transparent: false, 
          resizable: true, 
          center: true 
        }); 
        win.once('tauri://error', (e) => console.error('控制台窗口创建失败:', e));
      }
    } catch (e) { console.warn('获取控制台窗口失败:', e); }
    if (isMenuOpen.value) toggleMenu(); 
  }
  else if (item.id === 'pin') { 
    isAlwaysOnTop.value = !isAlwaysOnTop.value; 
    const targetItem = menuItems.value.find(i => i.id === 'pin');
    if (targetItem) targetItem.icon = isAlwaysOnTop.value ? ICON_PIN_ON : ICON_PIN_OFF;
    appWindow.setAlwaysOnTop(isAlwaysOnTop.value).catch(e => console.warn('置顶异常:', e)); 
  }
  else if (item.id === 'fade') { 
    isFadeMode.value = !isFadeMode.value; 
    const targetItem = menuItems.value.find(i => i.id === 'fade');
    if (targetItem) targetItem.icon = isFadeMode.value ? ICON_GHOST_ON : ICON_GHOST_OFF;
    if (!isFadeMode.value) { 
      isModelHidden.value = false; 
      isCurrentlyIgnoring = false; 
      appWindow.setIgnoreCursorEvents(false).catch(e => console.warn('穿透恢复异常:', e)); 
    } 
  }
  else if (item.id === 'dress') { 
    isModelManagerOpen.value = true; 
    if (isMenuOpen.value) toggleMenu(); 
  }
  else if (item.id === 'chat') {
    isChatInputOpen.value = !isChatInputOpen.value; 
    if (isMenuOpen.value) toggleMenu(); 
    if (isChatInputOpen.value) nextTick(() => { chatInputRef.value?.focus(); });
  }
  else if (item.id === 'action') {
    // 🌟 调用动作管理部门提供的方法
    openActionPanel(getManager(), triggerSpeechBubble, () => {
      if (isMenuOpen.value) toggleMenu();
    });
  }
  else if (item.id === 'settings') {
    try {
      const settingsWin = await WebviewWindow.getByLabel('settings');
      if (settingsWin) { 
        await settingsWin.show();
        await settingsWin.setFocus(); 
      } else { 
        const win = new WebviewWindow('settings', { 
          url: '/', title: 'Yuki 设置中心', width: 860, height: 660, 
          decorations: true, transparent: false, resizable: false, center: true, visible: false 
        }); 
        win.once('tauri://error', (e) => console.error('窗口创建彻底失败:', e));
      }
    } catch (e) { console.warn('获取设置窗口失败:', e); }
    if (isMenuOpen.value) toggleMenu();
  }
  else if (item.id === 'voice') {
    toggleVoiceMode(); // 触发我们在下面写好的开启/关闭录音方法
  }
};

const toggleVoiceMode = async () => {
  if (!isAutoVoiceMode.value) {
    // 开启自动唤醒模式
    await startAutoVoice(async (wavBytes) => {
      // 🌟 1. 录音完毕，不下载了，直接发给 Rust
      addLog('info', 'Voice', '🎤 句子捕捉完毕，正在交由 Whisper 引擎识别...');
      
      try {
        // 注意：将 Uint8Array 转为普通数组传递给 Rust 更加稳妥
        const text = await invoke<string>('transcribe_audio', { 
          audioBytes: Array.from(wavBytes) 
        });

        // 🌟 2. 净化识别出来的文字 (去掉两端的空格)
        const cleanText = text.trim();
        console.log("📝 Whisper 识别结果:", cleanText);

        // 🌟 3. 如果真的听到了字，就自动填入输入框并发送！
        if (cleanText.length > 0) {
          addLog('success', 'Voice', `🗣️ 听清了: ${cleanText}`);
          
          // 填入输入框
          chatInputText.value = cleanText;
          
          // 如果聊天面板没开，可选自动打开它（让你能看到发了啥）
          if (!isChatInputOpen.value) {
            isChatInputOpen.value = true;
          }

          // 触发你原有的发送逻辑！
          sendMessage(); 
          
        } else {
          addLog('warning', 'Voice', '🔕 没听清文字，可能是呼吸声或背景杂音。');
        }

      } catch (error: any) {
        console.error("❌ 语音识别报错:", error);
        addLog('error', 'Voice', `引擎崩了: ${error}`);
      }
    });
  } else {
    // 关闭总开关
    stopAutoVoice();
  }
};

// 🌟 纯净版：静默提取 Live2D 动作字典 (不弹 UI)
const loadMotionsData = async (manager: any) => {
  if (!manager) return;

  try {
    
    currentMotions.value = manager.getMotionList();
    
    //console.log('✅ 动作字典在后台加载成功！拆箱检查:', JSON.parse(JSON.stringify(currentMotions.value)));
  } catch (err) {
    console.error('❌ 静默加载动作数据时发生崩溃:', err);
  }
};

// ============================================================================
// 6. 监听器 (Watchers)
// ============================================================================
watch(isMenuOpen, (newVal) => { 
  if (newVal) { 
    isDocked.value = false; 
    if (dockTimeout) clearTimeout(dockTimeout); 
  } else { 
    handleMouseLeave(); 
  } 
});

// ============================================================================
// 7. 生命周期 (Lifecycle)
// ============================================================================
onMounted(async () => {
  // 🌟 1. 基础环境初始化
  await clearLogs(); // 开机清空控制台日志
  await initDB();
  await loadTtsConfig();
  loadRegistry();
  handleMouseLeave(); 

  // 2. 核心 AI 引擎与模型挂载
  await initEngine(triggerSpeechBubble);
  await setupModelChangeListener(unlisteners);

  // 3. 窗口系统集成
  appWindow.setAlwaysOnTop(isAlwaysOnTop.value).catch(e => console.warn('置顶初始化异常:', e));
  await updateWinBounds();
  setInterval(updateWinBounds, 1000);
  appWindow.onMoved(updateWinBounds);
  appWindow.onResized(updateWinBounds);

  // ============================================================================
  //  全局鼠标穿透核心拦截系统
  // ============================================================================
  unlisteners.push(
    await listen('global-mouse-move', async (event) => {
      if (!isFadeMode.value) return; 
      if (isMouseMoveHandling) return;
      
      isMouseMoveHandling = true; 
      requestAnimationFrame(() => {
        const [globalX, globalY] = event.payload as [number, number];
        const dpr = window.devicePixelRatio || 1;
        const winX = winBounds.x; const winY = winBounds.y; const winW = winBounds.width; const winH = winBounds.height;
        
        const isInsideWindow = globalX >= winX && globalX <= (winX + winW) && globalY >= winY && globalY <= (winY + winH);
        let isOverUI = false;

        // 右侧菜单/工具栏边界检测
        const rightUIWidth = isMenuOpen.value ? 320 : 80; 
        const rightUIHeight = isMenuOpen.value ? 280 : 120;
        if (globalX >= (winX + winW - rightUIWidth * dpr) && globalY <= (winY + rightUIHeight * dpr)) isOverUI = true;

        // 语音气泡检测
        if (isSpeaking.value) {
          const bubW = 340 * dpr; const bubH = 200 * dpr;
          const cx = winX + winW / 2;
          if (globalX >= cx - bubW/2 && globalX <= cx + bubW/2 && globalY <= winY + bubH) isOverUI = true;
        }

        // 聊天输入框检测
        if (isChatInputOpen.value) {
          const inW = 340 * dpr; const inH = 160 * dpr;
          const cx = winX + winW / 2;
          if (globalX >= cx - inW/2 && globalX <= cx + inW/2 && globalY >= winY + winH - inH) isOverUI = true;
        }
        
        // 聊天历史面板检测
        if (isChatHistoryOpen.value && isChatInputOpen.value) {
          const hpW = 360 * dpr; const hpH = 420 * dpr; 
          const cx = winX + winW / 2;
          const panelBottom = winY + winH - (60 * dpr); 
          if (globalX >= cx - hpW/2 && globalX <= cx + hpW/2 && globalY >= panelBottom - hpH && globalY <= panelBottom) isOverUI = true;
        }

        // 模型管理面板检测
        if (isModelManagerOpen.value) {
            const mmW = 300 * dpr; const mmH = 400 * dpr;
            const cx = winX + winW / 2; const cy = winY + winH / 2;
            if (globalX >= cx - mmW/2 && globalX <= cx + mmW/2 && globalY >= cy - mmH/2 && globalY <= cy + mmH/2) isOverUI = true;
        }

        // 决策：穿透还是拦截
        if (isInsideWindow) { 
          isModelHidden.value = true; 
          if (!isOverUI) { 
            if (!isCurrentlyIgnoring) { appWindow.setIgnoreCursorEvents(true).catch(()=>{}); isCurrentlyIgnoring = true; } 
          } else { 
            if (isCurrentlyIgnoring) { appWindow.setIgnoreCursorEvents(false).catch(()=>{}); isCurrentlyIgnoring = false; } 
          } 
        } else { 
          isModelHidden.value = false; 
          if (isCurrentlyIgnoring) { appWindow.setIgnoreCursorEvents(false).catch(()=>{}); isCurrentlyIgnoring = false; } 
        }

        isMouseMoveHandling = false; 
      });
    })
  );

  // ============================================================================
  // 跨窗口通信监听：接收设置中心的请求，同步动作列表
  // ============================================================================
  unlisteners.push(
    await listen('request-current-motions', async () => {
      const manager = getManager();
      if (!manager) return;

      // 如果内存为空，执行无感加载，绝不调用 openActionPanel
      if (!currentMotions.value || Object.keys(currentMotions.value).length === 0) {
          await loadMotionsData(manager); // ✅ 纯数据加载函数
          let retry = 0;
          while (Object.keys(currentMotions.value).length === 0 && retry < 10) {
            await new Promise(resolve => setTimeout(resolve, 50)); retry++;
          }
      }

      // 打包数据回传给设置窗口
      await emit('reply-current-motions', {
        motions: currentMotions.value || {},
        aliases: savedAliases.value || {}
      });
    })
  );

// ============================================================================
  // 情绪触发动作中枢：加了“防并发冷却锁”的坚固版本
  // ============================================================================
  
  
  let lastEmotionTriggerTime = 0; 

  unlisteners.push(
    await listen<string>('yuki-trigger-emotion-motion', async (event) => {
      const now = Date.now();
      
      // 🌟 2. 核心拦截器：如果距离上一次触发不到 2 秒，直接静默吃掉这个指令！
      if (now - lastEmotionTriggerTime < 2000) {
        // 你可以把这行注释掉，彻底做到眼不见心不烦
        // addLog('warning', 'MotionLink', '拦截到并发冗余指令，已静默抛弃');
        return; 
      }
      
      // 记录这次合法触发的时间
      lastEmotionTriggerTime = now;

      // ---------------- 以下都是你原本的正常逻辑 ----------------
      const emotion = event.payload;
      const manager = getManager();
      
      if (!manager || !activeModel.value?.id) {
        addLog('error', 'MotionLink', `❌ 情绪 [${emotion}] 触发失败: 引擎未就绪`); 
        return;
      }

      const key = `yuki_model_setting_${activeModel.value.id}`;
      const saved = await ConfigStore.get<any>(key, {});
      const motionList = saved.emotionMotions?.[emotion] || [];

      if (motionList.length === 0) {
        addLog('warning', 'MotionLink', `⚠️ 情绪 [${emotion}] 未关联任何动作`); 
        return;
      }

      // 确保动作索引已在内存中 (静默加载)
      if (!currentMotions.value || Object.keys(currentMotions.value).length === 0) {
         await loadMotionsData(manager); 
         let retry = 0;
         while (Object.keys(currentMotions.value).length === 0 && retry < 10) {
            await new Promise(resolve => setTimeout(resolve, 50)); retry++;
         }
      }

      // 随机抽取并定位物理索引
      const randomMotionName = motionList[Math.floor(Math.random() * motionList.length)];
      let targetGroup = ''; let targetIndex = -1;
      
      for (const [gName, mList] of Object.entries(currentMotions.value)) {
        const idx = (mList as string[]).indexOf(randomMotionName);
        if (idx !== -1) { targetGroup = gName; targetIndex = idx; break; }
      }

      // 最终执行
      if (targetIndex !== -1) {
        try {
          await playAction(manager, targetGroup, targetIndex);
          addLog('success', 'MotionLink', `🎉 情绪动作已播: [${randomMotionName}]`);
        } catch (err: any) { 
          addLog('error', 'MotionLink', `❌ 执行异常: ${err.message}`); 
        }
      } else {
        addLog('error', 'MotionLink', `❌ 找不到动作索引: [${randomMotionName}]`);
      }
    })
  );

});

onUnmounted(() => {
  // 批量清理所有 Tauri 后台监听器，杜绝内存泄漏
  unlisteners.forEach((unlisten) => unlisten());
  unlisteners.length = 0; 
  console.log("🧹 主窗口注销，所有 Tauri 全局监听器已批量清理完毕！");
  //热更新时销毁监听器
  if (unlisteners && unlisteners.length > 0) {
    unlisteners.forEach(unlisten => unlisten());
  }
});
</script>

<template>
  <div class="yuki-container" :style="currentThemeStyle">
    
    <canvas ref="live2dCanvas" :class="['live2d-canvas', { 'hidden-model': isModelHidden }]"></canvas>

    <Transition name="bubble-pop">
      <div v-if="isSpeaking" class="yuki-speech-bubble">
        <div class="bubble-content" ref="bubbleScrollRef">{{ bubbleMessage }}</div>
        <div class="bubble-tail"></div>
      </div>
    </Transition>

    <Transition name="fade-slide">
      <div v-show="isChatHistoryOpen && isChatInputOpen" class="chat-history-panel">
        <div class="history-header">
          <span> 历史记忆</span>
          <div class="header-actions">
            <button class="icon-btn-small expand" @click="openChatWindow" title="在独立窗口中打开">
              <span class="icon-wrap" v-html="UI_EXPAND"></span>
            </button>
            <button class="icon-btn-small delete" @click="clearChatHistory" title="清空记忆">
              <span class="icon-wrap" v-html="UI_TRASH"></span>
            </button>
          </div>
        </div>
        <div class="history-content" ref="historyScrollRef">
          <div v-for="(msg, index) in chatHistory" :key="index" :class="['msg-bubble', msg.role]">
            {{ msg.content }}
          </div>
          <div v-if="chatHistory.length === 0" class="empty-history">脑袋空空的，暂无记录~</div>
        </div>
      </div>
    </Transition>

    <Transition name="slide-up-bottom">
      <div v-show="isChatInputOpen" class="bottom-input-container">
        <button class="history-toggle-btn" @click="isChatHistoryOpen = !isChatHistoryOpen" :class="{ 'is-active': isChatHistoryOpen }" title="查看历史对话">
          <span class="icon-wrap" v-html="UI_HISTORY"></span>
        </button>
        
        <textarea 
          ref="chatInputRef"
          v-model="chatInputText" 
          placeholder="和 Yuki 聊点什么... (Enter 发送)"
          @input="adjustTextareaHeight"
          @keydown.enter.exact.prevent="sendMessage"
        ></textarea>
        
        <button v-if="isPlayingTTS" class="send-action-btn stop-tts-btn" @click="stopTTS" title="打断说话">
          <span style="font-size: 16px; line-height: 1;">🛑</span>
        </button>
        <button v-else class="send-action-btn" @click="sendMessage" :disabled="!chatInputText.trim()">
          <span class="icon-wrap" v-html="UI_PAPER_PLANE"></span>
        </button>
      </div>
    </Transition>

    <Transition name="scale-fade">
      <div v-if="isModelManagerOpen" class="window-modal">
        <div class="window-header"><span> 位置参数微调</span><button class="close-btn" @click="isModelManagerOpen = false">×</button></div>
        <div class="sliders-section">
          <div class="slider-group"><label>缩放大小</label><input type="range" v-model.number="activeModel.defScale" min="0.01" max="0.5" step="0.005" @input="onScaleChange" /></div>
          <div class="slider-group"><label>水平位置 (X)</label><input type="range" v-model.number="activeModel.defX" min="-1000" max="1000" step="5" @input="onPosChange" /></div>
          <div class="slider-group"><label>垂直位置 (Y)</label><input type="range" v-model.number="activeModel.defY" min="-1000" max="1000" step="5" @input="onPosChange" /></div>
        </div>
      </div>
    </Transition>

    <Transition name="scale-fade">
      <div v-if="isActionListOpen" class="window-modal action-list-modal">
        <div class="window-header">
          <span> 动作指令集</span>
          <div class="header-actions-edit">
            <button v-if="!isEditingActions" class="icon-action-header" @click="toggleActionEditMode" title="编辑">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button v-if="!isEditingActions" class="icon-action-header close" @click="isActionListOpen = false" title="关闭">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <button v-if="isEditingActions" class="icon-action-header save" @click="saveMotionAliases(triggerSpeechBubble)" title="保存">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            </button>
            <button v-if="isEditingActions" class="icon-action-header close" @click="toggleActionEditMode" title="取消">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
        
        <div class="action-groups-container">
          <div v-for="(motions, groupName) in currentMotions" :key="groupName" class="action-group">
            <h4 class="group-title">{{ groupName }}</h4>
            <div class="action-grid">
              <div v-for="(name, index) in motions" :key="index" class="action-item-wrapper">
                <button v-if="!isEditingActions" class="action-item-btn" @click="playAction(getManager(), groupName, index)" :title="name">
                  {{ editingAliases[name] || name }}
                </button>
                <input v-if="isEditingActions" type="text" v-model="editingAliases[name]" :placeholder="name" class="action-item-input"/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <div :class="['control-panel', { 'is-docked': isDocked }]" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
      <div class="main-buttons">
        <button :class="['circle-btn', 'toggle-btn', { 'is-active': isMenuOpen }]" @click="toggleMenu" title="功能菜单">
          <span class="icon-wrap" v-html="isMenuOpen ? UI_CROSS : UI_DOTS"></span>
        </button>
        <Transition name="fab-pop">
          <button v-show="isMenuOpen" class="circle-btn drag-btn" @mousedown="startDrag" title="拖动角色">
            <span class="icon-wrap" v-html="UI_DRAG"></span>
          </button>
        </Transition>
      </div>
      
      <Transition name="slide-fade">
        <div v-show="isMenuOpen" class="grid-menu">
          <button 
            v-for="item in menuItems" 
            :key="item.id" 
            :class="[
              'icon-btn', 
              { 
                'is-active': (item.id === 'pin' && isAlwaysOnTop) || 
                             (item.id === 'fade' && isFadeMode) || 
                             (item.id === 'chat' && isChatInputOpen) || 
                             (item.id === 'voice' && isAutoVoiceMode),
                'is-hearing': item.id === 'voice' && isRecording 
              }
            ]" 
            :data-label="item.label" 
            @click="handleItemClick(item)"
          >
            <span class="icon-wrap" v-html="item.icon"></span>
          </button>
        </div>
      </Transition>
    </div>

  </div>
</template>

<style scoped>
/* ============================================================================
   0. 全局基础重置与布局 (Base & Layout)
   ============================================================================ */
body, html { 
  margin: 0; 
  padding: 0; 
  background-color: transparent !important; 
  overflow: hidden; 
  user-select: none; 
}

.yuki-container { 
  width: 100vw; 
  height: 100vh; 
  position: relative; 
}

/* Live2D 画布 */
.live2d-canvas { 
  width: 100%; 
  height: 100%; 
  display: block; 
  transition: opacity 0.4s ease-in-out; 
}
.hidden-model { 
  opacity: 0 !important; 
  pointer-events: none; 
}

/* SVG 图标核心容器 */
.icon-wrap { 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  width: 22px; 
  height: 22px; 
}
.icon-wrap svg { 
  width: 100%; 
  height: 100%; 
  color: #ffffff; 
  display: block; 
}

/* ============================================================================
   1. 角色气泡提示 (Speech Bubble)
   ============================================================================ */
.yuki-speech-bubble { 
  position: absolute; 
  top: 15%; 
  left: 50%; 
  transform: translateX(-50%); 
  max-width: 320px; 
  min-width: 100px; 
  padding: 16px 20px; 
  background: rgba(30, 30, 30, 0.65); 
  backdrop-filter: blur(20px) saturate(150%); 
  -webkit-backdrop-filter: blur(20px) saturate(150%); 
  border: 1px solid rgba(255, 255, 255, 0.15); 
  border-radius: 24px; 
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25); 
  color: #fff; 
  font-size: 15px; 
  line-height: 1.6; 
  z-index: 100; 
  pointer-events: auto; 
}

.yuki-speech-bubble .bubble-tail { 
  content: ''; 
  position: absolute; 
  bottom: -10px; 
  left: 50%; 
  transform: translateX(-50%); 
  border-width: 10px 10px 0; 
  border-style: solid; 
  border-color: rgba(30, 30, 30, 0.65) transparent transparent; 
  display: block; 
  width: 0; 
}

/* 气泡文字内容防爆控制 */
.bubble-content {
  max-height: 140px; 
  overflow-y: auto;  
  text-align: left;  
  word-break: break-word; 
  padding-right: 6px; 
}

/* 气泡极简滚动条 */
.bubble-content::-webkit-scrollbar { width: 4px; }
.bubble-content::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.3); border-radius: 4px; }
.bubble-content::-webkit-scrollbar-track { background: transparent; }

/* 气泡弹现动画 */
.bubble-pop-enter-active { transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
.bubble-pop-leave-active { transition: all 0.3s ease-in; }
.bubble-pop-enter-from { opacity: 0; transform: translate(-50%, 20px) scale(0.8); }
.bubble-pop-leave-to { opacity: 0; transform: translate(-50%, -10px) scale(0.9); }

/* ============================================================================
   2. 底部对话输入舱 (Chat Input Area)
   ============================================================================ */
.bottom-input-container { 
  position: absolute; 
  bottom: 10%; 
  left: 50%; 
  transform: translateX(-50%); 
  width: 320px; 
  min-height: 48px; 
  height: auto; 
  background: rgba(30, 30, 30, 0.65); 
  backdrop-filter: blur(30px) saturate(180%); 
  -webkit-backdrop-filter: blur(30px) saturate(180%); 
  border: 1px solid rgba(255, 255, 255, 0.15); 
  border-radius: 24px; 
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); 
  display: flex; 
  align-items: flex-end; 
  padding: 6px 6px 6px 16px; 
  z-index: 100; 
  pointer-events: auto; 
}

/* 输入框本体 */
.bottom-input-container textarea { 
  flex: 1; 
  background: transparent; 
  border: none; 
  outline: none; 
  color: #fff; 
  font-size: 14px; 
  font-family: inherit; 
  line-height: 1.5; 
  min-height: 24px; 
  height: 24px; 
  max-height: 120px; 
  resize: none; 
  overflow-y: auto; 
  margin-right: 8px; 
  padding: 6px 0; 
}
.bottom-input-container textarea::placeholder { color: rgba(255,255,255,0.4); }
.bottom-input-container textarea::-webkit-scrollbar { width: 4px; }
.bottom-input-container textarea::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
.bottom-input-container textarea::-webkit-scrollbar-track { background: transparent; }

/* 发送按钮 */
.send-action-btn { 
  width: 36px; height: 36px; 
  border-radius: 50%; 
  background: rgba(255,255,255,0.1); 
  border: 1px solid rgba(255,255,255,0.2); 
  color: white; 
  display: flex; justify-content: center; align-items: center; 
  cursor: pointer; 
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); 
  flex-shrink: 0; 
  margin-bottom: 0px; 
}
.send-action-btn .icon-wrap { width: 18px; height: 18px; margin-right: 2px;} 
.send-action-btn:hover:not(:disabled) { background: rgba(255,255,255,0.2); transform: scale(1.1); }
.send-action-btn:active:not(:disabled) { transform: scale(0.9); }
.send-action-btn:disabled { opacity: 0.4; cursor: not-allowed; filter: grayscale(1); }

/* 唤出历史面板的切换按钮 */
.history-toggle-btn {
  width: 32px; height: 32px; 
  border-radius: 50%;
  background: transparent; 
  border: none; 
  color: rgba(255,255,255,0.6);
  cursor: pointer; 
  display: flex; justify-content: center; align-items: center;
  margin-right: 8px; 
  transition: 0.2s; 
  flex-shrink: 0;
}
.history-toggle-btn:hover, .history-toggle-btn.is-active { 
  color: var(--primary, #4facfe); 
  background: rgba(255,255,255,0.1); 
}
.history-toggle-btn .icon-wrap { width: 20px; height: 20px; }

/* 输入框升降动画 */
.slide-up-bottom-enter-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-bottom-leave-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-bottom-enter-from, .slide-up-bottom-leave-to { opacity: 0; transform: translate(-50%, 50px) scale(0.9); }

/* ============================================================================
   3. 历史对话悬浮面板 (Chat History Panel)
   ============================================================================ */
.chat-history-panel {
  position: absolute;
  bottom: calc(10% + 60px); /* 悬浮在输入框正上方 */
  left: 50%; 
  transform: translateX(-50%);
  width: 340px; height: 360px;
  background: rgba(30, 30, 30, 0.5);
  backdrop-filter: blur(25px) saturate(180%);
  -webkit-backdrop-filter: blur(25px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px; 
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  display: flex; flex-direction: column; 
  z-index: 99; 
  pointer-events: auto;
}

.history-header {
  padding: 12px 16px; 
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex; justify-content: space-between; align-items: center;
  font-size: 14px; font-weight: 500; color: #fff;
}

.header-actions { display: flex; gap: 12px; align-items: center; }

/* 小图标操作按钮 (扩大/删除) */
.icon-btn-small { 
  background: transparent; border: none; cursor: pointer; transition: 0.2s; display: flex; 
}
.icon-btn-small .icon-wrap { width: 16px; height: 16px; }
.icon-btn-small:hover { transform: scale(1.15); }
.icon-btn-small.expand { color: rgba(255, 255, 255, 0.7); }
.icon-btn-small.expand:hover { color: #fff; }
.icon-btn-small.delete { color: #ef4444; opacity: 0.8; }
.icon-btn-small.delete:hover { opacity: 1; }

/* 聊天记录内容区 */
.history-content {
  flex: 1; 
  overflow-y: auto; 
  padding: 16px; 
  display: flex; flex-direction: column; gap: 12px;
}
.history-content::-webkit-scrollbar { width: 4px; }
.history-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }

/* 聊天气泡样式 */
.msg-bubble {
  max-width: 85%; padding: 10px 14px; border-radius: 14px; 
  font-size: 13px; line-height: 1.5; color: #fff; word-break: break-all;
}
.msg-bubble.user { 
  align-self: flex-end; 
  background: var(--primary, #4facfe); 
  border-bottom-right-radius: 4px; 
}
.msg-bubble.assistant { 
  align-self: flex-start; 
  background: rgba(255,255,255,0.15); 
  border-bottom-left-radius: 4px; 
  border: 1px solid rgba(255,255,255,0.1); 
}
.empty-history { text-align: center; color: rgba(255,255,255,0.4); font-size: 13px; margin-top: 20px; }

/* 面板滑入动画 */
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translate(-50%, 20px) scale(0.95); }

/* ============================================================================
   4. 右上角系统菜单与 FAB 按钮 (System Menu & FAB)
   ============================================================================ */
.control-panel { 
  position: absolute; 
  top: 30px; 
  right: 30px; 
  z-index: 1000; 
  transition: transform 0.5s ease, opacity 0.5s ease; 
}
/* 智能贴边隐藏状态 */
.control-panel.is-docked { 
  transform: scale(0.85); 
  transform-origin: top right; 
  opacity: 0.3; 
}
.control-panel.is-docked:hover { opacity: 1; }

.main-buttons { 
  position: relative; 
  width: 48px; height: 48px; 
  display: flex; justify-content: center; 
}

/* 基础圆形按钮样式 */
.circle-btn { 
  border-radius: 50%; 
  border: 1px solid rgba(255, 255, 255, 0.15); 
  background-color: rgba(30, 30, 30, 0.65); 
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); 
  color: #fff; cursor: pointer; 
  display: flex; justify-content: center; align-items: center; 
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2); 
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); 
}

/* 主开关按钮 */
.toggle-btn { position: absolute; z-index: 2; top: 0; width: 48px; height: 48px; }
.toggle-btn:hover { background-color: rgba(60, 60, 60, 0.8); transform: scale(1.05); }
.toggle-btn.is-active { 
  transform: rotate(90deg); 
  background-color: rgba(40, 40, 40, 0.75); 
  border-color: rgba(255, 255, 255, 0.25); 
}

/* 拖拽按钮 */
.drag-btn { position: absolute; z-index: 1; top: 60px; width: 40px; height: 40px; }
.drag-btn:hover { background-color: rgba(80, 80, 80, 0.8); transform: scale(1.05); }
.drag-btn:active { 
  cursor: grabbing; transform: scale(0.92); 
  background-color: rgba(50, 50, 50, 0.8); border-color: rgba(255,255,255,0.3); 
}

/* 九宫格菜单面板 */
.grid-menu { 
  position: absolute; 
  top: 0; 
  right: 60px; 
  display: grid; 
  grid-template-columns: repeat(3, 1fr); gap: 12px; 
  background: rgba(30, 30, 30, 0.65); 
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); 
  padding: 16px; 
  border-radius: 20px; 
  border: 1px solid rgba(255, 255, 255, 0.15); 
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); 
  transform-origin: top right; 
}

/* 菜单内的独立图标按钮 */
.icon-btn { 
  width: 44px; height: 44px; 
  border-radius: 50%; 
  background: linear-gradient(135deg, rgba(70, 70, 70, 0.8), rgba(30, 30, 30, 0.6)); 
  border: 1px solid rgba(255, 255, 255, 0.15); 
  color: white; 
  display: flex; justify-content: center; align-items: center; 
  cursor: pointer; position: relative; 
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); 
  box-shadow: 0 4px 10px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.15);
}
.icon-btn:hover { 
  background: linear-gradient(135deg, rgba(90, 90, 90, 0.9), rgba(50, 50, 50, 0.7)); 
  border-color: rgba(255, 255, 255, 0.3); 
  transform: translateY(-3px) scale(1.08); 
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255,255,255,0.25); 
}


/* 菜单按钮提示文字 (ToolTip) */
.icon-btn::after { 
  content: attr(data-label); position: absolute; 
  bottom: calc(100% + 12px); left: 50%; 
  transform: translateX(-50%) translateY(5px); 
  background-color: rgba(0, 0, 0, 0.8); color: #fff; 
  font-size: 12px; font-weight: 500; padding: 6px 10px; border-radius: 8px; 
  white-space: nowrap; pointer-events: none; opacity: 0; transition: all 0.2s ease; 
}
.icon-btn:hover::after { opacity: 1; transform: translateX(-50%) translateY(0); }

/* FAB 与 菜单弹现动画 */
.fab-pop-enter-active, .fab-pop-leave-active { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.fab-pop-enter-from, .fab-pop-leave-to { opacity: 0; transform: translateY(-30px) scale(0.5); }
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { transform: scale(0.6) translate(30px, -30px); opacity: 0; }

/* ============================================================================
   5. 换装微调面板 (Model Tuning Modal)
   ============================================================================ */
.window-modal { 
  position: absolute; top: 50%; left: 50%; 
  transform: translate(-50%, -50%); 
  width: 280px; 
  background: rgba(30, 30, 30, 0.65); 
  backdrop-filter: blur(25px) saturate(150%); 
  border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.15); 
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4); color: white; 
  z-index: 2000; display: flex; flex-direction: column; 
  padding: 20px; box-sizing: border-box; 
}
.window-header { 
  display: flex; justify-content: space-between; align-items: center; 
  font-size: 15px; font-weight: bold; border-bottom: 1px solid rgba(255, 255, 255, 0.1); 
  padding-bottom: 12px; margin-bottom: 16px; 
}
.close-btn { 
  background: transparent; border: none; color: white; font-size: 24px; 
  cursor: pointer; opacity: 0.6; transition: 0.2s; 
}
.close-btn:hover { opacity: 1; color: #ff5e5e;}

/* 滑块样式 */
.sliders-section { display: flex; flex-direction: column; gap: 12px; }
.slider-group { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #ddd; }
input[type=range] { 
  -webkit-appearance: none; appearance: none; 
  width: 100%; background: rgba(255, 255, 255, 0.2); 
  height: 4px; border-radius: 2px; outline: none; 
}
input[type=range]::-webkit-slider-thumb { 
  -webkit-appearance: none; appearance: none; 
  width: 16px; height: 16px; border-radius: 50%; 
  background: #ffffff; border: 1px solid rgba(0,0,0,0.1); 
  cursor: pointer; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3); 
}

.scale-fade-enter-active, .scale-fade-leave-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.scale-fade-enter-from, .scale-fade-leave-to { opacity: 0; transform: translate(-50%, -45%) scale(0.95); }

/* ============================================================================
   6. 动作指令控制面板 (Action Panel Modal)
   ============================================================================ */
.action-list-modal {
  width: 340px; 
  /* 修复错位：严格居中对齐底侧 */
  left: 50% !important;
  right: auto !important;
  top: auto !important; 
  bottom: -100px !important; 
  transform: translate(-50%, -50%) !important; 
  margin: 0;
  display: flex; flex-direction: column;
}

/* 顶部编辑/保存操作区 */
.header-actions-edit { 
  display: flex; align-items: center; gap: 12px; flex-shrink: 0; 
}
.icon-action-header { 
  background: transparent; border: none; color: #aaa; cursor: pointer; 
  padding: 4px; border-radius: 6px; display: flex; justify-content: center; align-items: center; 
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.icon-action-header svg { width: 18px; height: 18px; } 
.icon-action-header:hover { color: #fff; background: rgba(255,255,255,0.1); transform: scale(1.1); }
.icon-action-header.save:hover { color: #10b981; } 
.icon-action-header.close:hover { color: #ef4444; }

/* 动作列表滚动容器 */
.action-groups-container { 
  overflow-y: auto; 
  max-height: 170px; /* 限高防止过长遮挡角色 */
  padding-right: 6px; display: flex; flex-direction: column; gap: 12px; 
}
.action-groups-container::-webkit-scrollbar { width: 4px; }
.action-groups-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }

/* 动作分组标题 */
.action-group { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 10px; }
.group-title { margin: 0 0 10px 0; font-size: 13px; color: var(--primary); font-weight: bold; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 6px;}

/* 横向 3 列动作网格 */
.action-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
}
.action-item-wrapper { min-height: 26px; }

/* 动作播放按钮 */
.action-item-btn {
  width: 100%; 
  background: rgba(255, 255, 255, 0.06); 
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff; padding: 6px 4px; border-radius: 6px; font-size: 11px; cursor: pointer;
  transition: all 0.15s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.action-item-btn:hover { 
  background: var(--primary); border-color: transparent; transform: translateY(-1px); 
}

/* 编辑模式下的重命名输入框 */
.action-item-input {
  width: 100%; box-sizing: border-box; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--primary); padding: 5px 4px; border-radius: 6px; font-size: 11px; outline: none; font-family: inherit;
}
.action-item-input:focus { border-color: var(--primary); background: rgba(0, 0, 0, 0.5); }
.action-item-input::placeholder { color: #666; font-size: 10px; }

/* 🌟 4. 主界面红色的打断按钮样式 */
.stop-tts-btn { 
  background: rgba(239, 68, 68, 0.2) !important; 
  border-color: rgba(239, 68, 68, 0.5) !important; 
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
}
.stop-tts-btn:hover { 
  background: #ef4444 !important; 
  transform: scale(1.1); 
}

/* 激活状态 */
.icon-btn.is-active { 
  background: linear-gradient(135deg, var(--primary, #4facfe), color-mix(in srgb, var(--primary, #4facfe) 50%, #000)); 
  border-color: rgba(255, 255, 255, 0.4); 
  box-shadow: 0 4px 15px color-mix(in srgb, var(--primary, #4facfe) 60%, transparent), inset 0 1px 3px rgba(255,255,255,0.3); 
}

/* 监听到声音时的红色特效 */
.icon-btn.is-hearing {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.8), rgba(185, 28, 28, 0.9)) !important;
  border-color: #f87171 !important;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.6) !important;
  animation: mic-pulse-danger 1.2s infinite !important;
}

/* 关键帧动画 */
@keyframes mic-pulse-danger {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
  70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

</style>