<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick, watch } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { listen, emit, type UnlistenFn } from '@tauri-apps/api/event'
import { initDB } from '@/core/Database'
import { useChat } from '@/composables/useChat'
import { useMotion } from '@/composables/useMotion'
import { useLive2D } from '@/composables/useLive2D'
import { useTheme } from '@/composables/useTheme'
import { useTTS } from '@/composables/useTTS'
import { useConsole } from '@/composables/useConsole'
import { ConfigStore } from '@/core/ConfigStore'
import { useRecorder } from '@/composables/useRecorder'
import { invoke } from '@tauri-apps/api/core'

// 子组件
import SpeechBubble from './main/SpeechBubble.vue'
import ChatOverlay from './main/ChatOverlay.vue'
import ModelTuningModal from './main/ModelTuningModal.vue'
import ActionPanelModal from './main/ActionPanelModal.vue'
import ControlPanel from './main/ControlPanel.vue'

// Composables
const {
  isChatInputOpen, isSpeaking, chatInputText, bubbleMessage,
  chatInputRef, isChatHistoryOpen, chatHistory,
  clearChatHistory, openChatWindow, adjustTextareaHeight, triggerSpeechBubble, sendMessage
} = useChat()

const {
  isActionListOpen, currentMotions, isEditingActions, savedAliases, editingAliases,
  openActionPanel, toggleActionEditMode, saveMotionAliases, playAction
} = useMotion()

const {
  live2dCanvas, isModelManagerOpen, isModelHidden, activeModel,
  getManager, loadRegistry, onScaleChange, onPosChange, initEngine, setupModelChangeListener
} = useLive2D()

const { currentThemeStyle } = useTheme()
const { isPlayingTTS, stopTTS, loadTtsConfig } = useTTS()
const { clearLogs, addLog } = useConsole()
const { isAutoVoiceMode, isRecording, startAutoVoice, stopAutoVoice } = useRecorder()

// 窗口与状态
const appWindow = getCurrentWindow()
const unlisteners: UnlistenFn[] = []

const isMenuOpen = ref(false)
const isAlwaysOnTop = ref(true)
const isFadeMode = ref(false)
const isDocked = ref(false)

let winBounds = { x: 0, y: 0, width: 0, height: 0 }
let isCurrentlyIgnoring = false
let isMouseMoveHandling = false
let dockTimeout: ReturnType<typeof setTimeout> | null = null

// 图标常量（小规模，菜单内嵌 SVG 保留在 menuItems 中）
const ICON_PIN_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>'
const ICON_PIN_ON = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>'
const ICON_GHOST_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"></path></svg>'
const ICON_GHOST_ON = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"></path></svg>'

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
])

// ============================================================
// 窗口交互
// ============================================================
const updateWinBounds = async () => {
  try {
    const pos = await appWindow.outerPosition()
    const size = await appWindow.outerSize()
    winBounds = { x: pos.x, y: pos.y, width: size.width, height: size.height }
  } catch (e) {}
}

const handleMouseEnter = () => {
  isDocked.value = false
  if (dockTimeout) clearTimeout(dockTimeout)
}

const handleMouseLeave = () => {
  if (!isMenuOpen.value) {
    dockTimeout = setTimeout(() => { isDocked.value = true }, 2500)
  }
}

const startDrag = () => appWindow.startDragging()
const toggleMenu = () => { isMenuOpen.value = !isMenuOpen.value }

