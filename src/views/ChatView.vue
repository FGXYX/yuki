<script setup lang="ts">
// ============================================================================
// 1. 模块引入 (Imports)
// ============================================================================
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { initDB, clearHistoryDB } from '@/core/Database';
import { ConfigStore } from '@/core/ConfigStore';

import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css'; 

// 🌟 直接引入"中央大脑"与语音
import { useChat } from '@/composables/useChat';
import { useTTS } from '@/composables/useTTS';

// 在顶部的 import 区域加入这两个 Tauri API：
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';

//mcp测试
import { invoke } from '@tauri-apps/api/core';


// ============================================================================
// 2. 静态资源与常量 (Constants)
// ============================================================================
const UI_SEND = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M210.3,35.9L23.9,88.4a8,8,0,0,0-1.2,15l85.6,40.5a7.8,7.8,0,0,0,4.2,1.1l77.5-77.5a8,8,0,1,1,11.4,11.4l-77.5,77.5a7.8,7.8,0,0,0,1.1,4.2l40.5,85.6a8,8,0,0,0,15-1.2L232.1,57.1A8,8,0,0,0,210.3,35.9Z"></path></svg>';
const UI_TRASH = '<svg viewBox="0 0 256 256"><line x1="216" y1="56" x2="40" y2="56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><line x1="104" y1="104" x2="104" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><line x1="152" y1="104" x2="152" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M200,56V208a8,8,0,0,1-8-8H64a8,8,0,0,1-8-8V56"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M168,56V40a16,16,0,0,0-16-16H104A16,16,0,0,0,88,40V56"></path></svg>';
const UI_COPY = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M216,168h-8V48a8,8,0,0,0-8-8H88V32a8,8,0,0,1,8-8H216a8,8,0,0,1,8,8V160A8,8,0,0,1,216,168Z"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M168,224H40a8,8,0,0,1-8-8V88a8,8,0,0,1,8-8H168a8,8,0,0,1,8,8V216A8,8,0,0,1,168,224Z"></path></svg>';
const UI_CHECK = '<svg viewBox="0 0 256 256"><polyline points="216 72.005 104 184 48 128.005" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></polyline></svg>';
const UI_PALETTE = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M128,40A88,88,0,1,0,216,128c0-22-16-40-40-40H160a24,24,0,0,1,24-24C184,52.9,157.9,40,128,40ZM84,104a12,12,0,1,1-12-12A12,12,0,0,1,84,104Zm44-28a12,12,0,1,1-12-12A12,12,0,0,1,128,76Zm44,28a12,12,0,1,1-12-12A12,12,0,0,1,172,104Z"></path></svg>';
const UI_MENU = '<svg viewBox="0 0 256 256"><line x1="40" y1="128" x2="216" y2="128" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><line x1="40" y1="64" x2="216" y2="64" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><line x1="40" y1="192" x2="216" y2="192" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line></svg>';
const UI_PLUS = '<svg viewBox="0 0 256 256"><line x1="40" y1="128" x2="216" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><line x1="128" y1="40" x2="128" y2="216" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line></svg>';
const UI_MESSAGE = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M216,48H40A16,16,0,0,0,24,64V224a8.1,8.1,0,0,0,13.4,6l43-34H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48Z"></path></svg>';
const UI_ATTACH = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M209.7,92.3l-84.9,84.9a48,48,0,0,1-67.9-67.9l84.9-84.9a32,32,0,0,1,45.2,45.3L102.1,154.6a16,16,0,0,1-22.6-22.6L160,51.4"></path></svg>';
// ============================================================================
// 3. 响应式状态与 DOM 引用
// ============================================================================
const scrollRef = ref<HTMLElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const copiedId = ref<string | null>(null);

const isSidebarOpen = ref(true);
const sessions = ref<{id: string, title: string, updatedAt: number}[]>([]);
const activeSessionId = ref('default');

const isThemePanelOpen = ref(false);
const chatTheme = ref({
  // 字体排版
  fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, lineHeight: 1.5, 
  textColor: '#ececec',       // 1. 全局基础文字 (输入框、顶栏等)
  panelTextColor: '#ececec',  // 2. 面板文字
  sidebarTextColor: '#ececec',// 3. 侧栏文字
  aiTextColor: '#ececec',     // 4. AI 气泡文字
  userTextColor: '#ffffff',   // 5. 我的气泡文字
  
  // 气泡
  bubbleRadius: 16, aiBgColor: '#242528', userBgColor: '#4facfe',
  aiBubbleOpacity: 1.0, userBubbleOpacity: 1.0,
  bubbleShadow: true,
  // 消息区间距
  msgGap: 4,
  // 侧边栏
  sidebarWidth: 220,
  // 输入框
  inputRadius: 20,
  // 背景
  bgColor: '#141517', bgImage: '', bgSize: 'cover', bgPosition: 'center', bgBlur: 0, bgOpacity: 0.15,
  // 顶栏
  headerBg: 'auto', headerBgColor: '#141517', headerBlur: true,
});
const isSkillPanelOpen = ref(false); // 控制 Skill 面板显示

// 重置函数也要同步加上这几个新变量


// 🌟 核心：引入中央大脑的状态和方法！
const { stopTTS, isPlayingTTS } = useTTS();
const { 
  chatInputText: inputText,
  isSpeaking: isThinking,
  chatHistory, 
  sendMessage: coreSendMessage, 
  clearChatHistory, 
  loadChatHistory,
  mcpConfigs,
  saveMcpConfigs,
  agentSkills, saveSkills   
} = useChat();


// ============================================================================
// 4. 工具方法
// ============================================================================
const scrollToBottom = () => { nextTick(() => { if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight; }); };

// 🌟 修复 1：只要聊天记录发生变化（比如 AI 正在流式输出），就死死咬住最底部
watch(chatHistory, () => {
  scrollToBottom();
}, { deep: true });

// 🌟 修复 2：当 AI 开始思考（出现正在输入动画）时，也主动滚到底部
watch(isThinking, (isWorking) => {
  if (isWorking) scrollToBottom();
});

const copyToClipboard = async (text: string, id: string) => {
  try {
    await navigator.clipboard.writeText(text); copiedId.value = id;
    setTimeout(() => { if (copiedId.value === id) copiedId.value = null; }, 2000);
  } catch (err) {}
};

// 🌟 状态：当前正在预览的图片 URL
const previewImageUrl = ref<string | null>(null);

// 打开图片预览 (加个问号，允许传入 undefined)
const openPreview = (url?: string) => {
  if (!url) return; // 安全拦截
  previewImageUrl.value = url;
};

// 关闭图片预览
const closePreview = () => {
  previewImageUrl.value = null;
};

// 🌟 终极版：同时支持文本、代码块、图片和视频的解析器
const parseMessage = (text: string) => {
  if (!text) return [];
  const parts = [];
  
  // 强悍的正则：精准捕获 代码块、图片(![...](...))、视频([video](...))
  const regex = /(```([a-zA-Z0-9+#\-_]*)\s*\n([\s\S]*?)```)|(!\[.*?\]\((.*?)\))|(\[video\]\((.*?)\))/g;
  
  let lastIndex = 0; 
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    
    if (match[1]) {
      // 1. 代码块处理
      const lang = match[2].trim(); 
      const rawCode = match[3].trim(); 
      let highlightedCode = rawCode;
      try {
        if (lang && hljs.getLanguage(lang)) highlightedCode = hljs.highlight(rawCode, { language: lang }).value;
        else highlightedCode = hljs.highlightAuto(rawCode).value;
      } catch (e) { }
      parts.push({ type: 'code', language: lang || 'plaintext', content: highlightedCode, raw: rawCode });
    } else if (match[4]) {
      // 2. 图片处理
      parts.push({ type: 'image', url: match[5] });
    } else if (match[6]) {
      // 3. 视频处理
      parts.push({ type: 'video', url: match[7] });
    }
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return parts;
};

