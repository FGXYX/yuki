<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { initDB, clearHistoryDB } from '@/core/Database'
import { ConfigStore } from '@/core/ConfigStore'
import { useChat } from '@/composables/useChat'
import { useTTS } from '@/composables/useTTS'
import { open } from '@tauri-apps/plugin-dialog'
import { convertFileSrc } from '@tauri-apps/api/core'

// ── 子组件 ──
import SessionSidebar from './chat/SessionSidebar.vue'
import MessageList from './chat/MessageList.vue'
import ChatInput from './chat/ChatInput.vue'
import ThemePanel from './chat/ThemePanel.vue'
import McpPanel from './chat/McpPanel.vue'
import SkillPanel from './chat/SkillPanel.vue'

// ── 常量 ──
const UI_MENU = '<svg viewBox="0 0 256 256"><line x1="40" y1="128" x2="216" y2="128" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><line x1="40" y1="64" x2="216" y2="64" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><line x1="40" y1="192" x2="216" y2="192" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line></svg>'
const UI_PALETTE = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M128,40A88,88,0,1,0,216,128c0-22-16-40-40-40H160a24,24,0,0,1,24-24C184,52.9,157.9,40,128,40ZM84,104a12,12,0,1,1-12-12A12,12,0,0,1,84,104Zm44-28a12,12,0,1,1-12-12A12,12,0,0,1,128,76Zm44,28a12,12,0,1,1-12-12A12,12,0,0,1,172,104Z"></path></svg>'
const UI_TRASH = '<svg viewBox="0 0 256 256"><line x1="216" y1="56" x2="40" y2="56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><line x1="104" y1="104" x2="104" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><line x1="152" y1="104" x2="152" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M200,56V208a8,8,0,0,1-8-8H64a8,8,0,0,1-8-8V56"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M168,56V40a16,16,0,0,0-16-16H104A16,16,0,0,0,88,40V56"></path></svg>'

// ── 皮肤状态 (chat theme) ──
const isThemePanelOpen = ref(false)
const defaultTheme = {
  fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, lineHeight: 1.5,
  // 全局文字：输入框、顶栏等位置
  textColor: '#ececec',
  // 面板文字：弹窗面板内的文字
  panelTextColor: '#ececec',
  // 侧边栏文字
  sidebarTextColor: '#ececec',
  // AI 气泡文字
  aiTextColor: '#ececec',
  // 用户（我）的气泡文字
  userTextColor: '#ffffff',
  bubbleRadius: 16, aiBgColor: '#242528', userBgColor: '#4facfe',
  aiBubbleOpacity: 1.0, userBubbleOpacity: 1.0, bubbleShadow: true, msgGap: 4,
  sidebarWidth: 220, sidebarOpacity: 0.8, sidebarBlur: true,
  inputRadius: 20, inputOpacity: 0.8, inputBlur: true,
  bgColor: '#141517', bgImage: '', bgSize: 'cover', bgPosition: 'center', bgBlur: 0, bgOpacity: 0.15,
  headerBg: 'auto', headerBgColor: '#141517', headerOpacity: 0.8, headerBlur: true,
}
const chatTheme = ref({ ...defaultTheme })