// ============================================================
// 菜单点击分发
// ============================================================
const handleItemClick = async (item: any) => {
  if (item.id === 'console') {
    try {
      const consoleWin = await WebviewWindow.getByLabel('console-room')
      if (consoleWin) { await consoleWin.show(); await consoleWin.setFocus() }
      else { const win = new WebviewWindow('console-room', { url: '/', title: 'Yuki 开发者控制台', width: 750, height: 500, decorations: true, transparent: false, resizable: true, center: true }); win.once('tauri://error', (e) => console.error('控制台窗口创建失败:', e)) }
    } catch (e) { console.warn('获取控制台窗口失败:', e) }
    if (isMenuOpen.value) toggleMenu()
  }
  else if (item.id === 'pin') {
    isAlwaysOnTop.value = !isAlwaysOnTop.value
    const targetItem = menuItems.value.find(i => i.id === 'pin')
    if (targetItem) targetItem.icon = isAlwaysOnTop.value ? ICON_PIN_ON : ICON_PIN_OFF
    appWindow.setAlwaysOnTop(isAlwaysOnTop.value).catch(e => console.warn('置顶异常:', e))
  }
  else if (item.id === 'fade') {
    isFadeMode.value = !isFadeMode.value
    const targetItem = menuItems.value.find(i => i.id === 'fade')
    if (targetItem) targetItem.icon = isFadeMode.value ? ICON_GHOST_ON : ICON_GHOST_OFF
    if (!isFadeMode.value) {
      isModelHidden.value = false; isCurrentlyIgnoring = false
      appWindow.setIgnoreCursorEvents(false).catch(e => console.warn('穿透恢复异常:', e))
    }
  }
  else if (item.id === 'dress') { isModelManagerOpen.value = true; if (isMenuOpen.value) toggleMenu() }
  else if (item.id === 'chat') {
    isChatInputOpen.value = !isChatInputOpen.value
    if (isMenuOpen.value) toggleMenu()
    if (isChatInputOpen.value) nextTick(() => { chatInputRef.value?.focus() })
  }
  else if (item.id === 'action') {
    openActionPanel(getManager(), triggerSpeechBubble, () => { if (isMenuOpen.value) toggleMenu() })
  }
  else if (item.id === 'settings') {
    try {
      const settingsWin = await WebviewWindow.getByLabel('settings')
      if (settingsWin) { await settingsWin.show(); await settingsWin.setFocus() }
      else { const win = new WebviewWindow('settings', { url: '/', title: 'Yuki 设置中心', width: 860, height: 660, decorations: true, transparent: false, resizable: false, center: true, visible: false }); win.once('tauri://error', (e) => console.error('窗口创建彻底失败:', e)) }
    } catch (e) { console.warn('获取设置窗口失败:', e) }
    if (isMenuOpen.value) toggleMenu()
  }
  else if (item.id === 'voice') { toggleVoiceMode() }
}

// ============================================================
// 语音识别流程
// ============================================================
const toggleVoiceMode = async () => {
  if (!isAutoVoiceMode.value) {
    await startAutoVoice(async (wavBytes) => {
      addLog('info', 'Voice', '🎤 句子捕捉完毕，正在交由 Whisper 引擎识别...')
      try {
        const text = await invoke<string>('transcribe_audio', { audioBytes: Array.from(wavBytes) })
        const cleanText = text.trim()
        if (cleanText.length > 0) {
          addLog('success', 'Voice', `🗣️ 听清了: ${cleanText}`)
          chatInputText.value = cleanText
          if (!isChatInputOpen.value) isChatInputOpen.value = true
          sendMessage()
        } else {
          addLog('warning', 'Voice', '🔕 没听清文字，可能是呼吸声或背景杂音。')
        }
      } catch (error: any) {
        addLog('error', 'Voice', `引擎崩了: ${error}`)
      }
    })
  } else {
    stopAutoVoice()
  }
}

// ============================================================
// 动作数据加载
// ============================================================
const loadMotionsData = async (manager: any) => {
  if (!manager) return
  try { currentMotions.value = manager.getMotionList() } catch (err) { console.error('❌ 静默加载动作数据时发生崩溃:', err) }
}

// ============================================================
// Watchers
// ============================================================
watch(isMenuOpen, (newVal) => {
  if (newVal) { isDocked.value = false; if (dockTimeout) clearTimeout(dockTimeout) }
  else { handleMouseLeave() }
})

// 事件处理函数（避免模板中 ref.value 的自动解包问题）
const onChatInputUpdate = (val: string) => { chatInputText.value = val; nextTick(() => adjustTextareaHeight()) }
const onEditingAliasesUpdate = (val: Record<string, string>) => { editingAliases.value = val }

