<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ConfigStore } from '@/core/ConfigStore'

// 子组件
import PersonaSettings from './settings/PersonaSettings.vue'
import ThemeSettings from './settings/ThemeSettings.vue'
import ModelSettings from './settings/ModelSettings.vue'
import AiProviderSettings from './settings/AiProviderSettings.vue'
import TtsSettings from './settings/TtsSettings.vue'
import EmotionLinkSettings from './settings/EmotionLinkSettings.vue'

// 图标
const UI_GEAR = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M128,152a24,24,0,1,0-24-24A24,24,0,0,0,128,152Zm71.5-18.7,21.7-10.8a8,8,0,0,0,3.6-10.7l-13.4-23.2a8,8,0,0,0-10-3.8l-21.3,9a88.1,88.1,0,0,0-16.1-10.7L161,60.8A8,8,0,0,0,153.2,54H102.8a8,8,0,0,0-7.8,6.8L92,83.1A88.1,88.1,0,0,0,75.9,93.8l-21.3-9a8,8,0,0,0-10,3.8L31.2,111.8a8,8,0,0,0,3.6,10.7l21.7,10.8a87.1,87.1,0,0,0,0,19.4l-21.7,10.8a8,8,0,0,0-3.6,10.7l13.4,23.2a8,8,0,0,0,10,3.8l21.3-9a88.1,88.1,0,0,0,16.1,10.7l3,22.3a8,8,0,0,0,7.8,6.8h50.4a8,8,0,0,0,7.8-6.8l3-22.3a88.1,88.1,0,0,0,16.1-10.7l21.3,9a8,8,0,0,0,10-3.8l13.4-23.2a8,8,0,0,0-3.6-10.7l-21.7-10.8A87.1,87.1,0,0,0,199.5,133.3Z"></path></svg>'
const UI_USER = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M128,120a40,40,0,1,0-40-40A40,40,0,0,0,128,120Zm0,16c-53,0-96,28.7-96,64a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8C224,164.7,181,136,128,136Z"></path></svg>'
const UI_PALETTE = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M128,40A88,88,0,1,0,216,128c0-22-16-40-40-40H160a24,24,0,0,1,24-24C184,52.9,157.9,40,128,40ZM84,104a12,12,0,1,1-12-12A12,12,0,0,1,84,104Zm44-28a12,12,0,1,1-12-12A12,12,0,0,1,128,76Zm44,28a12,12,0,1,1-12-12A12,12,0,0,1,172,104Z"></path></svg>'
const UI_CPU = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M80,104a12,12,0,1,1-12-12A12,12,0,0,1,80,104Zm84-12a12,12,0,1,0,12,12A12,12,0,0,0,164,92ZM224,136v40a16,16,0,0,1-16,16H184V208a16,16,0,0,1-16,16H88a16,16,0,0,1-16-16V192H48a16,16,0,0,1-16-16V136ZM168,48a8,8,0,0,0-8-8H96a8,8,0,0,0-8,8V80h80Z"></path></svg>'
const UI_MIC = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M128,176a48.1,48.1,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48.1,48.1,0,0,0,128,176ZM200,128a72.1,72.1,0,0,1-144,0M128,200v40m-32,0h64"></path></svg>'
const UI_INFO = '<svg viewBox="0 0 256 256"><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></circle><polyline points="120 120 128 120 128 176 136 176" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></polyline><circle cx="126" cy="84" r="12"></circle></svg>'
const UI_PACKAGE = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M224,177.3V78.7a8.1,8.1,0,0,0-4.1-7l-88-49.5a7.8,7.8,0,0,0-7.8,0l-88,49.5a8.1,8.1,0,0,0-4.1,7v98.6a8.1,8.1,0,0,0,4.1,7l88,49.5a7.8,7.8,0,0,0,7.8,0l88-49.5A8.1,8.1,0,0,0,224,177.3Z</path><polyline points="177 152.5 177 100.5 80 47" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></polyline><polyline points="222.9 74.6 128 128 33.1 74.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></polyline><line x1="128" y1="128" x2="128" y2="234.8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line></svg>'
const UI_SMILEY = '<svg viewBox="0 0 256 256"><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></circle><circle cx="92" cy="108" r="12"></circle><circle cx="164" cy="108" r="12"></circle><path d="M160,152a40,40,0,0,1-64,0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></path></svg>'