// 格式化时间戳
const formatTime = (timeVal?: number | string) => {
  if (!timeVal) return '刚才';
  
  let d = new Date(timeVal);
  if (isNaN(d.getTime()) && typeof timeVal === 'string') {
    d = new Date(timeVal.replace(/-/g, '/'));
  }
  
  const now = new Date();
  // 提取今天的“零点”和消息发生的“零点”，用于精准计算差了几天
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  
  const diffTime = today.getTime() - targetDay.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  // 提取具体的时分 (HH:mm)
  const timeStr = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  
  if (diffDays === 0) {
    // 1. 今天：只显示时分 (例如: 16:07)
    return timeStr;
  } else if (diffDays === 1) {
    // 2. 昨天：加上“昨天”前缀 (例如: 昨天 16:07)
    return `昨天 ${timeStr}`;
  } else if (d.getFullYear() === now.getFullYear()) {
    // 3. 今年内的其他日子：显示 月-日 时:分 (例如: 04-18 16:07)
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${m}-${day} ${timeStr}`;
  } else {
    // 4. 跨年：显示 年-月-日 时:分 (例如: 2025-11-11 16:07)
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day} ${timeStr}`;
  }
};

// 格式化会话日期标签
const formatSessionDate = (timestamp: number) => {
  const d = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return '今天';
  if (diff < 172800000) return '昨天';
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

// 🌟 MCP 面板控制逻辑
const isMcpPanelOpen = ref(false);

const addNewMcp = () => {
  mcpConfigs.value.push({
    name: '新插件 (如 Filesystem)',
    command: 'node', // 习惯性建议默认写 node 或 npx
    args: [],
    enabled: false,
    isExpanded: true // 🌟 新建时默认展开，方便直接配置参数
  });
  saveMcpConfigs();
};

const removeMcp = (index: number) => {
  if (confirm('确定要删除这个插件吗？')) {
    mcpConfigs.value.splice(index, 1);
    saveMcpConfigs();
  }
};

// 🌟 终极灵活：环境变量文本解析器
const getEnvString = (env?: Record<string, string>) => {
  if (!env) return '';
  return Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n');
};

const updateEnvFromString = (config: any, str: string) => {
  const newEnv: Record<string, string> = {};
  str.split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (key) newEnv[key] = val;
    }
  });
  config.env = Object.keys(newEnv).length > 0 ? newEnv : undefined;
  saveMcpConfigs();
};

// ==========================================
// 🌟 新增：导入 Markdown 作为 Skill 的逻辑
// ==========================================
const skillFileInputRef = ref<HTMLInputElement | null>(null);

const triggerSkillImport = () => {
  if (skillFileInputRef.value) skillFileInputRef.value.click();
};

const handleImportSkill = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const textContent = e.target?.result as string;
    // 自动把文件名（去掉 .md 后缀）当做 Skill 的名字
    const skillName = file.name.replace(/\.[^/.]+$/, "");
    
    // 把读取到的内容塞进 Agent Skills 列表
    agentSkills.value.push({
      name: skillName,
      content: textContent,
      enabled: true, // 导入后默认直接启用！
      isExpanded: false, // 导入后默认收起，方便用户快速浏览和管理多个技能
    });
    saveSkills(); // 保存到本地数据库
    
    // 清空 input，防止下次选同一个文件不触发 change 事件
    if (skillFileInputRef.value) skillFileInputRef.value.value = '';
  };
  
  // 以 UTF-8 文本格式读取文件
  reader.readAsText(file, 'utf-8');
};

// ============================================================================
// 5. 会话管理业务逻辑
// ============================================================================
const loadSessions = async () => {
  const savedSessions = await ConfigStore.get<any[]>('yuki_chat_sessions', [{id: 'default', title: '新建对话', updatedAt: Date.now()}]);
  const active = await ConfigStore.get<string>('yuki_active_session', 'default');
  sessions.value = savedSessions.sort((a, b) => b.updatedAt - a.updatedAt);
  activeSessionId.value = active;
};

const saveSessions = async () => {
  await ConfigStore.set('yuki_chat_sessions', sessions.value);
  await ConfigStore.set('yuki_active_session', activeSessionId.value);
};

const createNewSession = async () => {
  const newId = 'session_' + Date.now();
  sessions.value.unshift({ id: newId, title: '新建对话', updatedAt: Date.now() });
  activeSessionId.value = newId;
  await saveSessions();
  await loadChatHistory();
};

const switchSession = async (id: string) => {
  if (activeSessionId.value === id) return;
  activeSessionId.value = id;
  await saveSessions();
  await loadChatHistory();
  stopTTS(); 
  if (window.innerWidth < 768) isSidebarOpen.value = false;
  scrollToBottom();
};

const deleteSession = async (id: string) => {
  if (sessions.value.length <= 1) { alert('至少保留一个对话框哦！'); return; }
  if (confirm('确定要删除这个对话吗？')) {
    await clearHistoryDB(id);
    sessions.value = sessions.value.filter(s => s.id !== id);
    if (activeSessionId.value === id) {
      activeSessionId.value = sessions.value[0].id;
      await saveSessions();
      await loadChatHistory();
    } else {
      await saveSessions();
    }
  }
};

// ============================================================================
// 6. 核心动作覆盖
// ============================================================================
const clearChat = async () => {
  if (confirm(`确定要清空当前对话的所有记忆吗？`)) {
    await clearChatHistory();
    const current = sessions.value.find(s => s.id === activeSessionId.value);
    if (current) current.title = '新建对话';
    await saveSessions();
  }
};

const sendMessage = async () => {
  const text = inputText.value.trim();
  if (!text || isThinking.value) return;

  const currentSession = sessions.value.find(s => s.id === activeSessionId.value);
  if (currentSession && currentSession.title === '新建对话') {
    currentSession.title = text.length > 15 ? text.slice(0, 15) + '...' : text;
    currentSession.updatedAt = Date.now();
    await saveSessions();
  }

  await coreSendMessage(); 
  
  if (currentSession) { 
    currentSession.updatedAt = Date.now(); 
    await saveSessions(); 
  }
  scrollToBottom();
};

// 🌟 临时改装：用来测试“执行工具”
const runMCPTest = async () => {
  try {
    console.log("🚀 开始测试让 Rust 执行 MCP 技能...");
    
    // 调用我们刚在 Rust 写的执行函数
    const result = await invoke('execute_mcp_tool', { 
      toolName: "create_entities", 
      // 注意：这里传的是 JSON 格式的字符串
      toolArgs: `{"entities":[{"name": "主人", "entityType": "用户", "observations": ["今天晚上我成功接入了 MCP"]}]}`
    });
    
    console.log("🎉 执行结果:", JSON.parse(result as string));
    alert("执行成功！请看控制台！");
  } catch (err) {
    console.error("❌ 执行失败：", err);
    alert("执行失败，报错：" + err);
  }
};

// 选择本地图片/视频的逻辑
const handleAttachMedia = async () => {
  try {
    // 调起系统文件选择框
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Media',
        extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm']
      }]
    });

    if (selected && typeof selected === 'string') {
      // 把 C:\xxx\xxx.jpg 这样的本地路径，安全转换为 asset:// 协议
      let safeUrl = convertFileSrc(selected);
      // 兼容 Windows 路径反斜杠
      safeUrl = safeUrl.replace(/%5C/ig, '/').replace(/%2F/ig, '/').replace(/\\/g, '/');
      
      const isVideo = selected.match(/\.(mp4|webm)$/i);
      
      // 🌟 拼装成 Markdown 格式插入到输入框中
      if (isVideo) {
        inputText.value += `\n[video](${safeUrl})\n`;
      } else {
        inputText.value += `\n![图片](${safeUrl})\n`;
      }
      
      // 焦点回到输入框
      scrollToBottom();
    }
  } catch (err) {
    console.error("选择文件失败:", err);
  }
};