// ============================================================
// 生命周期
// ============================================================
onMounted(async () => {
  await clearLogs()
  await initDB()
  await loadTtsConfig()
  await loadRegistry()
  handleMouseLeave()

  await initEngine(triggerSpeechBubble)
  await setupModelChangeListener(unlisteners, triggerSpeechBubble)

  appWindow.setAlwaysOnTop(isAlwaysOnTop.value).catch(e => console.warn('置顶初始化异常:', e))
  await updateWinBounds()
  setInterval(updateWinBounds, 1000)
  appWindow.onMoved(updateWinBounds)
  appWindow.onResized(updateWinBounds)

  // 全局鼠标穿透
  unlisteners.push(
    await listen('global-mouse-move', async (event) => {
      if (!isFadeMode.value) return
      if (isMouseMoveHandling) return
      isMouseMoveHandling = true
      requestAnimationFrame(() => {
        const [globalX, globalY] = event.payload as [number, number]
        const dpr = window.devicePixelRatio || 1
        const winX = winBounds.x; const winY = winBounds.y; const winW = winBounds.width; const winH = winBounds.height
        const isInsideWindow = globalX >= winX && globalX <= (winX + winW) && globalY >= winY && globalY <= (winY + winH)
        let isOverUI = false
        const rightUIWidth = isMenuOpen.value ? 320 : 80
        const rightUIHeight = isMenuOpen.value ? 280 : 120
        if (globalX >= (winX + winW - rightUIWidth * dpr) && globalY <= (winY + rightUIHeight * dpr)) isOverUI = true
        if (isSpeaking.value) {
          const bubW = 340 * dpr; const bubH = 200 * dpr; const cx = winX + winW / 2
          if (globalX >= cx - bubW/2 && globalX <= cx + bubW/2 && globalY <= winY + bubH) isOverUI = true
        }
        if (isChatInputOpen.value) {
          const inW = 340 * dpr; const inH = 160 * dpr; const cx = winX + winW / 2
          if (globalX >= cx - inW/2 && globalX <= cx + inW/2 && globalY >= winY + winH - inH) isOverUI = true
        }
        if (isChatHistoryOpen.value && isChatInputOpen.value) {
          const hpW = 360 * dpr; const hpH = 420 * dpr; const cx = winX + winW / 2
          const panelBottom = winY + winH - (60 * dpr)
          if (globalX >= cx - hpW/2 && globalX <= cx + hpW/2 && globalY >= panelBottom - hpH && globalY <= panelBottom) isOverUI = true
        }
        if (isModelManagerOpen.value) {
          const mmW = 300 * dpr; const mmH = 400 * dpr; const cx = winX + winW / 2; const cy = winY + winH / 2
          if (globalX >= cx - mmW/2 && globalX <= cx + mmW/2 && globalY >= cy - mmH/2 && globalY <= cy + mmH/2) isOverUI = true
        }
        if (isInsideWindow) {
          isModelHidden.value = true
          if (!isOverUI) { if (!isCurrentlyIgnoring) { appWindow.setIgnoreCursorEvents(true).catch(()=>{}); isCurrentlyIgnoring = true } }
          else { if (isCurrentlyIgnoring) { appWindow.setIgnoreCursorEvents(false).catch(()=>{}); isCurrentlyIgnoring = false } }
        } else {
          isModelHidden.value = false
          if (isCurrentlyIgnoring) { appWindow.setIgnoreCursorEvents(false).catch(()=>{}); isCurrentlyIgnoring = false }
        }
        isMouseMoveHandling = false
      })
    })
  )

  // 跨窗口通信：同步动作列表
  unlisteners.push(
    await listen('request-current-motions', async () => {
      const manager = getManager()
      if (!manager) return
      if (!currentMotions.value || Object.keys(currentMotions.value).length === 0) {
        await loadMotionsData(manager)
        let retry = 0
        while (Object.keys(currentMotions.value).length === 0 && retry < 10) {
          await new Promise(resolve => setTimeout(resolve, 50)); retry++
        }
      }
      await emit('reply-current-motions', { motions: currentMotions.value || {}, aliases: savedAliases.value || {} })
    })
  )

  // 情绪触发动作
  let lastEmotionTriggerTime = 0
  unlisteners.push(
    await listen<string>('yuki-trigger-emotion-motion', async (event) => {
      const now = Date.now()
      if (now - lastEmotionTriggerTime < 2000) return
      lastEmotionTriggerTime = now
      const emotion = event.payload
      const manager = getManager()
      if (!manager || !activeModel.value?.id) { addLog('error', 'MotionLink', `❌ 情绪 [${emotion}] 触发失败: 引擎未就绪`); return }
      const key = `yuki_model_setting_${activeModel.value.id}`
      const saved = await ConfigStore.get<any>(key, {})
      const motionList = saved.emotionMotions?.[emotion] || []
      if (motionList.length === 0) { addLog('warning', 'MotionLink', `⚠️ 情绪 [${emotion}] 未关联任何动作`); return }
      if (!currentMotions.value || Object.keys(currentMotions.value).length === 0) {
        await loadMotionsData(manager)
        let retry = 0
        while (Object.keys(currentMotions.value).length === 0 && retry < 10) {
          await new Promise(resolve => setTimeout(resolve, 50)); retry++
        }
      }
      const randomMotionName = motionList[Math.floor(Math.random() * motionList.length)]
      let targetGroup = ''; let targetIndex = -1
      for (const [gName, mList] of Object.entries(currentMotions.value)) {
        const idx = (mList as string[]).indexOf(randomMotionName)
        if (idx !== -1) { targetGroup = gName; targetIndex = idx; break }
      }
      if (targetIndex !== -1) {
        try { await playAction(manager, targetGroup, targetIndex); addLog('success', 'MotionLink', `🎉 情绪动作已播: [${randomMotionName}]`) }
        catch (err: any) { addLog('error', 'MotionLink', `❌ 执行异常: ${err.message}`) }
      } else { addLog('error', 'MotionLink', `❌ 找不到动作索引: [${randomMotionName}]`) }
    })
  )
})