// 状态
const activeSettingsTab = ref('general')
const activeThemeId = ref('dark')
const customThemeVars = ref<Record<string, string>>({})

// 当前主题样式计算
const themeRegistry = [
  { id: 'dark', name: '深空灰', preview: '#1a1b1e', color: '#4facfe', vars: { '--bg': '#1a1b1e', '--sidebar-bg': '#141517', '--primary': '#4facfe', '--text': '#ececec', '--text-muted': '#888888', '--border': '#2c2d30', '--hover': '#1e1f22', '--active-bg': '#242528', '--input-bg': '#141517' } },
  { id: 'light', name: '极简白', preview: '#f7f9fa', color: '#006fee', vars: { '--bg': '#f7f9fa', '--sidebar-bg': '#ffffff', '--primary': '#006fee', '--text': '#11181c', '--text-muted': '#687076', '--border': '#d7dbdf', '--hover': '#f1f3f5', '--active-bg': '#e6f1fe', '--input-bg': '#ffffff' } },
  { id: 'sakura', name: '樱花粉', preview: '#fff5f7', color: '#fb7185', vars: { '--bg': '#fff5f7', '--sidebar-bg': '#ffe4e6', '--primary': '#fb7185', '--text': '#4c1d95', '--text-muted': '#be123c', '--border': '#fecdd3', '--hover': '#ffe4e6', '--active-bg': '#fff1f2', '--input-bg': '#ffffff' } },
  { id: 'custom', name: '自定义', preview: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff)', color: '#ffffff', vars: {} }
]

const currentThemeStyle = computed(() => {
  if (activeThemeId.value === 'custom') return customThemeVars.value
  return themeRegistry.find(t => t.id === activeThemeId.value)?.vars || themeRegistry[0].vars
})

// 监听侧边栏切换，自动拉取情绪联动数据
watch(activeSettingsTab, (newTab) => {
  if (newTab === 'emotionLink') {
    emotionLinkRef.value?.loadEmotionBindings()
    emotionLinkRef.value?.fetchMotionsFromMain()
  }
}, { immediate: true })

// refs 用于调用子组件暴露的方法
const personaRef = ref<InstanceType<typeof PersonaSettings> | null>(null)
const themeRef = ref<InstanceType<typeof ThemeSettings> | null>(null)
const modelRef = ref<InstanceType<typeof ModelSettings> | null>(null)
const aiRef = ref<InstanceType<typeof AiProviderSettings> | null>(null)
const ttsRef = ref<InstanceType<typeof TtsSettings> | null>(null)
const emotionLinkRef = ref<InstanceType<typeof EmotionLinkSettings> | null>(null)

const openGithub = async () => {
  try {
    const { open } = await import('@tauri-apps/plugin-shell')
    await open('https://github.com/FGXYX')
  } catch { window.open('https://github.com/FGXYX', '_blank') }
}

const onThemeChanged = async (themeId: string) => {
  activeThemeId.value = themeId
  // 同步自定义主题变量
  if (themeId === 'custom') {
    const savedCustom = await ConfigStore.get<any>('yuki_theme_custom', null)
    if (savedCustom) customThemeVars.value = savedCustom
  }
}

onMounted(async () => {
  // 从 ConfigStore 同步当前主题到父组件
  const savedThemeId = await ConfigStore.get<string>('yuki_theme', 'dark')
  if (themeRegistry.find(t => t.id === savedThemeId)) activeThemeId.value = savedThemeId
  const savedCustom = await ConfigStore.get<any>('yuki_theme_custom', null)
  if (savedCustom) customThemeVars.value = savedCustom

  themeRef.value?.loadTheme()
  aiRef.value?.loadAiProviders()
  personaRef.value?.loadPersona()
  await modelRef.value?.loadModels()
  ttsRef.value?.loadTtsConfig()

  setTimeout(() => { getCurrentWindow().show() }, 150)
})
</script>