const loadChatTheme = async () => { const saved = await ConfigStore.get<any>('yuki_chat_theme', null); if (saved) chatTheme.value = { ...chatTheme.value, ...saved }; };
const saveChatTheme = async () => { await ConfigStore.set('yuki_chat_theme', chatTheme.value); };
const resetChatTheme = () => { chatTheme.value = { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, lineHeight: 1.5, textColor: '#ececec', panelTextColor: '#ececec', sidebarTextColor: '#ececec', aiTextColor: '#ececec', userTextColor: '#ffffff', bubbleRadius: 16, aiBgColor: '#242528', userBgColor: '#4facfe', aiBubbleOpacity: 1.0, userBubbleOpacity: 1.0, bubbleShadow: true, msgGap: 4, sidebarWidth: 220, inputRadius: 20, bgColor: '#141517', bgImage: '', bgSize: 'cover', bgPosition: 'center', bgBlur: 0, bgOpacity: 0.15, headerBg: 'auto', headerBgColor: '#141517', headerBlur: true }; saveChatTheme(); };
const triggerUpload = () => { if (fileInputRef.value) fileInputRef.value.click(); };
const handleImageUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d')!;
      let width = img.width; let height = img.height; const maxSize = 1920; 
      if (width > maxSize || height > maxSize) { if (width > height) { height *= maxSize / width; width = maxSize; } else { width *= maxSize / height; height = maxSize; } }
      canvas.width = width; canvas.height = height; ctx.drawImage(img, 0, 0, width, height);
      chatTheme.value.bgImage = canvas.toDataURL('image/jpeg', 0.85); saveChatTheme();
      if (fileInputRef.value) fileInputRef.value.value = '';
    }; img.src = e.target?.result as string;
  }; reader.readAsDataURL(file);
};
const clearLocalImage = () => { chatTheme.value.bgImage = ''; saveChatTheme(); };

onMounted(async () => {
  await initDB();
  await loadSessions();
  await loadChatTheme();
});

onUnmounted(() => { 
  stopTTS(); 
});
</script>