onUnmounted(() => {
  unlisteners.forEach((unlisten) => unlisten())
  unlisteners.length = 0
})
</script>

<template>
  <div class="yuki-container" :style="currentThemeStyle">
    <canvas ref="live2dCanvas" :class="['live2d-canvas', { 'hidden-model': isModelHidden }]"></canvas>

    <SpeechBubble :visible="isSpeaking" :message="bubbleMessage" />

    <ChatOverlay
      :is-chat-input-open="isChatInputOpen"
      :chat-input-text="chatInputText"
      :is-chat-history-open="isChatHistoryOpen"
      :chat-history="chatHistory"
      :is-playing-tts="isPlayingTTS"
      @update:chat-input-text="onChatInputUpdate"
      @send-message="sendMessage"
      @stop-tts="stopTTS"
      @toggle-history="isChatHistoryOpen = !isChatHistoryOpen"
      @open-chat-window="openChatWindow"
      @clear-history="clearChatHistory"
    />

    <ModelTuningModal
      :visible="isModelManagerOpen"
      :model="activeModel"
      @close="isModelManagerOpen = false"
      @scale-change="(v: number) => { activeModel.defScale = v; onScaleChange() }"
      @pos-change="onPosChange"
    />

    <ActionPanelModal
      :visible="isActionListOpen"
      :motions="currentMotions"
      :is-editing="isEditingActions"
      :editing-aliases="editingAliases"
      :get-manager="getManager"
      @close="isActionListOpen = false"
      @toggle-edit="toggleActionEditMode"
      @save="saveMotionAliases(triggerSpeechBubble)"
      @play="(g: string, i: number) => playAction(getManager(), g, i)"
      @update:editing-aliases="onEditingAliasesUpdate"
    />

    <ControlPanel
      :is-menu-open="isMenuOpen"
      :is-docked="isDocked"
      :is-always-on-top="isAlwaysOnTop"
      :is-fade-mode="isFadeMode"
      :is-auto-voice-mode="isAutoVoiceMode"
      :is-recording="isRecording"
      :is-chat-input-open="isChatInputOpen"
      :menu-items="menuItems"
      @toggle-menu="toggleMenu"
      @start-drag="startDrag"
      @item-click="handleItemClick"
      @mouse-enter="handleMouseEnter"
      @mouse-leave="handleMouseLeave"
    />
  </div>
</template>

<style scoped>
body, html { margin: 0; padding: 0; background-color: transparent !important; overflow: hidden; user-select: none; }
.yuki-container { width: 100vw; height: 100vh; position: relative; }
.live2d-canvas { width: 100%; height: 100%; display: block; transition: opacity 0.4s ease-in-out; }
.hidden-model { opacity: 0 !important; pointer-events: none; }
</style>