<template>
  <div class="os-settings-container" :style="currentThemeStyle">
    <div class="settings-sidebar">
      <div class="sidebar-title">设置中心</div>
      <div :class="['sidebar-item', { active: activeSettingsTab === 'general' }]" @click="activeSettingsTab = 'general'">
        <span class="sb-icon" v-html="UI_GEAR"></span> 常规设置
      </div>
      <div :class="['sidebar-item', { active: activeSettingsTab === 'models' }]" @click="activeSettingsTab = 'models'">
        <span class="sb-icon" v-html="UI_PACKAGE"></span> 模型管理
      </div>
      <div :class="['sidebar-item', { active: activeSettingsTab === 'persona' }]" @click="activeSettingsTab = 'persona'">
        <span class="sb-icon" v-html="UI_USER"></span> 人格设定
      </div>
      <div :class="['sidebar-item', { active: activeSettingsTab === 'theme' }]" @click="activeSettingsTab = 'theme'">
        <span class="sb-icon" v-html="UI_PALETTE"></span> 个性化外观
      </div>
      <div :class="['sidebar-item', { active: activeSettingsTab === 'ai' }]" @click="activeSettingsTab = 'ai'">
        <span class="sb-icon" v-html="UI_CPU"></span> AI 引擎管理
      </div>
      <div :class="['sidebar-item', { active: activeSettingsTab === 'audio' }]" @click="activeSettingsTab = 'audio'">
        <span class="sb-icon" v-html="UI_MIC"></span> 语音与合成
      </div>
      <div :class="['sidebar-item', { active: activeSettingsTab === 'emotionLink' }]" @click="activeSettingsTab = 'emotionLink'">
        <span class="sb-icon" v-html="UI_SMILEY"></span> 情绪动作联动
      </div>
      <div :class="['sidebar-item', { active: activeSettingsTab === 'about' }]" @click="activeSettingsTab = 'about'">
        <span class="sb-icon" v-html="UI_INFO"></span> 关于 Yuki
      </div>
    </div>

    <div class="settings-content">
      <div class="settings-page-inner">
        <!-- 常规 -->
        <div v-if="activeSettingsTab === 'general'" class="settings-page">
          <h2>常规设置</h2>
          <p class="desc">配置桌宠基础功能与系统行为。</p>
          <div class="config-item"><span>施工中</span></div>
        </div>

        <!-- 模型管理 -->
        <ModelSettings v-show="activeSettingsTab === 'models'" ref="modelRef" />

        <!-- 人格设定 -->
        <PersonaSettings v-show="activeSettingsTab === 'persona'" ref="personaRef" />

        <!-- 主题 -->
        <ThemeSettings v-show="activeSettingsTab === 'theme'" ref="themeRef" @theme-changed="onThemeChanged" />

        <!-- AI 引擎 -->
        <AiProviderSettings v-show="activeSettingsTab === 'ai'" ref="aiRef" />

        <!-- 语音合成 -->
        <TtsSettings v-show="activeSettingsTab === 'audio'" ref="ttsRef" />

        <!-- 情绪动作联动 -->
        <EmotionLinkSettings v-show="activeSettingsTab === 'emotionLink'" ref="emotionLinkRef" />

        <!-- 关于 -->
        <div v-if="activeSettingsTab === 'about'" class="settings-page about-page">
          <h2>关于 Yuki</h2>
          <p class="desc">桌面级 AI 虚拟伴侣</p>
          <div class="about-card">
            <p>版本: v1.0.1</p>
            <p>作者: <a href="#" @click.prevent="openGithub">FGXYX ❤️</a></p>
            <p>技术栈: Tauri v2 + Vue 3 + Rust + Live2D</p>
            <p>开源协议: GNU GPLv3</p>
            <button class="primary-btn outline" @click="openGithub" style="margin-top: 16px;">
              🌟 GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.os-settings-container { display: flex; height: 100vh; background: var(--bg, #1a1b1e); color: var(--text, #ececec); }
.settings-sidebar {
  width: 200px; min-width: 200px; background: var(--sidebar-bg, #141517);
  border-right: 1px solid var(--border, #2c2d30); padding: 20px 0; display: flex; flex-direction: column;
}
.sidebar-title { padding: 0 20px 16px; font-size: 16px; font-weight: bold; border-bottom: 1px solid var(--border, #2c2d30); }
.sidebar-item { padding: 10px 20px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-muted, #888); transition: 0.15s; }
.sidebar-item:hover { background: var(--hover, #1e1f22); color: var(--text, #ececec); }
.sidebar-item.active { background: var(--active-bg, #242528); color: var(--primary, #4facfe); font-weight: 500; }
.sb-icon { width: 18px; height: 18px; display: flex; align-items: center; }
.sb-icon svg { width: 100%; height: 100%; }

.settings-content { flex: 1; overflow-y: auto; padding: 24px 32px; }
.settings-page-inner { max-width: 720px; }
.settings-page h2 { margin: 0 0 4px; font-size: 20px; }
.settings-page .desc { margin: 0 0 20px; font-size: 13px; color: var(--text-muted, #888); }
.config-item { padding: 20px; text-align: center; color: var(--text-muted, #888); }

.about-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; }
.about-card p { margin: 8px 0; font-size: 14px; }
</style>

<!-- 全局设置面板样式（非scoped，透传到子组件） -->
<style>
/* ── 页面通用 ── */
.page-header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 16px; }
.header-with-back { display: flex; align-items: center; gap: 12px; }
.back-btn { background: transparent; border: 1px solid var(--border,#2c2d30); color: var(--text-muted,#888); padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; }
.back-btn:hover { color: var(--text,#ececec); background: var(--hover,#1e1f22); }
.flex-center-btn { display: flex; align-items: center; justify-content: center; gap: 6px; }
.btn-icon { width: 16px; height: 16px; display: flex; align-items: center; }
.btn-icon svg { width: 100%; height: 100%; }
.divider-line { height: 1px; background: var(--border,#2c2d30); margin: 16px 0; }

/* ── 输入域 ── */
.input-field { margin-bottom: 14px; }
.input-field label { display: block; font-size: 12px; color: var(--text-muted,#888); margin-bottom: 6px; }
.input-field input[type="text"], .input-field input[type="password"], .input-field select, .input-field textarea {
  width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: var(--text,#ececec); padding: 8px 12px; border-radius: 8px; font-size: 13px; outline: none; box-sizing: border-box;
  transition: border-color 0.2s;
}
.input-field input:focus, .input-field select:focus, .input-field textarea:focus { border-color: var(--primary,#4facfe); }
.flex-label { display: flex; justify-content: space-between; align-items: center; }
.val-badge { font-size: 12px; color: var(--primary,#4facfe); background: rgba(79,172,254,0.12); padding: 2px 8px; border-radius: 6px; }
.large-textarea { min-height: 140px; resize: vertical; font-family: inherit; line-height: 1.6; }
.persona-container { display: flex; flex-direction: column; gap: 16px; }
.flex-grow { flex: 1; }
.theme-slider { width: 100%; accent-color: var(--primary,#4facfe); }
.range-marks { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted,#888); margin-top: 2px; }

/* ── 按钮 ── */
.primary-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; background: var(--primary, #4facfe); color: #fff; transition: 0.15s; }
.primary-btn.outline { background: transparent; border: 1px solid var(--primary, #4facfe); color: var(--primary, #4facfe); }
.primary-btn.outline:hover { background: rgba(79,172,254,0.08); }
.test-section { margin-top: 16px; display: flex; align-items: center; gap: 12px; }
.test-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border,#2c2d30); background: transparent; color: var(--text,#ececec); cursor: pointer; font-size: 13px; transition: 0.15s; }
.test-btn:hover { background: var(--hover,#1e1f22); }
.test-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.test-result { font-size: 12px; padding: 6px 10px; border-radius: 6px; }
.test-result.success { background: rgba(16,185,129,0.12); color: #10b981; }
.test-result.error { background: rgba(239,68,68,0.12); color: #ef4444; }
.edit-form-card { background: rgba(255,255,255,0.02); border: 1px solid var(--border,#2c2d30); border-radius: 12px; padding: 20px; }
.icon-action-btn { background: transparent; border: none; color: var(--text-muted,#888); cursor: pointer; padding: 4px; border-radius: 6px; display: inline-flex; transition: 0.15s; }
.icon-action-btn:hover { color: var(--text,#ececec); background: var(--hover,#1e1f22); }
.icon-action-btn.delete:hover { color: #ef4444; }
.action-text-btn { background: transparent; border: none; color: var(--primary,#4facfe); cursor: pointer; font-size: 12px; padding: 4px 8px; border-radius: 6px; transition: 0.15s; }
.action-text-btn:hover { background: rgba(79,172,254,0.1); }
.action-text-btn.danger { color: #ef4444; }
.action-text-btn.danger:hover { background: rgba(239,68,68,0.1); }
.action-pill-btn { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 8px; border: 1px solid var(--border,#2c2d30); background: transparent; color: var(--text-muted,#888); cursor: pointer; font-size: 12px; transition: 0.15s; line-height: 1.2; }
.action-pill-btn:hover { color: var(--text,#ececec); background: var(--hover,#1e1f22); border-color: var(--border,#2c2d30); }
.action-pill-btn.edit:hover { color: var(--primary,#4facfe); border-color: var(--primary,#4facfe); background: rgba(79,172,254,0.06); }
.action-pill-btn.delete:hover { color: #ef4444; border-color: #ef4444; background: rgba(239,68,68,0.06); }
.action-pill-btn .btn-icon { width: 14px; height: 14px; }
.status-badge { font-size: 11px; color: var(--text-muted,#888); }

/* ── 主题选择 ── */
.theme-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
.theme-card { border: 2px solid transparent; border-radius: 12px; padding: 12px; cursor: pointer; transition: 0.2s; text-align: center; background: rgba(255,255,255,0.02); }
.theme-card:hover { border-color: var(--border,#2c2d30); background: rgba(255,255,255,0.04); }
.theme-card.is-active { border-color: var(--primary,#4facfe); background: rgba(79,172,254,0.06); }
.theme-preview { width: 100%; height: 60px; border-radius: 8px; margin-bottom: 8px; }
.theme-name { font-size: 12px; color: var(--text,#ececec); }
.custom-color-editor { margin-top: 16px; }
.custom-color-editor h3 { font-size: 14px; margin-bottom: 12px; }
.color-pickers-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.picker-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: rgba(255,255,255,0.03); border-radius: 8px; }
.picker-info { display: flex; flex-direction: column; gap: 2px; }
.picker-label { font-size: 11px; color: var(--text-muted,#888); }
.picker-code { font-size: 10px; font-family: monospace; color: var(--text,#ececec); opacity: 0.5; }
.picker-item input[type="color"] { width: 32px; height: 28px; border: 1px solid var(--border,#2c2d30); border-radius: 6px; cursor: pointer; padding: 2px; background: transparent; }

/* ── AI Provider ── */
.provider-list { display: flex; flex-direction: column; gap: 8px; }
.provider-card { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid var(--border,#2c2d30); border-radius: 10px; transition: 0.15s; }
.provider-card:hover { background: var(--hover,#1e1f22); }
.provider-card.active { border-color: var(--primary,#4facfe); background: rgba(79,172,254,0.06); }
.provider-info { flex: 1; cursor: pointer; }
.p-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.p-name { font-size: 14px; font-weight: 500; color: var(--text,#ececec); }
.active-badge { font-size: 10px; background: rgba(79,172,254,0.15); color: var(--primary,#4facfe); padding: 0 6px; border-radius: 6px; line-height: 18px; }
.p-meta { font-size: 12px; color: var(--text-muted,#888); }
.provider-actions { display: flex; gap: 4px; flex-shrink: 0; }

/* ── TTS 引擎列表 ── */
.engine-list { display: flex; flex-direction: column; gap: 8px; }
.engine-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid var(--border,#2c2d30); border-radius: 10px; cursor: pointer; transition: 0.15s; }
.engine-item:hover { background: var(--hover,#1e1f22); }
.engine-item.is-active { border-color: var(--primary,#4facfe); background: rgba(79,172,254,0.06); }
.engine-item.is-editing { border-color: #10b981; }
.engine-info { display: flex; align-items: center; gap: 8px; }
.engine-name { font-size: 13px; color: var(--text,#ececec); }
.engine-actions { display: flex; gap: 8px; flex-shrink: 0; }
.add-engine-btn { width: 100%; padding: 10px; border: 1px dashed var(--border,#2c2d30); border-radius: 10px; background: transparent; color: var(--text-muted,#888); cursor: pointer; font-size: 13px; transition: 0.15s; }
.add-engine-btn:hover { color: var(--primary,#4facfe); border-color: var(--primary,#4facfe); background: rgba(79,172,254,0.04); }

/* ── Toggle Switch ── */
.switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.switch .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.15); border-radius: 24px; transition: 0.3s; }
.switch .slider::before { content: ''; position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: 0.3s; }
.switch input:checked + .slider { background: var(--primary,#4facfe); }
.switch input:checked + .slider::before { transform: translateX(20px); }

/* ── 上传区 ── */
.upload-dropzone { border: 2px dashed var(--border,#2c2d30); border-radius: 16px; padding: 32px; text-align: center; cursor: pointer; transition: 0.2s; margin-bottom: 16px; }
.upload-dropzone:hover { border-color: var(--primary,#4facfe); background: rgba(79,172,254,0.03); }
.upload-dropzone.is-dragover { border-color: var(--primary,#4facfe); background: rgba(79,172,254,0.08); }
.upload-dropzone.is-uploading { border-color: var(--primary,#4facfe); cursor: not-allowed; }
.upload-icon { font-size: 40px; display: block; margin-bottom: 8px; }
.upload-icon svg { width: 48px; height: 48px; color: var(--primary,#4facfe); }
.upload-idle h3 { font-size: 15px; margin: 8px 0; color: var(--text,#ececec); }
.upload-idle p { font-size: 12px; color: var(--text-muted,#888); margin: 0; }
.hidden-input { display: none; }
.upload-progress-container { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.progress-spinner { width: 36px; height: 36px; border: 3px solid var(--border,#2c2d30); border-top-color: var(--primary,#4facfe); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.progress-text { font-size: 14px; color: var(--text,#ececec); margin: 0; }
.progress-bar-bg { width: 100%; max-width: 300px; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: var(--primary,#4facfe); border-radius: 3px; transition: width 0.3s; }
.progress-percent { font-size: 12px; color: var(--text-muted,#888); margin: 0; }

/* ── 模型库 ── */
.model-library-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-top: 12px; }
.model-lib-card { position: relative; background: rgba(255,255,255,0.02); border: 1px solid var(--border,#2c2d30); border-radius: 12px; padding: 12px; cursor: pointer; transition: 0.15s; text-align: center; }
.model-lib-card:hover { background: var(--hover,#1e1f22); }
.model-lib-card.is-active { border-color: var(--primary,#4facfe); background: rgba(79,172,254,0.06); }
.model-delete-btn { position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.4); border: none; color: #aaa; width: 22px; height: 22px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.15s; line-height: 1; }
.model-lib-card:hover .model-delete-btn { opacity: 1; }
.model-delete-btn:hover { color: #ef4444; background: rgba(239,68,68,0.3); }
.model-preview-box { width: 100%; height: 140px; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 8px; border-radius: 8px; background: rgba(0,0,0,0.2); }
.model-preview-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
.no-preview-placeholder { font-size: 11px; color: var(--text-muted,#888); }
.model-lib-info { display: flex; flex-direction: column; gap: 4px; }
.mod-name { font-size: 12px; color: var(--text,#ececec); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Emotion Link ── */
.emotion-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.emo-tab { padding: 8px 14px; border-radius: 10px; border: 1px solid var(--border,#2c2d30); background: rgba(255,255,255,0.02); color: var(--text-muted,#888); cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: 0.15s; }
.emo-tab:hover { background: var(--hover,#1e1f22); color: var(--text,#ececec); }
.emo-tab.active { background: rgba(79,172,254,0.12); border-color: var(--primary,#4facfe); color: var(--primary,#4facfe); }
.emo-tab .badge { background: rgba(255,255,255,0.08); padding: 0 6px; border-radius: 8px; font-size: 11px; line-height: 18px; }
.emo-tab.active .badge { background: rgba(79,172,254,0.25); }
.motion-grid { display: flex; flex-direction: column; gap: 12px; }
.motion-group { background: rgba(255,255,255,0.02); border: 1px solid var(--border,#2c2d30); border-radius: 10px; padding: 12px; }
.group-name { margin: 0 0 8px; font-size: 13px; color: var(--text-muted,#888); }
.motion-items { display: flex; flex-wrap: wrap; gap: 6px; }
.motion-check-item { display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--border,#2c2d30); border-radius: 8px; font-size: 12px; cursor: pointer; transition: 0.15s; color: var(--text-muted,#888); }
.motion-check-item:hover { background: var(--hover,#1e1f22); }
.motion-check-item.checked { background: rgba(79,172,254,0.1); border-color: var(--primary,#4facfe); color: var(--primary,#4facfe); }
.motion-check-item input { display: none; }
.empty-state { padding: 40px; text-align: center; color: var(--text-muted,#888); font-size: 14px; }

/* ── About ── */
.about-card { background: rgba(255,255,255,0.02); border: 1px solid var(--border,#2c2d30); border-radius: 12px; padding: 24px; }
.about-card p { margin: 10px 0; font-size: 14px; color: var(--text,#ececec); }
.about-card a { color: var(--primary,#4facfe); text-decoration: none; }

/* ── 过渡动画 ── */
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.25s ease; }
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