// 当主题变化时，同步到 CSS 变量（全局生效，包括 Teleport 出去的弹窗）
const applyTheme = (theme: any) => {
  const root = document.documentElement
  root.style.setProperty('--text-color', theme.textColor)
  root.style.setProperty('--panel-text-color', theme.panelTextColor)
  root.style.setProperty('--sidebar-text-color', theme.sidebarTextColor)
  root.style.setProperty('--ai-text-color', theme.aiTextColor)
  root.style.setProperty('--user-text-color', theme.userTextColor)
  root.style.setProperty('--chat-bg', theme.bgColor)
  root.style.setProperty('--ai-bg', theme.aiBgColor)
  root.style.setProperty('--user-bg', theme.userBgColor)
  root.style.setProperty('--font-family', theme.fontFamily)
  root.style.setProperty('--font-size', theme.fontSize + 'px')
  root.style.setProperty('--line-height', String(theme.lineHeight))
  root.style.setProperty('--bubble-radius', theme.bubbleRadius + 'px')
  root.style.setProperty('--bg-size', theme.bgSize)
  root.style.setProperty('--bg-position', theme.bgPosition)
  root.style.setProperty('--sidebar-width', theme.sidebarWidth + 'px')
  root.style.setProperty('--input-radius', theme.inputRadius + 'px')
  root.style.setProperty('--msg-gap', theme.msgGap + 'px')
  root.style.setProperty('--input-opacity', String(theme.inputOpacity))
  root.style.setProperty('--input-blur', theme.inputBlur ? 'blur(12px)' : 'none')
  root.style.setProperty('--header-opacity', String(theme.headerOpacity))
  root.style.setProperty('--header-blur', theme.headerBlur ? 'blur(16px)' : 'none')
  root.style.setProperty('--sidebar-opacity', String(theme.sidebarOpacity))
  root.style.setProperty('--sidebar-blur', theme.sidebarBlur ? 'blur(16px)' : 'none')
  root.style.setProperty('--ai-opacity', Math.round(theme.aiBubbleOpacity * 100) + '%')
  root.style.setProperty('--user-opacity', Math.round(theme.userBubbleOpacity * 100) + '%')
}
watch(chatTheme, (val) => applyTheme(val), { deep: true, immediate: true })

const loadChatTheme = async () => {
  const saved = await ConfigStore.get<any>('yuki_chat_theme', null)
  if (saved) {
    chatTheme.value = { ...defaultTheme, ...saved }
    applyTheme(chatTheme.value)
  }
}
const saveChatTheme = async () => { await ConfigStore.set('yuki_chat_theme', chatTheme.value) }

// ── 中央状态 ──
const { stopTTS, isPlayingTTS } = useTTS()
const {
  chatInputText: inputText, isSpeaking: isThinking, chatHistory,
  sendMessage: coreSendMessage, clearChatHistory, loadChatHistory,
  mcpConfigs, saveMcpConfigs, agentSkills, saveSkills
} = useChat()

// ── 侧边栏 & 会话管理 ──
const isSidebarOpen = ref(true)
const sessions = ref<{ id: string; title: string; updatedAt: number }[]>([])
const activeSessionId = ref('default')

const loadSessions = async () => {
  const savedSessions = await ConfigStore.get<any[]>('yuki_chat_sessions', [{ id: 'default', title: '新建对话', updatedAt: Date.now() }])
  const active = await ConfigStore.get<string>('yuki_active_session', 'default')
  sessions.value = savedSessions.sort((a, b) => b.updatedAt - a.updatedAt)
  activeSessionId.value = active
}
const saveSessions = async () => {
  await ConfigStore.set('yuki_chat_sessions', sessions.value)
  await ConfigStore.set('yuki_active_session', activeSessionId.value)
}
const createNewSession = async () => {
  const id = 'session_' + Date.now()
  sessions.value.unshift({ id, title: '新建对话', updatedAt: Date.now() })
  activeSessionId.value = id
  await saveSessions()
  await loadChatHistory()
}
const switchSession = async (id: string) => {
  if (activeSessionId.value === id) return
  activeSessionId.value = id
  await saveSessions()
  await loadChatHistory()
  stopTTS()
}
const deleteSession = async (id: string) => {
  if (sessions.value.length <= 1) { alert('至少保留一个对话框哦！'); return }
  if (!confirm('确定要删除这个对话吗？')) return
  await clearHistoryDB(id)
  sessions.value = sessions.value.filter(s => s.id !== id)
  if (activeSessionId.value === id) {
    activeSessionId.value = sessions.value[0].id
    await saveSessions()
    await loadChatHistory()
  } else {
    await saveSessions()
  }
}

// ── 面板开关 ──
const isMcpPanelOpen = ref(false)
const isSkillPanelOpen = ref(false)

// ── 消息操作 ──
const copiedId = ref<string | null>(null)
const previewImageUrl = ref<string | null>(null)

const copyToClipboard = async (text: string, id: string) => {
  await navigator.clipboard.writeText(text)
  copiedId.value = id
  setTimeout(() => { if (copiedId.value === id) copiedId.value = null }, 2000)
}

const clearChat = async () => {
  if (!confirm(`确定要清空当前对话的所有记忆吗？`)) return
  await clearChatHistory()
  const current = sessions.value.find(s => s.id === activeSessionId.value)
  if (current) current.title = '新建对话'
  await saveSessions()
}