<template>
<div class="chat-app" :style="{
    '--chat-bg': chatTheme.bgColor, '--ai-bg': chatTheme.aiBgColor, '--user-bg': chatTheme.userBgColor,
    '--font-family': chatTheme.fontFamily, '--font-size': chatTheme.fontSize + 'px',
    '--line-height': chatTheme.lineHeight, 
    '--text-color': chatTheme.textColor,
    '--panel-text-color': chatTheme.panelTextColor,
    '--sidebar-text-color': chatTheme.sidebarTextColor,
    '--ai-text-color': chatTheme.aiTextColor,
    '--user-text-color': chatTheme.userTextColor,
    /* 👇 新增这两行，把透明度转化为百分比变量供底色混合使用 */
    '--ai-opacity': Math.round(chatTheme.aiBubbleOpacity * 100) + '%',
    '--user-opacity': Math.round(chatTheme.userBubbleOpacity * 100) + '%',
    /* 👆 新增结束 */
    '--bubble-radius': chatTheme.bubbleRadius + 'px', '--bg-size': chatTheme.bgSize, '--bg-position': chatTheme.bgPosition,
    '--sidebar-width': chatTheme.sidebarWidth + 'px', '--input-radius': chatTheme.inputRadius + 'px',
    '--msg-gap': chatTheme.msgGap + 'px',
  }">
    
    <!-- 背景层 -->
    <div class="chat-bg-layer" :style="{ backgroundImage: chatTheme.bgImage ? `url(${chatTheme.bgImage})` : 'none', filter: `blur(${chatTheme.bgBlur}px)`, opacity: chatTheme.bgOpacity }"></div>

    <div class="layout-wrapper">
      
      <!-- ===== 左侧栏 ===== -->
      <aside class="sidebar" :class="{ 'is-open': isSidebarOpen }">
        <!-- 新建对话按钮 -->
        <div class="sidebar-header">
          <button class="new-chat-btn" @click="createNewSession">
            <span class="icon-wrap" v-html="UI_PLUS"></span>
            <span>新建对话</span>
          </button>
        </div>
        
        <!-- 会话列表 -->
        <div class="session-list">
          <div v-for="session in sessions" :key="session.id" 
               class="session-item" :class="{ 'active': activeSessionId === session.id }"
               @click="switchSession(session.id)">
            <div class="s-icon-wrap">
              <span class="icon-wrap" v-html="UI_MESSAGE"></span>
            </div>
            <div class="s-body">
              <span class="s-title" :title="session.title">{{ session.title }}</span>
              <span class="s-time">{{ formatSessionDate(session.updatedAt) }}</span>
            </div>
            <button class="s-del-btn" @click.stop="deleteSession(session.id)" title="删除">×</button>
          </div>
        </div>

        <div class="sidebar-footer">
          <button class="footer-item-btn" @click="isSkillPanelOpen = true">
            <span class="mcp-icon">💡</span>
            <span>Skill</span>
            <span class="mcp-badge" v-if="agentSkills && agentSkills.filter(s => s.enabled).length > 0">
              {{ agentSkills.filter(s => s.enabled).length }}
            </span>
          </button>
          
          <button class="footer-item-btn" style="margin-top: 8px;" @click="isMcpPanelOpen = true">
            <span class="mcp-icon">🧩</span>
            <span>MCP管理</span>
            <span class="mcp-badge" v-if="mcpConfigs && mcpConfigs.filter(c => c.enabled).length > 0">
              {{ mcpConfigs.filter(c => c.enabled).length }}
            </span>
          </button>
        </div>

      </aside>

      <!-- ===== 右侧主区域 ===== -->
      <main class="main-content">

        <!-- 顶部导航栏 -->
        <header class="chat-header" :style="chatTheme.headerBg === 'custom' ? { background: chatTheme.headerBgColor + 'cc' } : {}">
          <div class="header-left">
            <button class="toggle-sidebar-btn" @click="isSidebarOpen = !isSidebarOpen">
              <span class="icon-wrap" v-html="UI_MENU"></span>
            </button>
          </div>
          
          <div class="header-center">
            <span v-if="isThinking" class="status-badge thinking">
              <span class="typing-dots"><span></span><span></span><span></span></span> 正在输入...
            </span>
            <span v-else-if="isPlayingTTS" class="status-badge speaking">🔊 正在讲话...</span>
          </div>

          <div class="header-right">
            <button class="header-icon-btn theme-btn" @click="isThemePanelOpen = true" title="外观设定">
              <span class="icon-wrap" v-html="UI_PALETTE"></span>
            </button>
            <button class="header-icon-btn danger-btn" @click="clearChat" title="清空当前记忆">
              <span class="icon-wrap" v-html="UI_TRASH"></span>
            </button>
          </div>
        </header>

        <!-- 消息滚动区 -->
        <div class="chat-scroll-area" ref="scrollRef">
          
          <!-- 空状态 -->
          <div v-if="chatHistory.length === 0" class="empty-state">
            <div class="empty-avatar">Y</div>
            <p class="empty-name">Yuki</p>
            <p class="empty-tip">这是崭新的对话篇章，快来聊聊吧！</p>
          </div>

          <!-- 消息气泡列表 -->
          <template v-for="(msg, msgIndex) in chatHistory" :key="msgIndex">
            <div :class="['message-row', msg.role]">
              
              
              <div class="bubble-container">
                <div class="message-bubble"
                  :style="{
                    
                    boxShadow: chatTheme.bubbleShadow ? undefined : 'none'
                  }">
                  <template v-for="(part, partIndex) in parseMessage(msg.content)" :key="partIndex">
                    <span v-if="part.type === 'text'" class="text-part">{{ part.content }}</span>
                    
                    <div v-else-if="part.type === 'code'" class="code-block-wrapper">
                      <div class="code-header">
                        <span class="code-lang">{{ part.language }}</span>
                        <button class="code-copy-btn" @click="copyToClipboard(part.raw || '', `${msgIndex}_${partIndex}`)">
                          <span class="icon-wrap" v-html="copiedId === `${msgIndex}_${partIndex}` ? UI_CHECK : UI_COPY"></span>
                          {{ copiedId === `${msgIndex}_${partIndex}` ? '已复制' : '复制代码' }}
                        </button>
                      </div>
                      <div class="code-content">
                        <pre><code class="hljs" v-html="part.content" style="background: transparent; padding: 0;"></code></pre>
                      </div>
                    </div>

                    <div v-else-if="part.type === 'image'" class="media-wrapper">
                      <img :src="part.url" alt="图片" class="chat-media-img" draggable="false" @click="openPreview(part.url)" />
                    </div>

                    <div v-else-if="part.type === 'video'" class="media-wrapper">
                      <video :src="part.url" controls class="chat-media-video"></video>
                    </div>
                  </template>
                </div>
                
                <!-- 时间戳 + 操作 -->
                <div class="bubble-meta">
                  <span class="msg-time" v-if="msg.timestamp">{{ formatTime(msg.timestamp) }}</span>
                  <span class="msg-time" v-else>刚才</span>
                  <button v-if="msg.role === 'assistant'" class="copy-btn" @click="copyToClipboard(msg.content, `full_${msgIndex}`)" :class="{'is-copied': copiedId === `full_${msgIndex}`}">
                    <span class="icon-wrap" v-html="copiedId === `full_${msgIndex}` ? UI_CHECK : UI_COPY"></span>
                    {{ copiedId === `full_${msgIndex}` ? '已复制' : '复制' }}
                  </button>
                </div>
              </div>

            
            </div>
          </template>

          <!-- 思考中 -->
          <div v-if="isThinking" class="message-row assistant">
            <div class="bubble-container">
              <div class="message-bubble thinking-bubble">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部输入区 -->
        <footer class="chat-input-area">
          <div class="input-wrapper">
            <textarea 
              v-model="inputText" 
              placeholder="发消息给 Yuki..." 
              @keydown.enter.exact.prevent="sendMessage"
            ></textarea>
            
            <div class="input-actions">
              <button class="send-btn attach-btn" @click="handleAttachMedia" title="发送图片或视频">
                <span class="icon-wrap" v-html="UI_ATTACH"></span>
              </button>
              
              <button class="send-btn mcp-test-btn" @click="runMCPTest" title="测试 MCP 通信">
                🧪
              </button>

              <button v-if="isPlayingTTS" class="send-btn stop-tts-btn" @click="stopTTS" title="打断说话">
                🛑
              </button>
              <button v-else class="send-btn" :class="{ 'is-active': inputText.trim() && !isThinking }" @click="sendMessage" :disabled="!inputText.trim() || isThinking">
                <span class="icon-wrap" v-html="UI_SEND"></span>
              </button>
            </div>
          </div>
          <p class="input-hint">Enter 发送 · Shift+Enter 换行</p>
        </footer>
      </main>
    </div>

    <!-- ===== 主题设置弹窗 ===== -->
    <Teleport to="body">
    <div v-if="isThemePanelOpen" class="theme-overlay" @click.self="isThemePanelOpen = false"
         :style="{
           '--chat-bg': chatTheme.bgColor,
           '--user-bg': chatTheme.userBgColor,
           '--panel-text-color': chatTheme.panelTextColor,
           '--font-family': chatTheme.fontFamily
         }">
      <div class="theme-panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <span class="panel-icon">🎨</span>
            <h3>外观定制</h3>
          </div>
          <button class="close-btn" @click="isThemePanelOpen = false">×</button>
        </div>
        
        <div class="panel-body">

          <!-- ── 字体与排版 ── -->
          <div class="setting-group">
            <div class="group-title">📝 字体与排版</div>
            <div class="setting-item">
              <label>字体风格</label>
              <select v-model="chatTheme.fontFamily" @change="saveChatTheme" class="theme-select">
                <option value="system-ui, -apple-system, sans-serif">默认 (系统现代无衬线)</option>
                <option value="'Microsoft YaHei', sans-serif">微软雅黑 (经典)</option>
                <option value="'SimSun', serif">宋体 (复古优雅)</option>
                <option value="'JetBrains Mono', Consolas, monospace">极客等宽 (代码风)</option>
                <option value="'Comic Sans MS', cursive">轻松活泼 (手写风)</option>
              </select>
            </div>
            <div class="setting-item-color"><label>全局 UI 文字 (输入框等)</label><input type="color" v-model="chatTheme.textColor" @change="saveChatTheme"></div>
            <div class="setting-item-color"><label>设置面板文字</label><input type="color" v-model="chatTheme.panelTextColor" @change="saveChatTheme"></div>
            <div class="setting-item">
              <div class="setting-label-row"><label>字体大小</label><span class="setting-val">{{ chatTheme.fontSize }} px</span></div>
              <input type="range" v-model.number="chatTheme.fontSize" min="12" max="22" @change="saveChatTheme">
            </div>
            <div class="setting-item">
              <div class="setting-label-row"><label>文字行高</label><span class="setting-val">{{ chatTheme.lineHeight }}</span></div>
              <input type="range" v-model.number="chatTheme.lineHeight" min="1.1" max="2.2" step="0.1" @change="saveChatTheme">
            </div>
          </div>

          <!-- ── 消息气泡 ── -->
          <div class="setting-group">
            <div class="group-title">💬 消息气泡</div>
            <div class="setting-item">
              <div class="setting-label-row"><label>气泡圆角</label><span class="setting-val">{{ chatTheme.bubbleRadius }} px</span></div>
              <input type="range" v-model.number="chatTheme.bubbleRadius" min="0" max="30" @change="saveChatTheme">
            </div>
            <div class="setting-item-color"><label>AI 气泡底色</label><input type="color" v-model="chatTheme.aiBgColor" @change="saveChatTheme"></div>
            <div class="setting-item-color"><label>AI 文字颜色</label><input type="color" v-model="chatTheme.aiTextColor" @change="saveChatTheme"></div>
            <div class="setting-item">
              <div class="setting-label-row"><label>AI 气泡透明度</label><span class="setting-val">{{ Math.round(chatTheme.aiBubbleOpacity * 100) }}%</span></div>
              <input type="range" v-model.number="chatTheme.aiBubbleOpacity" min="0.1" max="1" step="0.05" @change="saveChatTheme">
            </div>
            <div class="setting-item-color"><label>我的气泡颜色</label><input type="color" v-model="chatTheme.userBgColor" @change="saveChatTheme"></div>
            <div class="setting-item-color"><label>我的文字颜色</label><input type="color" v-model="chatTheme.userTextColor" @change="saveChatTheme"></div>
            <div class="setting-item">
              <div class="setting-label-row"><label>我的气泡透明度</label><span class="setting-val">{{ Math.round(chatTheme.userBubbleOpacity * 100) }}%</span></div>
              <input type="range" v-model.number="chatTheme.userBubbleOpacity" min="0.1" max="1" step="0.05" @change="saveChatTheme">
            </div>
            <div class="setting-item">
              <div class="setting-label-row"><label>消息间距</label><span class="setting-val">{{ chatTheme.msgGap }} px</span></div>
              <input type="range" v-model.number="chatTheme.msgGap" min="0" max="20" @change="saveChatTheme">
            </div>
            <div class="setting-item-toggle">
              <label>气泡投影</label>
              <button class="toggle-btn" :class="{ 'on': chatTheme.bubbleShadow }" @click="chatTheme.bubbleShadow = !chatTheme.bubbleShadow; saveChatTheme()">
                <span class="toggle-knob"></span>
              </button>
            </div>
          </div>

          <!-- ── 头像与布局 ── -->
          <div class="setting-group">
            <div class="group-title">布局</div>
            <div class="setting-item">
              <div class="setting-item-color"><label>侧边栏文字颜色</label><input type="color" v-model="chatTheme.sidebarTextColor" @change="saveChatTheme"></div>
              <div class="setting-label-row"><label>侧边栏宽度</label><span class="setting-val">{{ chatTheme.sidebarWidth }} px</span></div>
              <input type="range" v-model.number="chatTheme.sidebarWidth" min="160" max="320" @change="saveChatTheme">
            </div>
            <div class="setting-item">
              <div class="setting-label-row"><label>输入框圆角</label><span class="setting-val">{{ chatTheme.inputRadius }} px</span></div>
              <input type="range" v-model.number="chatTheme.inputRadius" min="4" max="28" @change="saveChatTheme">
            </div>
          </div>

          <!-- ── 顶部导航栏 ── -->
          <div class="setting-group">
            <div class="group-title">🔝 顶部导航栏</div>
            <div class="setting-item">
              <label>背景模式</label>
              <select v-model="chatTheme.headerBg" @change="saveChatTheme" class="theme-select">
                <option value="auto">跟随背景色 (自动)</option>
                <option value="custom">自定义颜色</option>
              </select>
            </div>
            <div class="setting-item-color" v-if="chatTheme.headerBg === 'custom'">
              <label>顶栏自定义颜色</label>
              <input type="color" v-model="chatTheme.headerBgColor" @change="saveChatTheme">
            </div>
            <div class="setting-item-toggle">
              <label>毛玻璃模糊效果</label>
              <button class="toggle-btn" :class="{ 'on': chatTheme.headerBlur }" @click="chatTheme.headerBlur = !chatTheme.headerBlur; saveChatTheme()">
                <span class="toggle-knob"></span>
              </button>
            </div>
          </div>

          <!-- ── 背景空间 ── -->
          <div class="setting-group">
            <div class="group-title">🖼️ 背景空间</div>
            <div class="setting-item-color"><label>底色</label><input type="color" v-model="chatTheme.bgColor" @change="saveChatTheme"></div>
            <div class="setting-item">
              <label>背景图片 (支持本地或网络)</label>
              <div class="bg-input-wrapper">
                <input type="file" ref="fileInputRef" accept="image/*" class="hidden-input" @change="handleImageUpload">
                <button class="upload-btn" @click="triggerUpload">📂 本地</button>
                <div v-if="chatTheme.bgImage && chatTheme.bgImage.startsWith('data:image')" class="local-img-badge">
                  <span class="badge-text">🌄 已应用本地图片</span>
                  <button class="badge-close" @click="clearLocalImage">×</button>
                </div>
                <input v-else type="text" class="theme-input url-input" placeholder="或输入 http 链接..." v-model="chatTheme.bgImage" @change="saveChatTheme">
              </div>
            </div>
            <template v-if="chatTheme.bgImage">
              <div class="setting-item">
                <label>排版拉伸模式</label>
                <select v-model="chatTheme.bgSize" @change="saveChatTheme" class="theme-select">
                  <option value="cover">等比填充 (自动裁剪边缘)</option>
                  <option value="contain">等比适应 (留出黑边)</option>
                  <option value="100% 100%">强行铺满 (可能变形)</option>
                </select>
              </div>
              <div class="setting-item">
                <label>图片对齐基准</label>
                <select v-model="chatTheme.bgPosition" @change="saveChatTheme" class="theme-select">
                  <option value="center">居中对齐</option>
                  <option value="top">靠上对齐</option>
                  <option value="bottom">靠下对齐</option>
                </select>
              </div>
              <div class="setting-item">
                <div class="setting-label-row"><label>高斯模糊度</label><span class="setting-val">{{ chatTheme.bgBlur }} px</span></div>
                <input type="range" v-model.number="chatTheme.bgBlur" min="0" max="30" @change="saveChatTheme">
              </div>
              <div class="setting-item">
                <div class="setting-label-row"><label>图片显影度</label><span class="setting-val">{{ Math.round(chatTheme.bgOpacity * 100) }}%</span></div>
                <input type="range" v-model.number="chatTheme.bgOpacity" min="0.05" max="1" step="0.05" @change="saveChatTheme">
              </div>
            </template>
          </div>

          <button class="reset-btn" @click="resetChatTheme">↺ 恢复默认外观</button>
        </div>
      </div>
    </div>

    <Teleport to="body">
    <div v-if="isMcpPanelOpen" class="theme-overlay" @click.self="isMcpPanelOpen = false"
         :style="{'--chat-bg': chatTheme.bgColor, '--user-bg': chatTheme.userBgColor, '--panel-text-color': chatTheme.panelTextColor, '--font-family': chatTheme.fontFamily}">
      <div class="theme-panel mcp-panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <span class="panel-icon">🧩</span>
            <h3>本地 MCP 技能节点</h3>
          </div>
          <button class="close-btn" @click="isMcpPanelOpen = false">×</button>
        </div>
        
        <div class="panel-body">
          <div class="setting-group mcp-card" v-for="(config, index) in mcpConfigs" :key="index" :class="{'is-disabled': !config.enabled}" style="padding: 10px 14px;">
            
            <div class="mcp-card-header" style="margin-bottom: 0; padding-bottom: 0; border-bottom: none; display: flex; align-items: center; gap: 8px;">
              <input type="text" v-model="config.name" class="theme-input mcp-name-input" placeholder="插件名称" @change="saveMcpConfigs" style="flex: 1;">
              
              <button @click="config.isExpanded = !config.isExpanded" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">
                <span :style="{ transform: config.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }">▼</span>
              </button>

              <div class="setting-item-toggle">
                <button class="toggle-btn" :class="{ 'on': config.enabled }" @click="config.enabled = !config.enabled; saveMcpConfigs()">
                  <span class="toggle-knob"></span>
                </button>
              </div>
            </div>
            
            <div v-show="config.isExpanded" style="margin-top: 12px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px;">
              <div class="mcp-card-body">
                <div class="setting-item">
                  <label>执行器 (如 node, python, npx.cmd)</label>
                  <input type="text" v-model="config.command" class="theme-input" @change="saveMcpConfigs">
                </div>
                <div class="setting-item">
                  <label>运行参数 (用英文逗号分隔)</label>
                  <input type="text" :value="config.args.join(', ')" 
                         @change="(e) => { config.args = (e.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean); saveMcpConfigs(); }" 
                         class="theme-input" placeholder="例如: D:/scripts/plugin.js">
                </div>
              </div>
              
              <div class="mcp-card-body" style="margin-top: 8px; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 10px;">
                <div class="setting-item">
                  <label>环境变量 (一行一个，KEY=VALUE)</label>
                  <textarea class="theme-input" 
                            style="min-height: 50px; font-family: 'JetBrains Mono', monospace; font-size: 11px; white-space: pre;"
                            placeholder="例如：API_KEY=sk-xxxx"
                            :value="getEnvString(config.env)"
                            @change="(e) => updateEnvFromString(config, (e.target as HTMLTextAreaElement).value)"></textarea>
                </div>
              </div>
              
              <button class="mcp-delete-btn" @click="removeMcp(index)">删除插件</button>
            </div>
          </div>

          <button class="new-chat-btn add-mcp-btn" @click="addNewMcp" style="justify-content: center; margin-top: 10px;">
            <span class="icon-wrap" v-html="UI_PLUS"></span>
            <span>添加本地 MCP 插件</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="isSkillPanelOpen" class="theme-overlay" @click.self="isSkillPanelOpen = false"
         :style="{'--chat-bg': chatTheme.bgColor, '--user-bg': chatTheme.userBgColor, '--panel-text-color': chatTheme.panelTextColor, '--font-family': chatTheme.fontFamily}">
      <div class="theme-panel mcp-panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <span class="panel-icon">💡</span>
            <h3>Agent Skill SOP</h3>
          </div>
          <button class="close-btn" @click="isSkillPanelOpen = false">×</button>
        </div>
        
        <div class="panel-body">
          <p style="color: #888; font-size: 11px; margin-bottom: 10px; line-height: 1.4;">
            在这里编写 Yuki 的“行为说明书”。开启后，对应规则将作为最高优先级指令注入她的潜意识。
          </p>

          <div class="setting-group mcp-card" v-for="(skill, index) in agentSkills" :key="index" :class="{'is-disabled': !skill.enabled}" style="padding: 10px 14px;">
            
            <div class="mcp-card-header" style="margin-bottom: 0; padding-bottom: 0; border-bottom: none; display: flex; align-items: center; gap: 8px;">
              <input type="text" v-model="skill.name" class="theme-input mcp-name-input" placeholder="Skill 名称" @change="saveSkills" style="flex: 1;">
              
              <button @click="skill.isExpanded = !skill.isExpanded" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">
                <span :style="{ transform: skill.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }">▼</span>
              </button>

              <div class="setting-item-toggle">
                <button class="toggle-btn" :class="{ 'on': skill.enabled }" @click="skill.enabled = !skill.enabled; saveSkills()">
                  <span class="toggle-knob"></span>
                </button>
              </div>
            </div>
            
            <div v-show="skill.isExpanded" style="margin-top: 12px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px;">
              <div class="mcp-card-body">
                <div class="setting-item">
                  <label>SOP 规则 / 提示词</label>
                  <textarea class="theme-input" 
                            style="min-height: 120px; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.5;"
                            v-model="skill.content" 
                            placeholder="例如：当你被要求查阅文件时，必须输出三段式的 Markdown 报告..."
                            @change="saveSkills"></textarea>
                </div>
              </div>
              <button class="mcp-delete-btn" @click="agentSkills.splice(index, 1); saveSkills()">删除 Skill</button>
            </div>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button class="new-chat-btn add-mcp-btn" @click="agentSkills.push({ name: '新 Skill', content: '', enabled: false, isExpanded: true }); saveSkills()" style="flex: 1; justify-content: center;">
              <span class="icon-wrap" v-html="UI_PLUS"></span>
              <span>手动建空插槽</span>
            </button>
            
            <button class="new-chat-btn add-mcp-btn" @click="triggerSkillImport" style="flex: 1; justify-content: center;">
              <span>📁 导入 .md 文件</span>
            </button>
            
            <input type="file" ref="skillFileInputRef" accept=".md,.txt" style="display: none" @change="handleImportSkill">
          </div>
        </div>
      </div>
    </div>

    </Teleport>

    </Teleport>
  <transition name="fade">
      <div v-if="previewImageUrl" class="image-preview-overlay" @click="closePreview">
        <button class="preview-close-btn" @click="closePreview">✕</button>
        <img :src="previewImageUrl" class="preview-img-large" @click.stop />
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* ====================================================
   基础布局
   ==================================================== */