const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text || isThinking.value) return
  const currentSession = sessions.value.find(s => s.id === activeSessionId.value)
  if (currentSession && currentSession.title === '新建对话') {
    currentSession.title = text.length > 15 ? text.slice(0, 15) + '...' : text
    currentSession.updatedAt = Date.now()
    await saveSessions()
  }
  await coreSendMessage()
  if (currentSession) { currentSession.updatedAt = Date.now(); await saveSessions() }
}

// ── 附件 ──
const handleAttachMedia = async () => {
  try {
    const selected = await open({ multiple: false, filters: [{ name: 'Media', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm'] }] })
    if (selected && typeof selected === 'string') {
      let safeUrl = convertFileSrc(selected).replace(/%5C/ig, '/').replace(/%2F/ig, '/').replace(/\\\\/g, '/')
      inputText.value += selected.match(/\.(mp4|webm)$/i) ? `\n[video](${safeUrl})\n` : `\n![图片](${safeUrl})\n`
    }
  } catch (err) { console.error("选择文件失败:", err) }
}

// ── 背景图片上传 ──
const fileInputRef = ref<HTMLInputElement | null>(null)
const handleImageUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      let { width, height } = img
      const maxSize = 1920
      if (width > maxSize || height > maxSize) {
        if (width > height) { height *= maxSize / width; width = maxSize }
        else { width *= maxSize / height; height = maxSize }
      }
      canvas.width = width; canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      chatTheme.value.bgImage = canvas.toDataURL('image/jpeg', 0.85)
      saveChatTheme()
    }; img.src = e.target?.result as string
  }; reader.readAsDataURL(file)
}
const clearLocalImage = () => { chatTheme.value.bgImage = ''; saveChatTheme() }

// ── Skill 导入 ──
const skillFileInputRef = ref<HTMLInputElement | null>(null)
const triggerSkillImport = () => skillFileInputRef.value?.click()
const handleImportSkill = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const textContent = e.target?.result as string
    const skillName = file.name.replace(/\.[^/.]+$/, "")
    agentSkills.value.push({ name: skillName, content: textContent, enabled: true, isExpanded: false })
    saveSkills()
    if (skillFileInputRef.value) skillFileInputRef.value.value = ''
  }; reader.readAsText(file, 'utf-8')
}

// 事件处理函数
const updateMcpConfigs = (val: any[]) => { mcpConfigs.value = val; saveMcpConfigs() }
const updateAgentSkills = (val: any[]) => { agentSkills.value = val; saveSkills() }

// ── 生命周期 ──
onMounted(async () => {
  await initDB()
  await loadSessions()
  await loadChatTheme()
})
onUnmounted(() => { stopTTS() })
</script>