.chat-app {
  position: relative;
  height: 100vh;
  width: 100vw;
  background-color: var(--chat-bg);
  font-family: var(--font-family);
  color: var(--text-color);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.chat-bg-layer {
  position: absolute;
  top: -10px; left: -10px; right: -10px; bottom: -10px;
  background-size: var(--bg-size);
  background-position: var(--bg-position);
  background-repeat: no-repeat;
  z-index: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;
  /* GPU 层提升，避免影响布局重绘 */
  will-change: opacity;
}

.layout-wrapper {
  display: flex;
  height: 100vh;
  position: relative;
  z-index: 1;
}

/* ====================================================
   侧边栏 — GPU 加速动画，避免 margin 触发重排
   ==================================================== */
.sidebar {
  width: var(--sidebar-width);
  background: color-mix(in srgb, var(--chat-bg) 94%, #000);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  /* 🔧 修复核心：换回 margin-left，真正释放/挤占布局空间 */
  margin-left: calc(-1 * var(--sidebar-width));
  transition: margin-left 0.26s cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar.is-open {
  margin-left: 0;
}

/* 侧边栏头部 */
.sidebar-header {
  padding: 10px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}
.new-chat-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-color);
  padding: 8px 12px;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  font-size: 13px;
  font-family: inherit;
  font-weight: 500;
}
.new-chat-btn:hover {
  background: color-mix(in srgb, var(--user-bg) 18%, transparent);
  border-color: color-mix(in srgb, var(--user-bg) 40%, transparent);
  color: #fff;
}
.new-chat-btn .icon-wrap { width: 15px; height: 15px; color: var(--user-bg); flex-shrink: 0; }

/* 会话列表 */
.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.session-list::-webkit-scrollbar { width: 3px; }
.session-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }

.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.12s;
  position: relative;
}
.session-item:hover { background: rgba(255, 255, 255, 0.07); }
.session-item.active {
  background: color-mix(in srgb, var(--user-bg) 16%, transparent);
  border-left: 2px solid var(--user-bg);
  padding-left: 6px;
}

.s-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--user-bg);
  opacity: 0.7;
}
.session-item.active .s-icon-wrap { opacity: 1; }
.s-icon-wrap .icon-wrap { width: 14px; height: 14px; }

.s-body {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
}
.s-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  opacity: 0.8;
}
.session-item.active .s-title { opacity: 1; color: color-mix(in srgb, var(--user-bg) 85%, #fff); }
.s-time {
  font-size: 10px;
  color: var(--text-color);
  opacity: 0.3;
  flex-shrink: 0;
}
.session-item.active .s-time { opacity: 0.6; color: var(--user-bg); }

.s-del-btn {
  background: transparent;
  border: none;
  color: var(--text-color);
  font-size: 15px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  padding: 0 2px;
  line-height: 1;
  flex-shrink: 0;
}
.session-item:hover .s-del-btn { opacity: 0.4; }
.s-del-btn:hover { opacity: 1 !important; color: #ef4444; }


/* ====================================================
   主区域
   ==================================================== */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
  /* 侧边栏用 transform，主区不需要跟着移动，overflow:hidden 截断即可 */
}

/* 顶部栏 */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  height: 52px;
  background: color-mix(in srgb, var(--chat-bg) 82%, transparent);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: v-bind("chatTheme.headerBlur ? 'blur(16px)' : 'none'");
  -webkit-backdrop-filter: v-bind("chatTheme.headerBlur ? 'blur(16px)' : 'none'");
  z-index: 10;
  flex-shrink: 0;
}
.header-left { display: flex; align-items: center; gap: 6px; }
.toggle-sidebar-btn {
  width: 34px;
  height: 34px;
  background: transparent;
  border: none;
  color: var(--text-color);
  opacity: 0.55;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s, opacity 0.15s;
  display: flex;
  justify-content: center;
  align-items: center;
}
.toggle-sidebar-btn:hover { background: rgba(255,255,255,0.08); opacity: 1; }
.toggle-sidebar-btn .icon-wrap { width: 20px; height: 20px; }

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
.status-badge {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 500;
}
.status-badge.thinking {
  color: var(--user-bg);
  background: color-mix(in srgb, var(--user-bg) 10%, transparent);
}
.status-badge.speaking {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.typing-dots {
  display: inline-flex;
  gap: 3px;
  align-items: center;
}
.typing-dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--user-bg);
  animation: typing-bounce 1.2s infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

.header-right { display: flex; align-items: center; gap: 2px; }
.header-icon-btn {
  width: 34px;
  height: 34px;
  background: transparent;
  border: none;
  color: var(--text-color);
  opacity: 0.5;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.header-icon-btn .icon-wrap { width: 18px; height: 18px; }
.header-icon-btn:hover { background: rgba(255,255,255,0.08); opacity: 1; }
.danger-btn:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1) !important; }


/* ====================================================
   消息区
   ==================================================== */