<template>
<div class="chat-app">
  <!-- 背景层 -->
  <div class="chat-bg-layer" :style="{
    backgroundImage: chatTheme.bgImage ? `url(${chatTheme.bgImage})` : 'none',
    filter: `blur(${chatTheme.bgBlur}px)`, opacity: chatTheme.bgOpacity
  }"></div>

  <div class="layout-wrapper">
    <!-- 左侧栏 -->
    <SessionSidebar
      :sessions="sessions"
      :active-session-id="activeSessionId"
      :is-open="isSidebarOpen"
      :agent-skills="agentSkills"
      :mcp-configs="mcpConfigs"
      @create-session="createNewSession"
      @switch-session="switchSession"
      @delete-session="deleteSession"
      @open-skill="isSkillPanelOpen = true"
      @open-mcp="isMcpPanelOpen = true"
    />

    <!-- 主区域 -->
    <main class="main-content">
      <!-- 顶栏 -->
      <header class="chat-header" :class="{ 'has-custom-bg': chatTheme.headerBg === 'custom' }"
        :style="chatTheme.headerBg === 'custom' ? { background: chatTheme.headerBgColor } : {}">
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

      <!-- 消息列表 -->
      <MessageList
        :messages="chatHistory"
        :is-thinking="isThinking"
        :copied-id="copiedId"
        @copy="copyToClipboard"
        @preview-image="(url: string) => previewImageUrl = url"
      />

      <!-- 输入栏 -->
      <ChatInput
        v-model="inputText"
        :is-thinking="isThinking"
        :is-playing-tts="isPlayingTTS"
        @send="sendMessage"
        @stop-tts="stopTTS"
        @attach-media="handleAttachMedia"
      />
    </main>
  </div>

  <!-- 弹窗面板 -->
  <ThemePanel
    v-model="chatTheme"
    :visible="isThemePanelOpen"
    @close="isThemePanelOpen = false"
    @reset="chatTheme = { ...defaultTheme }; saveChatTheme()"
    @upload-image="handleImageUpload"
    @clear-image="clearLocalImage"
  />

  <McpPanel
    :configs="mcpConfigs"
    :visible="isMcpPanelOpen"
    @close="isMcpPanelOpen = false"
    @update:configs="updateMcpConfigs"
  />

  <SkillPanel
    :skills="agentSkills"
    :visible="isSkillPanelOpen"
    @close="isSkillPanelOpen = false"
    @update:skills="updateAgentSkills"
    @import-skill="triggerSkillImport"
  />
  <input type="file" ref="skillFileInputRef" accept=".md,.txt" style="display:none" @change="handleImportSkill">

  <!-- 图片预览 -->
  <transition name="fade">
    <div v-if="previewImageUrl" class="image-preview-overlay" @click="previewImageUrl = null">
      <button class="preview-close-btn" @click="previewImageUrl = null">✕</button>
      <img :src="previewImageUrl" class="preview-img-large" @click.stop />
    </div>
  </transition>
</div>
</template>

<style scoped>
/* ── 基础布局 ── */
.chat-app {
  position: relative; height: 100vh; width: 100vw;
  background-color: var(--chat-bg); font-family: var(--font-family);
  color: var(--text-color); overflow: hidden;
  -webkit-font-smoothing: antialiased;
}
.chat-bg-layer {
  position: absolute; top: -10px; left: -10px; right: -10px; bottom: -10px;
  background-size: var(--bg-size); background-position: var(--bg-position);
  pointer-events: none; z-index: 0;
}
.layout-wrapper { position: relative; z-index: 1; display: flex; height: 100%; }

/* ── 主内容区 ── */
.main-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.chat-header {
  display: flex; align-items: center; padding: 10px 16px;
  background: var(--chat-bg); border-bottom: 1px solid rgba(255,255,255,0.06);
  gap: 12px; flex-shrink: 0;
  opacity: var(--header-opacity, 1);
  backdrop-filter: var(--header-blur, none);
}
.header-left { display: flex; align-items: center; }
.header-center { flex: 1; display: flex; justify-content: center; align-items: center; }
.header-right { display: flex; align-items: center; gap: 8px; }
.icon-wrap { width: 20px; height: 20px; display: flex; }
.icon-wrap svg { width: 100%; height: 100%; }

.toggle-sidebar-btn, .header-icon-btn {
  background: transparent; border: none; color: var(--sidebar-text-color);
  opacity: 0.5; cursor: pointer; padding: 6px; border-radius: 8px;
  display: flex; align-items: center; transition: 0.2s;
}
.toggle-sidebar-btn:hover, .header-icon-btn:hover { opacity: 0.8; background: rgba(255,255,255,0.08); }
.danger-btn:hover { color: #ef4444; opacity: 1; }

.status-badge { font-size: 12px; color: var(--text-color); opacity: 0.5; display: flex; align-items: center; gap: 6px; }
.typing-dots { display: flex; gap: 3px; }
.typing-dots span {
  width: 6px; height: 6px; border-radius: 50%; background: var(--text-color); opacity: 0.5;
  animation: dot-pulse 1.4s ease-in-out infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes dot-pulse {
  0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
  30% { opacity: 1; transform: scale(1.1); }
}

/* ── 图片预览 ── */
.image-preview-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85); z-index: 99999;
  display: flex; justify-content: center; align-items: center; cursor: pointer;
}
.preview-close-btn {
  position: absolute; top: 20px; right: 20px;
  background: rgba(255,255,255,0.1); border: none; color: #fff;
  font-size: 24px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
  display: flex; justify-content: center; align-items: center;
}
.preview-img-large { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 12px; cursor: default; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