.chat-scroll-area {
  flex: 1;
  overflow-y: auto;
  /* 收窄内边距，消息区不要太宽 */
  padding: 20px 8%;
  display: flex;
  flex-direction: column;
  gap: var(--msg-gap);
}
.chat-scroll-area::-webkit-scrollbar { width: 4px; }
.chat-scroll-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
.chat-scroll-area::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.16); }

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: -8%;
}
.empty-avatar {
  width: 64px;
  height: 64px;
  margin-bottom: 6px;
}
.empty-name { font-size: 17px; font-weight: 700; color: #fff; margin: 0; }
.empty-tip { font-size: 13px; color: var(--text-color); opacity: 0.35; margin: 0; }

/* 消息行 */
.message-row {
  display: flex;
  align-items: flex-end;
  gap: 7px;
  width: 100%;
  animation: msg-in 0.18s ease;
}
.message-row.user { justify-content: flex-end; }

.avatar {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
}
.ai-avatar {
  background: color-mix(in srgb, var(--ai-bg) 80%, var(--user-bg) 20%);
  color: var(--text-color);
  border: 1px solid rgba(255,255,255,0.08);
}
.user-avatar {
  background: var(--user-bg);
  color: #fff;
  font-size: 10px;
}

.bubble-container {
  display: flex;
  flex-direction: column;
  /* 气泡最大宽度收窄 */
  max-width: 65%;
  gap: 3px;
}
.message-row.user .bubble-container { align-items: flex-end; }
.message-row.assistant .bubble-container { align-items: flex-start; }

.message-bubble {
  width: fit-content;
  padding: 9px 13px;
  font-size: var(--font-size);
  line-height: var(--line-height);
  border-radius: var(--bubble-radius);
  word-break: break-word;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  user-select: text;
  -webkit-user-select: text;
}
.assistant .message-bubble {
  background: var(--ai-bg);
  color: var(--text-color);
  border-bottom-left-radius: 4px;
  border: 1px solid rgba(255,255,255,0.04);
}
.user .message-bubble {
  background: var(--user-bg);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.text-part { white-space: pre-wrap; }

.bubble-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.15s;
  height: 18px;
}
.message-row:hover .bubble-meta { opacity: 1; }
.msg-time { font-size: 10px; color: var(--text-color); opacity: 0.3; }
.copy-btn {
  background: transparent;
  border: none;
  color: var(--text-color);
  opacity: 0.4;
  font-size: 11px;
  cursor: pointer;
  padding: 1px 5px;
  border-radius: 5px;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 3px;
}
.copy-btn:hover { opacity: 1; background: rgba(255,255,255,0.07); }
.copy-btn.is-copied { color: #10b981; opacity: 1; }
.copy-btn .icon-wrap { width: 11px; height: 11px; }

/* 思考动画 */
.thinking-bubble {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 11px 14px !important;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--user-bg) 70%, var(--text-color));
  animation: thinking 1.4s infinite;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

/* ====================================================
   代码块
   ==================================================== */
.code-block-wrapper {
  margin: 7px 0;
  border-radius: 9px;
  background: rgba(10, 12, 16, 0.9);
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.07);
}
.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0,0,0,0.35);
  padding: 4px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.code-lang {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 10px;
  color: var(--user-bg);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.75;
}
.code-copy-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  background: transparent;
  border: none;
  color: #6b7280;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 5px;
  border-radius: 4px;
  transition: all 0.15s;
  font-family: inherit;
}
.code-copy-btn:hover { color: #d1d5db; background: rgba(255,255,255,0.07); }
.code-copy-btn .icon-wrap { width: 11px; height: 11px; }
.code-content { padding: 10px 12px; overflow-x: auto; user-select: text; -webkit-user-select: text; }
.code-content::-webkit-scrollbar { height: 3px; }
.code-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
.code-content pre { margin: 0; padding: 0; }
.code-content code {
  font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
  font-size: 12.5px;
  line-height: 1.6;
  color: #c9d1d9;
}

/* ====================================================
   输入区
   ==================================================== */
.chat-input-area {
  padding: 10px 8% 8px;
  flex-shrink: 0;
}
.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: color-mix(in srgb, var(--chat-bg) 88%, #fff 6%);
  border-radius: var(--input-radius);
  padding: 7px 7px 7px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 2px 10px rgba(0,0,0,0.12);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input-wrapper:focus-within {
  border-color: color-mix(in srgb, var(--user-bg) 40%, transparent);
  box-shadow: 0 3px 16px rgba(0,0,0,0.18);
}
textarea {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-color);
  font-size: var(--font-size);
  font-family: inherit;
  line-height: 1.5;
  resize: none;
  min-height: 22px;
  max-height: 140px;
  outline: none;
  padding: 5px 0;
}
textarea::placeholder { color: var(--text-color); opacity: 0.28; }
.input-actions { display: flex; align-items: center; padding-bottom: 1px; flex-shrink: 0; }
.send-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.07);
  color: var(--text-color);
  opacity: 0.35;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
}
.send-btn .icon-wrap { width: 17px; height: 17px; }
.send-btn.is-active {
  background: var(--user-bg);
  color: #fff;
  opacity: 1;
  box-shadow: 0 3px 10px color-mix(in srgb, var(--user-bg) 40%, transparent);
}
.send-btn.is-active:hover { transform: scale(1.08); }
.stop-tts-btn { background: #ef4444 !important; color: white !important; opacity: 1 !important; font-size: 13px; }
.input-hint {
  text-align: center;
  font-size: 10px;
  color: var(--text-color);
  opacity: 0.18;
  margin: 4px 0 0;
  letter-spacing: 0.03em;
}

/* ====================================================
   主题设置弹窗 — 全新样式
   ==================================================== */
.theme-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  justify-content: flex-end; /* 从右侧滑出 */
  align-items: stretch;
  z-index: 9999;
  animation: overlay-in 0.18s ease;
}
.theme-panel {
  width: 320px;
  height: 100%;
  background: color-mix(in srgb, var(--chat-bg) 97%, #fff 2%);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: -20px 0 60px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text-color);
  animation: panel-slide-in 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(0,0,0,0.15);
  flex-shrink: 0;
}
.panel-title-group { display: flex; align-items: center; gap: 9px; }
.panel-icon { font-size: 18px; }
.panel-header h3 { margin: 0; font-size: 15px; color: #fff; font-weight: 700; letter-spacing: 0.01em; }
.close-btn {
  width: 28px;
  height: 28px;
  background: rgba(255,255,255,0.06);
  border: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  line-height: 1;
}
.close-btn:hover { background: rgba(239,68,68,0.15); color: #ef4444; }

.panel-body {
  flex: 1;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}
.panel-body::-webkit-scrollbar { width: 3px; }
.panel-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

/* 分组 */
.setting-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(255,255,255,0.025);
  padding: 12px 13px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05);
}
.group-title {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--user-bg);
  text-transform: uppercase;
  letter-spacing: 0.09em;
  opacity: 0.85;
  padding-bottom: 7px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  margin-bottom: 2px;
}

/* 普通行 */
.setting-item { display: flex; flex-direction: column; gap: 6px; }
.setting-item label { font-size: 12px; color: rgba(255,255,255,0.5); }
.setting-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
}
.setting-val {
  color: var(--user-bg);
  font-weight: 700;
  font-size: 10px;
  background: color-mix(in srgb, var(--user-bg) 12%, transparent);
  padding: 1px 7px;
  border-radius: 6px;
}

/* 颜色行 */
.setting-item-color {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  background: rgba(0,0,0,0.18);
  padding: 8px 11px;
  border-radius: 9px;
  border: 1px solid rgba(255,255,255,0.04);
}

/* Toggle 开关行 */
.setting-item-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  background: rgba(0,0,0,0.18);
  padding: 8px 11px;
  border-radius: 9px;
  border: 1px solid rgba(255,255,255,0.04);
}
.toggle-btn {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  border: none;
  background: rgba(255,255,255,0.12);
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}
.toggle-btn.on { background: var(--user-bg); }
.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toggle-btn.on .toggle-knob { transform: translateX(16px); }

/* select & input */
.theme-select {
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.09);
  color: #ddd;
  padding: 7px 10px;
  border-radius: 8px;
  outline: none;
  font-family: inherit;
  font-size: 12px;
  transition: border-color 0.15s;
  width: 100%;
}
.theme-select:focus { border-color: var(--user-bg); }
.theme-input {
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.09);
  color: #ddd;
  padding: 7px 10px;
  border-radius: 8px;
  outline: none;
  font-family: inherit;
  font-size: 12px;
  transition: border-color 0.15s;
}
.theme-input:focus { border-color: var(--user-bg); }
.bg-input-wrapper { display: flex; align-items: center; gap: 6px; }
.hidden-input { display: none; }
.upload-btn {
  flex-shrink: 0;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  color: #ccc;
  padding: 7px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 12px;
  font-family: inherit;
  white-space: nowrap;
}
.upload-btn:hover { background: rgba(255,255,255,0.13); }
.url-input { flex: 1; min-width: 0; }
.local-img-badge {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: color-mix(in srgb, var(--user-bg) 13%, rgba(0,0,0,0.3));
  border: 1px solid color-mix(in srgb, var(--user-bg) 35%, transparent);
  padding: 7px 10px;
  border-radius: 8px;
}
.badge-text { font-size: 11px; color: #fff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge-close { background: transparent; border: none; color: #ff5e5e; font-size: 14px; cursor: pointer; padding: 0 3px; }
.badge-close:hover { transform: scale(1.2); }

/* range slider */
input[type=range] {
  -webkit-appearance: none;
  width: 100%;
  background: rgba(255,255,255,0.1);
  height: 4px;
  border-radius: 2px;
  outline: none;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--user-bg);
  cursor: pointer;
  box-shadow: 0 1px 5px rgba(0,0,0,0.35);
  transition: transform 0.15s;
}
input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.15); }

/* color input */
input[type="color"] {
  -webkit-appearance: none;
  appearance: none;
  border: none;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  padding: 0;
  cursor: pointer;
  background: transparent;
}
input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
input[type="color"]::-webkit-color-swatch { border: 2px solid rgba(255,255,255,0.18); border-radius: 6px; }

/* reset btn */
.reset-btn {
  padding: 10px;
  border-radius: 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.35);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 12px;
  font-family: inherit;
  font-weight: 600;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}
.reset-btn:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.28); }

/* ====================================================
   独立色彩变量映射覆盖 (文本颜色细分)
   ==================================================== */

/* 1. 侧边栏专属 */
.new-chat-btn, .session-item, .s-title, .s-time, .s-del-btn {
  color: var(--sidebar-text-color) !important;
}
.new-chat-btn .icon-wrap, .s-icon-wrap {
  color: var(--sidebar-text-color); 
}

/* 2. 气泡与头像专属 */
.assistant .message-bubble { 
  /* 🌟 核心：使用 color-mix 只降低背景颜色的透明度，文字不受影响！ */
  background: color-mix(in srgb, var(--ai-bg) var(--ai-opacity, 100%), transparent);
  color: var(--ai-text-color) !important; 
  border-bottom-left-radius: 4px;
  border: 1px solid rgba(255,255,255,0.04);
}
.user .message-bubble { 
  /* 🌟 核心：同理处理用户的背景 */
  background: color-mix(in srgb, var(--user-bg) var(--user-opacity, 100%), transparent);
  color: var(--user-text-color) !important; 
  border-bottom-right-radius: 4px;
}
.ai-avatar {
  color: var(--ai-text-color) !important;
}
.user-avatar {
  color: var(--user-text-color) !important;
}
/* 强行改变用户气泡内纯文字的颜色，无视其他父级 */
.user .message-bubble .text-part {
  color: var(--user-text-color);
}

/* 3. 主题外观面板专属 */
.theme-panel { 
  color: var(--panel-text-color) !important; 
}
.panel-header h3 { 
  color: var(--panel-text-color) !important; 
}
/* 面板内次要文字(标签)使用颜色混合，自动降半透明度 */
.setting-item label, .setting-label-row, .setting-item-color, .setting-item-toggle { 
  color: color-mix(in srgb, var(--panel-text-color) 70%, transparent) !important; 
}
.close-btn { 
  color: color-mix(in srgb, var(--panel-text-color) 60%, transparent) !important; 
}
.theme-select, .theme-input { 
  color: var(--panel-text-color) !important; 
}
.reset-btn { 
  color: color-mix(in srgb, var(--panel-text-color) 50%, transparent) !important; 
}

/* 附件按钮样式 */
.attach-btn {
  margin-right: 4px; /* 和发送按钮拉开一点点间距 */
  opacity: 0.6;
}
.attach-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--primary, #4facfe);
  opacity: 1;
}

/* ====================================================
   🌟 流媒体渲染专属样式 (图片 & 视频)
   ==================================================== */
.media-wrapper {
  margin: 6px 0;
  border-radius: 0; /* 🔧 核心修改：改为直角 */
  overflow: hidden;
  max-width: 100%;
  display: flex;
  background: rgba(0, 0, 0, 0.15); /* 给透明背景图片加一个极淡的底色 */
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.chat-media-img, .chat-media-video {
  max-width: 100%;
  max-height: 280px; /* 限制最大高度，防止竖屏长图刷屏 */
  object-fit: contain;
  border-radius: 0; /* 🔧 核心修改：改为直角 */
  cursor: pointer;
  transition: opacity 0.2s;
  display: block;
}

.chat-media-img:hover {
  opacity: 0.9;
}

/* 如果是用户的气泡，右侧对齐 */
.message-row.user .media-wrapper {
  margin-left: auto;
}

/* ====================================================
   🌟 图片全屏预览组件样式
   ==================================================== */
.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px); /* 绝美的毛玻璃背景 */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999; /* 确保它在最顶层 */
  cursor: zoom-out; /* 提示用户点击可以缩小/关闭 */
}

.preview-img-large {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px; /* 放大时给一点微小的圆角更精致 */
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  cursor: default;
}

.preview-close-btn {
  position: absolute;
  top: 24px;
  right: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10000;
}

.preview-close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

/* Vue 的淡入淡出过渡动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  margin-top: auto; /* 关键：推到底部 */
}

.footer-item-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  color: var(--sidebar-text-color);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.footer-item-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--user-bg);
}

.mcp-badge {
  margin-left: auto;
  background: var(--user-bg);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: bold;
}

/* ====================================================
   🌟 MCP 侧边栏入口 & 管理面板样式
   ==================================================== */
.sidebar-footer {
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  margin-top: auto; /* 关键：把入口推到最底部 */
}

.footer-item-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  color: var(--sidebar-text-color);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.footer-item-btn:hover {
  background: color-mix(in srgb, var(--user-bg) 15%, transparent);
  border-color: color-mix(in srgb, var(--user-bg) 50%, transparent);
}

.mcp-icon { font-size: 16px; }

.mcp-badge {
  margin-left: auto;
  background: var(--user-bg);
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 700;
}

/* 面板内的卡片样式 */
.mcp-panel { width: 340px; }

.mcp-card {
  padding: 14px;
  transition: opacity 0.3s;
}
.mcp-card.is-disabled {
  opacity: 0.5;
  filter: grayscale(0.8);
}

.mcp-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 1px dashed rgba(255,255,255,0.1);
  padding-bottom: 10px;
}

.mcp-name-input {
  font-size: 14px;
  font-weight: 700;
  color: var(--user-bg) !important;
  background: transparent;
  border: none;
  padding: 0;
  width: 70%;
}
.mcp-name-input:focus { border: none; outline: none; background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; }

.mcp-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mcp-delete-btn {
  background: transparent;
  border: none;
  color: #ef4444;
  font-size: 11px;
  cursor: pointer;
  margin-top: 12px;
  text-align: right;
  width: 100%;
  opacity: 0.6;
}
.mcp-delete-btn:hover { opacity: 1; text-decoration: underline; }

.add-mcp-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.2);
}
.add-mcp-btn:hover { border-color: var(--user-bg); background: color-mix(in srgb, var(--user-bg) 10%, transparent); }

/* ====================================================
   动画
   ==================================================== */
@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}

@keyframes thinking {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
  40% { transform: scale(1.15); opacity: 1; }
}

@keyframes msg-in {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes panel-slide-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes pulse {
  0%, 100% { transform: scale(0.8); opacity: 0.4; }
  50% { transform: scale(1.2); opacity: 1; }
}
</style>
